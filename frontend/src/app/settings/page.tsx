"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Settings,
    Save,
    Eye,
    RotateCw,
    Sparkles,
    BookOpen,
    FileText,
    ListChecks,
    Gauge,
    Code,
    CheckCircle2,
    Mail,
    Plus,
    Trash2,
    Tag,
    Database,
    ChevronDown,
    Layers,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

// ─── Custom Field Types ───
const dataTypeOptions = [
    "Text",
    "Number",
    "Date",
    "Date & Time",
    "Email",
    "Phone",
    "URL",
    "Boolean (Yes/No)",
    "Currency (INR)",
    "Currency (USD)",
    "Percentage",
    "Dropdown",
    "Multi-Select",
];

const fieldTypeOptions = [
    "Standard Field",
    "Status Field",
    "Sub Status Field",
    "Contact Field",
    "Financial Field",
    "Classification Field",
];

interface CustomField {
    id: string;
    fieldName: string;
    displayLabel: string;
    dataType: string;
    fieldType: string;
}

// ─── Simple Select Dropdown Component ───
function SelectDropdown({ value, options, onChange, placeholder }: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
    placeholder?: string;
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

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-md text-left hover:border-zinc-600 transition-colors"
            >
                <span className={value ? "text-white" : "text-zinc-500"}>{value || placeholder || "Select…"}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0c0c0c]/98 backdrop-blur-2xl border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl py-2 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 origin-top">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => { onChange(opt); setOpen(false); }}
                            className={`block w-full text-left px-4 py-2 text-sm transition-all ${opt === value ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-l-indigo-500" : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SettingsPage() {
    const [saved, setSaved] = useState(false);

    const [momPrompt, setMomPrompt] = useState(
        `You are an AI assistant that generates professional Meeting Minutes (MOM) from sales demo call transcripts.\n\nFormat the MOM with:\n1. Meeting Details (Date, Attendees, Duration)\n2. Executive Summary (2-3 sentences)\n3. Key Discussion Points\n4. Decisions Made\n5. Action Items (with owner and due date)\n6. Next Steps\n\nTone: Professional, concise, action-oriented.\nAvoid filler language. Focus on business outcomes.`
    );

    const [momFormat, setMomFormat] = useState(
        `# Meeting Minutes: {{meeting_title}}\n\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n**Duration:** {{duration}}\n\n## Executive Summary\n{{summary}}\n\n## Key Discussion Points\n{{discussion_points}}\n\n## Action Items\n{{action_items}}\n\n## Next Steps\n{{next_steps}}`
    );

    const [maxMomLength, setMaxMomLength] = useState("2000");
    const [actionItemFormat, setActionItemFormat] = useState("bullets");
    const [maxActionItems, setMaxActionItems] = useState("10");
    const [hotKeywords, setHotKeywords] = useState("ready to buy, sign contract, urgent, immediate, budget approved");
    const [warmKeywords, setWarmKeywords] = useState("interested, considering, evaluating, next quarter, follow up");
    const [coldKeywords, setColdKeywords] = useState("not now, no budget, maybe later, just exploring, no timeline");
    const [financeThreshold, setFinanceThreshold] = useState("50000");

    const [emailSubjectTemplate, setEmailSubjectTemplate] = useState("Follow-up: {{company}} Demo - Minutes & Next Steps");
    const [emailBodyTemplate, setEmailBodyTemplate] = useState(
        `Dear {{name}},\n\nThank you for your time during today's demonstration. Please find attached the meeting minutes, action items, and relevant documents from our discussion.\n\nPlease review and let us know if you have any questions or require any modifications.\n\nLooking forward to the next steps.\n\nBest regards,\nSDR Team`
    );

    // ─── Custom Fields State ───
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [newFieldName, setNewFieldName] = useState("");
    const [newDisplayLabel, setNewDisplayLabel] = useState("");
    const [newDataType, setNewDataType] = useState("");
    const [newFieldType, setNewFieldType] = useState("");
    const [fieldError, setFieldError] = useState("");

    const handleAddField = () => {
        if (!newFieldName.trim()) { setFieldError("Field name is required."); return; }
        if (!newDisplayLabel.trim()) { setFieldError("Display label is required."); return; }
        if (!newDataType) { setFieldError("Data type is required."); return; }
        if (!newFieldType) { setFieldError("Field type is required."); return; }

        // Validate field name: lowercase letters, numbers, underscores only
        if (!/^[a-z0-9_]+$/.test(newFieldName)) {
            setFieldError("Field name: lowercase letters, numbers, underscores only.");
            return;
        }
        if (customFields.some(f => f.fieldName === newFieldName)) {
            setFieldError("Field name already exists.");
            return;
        }

        setCustomFields(prev => [...prev, {
            id: `field_${Date.now()}`,
            fieldName: newFieldName.trim(),
            displayLabel: newDisplayLabel.trim(),
            dataType: newDataType,
            fieldType: newFieldType,
        }]);
        setNewFieldName("");
        setNewDisplayLabel("");
        setNewDataType("");
        setNewFieldType("");
        setFieldError("");
    };

    const handleDeleteField = (id: string) => {
        setCustomFields(prev => prev.filter(f => f.id !== id));
    };

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // Map field type to badge color
    const fieldTypeBadgeColor: Record<string, string> = {
        "Status Field": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        "Sub Status Field": "bg-violet-500/10 text-violet-400 border-violet-500/20",
        "Contact Field": "bg-sky-500/10 text-sky-400 border-sky-500/20",
        "Financial Field": "bg-amber-500/10 text-amber-400 border-amber-500/20",
        "Classification Field": "bg-rose-500/10 text-rose-400 border-rose-500/20",
        "Standard Field": "bg-zinc-800 text-zinc-400 border-zinc-700",
    };

    const dataTypeBadgeColor: Record<string, string> = {
        "Text": "bg-zinc-800 text-zinc-400 border-zinc-700",
        "Number": "bg-teal-500/10 text-teal-400 border-teal-500/20",
        "Date": "bg-blue-500/10 text-blue-400 border-blue-500/20",
        "Date & Time": "bg-blue-500/10 text-blue-400 border-blue-500/20",
        "Email": "bg-sky-500/10 text-sky-400 border-sky-500/20",
        "Phone": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        "URL": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        "Boolean (Yes/No)": "bg-violet-500/10 text-violet-400 border-violet-500/20",
        "Currency (INR)": "bg-amber-500/10 text-amber-400 border-amber-500/20",
        "Currency (USD)": "bg-amber-500/10 text-amber-400 border-amber-500/20",
        "Percentage": "bg-orange-500/10 text-orange-400 border-orange-500/20",
        "Dropdown": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        "Multi-Select": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };

    return (
        <div className="flex flex-col h-full w-full">
            <Header title="Settings & Knowledge Base" subtitle="Configure AI behavior, prompt templates, and automation rules." />

            <div className="flex-1 p-8 pt-6 overflow-y-auto">
                <div className="max-w-4xl space-y-6">

                    {/* ─── Custom Fields ─── */}
                    <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-1 flex items-center">
                            <Database className="w-4 h-4 mr-2 text-indigo-400" />Custom Fields
                        </h3>
                        <p className="text-xs text-zinc-500 mb-5">Define custom data fields for leads. Field type determines where the field appears (Status, Sub Status, Contact, etc.).</p>

                        {/* Add new field form */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">Field Name</Label>
                                <Input
                                    placeholder="e.g. crm_opportunity_id"
                                    value={newFieldName}
                                    onChange={(e) => { setNewFieldName(e.target.value); setFieldError(""); }}
                                    className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm"
                                />
                                <p className="text-[10px] text-zinc-600 mt-1">Lowercase letters, numbers, underscores only.</p>
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">Display Label</Label>
                                <Input
                                    placeholder="e.g. CRM Opportunity ID"
                                    value={newDisplayLabel}
                                    onChange={(e) => { setNewDisplayLabel(e.target.value); setFieldError(""); }}
                                    className="bg-zinc-900 border-zinc-700 text-white text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">Data Type</Label>
                                <SelectDropdown
                                    value={newDataType}
                                    options={dataTypeOptions}
                                    onChange={(v) => { setNewDataType(v); setFieldError(""); }}
                                    placeholder="Select data type…"
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">Field Type</Label>
                                <SelectDropdown
                                    value={newFieldType}
                                    options={fieldTypeOptions}
                                    onChange={(v) => { setNewFieldType(v); setFieldError(""); }}
                                    placeholder="Select field type…"
                                />
                                <p className="text-[10px] text-zinc-600 mt-1">Determines role: Status, Sub Status, Contact, etc.</p>
                            </div>
                        </div>

                        {fieldError && (
                            <p className="text-xs text-rose-400 mb-3 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-rose-400 inline-block" />{fieldError}
                            </p>
                        )}

                        <Button
                            onClick={handleAddField}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 h-9 mb-5"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />Add Field
                        </Button>

                        {/* Custom fields list */}
                        {customFields.length > 0 ? (
                            <div className="space-y-1">
                                {/* Header */}
                                <div className="grid grid-cols-12 px-3 py-2 text-[10px] uppercase font-bold text-zinc-600 tracking-wider border-b border-zinc-800/60">
                                    <div className="col-span-3">Field Name</div>
                                    <div className="col-span-3">Display Label</div>
                                    <div className="col-span-3">Data Type</div>
                                    <div className="col-span-2">Field Type</div>
                                    <div className="col-span-1 flex justify-end">Del</div>
                                </div>
                                {customFields.map((field) => (
                                    <div
                                        key={field.id}
                                        className="grid grid-cols-12 px-3 py-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/40 items-center hover:bg-zinc-900/60 transition-colors"
                                    >
                                        <div className="col-span-3">
                                            <span className="text-[12px] font-mono text-zinc-300">{field.fieldName}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <span className="text-[12px] text-white font-medium">{field.displayLabel}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <Badge className={`text-[10px] border rounded-sm px-2 py-0.5 shadow-none font-semibold ${dataTypeBadgeColor[field.dataType] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                                                {field.dataType}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2">
                                            <Badge className={`text-[10px] border rounded-sm px-2 py-0.5 shadow-none font-semibold ${fieldTypeBadgeColor[field.fieldType] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                                                {field.fieldType}
                                            </Badge>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button
                                                onClick={() => handleDeleteField(field.id)}
                                                className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 border border-dashed border-zinc-800 rounded-xl text-center">
                                <Layers className="w-8 h-8 text-zinc-700 mb-3" />
                                <p className="text-sm text-zinc-600 font-medium">No custom fields yet</p>
                                <p className="text-xs text-zinc-700 mt-1">Add a field using the form above.</p>
                            </div>
                        )}
                    </div>

                    {/* MOM System Prompt */}
                    <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-1 flex items-center">
                            <Sparkles className="w-4 h-4 mr-2 text-amber-400" />MOM System Prompt
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4">Custom instructions sent to GPT-4 for generating meeting minutes.</p>
                        <Textarea
                            rows={8}
                            value={momPrompt}
                            onChange={(e) => setMomPrompt(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-zinc-300 font-mono text-sm"
                        />
                    </div>

                    {/* MOM Format Template */}
                    <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-1 flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-indigo-400" />MOM Format Template
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4">Markdown template for the final MOM output.</p>
                        <Textarea
                            rows={10}
                            value={momFormat}
                            onChange={(e) => setMomFormat(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-zinc-300 font-mono text-sm"
                        />
                        <Button variant="outline" size="sm" className="mt-3 border-zinc-700 text-zinc-400 hover:text-white">
                            <Eye className="w-3.5 h-3.5 mr-1.5" />Preview with Sample Data
                        </Button>
                    </div>

                    {/* AI Generation Rules */}
                    <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-4 flex items-center">
                            <Gauge className="w-4 h-4 mr-2 text-indigo-400" />Generation Settings
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Max MOM Length (words)</Label>
                                <Input value={maxMomLength} onChange={(e) => setMaxMomLength(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Max Action Items</Label>
                                <Input value={maxActionItems} onChange={(e) => setMaxActionItems(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Action Item Format</Label>
                                <div className="flex gap-2 mt-2">
                                    {(["bullets", "numbered", "table"] as const).map((fmt) => (
                                        <Button
                                            key={fmt}
                                            variant={actionItemFormat === fmt ? "secondary" : "outline"}
                                            size="sm"
                                            className={`text-xs capitalize ${actionItemFormat === fmt ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "border-zinc-700 text-zinc-400"}`}
                                            onClick={() => setActionItemFormat(fmt)}
                                        >
                                            {fmt}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Finance Threshold (INR)</Label>
                                <Input value={financeThreshold} onChange={(e) => setFinanceThreshold(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                                <p className="text-xs text-zinc-600 mt-1">Invoices above this trigger Finance Approval</p>
                            </div>
                        </div>
                    </div>

                    {/* Email Format Template */}
                    <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-1 flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-sky-400" />Email Format Template
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4">Default template used for generating follow-up emails.</p>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Default Subject Line</Label>
                                <Input
                                    value={emailSubjectTemplate}
                                    onChange={(e) => setEmailSubjectTemplate(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Default Body Template</Label>
                                <Textarea
                                    rows={8}
                                    value={emailBodyTemplate}
                                    onChange={(e) => setEmailBodyTemplate(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-zinc-300 font-mono text-sm mt-1"
                                    style={{
                                        fontFamily: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif",
                                        fontSize: "11pt",
                                        color: "#1F3864",
                                    }}
                                />
                                <p className="text-[10px] text-zinc-600 mt-2 italic font-mono">Use tags like {"{{name}}"}, {"{{company}}"}, {"{{meeting_date}}"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Lead Classification Keywords */}
                    <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-4 flex items-center">
                            <BookOpen className="w-4 h-4 mr-2 text-indigo-400" />Lead Temperature Keywords
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-rose-400 text-xs uppercase tracking-wider font-bold">🔥 Hot Lead Keywords</Label>
                                <Input value={hotKeywords} onChange={(e) => setHotKeywords(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                            </div>
                            <div>
                                <Label className="text-amber-400 text-xs uppercase tracking-wider font-bold">🌡️ Warm Lead Keywords</Label>
                                <Input value={warmKeywords} onChange={(e) => setWarmKeywords(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                            </div>
                            <div>
                                <Label className="text-sky-400 text-xs uppercase tracking-wider font-bold">❄️ Cold Lead Keywords</Label>
                                <Input value={coldKeywords} onChange={(e) => setColdKeywords(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white mt-1" />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 h-11" onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" />{saved ? "Saved!" : "Save Settings"}
                        </Button>
                        {saved && (
                            <span className="text-emerald-400 text-sm flex items-center gap-1 animate-pulse"><CheckCircle2 className="w-4 h-4" />Settings saved successfully</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
