"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  Video,
  AlertCircle,
  Download,
  Briefcase,
  FileText,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  FileUp,
  ListChecks,
  Mail,
  Send,
  ExternalLink,
  Sparkles,
  FilePlus,
  Eye,
  ChevronDown,
  Presentation,
  Lock,
  Circle,
  Star,
  ClipboardList,
  BarChart3,
  Phone,
  Calendar,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

// ─── Types ───
interface LeadIntel {
  industry: string;
  size: string;
  recentNews: string;
}

interface Lead {
  id: string;
  email: string;
  name: string;
  jobTitle: string;
  company: string;
  phone: string;
  leadStatus: string;
  demoStatus: string;
  demoSubStatus: string;
  demoTime: string;
  teamsLink: string;
  bubblesLink: string;
  missingFields: string[];
  intel: LeadIntel;
  transcript: string | null;
  summary: string | null;
  actionItems: string | null;
  generatedDocs: string[]; // keys like "invoice", "quotation", "contract"
  lastContact: string; // ISO datetime string e.g. "2026-03-04T14:00:00"
  followUpDate: string | null; // ISO datetime string for follow-up
  requestedDocs: string[]; // doc types requested by client: "invoice"|"quotation"|"contract"|"brochure"|"sample_list"
  sampleListFile: string | null;
  selectedDocuments: string[]; // human-readable doc names from the multi-select dialog
  callRating: number; // 0-5 star rating for internal post-call synopsis
}

// ─── Dropdown Options ───
const leadStatusOptions = ["HOT", "WARM", "COLD", "NOT CLASSIFIED"];
const demoStatusOptions = ["Demo Scheduled", "Demo Rescheduled", "Demo Cancelled", "Demo No Show", "Demo Completed"];

// ─── Hierarchical Sub-Status Map ───
const demoSubStatusMap: Record<string, string[]> = {
  "Demo Scheduled": [
    "Demo In Progress (On Call)",
    "Demo Completed (Documents Requested)",
    "Demo Completed (Approval Required)",
    "Demo Completed (Follow Up Demo)",
    "Demo Completed (Follow Up)",
    "Demo Completed (Closure)",
    "Demo Rescheduled",
  ],
  "Demo Rescheduled": [
    "Same Week",
    "Next Week",
    "Same Month",
    "Next Month",
    "Next Quarter",
    "After 6 Months",
    "Other",
  ],
  "Demo Cancelled": [
    "Client Cancellation",
    "Other",
  ],
  "Demo No Show": [
    "Reason",
    "Follow Up Process Followed",
    "Follow Up Process Not Followed (24hr)",
    "Follow Up Process Not Followed (SOD)",
    "Follow Up Process Not Followed (2hr)",
    "Technical Issue",
    "Calendar Invite Not Sent",
  ],
  "Demo Completed": [
    "Documents Requested",
    "Approval Required – Client Side, Follow Up",
    "Follow Up Demo",
    "Follow Up",
    "Closure",
  ],
};

// All possible sub-statuses (flat list for color map)
const allDemoSubStatuses = Object.values(demoSubStatusMap).flat();

// ─── Datetime formatting helper ───
function formatDateTime(isoStr: string | null): { date: string; time: string } {
  if (!isoStr) return { date: "—", time: "" };
  try {
    const d = new Date(isoStr);
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return { date, time };
  } catch {
    return { date: isoStr, time: "" };
  }
}

// ─── Requestable document types when "Documents Requested" is selected ───
const requestableDocuments = [
  "Agreement",
  "One Page / Brochure",
  "Corporate Deck",
  "Invoice + Payment Link",
  "Sample List",
];

// ─── Mock Data ───
const initialLeads: Lead[] = [
  {
    id: "lead_1",
    email: "kristen.hayer@stark.com",
    name: "Kristen Hayer",
    jobTitle: "CEO",
    company: "Stark Industries",
    phone: "+1 415-555-0123",
    leadStatus: "HOT",
    demoStatus: "Demo Scheduled",
    demoSubStatus: "Demo In Progress (On Call)",
    demoTime: "Today, 2:00 PM EST",
    teamsLink: "https://teams.microsoft.com/l/meetup-join/example1",
    bubblesLink: "https://app.usebubbles.com/recording/example1",
    missingFields: ["gst_number", "registered_address"],
    intel: { industry: "Defense & Tech", size: "10,000+ employees", recentNews: "Acquired new AI startup for $500M last week. Expanding manufacturing in Europe." },
    transcript: null, summary: null, actionItems: null, generatedDocs: [],
    lastContact: "2026-03-04T14:00:00",
    followUpDate: "2026-03-06T10:00:00",
    requestedDocs: [], sampleListFile: null, selectedDocuments: [], callRating: 0,
  },
  {
    id: "lead_2",
    email: "tonystark@avengers.io",
    name: "Tony Stark",
    jobTitle: "Founder",
    company: "Avengers Initiative",
    phone: "+1 212-555-9876",
    leadStatus: "NOT CLASSIFIED",
    demoStatus: "Demo Scheduled",
    demoSubStatus: "Demo Rescheduled",
    demoTime: "Today, 4:30 PM EST",
    teamsLink: "https://teams.microsoft.com/l/meetup-join/example2",
    bubblesLink: "https://app.usebubbles.com/recording/example2",
    missingFields: ["legal_name", "contact_person", "gst_number"],
    intel: { industry: "Security", size: "50-100 employees", recentNews: "Recently launched new global security protocol." },
    transcript: null, summary: null, actionItems: null, generatedDocs: [],
    lastContact: "2026-03-03T09:30:00",
    followUpDate: "2026-03-07T15:00:00",
    requestedDocs: [], sampleListFile: null, selectedDocuments: [], callRating: 0,
  },
  {
    id: "lead_3",
    email: "ppotts@stark.com",
    name: "Pepper Potts",
    jobTitle: "COO",
    company: "Stark Industries",
    phone: "+1 415-555-0124",
    leadStatus: "WARM",
    demoStatus: "Demo Completed",
    demoSubStatus: "Documents Requested",
    demoTime: "Tomorrow, 10:00 AM EST",
    teamsLink: "https://teams.microsoft.com/l/meetup-join/example3",
    bubblesLink: "https://app.usebubbles.com/recording/example3",
    missingFields: [],
    intel: { industry: "Defense & Tech", size: "10,000+ employees", recentNews: "Focusing on sustainability and clean energy operations." },
    transcript: "pepper_potts_transcript.txt",
    summary: "Client requested a Quotation for 200 seat deployment and a Sample List for B2B tech companies. Also asked for the product Brochure and a formal Contract.",
    actionItems: "Send Quotation by Mar 5. Send Sample List CSV. Attach Brochure PDF. Draft Contract.",
    generatedDocs: ["quotation"],
    lastContact: "2026-03-02T11:00:00",
    followUpDate: "2026-03-05T14:00:00",
    requestedDocs: ["quotation", "sample_list", "brochure", "contract"], sampleListFile: null, selectedDocuments: ["Agreement", "Invoice + Payment Link", "Sample List"], callRating: 4,
  },
  {
    id: "lead_4",
    email: "trishasilver12@gmail.com",
    name: "Trishala V",
    jobTitle: "Account Manager",
    company: "Silver Corp",
    phone: "+91 6362664320",
    leadStatus: "HOT",
    demoStatus: "Demo Completed",
    demoSubStatus: "Closure",
    demoTime: "Dec 12, 1:00 PM EST",
    teamsLink: "https://teams.microsoft.com/l/meetup-join/example4",
    bubblesLink: "https://app.usebubbles.com/recording/example4",
    missingFields: ["registered_address"],
    intel: { industry: "Software", size: "500-1000 employees", recentNews: "Scaling operations rapidly in APAC region." },
    transcript: null, summary: null, actionItems: null, generatedDocs: [],
    lastContact: "2025-12-12T13:00:00",
    followUpDate: null,
    requestedDocs: ["invoice", "brochure"], sampleListFile: null, selectedDocuments: ["Invoice + Payment Link", "One Page / Brochure"], callRating: 0,
  },
];

// ─── Post-Call Document Definitions (no MOM — included in email body) ───
const postCallDocs: Record<string, { label: string; required: string[]; department: "finance" | "legal" | "sdr"; type: "generate" | "pdf" | "csv" }> = {
  invoice: { label: "Invoice", required: ["client_name", "invoice_date", "quantity", "price_inr", "gst_rate", "total_amount_inr"], department: "finance", type: "generate" },
  contract: { label: "Contract", required: ["client_name", "company_name", "start_date", "end_date", "contract_value", "terms"], department: "legal", type: "generate" },
  quotation: { label: "Quotation", required: ["client_name", "quotation_date", "item_description", "quantity", "price_usd", "validity_period"], department: "finance", type: "generate" },
  brochure: { label: "Brochure", required: [], department: "sdr", type: "pdf" },
  sample_list: { label: "Sample List", required: [], department: "sdr", type: "csv" },
};

// ─── Also keep templateFields for the generate dialog (legacy) ───
const templateFields: Record<string, { label: string; required: string[]; department: "finance" | "legal" | "sdr" }> = {
  invoice: { label: "Invoice", required: ["client_name", "invoice_date", "quantity", "price_inr", "gst_rate", "total_amount_inr"], department: "finance" },
  contract: { label: "Contract", required: ["client_name", "company_name", "start_date", "end_date", "contract_value", "terms"], department: "legal" },
  quotation: { label: "Quotation", required: ["client_name", "quotation_date", "item_description", "quantity", "price_usd", "validity_period"], department: "finance" },
  brochure: { label: "Brochure", required: ["company_name", "product_name", "features", "specifications"], department: "sdr" },
  sample_list: { label: "Sample List", required: ["client_name", "target_audience", "sample_count", "criteria", "delivery_date"], department: "sdr" },
};

// ─── Detect requested docs from transcript/summary/action items text ───
function detectRequestedDocs(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  if (t.includes("invoice") || t.includes("bill")) found.push("invoice");
  if (t.includes("quotation") || t.includes("quote") || t.includes("pricing") || t.includes("proposal")) found.push("quotation");
  if (t.includes("contract") || t.includes("agreement") || t.includes("nda")) found.push("contract");
  if (t.includes("brochure") || t.includes("catalog") || t.includes("catalogue")) found.push("brochure");
  if (t.includes("sample list") || t.includes("sample_list") || t.includes("sample data") || t.includes("sample csv")) found.push("sample_list");
  return [...new Set(found)];
}

// ─── Dropdown Component ───
function StatusDropdown({ value, options, onChange, colorMap, className = "w-full" }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const color = colorMap?.[value] || "bg-zinc-800 text-zinc-300 border-zinc-700";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md border transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md ${color}`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-[#0c0c0c]/98 backdrop-blur-2xl border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl py-2 min-w-[200px] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 origin-top">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={(e) => { e.stopPropagation(); onChange(opt); setOpen(false); }}
              className={`block w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-all ${opt === value ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-l-indigo-500" : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lead Status Badge ───
function LeadStatusBadge({ status }: { status: string }) {
  if (status === "HOT") return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shadow-none border border-rose-500/20 uppercase text-[10px] tracking-wider rounded-sm px-2 shrink-0">{status}</Badge>;
  if (status === "WARM") return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 shadow-none border border-amber-500/20 uppercase text-[10px] tracking-wider rounded-sm px-2 shrink-0">{status}</Badge>;
  if (status === "COLD") return <Badge className="bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 shadow-none border border-sky-500/20 uppercase text-[10px] tracking-wider rounded-sm px-2 shrink-0">{status}</Badge>;
  return <Badge variant="outline" className="text-zinc-500 bg-zinc-900 border-zinc-700 uppercase text-[10px] tracking-wider rounded-sm px-2 shrink-0">{status}</Badge>;
}

// ─── Demo Status Color Map ───
const demoStatusColors: Record<string, string> = {
  "Demo Scheduled": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Demo Rescheduled": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Demo Cancelled": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Demo No Show": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Demo Completed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const leadStatusColors: Record<string, string> = {
  "HOT": "bg-rose-500/10 text-rose-500 border-rose-500/20",
  "WARM": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "COLD": "bg-sky-500/10 text-sky-500 border-sky-500/20",
  "NOT CLASSIFIED": "bg-zinc-800 text-zinc-500 border-zinc-700",
};

const demoSubStatusColors: Record<string, string> = {
  // Demo Scheduled subs
  "Demo In Progress (On Call)": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Demo Completed (Documents Requested)": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Demo Completed (Approval Required)": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Demo Completed (Follow Up Demo)": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Demo Completed (Follow Up)": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Demo Completed (Closure)": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Demo Rescheduled": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  // Demo Rescheduled subs
  "Same Week": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Next Week": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Same Month": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Next Month": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Next Quarter": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "After 6 Months": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Other": "bg-zinc-800 text-zinc-400 border-zinc-700",
  // Demo Cancelled subs
  "Client Cancellation": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  // Demo No Show subs
  "Reason": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Follow Up Process Followed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Follow Up Process Not Followed (24hr)": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Follow Up Process Not Followed (SOD)": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Follow Up Process Not Followed (2hr)": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Technical Issue": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Calendar Invite Not Sent": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  // Demo Completed subs
  "Documents Requested": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Approval Required – Client Side, Follow Up": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Follow Up Demo": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Follow Up": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Closure": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

// ─── Main Component ───
export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(leads[0]);

  // Upload Dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"transcript" | "summary" | "actionItems">("transcript");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Generate Docs Dialog
  const [genDocsOpen, setGenDocsOpen] = useState(false);
  const [genDocType, setGenDocType] = useState("invoice");
  const [genDocFieldValues, setGenDocFieldValues] = useState<Record<string, string>>({});

  // Sample List Upload
  const [sampleListOpen, setSampleListOpen] = useState(false);
  const [sampleListFile, setSampleListFile] = useState<File | null>(null);

  // Email Draft Dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Inline edit dialog
  const [editFieldOpen, setEditFieldOpen] = useState(false);
  const [editFieldName, setEditFieldName] = useState("");
  const [editFieldValue, setEditFieldValue] = useState("");

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Document multi-select dialog (when "Documents Requested" sub-status is chosen)
  const [docSelectOpen, setDocSelectOpen] = useState(false);
  const [docSelectLeadId, setDocSelectLeadId] = useState<string | null>(null);
  const [docSelectChecked, setDocSelectChecked] = useState<Record<string, boolean>>({});

  // ─── Auto Status Update Logic ───
  const autoUpdateStatus = (
    leadId: string,
    overrides: Partial<Pick<Lead, "demoStatus" | "demoSubStatus">>
  ) => {
    setLeads((prev) => {
      const updated = prev.map((l) =>
        l.id === leadId ? { ...l, ...overrides } : l
      );
      const updatedLead = updated.find((l) => l.id === leadId)!;
      setSelectedLead((sel) => (sel?.id === leadId ? updatedLead : sel));
      return updated;
    });
  };

  // ─── Handlers ───
  const updateLeadField = (leadId: string, field: keyof Lead, value: string) => {
    let patchedValue = value;
    const updates: Partial<Lead> = { [field]: patchedValue };

    // When demo status changes, auto-reset sub-status to first option of new status
    if (field === "demoStatus") {
      const newSubs = demoSubStatusMap[value];
      if (newSubs && newSubs.length > 0) {
        updates.demoSubStatus = newSubs[0];
      }
    }

    // When "Documents Requested" sub-status is chosen, open document multi-select
    if (field === "demoSubStatus" && (value === "Documents Requested" || value === "Demo Completed (Documents Requested)")) {
      setDocSelectLeadId(leadId);
      setDocSelectChecked({});
      setDocSelectOpen(true);
    }

    const updated = leads.map((l) => l.id === leadId ? { ...l, ...updates } : l);
    setLeads(updated);
    if (selectedLead?.id === leadId) setSelectedLead(updated.find((l) => l.id === leadId)!);
  };

  const handleUpload = () => {
    if (!selectedLead || !uploadFile) return;

    // Read actual file content to intelligently detect requested docs
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result as string || "";

      setLeads((prev) => {
        const lead = prev.find((l) => l.id === selectedLead.id)!;
        const patch: Partial<Lead> = { [uploadType]: uploadFile.name };

        // Auto-detect docs from actual file text + existing stored text
        const allText = [
          fileContent,
          lead.transcript || "",
          lead.summary || "",
          lead.actionItems || "",
        ].join(" ");
        const detected = detectRequestedDocs(allText);
        if (detected.length > 0) {
          patch.requestedDocs = [...new Set([...lead.requestedDocs, ...detected])];
        }

        const updated = prev.map((l) => l.id === selectedLead.id ? { ...l, ...patch } : l);
        const updatedLead = updated.find((l) => l.id === selectedLead.id)!;
        setSelectedLead(updatedLead);

        // Auto-update status: if docs detected → "Documents Requested"; else → "Follow Up"
        const hasDocsDetected = detected.length > 0;
        const advancedStatuses = ["Documents Requested", "Closure", "Approval Required – Client Side, Follow Up"];
        const currentSub = lead.demoSubStatus;

        if (hasDocsDetected && !advancedStatuses.includes(currentSub)) {
          // Delay slightly so state settles before opening dialog
          setTimeout(() => {
            autoUpdateStatus(selectedLead.id, { demoStatus: "Demo Completed", demoSubStatus: "Documents Requested" });
            setDocSelectLeadId(selectedLead.id);
            setDocSelectChecked({});
            setDocSelectOpen(true);
          }, 100);
        } else if (!advancedStatuses.includes(currentSub)) {
          setTimeout(() => {
            autoUpdateStatus(selectedLead.id, { demoStatus: "Demo Completed", demoSubStatus: "Follow Up" });
          }, 100);
        }

        return updated;
      });

      setUploadFile(null);
      setUploadOpen(false);
    };
    reader.readAsText(uploadFile);
  };

  const handleSampleListUpload = () => {
    if (!selectedLead || !sampleListFile) return;
    const updated = leads.map((l) =>
      l.id === selectedLead.id ? { ...l, sampleListFile: sampleListFile.name, generatedDocs: [...new Set([...l.generatedDocs, "sample_list"])] } : l
    );
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
    setSampleListFile(null);
    setSampleListOpen(false);
  };

  const handleGenerateDoc = () => {
    if (!selectedLead) return;
    // Store the doc key (e.g. "invoice") not a filename — we track by type
    const updated = leads.map((l) => {
      if (l.id !== selectedLead.id) return l;
      return { ...l, generatedDocs: [...new Set([...l.generatedDocs, genDocType])] };
    });
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
    autoUpdateStatus(selectedLead.id, { demoSubStatus: "Documents Requested" });
    setGenDocsOpen(false);
    setGenDocFieldValues({});
  };

  const openGenDocsDialog = (docType: string) => {
    setGenDocType(docType);

    // Auto-populate logic: If fields are "mentioned" (simulated by lead properties)
    const initialValues: Record<string, string> = {};
    const tmpl = templateFields[docType];

    if (selectedLead && tmpl) {
      tmpl.required.forEach(field => {
        // Mock intelligence: if field exists in lead info or transcript simulation
        if (field === "client_name") initialValues[field] = selectedLead.company;
        if (field === "company_name") initialValues[field] = selectedLead.company;
        if (field === "meeting_date") initialValues[field] = selectedLead.demoTime.split(",")[0];
        if (field === "attendees") initialValues[field] = `${selectedLead.name}, SDR Team`;
        if (field === "item_description" && selectedLead.intel.industry.includes("Software")) initialValues[field] = "Enterprise SaaS License";
        if (field === "price_inr") initialValues[field] = "5,25,000";
        if (field === "gst_rate") initialValues[field] = "18%";
      });
    }

    setGenDocFieldValues(initialValues);
    setGenDocsOpen(true);
  };

  const openEmailDraft = () => {
    if (!selectedLead) return;
    setEmailTo(selectedLead.email);
    setEmailSubject(`Follow-up: ${selectedLead.company} Demo - Minutes & Next Steps`);

    // Build body with Summary and Action Items embedded
    const summaryBlock = selectedLead.summary
      ? `MEETING SUMMARY\n${"-".repeat(40)}\n${selectedLead.summary}\n\n`
      : "";
    const actionBlock = selectedLead.actionItems
      ? `ACTION ITEMS\n${"-".repeat(40)}\n${selectedLead.actionItems}\n\n`
      : "";
    const hasContent = summaryBlock || actionBlock;

    setEmailBody(
      `Dear ${selectedLead.name},\n\nThank you for your time during today's demonstration. Please find below the key highlights from our call, along with any relevant documents attached.\n\n` +
      (hasContent ? `${summaryBlock}${actionBlock}` : "") +
      `Please review and let us know if you have any questions or require any modifications.\n\nLooking forward to the next steps.\n\nBest regards,\nSDR Team`
    );
    setEmailSent(false);
    setEmailOpen(true);
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    // Auto-update sub status to Closure after email
    if (selectedLead) {
      autoUpdateStatus(selectedLead.id, { demoSubStatus: "Closure" });
    }
    setTimeout(() => setEmailOpen(false), 1500);
  };

  const handleSaveField = () => {
    if (!selectedLead) return;
    const updated = leads.map((l) => {
      if (l.id !== selectedLead.id) return l;
      return { ...l, missingFields: l.missingFields.filter((f) => f !== editFieldName) };
    });
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
    setEditFieldOpen(false);
  };

  // Check if all required fields for a doc type are filled
  const allFieldsFilled = (docType: string): boolean => {
    const tmpl = templateFields[docType];
    if (!tmpl) return true;
    return tmpl.required.every((f) => genDocFieldValues[f] && genDocFieldValues[f].trim() !== "");
  };

  // Compute which docs are "done" for this lead
  const isDocDone = (docType: string): boolean => {
    if (!selectedLead) return false;
    if (docType === "brochure") return selectedLead.generatedDocs.includes("brochure");
    if (docType === "sample_list") return selectedLead.generatedDocs.includes("sample_list");
    return selectedLead.generatedDocs.includes(docType);
  };

  // Derive effective requested docs: from explicit list OR auto-detected from text
  const getEffectiveRequestedDocs = (): string[] => {
    if (!selectedLead) return [];
    const explicit = selectedLead.requestedDocs;
    const allText = [selectedLead.transcript || "", selectedLead.summary || "", selectedLead.actionItems || ""].join(" ");
    const detected = detectRequestedDocs(allText);
    return [...new Set([...explicit, ...detected])];
  };

  // Email can only be sent when: no missing fields + all requested docs are done
  const canSendEmail = (): boolean => {
    if (!selectedLead) return false;
    if (selectedLead.missingFields.length > 0) return false;
    const requested = getEffectiveRequestedDocs();
    return requested.every((d) => isDocDone(d));
  };

  const fieldLabels: Record<string, string> = {
    legal_name: "Legal Name",
    gst_number: "GST Number",
    registered_address: "Registered Address",
    contact_person: "Contact Person",
  };

  return (
    <div className="flex flex-col h-full w-full">
      <Header title="Active Conversations" subtitle="Manage pipeline, automate documents, and close deals." badgeText={`${leads.length} Active`} />

      <div className="flex-1 flex gap-5 p-6 min-h-0 overflow-hidden relative">
        {/* ─── Leads Table ─── */}
        <div className={`transition-all duration-300 ease-in-out border border-zinc-800/60 rounded-xl bg-[#0c0c0c] overflow-hidden shadow-2xl flex flex-col h-full ${isRightPanelOpen ? "w-[58%]" : "w-full"}`}>
          {/* Leads Table Header */}
          <div className="grid grid-cols-12 px-4 py-2.5 border-b border-zinc-900 bg-zinc-900/40 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
            <div className={isRightPanelOpen ? "col-span-3" : "col-span-2"}>LEAD NAME / COMPANY</div>
            {!isRightPanelOpen && <div className="col-span-2">CONTACT</div>}
            {!isRightPanelOpen && <div className="col-span-1">LEAD STATUS</div>}
            <div className={isRightPanelOpen ? "col-span-3" : "col-span-2"}>DEMO STATUS</div>
            <div className={isRightPanelOpen ? "col-span-3" : "col-span-2"}>SUB STATUS</div>
            <div className={isRightPanelOpen ? "col-span-1" : "col-span-1"}>LAST CONTACT</div>
            <div className={isRightPanelOpen ? "col-span-1" : "col-span-1"}>FOLLOW UP</div>
            <div className="col-span-1 flex justify-end pr-2">ACTION</div>
          </div>
          <div className="divide-y divide-zinc-800/60 overflow-y-auto flex-1">
            {leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => { setSelectedLead(lead); setIsRightPanelOpen(true); }}
                className={`grid grid-cols-12 px-4 py-2.5 items-center border-b border-zinc-900/60 hover:bg-white/[0.03] cursor-pointer transition-all duration-200 group ${selectedLead?.id === lead.id ? "bg-indigo-500/5 border-l-2 border-l-indigo-500" : "border-l-2 border-l-transparent"}`}
              >
                {/* Lead Name / Company */}
                <div className={isRightPanelOpen ? "col-span-3" : "col-span-2"}>
                  <div className="flex items-center gap-2">
                    {/* Lead fulfillment status icon */}
                    {(() => {
                      const emailSentStatus = lead.demoSubStatus === "Closure";
                      const partiallyDone = !emailSentStatus && (
                        lead.transcript !== null ||
                        lead.summary !== null ||
                        lead.actionItems !== null ||
                        lead.generatedDocs.length > 0
                      );
                      if (emailSentStatus) {
                        return (
                          <span title="Email sent" className="flex-shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                          </span>
                        );
                      } else if (partiallyDone) {
                        return (
                          <span title="Partially fulfilled, email pending" className="flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                          </span>
                        );
                      } else {
                        return (
                          <span title="No requirements fulfilled" className="flex-shrink-0">
                            <Circle className="w-3.5 h-3.5 text-zinc-700" />
                          </span>
                        );
                      }
                    })()}
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-white truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-tight">{lead.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate font-medium group-hover:text-zinc-400 transition-colors leading-tight">{lead.company}</p>
                    </div>
                  </div>
                </div>

                {/* Contact: email + phone (hidden when panel open) */}
                {!isRightPanelOpen && (
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <Mail className="w-2.5 h-2.5 text-zinc-600 flex-shrink-0" />
                      <span className="text-[11px] text-zinc-400 truncate">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0 mt-0.5">
                      <Phone className="w-2.5 h-2.5 text-zinc-600 flex-shrink-0" />
                      <span className="text-[11px] text-zinc-500 truncate">{lead.phone}</span>
                    </div>
                  </div>
                )}

                {/* Lead Status (hidden when panel open) */}
                {!isRightPanelOpen && (
                  <div className="col-span-1 pr-2 min-w-0">
                    <StatusDropdown
                      value={lead.leadStatus}
                      options={leadStatusOptions}
                      onChange={(v) => updateLeadField(lead.id, "leadStatus", v)}
                      colorMap={leadStatusColors}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Demo Status */}
                <div className={isRightPanelOpen ? "col-span-3 pr-2 min-w-0" : "col-span-2 pr-2 min-w-0"}>
                  <StatusDropdown
                    value={lead.demoStatus}
                    options={demoStatusOptions}
                    onChange={(v) => updateLeadField(lead.id, "demoStatus", v)}
                    colorMap={demoStatusColors}
                    className="w-full max-w-[150px]"
                  />
                </div>

                {/* Sub Status */}
                <div className={isRightPanelOpen ? "col-span-3 pr-2 min-w-0" : "col-span-2 pr-2 min-w-0"}>
                  <StatusDropdown
                    value={lead.demoSubStatus}
                    options={demoSubStatusMap[lead.demoStatus] || []}
                    onChange={(v) => updateLeadField(lead.id, "demoSubStatus", v)}
                    colorMap={demoSubStatusColors}
                    className="w-full max-w-[150px]"
                  />
                </div>

                {/* Last Contact */}
                <div className="col-span-1">
                  {(() => {
                    const { date, time } = formatDateTime(lead.lastContact);
                    return (
                      <div>
                        <p className="text-[11px] text-zinc-400 font-medium leading-tight">{date}</p>
                        {time && <p className="text-[10px] text-zinc-600 leading-tight">{time}</p>}
                      </div>
                    );
                  })()}
                </div>

                {/* Follow Up */}
                <div className="col-span-1">
                  {(() => {
                    const { date, time } = formatDateTime(lead.followUpDate);
                    return lead.followUpDate ? (
                      <div>
                        <p className="text-[11px] text-indigo-400/80 font-medium leading-tight">{date}</p>
                        {time && <p className="text-[10px] text-indigo-400/50 leading-tight">{time}</p>}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-700">—</span>
                    );
                  })()}
                </div>

                {/* Action */}
                <div className="col-span-1 flex justify-end pr-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Right Panel (Collapsable) ─── */}
        {isRightPanelOpen && selectedLead && (
          <div
            key={selectedLead.id}
            className="w-[42%] flex flex-col gap-4 overflow-y-auto pb-6 pr-1 pt-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800 animate-in slide-in-from-right duration-300"
          >
            {/* Premium Floating Close Button (Sticky but Minimal) */}
            <div className="sticky top-0 z-30 flex justify-end pr-2 -mt-2 -mb-8 pointer-events-none">
              <button
                onClick={(e) => { e.stopPropagation(); setIsRightPanelOpen(false); }}
                title="Close Details"
                className="pointer-events-auto group flex items-center gap-2 bg-[#0c0c0c]/80 backdrop-blur-xl border border-zinc-800/50 pl-4 pr-2 py-1.5 rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.5)] hover:border-indigo-500/30 transition-all duration-300 active:scale-95 translate-y-2"
              >
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Close View</span>
                <div className="h-7 w-7 flex items-center justify-center rounded-full bg-zinc-900 group-hover:bg-indigo-600 transition-all duration-300">
                  <ChevronDown className="w-4 h-4 rotate-90 text-zinc-400 group-hover:text-white transition-colors" />
                </div>
              </button>
            </div>

            {/* Lead Intelligence Title Section */}
            <div className="flex items-center gap-4 mb-4 mt-2 px-1">
              <div className="w-1.5 h-10 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse" />
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Lead Intelligence</h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-1 ml-0.5">Context & Data Analysis</p>
              </div>
            </div>

            {/* ── Upcoming Demo + Join ── */}
            <div className="p-7 rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] shadow-2xl relative overflow-visible group mt-2">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000" />
              <div className="flex justify-between items-start mb-6">
                <div className="z-10">
                  <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)] text-[10px] uppercase tracking-widest mb-2 font-black px-2.5 py-0.5">Today's Meeting</Badge>
                  <h3 className="text-2xl font-black text-white tracking-tight">Upcoming Demo</h3>
                </div>
                <div className="flex flex-col items-end z-10">
                  <span className="text-3xl font-black text-indigo-400 leading-tight">
                    {selectedLead.demoTime.includes(",") ? selectedLead.demoTime.split(",")[0] : selectedLead.demoTime.split(" ")[0]}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    {selectedLead.demoTime.includes(",") ? selectedLead.demoTime.split(",")[1]?.trim() : selectedLead.demoTime.split(" ").slice(1).join(" ")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-[0_10px_20px_rgba(79,70,229,0.2)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.4)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.97]"
                  onClick={() => {
                    window.open(selectedLead.teamsLink, "_blank");
                    // Auto-mark demo as In Progress when meeting is joined
                    autoUpdateStatus(selectedLead.id, { demoStatus: "Demo Scheduled", demoSubStatus: "Demo In Progress (On Call)" });
                  }}
                >
                  <Video className="w-5 h-5 mr-2" />JOIN TEAMS MEETING
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-10 border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-[11px] font-semibold"
                    onClick={() => { }} // Download PPT logic
                  >
                    <Presentation className="w-3.5 h-3.5 mr-2 text-indigo-400" />PRE-CALL DECK
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-[11px] font-semibold"
                    onClick={() => window.open(selectedLead.bubblesLink, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-2 text-indigo-400" />BUBBLES REC
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Post-Call File Upload ── */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                <Upload className="w-3.5 h-3.5 mr-2 text-indigo-400" />Post-Call Data
              </h3>
              <div className="space-y-1.5">
                {([
                  { key: "transcript" as const, label: "Transcript", icon: FileUp, hint: ".txt, .json, .vtt" },
                  { key: "summary" as const, label: "Summary", icon: FileText, hint: ".txt, .json" },
                  { key: "actionItems" as const, label: "Action Items", icon: ListChecks, hint: ".txt, .json" },
                ]).map(({ key, label, icon: Icon, hint }) => (
                  <div key={key} className="flex items-center justify-between bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/50">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-zinc-500" />
                      <div>
                        <p className="text-[13px] text-zinc-200">{label}</p>
                        {selectedLead[key] ? (
                          <p className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" />{selectedLead[key]}</p>
                        ) : (
                          <p className="text-[11px] text-zinc-600">{hint}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={selectedLead[key] ? "outline" : "default"}
                      className={`h-8 text-xs font-semibold px-4 transition-all duration-200 ${selectedLead[key] ? "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"}`}
                      onClick={() => { setUploadType(key); setUploadOpen(true); }}
                    >
                      {selectedLead[key] ? "Replace" : "Upload"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Client-Requested Documents (from status dialog) ── */}
            {selectedLead.selectedDocuments.length > 0 && (
              <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
                <h3 className="text-sm font-semibold text-white mb-2.5 flex items-center">
                  <ClipboardList className="w-3.5 h-3.5 mr-2 text-sky-400" />Client-Requested Documents
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLead.selectedDocuments.map((doc) => (
                    <Badge
                      key={doc}
                      className="bg-sky-500/10 text-sky-300 border-sky-500/20 hover:bg-sky-500/20 text-[10px] font-semibold px-2.5 py-1 shadow-none"
                    >
                      {doc}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* ── Post-Call Synopsis (Internal Only) ── */}
            {(selectedLead.demoStatus === "Demo Completed" || selectedLead.transcript || selectedLead.summary) && (
              <div className="p-4 rounded-xl border border-amber-900/30 bg-gradient-to-br from-amber-950/10 to-zinc-900/20 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center">
                    <BarChart3 className="w-3.5 h-3.5 mr-2 text-amber-400" />Post-Call Synopsis
                  </h3>
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] font-bold uppercase tracking-wider shadow-none px-2">Internal</Badge>
                </div>

                {/* Call Rating */}
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                  <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider mr-1">Call Rating</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => {
                          const updated = leads.map((l) =>
                            l.id === selectedLead.id ? { ...l, callRating: star === selectedLead.callRating ? 0 : star } : l
                          );
                          setLeads(updated);
                          setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
                        }}
                        className="p-0.5 transition-all hover:scale-110"
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${star <= selectedLead.callRating
                            ? "text-amber-400 fill-amber-400"
                            : "text-zinc-700 hover:text-zinc-500"
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                  {selectedLead.callRating > 0 && (
                    <span className="text-[10px] text-amber-400 font-bold ml-1">{selectedLead.callRating}/5</span>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Meeting Summary</p>
                    {selectedLead.summary ? (
                      <p className="text-[12px] text-zinc-300 leading-relaxed">{selectedLead.summary}</p>
                    ) : (
                      <p className="text-[11px] text-zinc-600 italic">No summary uploaded yet.</p>
                    )}
                  </div>

                  {/* Action Items */}
                  <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Action Items</p>
                    {selectedLead.actionItems ? (
                      <p className="text-[12px] text-zinc-300 leading-relaxed">{selectedLead.actionItems}</p>
                    ) : (
                      <p className="text-[11px] text-zinc-600 italic">No action items uploaded yet.</p>
                    )}
                  </div>

                  {/* Call Analysis */}
                  <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">AI Call Analysis</p>
                    {selectedLead.transcript ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-tight">Engagement Level</span>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className={`w-6 h-2 rounded-full transition-all duration-700 ${i <= 3 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-zinc-800"}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-tight">Buying Intent</span>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className={`w-6 h-2 rounded-full transition-all duration-700 ${i <= 2 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-zinc-800"}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-400">Objections Handled</span>
                          <span className="text-[11px] text-emerald-400 font-semibold">3/3</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-600 italic">Upload transcript to generate analysis.</p>
                    )}
                  </div>

                  {/* Call Recording Link */}
                  <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Call Recording</p>
                    <a
                      href={selectedLead.bubblesLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />View Bubbles Recording
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ── Post-Call Documents (Client-Requested Only) ── */}
            {(() => {
              const effectiveDocs = getEffectiveRequestedDocs();
              const docIcons: Record<string, string> = {
                invoice: "text-amber-400", contract: "text-violet-400",
                quotation: "text-sky-400", brochure: "text-indigo-400", sample_list: "text-emerald-400",
              };
              return (
                <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-400" />Post-Call Documents
                    </h3>
                    {effectiveDocs.length > 0 && (
                      <span className="text-[10px] text-zinc-500 font-semibold">
                        {effectiveDocs.filter(d => isDocDone(d)).length}/{effectiveDocs.length} ready
                      </span>
                    )}
                  </div>

                  {effectiveDocs.length === 0 ? (
                    <div className="py-6 text-center">
                      <FilePlus className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-[11px] text-zinc-600 leading-snug">No documents requested yet.<br />Upload transcript or summary to auto-detect.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {effectiveDocs.map((docKey) => {
                        const doc = postCallDocs[docKey];
                        if (!doc) return null;
                        const done = isDocDone(docKey);
                        const isFinance = doc.department === "finance";
                        const isLegal = doc.department === "legal";
                        return (
                          <div key={docKey} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${done
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-zinc-800/60 bg-zinc-900/50"
                            }`}>
                            <div className="flex items-center gap-3">
                              <div className={`h-7 w-7 rounded-lg flex items-center justify-center border ${done ? "bg-emerald-500/10 border-emerald-500/20" : "bg-zinc-800/80 border-zinc-700/50"
                                }`}>
                                {done
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  : <FileText className={`w-3.5 h-3.5 ${docIcons[docKey] ?? "text-zinc-500"}`} />
                                }
                              </div>
                              <div>
                                <p className="text-[13px] font-medium text-zinc-200">{doc.label}</p>
                                <p className="text-[10px] text-zinc-600">
                                  {isFinance ? "Finance Dept" : isLegal ? "Legal Dept" : "SDR"}
                                  {doc.type === "pdf" ? " • PDF" : doc.type === "csv" ? " • CSV Upload" : " • Auto-fill"}
                                </p>
                              </div>
                            </div>

                            {/* Action button per doc type */}
                            {done ? (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-full transition-all"><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-full transition-all"><Download className="h-4 w-4" /></Button>
                              </div>
                            ) : docKey === "brochure" ? (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-md shadow-lg shadow-indigo-500/10"
                                onClick={() => {
                                  // Brochure is a predefined PDF — attach it directly
                                  const updated = leads.map((l) =>
                                    l.id === selectedLead.id ? { ...l, generatedDocs: [...new Set([...l.generatedDocs, "brochure"])] } : l
                                  );
                                  setLeads(updated);
                                  setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
                                }}
                              >
                                Attach PDF
                              </Button>
                            ) : docKey === "sample_list" ? (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 rounded-md shadow-lg shadow-emerald-500/10"
                                onClick={() => setSampleListOpen(true)}
                              >
                                <Upload className="w-3.5 h-3.5 mr-1.5" />Upload CSV
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-md shadow-lg shadow-indigo-500/10 disabled:opacity-40"
                                disabled={selectedLead.missingFields.length > 0}
                                onClick={() => openGenDocsDialog(docKey)}
                                title={selectedLead.missingFields.length > 0 ? "Fill missing client info first" : ""}
                              >
                                <FilePlus className="w-3.5 h-3.5 mr-1.5" />Generate
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Draft & Send Email ── */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
              {!canSendEmail() && (
                <p className="text-[10px] text-amber-500/80 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {selectedLead.missingFields.length > 0
                    ? "Fill all missing client info before sending."
                    : "Generate all requested documents before sending."}
                </p>
              )}
              <Button
                className={`w-full h-10 font-medium shadow-lg transition-all ${canSendEmail()
                  ? "bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white shadow-sky-900/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none border border-zinc-700"
                  }`}
                disabled={!canSendEmail()}
                onClick={openEmailDraft}
              >
                <Mail className="w-4 h-4 mr-2" />
                {canSendEmail() ? "Draft & Send Email" : "Email Locked"}
              </Button>
            </div>

            {/* ── Missing Data Checklist ── */}
            <div className={`p-4 rounded-xl border ${selectedLead.missingFields.length > 0 ? "border-rose-900/50 bg-rose-950/10" : "border-zinc-800/80 bg-zinc-900/20"} shadow-lg`}>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                  {selectedLead.missingFields.length > 0 ? (
                    <><AlertCircle className="w-3.5 h-3.5 text-rose-500" />Required Fields Missing</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />All Requirements Met</>
                  )}
                </h3>
                {selectedLead.missingFields.length > 0 && (
                  <Badge variant="destructive" className="bg-rose-500 shadow-none font-bold text-[10px]">{selectedLead.missingFields.length}</Badge>
                )}
              </div>
              <div className="space-y-1.5">
                {(["legal_name", "gst_number", "registered_address", "contact_person"] as const).map((field) => {
                  const isMissing = selectedLead.missingFields.includes(field);
                  return (
                    <div key={field} className="flex items-center gap-2.5 bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/50">
                      {isMissing ? <XCircle className="w-3.5 h-3.5 text-rose-500/70" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />}
                      <div className="flex-1 flex items-center justify-between">
                        <span className={`text-[13px] ${isMissing ? "text-zinc-200" : "text-zinc-500 line-through"}`}>{fieldLabels[field]}</span>
                        {isMissing && (
                          <button
                            onClick={() => { setEditFieldName(field); setEditFieldValue(""); setEditFieldOpen(true); }}
                            className="text-[11px] uppercase font-black text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2 py-1 rounded transition-all tracking-wider"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Company Intelligence ── */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                <Briefcase className="w-3.5 h-3.5 mr-2 text-indigo-400" />Company Intelligence
              </h3>
              <div className="space-y-2">
                <div className="flex gap-3 p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800/50">
                  <div className="p-1.5 bg-zinc-800 rounded shrink-0 h-fit"><Building className="w-3.5 h-3.5 text-zinc-400" /></div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-medium mb-0.5 uppercase tracking-wider">Industry & Size</p>
                    <p className="text-[13px] text-zinc-200">{selectedLead.intel.industry}</p>
                    <p className="text-[12px] text-zinc-400 mt-0.5">{selectedLead.intel.size}</p>
                  </div>
                </div>
                <div className="flex gap-3 p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800/50">
                  <div className="p-1.5 bg-zinc-800 rounded shrink-0 h-fit"><FileText className="w-3.5 h-3.5 text-zinc-400" /></div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-medium mb-0.5 uppercase tracking-wider">Recent News</p>
                    <p className="text-[12px] text-zinc-300 leading-relaxed">&ldquo;{selectedLead.intel.recentNews}&rdquo;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════ DIALOGS ════════════════ */}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Upload {uploadType === "actionItems" ? "Action Items" : uploadType.charAt(0).toUpperCase() + uploadType.slice(1)}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {uploadType === "transcript" && "Accepted: .txt, .json, .vtt (WebVTT)"}
              {uploadType === "summary" && "Accepted: .txt, .json"}
              {uploadType === "actionItems" && "Accepted: .txt, .json"}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 border-2 border-dashed border-zinc-700 rounded-xl text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
            onClick={() => document.getElementById("file-upload-input")?.click()}>
            <FileUp className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            {uploadFile ? (
              <p className="text-sm text-emerald-400">{uploadFile.name}</p>
            ) : (
              <p className="text-sm text-zinc-400">Click to select a file</p>
            )}
            <input
              id="file-upload-input"
              type="file"
              className="hidden"
              accept={uploadType === "transcript" ? ".txt,.json,.vtt" : ".txt,.json"}
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!uploadFile} onClick={handleUpload}>Upload & Process</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Documents Dialog — With All Required Fields */}
      <Dialog open={genDocsOpen} onOpenChange={setGenDocsOpen}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Generate {postCallDocs[genDocType]?.label || genDocType}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Fields auto-filled from transcript where available. Complete any gaps before generating.
              {postCallDocs[genDocType]?.department === "finance" && (
                <span className="text-amber-400 ml-1">Finance department manages this template.</span>
              )}
              {postCallDocs[genDocType]?.department === "legal" && (
                <span className="text-violet-400 ml-1">Legal department manages this template.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            {templateFields[genDocType]?.required.map((field) => (
              <div key={field}>
                <Label className="text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">{field.replace(/_/g, " ")}</Label>
                <Input
                  value={genDocFieldValues[field] || ""}
                  onChange={(e) => setGenDocFieldValues({ ...genDocFieldValues, [field]: e.target.value })}
                  placeholder={`Enter ${field.replace(/_/g, " ")}...`}
                  className="bg-zinc-900 border-zinc-700 text-white mt-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { setGenDocsOpen(false); setGenDocFieldValues({}); }}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!allFieldsFilled(genDocType)}
              onClick={handleGenerateDoc}
            >
              <Sparkles className="w-4 h-4 mr-2" />Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Draft Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Draft Email</DialogTitle>
            <DialogDescription className="text-zinc-400">Compose and send follow-up email with attached documents.</DialogDescription>
          </DialogHeader>
          {emailSent ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-semibold text-emerald-400">Email Sent Successfully!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">To</Label>
                <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Subject</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Body</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="bg-zinc-900 border-zinc-700 text-white mt-1"
                  style={{
                    fontFamily: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif",
                    fontSize: "11pt",
                    color: "#1F3864",
                  }}
                />
              </div>
              {selectedLead && selectedLead.generatedDocs.length > 0 && (
                <div>
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Attachments</Label>
                  <div className="mt-2 space-y-1">
                    {selectedLead.generatedDocs.map((docKey, i) => (
                      <div key={i} className="flex items-center gap-2 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/50">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs text-zinc-300">
                          {postCallDocs[docKey]?.label ?? docKey}
                          {docKey === "brochure" ? " (PDF)" : docKey === "sample_list" ? " (CSV)" : ".docx"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setEmailOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleSendEmail}>
                  <Send className="w-4 h-4 mr-2" />Send Email
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sample List CSV Upload Dialog */}
      <Dialog open={sampleListOpen} onOpenChange={setSampleListOpen}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Sample List</DialogTitle>
            <DialogDescription className="text-zinc-400">Upload the Sample List in CSV format only.</DialogDescription>
          </DialogHeader>
          <div
            className="p-6 border-2 border-dashed border-emerald-700/50 rounded-xl text-center cursor-pointer hover:border-emerald-500/60 transition-colors"
            onClick={() => document.getElementById("sample-list-input")?.click()}
          >
            <Upload className="w-10 h-10 text-emerald-700 mx-auto mb-3" />
            {sampleListFile ? (
              <p className="text-sm text-emerald-400">{sampleListFile.name}</p>
            ) : (
              <>
                <p className="text-sm text-zinc-300 font-medium">Click to select a CSV file</p>
                <p className="text-xs text-zinc-600 mt-1">Only .csv files are accepted</p>
              </>
            )}
            <input
              id="sample-list-input"
              type="file"
              className="hidden"
              accept=".csv"
              onChange={(e) => setSampleListFile(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { setSampleListOpen(false); setSampleListFile(null); }}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!sampleListFile} onClick={handleSampleListUpload}>
              <Upload className="w-4 h-4 mr-2" />Upload Sample List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Multi-Select Dialog (triggered when 'Documents Requested' is chosen) */}
      <Dialog open={docSelectOpen} onOpenChange={setDocSelectOpen}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Select Requested Documents</DialogTitle>
            <DialogDescription className="text-zinc-400">Choose which documents the client has requested. You can select any combination.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-2">
            {requestableDocuments.map((doc) => (
              <label
                key={doc}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${docSelectChecked[doc]
                  ? "border-indigo-500/50 bg-indigo-500/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  }`}
              >
                <input
                  type="checkbox"
                  checked={!!docSelectChecked[doc]}
                  onChange={(e) => setDocSelectChecked({ ...docSelectChecked, [doc]: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 text-indigo-500 bg-zinc-900 focus:ring-indigo-500 accent-indigo-500"
                />
                <span className="text-sm text-zinc-200 font-medium">{doc}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setDocSelectOpen(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!Object.values(docSelectChecked).some(Boolean)}
              onClick={() => {
                const selectedDocs = Object.entries(docSelectChecked).filter(([, v]) => v).map(([k]) => k);
                if (docSelectLeadId) {
                  const updated = leads.map((l) =>
                    l.id === docSelectLeadId ? {
                      ...l,
                      requestedDocs: [...new Set([...l.requestedDocs, ...selectedDocs.map(d => d.toLowerCase().replace(/ \+ /g, '_').replace(/ \/ /g, '_').replace(/ /g, '_'))])],
                      selectedDocuments: [...new Set([...l.selectedDocuments, ...selectedDocs])],
                    } : l
                  );
                  setLeads(updated);
                  if (selectedLead?.id === docSelectLeadId) setSelectedLead(updated.find((l) => l.id === docSelectLeadId)!);
                }
                setDocSelectOpen(false);
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />Confirm Selection ({Object.values(docSelectChecked).filter(Boolean).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Edit Dialog */}
      <Dialog open={editFieldOpen} onOpenChange={setEditFieldOpen}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Edit {fieldLabels[editFieldName] || editFieldName}</DialogTitle>
            <DialogDescription className="text-zinc-400">Provide the missing field value for this lead.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder={`Enter ${fieldLabels[editFieldName] || editFieldName}...`}
            value={editFieldValue}
            onChange={(e) => setEditFieldValue(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white"
          />
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setEditFieldOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!editFieldValue.trim()} onClick={handleSaveField}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
