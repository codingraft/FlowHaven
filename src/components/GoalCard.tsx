"use client";

import { useState, useEffect, useCallback, memo } from "react";
import React from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import type { Goal } from "@/lib/store";
import { invalidateEntity } from "@/actions/data";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { Trash2, Dumbbell, Briefcase, DollarSign, GraduationCap, Sprout, Plus, Minus, Trophy } from "lucide-react";

const CATEGORIES: Record<string, { icon: React.ReactNode; label: string; color: string; gradient: string; border: string }> = {
    health: { icon: <Dumbbell size={20} />, label: "Health", color: "text-emerald-400", border: "border-emerald-500/20", gradient: "from-emerald-500/20 to-teal-500/5" },
    career: { icon: <Briefcase size={20} />, label: "Career", color: "text-blue-400", border: "border-blue-500/20", gradient: "from-blue-500/20 to-indigo-500/5" },
    finance: { icon: <DollarSign size={20} />, label: "Finance", color: "text-amber-400", border: "border-amber-500/20", gradient: "from-amber-500/20 to-orange-500/5" },
    learning: { icon: <GraduationCap size={20} />, label: "Learning", color: "text-violet-400", border: "border-violet-500/20", gradient: "from-violet-500/20 to-fuchsia-500/5" },
    personal: { icon: <Sprout size={20} />, label: "Personal", color: "text-pink-400", border: "border-pink-500/20", gradient: "from-pink-500/20 to-rose-500/5" },
};

export const GoalCard = memo(function GoalCard({ goal }: { goal: Goal }) {
    const { updateGoal, deleteGoal } = useAppStore();
    const [progress, setProgress] = useState(goal.progress);
    const debouncedProgress = useDebounce(progress, 800);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Sync state
    useEffect(() => { setProgress(goal.progress); }, [goal.progress]);

    // Handle debounced update
    useEffect(() => {
        if (debouncedProgress !== goal.progress) {
            handleUpdate(debouncedProgress);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedProgress]);

    const handleUpdate = async (newProgress: number) => {
        const supabase = createClient();
        const completed = newProgress >= 100;
        updateGoal(goal.id, { progress: newProgress, completed });

        const { error } = await supabase.from("goals").update({ progress: newProgress, completed }).eq("id", goal.id);

        if (error) {
            toast.error("Failed to update goal");
        } else {
            if (completed && !goal.completed) toast.success("🎉 Goal completed! Amazing work!");
            await invalidateEntity('goals');
        }
    };

    const handleDelete = useCallback(async () => {
        const supabase = createClient();
        const { error } = await supabase.from("goals").delete().eq("id", goal.id);
        if (!error) {
            deleteGoal(goal.id);
            toast.success("Goal deleted");
            await invalidateEntity('goals');
        } else {
            toast.error("Failed to delete goal");
        }
    }, [goal.id, deleteGoal]);

    const cat = CATEGORIES[goal.category] || CATEGORIES.personal;

    // Days left calculation
    const daysLeft = goal.target_date
        ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    const adjustProgress = (amount: number) => {
        setProgress(p => Math.min(100, Math.max(0, p + amount)));
    };

    return (
        <div className={`group relative overflow-hidden rounded-3xl border backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:shadow-black/5 ${cat.border}`}
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-linear-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

            <div className="relative z-10 p-6 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${cat.color}`} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                            {cat.icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] uppercase tracking-wider font-bold ${cat.color} opacity-80`}>{cat.label}</span>
                                {goal.completed && <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded ml-2">DONE</span>}
                            </div>
                            <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>{goal.title}</h3>
                        </div>
                    </div>
                </div>

                {/* Description - Optional */}
                {goal.description && (
                    <p className="text-sm text-zinc-400 mb-6 line-clamp-2 leading-relaxed font-medium">
                        {goal.description}
                    </p>
                )}

                {/* Progress Circle & Controls */}
                <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-zinc-500">Progress</div>
                        <div className={`text-xl font-bold ${progress === 100 ? "text-emerald-400" : ""}`} style={progress !== 100 ? { color: 'var(--text-primary)' } : undefined}>{progress}%</div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="relative h-4 rounded-full border overflow-hidden shadow-inner group/bar cursor-pointer" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                        <div
                            className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-full bg-linear-to-r ${progress === 100 ? "from-emerald-500 to-teal-400" : cat.gradient.replace('/20', '').replace('/5', '')}`} /* Hacky gradient fix for reuse */
                            style={{ width: `${progress}%` }}
                        />
                        {/* Interactive Slider Input */}
                        <input
                            type="range" min={0} max={100} value={progress}
                            onChange={e => setProgress(+e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                            title="Drag to set progress"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => adjustProgress(-5)}
                                className="w-8 h-8 rounded-lg border text-zinc-400 hover:text-(--text-primary) hover:bg-(--bg-surface) flex items-center justify-center transition-colors active:scale-95"
                                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
                            >
                                <Minus size={14} />
                            </button>
                            <button
                                onClick={() => adjustProgress(5)}
                                className="w-8 h-8 rounded-lg border text-zinc-400 hover:text-(--text-primary) hover:bg-(--bg-surface) flex items-center justify-center transition-colors active:scale-95"
                                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Days Left / Delete */}
                        <div className="flex items-center gap-3">
                            {daysLeft !== null && (
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${daysLeft < 0 ? "text-red-400" : daysLeft < 3 ? "text-amber-400" : "text-zinc-500"
                                    }`}>
                                    {daysLeft < 0 ? "Overdue" : daysLeft === 0 ? "Due Today" : `${daysLeft}d left`}
                                </span>
                            )}

                            {confirmDelete ? (
                                <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 font-bold px-2">Confirm</button>
                            ) : (
                                <button onClick={() => setConfirmDelete(true)} className="text-zinc-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
