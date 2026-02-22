"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { encryptField } from "@/lib/crypto";
import { invalidateEntity } from "@/actions/data";
import { toast } from "sonner";
import { Plus, Target, Trophy, X, Dumbbell, Briefcase, DollarSign, GraduationCap, Sprout, TrendingUp } from "lucide-react";

import { GoalCard } from "@/components/GoalCard";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Layout";
import { Input, Select } from "@/components/ui/Form";
import { DatePicker } from "@/components/ui/DatePicker";
import { useGoals as useGoalsData } from "@/hooks/useUserData";

const CATEGORIES: Record<string, { icon: React.ReactNode; label: string }> = {
    health: { icon: <Dumbbell size={18} />, label: "Health" },
    career: { icon: <Briefcase size={18} />, label: "Career" },
    finance: { icon: <DollarSign size={18} />, label: "Finance" },
    learning: { icon: <GraduationCap size={18} />, label: "Learning" },
    personal: { icon: <Sprout size={18} />, label: "Personal" },
};

export default function GoalsPage() {
    const { user, goals, setGoals, addGoal, updateGoal, deleteGoal } = useAppStore();
    const { loading } = useGoalsData();

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", category: "personal", target_date: "" });

    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const supabase = createClient();
        const encTitle = await encryptField(form.title);
        const encDesc = form.description ? await encryptField(form.description) : null;

        const { data } = await supabase.from("goals").insert({
            title: encTitle, description: encDesc,
            category: form.category, target_date: form.target_date || null,
            progress: 0, completed: false,
            user_id: user.id, created_at: new Date().toISOString(),
        }).select().single();

        if (data) addGoal({ ...data, title: form.title, description: form.description });
        setShowModal(false);
        setForm({ title: "", description: "", category: "personal", target_date: "" });
        toast.success("Goal added! Break it down into tasks to make progress 🎯");
        await invalidateEntity('goals');
    }, [user, form, addGoal]);

    const active = useMemo(() => goals.filter(g => !g.completed), [goals]);
    const completed = useMemo(() => goals.filter(g => g.completed), [goals]);

    // Calculate overall progress
    const overallProgress = useMemo(() => {
        if (active.length === 0) return 0;
        const totalProgress = active.reduce((acc, g) => acc + g.progress, 0);
        return Math.round(totalProgress / active.length);
    }, [active]);

    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <PageHeader
                title="Goals"
                description="Turn your vision into reality. Track your progress one step at a time."
            >
                {/* Stats Widget */}
                {active.length > 0 && (
                    <div className="flex items-center gap-6 px-5 py-3 rounded-xl drop-shadow-lg scale-90 md:scale-100 origin-right transition-transform" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Target size={20} />
                            </div>
                            <div>
                                <div className="text-xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{active.length}</div>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active</div>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <div className="text-xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{overallProgress}%</div>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Avg. Progress</div>
                            </div>
                        </div>

                        <Button
                            size="icon"
                            onClick={() => setShowModal(true)}
                            className="ml-2 rounded-full hidden md:flex shadow-lg bg-white text-black hover:bg-zinc-200"
                        >
                            <Plus size={20} />
                        </Button>
                    </div>
                )}
                {active.length === 0 && (
                    <Button
                        onClick={() => setShowModal(true)}
                        className="rounded-full shadow-lg"
                        icon={<Plus size={18} />}
                    >
                        New Goal
                    </Button>
                )}
            </PageHeader>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-zinc-900/50 rounded-3xl animate-pulse border border-white/5" />)}
                </div>
            ) : goals.length === 0 ? (
                <div className="text-center py-24 rounded-3xl border border-dashed" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-600 ring-1 ring-white/5" style={{ background: 'var(--bg-elevated)' }}>
                        <Target size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Active Goals</h3>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-8">&quot;A goal without a plan is just a wish.&quot;<br />Start by defining what you want to achieve.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {active.map(goal => (
                        <GoalCard key={goal.id} goal={goal} />
                    ))}

                    {/* Add New Placeholder Card */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="group relative overflow-hidden rounded-3xl border-2 border-dashed bg-transparent transition-all p-6 flex flex-col items-center justify-center gap-4 min-h-50"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        <div className="w-16 h-16 rounded-full border flex items-center justify-center text-zinc-600 group-hover:scale-110 transition-transform duration-500"
                            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                            <Plus size={24} />
                        </div>
                        <span className="font-bold text-zinc-500 group-hover:text-zinc-300">Create New Goal</span>
                    </button>

                    {completed.length > 0 && (
                        <div className="md:col-span-2 lg:col-span-3 mt-12">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-800 to-transparent" />
                                <h3 className="font-bold text-zinc-500 text-sm flex items-center gap-2 uppercase tracking-widest">
                                    <Trophy size={14} /> Achieved ({completed.length})
                                </h3>
                                <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-800 to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70 hover:opacity-100 transition-duration-500">
                                {completed.map(goal => (
                                    <div key={goal.id} className="group relative overflow-hidden rounded-2xl p-5 bg-linear-to-br from-zinc-900/50 to-emerald-950/20 border border-emerald-500/10 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                            <Trophy size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-zinc-300 truncate">{goal.title}</div>
                                            <div className="text-xs text-emerald-500 font-medium mt-0.5">Completed</div>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!confirm("Delete this completed goal?")) return;
                                                const supabase = createClient();
                                                await supabase.from("goals").delete().eq("id", goal.id);
                                                deleteGoal(goal.id);
                                                toast.success("Goal deleted");
                                                await invalidateEntity('goals');
                                            }}
                                            className="w-8 h-8 rounded-full hover:bg-zinc-800 text-zinc-600 hover:text-red-400"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal open={showModal} onClose={() => setShowModal(false)} className="max-w-md" title="New Goal">
                <form onSubmit={handleSave} className="p-6 space-y-5">
                    <div>
                        <Input
                            label="Goal Title"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Save $10,000"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Why includes this?</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full px-4 py-3 border rounded-xl placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm resize-none"
                            style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            placeholder="Motivation keeps you going..." rows={2} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Select
                                label="Category"
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            >
                                {Object.entries(CATEGORIES).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <DatePicker
                                label="Target Date"
                                value={form.target_date}
                                onChange={val => setForm(f => ({ ...f, target_date: val }))}
                                placeholder="Select a date"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">
                            Create Goal
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
