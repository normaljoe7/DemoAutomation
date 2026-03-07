"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    Users, FileText, CheckCircle2, XCircle, Clock, Eye, Download,
    ChevronRight, Loader2, BarChart2, AlertTriangle, User, Building2,
    TrendingUp, FilePlus, ShieldAlert, ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BackendDoc {
    id: number;
    type: string;
    filename: string | null;
    pdf_path: string | null;
    approval_status: string | null;
    tl_remarks: string | null;
    lead_name: string | null;
    company: string | null;
    created_at: string;
    download_url: string | null;
    view_url: string | null;
}

interface BackendLead {
    id: number;
    name: string;
    company: string | null;
    lead_status: string | null;
    demo_status: string | null;
    demo_sub_status: string | null;
    email: string | null;
    created_at: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
    invoice: "Invoice",
    quotation: "Quotation",
    contract: "Contract",
    non_disclosure: "Non-Disclosure Agreement",
    non_compete: "Non-Compete Agreement",
    brochure: "Brochure",
    sample_list: "Sample List",
};

export default function TeamLeadPage() {
    const { getHeaders } = useAuth();
    const [pendingDocs, setPendingDocs] = useState<BackendDoc[]>([]);
    const [allLeads, setAllLeads] = useState<BackendLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<BackendDoc | null>(null);
    const [activeTab, setActiveTab] = useState<"queue" | "overview">("queue");

    // Approve / Reject dialog
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectRemarks, setRejectRemarks] = useState("");
    const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/v1/tl/documents`, { headers: getHeaders(false) });
            if (res.ok) setPendingDocs(await res.json());
        } catch { /* silent */ }
        setLoading(false);
    };

    const fetchLeads = async () => {
        setLeadsLoading(true);
        try {
            const res = await fetch(`${API}/api/v1/leads`, { headers: getHeaders(false) });
            if (res.ok) setAllLeads(await res.json());
        } catch { /* silent */ }
        setLeadsLoading(false);
    };

    useEffect(() => {
        fetchDocs();
        fetchLeads();
    }, []);

    const handleApprove = async (docId: number) => {
        setActionLoading(docId);
        try {
            const res = await fetch(`${API}/api/v1/tl/documents/${docId}/approve`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ remarks: "" }),
            });
            if (res.ok) {
                setPendingDocs(prev => prev.filter(d => d.id !== docId));
                if (selectedDoc?.id === docId) setSelectedDoc(null);
            }
        } catch { /* silent */ }
        setActionLoading(null);
    };

    const openRejectDialog = (docId: number) => {
        setRejectTargetId(docId);
        setRejectRemarks("");
        setRejectDialogOpen(true);
    };

    const handleReject = async () => {
        if (!rejectTargetId || !rejectRemarks.trim()) return;
        setRejectSubmitting(true);
        try {
            const res = await fetch(`${API}/api/v1/tl/documents/${rejectTargetId}/reject`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ remarks: rejectRemarks }),
            });
            if (res.ok) {
                setPendingDocs(prev => prev.filter(d => d.id !== rejectTargetId));
                if (selectedDoc?.id === rejectTargetId) setSelectedDoc(null);
                setRejectDialogOpen(false);
                setRejectRemarks("");
                setRejectTargetId(null);
            }
        } catch { /* silent */ }
        setRejectSubmitting(false);
    };

    // Group leads by status for overview
    const leadsByStatus = allLeads.reduce<Record<string, BackendLead[]>>((acc, l) => {
        const key = l.demo_status || "Unclassified";
        if (!acc[key]) acc[key] = [];
        acc[key].push(l);
        return acc;
    }, {});

    const hotLeads = allLeads.filter(l => l.lead_status === "HOT").length;
    const warmLeads = allLeads.filter(l => l.lead_status === "WARM").length;
    const completedLeads = allLeads.filter(l => l.demo_status === "Demo Completed").length;

    const formatDate = (iso: string) => {
        try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
        catch { return iso; }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#050505]">
            <Header
                title="Team Lead"
                subtitle="Review documents, monitor SDR pipeline & approve workflows."
                badgeText="TL VIEW"
            />

            <div className="flex flex-1 overflow-hidden">
                {/* ── Left Panel: Summary Stats ── */}
                <div className="w-72 shrink-0 border-r border-zinc-800/60 bg-[#080808] flex flex-col overflow-y-auto">
                    <div className="p-5 border-b border-zinc-800/60">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Approval Queue</p>
                        <div className="space-y-2">
                            <button
                                onClick={() => setActiveTab("queue")}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${activeTab === "queue" ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-400" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"}`}
                            >
                                <span className="flex items-center gap-2.5 text-[13px] font-semibold">
                                    <FileText className="w-3.5 h-3.5" />Document Review
                                </span>
                                {pendingDocs.length > 0 && (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] font-bold px-1.5 py-0.5">{pendingDocs.length}</Badge>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${activeTab === "overview" ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-400" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"}`}
                            >
                                <span className="flex items-center gap-2.5 text-[13px] font-semibold">
                                    <Users className="w-3.5 h-3.5" />Lead Overview
                                </span>
                                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] font-bold px-1.5 py-0.5">{allLeads.length}</Badge>
                            </button>
                        </div>
                    </div>

                    {/* Pipeline stats */}
                    <div className="p-5">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Pipeline Stats</p>
                        <div className="space-y-2">
                            {[
                                { label: "Total Leads", value: allLeads.length, color: "text-zinc-300" },
                                { label: "Hot Leads", value: hotLeads, color: "text-rose-400" },
                                { label: "Warm Leads", value: warmLeads, color: "text-amber-400" },
                                { label: "Demos Completed", value: completedLeads, color: "text-emerald-400" },
                                { label: "Pending TL Review", value: pendingDocs.length, color: "text-indigo-400" },
                            ].map(s => (
                                <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/40">
                                    <span className="text-[12px] text-zinc-500">{s.label}</span>
                                    <span className={`text-[13px] font-bold ${s.color}`}>{s.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Approval chain legend */}
                        <div className="mt-5 pt-4 border-t border-zinc-800/60">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Approval Chain</p>
                            <div className="space-y-1.5">
                                {[
                                    { step: "SDR", desc: "Generates document", color: "bg-zinc-700" },
                                    { step: "TL", desc: "You review first", color: "bg-indigo-500" },
                                    { step: "Legal", desc: "Legal compliance", color: "bg-violet-500" },
                                    { step: "Finance", desc: "Final approval", color: "bg-amber-500" },
                                ].map((s, i) => (
                                    <div key={s.step} className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white ${s.color} shrink-0`}>{i + 1}</div>
                                        <div>
                                            <span className="text-[11px] font-semibold text-zinc-300">{s.step}</span>
                                            <span className="text-[10px] text-zinc-600 ml-1.5">{s.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === "queue" ? (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Document Review Queue</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">Documents awaiting your approval before going to Legal.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchDocs} className="border-zinc-700 text-zinc-400 hover:text-white h-8 text-xs">
                                    Refresh
                                </Button>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mr-2" />
                                    <span className="text-zinc-400 text-sm">Loading queue...</span>
                                </div>
                            ) : pendingDocs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                                    <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm font-semibold">All clear!</p>
                                    <p className="text-xs mt-1">No documents waiting for your review.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingDocs.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedDoc?.id === doc.id
                                                ? "border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
                                                : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/60"
                                            }`}
                                            onClick={() => setSelectedDoc(doc.id === selectedDoc?.id ? null : doc)}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${doc.approval_status === "rejected_tl" ? "bg-rose-500/15 border border-rose-500/20" : "bg-indigo-500/10 border border-indigo-500/20"}`}>
                                                        <FileText className={`w-4 h-4 ${doc.approval_status === "rejected_tl" ? "text-rose-400" : "text-indigo-400"}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-[13px] font-semibold text-white">
                                                                {DOC_TYPE_LABELS[doc.type] || doc.type}
                                                            </p>
                                                            <Badge className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${doc.approval_status === "rejected_tl" ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
                                                                {doc.approval_status === "rejected_tl" ? "Previously Rejected" : "Awaiting Review"}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[12px] text-zinc-400 mt-0.5">
                                                            {doc.lead_name || "Unknown Lead"} · {doc.company || "—"}
                                                        </p>
                                                        <p className="text-[10px] text-zinc-600 mt-1">Submitted {formatDate(doc.created_at)}</p>
                                                        {doc.tl_remarks && (
                                                            <p className="text-[10px] text-rose-400/80 mt-1 italic">Previous note: {doc.tl_remarks}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 shrink-0">
                                                    {doc.view_url && (
                                                        <a href={`${API}${doc.view_url}`} target="_blank" rel="noreferrer">
                                                            <Button size="sm" variant="outline" className="h-8 px-3 border-zinc-700 text-zinc-400 hover:text-white text-xs">
                                                                <Eye className="w-3.5 h-3.5 mr-1" />View
                                                            </Button>
                                                        </a>
                                                    )}
                                                    {doc.download_url && (
                                                        <a href={`${API}${doc.download_url}`} download target="_blank" rel="noreferrer">
                                                            <Button size="sm" variant="outline" className="h-8 px-3 border-zinc-700 text-zinc-400 hover:text-white text-xs">
                                                                <Download className="w-3.5 h-3.5 mr-1" />Download
                                                            </Button>
                                                        </a>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
                                                        onClick={(e) => { e.stopPropagation(); handleApprove(doc.id); }}
                                                        disabled={actionLoading === doc.id}
                                                    >
                                                        {actionLoading === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</>}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/50 text-xs font-bold"
                                                        onClick={(e) => { e.stopPropagation(); openRejectDialog(doc.id); }}
                                                        disabled={actionLoading === doc.id}
                                                    >
                                                        <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Expanded detail */}
                                            {selectedDoc?.id === doc.id && (
                                                <div className="mt-4 pt-4 border-t border-indigo-500/20">
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { label: "Document Type", value: DOC_TYPE_LABELS[doc.type] || doc.type },
                                                            { label: "Lead", value: doc.lead_name || "—" },
                                                            { label: "Company", value: doc.company || "—" },
                                                            { label: "Filename", value: doc.filename || "—" },
                                                            { label: "Status", value: doc.approval_status || "—" },
                                                            { label: "Submitted", value: formatDate(doc.created_at) },
                                                        ].map(f => (
                                                            <div key={f.label} className="bg-zinc-900/60 rounded-lg px-3 py-2">
                                                                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">{f.label}</p>
                                                                <p className="text-[12px] text-zinc-200 mt-0.5 truncate">{f.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-3 flex items-center gap-2 p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/50">
                                                        <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                                                        <p className="text-[11px] text-zinc-400">
                                                            After your approval, this document moves to <span className="text-violet-400 font-semibold">Legal Review</span>, then <span className="text-amber-400 font-semibold">Finance</span>, before the SDR can send it.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Lead Overview tab */
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Lead Pipeline Overview</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">All leads across your SDR team — real-time view.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchLeads} className="border-zinc-700 text-zinc-400 hover:text-white h-8 text-xs">
                                    Refresh
                                </Button>
                            </div>

                            {leadsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mr-2" />
                                    <span className="text-zinc-400 text-sm">Loading leads...</span>
                                </div>
                            ) : allLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                                    <Users className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">No leads found in the system.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Status groups */}
                                    {Object.entries(leadsByStatus)
                                        .sort(([, a], [, b]) => b.length - a.length)
                                        .map(([status, leads]) => (
                                            <div key={status} className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800/40">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${status === "Demo Completed" ? "bg-emerald-500" : status === "Demo Scheduled" ? "bg-indigo-500" : "bg-zinc-600"}`} />
                                                        <p className="text-[12px] font-semibold text-zinc-200">{status}</p>
                                                    </div>
                                                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">{leads.length}</Badge>
                                                </div>
                                                <div className="divide-y divide-zinc-800/40">
                                                    {leads.map((lead) => (
                                                        <div key={lead.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="h-7 w-7 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                                    <User className="w-3.5 h-3.5 text-indigo-400" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[12px] font-semibold text-zinc-200 truncate">{lead.name || "Unknown"}</p>
                                                                    <p className="text-[10px] text-zinc-500 truncate">{lead.company || "—"} · {lead.email || "—"}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {lead.lead_status && (
                                                                    <Badge className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${
                                                                        lead.lead_status === "HOT" ? "bg-rose-500/15 text-rose-400 border-rose-500/20" :
                                                                        lead.lead_status === "WARM" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" :
                                                                        lead.lead_status === "COLD" ? "bg-sky-500/15 text-sky-400 border-sky-500/20" :
                                                                        "bg-zinc-800 text-zinc-500 border-zinc-700"
                                                                    }`}>
                                                                        {lead.lead_status}
                                                                    </Badge>
                                                                )}
                                                                {lead.demo_sub_status && (
                                                                    <span className="text-[10px] text-zinc-600 hidden md:block truncate max-w-32">{lead.demo_sub_status}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Reject Dialog ── */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="bg-[#0c0c0c] border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-400">
                            <ShieldAlert className="w-4 h-4" />Reject Document
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 text-sm">
                            Provide your rejection reason. This will be shared with the SDR and visible in the dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea
                            placeholder="Explain why you are rejecting this document..."
                            value={rejectRemarks}
                            onChange={(e) => setRejectRemarks(e.target.value)}
                            rows={4}
                            className="bg-zinc-900 border-zinc-700 text-zinc-200 text-sm resize-none focus:border-rose-500/50"
                        />
                        {!rejectRemarks.trim() && (
                            <p className="text-[10px] text-rose-400/70 mt-1.5">* Rejection reason is required.</p>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white" onClick={() => setRejectDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                            onClick={handleReject}
                            disabled={rejectSubmitting || !rejectRemarks.trim()}
                        >
                            {rejectSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                            {rejectSubmitting ? "Rejecting..." : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
