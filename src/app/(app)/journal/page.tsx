"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore, XP_REWARDS } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { awardXp } from "@/lib/xp";
import { encryptField } from "@/lib/crypto";
import { toast } from "sonner";
import { format } from "date-fns";
import { invalidateEntity } from "@/actions/data";
import { Lock, Sparkles, Save, History, Plus, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useJournal as useJournalData } from "@/hooks/useUserData";

// Mood definitions with refined colors
type Mood = 1 | 2 | 3 | 4 | 5;

const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
    { value: 1, emoji: "😞", label: "Rough", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    { value: 2, emoji: "😕", label: "Meh", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    { value: 3, emoji: "😐", label: "Okay", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    { value: 4, emoji: "😊", label: "Good", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { value: 5, emoji: "🤩", label: "Great", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
];

const PROMPTS = [
    "What are you grateful for today?",
    "What's one thing you accomplished?",
    "What challenged you today?",
    "How can you make tomorrow better?",
    "Describe a moment that made you smile.",
];

export default function JournalPage() {
    const { user, journalEntries, addJournalEntry, updateJournalEntry } = useAppStore();
    const { loadingMore, hasMore, loadMore } = useJournalData();
    const [content, setContent] = useState("");
    const [mood, setMood] = useState<Mood>(3);
    const [saving, setSaving] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    const [showHistoryMobile, setShowHistoryMobile] = useState(false);

    // Derived state
    const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
    const todayEntry = useMemo(() => journalEntries.find(e => e.date === today), [journalEntries, today]);

    // Initialize/Sync with Today's Entry
    useEffect(() => {
        if (selectedEntryId) {
            const entry = journalEntries.find(e => e.id === selectedEntryId);
            if (entry) {
                setContent(entry.content);
                setMood(entry.mood);
            }
        } else if (todayEntry) {
            setContent(todayEntry.content);
            setMood(todayEntry.mood);
        } else {
            setContent("");
            setMood(3);
        }
    }, [todayEntry, selectedEntryId, journalEntries]);

    const handleSave = async () => {
        if (!content.trim() || !user) return;
        setSaving(true);

        try {
            const supabase = createClient();
            const encContent = await encryptField(content);
            const now = new Date().toISOString();

            if (todayEntry && (!selectedEntryId || selectedEntryId === todayEntry.id)) {
                const { error } = await supabase
                    .from("journal_entries")
                    .update({ content: encContent, mood, updated_at: now })
                    .eq("id", todayEntry.id);
                if (error) throw error;
                updateJournalEntry(todayEntry.id, { content, mood });
                toast.success("Journal updated");
            }
            else if (selectedEntryId) {
                const { error } = await supabase
                    .from("journal_entries")
                    .update({ content: encContent, mood, updated_at: now })
                    .eq("id", selectedEntryId);
                if (error) throw error;
                updateJournalEntry(selectedEntryId, { content, mood });
                toast.success("Past entry updated");
            }
            else {
                const { data, error } = await supabase.from("journal_entries").insert({
                    content: encContent, mood, date: today,
                    user_id: user.id, created_at: now, updated_at: now
                }).select().single();
                if (error) throw error;
                if (data) {
                    addJournalEntry({ ...data, content });
                    await awardXp(XP_REWARDS.JOURNAL_ENTRY);
                    toast.success(`Journal saved! +${XP_REWARDS.JOURNAL_ENTRY} XP 🎉`);
                }
            }
            await invalidateEntity('journal');

        } catch (e) {
            console.error(e);
            toast.error("Failed to save journal");
        } finally {
            setSaving(false);
        }
    };

    const isTodayView = !selectedEntryId || (todayEntry && selectedEntryId === todayEntry.id);
    const viewingDate = selectedEntryId
        ? journalEntries.find(e => e.id === selectedEntryId)?.date
        : today;

    const formattedDate = viewingDate
        ? format(new Date(viewingDate + "T00:00:00"), "EEEE, MMM do")
        : format(new Date(), "EEEE, MMM do");

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6 relative">
            {/* Editor Area */}
            <div className="flex-1 flex flex-col h-full min-h-125">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isTodayView && <div className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-full w-fit">Today</div>}
                            {!isTodayView && <div className="px-2 py-0.5 text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded-full w-fit" style={{ background: 'var(--bg-elevated)' }}>History</div>}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-serif" style={{ color: 'var(--text-primary)' }}>{formattedDate}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Mobile History Toggle */}
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
                            className="lg:hidden rounded-full shadow-sm"
                        >
                            {showHistoryMobile ? <X size={18} /> : <History size={18} />}
                        </Button>

                        <Button
                            onClick={handleSave}
                            disabled={saving || !content.trim()}
                            isLoading={saving}
                            icon={!saving ? <Save size={18} /> : undefined}
                            className="rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                            style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
                        >
                            <span className="hidden md:inline">{saving ? "Saving..." : "Save Entry"}</span>
                            <span className="md:hidden">{saving ? "Saving" : "Save"}</span>
                        </Button>
                    </div>
                </div>

                {/* Main Card */}
                <div className="flex-1 surface-card rounded-3xl p-5 md:p-8 flex flex-col relative overflow-hidden ring-1 ring-(--border)" style={{ background: 'var(--bg-base)' }}>
                    {/* Prompt */}
                    {isTodayView && !content && (
                        <div className="mb-4 md:mb-6 flex gap-3 p-3 md:p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <Sparkles size={14} />
                            </div>
                            <div>
                                <p className="text-indigo-200/80 text-xs md:text-sm font-medium italic">&quot;{prompt}&quot;</p>
                            </div>
                        </div>
                    )}

                    {/* Mood Selector */}
                    <div className="flex items-center justify-center gap-2 mb-6 py-2">
                        {MOODS.map(m => (
                            <button
                                key={m.value}
                                onClick={() => setMood(m.value)}
                                className={`group relative w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-xl md:text-2xl transition-all duration-300 
                                    ${mood === m.value ? `${m.color} scale-110 shadow-lg ring-1 ring-white/10` : "text-zinc-500 hover:scale-105"}
                                `}
                                style={mood !== m.value ? { background: 'var(--bg-elevated)' } : undefined}
                                title={m.label}
                            >
                                <span className={mood === m.value ? "animate-bounce-subtle" : "grayscale group-hover:grayscale-0 transition-all"}>{m.emoji}</span>
                            </button>
                        ))}
                    </div>

                    {/* Text Area */}
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Start writing..."
                        className="flex-1 w-full bg-transparent text-base md:text-xl placeholder-zinc-500 font-serif leading-relaxed resize-none focus:outline-none custom-scrollbar p-1"
                        style={{ color: 'var(--text-primary)' }}
                        spellCheck={false}
                    />

                    {/* Footer Stats / Encryption Badge */}
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-zinc-600 font-mono">
                        <div>{content.length} chars</div>
                        <div className="flex items-center gap-1.5 text-emerald-500/50">
                            <Lock size={10} /> <span className="hidden md:inline">End-to-end Encrypted</span><span className="md:hidden">Encrypted</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar History (Desktop) */}
            <div className={`
                lg:w-80 shrink-0 flex flex-col h-full rounded-3xl border overflow-hidden backdrop-blur-xl lg:backdrop-blur-none
                fixed lg:relative inset-0 z-50 lg:z-auto transition-transform duration-300 ease-in-out
                ${showHistoryMobile ? "translate-y-0 mt-20 md:mt-0" : "translate-y-[110%] lg:translate-y-0"}
            `} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <History size={14} /> History
                    </h3>
                    <div className="flex gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setSelectedEntryId(null); setShowHistoryMobile(false); }}
                            className="rounded-full hover:bg-(--bg-surface) text-zinc-400"
                            title="New Entry"
                        >
                            <Plus size={16} />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setShowHistoryMobile(false)}
                            className="lg:hidden rounded-full hover:bg-(--bg-surface) text-zinc-400"
                        >
                            <ChevronDown size={16} />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {journalEntries.length === 0 ? (
                        <div className="text-center py-10 px-4 text-zinc-600 text-xs">
                            No entries yet. <br /> Your journey starts today.
                        </div>
                    ) : (
                        journalEntries
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(entry => {
                                const moodObj = MOODS.find(m => m.value === entry.mood);
                                const isSelected = selectedEntryId === entry.id || (!selectedEntryId && entry.date === today);

                                return (
                                    <div key={entry.id}
                                        onClick={() => { setSelectedEntryId(entry.id); setShowHistoryMobile(false); }}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border group ${isSelected
                                            ? "ring-1 ring-(--text-primary)/10"
                                            : "bg-transparent border-transparent hover:border-(--border)"}`}
                                        style={isSelected ? { background: 'var(--bg-elevated)', borderColor: 'var(--border)' } : {}}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <span className={`text-xs font-bold ${isSelected ? "" : "text-zinc-500 group-hover:text-zinc-400"}`} style={isSelected ? { color: 'var(--text-primary)' } : undefined}>
                                                {format(new Date(entry.date + "T00:00:00"), "MMM d")}
                                            </span>
                                            <span className="text-sm">{moodObj?.emoji}</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed opacity-80">
                                            {entry.content}
                                        </p>
                                    </div>
                                );
                            })
                    )}

                    {/* Load More */}
                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {loadingMore ? (
                                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            ) : null}
                            {loadingMore ? "Loading..." : "Load older entries"}
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile History Toggle Overlay Background */}
            {showHistoryMobile && (
                <div className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setShowHistoryMobile(false)} />
            )}
        </div>
    );
}
