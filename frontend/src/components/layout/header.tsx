"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ShieldCheck, Bell, CheckCircle2, XCircle, Info, X, BookOpen, Sparkles, Mail, FileText, Save, ChevronRight, Search, UserCheck, LogOut, Megaphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Notification {
    id: number;
    message: string;
    type: "info" | "approved" | "rejected";
    document_id: number | null;
    lead_name: string | null;
    doc_type: string | null;
    is_read: boolean;
    created_at: string;
}

interface HeaderProps {
    title: string;
    subtitle: string;
    badgeText?: string;
}

const KB_SECTIONS = [
    { key: "mom_prompt", label: "MOM System Prompt", icon: Sparkles, color: "text-amber-400", description: "Instructions sent to the AI for generating meeting minutes." },
    { key: "email_body_template", label: "Email Body Template", icon: Mail, color: "text-sky-400", description: "Default template used for follow-up emails." },
    { key: "email_subject_template", label: "Email Subject Line", icon: FileText, color: "text-indigo-400", description: "Default subject line for outbound emails." },
    { key: "hot_keywords", label: "Hot Lead Keywords", icon: FileText, color: "text-rose-400", description: "Keywords that classify a lead as Hot." },
    { key: "warm_keywords", label: "Warm Lead Keywords", icon: FileText, color: "text-amber-400", description: "Keywords that classify a lead as Warm." },
];

export function Header({ title, subtitle, badgeText }: HeaderProps) {
    const pathname = usePathname();
    const { user, logout, getHeaders } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Knowledge Base panel state
    const [kbOpen, setKbOpen] = useState(false);
    const [kbData, setKbData] = useState<Record<string, string>>({});
    const [kbEditing, setKbEditing] = useState<string | null>(null);
    const [kbEditValue, setKbEditValue] = useState("");
    const [kbSaving, setKbSaving] = useState(false);
    const [kbSaved, setKbSaved] = useState(false);
    const [kbSearch, setKbSearch] = useState("");
    const kbRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${API}/api/v1/notifications`, { headers: getHeaders(false) });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch {
            // Backend unreachable — keep existing state
        }
    };

    const fetchKbData = async () => {
        try {
            const res = await fetch(`${API}/api/v1/settings`, { headers: getHeaders(false) });
            if (res.ok) {
                const data = await res.json();
                const mapped: Record<string, string> = {};
                KB_SECTIONS.forEach(s => {
                    if (data[s.key]) mapped[s.key] = typeof data[s.key] === "string" ? data[s.key] : JSON.stringify(data[s.key]);
                });
                setKbData(mapped);
            }
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(interval);
    }, []);

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        if (notifOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [notifOpen]);

    // Close KB panel when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (kbRef.current && !kbRef.current.contains(e.target as Node)) {
                // Only close if not in editing mode
                if (!kbEditing) setKbOpen(false);
            }
        };
        if (kbOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [kbOpen, kbEditing]);

    const handleOpenNotifications = async () => {
        setNotifOpen((prev) => !prev);
        if (!notifOpen && unreadCount > 0) {
            try {
                await fetch(`${API}/api/v1/notifications/mark-all-read`, { method: "POST", headers: getHeaders(false) });
                setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            } catch { /* silent */ }
        }
    };

    const handleOpenKb = () => {
        if (!kbOpen) {
            fetchKbData();
        }
        setKbOpen((prev) => !prev);
        setKbEditing(null);
        setKbSearch("");
    };

    const handleEditSection = (key: string) => {
        setKbEditing(key);
        setKbEditValue(kbData[key] || "");
    };

    const handleSaveSection = async (key: string) => {
        setKbSaving(true);
        try {
            await fetch(`${API}/api/v1/settings`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify({ [key]: kbEditValue }),
            });
            setKbData(prev => ({ ...prev, [key]: kbEditValue }));
            setKbEditing(null);
            setKbSaved(true);
            setTimeout(() => setKbSaved(false), 2000);
        } catch { /* silent */ }
        setKbSaving(false);
    };

    const formatTime = (isoStr: string) => {
        try {
            const d = new Date(isoStr);
            const now = new Date();
            const diff = (now.getTime() - d.getTime()) / 1000;
            if (diff < 60) return "just now";
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } catch { return ""; }
    };

    const filteredSections = kbSearch.trim()
        ? KB_SECTIONS.filter(s =>
            s.label.toLowerCase().includes(kbSearch.toLowerCase()) ||
            (kbData[s.key] || "").toLowerCase().includes(kbSearch.toLowerCase())
        )
        : KB_SECTIONS;

    return (
        <>
            <header className="flex h-20 items-center justify-between px-8 py-0 shrink-0 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-20 border-b border-zinc-900/50">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
                        {badgeText && (
                            <Badge variant="outline" className="text-zinc-400 bg-zinc-900/50 border-zinc-800 uppercase text-[11px] font-bold py-0.5 rounded-md px-2 shadow-sm">
                                {badgeText}
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Notification Bell */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={handleOpenNotifications}
                            className={`relative h-9 w-9 flex items-center justify-center rounded-md border transition-all duration-200 hover:scale-[1.02] active:scale-95 ${notifOpen ? "bg-zinc-800 text-white border-zinc-700" : "bg-[#0c0c0c] text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"}`}
                        >
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>
                        {/* Notifications Dropdown */}
                        {notifOpen && (
                            <div className="absolute right-0 top-full mt-2 w-96 bg-[#0c0c0c] border border-zinc-800 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                                    <p className="text-sm font-bold text-white">Notifications</p>
                                    <button onClick={() => setNotifOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                                            <Bell className="w-8 h-8 mb-2 opacity-30" />
                                            <p className="text-sm">No notifications yet</p>
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div
                                                key={n.id}
                                                className={`flex gap-3 px-4 py-3 border-b border-zinc-900/60 transition-colors ${n.is_read ? "opacity-60" : "bg-zinc-900/30"}`}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {n.type === "approved" ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    ) : n.type === "rejected" ? (
                                                        <XCircle className="w-4 h-4 text-rose-400" />
                                                    ) : (
                                                        <Info className="w-4 h-4 text-indigo-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-zinc-200 leading-relaxed">{n.message}</p>
                                                    <p className="text-[10px] text-zinc-600 mt-1">{formatTime(n.created_at)}</p>
                                                </div>
                                                {!n.is_read && (
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Knowledge Base Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenKb}
                        className={`h-9 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${kbOpen ? "bg-zinc-800 text-white shadow-lg" : "bg-[#0c0c0c] text-zinc-400"}`}
                    >
                        <BookOpen className="mr-2 h-4 w-4 text-zinc-400" />Knowledge Base
                    </Button>

                    {(user?.role === "team_lead" || user?.role === "admin") && (
                    <Link href="/team-lead">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-9 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${pathname === "/team-lead" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-[#0c0c0c] text-zinc-400"}`}
                        >
                            <UserCheck className="mr-2 h-4 w-4" />Team Lead
                        </Button>
                    </Link>
                    )}
                    {(user?.role === "finance" || user?.role === "admin") && (
                    <Link href="/finance">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-9 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${pathname === "/finance" ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]" : "bg-[#0c0c0c] text-zinc-400"}`}
                        >
                            <Wallet className="mr-2 h-4 w-4" />Finance
                        </Button>
                    </Link>
                    )}
                    {(user?.role === "legal" || user?.role === "admin") && (
                    <Link href="/legal">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-9 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${pathname === "/legal" ? "bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]" : "bg-[#0c0c0c] text-zinc-400"}`}
                        >
                            <ShieldCheck className="mr-2 h-4 w-4" />Legal
                        </Button>
                    </Link>
                    )}
                    {(user?.role === "marketing" || user?.role === "admin") && (
                    <Link href="/marketing">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-9 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${pathname === "/marketing" ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)]" : "bg-[#0c0c0c] text-zinc-400"}`}
                        >
                            <Megaphone className="mr-2 h-4 w-4" />Marketing
                        </Button>
                    </Link>
                    )}

                    {/* User profile + logout */}
                    {user && (
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-800/60">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-medium text-white leading-tight">{user.name || user.email.split("@")[0]}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                    user.role === "team_lead" ? "text-indigo-400" :
                                    user.role === "legal" ? "text-violet-400" :
                                    user.role === "finance" ? "text-amber-400" :
                                    user.role === "marketing" ? "text-fuchsia-400" :
                                    user.role === "admin" ? "text-rose-400" :
                                    "text-zinc-500"
                                }`}>{user.role.replace("_", " ")}</span>
                            </div>
                            <button
                                onClick={logout}
                                title="Sign out"
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800/60 hover:border-rose-500/30 transition-all duration-200"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Knowledge Base Slide Panel ── */}
            {kbOpen && (
                <div className="fixed inset-0 z-40 flex justify-end" aria-modal="true">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => { if (!kbEditing) setKbOpen(false); }}
                    />
                    {/* Panel */}
                    <div
                        ref={kbRef}
                        className="relative w-[480px] h-full bg-[#0a0a0a] border-l border-zinc-800/60 shadow-[−20px_0_60px_rgba(0,0,0,0.6)] flex flex-col animate-in slide-in-from-right duration-300"
                    >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Knowledge Base</p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">AI Prompts & Templates</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {kbSaved && (
                                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                                        <CheckCircle2 className="w-3 h-3" />Saved
                                    </span>
                                )}
                                <Link href="/settings">
                                    <button className="text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors flex items-center gap-1 font-medium">
                                        Full Settings <ChevronRight className="w-3 h-3" />
                                    </button>
                                </Link>
                                <button
                                    onClick={() => { setKbOpen(false); setKbEditing(null); }}
                                    className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="px-5 py-3 shrink-0 border-b border-zinc-900/60">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                                <input
                                    type="text"
                                    value={kbSearch}
                                    onChange={e => setKbSearch(e.target.value)}
                                    placeholder="Search knowledge base..."
                                    className="w-full pl-8 pr-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-indigo-500/60 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Sections */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                            {filteredSections.map((section) => {
                                const Icon = section.icon;
                                const value = kbData[section.key] || "";
                                const isEditing = kbEditing === section.key;
                                const PREVIEW_LEN = 120;
                                return (
                                    <div
                                        key={section.key}
                                        className={`rounded-xl border transition-all ${isEditing ? "border-indigo-500/40 bg-indigo-500/5" : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60"}`}
                                    >
                                        {/* Section header */}
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Icon className={`w-3.5 h-3.5 shrink-0 ${section.color}`} />
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-semibold text-white truncate">{section.label}</p>
                                                    <p className="text-[10px] text-zinc-600 leading-tight mt-0.5">{section.description}</p>
                                                </div>
                                            </div>
                                            {!isEditing && (
                                                <button
                                                    onClick={() => handleEditSection(section.key)}
                                                    className="shrink-0 ml-2 text-[10px] font-semibold text-zinc-500 hover:text-indigo-400 px-2 py-1 rounded-md hover:bg-indigo-500/10 transition-all"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>

                                        {/* Content area */}
                                        <div className="px-4 pb-3">
                                            {isEditing ? (
                                                <>
                                                    <textarea
                                                        value={kbEditValue}
                                                        onChange={e => setKbEditValue(e.target.value)}
                                                        rows={8}
                                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-[11px] text-zinc-300 font-mono px-3 py-2.5 outline-none focus:border-indigo-500/60 resize-none transition-colors"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2 mt-2">
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 gap-1.5"
                                                            onClick={() => handleSaveSection(section.key)}
                                                            disabled={kbSaving}
                                                        >
                                                            <Save className="w-3 h-3" />{kbSaving ? "Saving..." : "Save"}
                                                        </Button>
                                                        <button
                                                            onClick={() => setKbEditing(null)}
                                                            className="text-[11px] text-zinc-500 hover:text-white px-2 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </>
                                            ) : value ? (
                                                <p className="text-[11px] text-zinc-500 leading-relaxed font-mono whitespace-pre-wrap">
                                                    {value.length > PREVIEW_LEN ? value.slice(0, PREVIEW_LEN) + "…" : value}
                                                </p>
                                            ) : (
                                                <p className="text-[11px] text-zinc-700 italic">Not configured yet. Click Edit to add.</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredSections.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                                    <BookOpen className="w-8 h-8 mb-2 opacity-30" />
                                    <p className="text-sm">No results for &ldquo;{kbSearch}&rdquo;</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-zinc-900/60 shrink-0">
                            <p className="text-[10px] text-zinc-700 text-center">
                                Knowledge Base is used by the AI to generate smarter documents and emails.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
