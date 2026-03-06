"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    ShieldCheck,
    FileText,
    Edit,
    Save,
    Eye,
    Download,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Scale,
    BookOpen,
    Lock,
    Gavel,
    Calendar,
    User,
    FileUp,
    Plus,
    Loader2,
} from "lucide-react";
import { useState, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Legal Template Definitions ───
interface LegalTemplate {
    id: string;
    name: string;
    type: "contract" | "nda" | "sla" | "terms";
    variables: { key: string; label: string; value: string; category: "parties" | "terms" | "dates" | "clauses" }[];
    assignedLead: string;
    company: string;
    status: "draft" | "legal_review" | "approved" | "signed";
    lastModified: string;
}

const initialTemplates: LegalTemplate[] = [
    {
        id: "lt1",
        name: "Service Contract — Avengers Initiative",
        type: "contract",
        assignedLead: "Tony Stark",
        company: "Avengers Initiative",
        status: "legal_review",
        lastModified: "Mar 5, 2026",
        variables: [
            { key: "client_name", label: "Client Name", value: "Avengers Initiative", category: "parties" },
            { key: "company_name", label: "Service Provider", value: "Company HQ Pvt. Ltd.", category: "parties" },
            { key: "authorized_signatory", label: "Authorized Signatory", value: "Tony Stark (CEO)", category: "parties" },
            { key: "start_date", label: "Start Date", value: "01-Apr-2026", category: "dates" },
            { key: "end_date", label: "End Date", value: "31-Mar-2027", category: "dates" },
            { key: "notice_period", label: "Notice Period", value: "30 days", category: "dates" },
            { key: "contract_value", label: "Contract Value", value: "$8,500.00", category: "terms" },
            { key: "payment_schedule", label: "Payment Schedule", value: "Quarterly — Net 45", category: "terms" },
            { key: "liability_cap", label: "Liability Cap", value: "$50,000.00", category: "terms" },
            { key: "governing_law", label: "Governing Law", value: "State of New York, USA", category: "clauses" },
            { key: "dispute_resolution", label: "Dispute Resolution", value: "Arbitration under ICC Rules", category: "clauses" },
            { key: "confidentiality_period", label: "Confidentiality Period", value: "5 years post-termination", category: "clauses" },
            { key: "ip_ownership", label: "IP Ownership", value: "All IP remains with Service Provider", category: "clauses" },
            { key: "termination_clause", label: "Termination Clause", value: "Either party may terminate with 30-day written notice. Material breach allows immediate termination.", category: "clauses" },
        ],
    },
    {
        id: "lt2",
        name: "NDA — Stark Industries",
        type: "nda",
        assignedLead: "Kristen Hayer",
        company: "Stark Industries",
        status: "approved",
        lastModified: "Mar 3, 2026",
        variables: [
            { key: "disclosing_party", label: "Disclosing Party", value: "Company HQ Pvt. Ltd.", category: "parties" },
            { key: "receiving_party", label: "Receiving Party", value: "Stark Industries", category: "parties" },
            { key: "effective_date", label: "Effective Date", value: "01-Mar-2026", category: "dates" },
            { key: "nda_duration", label: "NDA Duration", value: "3 years", category: "dates" },
            { key: "scope", label: "Scope of Confidentiality", value: "All proprietary information including pricing, trade secrets, and customer data", category: "clauses" },
            { key: "permitted_use", label: "Permitted Use", value: "Evaluation of potential business relationship only", category: "clauses" },
            { key: "governing_law", label: "Governing Law", value: "State of Delaware, USA", category: "clauses" },
            { key: "penalties", label: "Breach Penalties", value: "Liquidated damages of $100,000 per incident", category: "terms" },
        ],
    },
    {
        id: "lt3",
        name: "SLA — Silver Corp",
        type: "sla",
        assignedLead: "Trishala V",
        company: "Silver Corp",
        status: "draft",
        lastModified: "Mar 2, 2026",
        variables: [
            { key: "client_name", label: "Client Name", value: "Silver Corp", category: "parties" },
            { key: "service_description", label: "Service Description", value: "Enterprise Software Platform — Tier 2", category: "terms" },
            { key: "uptime_guarantee", label: "Uptime Guarantee", value: "99.9%", category: "terms" },
            { key: "response_time", label: "Response Time (Critical)", value: "1 hour", category: "terms" },
            { key: "resolution_time", label: "Resolution Time (Critical)", value: "4 hours", category: "terms" },
            { key: "support_hours", label: "Support Hours", value: "24/7", category: "terms" },
            { key: "sla_start", label: "SLA Start Date", value: "01-Apr-2026", category: "dates" },
            { key: "sla_review", label: "Review Period", value: "Quarterly", category: "dates" },
            { key: "penalty_clause", label: "SLA Breach Penalty", value: "5% credit per 0.1% below target uptime", category: "clauses" },
            { key: "escalation_path", label: "Escalation Path", value: "L1 Support → L2 Support → Engineering Lead → VP Engineering → CTO", category: "clauses" },
        ],
    },
];

const statusStyles: Record<string, string> = {
    draft: "bg-zinc-800 text-zinc-400 border-zinc-700",
    legal_review: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    signed: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

const statusLabels: Record<string, string> = {
    draft: "Draft",
    legal_review: "Legal Review",
    approved: "Approved",
    signed: "Signed",
};

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    parties: { icon: <User className="w-3 h-3 text-indigo-400" />, label: "Parties & Signatories", color: "text-indigo-400" },
    dates: { icon: <Calendar className="w-3 h-3 text-sky-400" />, label: "Dates & Timelines", color: "text-sky-400" },
    terms: { icon: <Scale className="w-3 h-3 text-emerald-400" />, label: "Terms & Values", color: "text-emerald-400" },
    clauses: { icon: <Gavel className="w-3 h-3 text-amber-400" />, label: "Legal Clauses", color: "text-amber-400" },
};

export default function LegalPage() {
    const [templates, setTemplates] = useState(initialTemplates);
    const [selected, setSelected] = useState<LegalTemplate | null>(templates[0]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [saved, setSaved] = useState(false);

    // Template upload
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadTemplate = async () => {
        if (!uploadFile) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", uploadFile);
            fd.append("department", "legal");
            const res = await fetch(`${API}/api/v1/templates/upload`, {
                method: "POST",
                body: fd,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({ detail: "Upload failed" }));
                throw new Error(errData.detail || "Upload failed");
            }
            setUploadSuccess(true);
            setTimeout(() => {
                setUploadOpen(false);
                setUploadFile(null);
                setUploadSuccess(false);
            }, 1500);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Upload failed";
            alert(`Upload failed: ${msg}`);
        } finally {
            setUploading(false);
        }
    };

    const handleApprove = async (templateId: string) => {
        const t = templates.find((t) => t.id === templateId);
        const updated = templates.map((t) => t.id === templateId ? { ...t, status: "approved" as const } : t);
        setTemplates(updated);
        setSelected(updated.find((t) => t.id === templateId) || null);
        // Create approval notification
        try {
            await fetch(`${API}/api/v1/documents/${templateId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lead_name: t?.assignedLead, doc_type: t?.type }),
            });
        } catch { /* silent */ }
    };

    const handleEdit = (key: string, currentValue: string) => {
        setEditingKey(key);
        setEditValue(currentValue);
    };

    const handleSave = (templateId: string, varKey: string) => {
        const updated = templates.map((t) => {
            if (t.id !== templateId) return t;
            return {
                ...t,
                variables: t.variables.map((v) => v.key === varKey ? { ...v, value: editValue } : v),
            };
        });
        setTemplates(updated);
        setSelected(updated.find((t) => t.id === templateId) || null);
        setEditingKey(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const typeLabels: Record<string, string> = {
        contract: "Contract",
        nda: "NDA",
        sla: "SLA",
        terms: "Terms & Conditions",
    };

    return (
        <>
        <div className="flex flex-col h-full w-full">
            <Header title="Legal Department" subtitle="Manage contracts, NDAs, SLAs — review and approve legal templates." badgeText="Level 1" />

            <div className="flex-1 flex gap-5 p-6 min-h-0 overflow-hidden">
                {/* ─── Template List ─── */}
                <div className="w-[35%] border border-zinc-800/60 rounded-xl bg-[#0c0c0c] overflow-hidden shadow-2xl flex flex-col h-full">
                    <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-violet-400" />
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Legal Templates</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[10px] shadow-none border">
                                {templates.length} Templates
                            </Badge>
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 gap-1"
                                onClick={() => { setUploadFile(null); setUploadSuccess(false); setUploadOpen(true); }}
                            >
                                <Plus className="w-3 h-3" />Upload
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
                        {templates.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => setSelected(t)}
                                className={`p-4 cursor-pointer transition-all ${selected?.id === t.id ? "bg-zinc-800/40 border-l-2 border-violet-500" : "hover:bg-zinc-800/20 border-l-2 border-transparent"}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-white">{t.name}</p>
                                    <Badge className={`text-[9px] uppercase tracking-wider rounded-sm px-1.5 shadow-none border ${statusStyles[t.status]}`}>
                                        {statusLabels[t.status]}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                    <span>{t.assignedLead}</span>
                                    <span>·</span>
                                    <span>{typeLabels[t.type]}</span>
                                    <span>·</span>
                                    <span>{t.lastModified}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Variable Editor ─── */}
                {selected && (
                    <div className="w-[65%] flex flex-col gap-4 overflow-y-auto pb-6 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
                        {/* Template Header */}
                        <div className="p-5 rounded-xl border border-zinc-800/80 bg-gradient-to-b from-violet-900/10 to-zinc-900/10 shadow-lg">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">{selected.company} · {selected.assignedLead} · {typeLabels[selected.type]}</p>
                                </div>
                                <div className="flex gap-2">
                                    {selected.status !== "approved" && selected.status !== "signed" && (
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => handleApprove(selected.id)}>
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 h-8">
                                        <Eye className="w-3.5 h-3.5 mr-1" />Preview
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 h-8">
                                        <Download className="w-3.5 h-3.5 mr-1" />Download
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <Badge className={`text-[9px] uppercase tracking-wider rounded-sm px-2 shadow-none border ${statusStyles[selected.status]}`}>
                                    {statusLabels[selected.status]}
                                </Badge>
                                <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px] uppercase tracking-wider rounded-sm px-2 shadow-none border">
                                    <Lock className="w-2.5 h-2.5 mr-1" />Legal Owned
                                </Badge>
                            </div>
                        </div>

                        {/* Variables by Category */}
                        {(["parties", "dates", "terms", "clauses"] as const).map((cat) => {
                            const vars = selected.variables.filter((v) => v.category === cat);
                            if (vars.length === 0) return null;
                            const cfg = categoryConfig[cat];
                            return (
                                <div key={cat} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
                                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        {cfg.icon}{cfg.label}
                                    </h3>
                                    <div className="space-y-2">
                                        {vars.map((v) => {
                                            const isLongText = v.value.length > 80;
                                            return (
                                                <div key={v.key} className="flex items-start justify-between bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/50 group">
                                                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs text-zinc-500 font-medium">{v.label}</p>
                                                            <span className="text-[9px] text-zinc-600 font-mono">{`{{${v.key}}}`}</span>
                                                        </div>
                                                        {editingKey === v.key ? (
                                                            <div className="flex items-start gap-2">
                                                                {isLongText ? (
                                                                    <Textarea
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        className="bg-zinc-800 border-zinc-700 text-white text-sm flex-1 min-h-[60px]"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <Input
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm flex-1"
                                                                        autoFocus
                                                                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(selected.id, v.key); if (e.key === "Escape") setEditingKey(null); }}
                                                                    />
                                                                )}
                                                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 shrink-0" onClick={() => handleSave(selected.id, v.key)}>
                                                                    <Save className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <p className={`text-sm ${cat === "terms" ? "text-emerald-400 font-mono" : "text-zinc-200"} leading-relaxed`}>
                                                                {v.value}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {editingKey !== v.key && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-zinc-600 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2"
                                                            onClick={() => handleEdit(v.key, v.value)}
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {saved && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm animate-pulse px-2">
                                <CheckCircle2 className="w-4 h-4" />Value saved successfully
                            </div>
                        )}

                        {/* Hierarchy Info */}
                        <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/10">
                            <p className="text-[11px] text-zinc-500 flex items-center gap-2">
                                <Lock className="w-3 h-3 text-violet-500" />
                                <span><strong className="text-violet-400">Level 1 — Legal</strong>: Can edit all legal clauses, terms, dates, and party details. SDR (Level 2) views these as read-only.</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>

            {/* Upload Template Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Upload Legal Template</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Upload a DOCX or PPTX template for the Legal department. It will be visible to SDRs in the Templates section.
                        </DialogDescription>
                    </DialogHeader>
                    <div
                        className="p-8 border-2 border-dashed border-violet-500/30 rounded-xl text-center cursor-pointer hover:border-violet-500/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".docx,.pptx"
                            className="hidden"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                        {uploadFile ? (
                            <>
                                <FileUp className="w-10 h-10 text-violet-400 mx-auto mb-2" />
                                <p className="text-sm text-white font-medium">{uploadFile.name}</p>
                                <p className="text-xs text-zinc-500 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB — click to change</p>
                            </>
                        ) : (
                            <>
                                <FileUp className="w-12 h-12 text-violet-600/50 mx-auto mb-3" />
                                <p className="text-sm text-zinc-400">Click to select a .docx or .pptx template</p>
                                <p className="text-xs text-zinc-600 mt-1">Tagged as Legal department automatically</p>
                            </>
                        )}
                    </div>
                    {uploadSuccess && (
                        <p className="text-emerald-400 text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />Template uploaded! SDRs can now access it in the Templates section.
                        </p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setUploadOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                            disabled={!uploadFile || uploading}
                            onClick={handleUploadTemplate}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileUp className="w-4 h-4 mr-2" />}
                            Upload Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
