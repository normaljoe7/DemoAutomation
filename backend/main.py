from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import engine, get_db
from auth import get_current_user, create_access_token, get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from pydantic import BaseModel
from typing import Optional, List
import models
import json
import os

# Create all tables
models.Base.metadata.create_all(bind=engine)

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
    legal_name: Optional[str] = None
    gst_number: Optional[str] = None
    registered_address: Optional[str] = None
    contact_person: Optional[str] = None
    email: str
    phone: Optional[str] = None

@app.get("/api/v1/leads")
def list_leads(db: Session = Depends(get_db)):
    leads = db.query(models.Lead).all()
    return [{"id":l.id,"legal_name":l.legal_name,"email":l.email,"phone":l.phone,
             "contact_person":l.contact_person,"gst_number":l.gst_number,
             "registered_address":l.registered_address} for l in leads]

@app.post("/api/v1/leads")
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = models.Lead(**lead.dict())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return {"id": db_lead.id}

@app.put("/api/v1/leads/{lead_id}")
def update_lead(lead_id: int, lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for key, val in lead.dict(exclude_unset=True).items():
        setattr(db_lead, key, val)
    db.commit()
    return {"status": "updated"}

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
async def upload_template(file: UploadFile = File(...)):
    from document_service import upload_template as ut
    content = await file.read()
    result = ut(content, file.filename)
    return result

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

@app.post("/api/v1/documents/generate")
def generate_document(req: DocGenRequest):
    from document_service import generate_document as gen
    try:
        result = gen(req.template_name, req.data, req.convert_pdf)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/documents/{filename}/download")
def download_document(filename: str):
    from document_service import OUTPUT_DIR
    fpath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(fpath, filename=filename)

# ──────────────────── APPROVALS ────────────────────
@app.post("/api/v1/documents/{id}/approve")
def approve_document(id: int, db: Session = Depends(get_db)):
    return {"status": "approved", "document_id": id}

@app.post("/api/v1/documents/{id}/reject")
def reject_document(id: int, db: Session = Depends(get_db)):
    return {"status": "rejected", "document_id": id}

class EmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    attachments: List[str] = []

@app.post("/api/v1/documents/{id}/send")
def send_document_email(id: int, req: EmailSendRequest, db: Session = Depends(get_db)):
    # In production, integrate SMTP/SendGrid here
    return {"status": "sent", "to": req.to, "subject": req.subject}

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
