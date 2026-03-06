"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Book, Wallet, ShieldCheck, Bell, CheckCircle2, XCircle, Info, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

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

export function Header({ title, subtitle, badgeText }: HeaderProps) {
    const pathname = usePathname();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${API}/api/v1/notifications`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch {
            // Backend unreachable — keep existing state
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        if (notifOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [notifOpen]);

    const handleOpenNotifications = async () => {
        setNotifOpen((prev) => !prev);
        // Mark all unread as read when panel opens
        if (!notifOpen && unreadCount > 0) {
            try {
                await fetch(`${API}/api/v1/notifications/mark-all-read`, { method: "POST" });
                setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            } catch { /* silent */ }
        }
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

    return (
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

                <Link href="/settings">
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-9 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${pathname === "/settings" ? "bg-zinc-800 text-white shadow-lg" : "bg-[#0c0c0c] text-zinc-400"}`}
                    >
                        <Book className="mr-2 h-4 w-4 text-zinc-400" />KB Control
                    </Button>
                </Link>
                <Link href="/finance">
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-9 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${pathname === "/finance" ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]" : "bg-[#0c0c0c] text-zinc-400"}`}
                    >
                        <Wallet className="mr-2 h-4 w-4" />Finance
                    </Button>
                </Link>
                <Link href="/legal">
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-9 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${pathname === "/legal" ? "bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]" : "bg-[#0c0c0c] text-zinc-400"}`}
                    >
                        <ShieldCheck className="mr-2 h-4 w-4" />Legal
                    </Button>
                </Link>
            </div>
        </header>
    );
}
