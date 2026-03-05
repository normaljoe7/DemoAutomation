"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    FileText,
    Plus,
    Upload,
    FileUp,
    Download,
    Eye,
    Trash2,
    Code,
    Table,
    FileSpreadsheet,
} from "lucide-react";
import { useState } from "react";

interface Template {
    id: string;
    name: string;
    type: "docx" | "pptx";
    variables: string[];
    version: number;
    lastModified: string;
    category: string;
}

const mockTemplates: Template[] = [
    { id: "t1", name: "Standard Invoice", type: "docx", variables: ["client_name", "invoice_date", "quantity", "price_inr", "price_usd", "gst_rate", "total_amount_inr", "total_amount_usd"], version: 3, lastModified: "Mar 3, 2026", category: "invoice" },
    { id: "t2", name: "Service Contract", type: "docx", variables: ["client_name", "company_name", "start_date", "end_date", "contract_value", "terms", "signatures"], version: 2, lastModified: "Mar 1, 2026", category: "contract" },
    { id: "t3", name: "Pre-Call Deck", type: "pptx", variables: ["company_name", "industry", "contact_person", "intel_summary", "demo_date", "target_audience"], version: 1, lastModified: "Feb 28, 2026", category: "pre_call_ppt" },
    { id: "t4", name: "Quotation Template", type: "docx", variables: ["client_name", "quotation_date", "item_description", "quantity", "price_usd", "validity_period", "total_amount_usd"], version: 2, lastModified: "Feb 25, 2026", category: "quotation" },
    { id: "t5", name: "Meeting Minutes", type: "docx", variables: ["meeting_date", "attendees", "agenda", "discussion_summary", "action_items", "next_steps"], version: 1, lastModified: "Feb 20, 2026", category: "mom" },
    { id: "t6", name: "Sample List Request", type: "docx", variables: ["client_name", "target_audience", "sample_count", "criteria", "delivery_date"], version: 1, lastModified: "Feb 18, 2026", category: "sample_list" },
];

export default function TemplatesPage() {
    const [templates, setTemplates] = useState(mockTemplates);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [filter, setFilter] = useState("all");

    const filteredTemplates = templates.filter((t) => filter === "all" || t.category === filter);

    return (
        <div className="flex flex-col h-full w-full">
            <Header title="Template Engine" subtitle="Manage DOCX/PPTX templates with {{variable}} placeholders — powered by Doc Generator v30." badgeText={`${templates.length} Templates`} />

            <div className="flex-1 flex gap-6 p-8 pt-6 min-h-0 overflow-hidden">
                {/* Template Grid */}
                <div className="flex-1 overflow-y-auto pr-2 pb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex gap-2">
                            {["all", "invoice", "contract", "quotation", "mom", "pre_call_ppt", "sample_list"].map((cat) => (
                                <Button
                                    key={cat}
                                    variant={filter === cat ? "secondary" : "outline"}
                                    size="sm"
                                    className={`border-zinc-800 capitalize text-xs ${filter === cat ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 font-semibold" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
                                    onClick={() => setFilter(cat)}
                                >
                                    {cat === "all" ? "All" : cat.replace(/_/g, " ")}
                                </Button>
                            ))}
                        </div>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setUploadOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />Upload Template
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTemplates.map((tmpl) => (
                            <div
                                key={tmpl.id}
                                onClick={() => setSelectedTemplate(tmpl)}
                                className={`p-5 rounded-xl border cursor-pointer transition-all group shadow-lg ${selectedTemplate?.id === tmpl.id ? "border-indigo-500/60 bg-indigo-500/5" : "border-zinc-800/60 bg-[#0c0c0c] hover:border-zinc-700/80"
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${tmpl.type === "pptx" ? "bg-orange-500/10 border border-orange-500/20" : "bg-indigo-500/10 border border-indigo-500/20"}`}>
                                            {tmpl.type === "pptx" ? <FileSpreadsheet className="w-5 h-5 text-orange-400" /> : <FileText className="w-5 h-5 text-indigo-400" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{tmpl.name}</p>
                                            <p className="text-xs text-zinc-500">v{tmpl.version} · {tmpl.lastModified}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] uppercase shadow-none border">{tmpl.type}</Badge>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {tmpl.variables.slice(0, 4).map((v) => (
                                        <span key={v} className="text-[10px] bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700/50 font-mono">{`{{${v}}}`}</span>
                                    ))}
                                    {tmpl.variables.length > 4 && (
                                        <span className="text-[10px] bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-700/50">+{tmpl.variables.length - 4} more</span>
                                    )}
                                </div>

                                <div className="flex gap-1.5 mt-4 pt-3 border-t border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white"><Eye className="w-3 h-3 mr-1" />Preview</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white"><Download className="w-3 h-3 mr-1" />Download</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-rose-400"><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Template Detail */}
                {selectedTemplate && (
                    <div className="w-[320px] shrink-0 border border-zinc-800/60 rounded-xl bg-[#0c0c0c] p-5">
                        <h3 className="text-sm font-bold text-white mb-4">{selectedTemplate.name}</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Type</p>
                                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 shadow-none border">{selectedTemplate.type.toUpperCase()}</Badge>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Version</p>
                                <p className="text-sm text-zinc-300">v{selectedTemplate.version}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Category</p>
                                <p className="text-sm text-zinc-300 capitalize">{selectedTemplate.category.replace(/_/g, " ")}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Variables ({selectedTemplate.variables.length})</p>
                                <div className="space-y-1.5">
                                    {selectedTemplate.variables.map((v) => (
                                        <div key={v} className="flex items-center gap-2 bg-zinc-900/60 p-2 rounded-md border border-zinc-800/50">
                                            <Code className="w-3 h-3 text-indigo-400" />
                                            <span className="text-xs font-mono text-zinc-300">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Template Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Upload Template</DialogTitle>
                        <DialogDescription className="text-zinc-400">Upload a DOCX or PPTX template with {`{{variable}}`} placeholders.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-zinc-400 text-xs">Template Name</Label>
                        <Input className="bg-zinc-900 border-zinc-700 text-white mt-1 mb-4" placeholder="e.g. Standard Invoice" />
                    </div>
                    <div className="p-8 border-2 border-dashed border-zinc-700 rounded-xl text-center cursor-pointer hover:border-indigo-500/50 transition-colors">
                        <FileUp className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400">Click to upload .docx or .pptx file</p>
                        <p className="text-xs text-zinc-600 mt-1">Variables will be auto-detected</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setUploadOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">Upload & Scan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
