"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    FileText,
    GitPullRequest,
    BarChart2,
    Settings
} from "lucide-react";

export function Sidebar() {
    const pathname = usePathname();

    const links = [
        { name: "Leads", path: "/", icon: LayoutDashboard },
        { name: "Transcripts", path: "/transcripts", icon: MessageSquare },
        { name: "Clients", path: "/clients", icon: Users },
        { name: "Templates", path: "/templates", icon: FileText },
        { name: "Workflows", path: "/workflows", icon: GitPullRequest },
        { name: "Analytics", path: "/analytics", icon: BarChart2 },
        { name: "Settings", path: "/settings", icon: Settings },
    ];

    return (
        <aside className="w-64 shrink-0 flex flex-col border-r border-zinc-800/60 bg-[#0c0c0c] z-10 transition-all duration-300">
            <div className="flex items-center gap-3 px-6 h-20 shrink-0">
                <div className="h-8 w-8 bg-zinc-800 rounded-md flex items-center justify-center shrink-0 border border-zinc-700/50">
                    <span className="text-xs text-zinc-500">Logo</span>
                </div>
                <span className="font-semibold text-lg text-white">Company HQ</span>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-4 relative">
                {links.map((link) => {
                    const isActive = pathname === link.path || (link.path !== '/' && pathname?.startsWith(link.path));
                    const Icon = link.icon;
                    return (
                        <Link key={link.name} href={link.path}>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={`w-full justify-start h-10 px-4 transition-all duration-200 ${isActive
                                        ? "bg-zinc-800/80 hover:bg-zinc-800 text-white font-medium"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                                    }`}
                            >
                                <Icon className={`mr-3 h-4 w-4 ${isActive ? "text-indigo-400" : ""}`} />
                                {link.name}
                            </Button>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/40 m-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                    <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">System Live</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-sm font-medium border border-rose-500/30">
                        N
                    </div>
                    <p className="text-xs text-zinc-400 leading-tight">Gen SDR Automation active.</p>
                </div>
            </div>
        </aside>
    );
}
