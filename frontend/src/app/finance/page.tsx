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
    Wallet,
    FileText,
    Edit,
    Save,
    Eye,
    Download,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    IndianRupee,
    DollarSign,
    Percent,
    Calculator,
    ChevronRight,
    Lock,
    FileUp,
    Plus,
    Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Template definitions owned by Finance ───
interface FinanceTemplate {
    id: string;
    name: string;
    type: "invoice" | "quotation";
    variables: { key: string; label: string; value: string; category: "amount" | "tax" | "rate" | "info" }[];
    assignedLead: string;
    company: string;
    status: "draft" | "pending_review" | "approved" | "sent";
    lastModified: string;
    // Real document identifiers (present when loaded from backend)
    _docId?: number;
    _filename?: string | null;
    _pdfFilename?: string | null;
}

// Backend document shape returned by /api/v1/finance/documents
interface BackendDoc {
    id: number;
    type: string;
    filename: string | null;
    pdf_path: string | null;
    approval_status: string | null;
    finance_remarks: string | null;
    lead_name: string | null;
    company: string | null;
    created_at: string;
}

const APPROVAL_TO_UI_STATUS: Record<string, FinanceTemplate["status"]> = {
    // Finance reviews docs from Legal; on Finance approval, goes to Marketing then Admin
    pending_finance:    "pending_review",
    rejected_finance:   "draft",
    pending_marketing:  "approved",   // Finance approved, now with Marketing
    pending_admin:      "approved",   // Marketing approved, now with Admin
    ready_to_send:      "sent",
    sent:               "sent",
};

function mapDocToFinanceTemplate(doc: BackendDoc): FinanceTemplate {
    const pdfBasename = doc.pdf_path ? doc.pdf_path.split(/[/\\]/).pop() ?? null : null;
    const approvalStatus = doc.approval_status ?? "pending_finance";
    return {
        id: String(doc.id),
        name: `${(doc.type ?? "Document").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — ${doc.company || `Doc #${doc.id}`}`,
        type: doc.type === "quotation" ? "quotation" : "invoice",
        assignedLead: doc.lead_name || "—",
        company: doc.company || "—",
        status: APPROVAL_TO_UI_STATUS[approvalStatus] ?? "pending_review",
        lastModified: new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        variables: [
            { key: "document_type", label: "Document Type", value: doc.type ?? "—", category: "info" },
            { key: "filename",      label: "File Name",      value: doc.filename ?? "—", category: "info" },
            { key: "approval_status", label: "Approval Status", value: approvalStatus.replace(/_/g, " "), category: "info" },
            { key: "created",       label: "Created On",     value: new Date(doc.created_at).toLocaleDateString(), category: "info" },
            ...(doc.finance_remarks
                ? [{ key: "remarks", label: "Finance Remarks", value: doc.finance_remarks, category: "info" as const }]
                : []),
        ],
        _docId: doc.id,
        _filename: doc.filename,
        _pdfFilename: pdfBasename,
    };
}

const initialTemplates: FinanceTemplate[] = [
    {
        id: "ft1",
        name: "Invoice — Stark Industries",
        type: "invoice",
        assignedLead: "Kristen Hayer",
        company: "Stark Industries",
        status: "pending_review",
        lastModified: "Mar 5, 2026",
        variables: [
            { key: "client_name", label: "Client Name", value: "Stark Industries", category: "info" },
            { key: "invoice_date", label: "Invoice Date", value: "05-Mar-2026", category: "info" },
            { key: "invoice_number", label: "Invoice Number", value: "INV-2026-0042", category: "info" },
            { key: "quantity", label: "Quantity", value: "500", category: "amount" },
            { key: "price_inr", label: "Unit Price (INR)", value: "₹1,050.00", category: "amount" },
            { key: "total_amount_inr", label: "Subtotal (INR)", value: "₹5,25,000.00", category: "amount" },
            { key: "gst_rate", label: "GST Rate", value: "18%", category: "rate" },
            { key: "cgst_amount", label: "CGST (9%)", value: "₹47,250.00", category: "tax" },
            { key: "sgst_amount", label: "SGST (9%)", value: "₹47,250.00", category: "tax" },
            { key: "tax_amount", label: "Total Tax", value: "₹94,500.00", category: "tax" },
            { key: "grand_total_inr", label: "Grand Total (INR)", value: "₹6,19,500.00", category: "amount" },
            { key: "payment_terms", label: "Payment Terms", value: "Net 30", category: "info" },
        ],
    },
    {
        id: "ft2",
        name: "Quotation — Silver Corp",
        type: "quotation",
        assignedLead: "Trishala V",
        company: "Silver Corp",
        status: "draft",
        lastModified: "Mar 4, 2026",
        variables: [
            { key: "client_name", label: "Client Name", value: "Silver Corp", category: "info" },
            { key: "quotation_date", label: "Quotation Date", value: "04-Mar-2026", category: "info" },
            { key: "quotation_number", label: "Quotation Number", value: "QT-2026-0018", category: "info" },
            { key: "item_description", label: "Item Description", value: "Enterprise License — Annual", category: "info" },
            { key: "quantity", label: "Quantity", value: "1", category: "amount" },
            { key: "price_usd", label: "Unit Price (USD)", value: "$12,500.00", category: "amount" },
            { key: "total_amount_usd", label: "Total (USD)", value: "$12,500.00", category: "amount" },
            { key: "tax_rate", label: "Tax Rate", value: "0%", category: "rate" },
            { key: "tax_amount", label: "Tax Amount", value: "$0.00", category: "tax" },
            { key: "grand_total_usd", label: "Grand Total (USD)", value: "$12,500.00", category: "amount" },
            { key: "validity_period", label: "Validity Period", value: "30 days", category: "info" },
        ],
    },
    {
        id: "ft3",
        name: "Invoice — Avengers Initiative",
        type: "invoice",
        assignedLead: "Tony Stark",
        company: "Avengers Initiative",
        status: "approved",
        lastModified: "Mar 3, 2026",
        variables: [
            { key: "client_name", label: "Client Name", value: "Avengers Initiative", category: "info" },
            { key: "invoice_date", label: "Invoice Date", value: "03-Mar-2026", category: "info" },
            { key: "invoice_number", label: "Invoice Number", value: "INV-2026-0041", category: "info" },
            { key: "quantity", label: "Quantity", value: "100", category: "amount" },
            { key: "price_usd", label: "Unit Price (USD)", value: "$85.00", category: "amount" },
            { key: "total_amount_usd", label: "Subtotal (USD)", value: "$8,500.00", category: "amount" },
            { key: "tax_rate", label: "Tax Rate", value: "10%", category: "rate" },
            { key: "tax_amount", label: "Tax Amount", value: "$850.00", category: "tax" },
            { key: "grand_total_usd", label: "Grand Total (USD)", value: "$9,350.00", category: "amount" },
            { key: "payment_terms", label: "Payment Terms", value: "Net 45", category: "info" },
        ],
    },
];

const statusStyles: Record<string, string> = {
    draft: "bg-zinc-800 text-zinc-400 border-zinc-700",
    pending_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    sent: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

const statusLabels: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    sent: "Sent",
};

const categoryIcons: Record<string, React.ReactNode> = {
    amount: <DollarSign className="w-3 h-3 text-emerald-500" />,
    tax: <Calculator className="w-3 h-3 text-amber-500" />,
    rate: <Percent className="w-3 h-3 text-indigo-500" />,
    info: <FileText className="w-3 h-3 text-zinc-500" />,
};

export default function FinancePage() {
    const { getHeaders } = useAuth();
    const [templates, setTemplates] = useState(initialTemplates);
    const [selected, setSelected] = useState<FinanceTemplate | null>(templates[0]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    // Template upload
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load real documents from backend
    useEffect(() => {
        const loadFinanceDocs = async () => {
            try {
                const res = await fetch(`${API}/api/v1/finance/documents`, { headers: getHeaders(false) });
                if (res.ok) {
                    const docs: BackendDoc[] = await res.json();
                    if (docs.length > 0) {
                        const mapped = docs.map(mapDocToFinanceTemplate);
                        setTemplates(mapped);
                        setSelected(mapped[0]);
                    }
                }
            } catch {
                // Backend unavailable — keep using mock data
            } finally {
                setLoading(false);
            }
        };
        loadFinanceDocs();
    }, []);

    const handleUploadTemplate = async () => {
        if (!uploadFile) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", uploadFile);
            fd.append("department", "finance");
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

    const handleApprove = async (templateId: string) => {
        const t = templates.find((t) => t.id === templateId);
        // Use the Finance-specific endpoint for real documents
        const endpoint = t?._docId
            ? `${API}/api/v1/finance/documents/${t._docId}/approve`
            : `${API}/api/v1/documents/${templateId}/approve`;
        const body = t?._docId
            ? JSON.stringify({ remarks: "" })
            : JSON.stringify({ lead_name: t?.assignedLead, doc_type: t?.type });

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: getHeaders(),
                body,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                alert(`Approval failed: ${(errData as { detail?: string }).detail || "Unknown error"}`);
                return;
            }
        } catch {
            alert("Failed to connect to server.");
            return;
        }
        const updated = templates.map((t) => t.id === templateId ? { ...t, status: "approved" as const } : t);
        setTemplates(updated);
        setSelected(updated.find((t) => t.id === templateId) || null);
    };

    const handlePreview = (t: FinanceTemplate) => {
        // Prefer PDF, fall back to DOCX
        const viewName = t._pdfFilename || t._filename;
        if (viewName) {
            window.open(`${API}/api/v1/documents/${encodeURIComponent(viewName)}/view`, "_blank");
        } else {
            alert("No file available for preview.");
        }
    };

    const handleDownload = (t: FinanceTemplate) => {
        const dlName = t._filename;
        if (dlName) {
            window.open(`${API}/api/v1/documents/${encodeURIComponent(dlName)}/download`, "_blank");
        } else {
            alert("No file available for download.");
        }
    };

    // ─── Reject workflow ───
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectRemarks, setRejectRemarks] = useState("");
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

    const openRejectDialog = (templateId: string) => {
        setRejectTargetId(templateId);
        setRejectRemarks("");
        setRejectDialogOpen(true);
    };

    const handleReject = async () => {
        if (!rejectTargetId) return;
        const t = templates.find((t) => t.id === rejectTargetId);
        if (!rejectRemarks.trim()) {
            alert("Remarks are required when rejecting a document.");
            return;
        }
        setRejectSubmitting(true);
        try {
            if (t?._docId) {
                const res = await fetch(`${API}/api/v1/finance/documents/${t._docId}/reject`, {
                    method: "POST",
                    headers: getHeaders(),
                    body: JSON.stringify({ remarks: rejectRemarks }),
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    alert(`Rejection failed: ${(errData as { detail?: string }).detail || "Unknown error"}`);
                    return;
                }
            }
            const updated = templates.map((t) => t.id === rejectTargetId ? { ...t, status: "draft" as const } : t);
            setTemplates(updated);
            setSelected(updated.find((t) => t.id === rejectTargetId) || null);
            setRejectDialogOpen(false);
        } catch {
            alert("Failed to connect to server.");
        } finally {
            setRejectSubmitting(false);
        }
    };

    return (
        <>
        <div className="flex flex-col h-full w-full">
            <Header title="Finance Department" subtitle="Manage financial templates — invoices, quotations, pricing, and tax configurations." badgeText="Level 1" />

            <div className="flex-1 flex gap-5 p-6 min-h-0 overflow-hidden">
                {/* ─── Template List ─── */}
                <div className="w-[35%] border border-zinc-800/60 rounded-xl bg-[#0c0c0c] overflow-hidden shadow-2xl flex flex-col h-full">
                    <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-amber-400" />
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Finance Templates</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] shadow-none border">
                                {templates.length} Templates
                            </Badge>
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 gap-1"
                                onClick={() => { setUploadFile(null); setUploadSuccess(false); setUploadOpen(true); }}
                            >
                                <Plus className="w-3 h-3" />Upload
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                                <span className="ml-2 text-xs text-zinc-400">Loading documents...</span>
                            </div>
                        ) : templates.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => setSelected(t)}
                                className={`p-4 cursor-pointer transition-all ${selected?.id === t.id ? "bg-zinc-800/40 border-l-2 border-amber-500" : "hover:bg-zinc-800/20 border-l-2 border-transparent"}`}
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
                                    <span>{t.type === "invoice" ? "Invoice" : "Quotation"}</span>
                                    <span>·</span>
                                    <span>{t.lastModified}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Variable Editor Panel ─── */}
                {selected && (
                    <div className="w-[65%] flex flex-col gap-4 overflow-y-auto pb-6 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
                        {/* Template Header */}
                        <div className="p-5 rounded-xl border border-zinc-800/80 bg-gradient-to-b from-amber-900/10 to-zinc-900/10 shadow-lg">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">{selected.company} · {selected.assignedLead}</p>
                                </div>
                                <div className="flex gap-2">
                                    {selected.status !== "approved" && (
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => handleApprove(selected.id)}>
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
                                        </Button>
                                    )}
                                    {(selected.status === "pending_review" || selected.status === "draft") && selected._docId && (
                                        <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white h-8" onClick={() => openRejectDialog(selected.id)}>
                                            <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 h-8" onClick={() => handlePreview(selected)}>
                                        <Eye className="w-3.5 h-3.5 mr-1" />Preview
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 h-8" onClick={() => handleDownload(selected)}>
                                        <Download className="w-3.5 h-3.5 mr-1" />Download
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <Badge className={`text-[9px] uppercase tracking-wider rounded-sm px-2 shadow-none border ${statusStyles[selected.status]}`}>
                                    {statusLabels[selected.status]}
                                </Badge>
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] uppercase tracking-wider rounded-sm px-2 shadow-none border">
                                    <Lock className="w-2.5 h-2.5 mr-1" />Finance Owned
                                </Badge>
                            </div>
                        </div>

                        {/* Editable Variables by Category */}
                        {(["amount", "tax", "rate", "info"] as const).map((cat) => {
                            const vars = selected.variables.filter((v) => v.category === cat);
                            if (vars.length === 0) return null;
                            return (
                                <div key={cat} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
                                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2 capitalize">
                                        {categoryIcons[cat]}
                                        {cat === "amount" ? "Amounts & Pricing" : cat === "tax" ? "Tax Calculations" : cat === "rate" ? "Rates" : "General Information"}
                                    </h3>
                                    <div className="space-y-2">
                                        {vars.map((v) => (
                                            <div key={v.key} className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/50 group">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="min-w-[140px]">
                                                        <p className="text-xs text-zinc-500 font-medium">{v.label}</p>
                                                        <p className="text-[10px] text-zinc-600 font-mono">{`{{${v.key}}}`}</p>
                                                    </div>
                                                    {editingKey === v.key ? (
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <Input
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm flex-1"
                                                                autoFocus
                                                                onKeyDown={(e) => { if (e.key === "Enter") handleSave(selected.id, v.key); if (e.key === "Escape") setEditingKey(null); }}
                                                            />
                                                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8" onClick={() => handleSave(selected.id, v.key)}>
                                                                <Save className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <p className={`text-sm font-medium flex-1 ${cat === "amount" || cat === "tax" ? "text-emerald-400 font-mono" : cat === "rate" ? "text-indigo-400 font-mono" : "text-zinc-200"}`}>
                                                            {v.value}
                                                        </p>
                                                    )}
                                                </div>
                                                {editingKey !== v.key && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-zinc-600 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                                                        onClick={() => handleEdit(v.key, v.value)}
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
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
                                <Lock className="w-3 h-3 text-amber-500" />
                                <span><strong className="text-amber-400">Level 1 — Finance</strong>: Can edit amount, tax rates, GST amount, and pricing variables. Changes here propagate to SDR view.</span>
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
                        <DialogTitle className="text-white">Upload Finance Template</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Upload a DOCX or PPTX template for the Finance department. It will be visible to SDRs in the Templates section.
                        </DialogDescription>
                    </DialogHeader>
                    <div
                        className="p-8 border-2 border-dashed border-amber-500/30 rounded-xl text-center cursor-pointer hover:border-amber-500/50 transition-colors"
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
                                <FileUp className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                                <p className="text-sm text-white font-medium">{uploadFile.name}</p>
                                <p className="text-xs text-zinc-500 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB — click to change</p>
                            </>
                        ) : (
                            <>
                                <FileUp className="w-12 h-12 text-amber-600/50 mx-auto mb-3" />
                                <p className="text-sm text-zinc-400">Click to select a .docx or .pptx template</p>
                                <p className="text-xs text-zinc-600 mt-1">Tagged as Finance department automatically</p>
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
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={!uploadFile || uploading}
                            onClick={handleUploadTemplate}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileUp className="w-4 h-4 mr-2" />}
                            Upload Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Document Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-rose-400" />Reject Document
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Provide remarks explaining why this document is being rejected. The SDR will be notified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Rejection Remarks <span className="text-rose-400">*</span></Label>
                            <Textarea
                                className="bg-zinc-900 border-zinc-700 text-white mt-1.5 min-h-[100px]"
                                placeholder="Describe what needs to be corrected or why this document is rejected..."
                                value={rejectRemarks}
                                onChange={(e) => setRejectRemarks(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                            disabled={!rejectRemarks.trim() || rejectSubmitting}
                            onClick={handleReject}
                        >
                            {rejectSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
