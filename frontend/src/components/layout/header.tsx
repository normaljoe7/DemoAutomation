"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Book, Wallet, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
    title: string;
    subtitle: string;
    badgeText?: string;
}

export function Header({ title, subtitle, badgeText }: HeaderProps) {
    const pathname = usePathname();

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
