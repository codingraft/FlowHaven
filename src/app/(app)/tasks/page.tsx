"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppStore, XP_REWARDS } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { awardXp } from "@/lib/xp";
import { encryptField } from "@/lib/crypto";
import { invalidateEntity } from "@/actions/data";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import Modal from "@/components/Modal";
import { useConfetti } from "@/hooks/useConfetti";
import { useTasks as useTasksData } from "@/hooks/useUserData";
import { Sparkles, Plus, Pencil, Trash2, Calendar, Check, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Layout";
import { Input, Select } from "@/components/ui/Form";
import { DatePicker } from "@/components/ui/DatePicker";

type Priority = "low" | "medium" | "high";
type Filter = "all" | "today" | "pending" | "completed";
type Sort = "priority" | "due_date" | "created_at";

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_CONFIG = {
    high: { label: "High", color: "bg-red-500/20 text-red-300 border-red-500/30" },
    medium: { label: "Medium", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    low: { label: "Low", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

function formatDueDate(dateStr: string): { label: string; overdue: boolean } {
    try {
        const date = parseISO(dateStr);
        if (isToday(date)) return { label: "Due today", overdue: false };
        if (isTomorrow(date)) return { label: "Due tomorrow", overdue: false };
        if (isPast(date)) {
            const days = Math.ceil((Date.now() - date.getTime()) / 86400000);
            return { label: `${days}d overdue`, overdue: true };
        }
        return { label: format(date, "MMM d"), overdue: false };
    } catch {
        return { label: dateStr, overdue: false };
    }
}

export default function TasksPage() {
    const { user, tasks, goals, addTask, updateTask, deleteTask } = useAppStore();
    const { loading, loadingMore, hasMore, loadMore } = useTasksData();

    const [filter, setFilter] = useState<Filter>("pending");
    const [sort, setSort] = useState<Sort>("priority");
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ title: "", notes: "", priority: "medium" as Priority, due_date: "", linked_goal_id: "" });
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
    const triggerConfetti = useConfetti();

    // Per-filter counts for tab badges
    const counts = useMemo(() => ({
        all: tasks.length,
        pending: tasks.filter(t => !t.completed).length,
        today: tasks.filter(t => !t.completed && t.due_date === today).length,
        completed: tasks.filter(t => t.completed).length,
    }), [tasks, today]);

    const filtered = useMemo(() => {
        const base = tasks.filter((t) => {
            if (filter === "today") return !t.completed && t.due_date === today;
            if (filter === "pending") return !t.completed;
            if (filter === "completed") return t.completed;
            return true;
        });

        return [...base].sort((a, b) => {
            if (sort === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
            if (sort === "due_date") {
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return a.due_date.localeCompare(b.due_date);
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [tasks, filter, sort, today]);

    const closeModal = useCallback(() => {
        setShowModal(false);
        setEditId(null);
        setForm({ title: "", notes: "", priority: "medium", due_date: "", linked_goal_id: "" });
    }, []);

    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const supabase = createClient();

        const encTitle = await encryptField(form.title);
        const encNotes = form.notes ? await encryptField(form.notes) : null;

        if (editId) {
            await supabase.from("tasks").update({
                title: encTitle, notes: encNotes, priority: form.priority, due_date: form.due_date || null,
                linked_goal_id: form.linked_goal_id || null,
            }).eq("id", editId);
            updateTask(editId, { title: form.title, notes: form.notes, priority: form.priority, due_date: form.due_date, linked_goal_id: form.linked_goal_id || undefined });
            toast.success("Task updated");
        } else {
            const { data } = await supabase.from("tasks").insert({
                title: encTitle, notes: encNotes, priority: form.priority, due_date: form.due_date || null,
                linked_goal_id: form.linked_goal_id || null,
                completed: false, user_id: user.id, created_at: new Date().toISOString(),
            }).select().single();
            if (data) addTask({ ...data, title: form.title, notes: form.notes });
            toast.success("Task created!");
        }

        await invalidateEntity('tasks');
        closeModal();
    }, [user, form, editId, updateTask, addTask, closeModal]);

    const toggleComplete = useCallback(async (taskId: string, completed: boolean) => {
        const supabase = createClient();
        const now = new Date().toISOString();
        await supabase.from("tasks").update({ completed: !completed, completed_at: !completed ? now : null }).eq("id", taskId);
        updateTask(taskId, { completed: !completed, completed_at: !completed ? now : undefined });

        if (!completed) {
            await awardXp(XP_REWARDS.TASK_COMPLETE);
            toast.success(`+${XP_REWARDS.TASK_COMPLETE} XP earned!`);
            triggerConfetti();
        }
        await invalidateEntity('tasks');
    }, [updateTask, triggerConfetti]);

    const handleDelete = useCallback(async (taskId: string) => {
        const supabase = createClient();
        await supabase.from("tasks").delete().eq("id", taskId);
        deleteTask(taskId);
        setConfirmDeleteId(null);
        toast.success("Task deleted");
        await invalidateEntity('tasks');
    }, [deleteTask]);

    const openEdit = useCallback((task: typeof tasks[0]) => {
        setForm({ title: task.title, notes: task.notes ?? "", priority: task.priority, due_date: task.due_date ?? "", linked_goal_id: task.linked_goal_id ?? "" });
        setEditId(task.id);
        setShowModal(true);
    }, []);

    const FILTERS: { key: Filter; label: string }[] = [
        { key: "pending", label: "Pending" },
        { key: "today", label: "Due Today" },
        { key: "completed", label: "Completed" },
        { key: "all", label: "All" },
    ];

    const SORTS: { key: Sort; label: string }[] = [
        { key: "priority", label: "Priority" },
        { key: "due_date", label: "Due Date" },
        { key: "created_at", label: "Newest" },
    ];

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <PageHeader
                title="Tasks"
                description={`${counts.pending} pending · ${counts.completed} completed`}
            >
                <Button
                    onClick={() => { setEditId(null); setForm({ title: "", notes: "", priority: "medium", due_date: "", linked_goal_id: "" }); setShowModal(true); }}
                    icon={<Plus size={16} />}
                >
                    Add Task
                </Button>
            </PageHeader>

            {/* Filters + Sort */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex p-1 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.key
                                ? "shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                }`}
                            style={filter === f.key ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' } : undefined}
                        >
                            {f.label}
                            {counts[f.key] > 0 && (
                                <span className={`text-[10px] px-1.5 rounded-full font-semibold leading-5 min-w-4.5 text-center ${filter === f.key ? "bg-zinc-700 text-zinc-300" : "bg-zinc-800 text-zinc-500"
                                    }`}>
                                    {counts[f.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <ArrowDownUp size={13} className="text-zinc-600" />
                    <div className="flex p-1 rounded-lg border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                        {SORTS.map((s) => (
                            <button
                                key={s.key}
                                onClick={() => setSort(s.key)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${sort === s.key
                                    ? "shadow-sm"
                                    : "text-zinc-600 hover:text-zinc-400"
                                    }`}
                                style={sort === s.key ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' } : undefined}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Task list */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 border rounded-xl border-dashed" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex justify-center mb-3 text-zinc-700">
                        <Sparkles size={28} />
                    </div>
                    <h3 className="font-medium text-zinc-400 mb-1">
                        {filter === "completed" ? "No completed tasks yet" : "No tasks here"}
                    </h3>
                    <p className="text-zinc-600 text-sm">
                        {filter === "pending" ? "You're all caught up!" : "Add a task to get started."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((task) => {
                        const due = task.due_date ? formatDueDate(task.due_date) : null;
                        const isConfirmingDelete = confirmDeleteId === task.id;

                        return (
                            <div
                                key={task.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all group ${task.completed
                                    ? "border-white/2 opacity-50"
                                    : task.priority === "high"
                                        ? "border-red-500/10 hover:border-red-500/20"
                                        : "border-(--border) hover:border-(--border-strong)"
                                    }`}
                                style={{
                                    background: task.completed ? 'var(--bg-base)' : 'var(--bg-surface)'
                                }}
                            >
                                {/* Complete toggle */}
                                <button
                                    onClick={() => toggleComplete(task.id, task.completed)}
                                    className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition-all flex items-center justify-center ${task.completed
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "border-zinc-600 hover:border-indigo-500 hover:bg-indigo-500/20 text-transparent hover:text-indigo-400"
                                        }`}
                                    title={task.completed ? "Mark incomplete" : "Mark complete"}
                                >
                                    <Check size={10} strokeWidth={3} />
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${task.completed ? "line-through text-zinc-500" : ""}`} style={!task.completed ? { color: 'var(--text-primary)' } : undefined}>
                                        {task.title}
                                    </p>
                                    {task.notes && (
                                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{task.notes}</p>
                                    )}
                                    {due && (
                                        <p className={`text-[10px] mt-1.5 flex items-center gap-1 font-medium ${due.overdue && !task.completed ? "text-red-400" : "text-zinc-500"
                                            }`}>
                                            <Calendar size={9} />
                                            {due.label}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${PRIORITY_CONFIG[task.priority].color}`}>
                                        {PRIORITY_CONFIG[task.priority].label}
                                    </span>

                                    {isConfirmingDelete ? (
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-zinc-500">Delete?</span>
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                                            >
                                                Yes
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
                                            >
                                                No
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(task)}
                                                className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
                                                title="Edit task"
                                            >
                                                <Pencil size={13} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setConfirmDeleteId(task.id)}
                                                className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                                                title="Delete task"
                                            >
                                                <Trash2 size={13} />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load More */}
            {!loading && hasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl border transition-all disabled:opacity-50"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                        {loadingMore ? (
                            <>
                                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                Loading...
                            </>
                        ) : (
                            <>Load more tasks</>
                        )}
                    </button>
                </div>
            )}

            {/* Modal */}
            <Modal
                open={showModal}
                onClose={closeModal}
                className="max-w-md"
                title={editId ? "Edit Task" : "New Task"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <Input
                            label="Task Name"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Finish project report"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Notes <span className="text-zinc-600 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none text-sm min-h-20"
                            style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            placeholder="Add any details..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Select
                                label="Priority"
                                value={form.priority}
                                onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </Select>
                        </div>
                        <div>
                            <DatePicker
                                label="Due Date"
                                value={form.due_date}
                                onChange={val => setForm(f => ({ ...f, due_date: val }))}
                                placeholder="No due date"
                            />
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
                        <Button type="submit" className="w-full">
                            {editId ? "Save Changes" : "Create Task"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
