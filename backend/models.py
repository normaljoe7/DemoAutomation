from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON, DateTime, Text, Float
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="sdr") # sdr, finance, legal, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    # Core contact info
    name = Column(String(255), nullable=True)           # lead person's display name
    job_title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    email = Column(String(255), index=True)
    phone = Column(String(50), nullable=True)
    # KYC / compliance fields
    legal_name = Column(String(255), nullable=True)
    gst_number = Column(String(50), nullable=True)
    registered_address = Column(Text, nullable=True)
    contact_person = Column(String(255), nullable=True)
    # Pipeline status
    lead_status = Column(String(50), default="NOT CLASSIFIED")  # HOT/WARM/COLD/NOT CLASSIFIED
    demo_status = Column(String(100), nullable=True)           # Demo Scheduled / ... / Demo Completed
    demo_sub_status = Column(String(100), nullable=True)
    demo_time = Column(String(255), nullable=True)             # human-readable or ISO string
    # Meeting links
    teams_link = Column(String(500), nullable=True)
    bubbles_link = Column(String(500), nullable=True)
    # Dates
    last_contact = Column(DateTime, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    # Post-call
    call_rating = Column(Integer, default=0)
    transcript_text = Column(Text, nullable=True)
    summary_text = Column(Text, nullable=True)
    action_items_text = Column(Text, nullable=True)
    # Documents tracking (JSON arrays)
    requested_docs = Column(JSON, nullable=True)       # e.g. ["invoice", "quotation", "non_disclosure"]
    selected_documents = Column(JSON, nullable=True)   # human-readable: ["Invoice + Payment Link", "NDA"]
    generated_docs = Column(JSON, nullable=True)       # doc keys that have been generated: ["invoice"]
    generated_doc_urls = Column(JSON, nullable=True)   # {docKey: downloadUrl}
    # Custom field values (populated from settings-defined custom fields)
    custom_field_values = Column(JSON, nullable=True)  # {fieldName: value}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pre_call_reports = relationship("PreCallReport", back_populates="lead")
    calls = relationship("Call", back_populates="lead")

class PreCallReport(Base):
    __tablename__ = "pre_call_reports"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    booking_data = Column(JSON, nullable=True)
    company_intel = Column(JSON, nullable=True)
    missing_fields = Column(JSON, nullable=True)
    ppt_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="pre_call_reports")

class Call(Base):
    __tablename__ = "calls"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    transcript_path = Column(String(500), nullable=True)
    summary_path = Column(String(500), nullable=True)
    action_items_path = Column(String(500), nullable=True)
    ai_analysis = Column(JSON, nullable=True)
    lead_temperature = Column(String(50), nullable=True) # hot, warm, cold
    created_at = Column(DateTime, default=datetime.utcnow)
    
    lead = relationship("Lead", back_populates="calls")
    documents = relationship("Document", back_populates="call")
    analytics = relationship("CallAnalytic", back_populates="call")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    type = Column(String(50)) # invoice, contract, quotation, sample_list, mom
    filename = Column(String(500), nullable=True)    # stored filename (basename only)
    file_path = Column(String(500))
    pdf_path = Column(String(500), nullable=True)
    download_url = Column(String(500), nullable=True)
    status = Column(String(50), default="generated") # generated, pending_approval, approved, rejected, sent
    payment_link = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    call = relationship("Call", back_populates="documents")
    approvals = relationship("ApprovalQueue", back_populates="document")

class ApprovalQueue(Base):
    __tablename__ = "approval_queue"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    step = Column(String(50)) # sdr_review, finance_review, legal_review, final_sdr
    status = Column(String(50), default="pending") # pending, approved, rejected
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    document = relationship("Document", back_populates="approvals")

class DocumentTemplate(Base):
    __tablename__ = "document_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    type = Column(String(50))
    file_path = Column(String(500))
    variables = Column(JSON, nullable=True)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

class CallAnalytic(Base):
    __tablename__ = "call_analytics"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"))
    talk_ratio = Column(Float, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    performance_scores = Column(JSON, nullable=True)
    coaching_insights = Column(JSON, nullable=True)
    
    call = relationship("Call", back_populates="analytics")

class SDRKnowledgeBase(Base):
    __tablename__ = "sdr_knowledge_base"
    id = Column(Integer, primary_key=True, index=True)
    sdr_id = Column(Integer, ForeignKey("users.id"))
    mom_prompt = Column(Text, nullable=True)
    mom_format = Column(Text, nullable=True)
    action_item_format = Column(String(50), default="bullets")
    approval_thresholds = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Note: sdr_id foreign key ensures 1-to-1 or 1-to-many relationship with user

class AppSettings(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info, approved, rejected
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    lead_name = Column(String(255), nullable=True)
    doc_type = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
