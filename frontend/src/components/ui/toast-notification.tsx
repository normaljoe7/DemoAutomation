"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastEntry {
    id: string;
    variant: ToastVariant;
    title: string;
    message?: string;
    visible: boolean;
}

// ─── Module-level singleton store (no React Context needed) ──────────────────

let _toasts: ToastEntry[] = [];
const _listeners = new Set<(toasts: ToastEntry[]) => void>();

function _notify() {
    _listeners.forEach((l) => l([..._toasts]));
}

function _dismiss(id: string) {
    // Trigger exit animation
    _toasts = _toasts.map((t) => (t.id === id ? { ...t, visible: false } : t));
    _notify();
    // Remove from DOM after transition completes
    setTimeout(() => {
        _toasts = _toasts.filter((t) => t.id !== id);
        _notify();
    }, 380);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function toast(variant: ToastVariant, title: string, message?: string) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Add with visible:false first, then animate in
    _toasts = [..._toasts, { id, variant, title, message, visible: false }];
    _notify();

    // Trigger entrance animation on next tick
    setTimeout(() => {
        _toasts = _toasts.map((t) => (t.id === id ? { ...t, visible: true } : t));
        _notify();
    }, 16);

    // Auto-dismiss after 4.5s
    setTimeout(() => _dismiss(id), 4500);
}

// ─── Toaster Component (render once in layout) ───────────────────────────────

export function Toaster() {
    const [toastList, setToastList] = useState<ToastEntry[]>([]);

    useEffect(() => {
        const handler = (t: ToastEntry[]) => setToastList(t);
        _listeners.add(handler);
        return () => {
            _listeners.delete(handler);
        };
    }, []);

    if (toastList.length === 0) return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
            aria-live="polite"
            aria-label="Notifications"
        >
            {toastList.map((t) => (
                <ToastItem
                    key={t.id}
                    toast={t}
                    onDismiss={() => _dismiss(t.id)}
                />
            ))}
        </div>
    );
}

// ─── Individual Toast Item ────────────────────────────────────────────────────

const variantConfig: Record<
    ToastVariant,
    { icon: React.ElementType; border: string; iconColor: string; bg: string; progressColor: string }
> = {
    success: {
        icon: CheckCircle2,
        border: "border-emerald-500/30",
        iconColor: "text-emerald-400",
        bg: "bg-[#0d1a12] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(52,211,153,0.12)]",
        progressColor: "bg-emerald-500",
    },
    error: {
        icon: XCircle,
        border: "border-rose-500/30",
        iconColor: "text-rose-400",
        bg: "bg-[#1a0d0d] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(244,63,94,0.12)]",
        progressColor: "bg-rose-500",
    },
    warning: {
        icon: AlertCircle,
        border: "border-amber-500/30",
        iconColor: "text-amber-400",
        bg: "bg-[#1a150d] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(251,191,36,0.12)]",
        progressColor: "bg-amber-500",
    },
    info: {
        icon: Info,
        border: "border-indigo-500/30",
        iconColor: "text-indigo-400",
        bg: "bg-[#0d0f1a] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(99,102,241,0.12)]",
        progressColor: "bg-indigo-500",
    },
};

function ToastItem({
    toast: t,
    onDismiss,
}: {
    toast: ToastEntry;
    onDismiss: () => void;
}) {
    const cfg = variantConfig[t.variant];
    const Icon = cfg.icon;

    return (
        <div
            className={`
                pointer-events-auto
                relative w-[360px] max-w-[calc(100vw-3rem)]
                rounded-xl border
                ${cfg.border} ${cfg.bg}
                overflow-hidden
                transition-all duration-300 ease-out
                ${t.visible
                    ? "opacity-100 translate-x-0 scale-100"
                    : "opacity-0 translate-x-10 scale-95"
                }
            `}
            role="alert"
        >
            {/* Content */}
            <div className="flex items-start gap-3 px-4 pt-4 pb-3.5">
                <div className={`shrink-0 mt-0.5 ${cfg.iconColor}`}>
                    <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white leading-snug">{t.title}</p>
                    {t.message && (
                        <p className="text-[12px] text-zinc-400 mt-0.5 leading-relaxed">{t.message}</p>
                    )}
                </div>
                <button
                    onClick={onDismiss}
                    className="shrink-0 p-0.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-colors mt-0.5"
                    aria-label="Dismiss"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Animated progress bar */}
            <div className="h-[2px] w-full bg-white/5">
                <div
                    className={`h-full ${cfg.progressColor} opacity-70`}
                    style={{
                        animation: "toast-progress 4.5s linear forwards",
                    }}
                />
            </div>

            <style jsx>{`
                @keyframes toast-progress {
                    from { width: 100%; }
                    to   { width: 0%;   }
                }
            `}</style>
        </div>
    );
}
