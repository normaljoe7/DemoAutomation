"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { useState } from "react";

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
    const [templates, setTemplates] = useState(initialTemplates);
    const [selected, setSelected] = useState<FinanceTemplate | null>(templates[0]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [saved, setSaved] = useState(false);

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

    const handleApprove = (templateId: string) => {
        const updated = templates.map((t) => t.id === templateId ? { ...t, status: "approved" as const } : t);
        setTemplates(updated);
        setSelected(updated.find((t) => t.id === templateId) || null);
    };

    return (
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
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] shadow-none border">
                            {templates.length} Templates
                        </Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
                        {templates.map((t) => (
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
    );
}
