"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useAppStore, XP_REWARDS } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { awardXp } from "@/lib/xp";
import { encryptField } from "@/lib/crypto";
import { invalidateEntity } from "@/actions/data";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, Settings2, SkipForward, CheckCircle2 } from "lucide-react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { usePomodoro as usePomodoroData } from "@/hooks/useUserData";

type Phase = "work" | "break" | "longBreak";

const PHASES: Record<Phase, { label: string; color: string; duration: number; message: string }> = {
    work: { label: "Focus", color: "text-indigo-400", duration: 25, message: "Time to flow." },
    break: { label: "Short Break", color: "text-emerald-400", duration: 5, message: "Take a breath." },
    longBreak: { label: "Long Break", color: "text-blue-400", duration: 15, message: "Refresh your mind." },
};

export default function PomodoroPage() {
    const { user, pomodoroSessions, addPomodoroSession } = useAppStore();
    usePomodoroData();
    const [phase, setPhase] = useState<Phase>("work");
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [running, setRunning] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);
    const [taskName, setTaskName] = useState("");
    const [customWork, setCustomWork] = useState(25);
    const [customBreak, setCustomBreak] = useState(5);
    const [showSettings, setShowSettings] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false); // Placeholder for sound logic

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<Date | null>(null);
    const handleCompleteRef = useRef<(() => Promise<void>) | null>(null);

    // Calculations
    const totalTime = useMemo(
        () => (phase === "work" ? customWork : phase === "break" ? customBreak : 15) * 60,
        [phase, customWork, customBreak]
    );
    const progress = useMemo(() => ((totalTime - timeLeft) / totalTime) * 100, [totalTime, timeLeft]);

    // Timer text
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const secs = (timeLeft % 60).toString().padStart(2, "0");

    // Title update
    useEffect(() => {
        document.title = running ? `${mins}:${secs} - ${PHASES[phase].label}` : "FlowHaven Focus";
    }, [mins, secs, running, phase]);

    const handleSessionComplete = useCallback(async () => {
        if (phase !== "work") {
            toast.success("Break over! Ready to focus? 💪");
            // Auto-switch to work? Maybe better to wait for user intervention
            setPhase("work");
            setTimeLeft(customWork * 60);
            return;
        }

        const supabase = createClient();
        const encTask = taskName ? await encryptField(taskName) : null;
        const now = new Date();
        const startedAt = startTimeRef.current ?? now;

        const session = {
            duration: customWork, // Log the intended duration
            task_name: encTask,
            completed: true,
            started_at: startedAt.toISOString(),
            user_id: user!.id,
        };

        // Optimistic update handled by addPomodoroSession if we wanted, but let's wait for DB
        const { data } = await supabase.from("pomodoro_sessions").insert(session).select().single();
        if (data) addPomodoroSession({ ...data, task_name: taskName });

        await awardXp(XP_REWARDS.POMODORO_COMPLETE);

        const newCount = sessionCount + 1;
        setSessionCount(newCount);
        startTimeRef.current = null;

        toast.success(`🍅 +${XP_REWARDS.POMODORO_COMPLETE} XP`);
        await invalidateEntity('pomodoro');

        if (newCount % 4 === 0) {
            setPhase("longBreak");
            setTimeLeft(15 * 60);
        } else {
            setPhase("break");
            setTimeLeft(customBreak * 60);
        }
        setRunning(false);
    }, [phase, taskName, customWork, customBreak, user, sessionCount, addPomodoroSession]);

    // Refs
    useEffect(() => { handleCompleteRef.current = handleSessionComplete; }, [handleSessionComplete]);

    // Timer Logic
    useEffect(() => {
        if (running) {
            if (!startTimeRef.current) startTimeRef.current = new Date();
            intervalRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t <= 1) {
                        clearInterval(intervalRef.current!);
                        setRunning(false);
                        handleCompleteRef.current?.();
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [running]);

    // Controls
    const toggleTimer = () => setRunning(r => !r);

    const resetTimer = () => {
        setRunning(false);
        startTimeRef.current = null;
        setTimeLeft((phase === "work" ? customWork : phase === "break" ? customBreak : 15) * 60);
    };

    const skipPhase = () => {
        setRunning(false);
        handleSessionComplete();
    };

    // Calculate stroke
    const radius = 140; // Desktop radius
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Color logic
    const activeColorClass = phase === "work" ? "text-indigo-400" : phase === "break" ? "text-emerald-400" : "text-blue-400";
    const activeStrokeColor = phase === "work" ? "#818cf8" : phase === "break" ? "#34d399" : "#60a5fa";

    // Today stats
    const todaySessions = pomodoroSessions.filter(s =>
        s.started_at.startsWith(new Date().toISOString().split("T")[0]) && s.completed
    );
    const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] relative mx-auto max-w-lg">

            {/* Ambient Background Glow */}
            <div className={`absolute inset-0 bg-radial-gradient from-${phase === "work" ? "indigo" : phase === "break" ? "emerald" : "blue"}-500/10 to-transparent opacity-50 blur-3xl -z-10`} />

            {/* Header / Task Input */}
            <div className="w-full text-center mb-12 relative z-10">
                <input
                    type="text"
                    value={taskName}
                    onChange={e => setTaskName(e.target.value)}
                    placeholder="What are you working on?"
                    className="w-full bg-transparent text-center text-2xl md:text-4xl font-bold placeholder-zinc-800/50 focus:outline-none focus:placeholder-zinc-700 transition-all font-serif"
                    style={{ color: 'var(--text-primary)' }}
                />
                <div className={`mt-2 text-sm font-medium uppercase tracking-widest ${activeColorClass} opacity-80`}>
                    {running ? PHASES[phase].message : "Ready to start?"}
                </div>
            </div>

            {/* Main Timer */}
            <div className="relative mb-12 group">
                <div className="relative w-75 h-75 md:w-87.5 md:h-87.5">
                    <svg className="w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 320 320">
                        {/* Background Track */}
                        <circle cx="160" cy="160" r={radius} fill="none" stroke="#27272a" strokeWidth="6" className="opacity-30" />

                        {/* Progress Ring with Glow */}
                        <circle
                            cx="160" cy="160" r={radius}
                            fill="none"
                            stroke={activeStrokeColor}
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                            style={{ filter: `drop-shadow(0 0 10px ${activeStrokeColor}60)` }}
                        />
                    </svg>

                    {/* Time Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`text-7xl md:text-8xl font-light tracking-tighter font-mono transition-all ${running ? "scale-105" : "scale-100"}`} style={{ color: 'var(--text-primary)' }}>
                            {mins}:{secs}
                        </div>
                        <div className="flex items-center gap-2 mt-4 text-zinc-500 text-sm font-medium px-3 py-1 rounded-full border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                            <span className={`w-2 h-2 rounded-full ${running ? "bg-red-500 animate-pulse" : "bg-zinc-600"}`} />
                            {running ? "Timer Running" : "Timer Paused"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Primary Controls */}
            <div className="flex items-center gap-6 md:gap-8 z-10">
                <Button
                    onClick={resetTimer}
                    variant="outline"
                    className="w-12 h-12 rounded-full border bg-(--bg-surface) hover:bg-(--bg-elevated)"
                    title="Reset"
                >
                    <RotateCcw size={20} />
                </Button>

                <button
                    onClick={toggleTimer}
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all
                        ${phase === "work" ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30" :
                            phase === "break" ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30" :
                                "bg-blue-600 hover:bg-blue-500 shadow-blue-900/30"}`}
                >
                    {running ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
                </button>

                <Button
                    onClick={skipPhase}
                    variant="outline"
                    className="w-12 h-12 rounded-full border bg-(--bg-surface) hover:bg-(--bg-elevated)"
                    title="Skip"
                >
                    <SkipForward size={20} />
                </Button>
            </div>

            {/* Footer / Stats Toggle */}
            <div className="mt-12 flex items-center gap-4 text-sm text-zinc-500">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="gap-2 text-zinc-500 hover:text-zinc-300"
                >
                    <Settings2 size={16} /> <span className="hidden md:inline">Settings</span>
                </Button>
                <div className="w-px h-4 bg-zinc-800" />
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className={todaySessions.length > 0 ? "text-indigo-400" : ""} />
                    <span>{todaySessions.length} sessions ({todayMinutes}m)</span>
                </div>
            </div>

            {/* Settings Modal */}
            <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Timer Settings">
                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between text-sm font-medium text-zinc-300 mb-3">
                            <span>Focus Duration</span>
                            <span className="text-indigo-400">{customWork} min</span>
                        </div>
                        <input
                            type="range" min={1} max={60} value={customWork}
                            onChange={e => {
                                const val = +e.target.value;
                                setCustomWork(val);
                                if (phase === "work" && !running) setTimeLeft(val * 60);
                            }}
                            className="w-full accent-indigo-500 h-1.5 rounded-lg appearance-none cursor-pointer"
                            style={{ background: 'var(--bg-elevated)' }}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between text-sm font-medium text-zinc-300 mb-3">
                            <span>Short Break</span>
                            <span className="text-emerald-400">{customBreak} min</span>
                        </div>
                        <input
                            type="range" min={1} max={30} value={customBreak}
                            onChange={e => {
                                const val = +e.target.value;
                                setCustomBreak(val);
                                if (phase === "break" && !running) setTimeLeft(val * 60);
                            }}
                            className="w-full accent-emerald-500 h-1.5 rounded-lg appearance-none cursor-pointer"
                            style={{ background: 'var(--bg-elevated)' }}
                        />
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Sound Effects</span>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={soundEnabled ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : ""}
                        >
                            {soundEnabled ? "On" : "Off"}
                        </Button>
                    </div>

                    <div className="pt-2">
                        <Button onClick={() => setShowSettings(false)} className="w-full" variant="secondary">
                            Done
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
