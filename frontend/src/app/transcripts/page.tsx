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
import { Textarea } from "@/components/ui/textarea";
import {
    MessageSquare,
    FileUp,
    Upload,
    Clock,
    UserCircle,
    Sparkles,
    CheckCircle2,
    BarChart2,
    Send,
    Bot,
    User,
    ChevronDown,
    ChevronUp,
    Mic,
    RefreshCw,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Map a lead record (from /api/v1/transcripts) to the Transcript interface
function apiToTranscript(l: any): Transcript {
    const temp = l.lead_status === "HOT" ? "HOT" : l.lead_status === "COLD" ? "COLD" : "WARM";
    const actionLines: string[] = (l.action_items_text || "")
        .split("\n")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    const dateStr = l.last_contact || l.updated_at;
    const date = dateStr
        ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "Unknown";
    return {
        id: String(l.id),
        leadName: l.leadName || "(No name)",
        company: l.company || "",
        date,
        duration: "—",
        status: "processed",
        talkRatio: 0,
        temperature: temp as "HOT" | "WARM" | "COLD",
        summary: l.summary_text || "",
        actionItemsCount: actionLines.length,
        actionItems: actionLines.map((line: string) => ({
            task: line.replace(/^[-•*\d.]+\s*/, ""),
            assignee: "—",
            dueDate: "TBD",
        })),
        speakers: [],
        fullText: l.transcript_text || "",
    };
}

interface Transcript {
    id: string;
    leadName: string;
    company: string;
    date: string;
    duration: string;
    status: "processed" | "pending" | "uploaded";
    talkRatio: number;
    temperature: "HOT" | "WARM" | "COLD";
    summary: string;
    actionItemsCount: number;
    actionItems: { task: string; assignee: string; dueDate: string }[];
    speakers: { name: string; role: string; wordCount: number }[];
    fullText: string; // simulated transcript text
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    sources?: string[]; // which section the answer was drawn from
}

const mockTranscripts: Transcript[] = [
    {
        id: "t1",
        leadName: "Kristen Hayer",
        company: "Stark Industries",
        date: "Mar 4, 2026",
        duration: "45 min",
        status: "processed",
        talkRatio: 38,
        temperature: "HOT",
        summary: "Discussed enterprise licensing model, integration with existing CRM systems, and timeline for pilot deployment. Client expressed strong interest in the AI-powered analytics module. Pricing was discussed for 500+ seat deployment. Follow-up scheduled for contract review.",
        actionItemsCount: 5,
        actionItems: [
            { task: "Send pilot deployment timeline", assignee: "SDR Team", dueDate: "Mar 6" },
            { task: "Prepare custom enterprise pricing quotation", assignee: "Finance Dept", dueDate: "Mar 7" },
            { task: "Review CRM integration documentation", assignee: "Engineering", dueDate: "Mar 10" },
            { task: "Draft NDA for technical discovery", assignee: "Legal Dept", dueDate: "Mar 6" },
            { task: "Schedule second demo for internal stakeholders", assignee: "SDR Team", dueDate: "Mar 12" },
        ],
        speakers: [
            { name: "SDR Agent", role: "SDR", wordCount: 3200 },
            { name: "Kristen Hayer", role: "CLIENT", wordCount: 5100 },
        ],
        fullText: `SDR Agent: Good afternoon Kristen, thanks for joining today's call. We're excited to walk you through our platform.

Kristen Hayer: Thanks! I've been looking forward to this. We've been evaluating a few solutions for our enterprise CRM integration.

SDR Agent: Perfect. Let me start with the core analytics module — this is the AI-powered component that most of our enterprise clients find most valuable.

Kristen Hayer: Yes, I saw that in your brochure. Can this integrate with Salesforce? That's our current CRM.

SDR Agent: Absolutely — we have a native Salesforce connector. Setup typically takes under 48 hours for most deployments.

Kristen Hayer: That's impressive. What's the pricing structure for, say, 500+ seats?

SDR Agent: For that scale, we work on an enterprise licensing model. I'll have Finance send over a custom quotation, but roughly you're looking at a significant volume discount.

Kristen Hayer: Okay, that works. I'll need an NDA signed before we share more technical details on our end.

SDR Agent: Of course, our Legal team will draft that today. Can we schedule a follow-up with your internal stakeholders?

Kristen Hayer: Yes, let's do that in about a week. I want to bring in our CTO for the technical deep-dive.

SDR Agent: Great. I'll send over a pilot deployment timeline and the quotation by Thursday and we can review the contract next week.`,
    },
    {
        id: "t2",
        leadName: "Tony Stark",
        company: "Avengers Initiative",
        date: "Mar 3, 2026",
        duration: "30 min",
        status: "processed",
        talkRatio: 55,
        temperature: "WARM",
        summary: "Initial discovery call. Explored security requirements and compliance needs. Client mentioned competing solutions from Paladin Systems. Need to prepare custom security whitepaper.",
        actionItemsCount: 3,
        actionItems: [
            { task: "Send security whitepaper", assignee: "SDR Team", dueDate: "Mar 5" },
            { task: "Check compliance certificates", assignee: "Legal Dept", dueDate: "Mar 8" },
            { task: "Follow up via email regarding SOC2 report", assignee: "SDR Team", dueDate: "Mar 6" },
        ],
        speakers: [
            { name: "SDR Agent", role: "SDR", wordCount: 4100 },
            { name: "Tony Stark", role: "CLIENT", wordCount: 3300 },
        ],
        fullText: `SDR Agent: Tony, thanks for taking the time. Quick discovery call today — we want to understand your security posture.

Tony Stark: Sure. Security is non-negotiable for us. What certifications does your platform have?

SDR Agent: We're SOC2 Type II certified and GDPR compliant. We can share the full audit report.

Tony Stark: Good. We've been talking to Paladin Systems as well. They offered a competitive price but I'm not sold on their compliance track record.

SDR Agent: Understood — our compliance is fully auditable and we can provide references from clients in regulated industries.

Tony Stark: That would help. Also, I need a custom security whitepaper for our internal review board.

SDR Agent: We'll prepare one tailored to your requirements. What specific frameworks are you evaluating against?

Tony Stark: ISO 27001 and NIST. And we'll need your SOC2 report before we can move to the next stage.`,
    },
    {
        id: "t3",
        leadName: "Pepper Potts",
        company: "Stark Industries",
        date: "Mar 2, 2026",
        duration: "25 min",
        status: "pending",
        talkRatio: 0,
        temperature: "WARM",
        summary: "",
        actionItemsCount: 0,
        actionItems: [],
        speakers: [],
        fullText: "",
    },
];

// ─── AI chat is now powered by Gemini via /api/v1/leads/{id}/chat (streaming SSE) ───
// The mock generateAIResponse function has been removed.

export default function TranscriptsPage() {
    const { getHeaders } = useAuth();
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [selected, setSelected] = useState<Transcript | null>(null);
    const [loadingTranscripts, setLoadingTranscripts] = useState(true);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [actionItemsOpen, setActionItemsOpen] = useState(false);

    // Load transcripts from database on mount
    const loadTranscripts = async () => {
        setLoadingTranscripts(true);
        try {
            const res = await fetch(`${API}/api/v1/transcripts`, { headers: getHeaders(false) });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            const mapped: Transcript[] = data.map(apiToTranscript);
            setTranscripts(mapped);
            // Auto-select first if none selected
            if (!selected && mapped.length > 0) setSelected(mapped[0]);
        } catch {
            // Keep empty — backend may not be running
        } finally {
            setLoadingTranscripts(false);
        }
    };

    // Lead list for upload association
    const [leads, setLeads] = useState<{ id: number; name: string; company: string }[]>([]);
    const [uploadLeadId, setUploadLeadId] = useState<number | null>(null);

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatOpen, setChatOpen] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // ─── File Upload State ───
    const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
    const [summaryFile, setSummaryFile] = useState<File | null>(null);
    const [actionItemsFile, setActionItemsFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const transcriptFileRef = useRef<HTMLInputElement>(null);
    const summaryFileRef = useRef<HTMLInputElement>(null);
    const actionItemsFileRef = useRef<HTMLInputElement>(null);

    const resetUploadState = () => {
        setTranscriptFile(null);
        setSummaryFile(null);
        setActionItemsFile(null);
        setUploadError(null);
        setUploadSuccess(false);
        setUploadLeadId(null);
    };

    const handleUploadFiles = async () => {
        if (!transcriptFile && !summaryFile && !actionItemsFile) {
            setUploadError("Please select at least one file to upload.");
            return;
        }
        // Determine which lead to associate with
        const targetLeadId = uploadLeadId ?? (selected ? parseInt(selected.id) : null);
        if (!targetLeadId) {
            setUploadError("Please select a lead to associate this transcript with.");
            return;
        }
        setUploading(true);
        setUploadError(null);
        try {
            const readText = (file: File): Promise<string> =>
                new Promise((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = (e) => res(e.target?.result as string ?? "");
                    reader.onerror = rej;
                    reader.readAsText(file);
                });

            const transcriptText = transcriptFile ? await readText(transcriptFile) : undefined;
            const summaryText = summaryFile ? await readText(summaryFile) : undefined;
            const actionItemsText = actionItemsFile ? await readText(actionItemsFile) : undefined;

            const response = await fetch(`${API}/api/v1/transcripts/upload-text`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    lead_id: targetLeadId,
                    transcript_text: transcriptText,
                    summary_text: summaryText,
                    action_items_text: actionItemsText,
                }),
            });
            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                throw new Error((errJson as { detail?: string }).detail || `Upload failed (${response.status})`);
            }

            setUploadSuccess(true);
            setTimeout(async () => {
                setUploadOpen(false);
                resetUploadState();
                await loadTranscripts();
            }, 1500);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed. Is the backend running?");
        } finally {
            setUploading(false);
        }
    };

    // Load transcripts and leads on mount
    useEffect(() => {
        loadTranscripts();
        fetch(`${API}/api/v1/leads`, { headers: getHeaders(false) })
            .then(r => r.json())
            .then((data: any[]) => setLeads(data.map(l => ({ id: l.id, name: l.name || "(No name)", company: l.company || "" }))))
            .catch(() => { /* ignore */ });
    }, []);

    // Reset chat when transcript changes
    useEffect(() => {
        setChatMessages([]);
        setChatInput("");
    }, [selected?.id]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, isTyping]);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !selected) return;

        const userMsg: ChatMessage = {
            role: "user",
            content: chatInput.trim(),
            timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        };

        const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
        setChatMessages((prev) => [...prev, userMsg]);
        setChatInput("");
        setIsTyping(true);

        // Add empty assistant message that we'll stream into
        const aiMsg: ChatMessage = {
            role: "assistant",
            content: "",
            timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            sources: ["Transcript", "Summary", "Action Items"],
        };
        setChatMessages((prev) => [...prev, aiMsg]);

        try {
            const resp = await fetch(`${API}/api/v1/leads/${selected.id}/chat`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ message: userMsg.content, history }),
            });

            if (!resp.ok || !resp.body) {
                throw new Error(`HTTP ${resp.status}`);
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                const lines = text.split("\n");
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6).trim();
                    if (payload === "[DONE]") break;
                    try {
                        const parsed = JSON.parse(payload);
                        if (parsed.chunk) {
                            setChatMessages((prev) => {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    ...updated[updated.length - 1],
                                    content: updated[updated.length - 1].content + parsed.chunk,
                                };
                                return updated;
                            });
                        }
                    } catch {
                        // ignore malformed chunks
                    }
                }
            }
        } catch (err) {
            setChatMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: `Sorry, I encountered an error while processing your question. Please ensure the backend is running and GEMINI_API_KEY is configured.\n\nError: ${err}`,
                };
                return updated;
            });
        } finally {
            setIsTyping(false);
        }
    };


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const suggestedQuestions = [
        "What was the main discussion?",
        "What did the client say about pricing?",
        "What are the next steps?",
        "Any competition mentioned?",
    ];

    return (
        <div className="flex flex-col h-full w-full">
            <Header title="Transcripts & AI Analysis" subtitle="Post-call intelligence, speaker identification, and coaching insights." badgeText={`${transcripts.length} Calls`} />

            <div className="flex-1 flex gap-6 p-8 pt-6 min-h-0 overflow-hidden">
                {/* ─── Call List ─── */}
                <div className="w-[32%] border border-zinc-800/60 rounded-xl bg-[#0c0c0c] overflow-hidden shadow-2xl flex flex-col h-full">
                    <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Recent Calls</p>
                        <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white h-7 px-2" onClick={loadTranscripts} disabled={loadingTranscripts}>
                                <RefreshCw className={`w-3 h-3 ${loadingTranscripts ? "animate-spin" : ""}`} />
                            </Button>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setUploadOpen(true)}>
                                <Upload className="w-3.5 h-3.5 mr-1.5" />Upload Transcript
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
                        {loadingTranscripts ? (
                            <div className="flex items-center justify-center py-10 text-zinc-500 text-xs gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />Loading transcripts…
                            </div>
                        ) : transcripts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-600 px-4 text-center">
                                <Mic className="w-8 h-8 mb-3" />
                                <p className="text-sm font-medium">No transcripts yet</p>
                                <p className="text-xs mt-1">Upload a transcript file or add transcript text to a lead on the Leads page.</p>
                            </div>
                        ) : (
                            transcripts.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => setSelected(t)}
                                    className={`p-4 cursor-pointer transition-all ${selected?.id === t.id ? "bg-zinc-800/40 border-l-2 border-indigo-500" : "hover:bg-zinc-800/20 border-l-2 border-transparent"}`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{t.leadName}</p>
                                                        <p className="text-xs text-zinc-500">{t.company}</p>
                                                    </div>
                                                    <Badge className={`text-[10px] uppercase tracking-wider rounded-sm px-2 shadow-none border ${t.status === "processed"
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : t.status === "pending"
                                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                        }`}>
                                                        {t.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.date}</span>
                                                    <span>{t.duration}</span>
                                                    {t.actionItemsCount > 0 && <span className="text-indigo-400">{t.actionItemsCount} actions</span>}
                                                </div>
                                            </div>
                                        ))
                                        )}
                    </div>
                </div>

                {/* ─── Right Column: Analysis + Chat ─── */}
                {selected && (
                    <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">

                        {/* Analysis Panels (scrollable) */}
                        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 pr-1 custom-scrollbar min-h-0">
                            {selected.status === "processed" ? (
                                <>
                                    {/* Summary */}
                                    <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
                                        <h3 className="text-[15px] font-semibold text-white mb-3 flex items-center">
                                            <Sparkles className="w-4 h-4 mr-2 text-amber-400" />AI-Enhanced Summary
                                        </h3>
                                        <p className="text-sm text-zinc-300 leading-relaxed">{selected.summary}</p>
                                        <div className="flex gap-3 mt-4">
                                            <Badge className={`text-[10px] uppercase tracking-wider rounded-sm px-2 shadow-none border ${selected.temperature === "HOT" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                                                {selected.temperature}
                                            </Badge>
                                            <button
                                                onClick={() => setActionItemsOpen(true)}
                                                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] rounded-sm px-2 py-0.5 hover:bg-indigo-500/20 transition-all font-semibold uppercase tracking-wider"
                                            >
                                                View {selected.actionItemsCount} Action Items
                                            </button>
                                        </div>
                                    </div>

                                    {/* Talk Ratio */}
                                    <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
                                        <h3 className="text-[15px] font-semibold text-white mb-4 flex items-center">
                                            <BarChart2 className="w-4 h-4 mr-2 text-indigo-400" />Talk Ratio
                                        </h3>
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-indigo-400 font-medium">SDR ({selected.talkRatio}%)</span>
                                                    <span className="text-emerald-400 font-medium">Client ({100 - selected.talkRatio}%)</span>
                                                </div>
                                                <div className="h-3 rounded-full bg-zinc-800 overflow-hidden flex">
                                                    <div className="bg-indigo-500 h-full rounded-l-full transition-all" style={{ width: `${selected.talkRatio}%` }} />
                                                    <div className="bg-emerald-500 h-full rounded-r-full transition-all" style={{ width: `${100 - selected.talkRatio}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        {selected.talkRatio < 45 && (
                                            <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Great listening ratio! Client talked more.</p>
                                        )}
                                        {selected.talkRatio >= 45 && (
                                            <p className="text-xs text-amber-400 flex items-center gap-1">Consider letting the client talk more next time.</p>
                                        )}
                                    </div>

                                    {/* Speakers */}
                                    <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/20 shadow-lg">
                                        <h3 className="text-[15px] font-semibold text-white mb-4 flex items-center">
                                            <UserCircle className="w-4 h-4 mr-2 text-indigo-400" />Identified Speakers
                                        </h3>
                                        <div className="space-y-3">
                                            {selected.speakers.map((s, i) => (
                                                <div key={i} className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${s.role === "SDR" ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"}`}>
                                                            {s.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-zinc-200">{s.name}</p>
                                                            <p className="text-xs text-zinc-500">{s.role}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-zinc-400 font-mono">{s.wordCount.toLocaleString()} words</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center min-h-[200px]">
                                    <div className="text-center">
                                        <FileUp className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                                        <p className="text-zinc-400 mb-2">Transcript not yet processed</p>
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setUploadOpen(true)}>
                                            <Upload className="w-4 h-4 mr-2" />Upload Files to Process
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── Chat with Transcript ─── */}
                        <div className={`rounded-2xl border border-indigo-500/20 bg-[#0d0d14] shadow-2xl flex flex-col transition-all duration-300 ${chatOpen ? "h-[420px]" : "h-[52px]"} shrink-0`}>

                            {/* Chat Header */}
                            <button
                                onClick={() => setChatOpen(!chatOpen)}
                                className="flex items-center justify-between px-5 py-3.5 w-full cursor-pointer group shrink-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                                            <Bot className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-[#0d0d14]" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-white leading-none">Chat with Transcript</p>
                                        <p className="text-[10px] text-indigo-400 font-medium mt-0.5">Ask anything about this call</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {chatMessages.length > 0 && (
                                        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/20 shadow-none border text-[9px]">
                                            {chatMessages.filter(m => m.role === "user").length} Q
                                        </Badge>
                                    )}
                                    {selected.status !== "processed" && (
                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-none border text-[9px]">
                                            Process transcript first
                                        </Badge>
                                    )}
                                    {chatOpen
                                        ? <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                        : <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                    }
                                </div>
                            </button>

                            {/* Chat Body */}
                            {chatOpen && (
                                <div className="flex flex-col flex-1 min-h-0 px-4 pb-4">
                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 custom-scrollbar">
                                        {chatMessages.length === 0 && (
                                            <div className="pt-2">
                                                <p className="text-[11px] text-zinc-600 mb-2.5 uppercase tracking-wider font-semibold">Suggested questions</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {suggestedQuestions.map((q) => (
                                                        <button
                                                            key={q}
                                                            onClick={() => {
                                                                if (selected.status !== "processed") return;
                                                                setChatInput(q);
                                                                inputRef.current?.focus();
                                                            }}
                                                            className="text-left text-[11px] text-zinc-400 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-indigo-500/30 rounded-lg px-3 py-2 transition-all leading-snug disabled:opacity-40"
                                                            disabled={selected.status !== "processed"}
                                                        >
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {chatMessages.map((msg, i) => (
                                            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                                {/* Avatar */}
                                                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user"
                                                    ? "bg-indigo-600/30 border border-indigo-500/30"
                                                    : "bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                                                    }`}>
                                                    {msg.role === "user"
                                                        ? <User className="w-3.5 h-3.5 text-indigo-400" />
                                                        : <Bot className="w-3.5 h-3.5 text-white" />
                                                    }
                                                </div>

                                                {/* Bubble */}
                                                <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                                        ? "bg-indigo-600/20 text-indigo-100 border border-indigo-500/20 rounded-tr-sm"
                                                        : "bg-zinc-800/60 text-zinc-200 border border-zinc-700/40 rounded-tl-sm"
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                    <div className={`flex items-center gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                                        <span className="text-[10px] text-zinc-600">{msg.timestamp}</span>
                                                        {msg.sources && msg.sources.length > 0 && (
                                                            <div className="flex gap-1">
                                                                {msg.sources.map((src) => (
                                                                    <span key={src} className="text-[9px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded font-medium">
                                                                        {src}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Typing indicator */}
                                        {isTyping && (
                                            <div className="flex gap-2.5">
                                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
                                                    <Bot className="w-3.5 h-3.5 text-white" />
                                                </div>
                                                <div className="bg-zinc-800/60 border border-zinc-700/40 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1 relative">
                                            <Textarea
                                                ref={inputRef}
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Ask anything about this call… (Enter to send)"
                                                disabled={isTyping}
                                                rows={1}
                                                className="bg-zinc-900/80 border-zinc-700/60 text-zinc-200 placeholder:text-zinc-600 text-sm resize-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all pr-10 rounded-xl min-h-[40px] max-h-[96px]"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!chatInput.trim() || isTyping}
                                            className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_12px_rgba(99,102,241,0.25)] hover:shadow-[0_0_18px_rgba(99,102,241,0.4)] shrink-0"
                                        >
                                            <Send className="w-4 h-4 text-white" />
                                        </button>
                                        {chatMessages.length > 0 && (
                                            <button
                                                onClick={() => setChatMessages([])}
                                                title="Clear chat"
                                                className="h-10 w-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 flex items-center justify-center transition-all shrink-0"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Items Dialog */}
            <Dialog open={actionItemsOpen} onOpenChange={setActionItemsOpen}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                            Action Items: {selected?.leadName}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">Tasks extracted and assigned during the call.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        {selected?.actionItems.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/50 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-[10px]">{item.dueDate}</Badge>
                                </div>
                                <div className="h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                                    <span className="text-indigo-400 text-xs font-bold">{i + 1}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-zinc-200 mb-1">{item.task}</p>
                                    <div className="flex items-center gap-2">
                                        <UserCircle className="w-3 h-3 text-zinc-500" />
                                        <span className="text-[11px] text-zinc-500">{item.assignee}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setActionItemsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Upload Dialog */}
            <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) resetUploadState(); }}>
                <DialogContent className="bg-[#111] border-zinc-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Upload Call Files</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Upload transcript, summary, and action items. Select a lead to associate with.
                        </DialogDescription>
                    </DialogHeader>

                    {uploadSuccess ? (
                        <div className="py-10 text-center">
                            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3 animate-pulse" />
                            <p className="text-emerald-400 font-semibold">Files uploaded successfully!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Lead Selector */}
                            <div>
                                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-1.5">Associate with Lead</p>
                                <select
                                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm"
                                    value={uploadLeadId ?? (selected ? parseInt(selected.id) : "")}
                                    onChange={(e) => setUploadLeadId(e.target.value ? parseInt(e.target.value) : null)}
                                >
                                    <option value="">— Select a lead —</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}{l.company ? ` (${l.company})` : ""}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Transcript */}
                            <div
                                className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${transcriptFile ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-700 hover:border-indigo-500/50"}`}
                                onClick={() => transcriptFileRef.current?.click()}
                            >
                                {transcriptFile ? (
                                    <p className="text-sm text-emerald-400 flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />{transcriptFile.name}
                                    </p>
                                ) : (
                                    <>
                                        <FileUp className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                                        <p className="text-xs text-zinc-400">Transcript (.txt, .vtt, .json)</p>
                                        <p className="text-[10px] text-zinc-600 mt-0.5">Click to select file</p>
                                    </>
                                )}
                            </div>
                            <input ref={transcriptFileRef} type="file" accept=".txt,.vtt,.json" className="hidden" onChange={(e) => setTranscriptFile(e.target.files?.[0] ?? null)} />

                            {/* Summary */}
                            <div
                                className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${summaryFile ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-700 hover:border-indigo-500/50"}`}
                                onClick={() => summaryFileRef.current?.click()}
                            >
                                {summaryFile ? (
                                    <p className="text-sm text-emerald-400 flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />{summaryFile.name}
                                    </p>
                                ) : (
                                    <>
                                        <FileUp className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                                        <p className="text-xs text-zinc-400">Summary (.txt, .json)</p>
                                        <p className="text-[10px] text-zinc-600 mt-0.5">Click to select file</p>
                                    </>
                                )}
                            </div>
                            <input ref={summaryFileRef} type="file" accept=".txt,.json" className="hidden" onChange={(e) => setSummaryFile(e.target.files?.[0] ?? null)} />

                            {/* Action Items */}
                            <div
                                className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${actionItemsFile ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-700 hover:border-indigo-500/50"}`}
                                onClick={() => actionItemsFileRef.current?.click()}
                            >
                                {actionItemsFile ? (
                                    <p className="text-sm text-emerald-400 flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />{actionItemsFile.name}
                                    </p>
                                ) : (
                                    <>
                                        <FileUp className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                                        <p className="text-xs text-zinc-400">Action Items (.txt, .json)</p>
                                        <p className="text-[10px] text-zinc-600 mt-0.5">Click to select file</p>
                                    </>
                                )}
                            </div>
                            <input ref={actionItemsFileRef} type="file" accept=".txt,.json" className="hidden" onChange={(e) => setActionItemsFile(e.target.files?.[0] ?? null)} />

                            {uploadError && (
                                <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { setUploadOpen(false); resetUploadState(); }}>Cancel</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
                            disabled={uploading || uploadSuccess || (!transcriptFile && !summaryFile && !actionItemsFile)}
                            onClick={handleUploadFiles}
                        >
                            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Process All</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
