"""
Document Generation Service - Integrates Document Generator v30 Core Engine
into the FastAPI backend for the SDR Command Center.
"""
import os
import json
import shutil
from datetime import datetime
from core.document_engine import DocumentEngine
from core.data_processor import smart_format_data, perform_calculations

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
METADATA_FILE = os.path.join(TEMPLATES_DIR, "_metadata.json")

# Ensure directories exist
for d in [TEMPLATES_DIR, OUTPUT_DIR, UPLOADS_DIR]:
    os.makedirs(d, exist_ok=True)

engine = DocumentEngine()

def _load_metadata() -> dict:
    """Load template metadata from the JSON sidecar file."""
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def _save_metadata(meta: dict):
    """Persist template metadata to the JSON sidecar file."""
    with open(METADATA_FILE, "w") as f:
        json.dump(meta, f, indent=2)

def list_templates():
    """Return all template files from the templates directory."""
    templates = []
    if not os.path.exists(TEMPLATES_DIR):
        return templates
    meta = _load_metadata()
    for fname in sorted(os.listdir(TEMPLATES_DIR)):
        if fname.startswith("_") or not fname.endswith(('.docx', '.pptx')):
            continue
        fpath = os.path.join(TEMPLATES_DIR, fname)
        try:
            variables = engine.scan_variables(fpath)
        except Exception:
            variables = []
        file_meta = meta.get(fname, {})
        templates.append({
            "name": fname,
            "path": fpath,
            "type": "pptx" if fname.endswith(".pptx") else "docx",
            "variables": variables,
            "department": file_meta.get("department", "sdr"),
            "uploaded_at": file_meta.get("uploaded_at", ""),
        })
    return templates

def upload_template(file_bytes: bytes, filename: str, department: str = "sdr"):
    """Save an uploaded template file and record its department metadata."""
    # Validate extension
    if not (filename.lower().endswith(".docx") or filename.lower().endswith(".pptx")):
        raise ValueError("Only .docx and .pptx files are supported.")
    dest = os.path.join(TEMPLATES_DIR, filename)
    with open(dest, "wb") as f:
        f.write(file_bytes)
    # Fix XML split tags (DOCX only)
    if filename.lower().endswith(".docx"):
        try:
            engine.fix_template_xml(dest)
        except Exception:
            pass
    try:
        variables = engine.scan_variables(dest)
    except Exception:
        variables = []
    # Persist department metadata
    meta = _load_metadata()
    meta[filename] = {
        "department": department,
        "uploaded_at": datetime.utcnow().isoformat(),
    }
    _save_metadata(meta)
    return {"name": filename, "path": dest, "variables": variables, "department": department}

def delete_template_metadata(filename: str):
    """Remove metadata entry for a deleted template."""
    meta = _load_metadata()
    if filename in meta:
        del meta[filename]
        _save_metadata(meta)

def generate_document(template_name: str, data: dict, convert_pdf: bool = False):
    """
    Generate a document from a template using the v30 DocumentEngine.
    Applies smart_format_data and perform_calculations before rendering.
    """
    template_path = os.path.join(TEMPLATES_DIR, template_name)
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found: {template_name}")

    # Step 1: Financial calculations (qty * price, tax, totals)
    processed_data = perform_calculations(data)
    # Step 2: Smart formatting (currency symbols, Indian/Western format, dates)
    processed_data = smart_format_data(processed_data)

    # Generate output filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = ".pptx" if template_name.endswith(".pptx") else ".docx"
    output_filename = f"generated_{timestamp}{ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    docx_path, pdf_path, error_msg = engine.generate(
        template_path, processed_data, output_path, convert_pdf=convert_pdf
    )

    return {
        "docx_path": docx_path,
        "pdf_path": pdf_path,
        "error": error_msg,
        "filename": output_filename
    }

def delete_template(template_name: str):
    """Delete a template file and its metadata."""
    fpath = os.path.join(TEMPLATES_DIR, template_name)
    if os.path.exists(fpath):
        os.remove(fpath)
        delete_template_metadata(template_name)
        return True
    return False

def scan_template_variables(template_name: str):
    """Return the placeholder variables found in a template."""
    fpath = os.path.join(TEMPLATES_DIR, template_name)
    return engine.scan_variables(fpath)
