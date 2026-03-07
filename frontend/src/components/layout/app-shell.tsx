"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/toast-notification";

// AUTH REMOVED — always renders full shell with sidebar, no login checks.

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#050505]">
                {children}
            </main>
            <Toaster />
        </AuthProvider>
    );
}
