from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db
from auth import get_current_user, create_access_token, get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta, datetime
from pydantic import BaseModel
from typing import Optional, List
import models
import json
import os

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
]

_DOCUMENT_COLUMNS = [
    ("lead_id",       "INTEGER"),
    ("filename",      "VARCHAR(500)"),
    ("download_url",  "VARCHAR(500)"),
]

with engine.connect() as conn:
    for col, col_type in _LEAD_COLUMNS:
        if not _col_exists(conn, "leads", col):
            conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} {col_type}"))
    for col, col_type in _DOCUMENT_COLUMNS:
        if not _col_exists(conn, "documents", col):
            conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col} {col_type}"))
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
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/auth/me")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {"email": current_user.email, "role": current_user.role}

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
def list_leads(db: Session = Depends(get_db)):
    leads = db.query(models.Lead).order_by(models.Lead.id.desc()).all()
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
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    data = lead.dict()
    data["last_contact"] = _parse_dt(data.pop("last_contact", None))
    data["follow_up_date"] = _parse_dt(data.pop("follow_up_date", None))
    db_lead = models.Lead(**data)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return {"id": db_lead.id, "status": "created"}

@app.put("/api/v1/leads/{lead_id}")
def update_lead(lead_id: int, lead: LeadCreate, db: Session = Depends(get_db)):
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
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
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
        return {"lead_id": lead_id, "status": "no_report"}
    return {"lead_id": lead_id, "intel": report.company_intel, "missing": report.missing_fields}

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
def list_templates():
    from document_service import list_templates as ls
    return ls()

@app.post("/api/v1/templates/upload")
async def upload_template(
    file: UploadFile = File(...),
    department: str = Form("sdr"),
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

class DocGenRequest(BaseModel):
    template_name: str
    data: dict
    convert_pdf: bool = False
    lead_id: Optional[int] = None
    doc_type: Optional[str] = None  # e.g. "invoice", "quotation", "contract"

@app.post("/api/v1/documents/generate")
def generate_document(req: DocGenRequest, db: Session = Depends(get_db)):
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

        doc_record = models.Document(
            lead_id=req.lead_id,
            type=req.doc_type,
            filename=filename,
            file_path=result.get("docx_path", ""),
            download_url=download_url,
            status="generated",
        )
        db.add(doc_record)
        db.commit()

    return result

@app.get("/api/v1/leads/{lead_id}/documents")
def list_lead_documents(lead_id: int, db: Session = Depends(get_db)):
    """Return all documents generated for a given lead."""
    docs = db.query(models.Document).filter(models.Document.lead_id == lead_id).order_by(models.Document.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "type": d.type,
            "filename": d.filename,
            "file_path": d.file_path,
            "download_url": d.download_url,
            "status": d.status,
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

# ──────────────────── NOTIFICATIONS ────────────────────
@app.get("/api/v1/notifications")
def list_notifications(db: Session = Depends(get_db)):
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
def mark_notifications_read(ids: List[int] = Body(...), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(models.Notification.id.in_(ids)).update(
        {"is_read": True}, synchronize_session=False
    )
    db.commit()
    return {"status": "marked_read", "count": len(ids)}

@app.post("/api/v1/notifications/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(get_db)):
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
def send_document_email(id: int, req: EmailSendRequest, db: Session = Depends(get_db)):
    # In production, integrate SMTP/SendGrid here
    return {"status": "sent", "to": req.to, "subject": req.subject}

# ──────────────────── RESCHEDULE EMAIL ────────────────────
class RescheduleEmailRequest(BaseModel):
    lead_id: int
    new_datetime: str          # ISO string for the rescheduled demo
    teams_link: Optional[str] = None
    to_email: str
    cc_emails: List[str] = []
    lead_name: str
    company: str
    sender_name: str = "SDR Team"

@app.post("/api/v1/leads/{lead_id}/reschedule")
def reschedule_demo(lead_id: int, req: RescheduleEmailRequest, db: Session = Depends(get_db)):
    """Update demo_time (and optionally teams_link) and record a reschedule email dispatch."""
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Save the new demo time
    db_lead.demo_time = req.new_datetime
    if req.teams_link:
        db_lead.teams_link = req.teams_link
    db_lead.demo_status = "Demo Rescheduled"
    db.commit()

    # Build email log (in production replace with SMTP/SendGrid)
    email_payload = {
        "to": req.to_email,
        "cc": req.cc_emails,
        "subject": f"Demo Rescheduled: {req.company} — New Booking Confirmation",
        "body": (
            f"Dear {req.lead_name},\n\n"
            f"We wanted to inform you that your demo has been rescheduled.\n\n"
            f"New Date & Time: {req.new_datetime}\n"
            + (f"Meeting Link: {req.teams_link}\n" if req.teams_link else "")
            + f"\nPlease confirm your availability. We look forward to speaking with you.\n\n"
            f"Best regards,\n{req.sender_name}"
        ),
    }
    # TODO: plug in SMTP / SendGrid / Resend here
    return {"status": "rescheduled", "email": email_payload}

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
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(models.AppSettings).all()
    return {r.key: r.value for r in rows}

@app.put("/api/v1/settings")
def update_settings(data: dict = Body(...), db: Session = Depends(get_db)):
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
def list_transcripts(db: Session = Depends(get_db)):
    """Return all leads that have transcript data."""
    leads = db.query(models.Lead).filter(
        models.Lead.transcript_text.isnot(None)
    ).order_by(models.Lead.updated_at.desc()).all()
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
def upload_transcript_text(req: TranscriptUpload, db: Session = Depends(get_db)):
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
