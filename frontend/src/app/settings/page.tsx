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
    ChevronUp,
    ChevronRight,
    Layers,
    Edit2,
    Briefcase,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

interface SubService {
    id: string;
    name: string;
    code: string;
}

interface Service {
    id: string;
    name: string;
    code: string;
    subServices: SubService[];
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
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");

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

    // ─── Services & Sub Services State ───
    const [services, setServices] = useState<Service[]>([]);
    const [newServiceName, setNewServiceName] = useState("");
    const [newServiceCode, setNewServiceCode] = useState("");
    const [serviceError, setServiceError] = useState("");
    const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
    const [newSubServiceName, setNewSubServiceName] = useState<Record<string, string>>({});
    const [newSubServiceCode, setNewSubServiceCode] = useState<Record<string, string>>({});
    const [editingService, setEditingService] = useState<string | null>(null);
    const [editingServiceName, setEditingServiceName] = useState("");
    const [servicesTab, setServicesTab] = useState<"services" | "subservices" | "codes">("services");
    const [newSubParentId, setNewSubParentId] = useState("");
    const [newSubNameFlat, setNewSubNameFlat] = useState("");
    const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
    const [editingCodeValue, setEditingCodeValue] = useState("");

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

    // Load settings from the backend on mount
    useEffect(() => {
        fetch(`${API}/api/v1/settings`)
            .then(r => r.json())
            .then((data: Record<string, any>) => {
                if (data.mom_prompt) setMomPrompt(data.mom_prompt);
                if (data.mom_format) setMomFormat(data.mom_format);
                if (data.max_mom_length) setMaxMomLength(data.max_mom_length);
                if (data.action_item_format) setActionItemFormat(data.action_item_format);
                if (data.max_action_items) setMaxActionItems(data.max_action_items);
                if (data.hot_keywords) setHotKeywords(data.hot_keywords);
                if (data.warm_keywords) setWarmKeywords(data.warm_keywords);
                if (data.cold_keywords) setColdKeywords(data.cold_keywords);
                if (data.finance_threshold) setFinanceThreshold(data.finance_threshold);
                if (data.email_subject_template) setEmailSubjectTemplate(data.email_subject_template);
                if (data.email_body_template) setEmailBodyTemplate(data.email_body_template);
                if (data.custom_fields) setCustomFields(data.custom_fields);
                if (data.services) setServices(data.services);
            })
            .catch(() => setLoadError("Could not load settings from backend."));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/v1/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mom_prompt: momPrompt,
                    mom_format: momFormat,
                    max_mom_length: maxMomLength,
                    action_item_format: actionItemFormat,
                    max_action_items: maxActionItems,
                    hot_keywords: hotKeywords,
                    warm_keywords: warmKeywords,
                    cold_keywords: coldKeywords,
                    finance_threshold: financeThreshold,
                    email_subject_template: emailSubjectTemplate,
                    email_body_template: emailBodyTemplate,
                    custom_fields: customFields,
                    services: services,
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            alert("Failed to save settings. Is the backend running?");
        } finally {
            setSaving(false);
        }
    };

    const [sectionSaved, setSectionSaved] = useState<string | null>(null);
    const handleSaveSection = async (key: string, value: unknown) => {
        try {
            const res = await fetch(`${API}/api/v1/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value }),
            });
            if (!res.ok) throw new Error("Save failed");
            setSectionSaved(key);
            setTimeout(() => setSectionSaved(null), 2000);
        } catch {
            alert("Failed to save. Is the backend running?");
        }
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
                        {customFields.length > 0 && (
                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-800/60">
                                <Button
                                    onClick={() => handleSaveSection("custom_fields", customFields)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold h-9 px-5"
                                >
                                    <Save className="w-3.5 h-3.5 mr-2" />Save Custom Fields
                                </Button>
                                {sectionSaved === "custom_fields" && (
                                    <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Saved to database</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ─── Services & Sub Services ─── */}
                    <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-1 flex items-center">
                            <Briefcase className="w-4 h-4 mr-2 text-emerald-400" />Services & Sub Services
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4">Define your service offerings, sub-services, and service codes separately.</p>

                        {/* Tab Switcher */}
                        <div className="flex gap-1 mb-5 p-1 bg-zinc-900/60 rounded-lg border border-zinc-800/60 w-fit">
                            {(["services", "subservices", "codes"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => { setServicesTab(tab); setServiceError(""); }}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${servicesTab === tab ? "bg-emerald-600 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
                                >
                                    {tab === "services" ? "Services" : tab === "subservices" ? "Sub Services" : "Service Codes"}
                                </button>
                            ))}
                        </div>

                        {serviceError && (
                            <p className="text-xs text-rose-400 mb-3 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-rose-400 inline-block" />{serviceError}
                            </p>
                        )}

                        {/* ── Tab 1: Services ── */}
                        {servicesTab === "services" && (
                            <div>
                                <div className="flex gap-3 mb-4">
                                    <div className="flex-1">
                                        <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">Service Name</Label>
                                        <Input
                                            placeholder="e.g. IT Staffing"
                                            value={newServiceName}
                                            onChange={(e) => { setNewServiceName(e.target.value); setServiceError(""); }}
                                            className="bg-zinc-900 border-zinc-700 text-white text-sm"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            onClick={() => {
                                                if (!newServiceName.trim()) { setServiceError("Service name is required."); return; }
                                                if (services.some(s => s.name.toLowerCase() === newServiceName.trim().toLowerCase())) {
                                                    setServiceError("Service already exists."); return;
                                                }
                                                const newSvc: Service = { id: `svc_${Date.now()}`, name: newServiceName.trim(), code: "", subServices: [] };
                                                setServices(prev => [...prev, newSvc]);
                                                setNewServiceName("");
                                                setServiceError("");
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold h-9 px-4"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1.5" />Add Service
                                        </Button>
                                    </div>
                                </div>

                                {services.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 border border-dashed border-zinc-800 rounded-xl text-center">
                                        <Briefcase className="w-8 h-8 text-zinc-700 mb-3" />
                                        <p className="text-sm text-zinc-600 font-medium">No services defined yet</p>
                                        <p className="text-xs text-zinc-700 mt-1">Add a service using the form above.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="grid grid-cols-12 px-3 py-2 text-[10px] uppercase font-bold text-zinc-600 tracking-wider border-b border-zinc-800/60">
                                            <div className="col-span-9">Service Name</div>
                                            <div className="col-span-2 text-center">Sub-services</div>
                                            <div className="col-span-1 flex justify-end">Del</div>
                                        </div>
                                        {services.map((svc) => (
                                            <div key={svc.id} className="grid grid-cols-12 px-3 py-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/40 items-center hover:bg-zinc-900/60 transition-colors">
                                                <div className="col-span-9 flex items-center gap-2">
                                                    {editingService === svc.id ? (
                                                        <input
                                                            autoFocus
                                                            value={editingServiceName}
                                                            onChange={(e) => setEditingServiceName(e.target.value)}
                                                            onBlur={() => {
                                                                if (editingServiceName.trim()) setServices(prev => prev.map(s => s.id === svc.id ? { ...s, name: editingServiceName.trim() } : s));
                                                                setEditingService(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") { if (editingServiceName.trim()) setServices(prev => prev.map(s => s.id === svc.id ? { ...s, name: editingServiceName.trim() } : s)); setEditingService(null); }
                                                                if (e.key === "Escape") setEditingService(null);
                                                            }}
                                                            className="bg-transparent border-b border-indigo-500 outline-none text-white text-sm font-semibold flex-1"
                                                        />
                                                    ) : (
                                                        <span className="text-[13px] font-semibold text-white">{svc.name}</span>
                                                    )}
                                                    <button
                                                        onClick={() => { setEditingService(svc.id); setEditingServiceName(svc.name); }}
                                                        className="p-1 rounded text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <span className="text-[11px] text-zinc-500 font-medium">{svc.subServices.length}</span>
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button
                                                        onClick={() => setServices(prev => prev.filter(s => s.id !== svc.id))}
                                                        className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab 2: Sub Services ── */}
                        {servicesTab === "subservices" && (
                            <div>
                                {services.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 border border-dashed border-zinc-800 rounded-xl text-center">
                                        <Briefcase className="w-8 h-8 text-zinc-700 mb-3" />
                                        <p className="text-sm text-zinc-600 font-medium">No services defined yet</p>
                                        <p className="text-xs text-zinc-700 mt-1">Add services first before adding sub-services.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex gap-3 mb-4">
                                            <div className="w-44">
                                                <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">Parent Service</Label>
                                                <SelectDropdown
                                                    value={services.find(s => s.id === newSubParentId)?.name || ""}
                                                    options={services.map(s => s.name)}
                                                    onChange={(v) => { const s = services.find(sv => sv.name === v); setNewSubParentId(s?.id || ""); setServiceError(""); }}
                                                    placeholder="Select service…"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1.5 block">Sub-service Name</Label>
                                                <Input
                                                    placeholder="e.g. Contract Staffing"
                                                    value={newSubNameFlat}
                                                    onChange={(e) => { setNewSubNameFlat(e.target.value); setServiceError(""); }}
                                                    className="bg-zinc-900 border-zinc-700 text-white text-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            if (!newSubParentId) { setServiceError("Select a parent service."); return; }
                                                            const name = newSubNameFlat.trim();
                                                            if (!name) { setServiceError("Sub-service name is required."); return; }
                                                            setServices(prev => prev.map(s => s.id === newSubParentId ? { ...s, subServices: [...s.subServices, { id: `ss_${Date.now()}`, name, code: "" }] } : s));
                                                            setNewSubNameFlat("");
                                                            setServiceError("");
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    onClick={() => {
                                                        if (!newSubParentId) { setServiceError("Select a parent service."); return; }
                                                        const name = newSubNameFlat.trim();
                                                        if (!name) { setServiceError("Sub-service name is required."); return; }
                                                        setServices(prev => prev.map(s => s.id === newSubParentId ? { ...s, subServices: [...s.subServices, { id: `ss_${Date.now()}`, name, code: "" }] } : s));
                                                        setNewSubNameFlat("");
                                                        setServiceError("");
                                                    }}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold h-9 px-4"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add
                                                </Button>
                                            </div>
                                        </div>

                                        {services.every(s => s.subServices.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center py-8 border border-dashed border-zinc-800 rounded-xl text-center">
                                                <Tag className="w-8 h-8 text-zinc-700 mb-3" />
                                                <p className="text-sm text-zinc-600 font-medium">No sub-services yet</p>
                                                <p className="text-xs text-zinc-700 mt-1">Add sub-services using the form above.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <div className="grid grid-cols-12 px-3 py-2 text-[10px] uppercase font-bold text-zinc-600 tracking-wider border-b border-zinc-800/60">
                                                    <div className="col-span-6">Sub-service Name</div>
                                                    <div className="col-span-5">Parent Service</div>
                                                    <div className="col-span-1 flex justify-end">Del</div>
                                                </div>
                                                {services.flatMap(svc => svc.subServices.map(sub => ({ svc, sub }))).map(({ svc, sub }) => (
                                                    <div key={sub.id} className="grid grid-cols-12 px-3 py-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/40 items-center hover:bg-zinc-900/60 transition-colors">
                                                        <div className="col-span-6">
                                                            <span className="text-[12px] text-zinc-300 flex items-center gap-1.5">
                                                                <Tag className="w-3 h-3 text-zinc-600 shrink-0" />{sub.name}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-5">
                                                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">{svc.name}</span>
                                                        </div>
                                                        <div className="col-span-1 flex justify-end">
                                                            <button
                                                                onClick={() => setServices(prev => prev.map(s => s.id === svc.id ? { ...s, subServices: s.subServices.filter(ss => ss.id !== sub.id) } : s))}
                                                                className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab 3: Service Codes ── */}
                        {servicesTab === "codes" && (
                            <div>
                                {services.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 border border-dashed border-zinc-800 rounded-xl text-center">
                                        <Code className="w-8 h-8 text-zinc-700 mb-3" />
                                        <p className="text-sm text-zinc-600 font-medium">No services defined yet</p>
                                        <p className="text-xs text-zinc-700 mt-1">Add services first to assign codes.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] text-zinc-600 mb-3">Click a code cell to edit inline. Press Enter or click away to save.</p>
                                        <div className="grid grid-cols-12 px-3 py-2 text-[10px] uppercase font-bold text-zinc-600 tracking-wider border-b border-zinc-800/60">
                                            <div className="col-span-2">Type</div>
                                            <div className="col-span-6">Name</div>
                                            <div className="col-span-4">Code</div>
                                        </div>
                                        {services.flatMap(svc => [
                                            { id: `svc_${svc.id}`, type: "Service" as const, name: svc.name, parentName: null, svcId: svc.id, subId: null as string | null },
                                            ...svc.subServices.map(sub => ({ id: `ss_${sub.id}`, type: "Sub-service" as const, name: sub.name, parentName: svc.name, svcId: svc.id, subId: sub.id })),
                                        ]).map((row) => {
                                            const currentCode = row.subId
                                                ? services.find(s => s.id === row.svcId)?.subServices.find(ss => ss.id === row.subId)?.code || ""
                                                : services.find(s => s.id === row.svcId)?.code || "";
                                            const isEditing = editingCodeId === row.id;
                                            return (
                                                <div key={row.id} className="grid grid-cols-12 px-3 py-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/40 items-center hover:bg-zinc-900/60 transition-colors">
                                                    <div className="col-span-2">
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${row.type === "Service" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-zinc-800 text-zinc-500 border border-zinc-700"}`}>
                                                            {row.type === "Service" ? "Svc" : "Sub"}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-6">
                                                        <p className="text-[12px] text-white font-medium">{row.name}</p>
                                                        {row.parentName && <p className="text-[10px] text-zinc-600">{row.parentName}</p>}
                                                    </div>
                                                    <div className="col-span-4">
                                                        {isEditing ? (
                                                            <input
                                                                autoFocus
                                                                value={editingCodeValue}
                                                                onChange={(e) => setEditingCodeValue(e.target.value)}
                                                                onBlur={() => {
                                                                    if (row.subId) {
                                                                        setServices(prev => prev.map(s => s.id === row.svcId ? { ...s, subServices: s.subServices.map(ss => ss.id === row.subId ? { ...ss, code: editingCodeValue.trim() } : ss) } : s));
                                                                    } else {
                                                                        setServices(prev => prev.map(s => s.id === row.svcId ? { ...s, code: editingCodeValue.trim() } : s));
                                                                    }
                                                                    setEditingCodeId(null);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter" || e.key === "Escape") {
                                                                        if (e.key === "Enter") {
                                                                            if (row.subId) {
                                                                                setServices(prev => prev.map(s => s.id === row.svcId ? { ...s, subServices: s.subServices.map(ss => ss.id === row.subId ? { ...ss, code: editingCodeValue.trim() } : ss) } : s));
                                                                            } else {
                                                                                setServices(prev => prev.map(s => s.id === row.svcId ? { ...s, code: editingCodeValue.trim() } : s));
                                                                            }
                                                                        }
                                                                        setEditingCodeId(null);
                                                                    }
                                                                }}
                                                                className="bg-zinc-800 border border-indigo-500 outline-none text-white text-xs font-mono px-2 py-1 rounded w-full"
                                                                placeholder="e.g. ITS-001"
                                                            />
                                                        ) : (
                                                            <button
                                                                onClick={() => { setEditingCodeId(row.id); setEditingCodeValue(currentCode); }}
                                                                className="text-left w-full group"
                                                            >
                                                                {currentCode ? (
                                                                    <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 group-hover:border-indigo-500/50 transition-colors">{currentCode}</span>
                                                                ) : (
                                                                    <span className="text-[11px] text-zinc-700 italic group-hover:text-zinc-500 transition-colors">+ Add code</span>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* ── Save Services Button ── */}
                        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-800/60">
                            <Button
                                onClick={() => handleSaveSection("services", services)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold h-9 px-5"
                            >
                                <Save className="w-3.5 h-3.5 mr-2" />Save Services
                            </Button>
                            {sectionSaved === "services" && (
                                <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Saved to database</span>
                            )}
                        </div>
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
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 h-11" onClick={handleSave} disabled={saving}>
                            <Save className="w-4 h-4 mr-2" />{saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
                        </Button>
                        {saved && (
                            <span className="text-emerald-400 text-sm flex items-center gap-1 animate-pulse"><CheckCircle2 className="w-4 h-4" />Settings saved to database</span>
                        )}
                        {loadError && <span className="text-amber-400 text-xs">{loadError}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
