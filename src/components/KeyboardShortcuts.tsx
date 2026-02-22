"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS = [
    { keys: ["G", "D"], description: "Go to Dashboard" },
    { keys: ["G", "T"], description: "Go to Tasks" },
    { keys: ["G", "H"], description: "Go to Habits" },
    { keys: ["G", "F"], description: "Go to Focus Timer" },
    { keys: ["G", "J"], description: "Go to Journal" },
    { keys: ["G", "A"], description: "Go to Analytics" },
    { keys: ["G", "S"], description: "Go to Settings" },
    { keys: ["⌘", "K"], description: "Open Command Palette" },
    { keys: ["?"], description: "Show keyboard shortcuts" },
];

export default function KeyboardShortcuts() {
    const router = useRouter();
    const [showHelp, setShowHelp] = useState(false);
    const [pendingKey, setPendingKey] = useState<string | null>(null);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't fire when typing in inputs/textareas
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

            const key = e.key.toUpperCase();

            // Show help modal
            if (key === "?" || e.key === "/") {
                e.preventDefault();
                setShowHelp(prev => !prev);
                return;
            }

            // Escape closes help
            if (e.key === "Escape") {
                setShowHelp(false);
                setPendingKey(null);
                return;
            }

            // "G" prefix navigation
            if (key === "G" && !e.metaKey && !e.ctrlKey) {
                setPendingKey("G");
                timeout = setTimeout(() => setPendingKey(null), 1500);
                return;
            }

            if (pendingKey === "G") {
                clearTimeout(timeout);
                setPendingKey(null);
                const routes: Record<string, string> = {
                    D: "/dashboard",
                    T: "/tasks",
                    H: "/habits",
                    F: "/pomodoro",
                    J: "/journal",
                    A: "/analytics",
                    S: "/settings",
                    R: "/review",
                };
                if (routes[key]) {
                    router.push(routes[key]);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            clearTimeout(timeout);
        };
    }, [router, pendingKey]);

    return (
        <>
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        onClick={() => setShowHelp(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay"
                    />
                    <div
                        className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-modal-content"
                    >
                        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="font-semibold text-zinc-200 text-sm">Keyboard Shortcuts</h2>
                            <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">ESC</button>
                        </div>
                        <div className="p-4 space-y-1">
                            {SHORTCUTS.map((s, i) => (
                                <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                                    <span className="text-sm text-zinc-400">{s.description}</span>
                                    <div className="flex gap-1">
                                        {s.keys.map((k, j) => (
                                            <kbd key={j} className="px-2 py-0.5 text-[11px] font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-300">{k}</kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-5 py-3 bg-zinc-950/50 border-t border-zinc-800 text-[10px] text-zinc-600">
                            Press <kbd className="px-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-500">?</kbd> to toggle this panel
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
