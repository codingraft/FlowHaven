"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Search, Command, CheckSquare, Calendar, BarChart2, Book, Settings, LogOut, Sun } from "lucide-react";
import { toast } from "sonner";

type CommandItem = {
    id: string;
    label: string;
    icon: React.ReactNode;
    action: () => void;
    category: "Navigation" | "Actions" | "Tasks" | "Habits";
};

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const { tasks, habits } = useAppStore();
    const inputRef = useRef<HTMLInputElement>(null);

    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Focus input on open
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 10);
            setQuery("");
            setSelectedIndex(0);
        }
    }, [open]);

    // Build commands list
    const commands: CommandItem[] = [
        // Navigation
        { id: "nav-dashboard", label: "Go to Dashboard", icon: <Command size={14} />, category: "Navigation", action: () => router.push("/dashboard") },
        { id: "nav-tasks", label: "Go to Tasks", icon: <CheckSquare size={14} />, category: "Navigation", action: () => router.push("/tasks") },
        { id: "nav-habits", label: "Go to Habits", icon: <Calendar size={14} />, category: "Navigation", action: () => router.push("/habits") },
        { id: "nav-pomodoro", label: "Go to Focus Timer", icon: <Command size={14} />, category: "Navigation", action: () => router.push("/pomodoro") },
        { id: "nav-journal", label: "Go to Journal", icon: <Book size={14} />, category: "Navigation", action: () => router.push("/journal") },
        { id: "nav-analytics", label: "Go to Analytics", icon: <BarChart2 size={14} />, category: "Navigation", action: () => router.push("/analytics") },
        { id: "nav-review", label: "Weekly Review", icon: <Calendar size={14} />, category: "Navigation", action: () => router.push("/review") },
        { id: "nav-settings", label: "Go to Settings", icon: <Settings size={14} />, category: "Navigation", action: () => router.push("/settings") },

        // Actions
        { id: "act-theme", label: "Toggle Theme (Coming Soon)", icon: <Sun size={14} />, category: "Actions", action: () => toast.info("Theme toggle coming soon!") },
        { id: "act-logout", label: "Log Out", icon: <LogOut size={14} />, category: "Actions", action: () => router.push("/settings") },
    ];

    // Add tasks
    tasks.slice(0, 5).forEach(task => { // Add recent 5 tasks
        commands.push({
            id: `task-${task.id}`,
            label: `Task: ${task.title}`,
            icon: <CheckSquare size={14} className="text-zinc-500" />,
            category: "Tasks",
            action: () => { router.push("/tasks"); toast.info(`Opened task: ${task.title}`); }
        });
    });

    // Add habits
    habits.forEach(habit => {
        commands.push({
            id: `habit-${habit.id}`,
            label: `Habit: ${habit.name}`,
            icon: <span className="text-xs">{habit.icon}</span>,
            category: "Habits",
            action: () => { router.push("/habits"); }
        });
    });

    // Filter
    const filtered = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
    );

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % filtered.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    filtered[selectedIndex].action();
                    setOpen(false);
                }
            } else if (e.key === "Escape") {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, filtered, selectedIndex]);

    return (
        <>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
                    {/* Backdrop */}
                    <div
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay"
                    />

                    {/* Window */}
                    <div
                        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] animate-modal-content"
                    >
                        {/* Input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                            <Search size={18} className="text-zinc-500" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent text-zinc-200 placeholder-zinc-600 focus:outline-none text-sm"
                            />
                            <div className="text-[10px] font-mono bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-700">ESC</div>
                        </div>

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {filtered.length === 0 ? (
                                <div className="py-8 text-center text-zinc-600 text-sm">No results found.</div>
                            ) : (
                                <div className="space-y-1">
                                    {filtered.map((cmd, i) => (
                                        <div
                                            key={cmd.id}
                                            onClick={() => { cmd.action(); setOpen(false); }}
                                            onMouseEnter={() => setSelectedIndex(i)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${i === selectedIndex ? "bg-indigo-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                                }`}
                                        >
                                            <div className={`flex items-center justify-center w-5 h-5 ${i === selectedIndex ? "text-white" : "text-zinc-500 opacity-70"}`}>
                                                {cmd.icon}
                                            </div>
                                            <span className="flex-1 truncate">{cmd.label}</span>
                                            {i === selectedIndex && (
                                                <span className="text-[10px] opacity-60">↵</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 bg-zinc-950/50 border-t border-zinc-800 text-[10px] text-zinc-600 flex justify-between">
                            <span>FlowHaven Command</span>
                            <span>{filtered.length} results</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
