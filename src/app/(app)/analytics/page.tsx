"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { format, subDays, eachDayOfInterval, isAfter, isBefore, parseISO } from "date-fns";
import {
    CheckCircle2, Timer, Flame, BarChart3, CalendarRange, Brain,
    TrendingUp, TrendingDown, Minus, Target, Trophy,
} from "lucide-react";
import { PageHeader, Card } from "@/components/ui/Layout";
import { ActivityHeatmap } from "@/components/ui/ActivityHeatmap";
import { useAnalyticsData } from "@/hooks/useUserData";

// ── Time range options ───────────────────────────────────────────────────────

const RANGES = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "All", days: 0 },
] as const;

type RangeOption = (typeof RANGES)[number];

const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "insights", label: "Insights", icon: Target },
    { id: "consistency", label: "Consistency", icon: CalendarRange },
    { id: "habits", label: "Mood & Habits", icon: Flame },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 100) : 0; }

function trend(current: number, previous: number): { dir: "up" | "down" | "flat"; pct: number } {
    if (previous === 0 && current === 0) return { dir: "flat", pct: 0 };
    if (previous === 0) return { dir: "up", pct: 100 };
    const diff = Math.round(((current - previous) / previous) * 100);
    return { dir: diff > 0 ? "up" : diff < 0 ? "down" : "flat", pct: Math.abs(diff) };
}

const TrendBadge = ({ dir, pct: p }: { dir: "up" | "down" | "flat"; pct: number }) => {
    const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
    const color = dir === "up" ? "text-emerald-400" : dir === "down" ? "text-red-400" : "text-zinc-500";
    return (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${color}`}>
            <Icon size={12} /> {p > 0 ? `${p}%` : "—"}
        </span>
    );
};

// ── Mini bar chart component ─────────────────────────────────────────────────

function MiniBarChart({ data, color, label }: { data: number[]; color: string; label: string }) {
    const max = Math.max(...data, 1);
    return (
        <div>
            <div className="flex items-end gap-0.75 h-16">
                {data.map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                        <div
                            className="rounded-t-sm w-full transition-all duration-500"
                            style={{
                                height: `${Math.max((v / max) * 100, 6)}%`,
                                background: v > 0 ? color : 'var(--bg-elevated)',
                                border: v > 0 ? 'none' : '1px solid var(--border)',
                                borderBottom: 'none',
                                opacity: v > 0 ? 0.85 : 1,
                            }}
                        />
                    </div>
                ))}
            </div>
            <p className="text-[10px] font-medium mt-1.5 text-center" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        </div>
    );
}

// ── Donut chart component ────────────────────────────────────────────────────

function DonutChart({ segments, size = 80 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return null;
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const visible = segments.filter(s => s.value > 0);
    const offsets = visible.reduce<number[]>((acc, seg, i) => {
        const prev = i === 0 ? 0 : acc[i - 1] + (visible[i - 1].value / total) * circumference;
        acc.push(prev);
        return acc;
    }, []);

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-muted)" strokeWidth={6} />
            {visible.map((seg, i) => {
                const pctVal = seg.value / total;
                const dash = pctVal * circumference;
                const gap = circumference - dash;
                return (
                    <circle
                        key={i}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={6}
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offsets[i]}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                    />
                );
            })}
        </svg>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const { user, tasks, habits, pomodoroSessions, journalEntries, goals } = useAppStore();
    const { loading } = useAnalyticsData();
    const [range, setRange] = useState<RangeOption>(RANGES[1]); // default 30d
    const [activeTab, setActiveTab] = useState<"overview" | "insights" | "consistency" | "habits">("overview");

    // ── Filter data by range ─────────────────────────────────────────────────

    const rangeStart = useMemo(() => range.days > 0 ? subDays(new Date(), range.days) : null, [range]);

    const inRange = useMemo(() => {
        const after = (dateStr: string) => !rangeStart || isAfter(parseISO(dateStr), rangeStart);
        return {
            tasks: range.days === 0 ? tasks : tasks.filter(t => after(t.created_at)),
            completedTasks: tasks.filter(t => t.completed && t.completed_at && (!rangeStart || isAfter(parseISO(t.completed_at), rangeStart))),
            habits,
            pomodoro: range.days === 0 ? pomodoroSessions : pomodoroSessions.filter(s => after(s.started_at)),
            journal: range.days === 0 ? journalEntries : journalEntries.filter(e => after(e.date)),
        };
    }, [tasks, habits, pomodoroSessions, journalEntries, range, rangeStart]);

    // ── Summary stats ────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const totalTasks = inRange.tasks.length;
        const completedTasks = inRange.completedTasks.length;
        const completionRate = pct(completedTasks, totalTasks);
        const completedSessions = inRange.pomodoro.filter(s => s.completed);
        const focusMinutes = completedSessions.reduce((sum, s) => sum + s.duration, 0);
        const focusHours = Math.round(focusMinutes / 6) / 10; // 1 decimal
        const avgHabitStreak = habits.length > 0 ? Math.round(habits.reduce((s, h) => s + h.streak, 0) / habits.length) : 0;
        const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.longest_streak)) : 0;
        return { totalTasks, completedTasks, completionRate, focusSessions: completedSessions.length, focusHours, focusMinutes, avgHabitStreak, bestStreak };
    }, [inRange, habits]);

    // ── Trends (compare to previous same-length window) ──────────────────────

    const trends = useMemo(() => {
        if (range.days === 0) return null;
        const prevStart = subDays(rangeStart!, range.days);
        const after = (d: string, ref: Date) => isAfter(parseISO(d), ref);
        const between = (d: string) => after(d, prevStart) && isBefore(parseISO(d), rangeStart!);

        const prevCompleted = tasks.filter(t => t.completed && t.completed_at && between(t.completed_at)).length;
        const prevFocus = pomodoroSessions.filter(s => s.completed && between(s.started_at)).reduce((sum, s) => sum + s.duration, 0);

        return {
            tasks: trend(stats.completedTasks, prevCompleted),
            focus: trend(stats.focusMinutes, prevFocus),
        };
    }, [range, rangeStart, tasks, pomodoroSessions, stats]);

    // ── Weekly breakdown (last N weeks based on range) ───────────────────────

    const weeklyData = useMemo(() => {
        const weeks = Math.min(Math.max(Math.floor((range.days || 90) / 7), 4), 12);
        const labels: string[] = [];
        const taskCounts: number[] = [];
        const focusCounts: number[] = [];

        for (let w = weeks - 1; w >= 0; w--) {
            const weekEnd = subDays(new Date(), w * 7);
            const weekStart = subDays(weekEnd, 6);
            const label = format(weekStart, "MMM d");
            labels.push(label);

            const tc = tasks.filter(t => t.completed && t.completed_at && isAfter(parseISO(t.completed_at), weekStart) && isBefore(parseISO(t.completed_at), subDays(weekEnd, -1))).length;
            const fc = pomodoroSessions.filter(s => s.completed && isAfter(parseISO(s.started_at), weekStart) && isBefore(parseISO(s.started_at), subDays(weekEnd, -1))).length;
            taskCounts.push(tc);
            focusCounts.push(fc);
        }
        return { labels, taskCounts, focusCounts };
    }, [range, tasks, pomodoroSessions]);

    // ── Task priority breakdown ──────────────────────────────────────────────

    const priorityBreakdown = useMemo(() => {
        const high = inRange.tasks.filter(t => t.priority === "high").length;
        const medium = inRange.tasks.filter(t => t.priority === "medium").length;
        const low = inRange.tasks.filter(t => t.priority === "low").length;
        return [
            { label: "High", value: high, color: "#f87171" },
            { label: "Medium", value: medium, color: "#fbbf24" },
            { label: "Low", value: low, color: "#34d399" },
        ];
    }, [inRange.tasks]);

    // ── Focus time by day of week ────────────────────────────────────────────

    const focusByDay = useMemo(() => {
        const days = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
        inRange.pomodoro.filter(s => s.completed).forEach(s => {
            const d = new Date(s.started_at);
            const dayIdx = (d.getDay() + 6) % 7; // Mon=0
            days[dayIdx] += s.duration;
        });
        return days.map(m => Math.round(m / 60 * 10) / 10); // hours
    }, [inRange.pomodoro]);

    // ── Productivity score (0-100) ───────────────────────────────────────────

    const productivityScore = useMemo(() => {
        const taskScore = Math.min(stats.completionRate, 100) * 0.3;
        const focusScore = Math.min(stats.focusHours / Math.max(range.days || 30, 1) * 100, 100) * 0.25;
        const habitScore = Math.min(stats.avgHabitStreak / 7 * 100, 100) * 0.25;
        const journalScore = Math.min(inRange.journal.length / Math.max(range.days || 30, 1) * 100, 100) * 0.2;
        return Math.round(taskScore + focusScore + habitScore + journalScore);
    }, [stats, range, inRange.journal]);

    // ── Heatmap data ─────────────────────────────────────────────────────────

    const activityData = useMemo(() => {
        const map: Record<string, number> = {};
        tasks.forEach(t => { if (t.completed && t.completed_at) { const d = t.completed_at.slice(0, 10); map[d] = (map[d] || 0) + 1; } });
        habits.forEach(h => { (h.completions as string[]).forEach(d => { map[d] = (map[d] || 0) + 1; }); });
        pomodoroSessions.forEach(s => { if (s.completed) { const d = s.started_at.slice(0, 10); map[d] = (map[d] || 0) + 1; } });
        journalEntries.forEach(e => { map[e.date] = (map[e.date] || 0) + 1; });
        return map;
    }, [tasks, habits, pomodoroSessions, journalEntries]);

    const moodData = useMemo(() => {
        const map: Record<string, number> = {};
        journalEntries.forEach(e => { map[e.date] = e.mood; });
        return map;
    }, [journalEntries]);

    const activeDays = useMemo(() => Object.values(activityData).filter(v => v > 0).length, [activityData]);
    const avgMood = useMemo(() => {
        const vals = Object.values(moodData);
        return vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
    }, [moodData]);

    const moodStats = useMemo(() => {
        const entries = Object.values(moodData);
        if (entries.length === 0) return null;
        const dist = [0, 0, 0, 0, 0]; // mood 1-5
        entries.forEach(m => { if (m >= 1 && m <= 5) dist[m - 1]++; });
        const totalEntries = entries.length;
        const bestDay = Object.entries(moodData).reduce((best, [d, m]) => m > (best.mood ?? 0) ? { date: d, mood: m } : best, { date: "", mood: 0 });
        // Mood trend: compare last 7 vs previous 7
        const sorted = Object.entries(moodData).sort((a, b) => b[0].localeCompare(a[0]));
        const recent7 = sorted.slice(0, 7);
        const prev7 = sorted.slice(7, 14);
        const recentAvg = recent7.length > 0 ? recent7.reduce((s, [, m]) => s + m, 0) / recent7.length : 0;
        const prevAvg = prev7.length > 0 ? prev7.reduce((s, [, m]) => s + m, 0) / prev7.length : 0;
        const trendDir = recentAvg > prevAvg + 0.2 ? "up" as const : recentAvg < prevAvg - 0.2 ? "down" as const : "flat" as const;
        return { dist, totalEntries, bestDay, trendDir, recentAvg };
    }, [moodData]);

    // ── Activity type breakdown ──────────────────────────────────────────────

    const activityBreakdown = useMemo(() => {
        const taskDays = new Set<string>();
        tasks.forEach(t => { if (t.completed && t.completed_at) taskDays.add(t.completed_at.slice(0, 10)); });
        const habitDays = new Set<string>();
        habits.forEach(h => (h.completions as string[]).forEach(d => habitDays.add(d)));
        const focusDays = new Set<string>();
        pomodoroSessions.forEach(s => { if (s.completed) focusDays.add(s.started_at.slice(0, 10)); });
        const journalDays = new Set<string>();
        journalEntries.forEach(e => journalDays.add(e.date));
        return [
            { label: "Tasks", count: taskDays.size, icon: "✅" },
            { label: "Habits", count: habitDays.size, icon: "🔄" },
            { label: "Focus", count: focusDays.size, icon: "🎯" },
            { label: "Journal", count: journalDays.size, icon: "📝" },
        ];
    }, [tasks, habits, pomodoroSessions, journalEntries]);

    // ── Habit consistency (last 7 days) ──────────────────────────────────────

    const last14 = useMemo(() => eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() }).map(d => format(d, "yyyy-MM-dd")), []);
    const last7 = useMemo(() => last14.slice(-7), [last14]);
    const habitConsistency = useMemo(() => {
        return habits.map(h => {
            const completions = h.completions as string[];
            const done7 = last7.filter(d => completions.includes(d)).length;
            const done14 = last14.filter(d => completions.includes(d)).length;
            const doneFirstHalf = done14 - done7;
            const days = last14.map(d => ({ date: d, done: completions.includes(d), label: format(parseISO(d), "EEE").charAt(0) }));
            const trendDir = done7 > doneFirstHalf ? "up" as const : done7 < doneFirstHalf ? "down" as const : "flat" as const;
            return {
                name: h.name,
                icon: h.icon,
                frequency: h.frequency,
                rate: Math.round((done7 / 7) * 100),
                streak: h.streak,
                longest: h.longest_streak,
                days,
                trend: trendDir,
                totalCompletions: completions.length,
            };
        }).sort((a, b) => b.rate - a.rate);
    }, [habits, last7, last14]);

    // ── Goals progress ───────────────────────────────────────────────────────

    const goalStats = useMemo(() => {
        const active = goals.filter(g => !g.completed);
        const completed = goals.filter(g => g.completed);
        const avgProgress = active.length > 0 ? Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length) : 0;
        return { active: active.length, completed: completed.length, avgProgress, total: goals.length };
    }, [goals]);

    // ── Loading ──────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />)}
                </div>
            </div>
        );
    }

    const MOOD_EMOJI = ["", "😞", "😐", "🙂", "😊", "🤩"];
    const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
        <div className="space-y-6 pb-10 overflow-x-hidden">
            {/* ── Header + range selector ──────────────────────────────────── */}
            <PageHeader title="Analytics" description="Your productivity insights">
                <div className="flex sm:justify-end mt-4 md:mt-0 overflow-x-auto pb-1 -mb-1" style={{ scrollbarWidth: "none" }}>
                    <div className="flex items-center rounded-full border p-0.5 min-w-max" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                        {RANGES.map(r => (
                            <button
                                key={r.label}
                                onClick={() => setRange(r)}
                                className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                                style={{
                                    background: range.label === r.label ? 'var(--accent)' : 'transparent',
                                    color: range.label === r.label ? '#fff' : 'var(--text-tertiary)',
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </PageHeader>

            {/* ── Tabs Navigation ──────────────────────────────────────────── */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mt-2 max-w-full" style={{ scrollbarWidth: "none" }}>
                {TABS.map(t => {
                    const active = activeTab === t.id;
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all"
                            style={{
                                background: active ? 'var(--accent)' : 'var(--bg-surface)',
                                color: active ? '#fff' : 'var(--text-secondary)',
                                border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                            }}
                        >
                            <Icon size={16} />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {/* ── Tab Content: Overview ────────────────────────────────────────── */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* ── Productivity score hero ──────────────────────────────────── */}
                    <Card className="p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(16,185,129,0.08), transparent 60%)' }} />
                        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-full mb-3" style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>
                                    <Trophy size={13} /> Productivity Score
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl md:text-6xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                        {productivityScore}
                                    </span>
                                    <span className="text-lg font-bold" style={{ color: 'var(--text-tertiary)' }}>/100</span>
                                </div>
                                <p className="text-sm mt-2 leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)' }}>
                                    {productivityScore >= 75 ? "Outstanding! You're in peak productivity mode." :
                                        productivityScore >= 50 ? "Solid momentum — keep pushing to hit your stride." :
                                            productivityScore >= 25 ? "Building habits takes time. Stay consistent!" :
                                                "Start small — every completed task counts."}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 mt-4">
                                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{activeDays}</span> active days
                                    </div>
                                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{user?.streak ?? 0}</span> day streak
                                    </div>
                                    {avgMood && (
                                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                            {MOOD_EMOJI[Math.round(Number(avgMood))]} <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{avgMood}</span> avg mood
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Score ring */}
                            <div className="hidden md:flex items-center justify-center">
                                <svg width="120" height="120" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-muted)" strokeWidth="8" />
                                    <circle
                                        cx="60" cy="60" r="50" fill="none"
                                        stroke="var(--accent)"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(productivityScore / 100) * 314} 314`}
                                        className="transition-all duration-1000"
                                        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                                    />
                                    <text x="60" y="57" textAnchor="middle" className="text-2xl font-black" fill="var(--text-primary)" fontSize="28">{productivityScore}</text>
                                    <text x="60" y="75" textAnchor="middle" fill="var(--text-tertiary)" fontSize="11" fontWeight="600">score</text>
                                </svg>
                            </div>
                        </div>
                    </Card>

                    {/* ── Stat cards with trends ───────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                label: "Tasks Done", value: stats.completedTasks, sub: `${stats.completionRate}% rate`,
                                icon: <CheckCircle2 size={18} />, color: "text-emerald-400",
                                trend: trends?.tasks,
                            },
                            {
                                label: "Focus Time", value: `${stats.focusHours}h`, sub: `${stats.focusSessions} sessions`,
                                icon: <Timer size={18} />, color: "text-indigo-400",
                                trend: trends?.focus,
                            },
                            {
                                label: "Habit Streak", value: `${stats.avgHabitStreak}d`, sub: `Best: ${stats.bestStreak}d`,
                                icon: <Flame size={18} />, color: "text-amber-400",
                            },
                            {
                                label: "Goals", value: `${goalStats.completed}/${goalStats.total}`, sub: `${goalStats.avgProgress}% avg progress`,
                                icon: <Target size={18} />, color: "text-blue-400",
                            },
                        ].map(s => (
                            <Card key={s.label} className="p-4 md:p-5" hoverEffect>
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`${s.color} opacity-80`}>{s.icon}</div>
                                    {s.trend && <TrendBadge dir={s.trend.dir} pct={s.trend.pct} />}
                                </div>
                                <div className="text-2xl md:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                                <div className="text-[11px] font-semibold mt-1" style={{ color: 'var(--text-tertiary)' }}>{s.label}</div>
                                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.sub}</div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Tab Content: Insights ────────────────────────────────────────── */}
            {activeTab === "insights" && (
                <div className="space-y-6">
                    {/* ── Charts row ──────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {/* Weekly tasks bar chart */}
                        <Card className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                                    <BarChart3 size={14} className="inline mr-1.5 -mt-0.5" />Weekly Tasks
                                </h3>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
                                    {weeklyData.taskCounts.reduce((s, v) => s + v, 0)} total
                                </span>
                            </div>
                            <MiniBarChart data={weeklyData.taskCounts} color="rgba(52,211,153,0.8)" label="Tasks completed per week" />
                            <div className="flex justify-between mt-2 text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                <span>{weeklyData.labels[0]}</span>
                                <span>This week</span>
                            </div>
                        </Card>

                        {/* Weekly focus bar chart */}
                        <Card className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                                    <Timer size={14} className="inline mr-1.5 -mt-0.5" />Weekly Focus
                                </h3>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
                                    {weeklyData.focusCounts.reduce((s, v) => s + v, 0)} sessions
                                </span>
                            </div>
                            <MiniBarChart data={weeklyData.focusCounts} color="rgba(99,102,241,0.8)" label="Focus sessions per week" />
                            <div className="flex justify-between mt-2 text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                <span>{weeklyData.labels[0]}</span>
                                <span>This week</span>
                            </div>
                        </Card>

                        {/* Task priority donut + Focus by day */}
                        <Card className="p-5">
                            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
                                <Target size={14} className="inline mr-1.5 -mt-0.5" />Task Priorities
                            </h3>
                            <div className="flex items-center gap-5">
                                <DonutChart segments={priorityBreakdown} size={72} />
                                <div className="space-y-2 flex-1">
                                    {priorityBreakdown.map(p => (
                                        <div key={p.label} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                                                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                                            </div>
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{p.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* ── Focus by day of week ─────────────────────────────────────── */}
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                                <CalendarRange size={14} className="inline mr-1.5 -mt-0.5" />Focus by Day of Week
                            </h3>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
                                {focusByDay.reduce((s, v) => s + v, 0).toFixed(1)}h total
                            </span>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {focusByDay.map((hours, i) => {
                                const max = Math.max(...focusByDay, 0.1);
                                const pctH = (hours / max) * 100;
                                return (
                                    <div key={i} className="text-center">
                                        <div className="h-20 flex flex-col justify-end mx-auto" style={{ width: '100%' }}>
                                            <div
                                                className="rounded-t-md mx-auto transition-all duration-500"
                                                style={{
                                                    width: '60%',
                                                    height: `${Math.max(pctH, 6)}%`,
                                                    background: hours > 0 ? 'rgba(99,102,241,0.7)' : 'var(--bg-elevated)',
                                                    border: hours > 0 ? 'none' : '1px solid var(--border)',
                                                    borderBottom: 'none',
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{DAY_LABELS[i]}</p>
                                        <p className="text-[10px] font-semibold" style={{ color: hours > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{hours}h</p>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* ── Tab Content: Consistency ─────────────────────────────────────── */}
            {activeTab === "consistency" && (
                <div className="space-y-6">
                    {/* ── Consistency Heatmap (full width, prominent) ──────────── */}
                    <Card className="p-6 md:p-8">
                        <ActivityHeatmap data={activityData} label="Consistency" color="emerald" unit="activities" weeks={24} showStats />

                        {/* Activity type breakdown */}
                        <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <BarChart3 size={13} style={{ color: 'var(--text-tertiary)' }} />
                                <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>Active days by type</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {activityBreakdown.map(a => (
                                    <div key={a.label} className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm shrink-0">{a.icon}</span>
                                        <div className="min-w-0">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>{a.count}</span>
                                                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>days</span>
                                            </div>
                                            <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{a.label}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ── Tab Content: Mood & Habits ───────────────────────────────────── */}
            {activeTab === "habits" && (
                <div className="space-y-6">
                    {/* ── Mood Heatmap ─────────────────────────────────────────────── */}
                    {Object.keys(moodData).length > 0 && moodStats ? (
                        <Card className="p-6 md:p-8">
                            <ActivityHeatmap data={moodData} label="Mood Tracker" color="violet" unit="mood" weeks={20} showStats />

                            {/* Mood distribution + insights */}
                            <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6">
                                    {/* Mood distribution bars */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Brain size={13} style={{ color: 'var(--text-tertiary)' }} />
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>Mood Distribution</span>
                                        </div>
                                        <div className="space-y-2">
                                            {[5, 4, 3, 2, 1].map(level => {
                                                const count = moodStats.dist[level - 1];
                                                const maxDist = Math.max(...moodStats.dist, 1);
                                                const w = (count / maxDist) * 100;
                                                return (
                                                    <div key={level} className="flex items-center gap-2.5">
                                                        <span className="text-sm w-5 text-center">{MOOD_EMOJI[level]}</span>
                                                        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                                                            <div
                                                                className="h-full rounded-full transition-all duration-700"
                                                                style={{
                                                                    width: `${Math.max(w, count > 0 ? 4 : 0)}%`,
                                                                    background: level >= 4 ? 'rgba(167,139,250,0.8)' : level === 3 ? 'rgba(167,139,250,0.5)' : 'rgba(167,139,250,0.3)',
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-bold tabular-nums w-6 text-right" style={{ color: 'var(--text-secondary)' }}>{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Mood summary pills */}
                                    <div className="flex sm:flex-col gap-3 flex-wrap">
                                        <div className="px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(167,139,250,0.1)' }}>
                                            <div className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{avgMood}</div>
                                            <div className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Avg Mood</div>
                                        </div>
                                        <div className="px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(167,139,250,0.1)' }}>
                                            <div className="text-lg font-black flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                                                {moodStats.totalEntries}
                                            </div>
                                            <div className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Entries</div>
                                        </div>
                                        <div className="px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(167,139,250,0.1)' }}>
                                            <div className="flex items-center gap-1">
                                                {moodStats.trendDir === "up" ? <TrendingUp size={14} className="text-emerald-400" /> : moodStats.trendDir === "down" ? <TrendingDown size={14} className="text-red-400" /> : <Minus size={14} className="text-zinc-500" />}
                                                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{moodStats.trendDir === "up" ? "Improving" : moodStats.trendDir === "down" ? "Declining" : "Steady"}</span>
                                            </div>
                                            <div className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Trend</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-6 flex items-center justify-center min-h-40">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
                                    <Brain size={18} />
                                </div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No mood data yet</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Log journal entries to unlock mood trends.</p>
                            </div>
                        </Card>
                    )}

                    {/* ── Habit consistency ────────────────────────────────────────── */}
                    {habitConsistency.length > 0 && (
                        <Card className="p-6 md:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                        <Flame size={15} className="text-amber-400" />Habit Consistency
                                    </h3>
                                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Last 14 days · {habits.length} habit{habits.length !== 1 ? "s" : ""} tracked</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Done</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--bg-elevated)', boxShadow: 'inset 0 0 0 1px var(--border)' }} />
                                        <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Missed</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {habitConsistency.map(h => {
                                    const accentColor = h.rate >= 80 ? "#34d399" : h.rate >= 50 ? "#fbbf24" : "#6b7280";
                                    return (
                                        <div
                                            key={h.name}
                                            className="rounded-2xl p-4 transition-colors"
                                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                                        >
                                            <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-3 overflow-x-hidden">
                                                {/* Left: Name + meta */}
                                                <div className="flex items-center gap-3 xl:w-44 shrink-0">
                                                    <span className="text-xl">{h.icon}</span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-muted)', color: 'var(--text-tertiary)' }}>
                                                                {h.frequency === "daily" ? "Daily" : h.frequency === "weekdays" ? "Weekdays" : "Weekly"}
                                                            </span>
                                                            {h.trend !== "flat" && (
                                                                <span className={`text-[10px] font-bold ${h.trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
                                                                    {h.trend === "up" ? <TrendingUp size={10} className="inline" /> : <TrendingDown size={10} className="inline" />}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Center: 14-day dot grid */}
                                                <div className="flex-1 flex items-center xl:justify-center">
                                                    <div className="flex items-start gap-0.5 sm:gap-1 flex-wrap">
                                                        {h.days.map((d, i) => [
                                                            i === 7 && <div key={`sep-${d.date}`} className="w-px h-3.5 sm:h-4 mx-0.5 rounded-full self-center" style={{ background: 'var(--border)' }} />,
                                                            <div key={d.date} className="flex flex-col items-center gap-0.5" title={`${format(parseISO(d.date), "MMM d")} — ${d.done ? "Done" : "Missed"}`}>
                                                                <div
                                                                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-md transition-all shrink-0"
                                                                    style={{
                                                                        background: d.done ? accentColor : 'var(--bg-elevated)',
                                                                        boxShadow: d.done ? 'none' : 'inset 0 0 0 1.5px var(--border)',
                                                                    }}
                                                                />
                                                                <span className={`text-[7px] sm:text-[8px] font-bold leading-none ${i >= 7 ? '' : 'opacity-0 hidden sm:block'}`} style={{ color: 'var(--text-tertiary)' }}>{d.label}</span>
                                                            </div>
                                                        ])}
                                                    </div>
                                                </div>

                                                {/* Right: Stats */}
                                                <div className="flex items-center gap-3 sm:gap-4 xl:w-48 xl:justify-end shrink-0 pt-2 xl:pt-0 border-t xl:border-none flex-wrap" style={{ borderColor: 'var(--border)' }}>
                                                    <div className="text-center">
                                                        <div className="text-xs sm:text-sm font-black tabular-nums" style={{ color: accentColor }}>{h.rate}%</div>
                                                        <div className="text-[9px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>7d rate</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs sm:text-sm font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>🔥 {h.streak}</div>
                                                        <div className="text-[9px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>streak</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs sm:text-sm font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>🏆 {h.longest}</div>
                                                        <div className="text-[9px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>best</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{ width: `${h.rate}%`, background: accentColor }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
