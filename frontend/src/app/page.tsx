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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronRight,
  ChevronUp,
  Presentation,
  Circle,
  Star,
  ClipboardList,
  BarChart3,
  Phone,
  Calendar,
  UserPlus,
  Link2,
  Mic,
  PhoneCall,
  Target,
  TrendingUp,
  ShieldCheck,
  FileSearch,
  PencilLine,
  Wand2,
  Edit2,
  Globe,
  Database,
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
  website?: string;
  phone: string;
  legalName: string | null;
  gstNumber: string | null;
  registeredAddress: string | null;
  contactPerson: string | null;
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
  customFieldValues: Record<string, string>; // values for settings-defined custom fields
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
    if (isNaN(d.getTime())) throw new Error("Invalid");
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return { date, time };
  } catch {
    if (isoStr.includes(",")) {
      return { 
        date: isoStr.split(",")[0], 
        time: isoStr.split(",").slice(1).join(",").trim() 
      };
    }
    return { date: isoStr, time: "" };
  }
}

// ─── Requestable document types when "Documents Requested" is selected ───
const requestableDocuments = [
  "Agreement",
  "Non-Disclosure Agreement",
  "Non-Compete Agreement",
  "Quotation",
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
    website: "https://starkindustries.com",
    phone: "+1 415-555-0123",
    legalName: "Stark Industries LLC",
    gstNumber: null,
    registeredAddress: null,
    contactPerson: "Kristen Hayer",
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
    requestedDocs: [], sampleListFile: null, selectedDocuments: [], callRating: 0, customFieldValues: {},
  },
  {
    id: "lead_2",
    email: "tonystark@avengers.io",
    name: "Tony Stark",
    jobTitle: "Founder",
    company: "Avengers Initiative",
    website: "https://avengers.io",
    phone: "+1 212-555-9876",
    legalName: null,
    gstNumber: null,
    registeredAddress: "1 Avengers Tower, New York",
    contactPerson: null,
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
    requestedDocs: [], sampleListFile: null, selectedDocuments: [], callRating: 0, customFieldValues: {},
  },
  {
    id: "lead_3",
    email: "ppotts@stark.com",
    name: "Pepper Potts",
    jobTitle: "COO",
    company: "Stark Industries",
    website: "https://starkindustries.com",
    phone: "+1 415-555-0124",
    legalName: "Stark Industries LLC",
    gstNumber: "27AADCS0472N1Z1",
    registeredAddress: "1 Stark Tower, New York, NY 10001",
    contactPerson: "Pepper Potts",
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
    requestedDocs: ["quotation", "sample_list", "brochure", "contract"], sampleListFile: null, selectedDocuments: ["Agreement", "Invoice + Payment Link", "Sample List"], callRating: 4, customFieldValues: {},
  },
  {
    id: "lead_4",
    email: "trishasilver12@gmail.com",
    name: "Trishala V",
    jobTitle: "Account Manager",
    company: "Silver Corp",
    website: "https://silvercorp.com",
    phone: "+91 6362664320",
    legalName: "Silver Corp Pvt Ltd",
    gstNumber: "29AABCS1429B1Z6",
    registeredAddress: null,
    contactPerson: "Trishala V",
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
    requestedDocs: ["invoice", "brochure"], sampleListFile: null, selectedDocuments: ["Invoice + Payment Link", "One Page / Brochure"], callRating: 0, customFieldValues: {},
  },
];

// ─── Post-Call Document Definitions (no MOM — included in email body) ───
const postCallDocs: Record<string, { label: string; required: string[]; department: "finance" | "legal" | "sdr"; type: "generate" | "pdf" | "csv" }> = {
  invoice: { label: "Invoice", required: ["client_name", "invoice_date", "quantity", "price_inr", "gst_rate", "total_amount_inr"], department: "finance", type: "generate" },
  contract: { label: "Contract", required: ["client_name", "company_name", "start_date", "end_date", "contract_value", "terms"], department: "legal", type: "generate" },
  quotation: { label: "Quotation", required: ["client_name", "quotation_date", "item_description", "quantity", "price_usd", "validity_period"], department: "finance", type: "generate" },
  non_disclosure: { label: "Non-Disclosure Agreement", required: ["party_a_name", "party_b_name", "effective_date", "governing_law", "duration_years"], department: "legal", type: "generate" },
  non_compete: { label: "Non-Compete Agreement", required: ["party_a_name", "party_b_name", "effective_date", "restriction_period", "geographic_scope"], department: "legal", type: "generate" },
  brochure: { label: "Brochure", required: [], department: "sdr", type: "pdf" },
  sample_list: { label: "Sample List", required: [], department: "sdr", type: "csv" },
};

// ─── Also keep templateFields for the generate dialog (legacy) ───
const templateFields: Record<string, { label: string; required: string[]; department: "finance" | "legal" | "sdr" }> = {
  invoice: { label: "Invoice", required: ["client_name", "invoice_date", "quantity", "price_inr", "gst_rate", "total_amount_inr"], department: "finance" },
  contract: { label: "Contract", required: ["client_name", "company_name", "start_date", "end_date", "contract_value", "terms"], department: "legal" },
  quotation: { label: "Quotation", required: ["client_name", "quotation_date", "item_description", "quantity", "price_usd", "validity_period"], department: "finance" },
  non_disclosure: { label: "Non-Disclosure Agreement", required: ["party_a_name", "party_b_name", "effective_date", "governing_law", "duration_years"], department: "legal" },
  non_compete: { label: "Non-Compete Agreement", required: ["party_a_name", "party_b_name", "effective_date", "restriction_period", "geographic_scope"], department: "legal" },
  brochure: { label: "Brochure", required: ["company_name", "product_name", "features", "specifications"], department: "sdr" },
  sample_list: { label: "Sample List", required: ["client_name", "target_audience", "sample_count", "criteria", "delivery_date"], department: "sdr" },
};

// ─── Detect requested docs from transcript/summary/action items text ───
function detectRequestedDocs(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  if (t.includes("invoice") || t.includes("bill")) found.push("invoice");
  if (t.includes("quotation") || t.includes("quote") || t.includes("pricing") || t.includes("proposal")) found.push("quotation");
  if (t.includes("non-disclosure") || t.includes("nda") || t.includes("non disclosure") || t.includes("confidentiality agreement")) found.push("non_disclosure");
  if (t.includes("non-compete") || t.includes("nca") || t.includes("non compete") || t.includes("non competition")) found.push("non_compete");
  if (t.includes("contract") || t.includes("agreement") || (t.includes("nda") && !found.includes("non_disclosure"))) found.push("contract");
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

// ─── API → Lead shape (used by initial load + poll) ───
function mapApiToLead(l: Record<string, unknown>): Lead {
  return {
    id: String(l.id),
    name: (l.name as string) || "",
    jobTitle: (l.job_title as string) || "",
    company: (l.company as string) || "",
    email: (l.email as string) || "",
    phone: (l.phone as string) || "",
    website: (l.website as string) || "",
    legalName: (l.legal_name as string) || null,
    gstNumber: (l.gst_number as string) || null,
    registeredAddress: (l.registered_address as string) || null,
    contactPerson: (l.contact_person as string) || null,
    leadStatus: (l.lead_status as string) || "NOT CLASSIFIED",
    demoStatus: (l.demo_status as string) || "Demo Scheduled",
    demoSubStatus: (l.demo_sub_status as string) || "",
    demoTime: (l.demo_time as string) || "",
    teamsLink: (l.teams_link as string) || "",
    bubblesLink: (l.bubbles_link as string) || "",
    lastContact: (l.last_contact as string) || new Date().toISOString(),
    followUpDate: (l.follow_up_date as string) || null,
    callRating: (l.call_rating as number) || 0,
    transcript: (l.transcript_text as string) || null,
    summary: (l.summary_text as string) || null,
    actionItems: (l.action_items_text as string) || null,
    missingFields: [
      ...(!l.legal_name ? ["legal_name"] : []),
      ...(!l.gst_number ? ["gst_number"] : []),
      ...(!l.registered_address ? ["registered_address"] : []),
      ...(!l.contact_person ? ["contact_person"] : []),
    ],
    // Now loaded from backend
    generatedDocs: (l.generated_docs as string[]) || [],
    requestedDocs: (l.requested_docs as string[]) || [],
    selectedDocuments: (l.selected_documents as string[]) || [],
    customFieldValues: (l.custom_field_values as Record<string, string>) || {},
    // Frontend-only fields (not persisted)
    intel: { industry: "", size: "", recentNews: "" },
    sampleListFile: null,
  };
}

// ─── Main Component ───
export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Upload Dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"transcript" | "summary" | "actionItems">("transcript");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Generate Docs Dialog
  const [genDocsOpen, setGenDocsOpen] = useState(false);
  const [genDocType, setGenDocType] = useState("invoice");
  const [genDocFieldValues, setGenDocFieldValues] = useState<Record<string, string>>({});
  const [genDownloadUrl, setGenDownloadUrl] = useState<string | null>(null);
  const [genIsGenerating, setGenIsGenerating] = useState(false);
  const [genTemplateName, setGenTemplateName] = useState("");
  const [templatesList, setTemplatesList] = useState<{ name: string; variables: string[]; category: string }[]>([]);
  const [genDocServices, setGenDocServices] = useState<string[]>([]);
  const [genDocSubServices, setGenDocSubServices] = useState<string[]>([]);

  // Collapsible sections
  const [postCallDataOpen, setPostCallDataOpen] = useState(true);
  const [postCallSynopsisOpen, setPostCallSynopsisOpen] = useState(true);
  const [expandedPostCallText, setExpandedPostCallText] = useState<Record<string, boolean>>({});

  // Date Edit (inline calendar for last contact / follow-up)
  const [dateEditOpen, setDateEditOpen] = useState(false);
  const [dateEditField, setDateEditField] = useState<"lastContact" | "followUpDate">("lastContact");
  const [dateEditValue, setDateEditValue] = useState("");

  // Document Download URLs stored by leadId+docKey
  const [docDownloadUrls, setDocDownloadUrls] = useState<Record<string, string>>({});
  // Services from settings (for doc generation selections)
  const [settingsServices, setSettingsServices] = useState<{id: string; name: string; code: string; subServices: {id: string; name: string; code: string}[]}[]>([]);
  // Custom field definitions from settings
  const [settingsCustomFields, setSettingsCustomFields] = useState<{id: string; fieldName: string; displayLabel: string; dataType: string; fieldType: string}[]>([]);

  // Sample List Upload
  const [sampleListOpen, setSampleListOpen] = useState(false);
  const [sampleListFile, setSampleListFile] = useState<File | null>(null);

  // Email Draft Dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // ─── Reschedule Dialog ───
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleLeadId, setRescheduleLeadId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNewLink, setRescheduleNewLink] = useState("");
  const [rescheduleCc, setRescheduleCc] = useState("");
  const [rescheduleIsLoading, setRescheduleIsLoading] = useState(false);

  // ─── Documents loaded from DB per lead ───
  type DbDoc = { id: number; type: string; filename: string; download_url: string; status: string; created_at: string };
  const [leadDbDocs, setLeadDbDocs] = useState<Record<string, DbDoc[]>>({});

  // Inline edit dialog
  const [editFieldOpen, setEditFieldOpen] = useState(false);
  const [editFieldName, setEditFieldName] = useState("");
  const [editFieldValue, setEditFieldValue] = useState("");

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // ─── Pre-Call Intelligence Dialog ───
  const [preCallOpen, setPreCallOpen] = useState(false);
  const [preCallLead, setPreCallLead] = useState<Lead | null>(null);

  // ─── Document Usage Intent Dialog ───
  const [docUsageOpen, setDocUsageOpen] = useState(false);
  const [docUsagePendingDocKey, setDocUsagePendingDocKey] = useState<string>("");

  // ─── Add Lead Dialog ───
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadErrors, setAddLeadErrors] = useState<Record<string, string>>({});
  const [isAddingLead, setIsAddingLead] = useState(false);
  const transcriptInputRef = useRef<HTMLInputElement>(null);
  const defaultNewLeadForm = {
    name: "",
    company: "",
    website: "",
    email: "",
    phone: "",
    jobTitle: "",
    legalName: "",
    gstNumber: "",
    registeredAddress: "",
    contactPerson: "",
    leadStatus: "NOT CLASSIFIED",
    demoStatus: "Demo Scheduled",
    demoSubStatus: "",
    demoTime: "",
    teamsLink: "",
    bubblesLink: "",
    lastContact: new Date().toISOString().slice(0, 16),
    followUpDate: "",
    transcriptFile: null as File | null,
    summary: "",
    actionItems: "",
  };
  const [newLeadForm, setNewLeadForm] = useState(defaultNewLeadForm);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/leads");
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const apiLeads = (data as Record<string, unknown>[]).map(mapApiToLead);

        // Populate docDownloadUrls from stored generated_doc_urls on each lead
        const urlMap: Record<string, string> = {};
        (data as Record<string, unknown>[]).forEach((l) => {
          const urls = (l.generated_doc_urls as Record<string, string>) || {};
          Object.entries(urls).forEach(([docKey, url]) => {
            urlMap[`${l.id}_${docKey}`] = url as string;
          });
        });
        setDocDownloadUrls((prev) => ({ ...prev, ...urlMap }));

        // Smart merge: db fields overwrite, local-only fields (intel, sampleListFile) are preserved
        setLeads((prev) => {
          const merged = apiLeads.map((apiLead) => {
            const existing = prev.find((l) => l.id === apiLead.id);
            if (!existing) return apiLead;
            return {
              ...apiLead,
              // Preserve local-only state
              intel: existing.intel,
              sampleListFile: existing.sampleListFile,
            };
          });
          return merged;
        });

        // Keep selectedLead in sync with merged data
        setSelectedLead((prev) => {
          if (!prev) return apiLeads[0] ?? null;
          const updated = apiLeads.find((l) => l.id === prev.id);
          if (!updated) return prev;
          return {
            ...updated,
            intel: prev.intel,
            sampleListFile: prev.sampleListFile,
          };
        });
      } catch {
        // API unreachable — keep current state
      }
    };

    // Load settings (custom fields + services) once on mount
    const fetchSettings = async () => {
      try {
        const sRes = await fetch("http://localhost:8000/api/v1/settings");
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.services && Array.isArray(sData.services)) setSettingsServices(sData.services);
          if (sData.custom_fields && Array.isArray(sData.custom_fields)) setSettingsCustomFields(sData.custom_fields);
        }
      } catch { /* noop */ }
    };

    fetchLeads(); // initial load
    fetchSettings();
    const interval = setInterval(fetchLeads, 30_000); // poll every 30 s for LMS updates
    return () => clearInterval(interval);
  }, []);

  // ─── Load documents from DB whenever selectedLead changes ───
  useEffect(() => {
    if (!selectedLead) return;
    const fetchLeadDocs = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/leads/${selectedLead.id}/documents`);
        if (res.ok) {
          const docs = await res.json();
          setLeadDbDocs(prev => ({ ...prev, [selectedLead.id]: docs }));
          // Also update docDownloadUrls from DB docs
          const urlMap: Record<string, string> = {};
          docs.forEach((d: DbDoc) => {
            const key = `${selectedLead.id}_${d.type}`;
            urlMap[key] = `http://localhost:8000${d.download_url}`;
          });
          setDocDownloadUrls(prev => ({ ...prev, ...urlMap }));
        }
      } catch { /* silent */ }
    };
    fetchLeadDocs();
  }, [selectedLead?.id]);

  const updateNewLead = (field: string, value: string | File | null) => {
    setNewLeadForm((prev) => {
      const next = { ...prev, [field]: value };
      // When demo status changes, reset sub-status
      if (field === "demoStatus") {
        next.demoSubStatus = demoSubStatusMap[value as string]?.[0] || "";
      }
      // Auto-fill contactPerson with lead name when name is set and contactPerson is empty
      if (field === "name" && typeof value === "string" && !prev.contactPerson) {
        next.contactPerson = value;
      }
      return next;
    });
    setAddLeadErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleDocUsageConfirm = (intent: "as-is" | "edit") => {
    if (!selectedLead || !docUsagePendingDocKey) return;
    if (intent === "as-is") {
      const updated = leads.map((l) =>
        l.id === selectedLead.id ? { ...l, generatedDocs: [...new Set([...l.generatedDocs, docUsagePendingDocKey])] } : l
      );
      setLeads(updated);
      setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
    }
    // "edit" intent: don't mark as done, leave for future action
    setDocUsageOpen(false);
    setDocUsagePendingDocKey("");
  };

  // ─── Open Pre-Call dialog ───
  const openPreCall = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreCallLead(lead);
    setPreCallOpen(true);
  };

  const handleAddLead = async () => {
    const errors: Record<string, string> = {};
    if (!newLeadForm.name.trim()) errors.name = "Lead name is required";
    if (!newLeadForm.company.trim()) errors.company = "Company name is required";
    if (!newLeadForm.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newLeadForm.email.trim())) errors.email = "Invalid email address";
    if (Object.keys(errors).length > 0) { setAddLeadErrors(errors); return; }

    const demoStatusVal = newLeadForm.demoStatus || "Demo Scheduled";
    const subStatus = newLeadForm.demoSubStatus || demoSubStatusMap[demoStatusVal]?.[0] || "";

    setIsAddingLead(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLeadForm.name.trim(),
          company: newLeadForm.company.trim(),
          website: newLeadForm.website.trim() || null,
          email: newLeadForm.email.trim(),
          phone: newLeadForm.phone.trim(),
          job_title: newLeadForm.jobTitle.trim(),
          legal_name: newLeadForm.legalName.trim() || null,
          gst_number: newLeadForm.gstNumber.trim() || null,
          registered_address: newLeadForm.registeredAddress.trim() || null,
          contact_person: newLeadForm.contactPerson.trim() || null,
          lead_status: newLeadForm.leadStatus,
          demo_status: demoStatusVal,
          demo_sub_status: subStatus,
          demo_time: newLeadForm.demoTime,
          teams_link: newLeadForm.teamsLink.trim(),
          bubbles_link: newLeadForm.bubblesLink.trim(),
          last_contact: newLeadForm.lastContact || new Date().toISOString(),
          follow_up_date: newLeadForm.followUpDate || null,
          summary_text: newLeadForm.summary.trim() || null,
          action_items_text: newLeadForm.actionItems.trim() || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create lead");
      const { id } = await response.json();

      const newLead: Lead = {
        id: String(id),
        name: newLeadForm.name.trim(),
        company: newLeadForm.company.trim(),
        website: newLeadForm.website.trim(),
        email: newLeadForm.email.trim(),
        phone: newLeadForm.phone.trim(),
        jobTitle: newLeadForm.jobTitle.trim(),
        legalName: newLeadForm.legalName.trim() || null,
        gstNumber: newLeadForm.gstNumber.trim() || null,
        registeredAddress: newLeadForm.registeredAddress.trim() || null,
        contactPerson: newLeadForm.contactPerson.trim() || null,
        leadStatus: newLeadForm.leadStatus,
        demoStatus: demoStatusVal,
        demoSubStatus: subStatus,
        demoTime: newLeadForm.demoTime,
        teamsLink: newLeadForm.teamsLink.trim(),
        bubblesLink: newLeadForm.bubblesLink.trim(),
        lastContact: newLeadForm.lastContact || new Date().toISOString(),
        followUpDate: newLeadForm.followUpDate || null,
        missingFields: [
          ...(newLeadForm.legalName.trim() ? [] : ["legal_name"]),
          ...(newLeadForm.gstNumber.trim() ? [] : ["gst_number"]),
          ...(newLeadForm.registeredAddress.trim() ? [] : ["registered_address"]),
          ...(newLeadForm.contactPerson.trim() ? [] : ["contact_person"]),
        ],
        intel: { industry: "", size: "", recentNews: "" },
        transcript: newLeadForm.transcriptFile ? newLeadForm.transcriptFile.name : null,
        summary: newLeadForm.summary.trim() || null,
        actionItems: newLeadForm.actionItems.trim() || null,
        generatedDocs: [],
        requestedDocs: [],
        sampleListFile: null,
        selectedDocuments: [],
        callRating: 0,
        customFieldValues: {},
      };

      setLeads((prev) => [newLead, ...prev]);
      setSelectedLead(newLead);
      setIsRightPanelOpen(true);
      setAddLeadOpen(false);
      setNewLeadForm(defaultNewLeadForm);
      setAddLeadErrors({});
    } catch {
      setAddLeadErrors({ email: "Failed to save lead. Please check if the server is running." });
    } finally {
      setIsAddingLead(false);
    }
  };
  const [docSelectOpen, setDocSelectOpen] = useState(false);
  const [docSelectLeadId, setDocSelectLeadId] = useState<string | null>(null);
  const [docSelectChecked, setDocSelectChecked] = useState<Record<string, boolean>>({});

  // ─── Persist lead field(s) to backend so LMS can read updates ───
  const persistLeadUpdate = async (leadId: string, fields: Record<string, unknown>) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    try {
      await fetch(`http://localhost:8000/api/v1/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lead.email, ...fields }),
      });
    } catch {
      // silent — local state already updated
    }
  };

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
    // Sync to backend
    const apiPayload: Record<string, unknown> = {};
    if (overrides.demoStatus) apiPayload["demo_status"] = overrides.demoStatus;
    if (overrides.demoSubStatus) apiPayload["demo_sub_status"] = overrides.demoSubStatus;
    if (Object.keys(apiPayload).length > 0) persistLeadUpdate(leadId, apiPayload);
  };

  // ─── Handlers ───
  // Maps frontend Lead fields that live in the DB → their snake_case API key
  const fieldToApiKey: Partial<Record<keyof Lead, string>> = {
    leadStatus: "lead_status",
    demoStatus: "demo_status",
    demoSubStatus: "demo_sub_status",
    followUpDate: "follow_up_date",
    demoTime: "demo_time",
    teamsLink: "teams_link",
    bubblesLink: "bubbles_link",
  };

  // ─── Dynamic status options (merged with custom fields from Settings) ───
  const dynamicLeadStatusOptions = [
    ...leadStatusOptions,
    ...settingsCustomFields
      .filter(f => f.fieldType === "Status Field")
      .map(f => f.displayLabel)
      .filter(l => !leadStatusOptions.includes(l)),
  ];

  const getDynamicSubStatusOptions = (demoStatus: string): string[] => {
    const base = demoSubStatusMap[demoStatus] || [];
    const custom = settingsCustomFields
      .filter(f => f.fieldType === "Sub Status Field")
      .map(f => f.displayLabel)
      .filter(l => !base.includes(l));
    return [...base, ...custom];
  };

  const updateLeadField = (leadId: string, field: keyof Lead, value: string) => {
    const updates: Partial<Lead> = { [field]: value };

    // When demo status changes, auto-reset sub-status to first option of new status
    if (field === "demoStatus") {
      const newSubs = demoSubStatusMap[value];
      if (newSubs && newSubs.length > 0) {
        updates.demoSubStatus = newSubs[0];
      }
      // When rescheduling, open the reschedule dialog
      if (value === "Demo Rescheduled") {
        const lead = leads.find(l => l.id === leadId);
        setRescheduleLeadId(leadId);
        setRescheduleDate("");
        setRescheduleNewLink(lead?.teamsLink || "");
        setRescheduleCc("");
        setRescheduleOpen(true);
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

    // Persist to backend so LMS sees the change
    const apiKey = fieldToApiKey[field];
    if (apiKey) {
      const payload: Record<string, unknown> = { [apiKey]: value };
      // Also persist the auto-reset sub-status if demo status changed
      if (field === "demoStatus" && updates.demoSubStatus) {
        payload["demo_sub_status"] = updates.demoSubStatus;
      }
      persistLeadUpdate(leadId, payload);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!rescheduleLeadId || !rescheduleDate) return;
    setRescheduleIsLoading(true);
    const lead = leads.find(l => l.id === rescheduleLeadId);
    if (!lead) { setRescheduleIsLoading(false); return; }

    const ccList = rescheduleCc
      .split(",")
      .map(e => e.trim())
      .filter(e => e.length > 0);

    try {
      await fetch(`http://localhost:8000/api/v1/leads/${rescheduleLeadId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: parseInt(rescheduleLeadId),
          new_datetime: rescheduleDate,
          teams_link: rescheduleNewLink || lead.teamsLink,
          to_email: lead.email,
          cc_emails: ccList,
          lead_name: lead.name,
          company: lead.company,
        }),
      });
      const updated = leads.map(l =>
        l.id === rescheduleLeadId
          ? { ...l, demoTime: rescheduleDate, teamsLink: rescheduleNewLink || l.teamsLink }
          : l
      );
      setLeads(updated);
      if (selectedLead?.id === rescheduleLeadId) {
        setSelectedLead(updated.find(l => l.id === rescheduleLeadId)!);
      }
    } catch { /* silent */ }

    setRescheduleOpen(false);
    setRescheduleIsLoading(false);
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

  const handleSampleListUpload = async () => {
    if (!selectedLead || !sampleListFile) return;
    const newGeneratedDocs = [...new Set([...selectedLead.generatedDocs, "sample_list"])];
    const updated = leads.map((l) =>
      l.id === selectedLead.id ? { ...l, sampleListFile: sampleListFile.name, generatedDocs: newGeneratedDocs } : l
    );
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
    setSampleListFile(null);
    setSampleListOpen(false);
    // Persist generated_docs
    try {
      await fetch(`http://localhost:8000/api/v1/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedLead.email, generated_docs: newGeneratedDocs }),
      });
    } catch { /* silent */ }
  };

  const handleGenerateDoc = async () => {
    if (!selectedLead) return;
    setGenIsGenerating(true);
    setGenDownloadUrl(null);

    // Enrich data with lead fields and selected services
    const enrichedData: Record<string, string> = {
      ...genDocFieldValues,
      // Ensure contact_person maps to lead name
      contact_person: genDocFieldValues.contact_person || selectedLead.name,
      client_name: genDocFieldValues.client_name || selectedLead.company,
      lead_name: selectedLead.name,
    };
    if (genDocServices.length) enrichedData.services = genDocServices.join(", ");
    if (genDocSubServices.length) enrichedData.sub_services = genDocSubServices.join(", ");

    // Try calling the template engine if a template is selected
    if (genTemplateName) {
      try {
        const res = await fetch("http://localhost:8000/api/v1/documents/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_name: genTemplateName,
            data: enrichedData,
            convert_pdf: false,
            lead_id: selectedLead.id,
            doc_type: genDocType,
          }),
        });
        if (res.ok) {
          const { filename } = await res.json();
          const url = `http://localhost:8000/api/v1/documents/${filename}/download`;
          setGenDownloadUrl(url);
          // Record download URL for this lead+doc
          const newUrlMap = { [`${selectedLead.id}_${genDocType}`]: url };
          setDocDownloadUrls(prev => ({ ...prev, ...newUrlMap }));
          // Build full generated_doc_urls map for this lead and persist
          const leadUrlEntries = Object.entries({ ...docDownloadUrls, ...newUrlMap })
            .filter(([k]) => k.startsWith(`${selectedLead.id}_`));
          const updatedUrls: Record<string, string> = {};
          leadUrlEntries.forEach(([k, v]) => { updatedUrls[k.replace(`${selectedLead.id}_`, "")] = v; });
          fetch(`http://localhost:8000/api/v1/leads/${selectedLead.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: selectedLead.email, generated_doc_urls: updatedUrls }),
          }).catch(() => {});
        }
      } catch { /* silent — fall through to local mark */ }
    }

    setGenIsGenerating(false);

    // Mark the doc as done in local state
    const updated = leads.map((l) => {
      if (l.id !== selectedLead.id) return l;
      return { ...l, generatedDocs: [...new Set([...l.generatedDocs, genDocType])] };
    });
    setLeads(updated);
    const updatedLead = updated.find((l) => l.id === selectedLead.id)!;
    setSelectedLead(updatedLead);
    autoUpdateStatus(selectedLead.id, { demoSubStatus: "Documents Requested" });

    // Persist generated_docs to backend
    try {
      await fetch(`http://localhost:8000/api/v1/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedLead.email,
          generated_docs: updatedLead.generatedDocs,
        }),
      });
    } catch { /* silent */ }

    // Don't close the dialog yet — show download button if available
    if (!genTemplateName) {
      setGenDocsOpen(false);
      setGenDocFieldValues({});
    }
  };

  const openGenDocsDialog = async (docType: string) => {
    setGenDocType(docType);
    setGenDownloadUrl(null);
    setGenIsGenerating(false);
    setGenDocServices([]);
    setGenDocSubServices([]);

    // Auto-populate logic from lead properties
    const initialValues: Record<string, string> = {};
    const tmpl = templateFields[docType];
    const today = new Date().toISOString().split("T")[0];

    if (selectedLead && tmpl) {
      tmpl.required.forEach(field => {
        if (field === "client_name") initialValues[field] = selectedLead.company;
        if (field === "company_name") initialValues[field] = selectedLead.legalName || selectedLead.company;
        if (field === "party_a_name") initialValues[field] = "Our Company"; // SDR's company
        if (field === "party_b_name") initialValues[field] = selectedLead.legalName || selectedLead.company;
        if (field === "meeting_date") initialValues[field] = selectedLead.demoTime.split(",")[0];
        if (field === "attendees") initialValues[field] = `${selectedLead.name}, SDR Team`;
        if (field === "invoice_date" || field === "quotation_date" || field === "effective_date") initialValues[field] = today;
        if (field === "item_description" && selectedLead.intel.industry.includes("Software")) initialValues[field] = "Enterprise SaaS License";
        if (field === "price_inr") initialValues[field] = "5,25,000";
        if (field === "gst_rate") initialValues[field] = "18%";
        if (field === "governing_law") initialValues[field] = "India";
        if (field === "duration_years") initialValues[field] = "2";
        if (field === "restriction_period") initialValues[field] = "1 year";
        if (field === "geographic_scope") initialValues[field] = "India";
      });
    }

    setGenDocFieldValues(initialValues);

    // Fetch templates from backend to populate selection
    try {
      const res = await fetch("http://localhost:8000/api/v1/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplatesList(Array.isArray(data) ? data : []);
        // Auto-select template matching docType
        const match = data.find((t: any) =>
          t.name.toLowerCase().includes(docType.replace(/_/g, " ")) ||
          t.category?.toLowerCase() === docType
        );
        if (match) {
          setGenTemplateName(match.name);
          // Populate with template variables if they exist
          if (match.variables?.length) {
            const varValues: Record<string, string> = { ...initialValues };
            match.variables.forEach((v: string) => {
              if (!varValues[v]) {
                // Try to auto-map from lead data
                if (v.includes("client") || v.includes("name")) varValues[v] = selectedLead?.name || "";
                if (v.includes("company")) varValues[v] = selectedLead?.company || "";
                if (v.includes("email")) varValues[v] = selectedLead?.email || "";
                if (v.includes("phone")) varValues[v] = selectedLead?.phone || "";
                if (v.includes("gst")) varValues[v] = selectedLead?.gstNumber || "";
                if (v.includes("address")) varValues[v] = selectedLead?.registeredAddress || "";
                if (v.includes("legal")) varValues[v] = selectedLead?.legalName || "";
                if (v.includes("contact_person")) varValues[v] = selectedLead?.name || "";
                if (v.includes("date")) varValues[v] = today;
              }
            });
            setGenDocFieldValues(varValues);
          }
        } else {
          setGenTemplateName("");
        }
      }
    } catch {
      setTemplatesList([]);
      setGenTemplateName("");
    }

    // Load services from settings (always refresh so latest saved services appear)
    try {
      const sRes = await fetch("http://localhost:8000/api/v1/settings");
      if (sRes.ok) {
        const sData = await sRes.json();
        // Only overwrite if we actually got services — keep existing state otherwise
        if (Array.isArray(sData.services) && sData.services.length > 0) {
          setSettingsServices(sData.services);
        }
        if (Array.isArray(sData.custom_fields) && sData.custom_fields.length > 0) {
          setSettingsCustomFields(sData.custom_fields);
        }
      }
    } catch { /* keep existing settingsServices if fetch fails */ }

    setGenDocsOpen(true);
  };

  const openEmailDraft = () => {
    if (!selectedLead) return;
    setEmailTo(selectedLead.email);
    setEmailCc("");
    setEmailSent(false);
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

  const kycFieldMap: Record<string, keyof Lead> = {
    legal_name: "legalName",
    gst_number: "gstNumber",
    registered_address: "registeredAddress",
    contact_person: "contactPerson",
  };

  const handleSaveField = async () => {
    if (!selectedLead) return;
    const leadKey = kycFieldMap[editFieldName];
    const updated = leads.map((l) => {
      if (l.id !== selectedLead.id) return l;
      const patch: Partial<Lead> = {
        missingFields: l.missingFields.filter((f) => f !== editFieldName),
      };
      if (leadKey) (patch as Record<string, unknown>)[leadKey] = editFieldValue.trim();
      return { ...l, ...patch };
    });
    setLeads(updated);
    setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
    setEditFieldOpen(false);

    // Persist to database
    try {
      await fetch(`http://localhost:8000/api/v1/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedLead.email,
          [editFieldName]: editFieldValue.trim(),
        }),
      });
    } catch {
      // silent — local state already updated
    }
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
        {/* Leads Table Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-900 bg-[#080808]">
            <p className="text-xs text-zinc-500 font-medium">{leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs gap-1.5"
              onClick={() => { setNewLeadForm(defaultNewLeadForm); setAddLeadErrors({}); setAddLeadOpen(true); }}
            >
              <UserPlus className="w-3.5 h-3.5" />Add Lead
            </Button>
          </div>
          {/* Leads Column Headers */}
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
                      options={dynamicLeadStatusOptions}
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
                    options={getDynamicSubStatusOptions(lead.demoStatus)}
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
                <div className="col-span-1 flex items-center justify-end gap-0.5 pr-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Pre-Call Intelligence"
                    className="h-7 w-7 text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    onClick={(e) => openPreCall(lead, e)}
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                  </Button>
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
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
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
                    {formatDateTime(selectedLead.demoTime).date}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    {formatDateTime(selectedLead.demoTime).time}
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

            {/* ── Follow Up & Contact Dates ── */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-2 text-indigo-400" />Dates & Timeline
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {/* Last Contact */}
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5">Last Contact</p>
                  {(() => {
                    const { date, time } = formatDateTime(selectedLead.lastContact);
                    return (
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[13px] text-zinc-200 font-medium">{date}</p>
                          {time && <p className="text-[11px] text-zinc-500">{time}</p>}
                        </div>
                        <button
                          onClick={() => {
                            setDateEditField("lastContact");
                            setDateEditValue(selectedLead.lastContact ? selectedLead.lastContact.substring(0, 16) : new Date().toISOString().substring(0, 16));
                            setDateEditOpen(true);
                          }}
                          className="p-1 rounded-md text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                          title="Edit Last Contact Date"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
                {/* Follow-Up Date */}
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5">Follow Up</p>
                  <div className="flex items-start justify-between">
                    <div>
                      {selectedLead.followUpDate ? (() => {
                        const { date, time } = formatDateTime(selectedLead.followUpDate);
                        return (
                          <>
                            <p className="text-[13px] text-indigo-400/90 font-medium">{date}</p>
                            {time && <p className="text-[11px] text-indigo-400/50">{time}</p>}
                          </>
                        );
                      })() : (
                        <p className="text-[13px] text-zinc-600">Not set</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setDateEditField("followUpDate");
                        setDateEditValue(selectedLead.followUpDate ? selectedLead.followUpDate.substring(0, 16) : "");
                        setDateEditOpen(true);
                      }}
                      className="p-1 rounded-md text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                      title="Edit Follow Up Date"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Custom Fields (from Settings) ── */}
            {settingsCustomFields.length > 0 && (
              <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <Database className="w-3.5 h-3.5 mr-2 text-indigo-400" />Custom Fields
                </h3>
                <div className="space-y-2">
                  {settingsCustomFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2 bg-zinc-900/60 px-3 py-2 rounded-lg border border-zinc-800/50">
                      <div className="w-32 shrink-0">
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider leading-tight">{field.displayLabel}</p>
                        <p className="text-[9px] text-zinc-700 mt-0.5">{field.fieldType}</p>
                      </div>
                      <input
                        type={field.dataType === "Number" ? "number" : field.dataType === "Date" ? "date" : "text"}
                        value={selectedLead.customFieldValues?.[field.fieldName] || ""}
                        onChange={(e) => {
                          const newVals = { ...selectedLead.customFieldValues, [field.fieldName]: e.target.value };
                          const updated = leads.map((l) => l.id === selectedLead.id ? { ...l, customFieldValues: newVals } : l);
                          setLeads(updated);
                          setSelectedLead({ ...selectedLead, customFieldValues: newVals });
                        }}
                        onBlur={async (e) => {
                          const newVals = { ...selectedLead.customFieldValues, [field.fieldName]: e.target.value };
                          try {
                            await fetch(`http://localhost:8000/api/v1/leads/${selectedLead.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email: selectedLead.email, custom_field_values: newVals }),
                            });
                          } catch { /* silent */ }
                        }}
                        placeholder={`Enter ${field.displayLabel.toLowerCase()}…`}
                        className="flex-1 bg-transparent border-0 border-b border-zinc-800 outline-none text-[12px] text-zinc-300 focus:border-indigo-500/60 transition-colors py-0.5 placeholder:text-zinc-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Post-Call File Upload ── */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
              <button
                className="w-full flex items-center justify-between text-left group"
                onClick={() => setPostCallDataOpen(v => !v)}
              >
                <h3 className="text-sm font-semibold text-white flex items-center">
                  <Upload className="w-3.5 h-3.5 mr-2 text-indigo-400" />Post-Call Data
                </h3>
                <div className="flex items-center gap-2">
                  {!postCallDataOpen && (
                    <span className="text-[10px] text-zinc-600 font-medium">
                      {[selectedLead.transcript ? "Transcript" : null, selectedLead.summary ? "Summary" : null, selectedLead.actionItems ? "Actions" : null].filter(Boolean).join(" · ") || "No files yet"}
                    </span>
                  )}
                  {postCallDataOpen
                    ? <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    : <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                  }
                </div>
              </button>
              {postCallDataOpen && (
                <div className="space-y-1.5 mt-3">
                  {([
                    { key: "transcript" as const, label: "Transcript", icon: FileUp, hint: ".txt, .json, .vtt" },
                    { key: "summary" as const, label: "Summary", icon: FileText, hint: ".txt, .json" },
                    { key: "actionItems" as const, label: "Action Items", icon: ListChecks, hint: ".txt, .json" },
                  ]).map(({ key, label, icon: Icon, hint }) => {
                    const content = selectedLead[key];
                    const isExpanded = expandedPostCallText[key];
                    const PREVIEW_LEN = 160;
                    const hasMore = content && content.length > PREVIEW_LEN;
                    return content ? (
                      <div key={key} className="bg-zinc-900/60 rounded-lg border border-zinc-800/50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-2.5 pt-2.5 pb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-zinc-500" />
                            <p className="text-[13px] text-zinc-200 font-medium">{label}</p>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-semibold px-3 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
                            onClick={() => { setUploadType(key); setUploadOpen(true); }}
                          >
                            Replace
                          </Button>
                        </div>
                        {/* Preview */}
                        <div className="px-2.5 pb-2.5 border-t border-zinc-800/40 pt-2">
                          <button
                            onClick={() => setExpandedPostCallText(prev => ({ ...prev, [key]: !prev[key] }))}
                            className="w-full flex items-center gap-1.5 text-left group mb-1.5"
                          >
                            {isExpanded
                              ? <ChevronUp className="w-3 h-3 text-indigo-400 shrink-0" />
                              : <ChevronDown className="w-3 h-3 text-indigo-400 shrink-0" />
                            }
                            <span className="text-[10px] text-indigo-400 group-hover:text-indigo-300 transition-colors font-medium">
                              {isExpanded ? "Show less" : "Read more"}
                            </span>
                          </button>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            {isExpanded ? content : (hasMore ? content.slice(0, PREVIEW_LEN) + "…" : content)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div key={key} className="flex items-center justify-between bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/50">
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5 text-zinc-500" />
                          <div>
                            <p className="text-[13px] text-zinc-200">{label}</p>
                            <p className="text-[11px] text-zinc-600">{hint}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="h-8 text-xs font-semibold px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
                          onClick={() => { setUploadType(key); setUploadOpen(true); }}
                        >
                          Upload
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
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
                <button
                  className="w-full flex items-center justify-between text-left group mb-0"
                  onClick={() => setPostCallSynopsisOpen(v => !v)}
                >
                  <h3 className="text-sm font-semibold text-white flex items-center">
                    <BarChart3 className="w-3.5 h-3.5 mr-2 text-amber-400" />Post-Call Synopsis
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] font-bold uppercase tracking-wider shadow-none px-2">Internal</Badge>
                    {postCallSynopsisOpen
                      ? <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                      : <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    }
                  </div>
                </button>

                {postCallSynopsisOpen && (
                <div className="mt-3">
                {/* Call Rating */}
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                  <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider mr-1">Call Rating</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => {
                          const newRating = star === selectedLead.callRating ? 0 : star;
                          const updated = leads.map((l) =>
                            l.id === selectedLead.id ? { ...l, callRating: newRating } : l
                          );
                          setLeads(updated);
                          setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
                          persistLeadUpdate(selectedLead.id, { call_rating: newRating });
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
              </div>
            )}

            {/* ── Post-Call Documents (Client-Requested Only) ── */}
            {(() => {
              const effectiveDocs = getEffectiveRequestedDocs();
              const docIcons: Record<string, string> = {
                invoice: "text-amber-400", contract: "text-violet-400",
                quotation: "text-sky-400", brochure: "text-indigo-400", sample_list: "text-emerald-400",
                non_disclosure: "text-rose-400", non_compete: "text-orange-400",
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
                        const downloadUrl = docDownloadUrls[`${selectedLead.id}_${docKey}`];
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
                                {downloadUrl ? (
                                  <a href={downloadUrl} download>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-all" title="Download">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </a>
                                ) : (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-full transition-all"><Download className="h-4 w-4" /></Button>
                                )}
                              </div>
                            ) : docKey === "brochure" ? (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-md shadow-lg shadow-indigo-500/10"
                                onClick={() => {
                                  setDocUsagePendingDocKey("brochure");
                                  setDocUsageOpen(true);
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

            {/* ── Generated Documents (from DB + download URLs) ── */}
            {(() => {
              const dbDocs = leadDbDocs[selectedLead.id] || [];
              const urlDocs = Object.entries(docDownloadUrls)
                .filter(([key]) => key.startsWith(`${selectedLead.id}_`))
                .map(([key, url]) => ({ key, url, docKey: key.replace(`${selectedLead.id}_`, "") }));

              // Merge: DB docs take precedence, then any URL-only docs not in DB
              const dbDocTypes = new Set(dbDocs.map(d => d.type));
              const extraUrlDocs = urlDocs.filter(u => !dbDocTypes.has(u.docKey));
              const hasAny = dbDocs.length > 0 || extraUrlDocs.length > 0;
              if (!hasAny) return null;

              return (
                <div className="p-4 rounded-xl border border-emerald-900/30 bg-gradient-to-br from-emerald-950/10 to-zinc-900/20 shadow-lg">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                    <Download className="w-3.5 h-3.5 mr-2 text-emerald-400" />Generated Documents
                  </h3>
                  <div className="space-y-1.5">
                    {dbDocs.map((doc) => {
                      const dlUrl = `http://localhost:8000${doc.download_url}`;
                      return (
                        <div key={doc.id} className="flex items-center justify-between bg-zinc-900/60 px-3 py-2 rounded-lg border border-zinc-800/40">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[12px] text-zinc-200 font-medium truncate">{postCallDocs[doc.type]?.label ?? doc.type}</p>
                              {doc.created_at && <p className="text-[10px] text-zinc-600">{new Date(doc.created_at).toLocaleDateString()}</p>}
                            </div>
                          </div>
                          <a href={dlUrl} download target="_blank" rel="noreferrer">
                            <Button size="sm" className="h-7 text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-3 shrink-0">
                              <Download className="w-3 h-3 mr-1" />Download
                            </Button>
                          </a>
                        </div>
                      );
                    })}
                    {extraUrlDocs.map(({ key, url, docKey }) => (
                      <div key={key} className="flex items-center justify-between bg-zinc-900/60 px-3 py-2 rounded-lg border border-zinc-800/40">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <p className="text-[12px] text-zinc-200 font-medium">{postCallDocs[docKey]?.label ?? docKey}</p>
                        </div>
                        <a href={url} download>
                          <Button size="sm" className="h-7 text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-3">
                            <Download className="w-3 h-3 mr-1" />Download
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
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
                            onClick={() => {
                              setEditFieldName(field);
                              // Auto-fill contact_person with lead name
                              setEditFieldValue(field === "contact_person" ? (selectedLead.name || "") : "");
                              setEditFieldOpen(true);
                            }}
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
                    <p className="text-[13px] text-zinc-200">{selectedLead.intel.industry || <span className="text-zinc-600 italic">Industry not set</span>}</p>
                    <p className="text-[12px] text-zinc-400 mt-0.5">{selectedLead.intel.size || <span className="text-zinc-600 italic">Size unknown</span>}</p>
                  </div>
                </div>
                <div className="flex gap-3 p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800/50">
                  <div className="p-1.5 bg-zinc-800 rounded shrink-0 h-fit"><FileText className="w-3.5 h-3.5 text-zinc-400" /></div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-medium mb-0.5 uppercase tracking-wider">Recent News</p>
                    <p className="text-[12px] text-zinc-300 leading-relaxed">{selectedLead.intel.recentNews ? `"${selectedLead.intel.recentNews}"` : <span className="text-zinc-600 italic">No news data available.</span>}</p>
                  </div>
                </div>
                {/* Company Website — always shown */}
                <div className="flex gap-3 p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800/50">
                  <div className="p-1.5 bg-zinc-800 rounded shrink-0 h-fit"><Globe className="w-3.5 h-3.5 text-zinc-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-500 font-medium mb-0.5 uppercase tracking-wider">Website</p>
                    {selectedLead.website ? (
                      <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-[12px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors truncate block">
                        {selectedLead.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <p className="text-[12px] text-zinc-600 italic">No website on record.</p>
                    )}
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

      {/* Generate Documents Dialog — With All Required Fields + Template Engine */}
      <Dialog open={genDocsOpen} onOpenChange={(v) => { setGenDocsOpen(v); if (!v) { setGenDocFieldValues({}); setGenDownloadUrl(null); setGenIsGenerating(false); } }}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-indigo-400" />Generate {postCallDocs[genDocType]?.label || genDocType}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Variables auto-filled from lead data. Complete any gaps before generating.
              {postCallDocs[genDocType]?.department === "finance" && (
                <span className="text-amber-400 ml-1">Finance department manages this template.</span>
              )}
              {postCallDocs[genDocType]?.department === "legal" && (
                <span className="text-violet-400 ml-1">Legal department manages this template.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* ── Template Selection ── */}
            {templatesList.length > 0 && (
              <div>
                <Label className="text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">Select Template</Label>
                <div className="mt-1.5 grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto">
                  {templatesList.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => {
                        setGenTemplateName(t.name);
                        // Auto-populate template variables from lead
                        if (selectedLead && t.variables) {
                          const varValues: Record<string, string> = { ...genDocFieldValues };
                          const today = new Date().toISOString().split("T")[0];
                          t.variables.forEach((v: string) => {
                            if (!varValues[v] || varValues[v] === "") {
                              if (v.includes("contact_person") || v === "contact_person") varValues[v] = selectedLead.name;
                              else if (v.includes("client") && v.includes("name")) varValues[v] = selectedLead.company;
                              else if (v.includes("company")) varValues[v] = selectedLead.legalName || selectedLead.company;
                              else if (v.includes("email")) varValues[v] = selectedLead.email;
                              else if (v.includes("phone")) varValues[v] = selectedLead.phone;
                              else if (v.includes("gst")) varValues[v] = selectedLead.gstNumber || "";
                              else if (v.includes("address")) varValues[v] = selectedLead.registeredAddress || "";
                              else if (v.includes("legal_name")) varValues[v] = selectedLead.legalName || "";
                              else if (v.includes("party_b")) varValues[v] = selectedLead.legalName || selectedLead.company;
                              else if (v.includes("party_a")) varValues[v] = "Our Company";
                              else if (v.includes("date")) varValues[v] = today;
                            }
                          });
                          setGenDocFieldValues(varValues);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${genTemplateName === t.name ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300" : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[12px] font-medium truncate">{t.name}</span>
                      {t.category && <span className="text-[10px] text-zinc-600 ml-auto shrink-0">{t.category}</span>}
                    </button>
                  ))}
                </div>
                {!genTemplateName && (
                  <p className="text-[10px] text-amber-400 mt-1">Select a template to enable generation via Template Engine. You can still fill fields below.</p>
                )}
              </div>
            )}

            {/* ── Services Selection (from Settings) ── */}
            <div>
              <Label className="text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">Services</Label>
              {settingsServices.length === 0 ? (
                <p className="text-[11px] text-zinc-600 mt-1.5 italic">No services configured. Add them in Settings → Services.</p>
              ) : (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {settingsServices.map((svc) => {
                    const isSelected = genDocServices.includes(svc.name);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => setGenDocServices(prev =>
                          isSelected ? prev.filter(s => s !== svc.name) : [...prev, svc.name]
                        )}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isSelected ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300" : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        {svc.name}
                        {svc.code && <span className="font-mono text-[10px] opacity-60">{svc.code}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Sub-Services for selected services */}
              {genDocServices.length > 0 && (
                <div className="mt-2">
                  <Label className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Sub-Services</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {settingsServices
                      .filter(s => genDocServices.includes(s.name))
                      .flatMap(s => s.subServices || [])
                      .map((sub) => {
                        const isSubSelected = genDocSubServices.includes(sub.name);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setGenDocSubServices(prev =>
                              isSubSelected ? prev.filter(s => s !== sub.name) : [...prev, sub.name]
                            )}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all ${isSubSelected ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"}`}
                          >
                            {isSubSelected && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {sub.name}
                            {sub.code && <span className="font-mono text-[10px] opacity-60 ml-1">{sub.code}</span>}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Document Fields ── */}
            {(() => {
              // When template is selected, show its variables; otherwise show fallback required fields
              const selectedTemplate = templatesList.find(t => t.name === genTemplateName);
              const fields = selectedTemplate?.variables?.length
                ? selectedTemplate.variables
                : (templateFields[genDocType]?.required || []);
              if (!fields.length) return null;
              return (
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider font-semibold mb-2 block">Document Variables</Label>
                  <div className="space-y-2.5">
                    {fields.map((field: string) => (
                      <div key={field}>
                        <Label className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1">
                          {field.replace(/_/g, " ")}
                          {(field === "contact_person" || field === "client_name") && (
                            <span className="text-indigo-400 font-semibold">(auto-filled)</span>
                          )}
                        </Label>
                        <Input
                          value={genDocFieldValues[field] || ""}
                          onChange={(e) => setGenDocFieldValues({ ...genDocFieldValues, [field]: e.target.value })}
                          placeholder={`Enter ${field.replace(/_/g, " ")}...`}
                          className="bg-zinc-900 border-zinc-700 text-white mt-1 h-9"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter className="flex-col gap-2">
            {genDownloadUrl && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 w-full">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-emerald-400">Document generated successfully!</p>
                  <p className="text-[11px] text-zinc-500">Ready to download</p>
                </div>
                <a href={genDownloadUrl} download>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold px-4">
                    <Download className="w-3.5 h-3.5 mr-1.5" />Download
                  </Button>
                </a>
              </div>
            )}
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { setGenDocsOpen(false); setGenDocFieldValues({}); setGenDownloadUrl(null); }}>
                {genDownloadUrl ? "Close" : "Cancel"}
              </Button>
              {!genDownloadUrl && (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={genIsGenerating}
                  onClick={handleGenerateDoc}
                >
                  {genIsGenerating ? (
                    <><span className="animate-spin mr-2">⟳</span>Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Generate</>
                  )}
                </Button>
              )}
            </div>
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
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">CC <span className="text-zinc-600 normal-case">(comma-separated)</span></Label>
                <Input value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="cc1@example.com, cc2@example.com" className="bg-zinc-900 border-zinc-700 text-white mt-1" />
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
              {/* Show docs from DB first, fall back to generatedDocs array */}
              {selectedLead && (() => {
                const dbDocs = leadDbDocs[selectedLead.id] || [];
                const docsToShow = dbDocs.length > 0
                  ? dbDocs
                  : selectedLead.generatedDocs.map((k) => ({
                      id: 0, type: k, filename: k,
                      download_url: docDownloadUrls[`${selectedLead.id}_${k}`] || "",
                      status: "generated", created_at: "",
                    }));
                if (docsToShow.length === 0) return null;
                return (
                  <div>
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Attachments</Label>
                    <div className="mt-2 space-y-1">
                      {docsToShow.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/50">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs text-zinc-300">
                              {postCallDocs[doc.type]?.label ?? doc.type}
                              {doc.type === "brochure" ? " (PDF)" : doc.type === "sample_list" ? " (CSV)" : ".docx"}
                            </span>
                          </div>
                          {doc.download_url && (
                            <a href={doc.download_url.startsWith("http") ? doc.download_url : `http://localhost:8000${doc.download_url}`} download target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-400">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
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

      {/* ─── Reschedule Demo Dialog ─── */}
      <Dialog open={rescheduleOpen} onOpenChange={(v) => { if (!rescheduleIsLoading) setRescheduleOpen(v); }}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />Reschedule Demo
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Select a new date &amp; time. A booking confirmation email will be sent to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label className="text-zinc-400 text-xs uppercase tracking-wider block mb-1.5">New Demo Date &amp; Time <span className="text-rose-400">*</span></Label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-all [color-scheme:dark]"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs uppercase tracking-wider block mb-1.5">Teams Link <span className="text-zinc-600 normal-case">(update if changed)</span></Label>
              <Input
                value={rescheduleNewLink}
                onChange={(e) => setRescheduleNewLink(e.target.value)}
                placeholder="https://teams.microsoft.com/..."
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs uppercase tracking-wider block mb-1.5">CC Recipients <span className="text-zinc-600 normal-case">(comma-separated)</span></Label>
              <Input
                value={rescheduleCc}
                onChange={(e) => setRescheduleCc(e.target.value)}
                placeholder="manager@company.com, team@company.com"
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            {rescheduleLeadId && leads.find(l => l.id === rescheduleLeadId) && (
              <div className="bg-zinc-900/60 rounded-lg border border-zinc-800/50 px-3 py-2.5">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Confirmation email to</p>
                <p className="text-[12px] text-zinc-200">{leads.find(l => l.id === rescheduleLeadId)?.email}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setRescheduleOpen(false)} disabled={rescheduleIsLoading}>
              Skip
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-50"
              disabled={!rescheduleDate || rescheduleIsLoading}
              onClick={handleRescheduleConfirm}
            >
              {rescheduleIsLoading ? (
                <><span className="animate-spin mr-2">⟳</span>Sending…</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Confirm &amp; Send Email</>
              )}
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
              onClick={async () => {
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
                  // Persist to backend
                  const updatedLead = updated.find((l) => l.id === docSelectLeadId);
                  if (updatedLead) {
                    try {
                      await fetch(`http://localhost:8000/api/v1/leads/${docSelectLeadId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: updatedLead.email,
                          requested_docs: updatedLead.requestedDocs,
                          selected_documents: updatedLead.selectedDocuments,
                        }),
                      });
                    } catch { /* silent */ }
                  }
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

      {/* Date Edit Dialog — Custom Dark Calendar */}
      <Dialog open={dateEditOpen} onOpenChange={setDateEditOpen}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              {dateEditField === "lastContact" ? "Edit Last Contact Date" : "Edit Follow Up Date"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {dateEditField === "lastContact"
                ? "When did you last speak with this lead?"
                : "When should you follow up with this lead?"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider block mb-2">
              {dateEditField === "lastContact" ? "Last Contact Date & Time" : "Follow Up Date & Time"}
            </Label>
            <input
              type="datetime-local"
              value={dateEditValue}
              onChange={(e) => setDateEditValue(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all [color-scheme:dark]"
              style={{ colorScheme: "dark" }}
            />
            {dateEditField === "followUpDate" && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Tomorrow", days: 1 },
                  { label: "+3 Days", days: 3 },
                  { label: "+1 Week", days: 7 },
                  { label: "+2 Weeks", days: 14 },
                  { label: "+1 Month", days: 30 },
                  { label: "Clear", days: -1 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (days === -1) { setDateEditValue(""); return; }
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      d.setHours(10, 0, 0, 0);
                      setDateEditValue(d.toISOString().substring(0, 16));
                    }}
                    className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                      days === -1
                        ? "border-zinc-700 text-zinc-500 hover:border-rose-500/40 hover:text-rose-400"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setDateEditOpen(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={async () => {
                if (!selectedLead) return;
                const isoValue = dateEditValue ? new Date(dateEditValue).toISOString() : null;
                const updated = leads.map((l) =>
                  l.id === selectedLead.id ? { ...l, [dateEditField]: isoValue } : l
                );
                setLeads(updated);
                setSelectedLead(updated.find((l) => l.id === selectedLead.id)!);
                setDateEditOpen(false);
                // Persist to backend
                try {
                  await fetch(`http://localhost:8000/api/v1/leads/${selectedLead.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: selectedLead.email,
                      [dateEditField === "lastContact" ? "last_contact" : "follow_up_date"]: isoValue,
                    }),
                  });
                } catch { /* silent */ }
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />Save Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════ ADD LEAD DIALOG ════════════════ */}
      <Dialog open={addLeadOpen} onOpenChange={(v) => { setAddLeadOpen(v); if (!v) setAddLeadErrors({}); }}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />Add New Lead
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Fill in the lead details below. Fields marked <span className="text-rose-400">*</span> are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* ── Section 1: Core Identity ── */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-zinc-800" />Contact Info<span className="h-px flex-1 bg-zinc-800" />
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">
                    Lead Name <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Kristen Hayer"
                    value={newLeadForm.name}
                    onChange={(e) => updateNewLead("name", e.target.value)}
                    className={`bg-zinc-900 border-zinc-700 text-white ${addLeadErrors.name ? "border-rose-500" : ""}`}
                  />
                  {addLeadErrors.name && <p className="text-rose-400 text-xs mt-1">{addLeadErrors.name}</p>}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Job Title</Label>
                  <Input
                    placeholder="e.g. CEO"
                    value={newLeadForm.jobTitle}
                    onChange={(e) => updateNewLead("jobTitle", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">
                    Company Name <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Stark Industries"
                    value={newLeadForm.company}
                    onChange={(e) => updateNewLead("company", e.target.value)}
                    className={`bg-zinc-900 border-zinc-700 text-white ${addLeadErrors.company ? "border-rose-500" : ""}`}
                  />
                  {addLeadErrors.company && <p className="text-rose-400 text-xs mt-1">{addLeadErrors.company}</p>}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">
                    Website
                  </Label>
                  <Input
                    placeholder="e.g. https://starkindustries.com"
                    value={newLeadForm.website}
                    onChange={(e) => updateNewLead("website", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">
                    Email <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="e.g. kristen@stark.com"
                    value={newLeadForm.email}
                    onChange={(e) => updateNewLead("email", e.target.value)}
                    className={`bg-zinc-900 border-zinc-700 text-white ${addLeadErrors.email ? "border-rose-500" : ""}`}
                  />
                  {addLeadErrors.email && <p className="text-rose-400 text-xs mt-1">{addLeadErrors.email}</p>}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Phone</Label>
                  <Input
                    placeholder="e.g. +1 415-555-0123"
                    value={newLeadForm.phone}
                    onChange={(e) => updateNewLead("phone", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: KYC / Compliance ── */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-zinc-800" />KYC / Compliance<span className="h-px flex-1 bg-zinc-800" />
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Legal Name</Label>
                  <Input
                    placeholder="e.g. Stark Industries LLC"
                    value={newLeadForm.legalName}
                    onChange={(e) => updateNewLead("legalName", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">GST Number</Label>
                  <Input
                    placeholder="e.g. 27AADCS0472N1Z1"
                    value={newLeadForm.gstNumber}
                    onChange={(e) => updateNewLead("gstNumber", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Contact Person</Label>
                  <Input
                    placeholder="e.g. Kristen Hayer"
                    value={newLeadForm.contactPerson}
                    onChange={(e) => updateNewLead("contactPerson", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Registered Address</Label>
                  <Input
                    placeholder="e.g. 1 Stark Tower, New York"
                    value={newLeadForm.registeredAddress}
                    onChange={(e) => updateNewLead("registeredAddress", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 3: Lead Classification ── */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-zinc-800" />Pipeline Status<span className="h-px flex-1 bg-zinc-800" />
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* Lead Status */}
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Lead Status</Label>
                  <Select value={newLeadForm.leadStatus} onValueChange={(v) => updateNewLead("leadStatus", v)}>
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-zinc-800 text-white">
                      {leadStatusOptions.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Demo Status */}
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Demo Status</Label>
                  <Select value={newLeadForm.demoStatus} onValueChange={(v) => updateNewLead("demoStatus", v)}>
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="Select demo status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-zinc-800 text-white">
                      {demoStatusOptions.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Sub Status */}
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Sub Status</Label>
                  <Select
                    value={newLeadForm.demoSubStatus || undefined}
                    onValueChange={(v) => updateNewLead("demoSubStatus", v)}
                    disabled={!newLeadForm.demoStatus || !demoSubStatusMap[newLeadForm.demoStatus]}
                  >
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="— Select —" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-zinc-800 text-white">
                      {(demoSubStatusMap[newLeadForm.demoStatus] || []).map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Section 3: Dates & Timeline ── */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-zinc-800" />Timeline<span className="h-px flex-1 bg-zinc-800" />
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Last Contact Date</Label>
                  <Input
                    type="datetime-local"
                    value={newLeadForm.lastContact}
                    onChange={(e) => updateNewLead("lastContact", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Follow Up Date</Label>
                  <Input
                    type="datetime-local"
                    value={newLeadForm.followUpDate}
                    onChange={(e) => updateNewLead("followUpDate", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 block">Demo Date / Time</Label>
                  <Input
                    type="datetime-local"
                    value={newLeadForm.demoTime}
                    onChange={(e) => updateNewLead("demoTime", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 4: Meeting Links ── */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-zinc-800" />Meeting Links<span className="h-px flex-1 bg-zinc-800" />
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Video className="w-3 h-3" />Meeting Link (Teams)
                  </Label>
                  <Input
                    placeholder="https://teams.microsoft.com/..."
                    value={newLeadForm.teamsLink}
                    onChange={(e) => updateNewLead("teamsLink", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Link2 className="w-3 h-3" />Recording Link (Bubbles)
                    {newLeadForm.demoStatus === "Demo Completed" && (
                      <span className="text-amber-400 text-[10px] ml-1">(recommended for completed demos)</span>
                    )}
                  </Label>
                  <Input
                    placeholder="https://app.usebubbles.com/..."
                    value={newLeadForm.bubblesLink}
                    onChange={(e) => updateNewLead("bubblesLink", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 5: Post-Call Data (shown when demo is completed) ── */}
            {(newLeadForm.demoStatus === "Demo Completed" || newLeadForm.demoSubStatus?.toLowerCase().includes("completed")) && (
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                  <span className="h-px flex-1 bg-zinc-800" />Post-Call Data<span className="h-px flex-1 bg-zinc-800" />
                </p>
                <div className="space-y-3">
                  {/* Transcript file upload */}
                  <div>
                    <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Mic className="w-3 h-3" />Transcript File
                      <span className="text-zinc-600 normal-case font-normal">(.txt, .vtt, .json)</span>
                    </Label>
                    <div
                      className="p-3 border-2 border-dashed border-zinc-700 rounded-xl text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
                      onClick={() => transcriptInputRef.current?.click()}
                    >
                      {newLeadForm.transcriptFile ? (
                        <p className="text-sm text-emerald-400 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />{newLeadForm.transcriptFile.name}
                        </p>
                      ) : (
                        <>
                          <FileUp className="w-5 h-5 text-zinc-600 mx-auto mb-1" />
                          <p className="text-xs text-zinc-500">Click to upload transcript</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={transcriptInputRef}
                      type="file"
                      accept=".txt,.vtt,.json"
                      className="hidden"
                      onChange={(e) => updateNewLead("transcriptFile", e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {/* Summary */}
                  <div>
                    <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />Call Summary
                    </Label>
                    <Textarea
                      placeholder="Key discussion points from the call..."
                      value={newLeadForm.summary}
                      onChange={(e) => updateNewLead("summary", e.target.value)}
                      rows={3}
                      className="bg-zinc-900 border-zinc-700 text-white resize-none"
                    />
                  </div>
                  {/* Action Items */}
                  <div>
                    <Label className="text-zinc-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <ListChecks className="w-3 h-3" />Action Items
                    </Label>
                    <Textarea
                      placeholder="1. Send quotation by Friday&#10;2. Schedule follow-up call..."
                      value={newLeadForm.actionItems}
                      onChange={(e) => updateNewLead("actionItems", e.target.value)}
                      rows={3}
                      className="bg-zinc-900 border-zinc-700 text-white resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { setAddLeadOpen(false); setAddLeadErrors({}); }}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleAddLead} disabled={isAddingLead}>
              <UserPlus className="w-4 h-4" />{isAddingLead ? "Saving..." : "Add Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════ PRE-CALL INTELLIGENCE DIALOG ════════════════ */}
      <Dialog open={preCallOpen} onOpenChange={setPreCallOpen}>
        <DialogContent className="bg-[#0c0c0c] border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {preCallLead && (() => {
            // Derive fitment scores from lead data
            const hasDecisionMaker = ["CEO", "Founder", "COO", "CTO", "MD", "Owner", "Director"].some(t => preCallLead.jobTitle.includes(t));
            const isHot = preCallLead.leadStatus === "HOT";
            const isWarm = preCallLead.leadStatus === "WARM";
            const industryScore = preCallLead.intel.industry ? 82 : 50;
            const dealPotentialScore = isHot ? 91 : isWarm ? 72 : 54;
            const decisionMakerScore = hasDecisionMaker ? 95 : 60;
            const overallScore = Math.round((industryScore + dealPotentialScore + decisionMakerScore) / 3);

            const fitmentItems = [
              { label: "Industry Match", score: industryScore, color: industryScore >= 75 ? "emerald" : "amber" },
              { label: "Deal Potential", score: dealPotentialScore, color: dealPotentialScore >= 75 ? "emerald" : "amber" },
              { label: "Decision Maker Access", score: decisionMakerScore, color: decisionMakerScore >= 75 ? "emerald" : "amber" },
            ];

            const colorBg: Record<string, string> = { emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500" };
            const colorText: Record<string, string> = { emerald: "text-emerald-400", amber: "text-amber-400", rose: "text-rose-400" };

            const proposalPoints = [
              `Tailored for ${preCallLead.intel.industry || preCallLead.company}'s operational scale`,
              `${preCallLead.intel.size ? `Designed for ${preCallLead.intel.size} organisations` : "Enterprise-ready deployment"}`,
              `Addresses ${hasDecisionMaker ? preCallLead.jobTitle + "-level" : "executive"} KPIs directly`,
              "Streamlines document generation & contract workflows end-to-end",
              "Compliance-ready — GST, legal approvals, and audit trail built-in",
              "Reduces deal cycle time by up to 60% with automated proposals",
            ];

            return (
              <>
                {/* Header */}
                <div className="p-6 border-b border-zinc-800/60 bg-gradient-to-r from-indigo-950/30 to-[#0c0c0c]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/20 text-[9px] uppercase tracking-widest font-black px-2 py-0.5 shadow-none">Pre-Call Briefing</Badge>
                        <LeadStatusBadge status={preCallLead.leadStatus} />
                      </div>
                      <h2 className="text-2xl font-black text-white tracking-tight uppercase">{preCallLead.name}</h2>
                      <p className="text-sm text-zinc-400 mt-0.5">{preCallLead.jobTitle} · {preCallLead.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Overall Fitment</p>
                      <p className={`text-4xl font-black ${overallScore >= 75 ? "text-emerald-400" : overallScore >= 55 ? "text-amber-400" : "text-rose-400"}`}>{overallScore}<span className="text-xl text-zinc-500">%</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                    {preCallLead.demoTime && (
                      <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-indigo-400" />{preCallLead.demoTime}</span>
                    )}
                    {preCallLead.phone && (
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-zinc-600" />{preCallLead.phone}</span>
                    )}
                    {preCallLead.website && (
                      <span className="flex items-center gap-1.5"><ExternalLink className="w-3 h-3 text-zinc-600" />
                        <a href={preCallLead.website} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">{preCallLead.website.replace(/^https?:\/\//, "")}</a>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-5">

                  {/* SC Fitment Analysis */}
                  <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />SC Fitment Analysis
                    </h3>
                    <div className="space-y-3">
                      {fitmentItems.map(({ label, score, color }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wide">{label}</span>
                            <span className={`text-[12px] font-black ${colorText[color]}`}>{score}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-700 ${colorBg[color]} shadow-sm`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50 text-center">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Decision Maker</p>
                        <span className={`text-[11px] font-black ${hasDecisionMaker ? "text-emerald-400" : "text-amber-400"}`}>
                          {hasDecisionMaker ? "✓ Confirmed" : "Verify"}
                        </span>
                      </div>
                      <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50 text-center">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Temperature</p>
                        <span className={`text-[11px] font-black ${isHot ? "text-rose-400" : isWarm ? "text-amber-400" : "text-sky-400"}`}>{preCallLead.leadStatus}</span>
                      </div>
                      <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50 text-center">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Industry</p>
                        <span className="text-[11px] font-black text-zinc-300 truncate block">{preCallLead.intel.industry || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Company Research */}
                  <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileSearch className="w-4 h-4 text-sky-400" />Company Research
                    </h3>
                    <div className="space-y-2.5">
                      <div className="flex gap-3 p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                        <Building className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-0.5">Industry & Size</p>
                          <p className="text-[12px] text-zinc-200">{preCallLead.intel.industry || "—"}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{preCallLead.intel.size || "—"}</p>
                        </div>
                      </div>
                      {preCallLead.intel.recentNews && (
                        <div className="flex gap-3 p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-0.5">Recent News & Signal</p>
                            <p className="text-[12px] text-zinc-300 leading-relaxed">&ldquo;{preCallLead.intel.recentNews}&rdquo;</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Draft Proposal */}
                  <div className="p-4 rounded-xl border border-indigo-900/30 bg-gradient-to-br from-indigo-950/15 to-zinc-900/20">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-indigo-400" />Draft Proposal — Key Points
                    </h3>
                    <p className="text-[10px] text-zinc-500 mb-3">Auto-generated from company research. Customise before presenting.</p>
                    <div className="space-y-2">
                      {proposalPoints.map((point, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-900/40 border border-zinc-800/40">
                          <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-[12px] text-zinc-300 leading-snug">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pre-Call Checklist */}
                  <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />Pre-Call Checklist
                    </h3>
                    <div className="space-y-1.5">
                      {[
                        { label: "Teams meeting link ready", done: !!preCallLead.teamsLink },
                        { label: "Pre-call deck / brochure downloaded", done: false },
                        { label: "Company intel reviewed", done: !!preCallLead.intel.recentNews },
                        { label: "KYC fields collected", done: preCallLead.missingFields.length === 0 },
                        { label: "Bubbles recording enabled", done: !!preCallLead.bubblesLink },
                      ].map(({ label, done }) => (
                        <div key={label} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg">
                          {done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            : <Circle className="w-3.5 h-3.5 text-zinc-700 shrink-0" />}
                          <span className={`text-[12px] ${done ? "text-zinc-500 line-through" : "text-zinc-300"}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="px-6 pb-6 flex gap-2">
                  <Button
                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl"
                    onClick={() => { window.open(preCallLead.teamsLink, "_blank"); setPreCallOpen(false); }}
                  >
                    <Video className="w-4 h-4 mr-2" />JOIN MEETING
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white text-sm rounded-xl px-4"
                    onClick={() => setPreCallOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ════════════════ DOCUMENT USAGE INTENT DIALOG ════════════════ */}
      <Dialog open={docUsageOpen} onOpenChange={setDocUsageOpen}>
        <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-indigo-400" />Document Ready to Attach
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Does this document need editing before it&apos;s sent to the client, or can it be used as-is?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <button
              onClick={() => handleDocUsageConfirm("as-is")}
              className="w-full flex items-start gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500/20 transition-all">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-400">Use As-Is</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">Document is final and ready to attach — no edits required. Ideal for standard brochures, company decks, or pre-approved templates.</p>
              </div>
            </button>

            <button
              onClick={() => handleDocUsageConfirm("edit")}
              className="w-full flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500/20 transition-all">
                <PencilLine className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-400">Needs Editing / Review</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">Document requires customisation or approval before sending. It will be flagged for review and not counted as ready yet.</p>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-400 w-full" onClick={() => setDocUsageOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
