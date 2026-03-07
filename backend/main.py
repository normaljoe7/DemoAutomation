from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db
from auth import get_current_user, create_access_token, get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES, require_role
from datetime import timedelta, datetime
from pydantic import BaseModel
from typing import Optional, List
import models
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import ai_service

# Create all tables (handles new tables; existing tables won't be modified automatically)
models.Base.metadata.create_all(bind=engine)

# ── MySQL column-addition migrations ──────────────────────────────────────────
# Safely add new columns to existing tables if they don't already exist.
def _col_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = :table AND COLUMN_NAME = :column"
    ), {"table": table, "column": column})
    return result.scalar() > 0

_LEAD_COLUMNS = [
    ("name",                  "VARCHAR(255)"),
    ("job_title",             "VARCHAR(255)"),
    ("company",               "VARCHAR(255)"),
    ("website",               "VARCHAR(500)"),
    ("lead_status",           "VARCHAR(50)  DEFAULT 'NOT CLASSIFIED'"),
    ("demo_status",           "VARCHAR(100)"),
    ("demo_sub_status",       "VARCHAR(100)"),
    ("demo_time",             "VARCHAR(255)"),
    ("teams_link",            "VARCHAR(500)"),
    ("bubbles_link",          "VARCHAR(500)"),
    ("last_contact",          "DATETIME"),
    ("follow_up_date",        "DATETIME"),
    ("call_rating",           "INTEGER DEFAULT 0"),
    ("transcript_text",       "TEXT"),
    ("summary_text",          "TEXT"),
    ("action_items_text",     "TEXT"),
    # KYC fields
    ("legal_name",            "VARCHAR(255)"),
    ("gst_number",            "VARCHAR(50)"),
    ("registered_address",    "TEXT"),
    ("contact_person",        "VARCHAR(255)"),
    # Document tracking fields
    ("requested_docs",        "JSON"),
    ("selected_documents",    "JSON"),
    ("generated_docs",        "JSON"),
    ("generated_doc_urls",    "JSON"),
    ("custom_field_values",   "JSON"),
    # Hierarchy
    ("tl_id",                 "INTEGER"),
    ("user_id",               "INTEGER"),  # SDR owner of this lead
]

_USER_COLUMNS = [
    ("name",                  "VARCHAR(150)"),
]

_DOCUMENT_COLUMNS = [
    ("lead_id",               "INTEGER"),
    ("filename",              "VARCHAR(500)"),
    ("download_url",          "VARCHAR(500)"),
    ("pdf_path",              "VARCHAR(500)"),
    # Approval workflow: SDR → Team Lead → Legal → Finance → Marketing → Admin → ready_to_send
    ("approval_status",       "VARCHAR(50)"),
    ("tl_remarks",            "TEXT"),
    ("finance_remarks",       "TEXT"),
    ("legal_remarks",         "TEXT"),
    ("marketing_remarks",     "TEXT"),
    ("admin_remarks",         "TEXT"),
    ("approved_by_tl",        "INTEGER"),
    ("approved_by_finance",   "INTEGER"),
    ("approved_by_legal",     "INTEGER"),
    ("approved_by_marketing", "INTEGER"),
    ("approved_by_admin",     "INTEGER"),
    ("approved_at_tl",        "DATETIME"),
    ("approved_at_finance",   "DATETIME"),
    ("approved_at_legal",     "DATETIME"),
    ("approved_at_marketing", "DATETIME"),
    ("approved_at_admin",     "DATETIME"),
]

_DEMO_BOOKING_COLUMNS = [
    ("mode",          "VARCHAR(20)  DEFAULT 'schedule'"),
    ("demo_time",     "VARCHAR(255)"),
    ("teams_link",    "VARCHAR(500)"),
    ("cc_emails",     "JSON"),
    ("email_sent",    "TINYINT(1)   DEFAULT 0"),
    ("email_error",   "TEXT"),
    ("booked_by",     "VARCHAR(255)"),
    ("created_at",    "DATETIME    DEFAULT CURRENT_TIMESTAMP"),
]

with engine.connect() as conn:
    for col, col_type in _USER_COLUMNS:
        if not _col_exists(conn, "users", col):
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
    for col, col_type in _LEAD_COLUMNS:
        if not _col_exists(conn, "leads", col):
            conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} {col_type}"))
    for col, col_type in _DOCUMENT_COLUMNS:
        if not _col_exists(conn, "documents", col):
            conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col} {col_type}"))
    # demo_bookings is created by SQLAlchemy metadata; guard its optional extra columns
    try:
        for col, col_type in _DEMO_BOOKING_COLUMNS:
            if not _col_exists(conn, "demo_bookings", col):
                conn.execute(text(f"ALTER TABLE demo_bookings ADD COLUMN {col} {col_type}"))
    except Exception:
        pass  # Table may not exist yet — SQLAlchemy create_all will handle it
    # calendar_tokens table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS calendar_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            provider VARCHAR(50) NOT NULL,
            access_token TEXT NOT NULL,
            refresh_token TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_user_provider (user_id, provider)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """))
    conn.commit()

app = FastAPI(
    title="AI SDR Command Center",
    description="Automated Sales Demo Lifecycle API — Document Generator v30 Integrated",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# ──────────────────── SMTP EMAIL HELPER ────────────────────
def _send_smtp_email(to: str, subject: str, body: str, cc: List[str] = [], attachment_path: Optional[str] = None) -> tuple:
    """
    Send an email via SMTP using credentials from environment variables.
    Returns (success: bool, error_message: str).
    If SMTP_USER / SMTP_PASS are not configured, the call is a no-op and returns (False, "not_configured").
    attachment_path: optional path to a file to attach to the email.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    smtp_from_name = os.getenv("SMTP_FROM_NAME", "Pulse AI SDR Team")

    if not smtp_user or not smtp_pass:
        return False, "not_configured"

    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = f"{smtp_from_name} <{smtp_from}>"
        msg["To"] = to
        if cc:
            msg["Cc"] = ", ".join(cc)

        # Plain-text part
        msg.attach(MIMEText(body, "plain"))

        # File attachment (PDF preferred, falls back to whatever path is given)
        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
            encoders.encode_base64(part)
            att_filename = os.path.basename(attachment_path)
            part.add_header("Content-Disposition", f'attachment; filename="{att_filename}"')
            msg.attach(part)

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            recipients = [to] + cc
            server.sendmail(smtp_from, recipients, msg.as_string())

        return True, ""
    except Exception as exc:
        return False, str(exc)

# ──────────────────── HEALTH ────────────────────
@app.get("/")
def read_root():
    return {"status": "SDR Command Center API is running", "doc_engine": "v30"}

# ──────────────────── AUTH ────────────────────
@app.post("/api/v1/auth/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is deactivated. Contact your administrator.")
    access_token = create_access_token(
        data={"sub": user.email, "id": user.id, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "name": user.name, "id": user.id}

@app.get("/api/v1/auth/me")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "role": current_user.role, "name": current_user.name}

# ──────────────────── LEADS ────────────────────
class LeadCreate(BaseModel):
    # Contact
    name: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    email: str
    phone: Optional[str] = None
    # KYC
    legal_name: Optional[str] = None
    gst_number: Optional[str] = None
    registered_address: Optional[str] = None
    contact_person: Optional[str] = None
    # Pipeline
    lead_status: Optional[str] = "NOT CLASSIFIED"
    demo_status: Optional[str] = None
    demo_sub_status: Optional[str] = None
    demo_time: Optional[str] = None
    # Meeting links
    teams_link: Optional[str] = None
    bubbles_link: Optional[str] = None
    # Dates (accept ISO strings)
    last_contact: Optional[str] = None
    follow_up_date: Optional[str] = None
    # Post-call
    call_rating: Optional[int] = 0
    transcript_text: Optional[str] = None
    summary_text: Optional[str] = None
    action_items_text: Optional[str] = None
    # Document tracking
    requested_docs: Optional[List] = None
    selected_documents: Optional[List] = None
    generated_docs: Optional[List] = None
    generated_doc_urls: Optional[dict] = None
    custom_field_values: Optional[dict] = None

def _parse_dt(val: Optional[str]) -> Optional[datetime]:
    if not val:
        return None
    for fmt in ("%Y-%m-%dT%H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(val[:len(fmt)], fmt)
        except (ValueError, TypeError):
            continue
    return None

@app.get("/api/v1/leads")
def list_leads(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.Lead).order_by(models.Lead.id.desc())
    # SDRs can only see their own leads; TL/Legal/Finance/Admin see all
    if current_user.role == "sdr":
        query = query.filter(models.Lead.user_id == current_user.id)
    leads = query.all()
    result = []
    for l in leads:
        result.append({
            "id": l.id,
            "name": l.name,
            "job_title": l.job_title,
            "company": l.company,
            "website": l.website,
            "email": l.email,
            "phone": l.phone,
            "legal_name": l.legal_name,
            "gst_number": l.gst_number,
            "registered_address": l.registered_address,
            "contact_person": l.contact_person,
            "lead_status": l.lead_status,
            "demo_status": l.demo_status,
            "demo_sub_status": l.demo_sub_status,
            "demo_time": l.demo_time,
            "teams_link": l.teams_link,
            "bubbles_link": l.bubbles_link,
            "last_contact": l.last_contact.isoformat() if l.last_contact else None,
            "follow_up_date": l.follow_up_date.isoformat() if l.follow_up_date else None,
            "call_rating": l.call_rating,
            "transcript_text": l.transcript_text,
            "summary_text": l.summary_text,
            "action_items_text": l.action_items_text,
            "requested_docs": l.requested_docs or [],
            "selected_documents": l.selected_documents or [],
            "generated_docs": l.generated_docs or [],
            "generated_doc_urls": l.generated_doc_urls or {},
            "custom_field_values": l.custom_field_values or {},
            "created_at": l.created_at.isoformat() if l.created_at else None,
        })
    return result

@app.post("/api/v1/leads", status_code=201)
def create_lead(lead: LeadCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    data = lead.dict()
    data["last_contact"] = _parse_dt(data.pop("last_contact", None))
    data["follow_up_date"] = _parse_dt(data.pop("follow_up_date", None))
    data["user_id"] = current_user.id
    db_lead = models.Lead(**data)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return {"id": db_lead.id, "status": "created"}

@app.put("/api/v1/leads/{lead_id}")
def update_lead(lead_id: int, lead: LeadCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    data = lead.dict(exclude_unset=True)
    if "last_contact" in data:
        data["last_contact"] = _parse_dt(data["last_contact"])
    if "follow_up_date" in data:
        data["follow_up_date"] = _parse_dt(data["follow_up_date"])
    # JSON fields — set directly without transformation
    json_fields = {"requested_docs", "selected_documents", "generated_docs", "generated_doc_urls", "custom_field_values"}
    for key, val in data.items():
        if key in json_fields:
            setattr(db_lead, key, val)
        elif key not in ("last_contact", "follow_up_date"):
            setattr(db_lead, key, val)
    # Handle date fields separately
    if "last_contact" in data:
        db_lead.last_contact = data["last_contact"]
    if "follow_up_date" in data:
        db_lead.follow_up_date = data["follow_up_date"]
    db.commit()
    db.refresh(db_lead)
    return {"status": "updated", "id": db_lead.id}

@app.delete("/api/v1/leads/{lead_id}", status_code=200)
def delete_lead(lead_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(db_lead)
    db.commit()
    return {"status": "deleted"}

# ──────────────────── PRE-CALL ────────────────────
@app.post("/api/v1/precall/trigger")
def trigger_precall(db: Session = Depends(get_db)):
    return {"status": "triggered"}

@app.get("/api/v1/precall/{lead_id}")
def get_precall(lead_id: int, db: Session = Depends(get_db)):
    report = db.query(models.PreCallReport).filter(models.PreCallReport.lead_id == lead_id).first()
    if not report:
        return {"lead_id": lead_id, "status": "no_report", "ppt_path": None}
    return {
        "lead_id": lead_id,
        "intel": report.company_intel,
        "missing": report.missing_fields,
        "ppt_path": report.ppt_path,
        "booking_data": report.booking_data,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }

@app.put("/api/v1/precall/{id}/missing-fields")
def update_missing_fields(id: int, db: Session = Depends(get_db)):
    return {"status": "updated"}

# ──────────────────── CALLS (TEXT UPLOAD) ────────────────────
@app.post("/api/v1/calls/{call_id}/upload-text")
async def upload_call_text(
    call_id: int,
    transcript: Optional[UploadFile] = File(None),
    summary: Optional[UploadFile] = File(None),
    action_items: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    call = db.query(models.Call).filter(models.Call.id == call_id).first()
    if not call:
        call = models.Call(id=call_id, lead_id=1)
        db.add(call)

    call_dir = os.path.join(UPLOADS_DIR, f"call_{call_id}")
    os.makedirs(call_dir, exist_ok=True)

    result = {}
    if transcript:
        path = os.path.join(call_dir, f"transcript_{transcript.filename}")
        with open(path, "wb") as f:
            f.write(await transcript.read())
        call.transcript_path = path
        result["transcript"] = path

    if summary:
        path = os.path.join(call_dir, f"summary_{summary.filename}")
        with open(path, "wb") as f:
            f.write(await summary.read())
        call.summary_path = path
        result["summary"] = path

    if action_items:
        path = os.path.join(call_dir, f"actions_{action_items.filename}")
        with open(path, "wb") as f:
            f.write(await action_items.read())
        call.action_items_path = path
        result["action_items"] = path

    db.commit()
    return {"status": "uploaded", "files": result}

@app.post("/api/v1/calls/{call_id}/process-text")
def process_call_text(call_id: int, db: Session = Depends(get_db)):
    return {"status": "processing", "call_id": call_id}

@app.get("/api/v1/calls/{call_id}/analysis")
def get_call_analysis(call_id: int, db: Session = Depends(get_db)):
    call = db.query(models.Call).filter(models.Call.id == call_id).first()
    if not call:
        return {"call_id": call_id, "analysis": None}
    return {"call_id": call_id, "analysis": call.ai_analysis, "temperature": call.lead_temperature}

# ──────────────────── DOCUMENT GENERATOR v30 ────────────────────
@app.get("/api/v1/templates")
def list_templates(current_user: models.User = Depends(get_current_user)):
    from document_service import list_templates as ls
    return ls()

@app.post("/api/v1/templates/upload")
async def upload_template(
    file: UploadFile = File(...),
    department: str = Form("sdr"),
    current_user: models.User = Depends(get_current_user),
):
    from document_service import upload_template as ut
    # Validate file extension
    if file.filename is None or not (
        file.filename.lower().endswith(".docx") or file.filename.lower().endswith(".pptx")
    ):
        raise HTTPException(status_code=400, detail="Only .docx and .pptx files are supported.")
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        result = ut(content, file.filename, department=department)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.delete("/api/v1/templates/{name}")
def remove_template(name: str):
    from document_service import delete_template
    ok = delete_template(name)
    if not ok:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "deleted"}

@app.get("/api/v1/templates/{name}/variables")
def get_template_variables(name: str):
    from document_service import scan_template_variables
    return {"variables": scan_template_variables(name)}

# Doc types that require Finance then Legal approval before the SDR can send them
APPROVAL_REQUIRED_TYPES = {"invoice", "contract", "quotation", "non_disclosure", "non_compete"}

class DocGenRequest(BaseModel):
    template_name: str
    data: dict
    convert_pdf: bool = False
    lead_id: Optional[int] = None
    doc_type: Optional[str] = None  # e.g. "invoice", "quotation", "contract"

@app.post("/api/v1/documents/generate")
def generate_document(req: DocGenRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from document_service import generate_document as gen
    try:
        result = gen(req.template_name, req.data, req.convert_pdf)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Persist document record to documents table only
    if req.lead_id and req.doc_type:
        filename = result.get("filename", "")
        download_url = f"/api/v1/documents/{filename}/download"

        # Docs like brochures and pitch decks (SDR-level) skip the full approval chain
        needs_approval = req.doc_type in APPROVAL_REQUIRED_TYPES
        # New approval chain: SDR generates → Team Lead → Legal → Finance → ready_to_send
        initial_status = "pending_tl" if needs_approval else "ready_to_send"

        doc_record = models.Document(
            lead_id=req.lead_id,
            type=req.doc_type,
            filename=filename,
            file_path=result.get("docx_path") or "",
            pdf_path=result.get("pdf_path") or None,
            download_url=download_url,
            status="generated",
            approval_status=initial_status,
        )
        db.add(doc_record)
        db.commit()

        # Notify Team Lead that a new document needs review
        if needs_approval:
            notif = models.Notification(
                message=f"New {req.doc_type} document generated and awaiting Team Lead review.",
                type="info",
                lead_name=None,
                doc_type=req.doc_type,
            )
            db.add(notif)
            db.commit()

    # Enrich result with pdf_filename so the frontend can construct a PDF view URL
    pdf_path = result.get("pdf_path")
    result["pdf_filename"] = os.path.basename(pdf_path) if pdf_path else None
    return result

@app.get("/api/v1/leads/{lead_id}/documents")
def list_lead_documents(lead_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Return all documents generated for a given lead."""
    docs = db.query(models.Document).filter(models.Document.lead_id == lead_id).order_by(models.Document.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "type": d.type,
            "filename": d.filename,
            "pdf_filename": os.path.basename(d.pdf_path) if d.pdf_path else None,
            "file_path": d.file_path,
            "download_url": d.download_url,
            "view_url": f"/api/v1/documents/{d.filename}/view" if d.filename else None,
            "pdf_view_url": f"/api/v1/documents/{os.path.basename(d.pdf_path)}/view" if d.pdf_path else None,
            "status": d.status,
            "approval_status": d.approval_status,
            "finance_remarks": d.finance_remarks,
            "legal_remarks": d.legal_remarks,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]

@app.get("/api/v1/documents/{filename}/download")
def download_document(filename: str):
    from document_service import OUTPUT_DIR
    fpath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(fpath, filename=filename)

@app.get("/api/v1/documents/{filename}/view")
def view_document(filename: str):
    """Serve a document inline so PDFs render in the browser and Office files prompt to open.
    If a .docx is requested and a matching .pdf exists, serve the PDF instead for browser preview."""
    import mimetypes
    from document_service import OUTPUT_DIR
    from fastapi.responses import Response

    fpath = os.path.join(OUTPUT_DIR, filename)

    # For DOCX files: prefer the PDF version if it exists
    if filename.lower().endswith('.docx'):
        pdf_filename = filename[:-5] + '.pdf'
        pdf_fpath = os.path.join(OUTPUT_DIR, pdf_filename)
        if os.path.exists(pdf_fpath):
            fpath = pdf_fpath
            filename = pdf_filename

    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="File not found")

    mime, _ = mimetypes.guess_type(filename)
    if not mime:
        # Fallback guesses for common office types
        ext = os.path.splitext(filename)[1].lower()
        mime = {
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".pdf":  "application/pdf",
        }.get(ext, "application/octet-stream")

    with open(fpath, "rb") as f:
        content = f.read()

    headers = {"Content-Disposition": f'inline; filename="{filename}"'}
    return Response(content=content, media_type=mime, headers=headers)

# ──────────────────── APPROVALS ────────────────────
class ApproveRejectRequest(BaseModel):
    lead_name: Optional[str] = None
    doc_type: Optional[str] = None
    rejection_reason: Optional[str] = None

@app.post("/api/v1/documents/{id}/approve")
def approve_document(id: int, db: Session = Depends(get_db), req: Optional[ApproveRejectRequest] = None):
    if req is None:
        req = ApproveRejectRequest()
    # Update document status
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if doc:
        doc.status = "approved"
    # Create notification for SDRs
    notif = models.Notification(
        message=f"Document '{req.doc_type or 'document'}' for {req.lead_name or 'lead'} has been approved.",
        type="approved",
        document_id=id,
        lead_name=req.lead_name,
        doc_type=req.doc_type,
    )
    db.add(notif)
    db.commit()
    return {"status": "approved", "document_id": id}

@app.post("/api/v1/documents/{id}/reject")
def reject_document(id: int, db: Session = Depends(get_db), req: Optional[ApproveRejectRequest] = None):
    if req is None:
        req = ApproveRejectRequest()
    # Update document status
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if doc:
        doc.status = "rejected"
    # Create notification for SDRs
    reason_suffix = f" Reason: {req.rejection_reason}" if req.rejection_reason else ""
    notif = models.Notification(
        message=f"Document '{req.doc_type or 'document'}' for {req.lead_name or 'lead'} has been rejected.{reason_suffix}",
        type="rejected",
        document_id=id,
        lead_name=req.lead_name,
        doc_type=req.doc_type,
    )
    db.add(notif)
    db.commit()
    return {"status": "rejected", "document_id": id}


# ──────────────────── FINANCE WORKFLOW ────────────────────

def _doc_with_lead(d: models.Document, db: Session) -> dict:
    """Serialize a Document record with its associated lead info."""
    lead = db.query(models.Lead).filter(models.Lead.id == d.lead_id).first() if d.lead_id else None
    return {
        "id": d.id,
        "type": d.type,
        "filename": d.filename,
        "file_path": d.file_path,
        "pdf_path": d.pdf_path,
        "download_url": d.download_url,
        "view_url": f"/api/v1/documents/{d.filename}/view" if d.filename else None,
        "status": d.status,
        "approval_status": d.approval_status,
        "tl_remarks": d.tl_remarks,
        "finance_remarks": d.finance_remarks,
        "legal_remarks": d.legal_remarks,
        "marketing_remarks": getattr(d, "marketing_remarks", None),
        "admin_remarks": getattr(d, "admin_remarks", None),
        "approved_at_tl": d.approved_at_tl.isoformat() if d.approved_at_tl else None,
        "approved_at_finance": d.approved_at_finance.isoformat() if d.approved_at_finance else None,
        "approved_at_legal": d.approved_at_legal.isoformat() if d.approved_at_legal else None,
        "approved_at_marketing": d.approved_at_marketing.isoformat() if getattr(d, "approved_at_marketing", None) else None,
        "approved_at_admin": d.approved_at_admin.isoformat() if getattr(d, "approved_at_admin", None) else None,
        "lead_id": d.lead_id,
        "lead_name": lead.name if lead else None,
        "company": lead.company if lead else None,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


class WorkflowActionRequest(BaseModel):
    remarks: Optional[str] = None


# ──────────────────── TEAM LEAD WORKFLOW ────────────────────
# Approval chain: SDR generates → pending_tl → pending_legal → pending_finance → pending_marketing → pending_admin → ready_to_send

@app.get("/api/v1/tl/documents")
def list_tl_documents(db: Session = Depends(get_db), current_user: models.User = Depends(require_role("team_lead"))):
    """Return documents awaiting Team Lead review."""
    docs = (
        db.query(models.Document)
        .filter(models.Document.approval_status.in_(["pending_tl", "rejected_tl"]))
        .order_by(models.Document.created_at.desc())
        .all()
    )
    return [_doc_with_lead(d, db) for d in docs]


@app.post("/api/v1/tl/documents/{id}/approve")
def tl_approve_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("team_lead"))):
    """Team Lead approves → moves to Legal review."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.approval_status not in ("pending_tl", "rejected_tl"):
        raise HTTPException(status_code=400, detail=f"Document is not awaiting TL approval. Status: {doc.approval_status}")

    doc.approval_status = "pending_legal"
    doc.approved_at_tl = datetime.utcnow()
    doc.approved_by_tl = current_user.id
    if req.remarks:
        doc.tl_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Team Lead approved {doc.type or 'document'} for {lead.name if lead else 'lead'}. Sent to Legal review.",
        type="approved",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "approved_tl", "next_stage": "pending_legal", "document_id": id}


@app.post("/api/v1/tl/documents/{id}/reject")
def tl_reject_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("team_lead"))):
    """Team Lead rejects a document with required remarks."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not req.remarks or not req.remarks.strip():
        raise HTTPException(status_code=400, detail="Remarks are required when rejecting a document.")

    doc.approval_status = "rejected_tl"
    doc.tl_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Team Lead rejected {doc.type or 'document'} for {lead.name if lead else 'lead'}. Reason: {req.remarks}",
        type="rejected",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "rejected_tl", "document_id": id}


# ──────────────────── LEGAL WORKFLOW ────────────────────

@app.get("/api/v1/legal/documents")
def list_legal_documents(db: Session = Depends(get_db), current_user: models.User = Depends(require_role("legal"))):
    """Return documents in the Legal review queue."""
    docs = (
        db.query(models.Document)
        .filter(models.Document.approval_status.in_(["pending_legal", "rejected_legal"]))
        .order_by(models.Document.created_at.desc())
        .all()
    )
    return [_doc_with_lead(d, db) for d in docs]


@app.post("/api/v1/legal/documents/{id}/approve")
def legal_approve_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("legal"))):
    """Legal approves → moves to Finance review."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.approval_status not in ("pending_legal", "rejected_legal"):
        raise HTTPException(status_code=400, detail=f"Document is not awaiting Legal approval. Status: {doc.approval_status}")

    doc.approval_status = "pending_finance"
    doc.approved_at_legal = datetime.utcnow()
    doc.approved_by_legal = current_user.id
    if req.remarks:
        doc.legal_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Legal approved {doc.type or 'document'} for {lead.name if lead else 'lead'}. Sent to Finance review.",
        type="approved",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "approved_legal", "next_stage": "pending_finance", "document_id": id}


@app.post("/api/v1/legal/documents/{id}/reject")
def legal_reject_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("legal"))):
    """Legal rejects a document with required remarks."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not req.remarks or not req.remarks.strip():
        raise HTTPException(status_code=400, detail="Remarks are required when rejecting a document.")

    doc.approval_status = "rejected_legal"
    doc.legal_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Legal rejected {doc.type or 'document'} for {lead.name if lead else 'lead'}. Reason: {req.remarks}",
        type="rejected",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "rejected_legal", "document_id": id}


# ──────────────────── FINANCE WORKFLOW ────────────────────

@app.get("/api/v1/finance/documents")
def list_finance_documents(db: Session = Depends(get_db), current_user: models.User = Depends(require_role("finance"))):
    """Return documents in the Finance review queue (final approval step)."""
    docs = (
        db.query(models.Document)
        .filter(models.Document.approval_status.in_(["pending_finance", "rejected_finance"]))
        .order_by(models.Document.created_at.desc())
        .all()
    )
    return [_doc_with_lead(d, db) for d in docs]


@app.post("/api/v1/finance/documents/{id}/approve")
def finance_approve_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("finance"))):
    """Finance approves — document moves to Marketing for brand review."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.approval_status not in ("pending_finance", "rejected_finance"):
        raise HTTPException(status_code=400, detail=f"Document is not awaiting Finance approval. Status: {doc.approval_status}")

    doc.approval_status = "pending_marketing"
    doc.approved_at_finance = datetime.utcnow()
    doc.approved_by_finance = current_user.id
    if req.remarks:
        doc.finance_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Finance approved {doc.type or 'document'} for {lead.name if lead else 'lead'}. Forwarded to Marketing for brand review.",
        type="approved",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "pending_marketing", "document_id": id}


@app.post("/api/v1/finance/documents/{id}/reject")
def finance_reject_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("finance"))):
    """Finance rejects a document with required remarks."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not req.remarks or not req.remarks.strip():
        raise HTTPException(status_code=400, detail="Remarks are required when rejecting a document.")

    doc.approval_status = "rejected_finance"
    doc.finance_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Finance rejected {doc.type or 'document'} for {lead.name if lead else 'lead'}. Reason: {req.remarks}",
        type="rejected",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "rejected_finance", "document_id": id}


# ──────────────────── MARKETING WORKFLOW ────────────────────

@app.get("/api/v1/marketing/documents")
def list_marketing_documents(db: Session = Depends(get_db), current_user: models.User = Depends(require_role("marketing"))):
    """Return documents awaiting Marketing brand review."""
    docs = (
        db.query(models.Document)
        .filter(models.Document.approval_status.in_(["pending_marketing", "rejected_marketing"]))
        .order_by(models.Document.created_at.desc())
        .all()
    )
    return [_doc_with_lead(d, db) for d in docs]


@app.post("/api/v1/marketing/documents/{id}/approve")
def marketing_approve_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("marketing"))):
    """Marketing approves brand compliance — document moves to Admin for final approval."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.approval_status not in ("pending_marketing", "rejected_marketing"):
        raise HTTPException(status_code=400, detail=f"Document is not awaiting Marketing approval. Status: {doc.approval_status}")

    doc.approval_status = "pending_admin"
    doc.approved_at_marketing = datetime.utcnow()
    doc.approved_by_marketing = current_user.id
    if req.remarks:
        doc.marketing_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Marketing approved {doc.type or 'document'} for {lead.name if lead else 'lead'}. Forwarded to Admin for final approval.",
        type="approved",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "pending_admin", "document_id": id}


@app.post("/api/v1/marketing/documents/{id}/reject")
def marketing_reject_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("marketing"))):
    """Marketing rejects a document with required brand remarks."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not req.remarks or not req.remarks.strip():
        raise HTTPException(status_code=400, detail="Remarks are required when rejecting a document.")

    doc.approval_status = "rejected_marketing"
    doc.marketing_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Marketing rejected {doc.type or 'document'} for {lead.name if lead else 'lead'}. Reason: {req.remarks}",
        type="rejected",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "rejected_marketing", "document_id": id}


# ──────────────────── ADMIN FINAL APPROVAL WORKFLOW ────────────────────

@app.get("/api/v1/admin/pending-documents")
def list_admin_pending_documents(db: Session = Depends(get_db), current_user: models.User = Depends(require_role("admin"))):
    """Return documents awaiting Admin final approval."""
    docs = (
        db.query(models.Document)
        .filter(models.Document.approval_status.in_(["pending_admin", "rejected_admin"]))
        .order_by(models.Document.created_at.desc())
        .all()
    )
    return [_doc_with_lead(d, db) for d in docs]


@app.post("/api/v1/admin/documents/{id}/approve")
def admin_approve_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("admin"))):
    """Admin gives final approval — document becomes ready_to_send for SDRs."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.approval_status not in ("pending_admin", "rejected_admin"):
        raise HTTPException(status_code=400, detail=f"Document is not awaiting Admin approval. Status: {doc.approval_status}")

    doc.approval_status = "ready_to_send"
    doc.approved_at_admin = datetime.utcnow()
    doc.approved_by_admin = current_user.id
    if req.remarks:
        doc.admin_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Admin approved {doc.type or 'document'} for {lead.name if lead else 'lead'}. Document is now ready to send.",
        type="approved",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "ready_to_send", "document_id": id}


@app.post("/api/v1/admin/documents/{id}/reject")
def admin_reject_document(id: int, req: WorkflowActionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("admin"))):
    """Admin rejects a document with remarks."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not req.remarks or not req.remarks.strip():
        raise HTTPException(status_code=400, detail="Remarks are required when rejecting a document.")

    doc.approval_status = "rejected_admin"
    doc.admin_remarks = req.remarks

    lead = db.query(models.Lead).filter(models.Lead.id == doc.lead_id).first() if doc.lead_id else None
    notif = models.Notification(
        message=f"Admin rejected {doc.type or 'document'} for {lead.name if lead else 'lead'}. Reason: {req.remarks}",
        type="rejected",
        document_id=id,
        lead_name=lead.name if lead else None,
        doc_type=doc.type,
    )
    db.add(notif)
    db.commit()
    return {"status": "rejected_admin", "document_id": id}


@app.get("/api/v1/documents/{id}/info")
def get_document_info(id: int, db: Session = Depends(get_db)):
    """Get full document info including approval_status."""
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _doc_with_lead(doc, db)

# ──────────────────── NOTIFICATIONS ────────────────────
@app.get("/api/v1/notifications")
def list_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    notifs = db.query(models.Notification).order_by(models.Notification.created_at.desc()).limit(50).all()
    return [
        {
            "id": n.id,
            "message": n.message,
            "type": n.type,
            "document_id": n.document_id,
            "lead_name": n.lead_name,
            "doc_type": n.doc_type,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]

@app.post("/api/v1/notifications/mark-read")
def mark_notifications_read(ids: List[int] = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.query(models.Notification).filter(models.Notification.id.in_(ids)).update(
        {"is_read": True}, synchronize_session=False
    )
    db.commit()
    return {"status": "marked_read", "count": len(ids)}

@app.post("/api/v1/notifications/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.query(models.Notification).filter(models.Notification.is_read == False).update(  # noqa: E712
        {"is_read": True}, synchronize_session=False
    )
    db.commit()
    return {"status": "all_marked_read"}

class EmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    attachments: List[str] = []

@app.post("/api/v1/documents/{id}/send")
def send_document_email(id: int, req: EmailSendRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Send a document via email. Enforces approval_status = 'ready_to_send'.
    Attaches the PDF version of the document (or DOCX as fallback).
    """
    from document_service import OUTPUT_DIR

    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.approval_status and doc.approval_status != "ready_to_send":
        raise HTTPException(
            status_code=400,
            detail=f"Document is not approved for sending. Current status: {doc.approval_status}"
        )

    # Determine best attachment: PDF preferred, fallback to DOCX
    attachment_path = None
    if doc.pdf_path and os.path.exists(doc.pdf_path):
        attachment_path = doc.pdf_path
    elif doc.filename:
        # Try derived PDF path from filename
        pdf_filename = doc.filename.replace(".docx", ".pdf") if doc.filename.endswith(".docx") else None
        if pdf_filename:
            pdf_fpath = os.path.join(OUTPUT_DIR, pdf_filename)
            if os.path.exists(pdf_fpath):
                attachment_path = pdf_fpath
        if not attachment_path:
            docx_fpath = os.path.join(OUTPUT_DIR, doc.filename)
            if os.path.exists(docx_fpath):
                attachment_path = docx_fpath

    ok, err = _send_smtp_email(
        to=req.to,
        subject=req.subject,
        body=req.body,
        attachment_path=attachment_path,
    )

    if ok:
        doc.status = "sent"
        doc.approval_status = "sent"
        db.commit()
        return {
            "status": "sent",
            "to": req.to,
            "subject": req.subject,
            "attachment": os.path.basename(attachment_path) if attachment_path else None,
        }
    elif err == "not_configured":
        # SMTP not configured — still mark but warn
        return {
            "status": "not_configured",
            "message": "SMTP not configured. Configure SMTP settings to send real emails.",
            "to": req.to,
            "subject": req.subject,
        }
    else:
        raise HTTPException(status_code=500, detail=f"Email sending failed: {err}")

# ──────────────────── RESCHEDULE / SCHEDULE EMAIL ────────────────────
class RescheduleEmailRequest(BaseModel):
    lead_id: int
    new_datetime: str           # ISO string for the booked demo slot
    teams_link: Optional[str] = None
    to_email: str
    cc_emails: List[str] = []
    lead_name: str
    company: str
    sender_name: str = "SDR Team"
    # Mode: "schedule" = new booking, "reschedule" = changed booking
    mode: str = "reschedule"
    # Override the demo_status written to the lead record
    demo_status: Optional[str] = None

@app.post("/api/v1/leads/{lead_id}/reschedule")
def reschedule_demo(lead_id: int, req: RescheduleEmailRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Schedule or reschedule a demo:
    - Writes new demo_time / teams_link to the lead record.
    - Sets demo_status to callers choice (defaults: "Demo Scheduled" for schedule, "Demo Rescheduled" for reschedule).
    - Persists a DemoBooking audit row.
    - Creates a dashboard Notification.
    - Attempts to send a booking confirmation email via SMTP.
    """
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # --- Determine target demo_status ---
    if req.demo_status:
        new_demo_status = req.demo_status
    elif req.mode == "schedule":
        new_demo_status = "Demo Scheduled"
    else:
        new_demo_status = "Demo Rescheduled"

    # --- Update lead record ---
    db_lead.demo_time = req.new_datetime
    if req.teams_link:
        db_lead.teams_link = req.teams_link
    db_lead.demo_status = new_demo_status
    db.flush()

    # --- Build email body ---
    mode_label = "scheduled" if req.mode == "schedule" else "rescheduled"
    email_subject = f"Demo {mode_label.capitalize()}: {req.company} — Booking Confirmation"
    email_body = (
        f"Dear {req.lead_name},\n\n"
        f"Your demo has been {mode_label}. Here are the details:\n\n"
        f"  Date & Time : {req.new_datetime}\n"
        + (f"  Teams Link  : {req.teams_link}\n" if req.teams_link else "")
        + f"\nPlease add this to your calendar. If you need to make any changes, "
        f"don't hesitate to reach out.\n\n"
        f"Best regards,\n{req.sender_name}"
    )

    # --- Send email via SMTP ---
    email_ok, email_err = _send_smtp_email(
        to=req.to_email,
        subject=email_subject,
        body=email_body,
        cc=req.cc_emails,
    )

    # --- Persist DemoBooking audit row ---
    booking = models.DemoBooking(
        lead_id=lead_id,
        mode=req.mode,
        demo_time=req.new_datetime,
        teams_link=req.teams_link,
        cc_emails=req.cc_emails,
        email_sent=email_ok,
        email_error=email_err if not email_ok and email_err != "not_configured" else None,
        booked_by=req.sender_name,
    )
    db.add(booking)

    # --- Create dashboard Notification ---
    notif_msg = (
        f"Demo {'scheduled' if req.mode == 'schedule' else 'rescheduled'} for "
        f"{req.lead_name} ({req.company}) on {req.new_datetime}."
        + (" Confirmation email sent." if email_ok else "")
    )
    notif = models.Notification(
        message=notif_msg,
        type="booking",
        lead_name=req.lead_name,
    )
    db.add(notif)
    db.commit()

    return {
        "status": req.mode,
        "demo_status": new_demo_status,
        "email_sent": email_ok,
        "email_error": email_err if not email_ok else None,
        "booking_id": booking.id,
        "email_payload": {
            "to": req.to_email,
            "cc": req.cc_emails,
            "subject": email_subject,
            "body": email_body,
        },
    }

@app.get("/api/v1/leads/{lead_id}/bookings")
def list_lead_bookings(lead_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Return full booking history for a lead (newest first)."""
    bookings = (
        db.query(models.DemoBooking)
        .filter(models.DemoBooking.lead_id == lead_id)
        .order_by(models.DemoBooking.created_at.desc())
        .all()
    )
    return [
        {
            "id": b.id,
            "mode": b.mode,
            "demo_time": b.demo_time,
            "teams_link": b.teams_link,
            "cc_emails": b.cc_emails,
            "email_sent": b.email_sent,
            "email_error": b.email_error,
            "booked_by": b.booked_by,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in bookings
    ]

# ──────────────────── KB ────────────────────
@app.get("/api/v1/kb/me")
def get_kb(db: Session = Depends(get_db)):
    return {"kb": {}}

@app.put("/api/v1/kb/me")
def update_kb(db: Session = Depends(get_db)):
    return {"kb": "updated"}

@app.post("/api/v1/kb/preview")
def preview_kb(db: Session = Depends(get_db)):
    return {"preview": "success"}

# ──────────────────── SETTINGS ────────────────────
@app.get("/api/v1/settings")
def get_settings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = db.query(models.AppSettings).all()
    return {r.key: r.value for r in rows}

@app.put("/api/v1/settings")
def update_settings(data: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    for key, value in data.items():
        row = db.query(models.AppSettings).filter(models.AppSettings.key == key).first()
        if row:
            row.value = value
        else:
            row = models.AppSettings(key=key, value=value)
            db.add(row)
    db.commit()
    return {"status": "saved"}

# ──────────────────── TRANSCRIPTS ────────────────────
@app.get("/api/v1/transcripts")
def list_transcripts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Return all leads that have transcript data."""
    query = db.query(models.Lead).filter(models.Lead.transcript_text.isnot(None))
    if current_user.role == "sdr":
        query = query.filter(models.Lead.user_id == current_user.id)
    leads = query.order_by(models.Lead.updated_at.desc()).all()
    result = []
    for l in leads:
        result.append({
            "id": l.id,
            "leadName": l.name,
            "company": l.company or "",
            "email": l.email or "",
            "lead_status": l.lead_status or "NOT CLASSIFIED",
            "transcript_text": l.transcript_text,
            "summary_text": l.summary_text,
            "action_items_text": l.action_items_text,
            "call_rating": l.call_rating or 0,
            "last_contact": l.last_contact.isoformat() if l.last_contact else None,
            "updated_at": l.updated_at.isoformat() if l.updated_at else None,
        })
    return result

class TranscriptUpload(BaseModel):
    lead_id: int
    transcript_text: Optional[str] = None
    summary_text: Optional[str] = None
    action_items_text: Optional[str] = None

@app.post("/api/v1/transcripts/upload-text")
def upload_transcript_text(req: TranscriptUpload, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Upload transcript/summary/action_items text directly to a lead record."""
    lead = db.query(models.Lead).filter(models.Lead.id == req.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if req.transcript_text is not None:
        lead.transcript_text = req.transcript_text
    if req.summary_text is not None:
        lead.summary_text = req.summary_text
    if req.action_items_text is not None:
        lead.action_items_text = req.action_items_text
    db.commit()
    return {"status": "saved", "lead_id": lead.id}


# ──────────────────── ADMIN — USER MANAGEMENT ────────────────────

class UserCreate(BaseModel):
    name: Optional[str] = None
    email: str
    password: str
    role: str = "sdr"   # sdr | team_lead | finance | legal | admin
    tl_id: Optional[int] = None  # assigned team lead (for SDRs)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    tl_id: Optional[int] = None

@app.get("/api/v1/admin/users")
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(require_role("admin"))):
    """List all users. Admin only."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

@app.post("/api/v1/admin/users", status_code=201)
def create_user(req: UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("admin"))):
    """Create a new user. Admin only."""
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        name=req.name,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role=req.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role, "name": user.name}

@app.put("/api/v1/admin/users/{user_id}")
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("admin"))):
    """Update a user's role, name, or active status. Admin only."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.name is not None:
        user.name = req.name
    if req.role is not None:
        user.role = req.role
    if req.is_active is not None:
        user.is_active = req.is_active
    db.commit()
    return {"id": user.id, "email": user.email, "role": user.role, "name": user.name, "is_active": user.is_active}

@app.delete("/api/v1/admin/users/{user_id}")
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_role("admin"))):
    """Deactivate a user account. Admin only."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = False
    db.commit()
    return {"status": "deactivated", "user_id": user_id}


# ──────────────────── CALENDAR OAuth ────────────────────
# Supports Google Calendar and Microsoft Outlook OAuth2 flows.
# Deep links (Google/Outlook/ICS) are handled purely on the frontend.

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/calendar/callback/google")

MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET", "")
MICROSOFT_REDIRECT_URI = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8000/api/v1/calendar/callback/microsoft")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@app.get("/api/v1/calendar/auth/{provider}")
def calendar_auth(provider: str, current_user: models.User = Depends(get_current_user)):
    """Return the OAuth2 authorization URL for the requested provider."""
    from urllib.parse import urlencode

    if provider == "google":
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=503, detail="Google Calendar OAuth not configured. Set GOOGLE_CLIENT_ID in .env")
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/calendar.events",
            "access_type": "offline",
            "prompt": "consent",
            "state": str(current_user.id),
        }
        url = "https://accounts.google.com/o/oauth2/auth?" + urlencode(params)
        return {"url": url}

    elif provider == "microsoft":
        if not MICROSOFT_CLIENT_ID:
            raise HTTPException(status_code=503, detail="Microsoft Calendar OAuth not configured. Set MICROSOFT_CLIENT_ID in .env")
        params = {
            "client_id": MICROSOFT_CLIENT_ID,
            "redirect_uri": MICROSOFT_REDIRECT_URI,
            "response_type": "code",
            "scope": "Calendars.ReadWrite offline_access",
            "state": str(current_user.id),
        }
        url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + urlencode(params)
        return {"url": url}

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}. Use 'google' or 'microsoft'.")


@app.get("/api/v1/calendar/callback/{provider}")
async def calendar_callback(provider: str, code: str, state: str, db: Session = Depends(get_db)):
    """Handle OAuth2 callback, exchange code for tokens, store in DB, redirect to frontend."""
    import httpx
    from datetime import timedelta as td

    user_id = int(state)
    tokens = None

    try:
        if provider == "google":
            async with httpx.AsyncClient() as client:
                resp = await client.post("https://oauth2.googleapis.com/token", data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                })
            tokens = resp.json()

        elif provider == "microsoft":
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                    data={
                        "code": code,
                        "client_id": MICROSOFT_CLIENT_ID,
                        "client_secret": MICROSOFT_CLIENT_SECRET,
                        "redirect_uri": MICROSOFT_REDIRECT_URI,
                        "grant_type": "authorization_code",
                    }
                )
            tokens = resp.json()

        if tokens and "access_token" in tokens:
            expires_at = None
            if "expires_in" in tokens:
                expires_at = datetime.utcnow() + td(seconds=int(tokens["expires_in"]))

            existing = db.query(models.CalendarToken).filter(
                models.CalendarToken.user_id == user_id,
                models.CalendarToken.provider == provider
            ).first()

            if existing:
                existing.access_token = tokens["access_token"]
                existing.refresh_token = tokens.get("refresh_token", existing.refresh_token)
                existing.expires_at = expires_at
            else:
                cal_token = models.CalendarToken(
                    user_id=user_id,
                    provider=provider,
                    access_token=tokens["access_token"],
                    refresh_token=tokens.get("refresh_token"),
                    expires_at=expires_at,
                )
                db.add(cal_token)
            db.commit()

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{FRONTEND_URL}?calendar_connected={provider}")


@app.get("/api/v1/calendar/status")
def calendar_status(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Return which calendar providers are connected for the current user."""
    tokens = db.query(models.CalendarToken).filter(models.CalendarToken.user_id == current_user.id).all()
    connected = [t.provider for t in tokens]
    return {"connected_providers": connected}


@app.delete("/api/v1/calendar/disconnect/{provider}")
def calendar_disconnect(provider: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Disconnect a calendar provider for the current user."""
    token = db.query(models.CalendarToken).filter(
        models.CalendarToken.user_id == current_user.id,
        models.CalendarToken.provider == provider
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail=f"{provider} calendar not connected")
    db.delete(token)
    db.commit()
    return {"status": "disconnected", "provider": provider}


@app.post("/api/v1/calendar/event")
async def create_calendar_event(
    event_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a calendar event for the current user via the connected provider."""
    import httpx

    subject = event_data.get("subject", "Demo Meeting")
    start_iso = event_data.get("start")
    end_iso = event_data.get("end")
    attendee_email = event_data.get("attendee_email", "")
    description = event_data.get("description", "")

    if not start_iso:
        raise HTTPException(status_code=400, detail="start datetime is required")

    # Find a connected token (try google first, then microsoft)
    token_row = (
        db.query(models.CalendarToken)
        .filter(models.CalendarToken.user_id == current_user.id)
        .first()
    )

    if not token_row:
        return {"status": "no_calendar_connected", "message": "No calendar connected. Use deep link instead."}

    provider = token_row.provider

    try:
        if provider == "google":
            event_body = {
                "summary": subject,
                "description": description,
                "start": {"dateTime": start_iso, "timeZone": "UTC"},
                "end": {"dateTime": end_iso or start_iso, "timeZone": "UTC"},
            }
            if attendee_email:
                event_body["attendees"] = [{"email": attendee_email}]

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    json=event_body,
                    headers={"Authorization": f"Bearer {token_row.access_token}"}
                )
            if resp.status_code in (200, 201):
                return {"status": "created", "provider": "google", "event": resp.json()}
            else:
                return {"status": "failed", "provider": "google", "detail": resp.text}

        elif provider == "microsoft":
            event_body = {
                "subject": subject,
                "body": {"contentType": "Text", "content": description},
                "start": {"dateTime": start_iso, "timeZone": "UTC"},
                "end": {"dateTime": end_iso or start_iso, "timeZone": "UTC"},
            }
            if attendee_email:
                event_body["attendees"] = [{"emailAddress": {"address": attendee_email}, "type": "required"}]

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://graph.microsoft.com/v1.0/me/events",
                    json=event_body,
                    headers={"Authorization": f"Bearer {token_row.access_token}"}
                )
            if resp.status_code in (200, 201):
                return {"status": "created", "provider": "microsoft", "event": resp.json()}
            else:
                return {"status": "failed", "provider": "microsoft", "detail": resp.text}

    except Exception as e:
        return {"status": "error", "message": str(e)}


# ──────────────────── AI LAYER ────────────────────────────────────────────────
# Perplexity: pre-call client research
# Gemini: transcript analysis, document field pre-fill, regen from rejection, email draft, chat

@app.post("/api/v1/leads/{lead_id}/research")
async def research_lead_company(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Research a company using Perplexity sonar-pro. Stores result in PreCallReport.company_intel."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    result = await ai_service.research_company(
        company_name=lead.company or lead.name or "",
        domain=lead.website or "",
    )

    # Upsert PreCallReport
    report = db.query(models.PreCallReport).filter(models.PreCallReport.lead_id == lead_id).first()
    if not report:
        report = models.PreCallReport(lead_id=lead_id)
        db.add(report)
    report.company_intel = result
    db.commit()
    return result


@app.post("/api/v1/leads/{lead_id}/analyze-transcript")
async def analyze_lead_transcript(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Analyze transcript with Gemini. Extracts document needs, field values, call outcome."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.transcript_text and not lead.summary_text:
        raise HTTPException(status_code=400, detail="No transcript or summary found for this lead")

    result = await ai_service.analyze_transcript(
        transcript=lead.transcript_text or "",
        summary=lead.summary_text or "",
        action_items=lead.action_items_text or "",
    )

    # Store in latest Call record (or create one)
    call = (
        db.query(models.Call)
        .filter(models.Call.lead_id == lead_id)
        .order_by(models.Call.created_at.desc())
        .first()
    )
    if not call:
        call = models.Call(lead_id=lead_id)
        db.add(call)
    call.ai_analysis = result
    temp = result.get("lead_temperature")
    if temp in ("HOT", "WARM", "COLD"):
        call.lead_temperature = temp
        lead.lead_status = temp
    db.commit()
    return result


class PrefillRequest(BaseModel):
    doc_type: str
    template_name: str


@app.post("/api/v1/leads/{lead_id}/prefill-document")
async def prefill_document_fields(
    lead_id: int,
    req: PrefillRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Use Gemini to pre-fill document field values from transcript analysis + lead data."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Get template variables
    try:
        import document_service as doc_svc
        variables = doc_svc.scan_template_variables(req.template_name)
    except Exception:
        variables = []

    # Get latest AI analysis
    call = (
        db.query(models.Call)
        .filter(models.Call.lead_id == lead_id)
        .order_by(models.Call.created_at.desc())
        .first()
    )
    ai_analysis = call.ai_analysis if call and call.ai_analysis else {}

    lead_info = {
        "name": lead.name,
        "company": lead.company,
        "email": lead.email,
        "phone": lead.phone,
        "legal_name": lead.legal_name,
        "gst_number": lead.gst_number,
        "registered_address": lead.registered_address,
        "contact_person": lead.contact_person,
        "website": lead.website,
    }

    fields = await ai_service.prefill_document_fields(
        doc_type=req.doc_type,
        template_variables=variables,
        lead_info=lead_info,
        ai_analysis=ai_analysis,
    )
    return {"fields": fields, "template_variables": variables}


class RegenerateRequest(BaseModel):
    original_fields: dict
    template_name: str


@app.post("/api/v1/documents/{doc_id}/regenerate-fields")
async def regenerate_document_fields(
    doc_id: int,
    req: RegenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Use Gemini to adjust document fields based on all rejection remarks."""
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Collect all remarks
    remarks_parts = []
    if doc.tl_remarks:        remarks_parts.append(f"Team Lead: {doc.tl_remarks}")
    if doc.legal_remarks:     remarks_parts.append(f"Legal: {doc.legal_remarks}")
    if doc.finance_remarks:   remarks_parts.append(f"Finance: {doc.finance_remarks}")
    if getattr(doc, "marketing_remarks", None): remarks_parts.append(f"Marketing: {doc.marketing_remarks}")
    if getattr(doc, "admin_remarks", None):     remarks_parts.append(f"Admin: {doc.admin_remarks}")

    if not remarks_parts:
        raise HTTPException(status_code=400, detail="No rejection remarks found on this document")

    try:
        import document_service as doc_svc
        variables = doc_svc.scan_template_variables(req.template_name)
    except Exception:
        variables = list(req.original_fields.keys())

    fields = await ai_service.regenerate_document_fields(
        doc_type=doc.type or "",
        template_variables=variables,
        original_field_values=req.original_fields,
        rejection_remarks="\n".join(remarks_parts),
    )
    return {"fields": fields}


@app.post("/api/v1/leads/{lead_id}/draft-email")
async def draft_lead_email(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Use Gemini to draft a post-call follow-up email using transcript + KB templates."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Pull KB templates from app_settings
    subject_row = db.query(models.AppSettings).filter(models.AppSettings.key == "email_subject_template").first()
    body_row    = db.query(models.AppSettings).filter(models.AppSettings.key == "email_body_template").first()
    kb_subject  = (subject_row.value or "") if subject_row else ""
    kb_body     = (body_row.value or "")    if body_row    else ""

    # Ready-to-send documents for this lead
    docs = (
        db.query(models.Document)
        .filter(models.Document.lead_id == lead_id, models.Document.approval_status == "ready_to_send")
        .all()
    )
    doc_names = [d.type for d in docs if d.type]

    result = await ai_service.draft_followup_email(
        lead_info={"name": lead.name, "company": lead.company, "email": lead.email},
        transcript=lead.transcript_text or "",
        summary=lead.summary_text or "",
        action_items=lead.action_items_text or "",
        kb_subject_template=kb_subject,
        kb_body_template=kb_body,
        attached_docs=doc_names,
    )
    return result


class ChatRequest(BaseModel):
    message: str
    history: list = []


@app.post("/api/v1/leads/{lead_id}/chat")
async def chat_with_transcript(
    lead_id: int,
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Stream a Gemini chat response grounded in the lead's transcript / summary / action items."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    async def event_stream():
        async for chunk in ai_service.stream_chat_response(
            transcript=lead.transcript_text or "",
            summary=lead.summary_text or "",
            action_items=lead.action_items_text or "",
            user_message=req.message,
            history=req.history,
        ):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
