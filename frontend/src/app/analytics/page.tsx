"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    BarChart2,
    TrendingUp,
    TrendingDown,
    Users,
    FileText,
    Phone,
    Target,
    Award,
    Zap,
    Clock,
    ThumbsUp,
    MessageSquare,
    ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

const overviewStats = [
    { label: "Total Calls", value: "156", change: "+12%", trend: "up", icon: Phone },
    { label: "Documents Generated", value: "89", change: "+8%", trend: "up", icon: FileText },
    { label: "Conversion Rate", value: "34%", change: "+5%", trend: "up", icon: Target },
    { label: "Avg. Deal Size", value: "₹4,50,000", change: "-2%", trend: "down", icon: TrendingUp },
];

const sdrPerformance = [
    { name: "SDR Agent 1", calls: 42, conversions: 15, avgScore: 8.2, talkRatio: 38, topStrength: "Needs Discovery" },
    { name: "SDR Agent 2", calls: 38, conversions: 12, avgScore: 7.5, talkRatio: 45, topStrength: "Rapport Building" },
    { name: "SDR Agent 3", calls: 31, conversions: 8, avgScore: 6.8, talkRatio: 52, topStrength: "Value Proposition" },
];

const coachingScores = [
    { skill: "Rapport Building", score: 7.8, max: 10 },
    { skill: "Needs Discovery", score: 8.5, max: 10 },
    { skill: "Value Proposition", score: 7.2, max: 10 },
    { skill: "Objection Handling", score: 6.5, max: 10 },
    { skill: "Closing Technique", score: 7.0, max: 10 },
];

const recentHighlights = [
    { type: "positive", text: "Excellent objection handling in Stark Industries call — redirected competitor comparison into feature advantage.", time: "2h ago" },
    { type: "improvement", text: "Talk ratio exceeded 50% in Avengers call — aim for more client-led conversation.", time: "5h ago" },
    { type: "positive", text: "Strong closing technique with Silver Corp — secured commitment for follow-up within 48hrs.", time: "1d ago" },
];

export default function AnalyticsPage() {
    const { getHeaders } = useAuth();
    const [timeRange, setTimeRange] = useState("30d");

    return (
        <div className="flex flex-col h-full w-full">
            <Header title="Performance Analytics" subtitle="SDR scores, talk-ratios, coaching insights, and conversion metrics." badgeText="Live" />

            <div className="flex-1 p-8 pt-6 overflow-y-auto">
                {/* Time Range Filter */}
                <div className="flex gap-2 mb-6">
                    {[{ key: "7d", label: "7 Days" }, { key: "30d", label: "30 Days" }, { key: "90d", label: "90 Days" }, { key: "all", label: "All Time" }].map(({ key, label }) => (
                        <Button
                            key={key}
                            variant={timeRange === key ? "secondary" : "outline"}
                            size="sm"
                            className={`text-xs ${timeRange === key ? "bg-zinc-800 text-white" : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
                            onClick={() => setTimeRange(key)}
                        >
                            {label}
                        </Button>
                    ))}
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {overviewStats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className="p-5 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                        <Icon className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-semibold ${stat.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
                                        {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {stat.change}
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-5 gap-6">
                    {/* SDR Leaderboard */}
                    <div className="col-span-3 p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-4 flex items-center">
                            <Award className="w-4 h-4 mr-2 text-amber-400" />SDR Leaderboard
                        </h3>
                        <div className="space-y-3">
                            {sdrPerformance.map((sdr, i) => (
                                <div key={sdr.name} className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-sm font-medium text-white">{sdr.name}</p>
                                            <span className="text-xs text-zinc-400">{sdr.calls} calls · {sdr.conversions} closed</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <Progress value={sdr.avgScore * 10} className="h-1.5 bg-zinc-800 [&>div]:bg-indigo-500" />
                                            </div>
                                            <span className="text-sm font-bold text-indigo-400 w-10">{sdr.avgScore}</span>
                                            <Badge className="text-[9px] bg-zinc-800 text-zinc-400 border-zinc-700 shadow-none border">{sdr.talkRatio}% talk</Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coaching Scores */}
                    <div className="col-span-2 p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                        <h3 className="text-[15px] font-semibold text-white mb-4 flex items-center">
                            <Zap className="w-4 h-4 mr-2 text-indigo-400" />Coaching Scores
                        </h3>
                        <div className="space-y-4">
                            {coachingScores.map((skill) => (
                                <div key={skill.skill}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-zinc-400">{skill.skill}</span>
                                        <span className="text-xs font-bold text-white">{skill.score}/{skill.max}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${skill.score >= 8 ? "bg-emerald-500" : skill.score >= 7 ? "bg-indigo-500" : "bg-amber-500"}`}
                                            style={{ width: `${(skill.score / skill.max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coaching Highlights */}
                <div className="mt-6 p-6 rounded-xl border border-zinc-800/60 bg-[#0c0c0c] shadow-lg">
                    <h3 className="text-[15px] font-semibold text-white mb-4 flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-indigo-400" />Coaching Highlights
                    </h3>
                    <div className="space-y-3">
                        {recentHighlights.map((h, i) => (
                            <div key={i} className={`p-4 rounded-lg border ${h.type === "positive" ? "border-emerald-900/30 bg-emerald-950/10" : "border-amber-900/30 bg-amber-950/10"}`}>
                                <div className="flex items-start gap-3">
                                    {h.type === "positive" ? (
                                        <ThumbsUp className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                    ) : (
                                        <ArrowUpRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                    )}
                                    <div>
                                        <p className={`text-sm ${h.type === "positive" ? "text-emerald-300" : "text-amber-300"}`}>{h.text}</p>
                                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{h.time}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
