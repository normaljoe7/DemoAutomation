"""
AI Service — Perplexity (research) + Gemini (analysis, generation, chat)
All functions are async-compatible.
"""

import os
import httpx
import json
import re
from typing import AsyncIterator, Optional

# ── Gemini ───────────────────────────────────────────────────────────────────
try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False
    genai = None  # type: ignore

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
PERPLEXITY_API_KEY = os.environ.get("PERPLEXITY_API_KEY", "")

GEMINI_MODEL = "gemini-2.0-flash-exp"
PERPLEXITY_MODEL = "sonar-pro"

if GEMINI_API_KEY and _GENAI_AVAILABLE:
    genai.configure(api_key=GEMINI_API_KEY)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """Extract a JSON object from Gemini response, handling markdown code fences."""
    # Try fenced block first
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    # Try raw JSON object
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"No JSON object found in response: {text[:200]}")


def _get_gemini_model():
    if not _GENAI_AVAILABLE:
        raise RuntimeError("google-generativeai is not installed. Run: pip install google-generativeai")
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
    return genai.GenerativeModel(GEMINI_MODEL)


# ── 1. Perplexity: Company Research ──────────────────────────────────────────

async def research_company(
    company_name: str,
    domain: Optional[str] = None,
    criteria: str = "",
) -> dict:
    """
    Research a company using Perplexity sonar-pro.
    Searches: open web + LinkedIn + Crunchbase + company domain.
    Returns structured JSON with company intel + citations.
    """
    if not PERPLEXITY_API_KEY:
        return {"error": "PERPLEXITY_API_KEY not set in backend/.env"}

    # Build domain filter — always include company domain + curated B2B sources
    domain_filters = ["linkedin.com", "crunchbase.com", "techcrunch.com"]
    if domain:
        host = domain.replace("https://", "").replace("http://", "").split("/")[0].strip()
        if host:
            domain_filters.insert(0, host)

    system_prompt = (
        "You are a B2B sales intelligence analyst. Research the company thoroughly and return "
        "a structured JSON object with EXACTLY these keys:\n"
        "{\n"
        '  "overview": "2-3 sentence company summary",\n'
        '  "industry": "primary industry",\n'
        '  "company_size": "headcount range or exact number",\n'
        '  "headquarters": "city, country",\n'
        '  "founded_year": "year or null",\n'
        '  "website": "official website URL",\n'
        '  "recent_news": [{"title": "", "date": "", "summary": ""}],\n'
        '  "key_people": [{"name": "", "title": ""}],\n'
        '  "funding_stage": "bootstrapped / seed / series-A / public / etc.",\n'
        '  "tech_stack": ["list of known technologies"],\n'
        '  "pain_points": "likely business challenges this company faces",\n'
        '  "opportunities": "why they would benefit from AI/SaaS SDR tools",\n'
        '  "competitor_mentions": ["competitor names"],\n'
        '  "sources": ["list of source URLs you used"]\n'
        "}\n"
        "Return ONLY valid JSON. Do not add commentary outside the JSON object."
    )

    user_query = f"Research the company: {company_name}."
    if criteria:
        user_query += f" Additional context: {criteria}"

    body: dict = {
        "model": PERPLEXITY_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        "return_citations": True,
        "return_images": False,
    }
    if domain_filters:
        body["search_domain_filter"] = domain_filters

    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            "https://api.perplexity.ai/chat/completions",
            json=body,
            headers={
                "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"]
    citations = data.get("citations", [])

    try:
        parsed = _extract_json(content)
    except Exception:
        parsed = {"raw": content, "parse_error": True}

    parsed["citations"] = citations
    return parsed


# ── 2. Gemini: Post-call Transcript Analysis ─────────────────────────────────

async def analyze_transcript(
    transcript: str,
    summary: str,
    action_items: str,
) -> dict:
    """
    Analyze a sales call transcript using Gemini.
    Identifies documents needed, extracts field values, assesses call outcome.
    Stores result in calls.ai_analysis.
    """
    model = _get_gemini_model()

    prompt = f"""You are a B2B sales analyst reviewing a sales call transcript.

TRANSCRIPT:
{transcript or "(not provided)"}

CALL SUMMARY:
{summary or "(not provided)"}

ACTION ITEMS:
{action_items or "(not provided)"}

Analyze the above and return a JSON object with exactly these keys:
{{
  "documents_needed": ["list — choose from: invoice, quotation, contract, non_disclosure, non_compete, brochure, sample_list"],
  "extracted_fields": {{
    "client_name": "",
    "client_company": "",
    "client_email": "",
    "client_phone": "",
    "contact_person": "",
    "gst_number": "",
    "registered_address": "",
    "deal_value": "",
    "currency": "INR",
    "start_date": "",
    "end_date": "",
    "duration_months": "",
    "payment_terms": "",
    "services_discussed": "",
    "quantity": "",
    "unit_price": "",
    "gst_rate": "18",
    "validity_days": "30",
    "governing_law": "India",
    "restriction_period_months": "",
    "geographic_scope": ""
  }},
  "call_outcome": "one of: closed_won, follow_up_required, documents_requested, no_interest, needs_demo",
  "lead_temperature": "HOT or WARM or COLD",
  "call_insights": "2-3 sentence summary of what happened, key objections, and next steps",
  "confidence": 0.85
}}

Rules:
- Only include document types explicitly discussed or requested in the call.
- Fill extracted_fields ONLY with values clearly stated in the transcript. Leave blank ("") if uncertain.
- lead_temperature: HOT = strong buying signals + decision maker engaged; WARM = interested but not committed; COLD = no clear interest.
- Return ONLY valid JSON. No text outside the JSON object."""

    response = model.generate_content(prompt)
    try:
        result = _extract_json(response.text)
        return result
    except Exception as e:
        return {
            "raw": response.text,
            "error": f"JSON parse failed: {e}",
            "documents_needed": [],
            "extracted_fields": {},
            "call_outcome": "follow_up_required",
            "lead_temperature": "WARM",
            "call_insights": "Analysis failed — check raw field.",
            "confidence": 0.0,
        }


# ── 3. Gemini: Pre-fill Document Fields ──────────────────────────────────────

async def prefill_document_fields(
    doc_type: str,
    template_variables: list,
    lead_info: dict,
    ai_analysis: dict,
) -> dict:
    """
    Map extracted call data + lead info onto template variable names.
    Returns {variable_name: filled_value} for every template variable.
    """
    model = _get_gemini_model()

    extracted = ai_analysis.get("extracted_fields", {}) if ai_analysis else {}

    prompt = f"""You are filling out a {doc_type} document template for a B2B client.

TEMPLATE VARIABLES — you must provide a value for each key in the output JSON:
{json.dumps(template_variables, indent=2)}

LEAD DATA FROM DATABASE:
{json.dumps(lead_info, indent=2)}

AI-EXTRACTED CALL DATA:
{json.dumps(extracted, indent=2)}

Instructions:
- Map the available data to each template variable name intelligently.
- For names: use client_name or contact_person from extracted fields, or lead.name from DB.
- For company: use client_company from extracted fields, or lead.company from DB.
- For dates: use DD/MM/YYYY format.
- For monetary values: use numeric only (no currency symbols, no commas) — e.g. "50000" not "₹50,000".
- For GST rate: default 18 if not specified.
- If no data is available for a variable, return empty string "".
- Do NOT invent or fabricate numbers, prices, or legal terms.
- Return ONLY a valid JSON object where keys are the exact template variable names."""

    response = model.generate_content(prompt)
    try:
        fields = _extract_json(response.text)
        # Ensure all template variables are present (fill missing with "")
        for var in template_variables:
            if var not in fields:
                fields[var] = ""
        return fields
    except Exception:
        return {var: "" for var in template_variables}


# ── 4. Gemini: Regenerate Document Fields from Rejection Remarks ──────────────

async def regenerate_document_fields(
    doc_type: str,
    template_variables: list,
    original_field_values: dict,
    rejection_remarks: str,
) -> dict:
    """
    Adjust document field values based on rejection feedback from reviewers.
    Returns the full field dict (updated + unchanged values).
    """
    model = _get_gemini_model()

    prompt = f"""A {doc_type} document was rejected. You must update the field values to address the feedback.

REJECTION REMARKS FROM REVIEWERS:
{rejection_remarks}

ORIGINAL FIELD VALUES:
{json.dumps(original_field_values, indent=2)}

TEMPLATE VARIABLES (all must be present in your output):
{json.dumps(template_variables, indent=2)}

Instructions:
- Read the rejection remarks carefully and identify which fields need to change.
- Only modify fields that are relevant to the rejection feedback.
- Keep all other fields exactly as they were in the original values.
- Preserve date formats (DD/MM/YYYY) and numeric formats (no commas/currency symbols).
- Return ONLY a valid JSON object with ALL template variable keys and their values."""

    response = model.generate_content(prompt)
    try:
        fields = _extract_json(response.text)
        # Ensure all variables are present
        for var in template_variables:
            if var not in fields:
                fields[var] = original_field_values.get(var, "")
        return fields
    except Exception:
        return {var: original_field_values.get(var, "") for var in template_variables}


# ── 5. Gemini: Draft Follow-up Email ─────────────────────────────────────────

async def draft_followup_email(
    lead_info: dict,
    transcript: str,
    summary: str,
    action_items: str,
    kb_subject_template: str = "",
    kb_body_template: str = "",
    attached_docs: list = None,
) -> dict:
    """
    Draft a professional post-call follow-up email using Gemini.
    Uses Knowledge Base templates as references.
    Returns {subject, body, suggested_attachments}.
    """
    model = _get_gemini_model()
    attached_docs = attached_docs or []

    prompt = f"""Draft a professional post-call B2B follow-up email.

RECIPIENT:
Name: {lead_info.get("name") or "there"}
Company: {lead_info.get("company") or "your company"}
Email: {lead_info.get("email") or ""}

CALL SUMMARY:
{summary or "(not provided — draft based on transcript)"}

ACTION ITEMS AGREED ON THE CALL:
{action_items or "(not provided)"}

DOCUMENTS BEING ATTACHED: {", ".join(attached_docs) if attached_docs else "None"}

SUBJECT LINE TEMPLATE (use as reference, customise):
{kb_subject_template or "Follow-up: [Call Topic] — [Company Name]"}

EMAIL BODY TEMPLATE (use as reference, customise):
{kb_body_template or "Dear [Name],\\n\\nThank you for your time today. It was great connecting with you.\\n\\n[Summary]\\n\\n[Action Items]\\n\\nLooking forward to hearing from you.\\n\\nBest regards,"}

Write a warm, professional email that:
1. Opens with a genuine thank-you for the call
2. Summarises 2-3 key discussion points as bullet points
3. Lists the agreed action items clearly
4. References the attached documents (if any)
5. States clear next steps and a call to action

Return ONLY a valid JSON object:
{{
  "subject": "the email subject line",
  "body": "the full email body with proper line breaks using \\n",
  "suggested_attachments": ["doc types that should definitely be attached"]
}}"""

    response = model.generate_content(prompt)
    try:
        result = _extract_json(response.text)
        if "subject" not in result:
            result["subject"] = f"Follow-up: Our Call with {lead_info.get('company', 'You')}"
        if "body" not in result:
            result["body"] = response.text
        if "suggested_attachments" not in result:
            result["suggested_attachments"] = attached_docs
        return result
    except Exception:
        return {
            "subject": f"Follow-up: Our Call with {lead_info.get('company', 'You')}",
            "body": response.text,
            "suggested_attachments": attached_docs,
        }


# ── 6. Gemini: Chat with Transcript (Streaming) ──────────────────────────────

async def stream_chat_response(
    transcript: str,
    summary: str,
    action_items: str,
    user_message: str,
    history: list = None,
) -> AsyncIterator[str]:
    """
    Stream a Gemini response for transcript Q&A.
    Yields text chunks as they are generated.
    """
    if not _GENAI_AVAILABLE:
        yield "google-generativeai package is not installed. Please run: pip install google-generativeai"
        return
    if not GEMINI_API_KEY:
        yield "GEMINI_API_KEY is not configured. Please add it to backend/.env"
        return

    history = history or []

    system_context = (
        "You are an AI assistant helping a sales team analyse a call transcript. "
        "Answer questions accurately and concisely based ONLY on the transcript, summary, "
        "and action items provided below. If the answer is not in the transcript, say so clearly. "
        "Be direct and helpful — sales reps need quick, actionable answers.\n\n"
        f"TRANSCRIPT:\n{transcript or '(not provided)'}\n\n"
        f"CALL SUMMARY:\n{summary or '(not provided)'}\n\n"
        f"ACTION ITEMS:\n{action_items or '(not provided)'}"
    )

    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system_context)

    # Build chat history (last 10 messages for context window)
    chat_history = []
    for msg in (history or [])[-10:]:
        role = "user" if msg.get("role") == "user" else "model"
        chat_history.append({"role": role, "parts": [msg.get("content", "")]})

    chat = model.start_chat(history=chat_history)

    try:
        response = chat.send_message(user_message, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\n[Error generating response: {e}]"
