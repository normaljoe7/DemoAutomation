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
    FileUp,
    Download,
    Trash2,
    Code,
    FileSpreadsheet,
    ChevronRight,
    Loader2,
    RefreshCw,
    Wand2,
    CheckCircle2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Template {
    name: string;
    type: "docx" | "pptx";
    variables: string[];
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [filter, setFilter] = useState("all");

    // Upload dialog
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate dialog
    const [generateOpen, setGenerateOpen] = useState(false);
    const [generateTemplate, setGenerateTemplate] = useState<Template | null>(null);
    const [generateValues, setGenerateValues] = useState<Record<string, string>>({});
    const [generating, setGenerating] = useState(false);
    const [generatedFile, setGeneratedFile] = useState<string | null>(null);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/v1/templates`);
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            setTemplates(data);
        } catch {
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTemplates(); }, []);

    const categoryOf = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("invoice")) return "invoice";
        if (n.includes("contract")) return "contract";
        if (n.includes("quotation") || n.includes("quote")) return "quotation";
        if (n.includes("mom") || n.includes("meeting")) return "mom";
        if (n.includes("pre_call") || n.includes("precall") || n.includes("deck")) return "pre_call_ppt";
        if (n.includes("sample")) return "sample_list";
        return "other";
    };

    const filteredTemplates = templates.filter((t) => {
        if (filter === "all") return true;
        return categoryOf(t.name) === filter;
    });

    const handleUpload = async () => {
        if (!uploadFile) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", uploadFile);
            const res = await fetch(`${API}/api/v1/templates/upload`, {
                method: "POST",
                body: fd,
            });
            if (!res.ok) throw new Error("Upload failed");
            setUploadSuccess(true);
            setTimeout(() => {
                setUploadOpen(false);
                setUploadFile(null);
                setUploadSuccess(false);
                loadTemplates();
            }, 1200);
        } catch {
            alert("Upload failed. Make sure the backend is running and accepts .docx/.pptx files.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (name: string) => {
        try {
            const res = await fetch(`${API}/api/v1/templates/${encodeURIComponent(name)}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            setDeleteTarget(null);
            if (selectedTemplate?.name === name) setSelectedTemplate(null);
            await loadTemplates();
        } catch {
            alert("Failed to delete template.");
        }
    };

    const openGenerate = (tmpl: Template) => {
        setGenerateTemplate(tmpl);
        const vals: Record<string, string> = {};
        tmpl.variables.forEach(v => { vals[v] = ""; });
        setGenerateValues(vals);
        setGeneratedFile(null);
        setGenerateOpen(true);
    };

    const handleGenerate = async () => {
        if (!generateTemplate) return;
        setGenerating(true);
        try {
            const res = await fetch(`${API}/api/v1/documents/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    template_name: generateTemplate.name,
                    data: generateValues,
                    convert_pdf: false,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Generation failed");
            }
            const result = await res.json();
            setGeneratedFile(result.filename);
        } catch (e: any) {
            alert(`Document generation failed: ${e.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = (filename: string) => {
        window.open(`${API}/api/v1/documents/${encodeURIComponent(filename)}/download`, "_blank");
    };

    return (
        <div className="flex flex-col h-full w-full">
            <Header
                title="Template Engine"
                subtitle="Upload DOCX/PPTX templates with {{variable}} placeholders — powered by Doc Generator v30."
                badgeText={`${templates.length} Templates`}
            />

            <div className="flex-1 flex gap-6 p-8 pt-6 min-h-0 overflow-hidden">
                {/* Template Grid */}
                <div className="flex-1 overflow-y-auto pr-2 pb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex gap-2 flex-wrap">
                            {["all", "invoice", "contract", "quotation", "mom", "pre_call_ppt", "sample_list", "other"].map((cat) => (
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
                        <div className="flex gap-2">
                            <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white" onClick={loadTemplates} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
                            </Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setUploadFile(null); setUploadSuccess(false); setUploadOpen(true); }}>
                                <Plus className="w-4 h-4 mr-2" />Upload Template
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-zinc-500">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading templates...
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
                            <FileUp className="w-10 h-10 mb-3" />
                            <p className="text-sm font-medium">No templates yet</p>
                            <p className="text-xs mt-1">Upload a .docx or .pptx template to get started.</p>
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${selectedTemplate ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>
                            {filteredTemplates.map((tmpl) => (
                                <div
                                    key={tmpl.name}
                                    onClick={() => setSelectedTemplate(tmpl)}
                                    className={`p-5 rounded-xl border cursor-pointer transition-all group shadow-lg ${selectedTemplate?.name === tmpl.name ? "border-indigo-500/60 bg-indigo-500/5" : "border-zinc-800/60 bg-[#0c0c0c] hover:border-zinc-700/80"}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${tmpl.type === "pptx" ? "bg-orange-500/10 border border-orange-500/20" : "bg-indigo-500/10 border border-indigo-500/20"}`}>
                                                {tmpl.type === "pptx"
                                                    ? <FileSpreadsheet className="w-5 h-5 text-orange-400" />
                                                    : <FileText className="w-5 h-5 text-indigo-400" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{tmpl.name}</p>
                                                <p className="text-xs text-zinc-500 capitalize">{categoryOf(tmpl.name).replace(/_/g, " ")}</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] uppercase shadow-none border">{tmpl.type}</Badge>
                                    </div>

                                    {tmpl.variables.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {tmpl.variables.slice(0, 4).map((v) => (
                                                <span key={v} className="text-[10px] bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700/50 font-mono">{`{{${v}}}`}</span>
                                            ))}
                                            {tmpl.variables.length > 4 && (
                                                <span className="text-[10px] bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-700/50">+{tmpl.variables.length - 4} more</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost" size="sm"
                                            className="h-7 text-xs text-zinc-400 hover:text-indigo-400"
                                            onClick={(e) => { e.stopPropagation(); openGenerate(tmpl); }}
                                        >
                                            <Wand2 className="w-3 h-3 mr-1" />Generate
                                        </Button>
                                        <Button
                                            variant="ghost" size="sm"
                                            className="h-7 text-xs text-zinc-400 hover:text-rose-400"
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(tmpl.name); }}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Template Detail Panel */}
                {selectedTemplate && (
                    <div className="w-[320px] shrink-0 border border-zinc-800/60 rounded-xl bg-[#0c0c0c] p-5 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white truncate">{selectedTemplate.name}</h3>
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-white transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Type</p>
                                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 shadow-none border">{selectedTemplate.type.toUpperCase()}</Badge>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Category</p>
                                <p className="text-sm text-zinc-300 capitalize">{categoryOf(selectedTemplate.name).replace(/_/g, " ")}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Variables ({selectedTemplate.variables.length})</p>
                                {selectedTemplate.variables.length === 0
                                    ? <p className="text-xs text-zinc-600">No variables detected.</p>
                                    : (
                                        <div className="space-y-1.5">
                                            {selectedTemplate.variables.map((v) => (
                                                <div key={v} className="flex items-center gap-2 bg-zinc-900/60 p-2 rounded-md border border-zinc-800/50">
                                                    <Code className="w-3 h-3 text-indigo-400" />
                                                    <span className="text-xs font-mono text-zinc-300">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
                                onClick={() => openGenerate(selectedTemplate)}
                            >
                                <Wand2 className="w-4 h-4 mr-2" />Generate Document
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Template Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Upload Template</DialogTitle>
                        <DialogDescription className="text-zinc-400">Upload a DOCX or PPTX file. Variables will be auto-detected from {`{{placeholder}}`} tags.</DialogDescription>
                    </DialogHeader>
                    <div
                        className="p-8 border-2 border-dashed border-zinc-700 rounded-xl text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
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
                                <FileText className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                                <p className="text-sm text-white font-medium">{uploadFile.name}</p>
                                <p className="text-xs text-zinc-500 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB — click to change</p>
                            </>
                        ) : (
                            <>
                                <FileUp className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                <p className="text-sm text-zinc-400">Click to select a .docx or .pptx file</p>
                                <p className="text-xs text-zinc-600 mt-1">Variables will be auto-detected</p>
                            </>
                        )}
                    </div>
                    {uploadSuccess && (
                        <p className="text-emerald-400 text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />Template uploaded successfully!
                        </p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setUploadOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={!uploadFile || uploading}
                            onClick={handleUpload}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileUp className="w-4 h-4 mr-2" />}
                            Upload & Scan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete Template?</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            <span className="font-mono text-zinc-300">{deleteTarget}</span> will be permanently deleted from the server.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate Document Dialog */}
            <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white">Generate Document</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Fill in the variable values for <span className="font-mono text-zinc-300">{generateTemplate?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    {generateTemplate && (
                        <div className="space-y-3 py-2">
                            {generateTemplate.variables.length === 0 ? (
                                <p className="text-zinc-500 text-sm">No variables found — document will be generated as-is.</p>
                            ) : (
                                generateTemplate.variables.map((v) => (
                                    <div key={v}>
                                        <Label className="text-zinc-400 text-xs font-mono">{`{{${v}}}`}</Label>
                                        <Input
                                            className="bg-zinc-900 border-zinc-700 text-white mt-1"
                                            placeholder={`Enter ${v.replace(/_/g, " ")}`}
                                            value={generateValues[v] || ""}
                                            onChange={(e) => setGenerateValues(prev => ({ ...prev, [v]: e.target.value }))}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    {generatedFile && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <div className="flex-1">
                                <p className="text-sm text-emerald-400 font-medium">Document generated!</p>
                                <p className="text-xs text-zinc-400 font-mono">{generatedFile}</p>
                            </div>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleDownload(generatedFile)}>
                                <Download className="w-3 h-3 mr-1" />Download
                            </Button>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setGenerateOpen(false)}>Close</Button>
                        {!generatedFile && (
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700"
                                disabled={generating}
                                onClick={handleGenerate}
                            >
                                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                Generate
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
