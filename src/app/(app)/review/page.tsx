"use client";

import { useState, useMemo } from "react";
import { useAppStore, XP_REWARDS } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { awardXp } from "@/lib/xp";
import { encryptField } from "@/lib/crypto";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
import { invalidateEntity } from "@/actions/data";
import { CheckCircle2, Timer, Flame } from "lucide-react";
import { useDashboardData } from "@/hooks/useUserData";

export default function ReviewPage() {
    const { user, tasks, habits, pomodoroSessions } = useAppStore();
    const { loading } = useDashboardData();
    const [reflection, setReflection] = useState("");
    const [plan, setPlan] = useState("");
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    // Calculate dates for current week review
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    const weekLabel = `${format(start, "MMM d")} - ${format(end, "MMM d")}`;

    // Calculate Stats from store (no re-fetching!)
    const weekTasks = useMemo(() => tasks.filter(t => {
        if (!t.completed_at) return false;
        const d = new Date(t.completed_at);
        return d >= start && d <= end;
    }), [tasks, start, end]);

    const weekFocusMinutes = useMemo(() => pomodoroSessions
        .filter(s => {
            const d = new Date(s.started_at);
            return d >= start && d <= end && s.completed;
        })
        .reduce((sum, s) => sum + s.duration, 0),
        [pomodoroSessions, start, end]);

    const weekHabitRate = useMemo(() => {
        if (habits.length === 0) return 0;
        return Math.round(
            habits.reduce((sum, h) => {
                const completions = (h.completions as string[]).filter(d => {
                    const date = new Date(d);
                    return date >= start && date <= end;
                }).length;
                return sum + (completions / 7);
            }, 0) / habits.length * 100
        );
    }, [habits, start, end]);

    async function handleComplete() {
        if (!user || saving) return;
        setSaving(true);
        const supabase = createClient();

        const content = `Weekly Review (${weekLabel})\n\nReflection:\n${reflection}\n\nPlan for next week:\n${plan}`;
        const encContent = await encryptField(content);

        await supabase.from("journal_entries").insert({
            content: encContent,
            mood: 4,
            date: format(now, "yyyy-MM-dd"),
            user_id: user.id
        });

        await awardXp(XP_REWARDS.GOAL_MILESTONE);

        await invalidateEntity('tasks');
        toast.success(`Weekly Review complete! +${XP_REWARDS.GOAL_MILESTONE} XP 🎉`);
        router.push("/dashboard");
    }

    if (loading) return (
        <div className="text-zinc-500 text-center mt-20 animate-pulse">Preparing your review...</div>
    );

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-8 relative">
            <div className="text-center mb-10">
                <div className="text-xs font-mono text-emerald-400 mb-2 uppercase tracking-widest">Weekly Review</div>
                <h1 className="text-3xl font-bold text-zinc-100">{weekLabel}</h1>
                <p className="text-zinc-500 mt-2">Take a moment to reflect and plan.</p>
            </div>

            {/* Progress Stepper */}
            <div className="flex justify-center mb-8 gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 w-12 rounded-full transition-all ${step >= i ? "bg-indigo-500" : "bg-zinc-800"}`} />
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-center text-zinc-200">How did you do?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="surface-card p-6 rounded-2xl text-center">
                            <div className="flex justify-center mb-2 text-emerald-400"><CheckCircle2 size={28} /></div>
                            <div className="text-2xl font-bold text-emerald-400">{weekTasks.length}</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Tasks Done</div>
                        </div>
                        <div className="surface-card p-6 rounded-2xl text-center">
                            <div className="flex justify-center mb-2 text-indigo-400"><Timer size={28} /></div>
                            <div className="text-2xl font-bold text-indigo-400">{Math.round(weekFocusMinutes / 60 * 10) / 10}h</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Focus Time</div>
                        </div>
                        <div className="surface-card p-6 rounded-2xl text-center">
                            <div className="flex justify-center mb-2 text-amber-400"><Flame size={28} /></div>
                            <div className="text-2xl font-bold text-amber-400">{weekHabitRate}%</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Habit Rate</div>
                        </div>
                    </div>

                    <div className="surface-card p-6 rounded-2xl">
                        <h3 className="font-semibold mb-4 text-sm text-zinc-400">Accomplishments</h3>
                        {weekTasks.length > 0 ? (
                            <ul className="space-y-2">
                                {weekTasks.slice(0, 5).map(t => (
                                    <li key={t.id} className="text-zinc-300 text-sm flex items-start gap-2">
                                        <span className="text-emerald-500 mt-1">✓</span>
                                        <span className="line-clamp-1">{t.title}</span>
                                    </li>
                                ))}
                                {weekTasks.length > 5 && <li className="text-xs text-zinc-500 pl-6">and {weekTasks.length - 5} more...</li>}
                            </ul>
                        ) : (
                            <p className="text-zinc-600 text-sm">No tasks completed this week. A fresh start!</p>
                        )}
                    </div>

                    <button onClick={() => setStep(2)} className="w-full py-3 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl transition-all">
                        Continue to Reflection →
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-center text-zinc-200">Reflect & Learn</h2>

                    <div className="surface-card p-6 rounded-2xl space-y-4">
                        <label className="block text-sm font-medium text-zinc-400">What went well this week? What didn't?</label>
                        <textarea
                            value={reflection}
                            onChange={e => setReflection(e.target.value)}
                            className="w-full h-40 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-none font-serif leading-relaxed"
                            placeholder="I felt really productive on Tuesday because..."
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-700 transition-all">
                            ← Back
                        </button>
                        <button onClick={() => setStep(3)} className="flex-1 py-3 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl transition-all">
                            Next: Plan Ahead →
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-center text-zinc-200">Plan for Next Week</h2>

                    <div className="surface-card p-6 rounded-2xl space-y-4">
                        <label className="block text-sm font-medium text-zinc-400">What are your top 3 priorities?</label>
                        <textarea
                            value={plan}
                            onChange={e => setPlan(e.target.value)}
                            className="w-full h-40 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-none font-serif leading-relaxed"
                            placeholder="1. Finish the project&#10;2. Exercise 3 times&#10;3. Read a book"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(2)} className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-700 transition-all">
                            ← Back
                        </button>
                        <button onClick={handleComplete} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/20">
                            Complete Review (+50 XP)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
