"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppStore, XP_REWARDS } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { awardXp } from "@/lib/xp";
import { toast } from "sonner";
import { invalidateEntity } from "@/actions/data";
import { format, subDays, isSameDay } from "date-fns";
import Modal from "@/components/Modal";
import { Flame, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Layout";
import { Input, Select } from "@/components/ui/Form";
import { useHabits as useHabitsData } from "@/hooks/useUserData";

export default function HabitsPage() {
    const { user, habits, goals, addHabit, updateHabit, deleteHabit } = useAppStore();
    const { loading } = useHabitsData();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: "", icon: "⭐", frequency: "daily", linked_goal_id: "" });
    const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

    // Last 7 days for weekly view (Sun -> Mon or just last 7 days relative to today)
    // Let's show last 7 days ending today
    const last7Days = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = subDays(new Date(), 6 - i);
            return {
                date: d,
                dateStr: format(d, "yyyy-MM-dd"),
                dayName: format(d, "EEE"), // Mon, Tue...
                dayNum: format(d, "d"),
                isToday: isSameDay(d, new Date())
            };
        });
    }, []);

    const checkIn = useCallback(async (habitId: string) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;
        if ((habit.completions as string[]).includes(today)) {
            toast("Already checked in today!");
            return;
        }

        const supabase = createClient();
        const newCompletions = [...(habit.completions as string[]), today];

        // Calculate streak
        let streak = 1;
        let checkDate = subDays(new Date(), 1);
        while ((habit.completions as string[]).includes(format(checkDate, "yyyy-MM-dd"))) {
            streak++;
            checkDate = subDays(checkDate, 1);
        }

        const longestStreak = Math.max(habit.longest_streak, streak);
        await supabase.from("habits").update({ completions: newCompletions, streak, longest_streak: longestStreak }).eq("id", habitId);
        updateHabit(habitId, { completions: newCompletions, streak, longest_streak: longestStreak });

        await awardXp(XP_REWARDS.HABIT_CHECKIN);
        toast.success(`+${XP_REWARDS.HABIT_CHECKIN} XP! 🔥 ${streak} day streak!`);
        await invalidateEntity('habits');
    }, [habits, today, updateHabit]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("Delete this habit?")) return;
        const supabase = createClient();
        await supabase.from("habits").delete().eq("id", id);
        deleteHabit(id);
        toast.success("Habit deleted");
        await invalidateEntity('habits');
    }, [deleteHabit]);

    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const supabase = createClient();
        const { data, error } = await supabase.from("habits").insert({
            name: form.name, icon: form.icon, frequency: form.frequency,
            linked_goal_id: form.linked_goal_id || null,
            streak: 0, longest_streak: 0, completions: [],
            user_id: user.id, created_at: new Date().toISOString(),
        }).select().single();
        if (error) {
            console.error("Habit create error:", error);
            toast.error("Failed to create habit: " + error.message);
            return;
        }
        if (data) addHabit(data);
        setShowModal(false);
        setForm({ name: "", icon: "⭐", frequency: "daily", linked_goal_id: "" });
        toast.success("Habit added! Check in daily to build your streak 🔥");
        await invalidateEntity('habits');
    }, [user, form, addHabit]);

    const habitsDoneToday = habits.filter(h => (h.completions as string[]).includes(today)).length;
    const progress = habits.length > 0 ? (habitsDoneToday / habits.length) * 100 : 0;

    return (
        <div className="space-y-8 pb-20">
            {/* Page Header */}
            <PageHeader
                title="Habits"
                description="Consistency is the key to success."
            >
                {/* Daily Progress Widget */}
                <div className="p-4 rounded-xl flex items-center gap-4 min-w-70" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex-1">
                        <div className="flex justify-between text-xs font-medium mb-2">
                            <span style={{ color: 'var(--text-secondary)' }}>Daily Goal</span>
                            <span style={{ color: 'var(--accent)' }}>{habitsDoneToday}/{habits.length}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
                            <div
                                className="h-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    <Button
                        size="icon"
                        onClick={() => setShowModal(true)}
                        className="rounded-full shadow-lg bg-white text-black hover:bg-zinc-200"
                        title="Add Habit"
                    >
                        <Plus size={20} />
                    </Button>
                </div>
            </PageHeader>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse border border-white/5" />)}
                </div>
            ) : habits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 border rounded-2xl border-dashed" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-zinc-600" style={{ background: 'var(--bg-elevated)' }}>
                        <Flame size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No habits tracked yet</h3>
                    <p className="text-zinc-500 max-w-xs text-center mb-6">Start small. Add one habit you want to stick to daily.</p>
                    <Button onClick={() => setShowModal(true)} className="px-6 rounded-full">
                        Create your first habit
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {habits.map((habit) => {
                        const doneToday = (habit.completions as string[]).includes(today);

                        return (
                            <div key={habit.id} className="group flex flex-col relative overflow-hidden rounded-3xl p-5 shadow-sm transition-all duration-300"
                                style={{
                                    backgroundColor: '#131315',
                                }}>
                                {/* Top Glow Accent */}
                                <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                {/* Top Bar: Icon + Meta */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-15 h-15 rounded-[20px] flex items-center justify-center text-3xl border border-white/5"
                                            style={{ backgroundColor: '#1c1c1e' }}>
                                            <span className="relative z-10">{habit.icon}</span>
                                        </div>
                                        <div className="pt-0.5">
                                            <h3 className="font-bold text-[19px] tracking-tight leading-none mb-1.5" style={{ color: '#ffffff' }}>
                                                {habit.name}
                                            </h3>
                                            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#52525b' }}>
                                                {habit.frequency}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Streak Badge (Refined) */}
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#2a1400' }}>
                                        <Flame size={14} style={{ color: '#ff8a00' }} />
                                        <span className="text-[13px] font-bold leading-none mt-0.5" style={{ color: '#ff8a00' }}>{habit.streak}</span>
                                    </div>
                                </div>

                                {/* Weekly Calendar Tracker */}
                                <div className="mb-6 rounded-[20px] p-4 border border-white/5" style={{ backgroundColor: '#1a1a1c' }}>
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: '#52525b' }}>
                                            ACTIVITY
                                        </span>
                                    </div>
                                    <div className="flex justify-between px-1">
                                        {last7Days.map((day) => {
                                            const isCompleted = (habit.completions as string[]).includes(day.dateStr);

                                            // Determine styles dynamically based on state
                                            let circleClass = "w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all duration-300 ";
                                            let circleStyle = {};

                                            if (isCompleted) {
                                                circleStyle = { backgroundColor: '#8b5cf6', color: 'white' };
                                            } else if (day.isToday) {
                                                circleClass += "border-[2px] border-dashed border-[#8b5cf6]";
                                                circleStyle = { backgroundColor: 'transparent' };
                                            } else {
                                                circleStyle = { backgroundColor: 'var(--bg-elevated)', boxShadow: 'inset 0 0 0 1.5px var(--border)' };
                                            }

                                            return (
                                                <div key={day.dateStr} className="flex flex-col items-center gap-2.5 flex-1">
                                                    <div
                                                        className="text-[11px] font-bold uppercase transition-colors"
                                                        style={{ color: day.isToday ? '#ffffff' : '#52525b' }}
                                                    >
                                                        {day.dayName.charAt(0)}
                                                    </div>
                                                    <div className={circleClass} style={circleStyle}>
                                                        {isCompleted ? <Check size={14} strokeWidth={3} /> : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Bottom Action Bar */}
                                <div className="mt-auto flex items-center gap-3">
                                    <Button
                                        onClick={() => checkIn(habit.id)}
                                        disabled={doneToday}
                                        className={`flex-1 h-12 rounded-2xl text-[15px] font-bold transition-all duration-300 ${doneToday
                                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
                                            : "text-white hover:brightness-110 border-transparent shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                                            }`}
                                        style={!doneToday ? { backgroundColor: '#8b5cf6' } : {}}
                                    >
                                        {doneToday ? (
                                            <span className="flex items-center gap-2">Logged <Check size={16} strokeWidth={3} /></span>
                                        ) : (
                                            "Check In"
                                        )}
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="danger"
                                        onClick={() => handleDelete(habit.id)}
                                        className="w-12 h-12 rounded-2xl shrink-0 border border-red-500/10"
                                        style={{ backgroundColor: '#2a1414', color: '#ef4444' }}
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <Modal open={showModal} onClose={() => setShowModal(false)} className="max-w-md" title="Create New Habit">
                <form onSubmit={handleSave} className="p-6 space-y-5">
                    <div>
                        <Input
                            label="Habit Name"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Read 30 mins, Gym, Meditate"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <Input
                                label="Icon"
                                value={form.icon}
                                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                                className="text-center text-lg"
                                maxLength={2}
                            />
                        </div>
                        <div className="col-span-3">
                            <Select
                                label="Frequency"
                                value={form.frequency}
                                onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekdays">Weekdays (Mon-Fri)</option>
                                <option value="weekly">Weekly</option>
                            </Select>
                        </div>
                    </div>

                    {goals.length > 0 && (
                        <div>
                            <Select
                                label="Link to Goal (Optional)"
                                value={form.linked_goal_id}
                                onChange={e => setForm(f => ({ ...f, linked_goal_id: e.target.value }))}
                            >
                                <option value="">None</option>
                                {goals.map(g => (
                                    <option key={g.id} value={g.id}>{g.title}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div className="pt-2">
                        <div className="pt-2">
                            <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200">
                                Create Habit
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
