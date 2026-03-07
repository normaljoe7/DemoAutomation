"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    Megaphone,
    FileText,
    Eye,
    Download,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Palette,
    ImageIcon,
    FileUp,
    Loader2,
    ChevronRight,
    RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BackendDoc {
    id: number;
    type: string;
    filename: string | null;
    pdf_path: string | null;
    approval_status: string | null;
    marketing_remarks: string | null;
    tl_remarks: string | null;
    finance_remarks: string | null;
    legal_remarks: string | null;
    lead_name: string | null;
    company: string | null;
    created_at: string;
}

interface MarketingDoc extends BackendDoc {
    displayName: string;
    uiStatus: "pending_review" | "approved" | "rejected";
}

function mapDoc(doc: BackendDoc): MarketingDoc {
    const typeName = (doc.type ?? "Document").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const company = doc.company || `Doc #${doc.id}`;
    return {
        ...doc,
        displayName: `${typeName} — ${company}`,
        uiStatus:
            doc.approval_status === "rejected_marketing" ? "rejected" :
            doc.approval_status === "pending_admin" ? "approved" :
            "pending_review",
    };
}

const statusStyles: Record<string, string> = {
    pending_review: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    approved:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected:       "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const statusLabels: Record<string, string> = {
    pending_review: "Pending Brand Review",
    approved:       "Brand Approved",
    rejected:       "Rejected",
};

export default function MarketingPage() {
    const { getHeaders } = useAuth();
    const [docs, setDocs] = useState<MarketingDoc[]>([]);
    const [selected, setSelected] = useState<MarketingDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Brand asset upload
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Approve / Reject dialogs
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [actionDoc, setActionDoc] = useState<MarketingDoc | null>(null);
    const [approveRemarks, setApproveRemarks] = useState("");
    const [rejectRemarks, setRejectRemarks] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const fetchDocs = async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch(`${API}/api/v1/marketing/documents`, { headers: getHeaders(false) });
            if (res.ok) {
                const data: BackendDoc[] = await res.json();
                const mapped = data.map(mapDoc);
                setDocs(mapped);
                if (mapped.length > 0 && !selected) setSelected(mapped[0]);
            }
        } catch {
            // backend unavailable
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    const handleUpload = async () => {
        if (!uploadFile) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", uploadFile);
            fd.append("department", "marketing");
            const res = await fetch(`${API}/api/v1/templates/upload`, {
                method: "POST",
                headers: getHeaders(false),
                body: fd,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Upload failed" }));
                throw new Error(err.detail || "Upload failed");
            }
            setUploadSuccess(true);
            setTimeout(() => { setUploadOpen(false); setUploadSuccess(false); setUploadFile(null); }, 1500);
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const openApprove = (doc: MarketingDoc) => { setActionDoc(doc); setApproveRemarks(""); setActionError(null); setApproveOpen(true); };
    const openReject  = (doc: MarketingDoc) => { setActionDoc(doc); setRejectRemarks(""); setActionError(null); setRejectOpen(true); };

    const handleApprove = async () => {
        if (!actionDoc) return;
        setActionLoading(true);
        setActionError(null);
        try {
            const res = await fetch(`${API}/api/v1/marketing/documents/${actionDoc.id}/approve`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ remarks: approveRemarks || null }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Action failed" }));
                throw new Error(err.detail || "Action failed");
            }
            setApproveOpen(false);
            fetchDocs(true);
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!actionDoc) return;
        if (!rejectRemarks.trim()) { setActionError("Remarks are required when rejecting a document."); return; }
        setActionLoading(true);
        setActionError(null);
        try {
            const res = await fetch(`${API}/api/v1/marketing/documents/${actionDoc.id}/reject`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ remarks: rejectRemarks }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Action failed" }));
                throw new Error(err.detail || "Action failed");
            }
            setRejectOpen(false);
            fetchDocs(true);
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    const pendingCount  = docs.filter(d => d.uiStatus === "pending_review").length;
    const approvedCount = docs.filter(d => d.uiStatus === "approved").length;
    const rejectedCount = docs.filter(d => d.uiStatus === "rejected").length;

    return (
        <>
            <Header
                title="Marketing"
                subtitle="Brand compliance review — approve or reject documents before Admin final sign-off"
                badgeText="Brand Review"
            />

            <div className="flex flex-1 h-[calc(100vh-80px)] overflow-hidden">
                {/* ── Left Panel — Document List ── */}
                <div className="w-80 shrink-0 border-r border-zinc-800/60 flex flex-col bg-[#070707]">
                    {/* Stats strip */}
                    <div className="grid grid-cols-3 border-b border-zinc-800/60">
                        {[
                            { label: "Pending",  value: pendingCount,  color: "text-fuchsia-400" },
                            { label: "Approved", value: approvedCount, color: "text-emerald-400" },
                            { label: "Rejected", value: rejectedCount, color: "text-rose-400" },
                        ].map(stat => (
                            <div key={stat.label} className="flex flex-col items-center py-3 border-r border-zinc-800/40 last:border-r-0">
                                <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
                                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            {docs.length} Document{docs.length !== 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchDocs(true)}
                                disabled={refreshing}
                                className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                                title="Refresh"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            </button>
                            <Button
                                size="sm"
                                className="h-7 text-[11px] bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold px-3 gap-1.5"
                                onClick={() => { setUploadOpen(true); setUploadSuccess(false); setUploadFile(null); }}
                            >
                                <FileUp className="w-3 h-3" />Upload Brand Asset
                            </Button>
                        </div>
                    </div>

                    {/* Document list */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
                            </div>
                        ) : docs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-zinc-600 px-6 text-center">
                                <Palette className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium text-zinc-500 mb-1">No documents to review</p>
                                <p className="text-xs">Documents forwarded by Finance will appear here for brand compliance review.</p>
                            </div>
                        ) : (
                            docs.map((doc) => (
                                <button
                                    key={doc.id}
                                    onClick={() => setSelected(doc)}
                                    className={`w-full text-left px-4 py-3.5 border-b border-zinc-900/60 transition-all duration-150 hover:bg-zinc-800/30 ${
                                        selected?.id === doc.id ? "bg-zinc-800/50 border-l-2 border-l-fuchsia-500" : ""
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] font-semibold text-white truncate">{doc.displayName}</p>
                                            <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{doc.lead_name || "—"}</p>
                                        </div>
                                        <Badge className={`text-[9px] font-bold uppercase shrink-0 border ${statusStyles[doc.uiStatus]}`}>
                                            {statusLabels[doc.uiStatus]}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 mt-1.5 flex items-center gap-1">
                                        {doc.uiStatus === "pending_review" && <Clock className="w-3 h-3 text-fuchsia-500" />}
                                        {doc.uiStatus === "approved" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                        {doc.uiStatus === "rejected" && <XCircle className="w-3 h-3 text-rose-500" />}
                                        {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right Panel — Document Detail ── */}
                <div className="flex-1 flex flex-col overflow-y-auto bg-[#050505]">
                    {!selected ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-zinc-600">
                            <Megaphone className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm">Select a document to review</p>
                        </div>
                    ) : (
                        <div className="p-8 max-w-4xl w-full mx-auto">
                            {/* Doc header */}
                            <div className="flex items-start justify-between gap-4 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
                                        <FileText className="h-5 w-5 text-fuchsia-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white leading-tight">{selected.displayName}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className={`text-[9px] font-bold uppercase border ${statusStyles[selected.uiStatus]}`}>
                                                {statusLabels[selected.uiStatus]}
                                            </Badge>
                                            {selected.lead_name && (
                                                <span className="text-[11px] text-zinc-500">
                                                    {selected.lead_name} · {selected.company}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action buttons — only if pending */}
                                {selected.uiStatus === "pending_review" && (
                                    <div className="flex gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-9 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 gap-1.5"
                                            onClick={() => openReject(selected)}
                                        >
                                            <XCircle className="w-4 h-4" />Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-9 bg-fuchsia-600 hover:bg-fuchsia-500 text-white gap-1.5"
                                            onClick={() => openApprove(selected)}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />Brand Approve
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {[
                                    { label: "Document Type",    value: (selected.type ?? "—").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) },
                                    { label: "Company",          value: selected.company ?? "—" },
                                    { label: "Lead / Client",    value: selected.lead_name ?? "—" },
                                    { label: "Submitted On",     value: new Date(selected.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
                                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
                                        <p className="text-sm font-medium text-white">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Approval trail */}
                            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 mb-6">
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <ChevronRight className="w-3.5 h-3.5 text-fuchsia-400" />Approval Trail
                                </p>
                                <div className="space-y-2">
                                    {[
                                        { stage: "Team Lead",  remarks: selected.tl_remarks,      status: selected.approval_status },
                                        { stage: "Legal",      remarks: selected.legal_remarks,   status: selected.approval_status },
                                        { stage: "Finance",    remarks: selected.finance_remarks, status: selected.approval_status },
                                    ].map(({ stage, remarks }) => (
                                        <div key={stage} className="flex items-start gap-3">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[12px] font-semibold text-zinc-300">{stage} — Approved</p>
                                                {remarks && <p className="text-[11px] text-zinc-500 mt-0.5 italic">&ldquo;{remarks}&rdquo;</p>}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-start gap-3">
                                        {selected.uiStatus === "approved" ? (
                                            <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0 mt-0.5" />
                                        ) : selected.uiStatus === "rejected" ? (
                                            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                        ) : (
                                            <Clock className="w-4 h-4 text-fuchsia-400 animate-pulse shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className="text-[12px] font-semibold text-zinc-300">
                                                Marketing —{" "}
                                                {selected.uiStatus === "approved" ? "Brand Approved" :
                                                 selected.uiStatus === "rejected" ? "Rejected" :
                                                 "Pending Review"}
                                            </p>
                                            {selected.marketing_remarks && (
                                                <p className="text-[11px] text-zinc-500 mt-0.5 italic">&ldquo;{selected.marketing_remarks}&rdquo;</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 opacity-50">
                                        <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                        <p className="text-[12px] font-semibold text-zinc-500">Admin — Final Approval (pending)</p>
                                    </div>
                                </div>
                            </div>

                            {/* View / Download actions */}
                            <div className="flex gap-3">
                                {selected.filename && (
                                    <>
                                        <a
                                            href={`${API}/api/v1/documents/${selected.filename}/view`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button variant="outline" size="sm" className="h-9 border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5">
                                                <Eye className="w-4 h-4" />Preview
                                            </Button>
                                        </a>
                                        <a href={`${API}/api/v1/documents/${selected.filename}/download`} download>
                                            <Button variant="outline" size="sm" className="h-9 border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5">
                                                <Download className="w-4 h-4" />Download
                                            </Button>
                                        </a>
                                    </>
                                )}
                                {!selected.filename && (
                                    <p className="text-xs text-zinc-600 italic flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                        No file attached — reviewing document metadata only.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Approve Dialog ── */}
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogContent className="bg-[#0f0f0f] border border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <CheckCircle2 className="text-fuchsia-400 w-5 h-5" />Brand Approve Document
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Confirm this document meets brand guidelines. It will be forwarded to Admin for final approval.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="bg-zinc-900/60 rounded-lg px-4 py-3 border border-zinc-800/60">
                            <p className="text-xs text-zinc-500 mb-0.5">Document</p>
                            <p className="text-sm font-semibold text-white">{actionDoc?.displayName}</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="approve-remarks" className="text-zinc-400 text-xs">
                                Brand notes (optional)
                            </Label>
                            <Textarea
                                id="approve-remarks"
                                value={approveRemarks}
                                onChange={(e) => setApproveRemarks(e.target.value)}
                                placeholder="Add any brand compliance notes..."
                                rows={3}
                                className="bg-zinc-900/60 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm resize-none"
                            />
                        </div>
                        {actionError && (
                            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">{actionError}</p>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setApproveOpen(false)} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white gap-1.5"
                            onClick={handleApprove}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {actionLoading ? "Approving…" : "Brand Approve"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Reject Dialog ── */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="bg-[#0f0f0f] border border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <XCircle className="text-rose-400 w-5 h-5" />Reject — Off Brand
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Reject this document with detailed brand feedback. The SDR team will be notified.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="bg-zinc-900/60 rounded-lg px-4 py-3 border border-zinc-800/60">
                            <p className="text-xs text-zinc-500 mb-0.5">Document</p>
                            <p className="text-sm font-semibold text-white">{actionDoc?.displayName}</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="reject-remarks" className="text-zinc-400 text-xs">
                                Brand feedback <span className="text-rose-400">*</span>
                            </Label>
                            <Textarea
                                id="reject-remarks"
                                value={rejectRemarks}
                                onChange={(e) => { setRejectRemarks(e.target.value); setActionError(null); }}
                                placeholder="Describe what is off-brand and what needs to change..."
                                rows={4}
                                className="bg-zinc-900/60 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm resize-none"
                                autoFocus
                            />
                        </div>
                        {actionError && (
                            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">{actionError}</p>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-rose-600 hover:bg-rose-500 text-white gap-1.5"
                            onClick={handleReject}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            {actionLoading ? "Rejecting…" : "Reject Document"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Upload Brand Asset Dialog ── */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="bg-[#0f0f0f] border border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <ImageIcon className="text-fuchsia-400 w-5 h-5" />Upload Brand Asset
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Upload brand guidelines, logo kits, or reference materials for the team.
                        </DialogDescription>
                    </DialogHeader>

                    {uploadSuccess ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            <p className="text-sm font-semibold text-white">Brand asset uploaded.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div
                                className="border-2 border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileUp className="w-8 h-8 text-zinc-600" />
                                {uploadFile ? (
                                    <p className="text-sm font-semibold text-fuchsia-400">{uploadFile.name}</p>
                                ) : (
                                    <>
                                        <p className="text-sm text-zinc-400 font-medium">Click to select a file</p>
                                        <p className="text-xs text-zinc-600">DOCX, PDF, PNG, JPG supported</p>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".docx,.pdf,.png,.jpg,.jpeg,.svg,.zip"
                                    className="hidden"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
                            Cancel
                        </Button>
                        {!uploadSuccess && (
                            <Button
                                size="sm"
                                className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white gap-1.5"
                                onClick={handleUpload}
                                disabled={!uploadFile || uploading}
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                                {uploading ? "Uploading…" : "Upload"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
