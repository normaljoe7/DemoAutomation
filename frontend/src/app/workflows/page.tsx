"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    GitPullRequest,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    Eye,
    Download,
    MessageSquare,
    ChevronRight,
    UserCircle,
    AlertTriangle,
} from "lucide-react";
import { useState } from "react";

interface ApprovalItem {
    id: string;
    docName: string;
    docType: string;
    leadName: string;
    company: string;
    step: "sdr_review" | "finance_review" | "legal_review" | "final_sdr";
    status: "pending" | "approved" | "rejected";
    assignedTo: string;
    amount?: string;
    createdAt: string;
    rejectionReason?: string;
}

const mockApprovals: ApprovalItem[] = [
    { id: "a1", docName: "Invoice_Stark_Industries.docx", docType: "invoice", leadName: "Kristen Hayer", company: "Stark Industries", step: "finance_review", status: "pending", assignedTo: "Finance Team", amount: "₹5,25,000.00", createdAt: "Mar 4, 2026" },
    { id: "a2", docName: "Contract_Avengers.docx", docType: "contract", leadName: "Tony Stark", company: "Avengers Initiative", step: "legal_review", status: "pending", assignedTo: "Legal Team", createdAt: "Mar 3, 2026" },
    { id: "a3", docName: "Quotation_Silver_Corp.docx", docType: "quotation", leadName: "Trishala V", company: "Silver Corp", step: "sdr_review", status: "pending", assignedTo: "SDR Agent", amount: "$12,500.00", createdAt: "Mar 3, 2026" },
    { id: "a4", docName: "MOM_Stark_Demo.docx", docType: "mom", leadName: "Pepper Potts", company: "Stark Industries", step: "final_sdr", status: "approved", assignedTo: "SDR Agent", createdAt: "Mar 2, 2026" },
    { id: "a5", docName: "Invoice_Shield.docx", docType: "invoice", leadName: "Natasha R.", company: "SHIELD Global", step: "finance_review", status: "rejected", assignedTo: "Finance Team", amount: "₹8,00,000.00", createdAt: "Feb 28, 2026", rejectionReason: "Tax calculation incorrect. CGST/SGST rates need to match the latest HSN code." },
];

const stepLabels: Record<string, string> = {
    sdr_review: "SDR Review",
    finance_review: "Finance Review",
    legal_review: "Legal Review",
    final_sdr: "Final SDR Approval",
};

const stepColors: Record<string, string> = {
    sdr_review: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    finance_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    legal_review: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    final_sdr: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function WorkflowsPage() {
    const [approvals, setApprovals] = useState(mockApprovals);
    const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [filterStep, setFilterStep] = useState("all");

    const filtered = filterStep === "all" ? approvals : approvals.filter((a) => a.step === filterStep);

    const handleApprove = (id: string) => {
        setApprovals(approvals.map((a) => a.id === id ? { ...a, status: "approved" as const } : a));
    };

    const handleReject = () => {
        if (!selectedItem) return;
        setApprovals(approvals.map((a) => a.id === selectedItem.id ? { ...a, status: "rejected" as const, rejectionReason: rejectReason } : a));
        setRejectOpen(false);
        setRejectReason("");
        setSelectedItem(null);
    };

    const pendingCount = approvals.filter((a) => a.status === "pending").length;

    return (
        <div className="flex flex-col h-full w-full">
            <Header title="Approval Workflows" subtitle="Multi-stage document approval pipeline." badgeText={`${pendingCount} Pending`} />

            <div className="flex-1 p-8 pt-6 overflow-y-auto">
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6">
                    {["all", "sdr_review", "finance_review", "legal_review", "final_sdr"].map((step) => (
                        <Button
                            key={step}
                            variant={filterStep === step ? "secondary" : "outline"}
                            size="sm"
                            className={`text-xs capitalize ${filterStep === step ? "bg-zinc-800 text-white" : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
                            onClick={() => setFilterStep(step)}
                        >
                            {step === "all" ? "All" : stepLabels[step]}
                        </Button>
                    ))}
                </div>

                {/* Workflow Pipeline Visualization */}
                <div className="flex items-center gap-2 mb-8 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                    {["sdr_review", "finance_review", "legal_review", "final_sdr"].map((step, i) => (
                        <div key={step} className="flex items-center gap-2 flex-1">
                            <div className={`flex-1 p-3 rounded-lg border text-center ${stepColors[step]}`}>
                                <p className="text-xs font-bold uppercase tracking-wider">{stepLabels[step]}</p>
                                <p className="text-lg font-bold mt-1">{approvals.filter((a) => a.step === step && a.status === "pending").length}</p>
                            </div>
                            {i < 3 && <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />}
                        </div>
                    ))}
                </div>

                {/* Approval Cards */}
                <div className="space-y-3">
                    {filtered.map((item) => (
                        <div key={item.id} className="p-5 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg hover:border-zinc-700/80 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-lg border ${item.docType === "invoice" ? "bg-emerald-500/10 border-emerald-500/20" : item.docType === "contract" ? "bg-violet-500/10 border-violet-500/20" : "bg-indigo-500/10 border-indigo-500/20"}`}>
                                        <FileText className={`w-5 h-5 ${item.docType === "invoice" ? "text-emerald-400" : item.docType === "contract" ? "text-violet-400" : "text-indigo-400"}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{item.docName}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-zinc-500">{item.leadName} · {item.company}</span>
                                            {item.amount && <span className="text-xs text-emerald-400 font-mono font-semibold">{item.amount}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Badge className={`text-[10px] uppercase tracking-wider rounded-sm px-2 shadow-none border ${stepColors[item.step]}`}>
                                        {stepLabels[item.step]}
                                    </Badge>
                                    {item.status === "pending" && (
                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] uppercase tracking-wider rounded-sm px-2 shadow-none border">
                                            <Clock className="w-3 h-3 mr-1" />Pending
                                        </Badge>
                                    )}
                                    {item.status === "approved" && (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase tracking-wider rounded-sm px-2 shadow-none border">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />Approved
                                        </Badge>
                                    )}
                                    {item.status === "rejected" && (
                                        <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] uppercase tracking-wider rounded-sm px-2 shadow-none border">
                                            <XCircle className="w-3 h-3 mr-1" />Rejected
                                        </Badge>
                                    )}

                                    {item.status === "pending" && (
                                        <div className="flex gap-2 ml-4">
                                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white h-8"><Eye className="w-3.5 h-3.5 mr-1" />Preview</Button>
                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => handleApprove(item.id)}>
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
                                            </Button>
                                            <Button size="sm" variant="destructive" className="h-8" onClick={() => { setSelectedItem(item); setRejectOpen(true); }}>
                                                <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {item.rejectionReason && (
                                <div className="mt-3 p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-rose-300">{item.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Reject Dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Reject Document</DialogTitle>
                        <DialogDescription className="text-zinc-400">Provide a reason for rejection. The SDR will be notified.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Enter rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={4}
                        className="bg-zinc-900 border-zinc-700 text-white"
                    />
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setRejectOpen(false)}>Cancel</Button>
                        <Button variant="destructive" disabled={!rejectReason.trim()} onClick={handleReject}>Reject with Reason</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
