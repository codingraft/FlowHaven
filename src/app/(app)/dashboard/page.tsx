"use client";

import React, { useState, useMemo } from "react";
import { useAppStore, getLevelInfo, XP_REWARDS } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { awardXp } from "@/lib/xp";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { useConfetti } from "@/hooks/useConfetti";
import { useDashboardData } from "@/hooks/useUserData";
import {
    CheckCircle2,
    Flame,
    Timer,
    Zap,
    Sparkles,
    Plus,
    Play,
    BookOpen,
    ArrowRight,
    Calendar,
    Target
} from "lucide-react";

const _h = new Date().getHours();
const GREETING =
    _h < 5 ? "Burning the midnight oil" :
        _h < 12 ? "Good morning" :
            _h < 17 ? "Good afternoon" : "Good evening";
const TODAY = format(new Date(), "yyyy-MM-dd");

const QUOTES = [
    "The secret of getting ahead is getting started.",
    "Small daily improvements are the key to staggering long-term results.",
    "You don't have to be great to start, but you have to start to be great.",
    "Focus on progress, not perfection.",
    "Every expert was once a beginner.",
    "Your future is created by what you do today, not tomorrow.",
    "Discipline is choosing between what you want now and what you want most.",
    "Success is the sum of small efforts repeated day in and day out.",
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, bg }: {
    icon: React.ElementType, label: string, value: string | number, sub?: string, color: string, bg: string
}) {
    return (
        <div className="surface-card p-3 md:p-4 rounded-2xl flex flex-col justify-between hover:bg-(--bg-elevated) transition-colors group h-full">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2.5 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={20} />
                </div>
                {sub && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>{sub}</span>}
            </div>
            <div>
                <div className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</div>
                <div className="text-xs text-zinc-500 font-medium mt-0.5">{label}</div>
            </div>
        </div>
    );
}

function QuickAction({ icon: Icon, label, sub, color, onClick, href }: {
    icon: React.ElementType, label: string, sub: string, color: string, onClick?: () => void, href?: string
}) {
    const content = (
        <div className={`
            relative overflow-hidden group p-3 md:p-4 rounded-2xl border border-(--border) bg-(--bg-surface) hover:bg-(--bg-elevated) transition-all cursor-pointer h-full
        `}>
            <div className={`absolute top-0 right-0 p-20 ${color} opacity-0 group-hover:opacity-5 blur-3xl rounded-full transition-opacity`} />
            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-full border shadow-lg group-hover:scale-110 transition-all duration-300`} style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                    <Icon size={20} />
                </div>
                <div>
                    <div className="font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div className="text-xs text-zinc-500">{sub}</div>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight size={16} className="text-zinc-500" />
                </div>
            </div>
        </div>
    );

    if (href) return <Link href={href} className="block h-full">{content}</Link>;
    return <button onClick={onClick} className="block w-full text-left h-full">{content}</button>;
}

export default function DashboardPage() {
    const { user, tasks, habits, pomodoroSessions } = useAppStore();
    const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const triggerConfetti = useConfetti();
    const { loading } = useDashboardData();

    // ─── Derived state (useMemo — no setState/useEffect) ────────────────────
    const todayHabits = useMemo(() => {
        if (!user) return [];
        return habits
            .filter(h => h.completions && h.completions.includes(TODAY))
            .map(h => h.id);
    }, [user, habits]);

    const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

    // Sort logic: High priority first, then due date
    const topPriorityTask = useMemo(() => {
        return pendingTasks.sort((a, b) => {
            const pOrder = { high: 0, medium: 1, low: 2 };
            if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
            if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
            return 0;
        })[0];
    }, [pendingTasks]);

    const completedToday = useMemo(
        () => tasks.filter((t) => t.completed && t.completed_at?.startsWith(TODAY)).length,
        [tasks]
    );

    const todayFocusMinutes = useMemo(
        () => pomodoroSessions
            .filter((s) => s.started_at.startsWith(TODAY) && s.completed)
            .reduce((sum, s) => sum + s.duration, 0),
        [pomodoroSessions]
    );

    const levelInfo = useMemo(() => (user ? getLevelInfo(user.xp) : null), [user]);

    const quickComplete = async (taskId: string) => {
        const supabase = createClient();
        const now = new Date().toISOString();

        // Optimistic update
        useAppStore.getState().updateTask(taskId, { completed: true, completed_at: now });

        await supabase.from("tasks").update({ completed: true, completed_at: now }).eq("id", taskId);

        await awardXp(XP_REWARDS.TASK_COMPLETE);
        toast.success(`Task completed! +${XP_REWARDS.TASK_COMPLETE} XP`);
        triggerConfetti();
    };

    if (loading) return <div className="animate-pulse space-y-8"><div className="h-12 w-1/3 bg-zinc-900 rounded-xl" /><div className="grid grid-cols-4 gap-4 h-32"><div className="bg-zinc-900 rounded-xl" /><div className="bg-zinc-900 rounded-xl" /><div className="bg-zinc-900 rounded-xl" /><div className="bg-zinc-900 rounded-xl" /></div></div>;

    return (
        <div className="space-y-6 md:space-y-8 pb-8 md:pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 md:gap-6">
                <div className="space-y-3">
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {GREETING}, <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">{user?.name?.split(" ")[0]}</span>
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm mt-2">
                        <div className="flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-lg border border-(--border) w-fit" style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
                            <Calendar size={14} style={{ color: 'var(--accent)' }} />
                            <span className="font-medium">{format(new Date(), "EEEE, MMMM do")}</span>
                        </div>
                        <span className="hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>•</span>
                        <div className="italic max-w-lg leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                            &ldquo;{quote}&rdquo;
                        </div>
                    </div>
                </div>

                <div className="flex items-center shrink-0">
                    {/* Premium Level Badge */}
                    <div className="relative group cursor-default">
                        <div className="absolute inset-0 bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative bg-(--bg-surface) backdrop-blur-md border border-(--border) rounded-2xl p-3 flex items-center gap-4 shadow-sm hover:border-(--border-hover) transition-colors">
                            <div className="flex flex-col items-center justify-center bg-(--bg-elevated) rounded-xl w-12 h-12 border border-(--border)">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Lvl</span>
                                <span className="text-lg font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400 leading-none">{levelInfo?.current.level}</span>
                            </div>
                            <div className="flex flex-col gap-1.5 pr-1">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs font-bold text-(--text-secondary)">{levelInfo?.current.name}</span>
                                    <span className="text-[10px] font-medium text-zinc-500">{levelInfo?.xpInLevel} / {levelInfo?.xpNeeded} XP</span>
                                </div>
                                <div className="w-32 h-2 bg-zinc-900 rounded-full overflow-hidden border border-(--border)">
                                    <div className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${levelInfo?.progress}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickAction
                    icon={Plus}
                    label="New Task"
                    sub="Capture what's on your mind"
                    color="bg-indigo-500"
                    href="/tasks"
                />
                <QuickAction
                    icon={Play}
                    label="Start Focus"
                    sub="Get into the flow state"
                    color="bg-emerald-500"
                    href="/pomodoro"
                />
                <QuickAction
                    icon={BookOpen}
                    label="Journal"
                    sub="Reflect on your day"
                    color="bg-amber-500"
                    href="/journal"
                />
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={CheckCircle2}
                    label="Tasks Done"
                    value={completedToday}
                    sub={`${pendingTasks.length} left`}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <StatCard
                    icon={Flame}
                    label="Day Streak"
                    value={user?.streak ?? 0}
                    color="text-orange-400"
                    bg="bg-orange-500/10"
                />
                <StatCard
                    icon={Timer}
                    label="Focus Time"
                    value={`${todayFocusMinutes}m`}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <StatCard
                    icon={Zap}
                    label="Total XP"
                    value={user?.xp ?? 0}
                    sub={`Lvl ${levelInfo?.current.level}`}
                    color="text-yellow-400"
                    bg="bg-yellow-500/10"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
                {/* Left Col: Priority & Tasks */}
                <div className="xl:col-span-3 space-y-6">
                    {/* Up Next Card */}
                    {topPriorityTask ? (
                        <div className="relative overflow-hidden surface-card rounded-2xl p-6 border border-indigo-500/20 group">
                            <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-indigo-500/10 transition-colors" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 text-indigo-400 mb-3">
                                    <Target size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Top Priority</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 leading-tight" style={{ color: 'var(--text-primary)' }}>{topPriorityTask.title}</h3>
                                {topPriorityTask.notes && <p className="text-sm mb-6 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{topPriorityTask.notes}</p>}

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => quickComplete(topPriorityTask.id)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                                    >
                                        <CheckCircle2 size={18} />
                                        Complete Task
                                    </button>
                                    <Link href="/tasks" className="text-sm text-zinc-500 hover:text-white transition-colors">
                                        View all tasks
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="surface-card rounded-2xl p-8 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
                                <Sparkles size={20} />
                            </div>
                            <h3 className="font-medium" style={{ color: 'var(--text-secondary)' }}>All caught up!</h3>
                            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-tertiary)' }}>You&apos;ve cleared your high priority tasks.</p>
                            <Link href="/tasks" className="text-indigo-400 text-sm hover:underline">Add a new task</Link>
                        </div>
                    )}

                    {/* Pending Tasks List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider px-1">Next Up</h3>
                        </div>
                        <div className="space-y-2">
                            {pendingTasks.length > 0 ? (
                                pendingTasks.slice(1, 4).map(task => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 surface-card rounded-xl border border-(--border) hover:border-(--border-hover) transition-colors group">
                                        <button
                                            onClick={() => quickComplete(task.id)}
                                            className="w-5 h-5 rounded-full border-2 border-(--border-strong) hover:border-indigo-500 hover:bg-indigo-500/20 text-indigo-500 flex items-center justify-center transition-all opacity-50 hover:opacity-100"
                                        >
                                            <CheckCircle2 size={12} className="opacity-0 hover:opacity-100" />
                                        </button>
                                        <span className="text-sm transition-colors truncate flex-1 group-hover:text-(--text-primary)" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${task.priority === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                            task.priority === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                "bg-(--bg-elevated) text-(--text-tertiary) border-(--border)"
                                            }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                !topPriorityTask && <div className="text-sm text-zinc-600 italic px-1">No pending tasks. Enjoy your day!</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Col: Habits Snapshot */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider px-1">Habits Snapshot</h3>
                        <Link href="/habits" className="text-[10px] font-bold px-2 py-1 rounded-md transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>VIEW ALL</Link>
                    </div>
                    {habits.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                            {habits.slice(0, 4).map(habit => {
                                const isDone = todayHabits.includes(habit.id);
                                return (
                                    <div key={habit.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDone ? "bg-emerald-500/5 border-emerald-500/20" : "surface-card border-(--border) opacity-70"
                                        }`}>
                                        <div className="text-lg">{habit.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium truncate ${isDone ? "text-emerald-400" : "text-(--text-secondary)"}`}>{habit.name}</div>
                                        </div>
                                        {isDone && <CheckCircle2 size={16} className="text-emerald-500" />}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-6 rounded-2xl border border-dashed border-zinc-800 text-center" style={{ background: 'var(--bg-elevated)' }}>
                            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>No habits tracked yet.</p>
                            <Link href="/habits" className="text-indigo-400 text-xs font-bold hover:underline">Setup Habits</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
