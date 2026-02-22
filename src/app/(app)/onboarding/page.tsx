"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { awardXp } from "@/lib/xp";
import { encryptField } from "@/lib/crypto";
import { toast } from "sonner";
import {
  Zap,
  Flame,
  Target,
  Dumbbell,
  BookOpen,
  Scale,
  Timer,
  BarChart2,
  Lock,
  CheckCircle2,
  Pencil,
  Droplets,
  Brain,
  NotebookPen,
  BellOff,
} from "lucide-react";

const GOALS = [
  { id: "productivity", label: "Be more productive", icon: <Zap size={20} /> },
  { id: "habits", label: "Build better habits", icon: <Flame size={20} /> },
  { id: "focus", label: "Improve my focus", icon: <Target size={20} /> },
  { id: "health", label: "Improve my health", icon: <Dumbbell size={20} /> },
  { id: "learning", label: "Learn new skills", icon: <BookOpen size={20} /> },
  {
    id: "balance",
    label: "Achieve work-life balance",
    icon: <Scale size={20} />,
  },
];

const HABIT_SUGGESTIONS = [
  { name: "Morning workout", icon: <Dumbbell size={18} /> },
  { name: "Read for 30 mins", icon: <BookOpen size={18} /> },
  { name: "Drink 8 glasses of water", icon: <Droplets size={18} /> },
  { name: "Meditate", icon: <Brain size={18} /> },
  { name: "Journal daily", icon: <NotebookPen size={18} /> },
  { name: "No social media before noon", icon: <BellOff size={18} /> },
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [customHabit, setCustomHabit] = useState("");
  const [pomoDuration, setPomoDuration] = useState(25);
  const [loading, setLoading] = useState(false);

  function toggleGoal(id: string) {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  async function handleFinish() {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();

    // Save first habit if selected
    const habitName = selectedHabit === "custom" ? customHabit : selectedHabit;
    if (habitName) {
      const encName = await encryptField(habitName);
      await supabase.from("habits").insert({
        user_id: user.id,
        name: encName,
        icon: "🔥",
        frequency: "daily",
        completions: [],
        streak: 0,
        best_streak: 0,
      });
    }

    // Award welcome XP & mark onboarded
    await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
    await awardXp(100);
    toast.success("Welcome to FlowHaven! +100 XP 🎉");
    router.push("/dashboard");
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-zinc-800 rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div key={step} className="animate-fade-in">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-3">
                  Welcome, {user?.name?.split(" ")[0] ?? "there"}!
                </h1>
                <p className="text-zinc-400">
                  Let&apos;s set up your workspace in 2 minutes.
                </p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-zinc-200">
                  What you&apos;ll get:
                </h3>
                {[
                  {
                    icon: <CheckCircle2 size={16} />,
                    text: "Task manager with priorities",
                  },
                  {
                    icon: <Flame size={16} />,
                    text: "Habit tracker with streaks",
                  },
                  { icon: <Timer size={16} />, text: "Pomodoro focus timer" },
                  {
                    icon: <BarChart2 size={16} />,
                    text: "Analytics & insights",
                  },
                  {
                    icon: <Lock size={16} />,
                    text: "End-to-end encrypted data",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm text-zinc-300"
                  >
                    <span className="text-indigo-400 shrink-0">
                      {item.icon}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition-all"
              >
                Let&apos;s go →
              </button>
            </div>
          )}

          {/* Step 2: Goals */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  What are your goals?
                </h1>
                <p className="text-zinc-400 text-sm">Select all that apply.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${selectedGoals.includes(goal.id)
                        ? "bg-indigo-500/10 border-indigo-500/40 text-white"
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                  >
                    <span className="text-indigo-400 shrink-0">
                      {goal.icon}
                    </span>
                    <span className="text-sm font-medium">{goal.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-700 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: First Habit */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  Start your first habit
                </h1>
                <p className="text-zinc-400 text-sm">
                  Pick one to begin. You can add more later.
                </p>
              </div>
              <div className="space-y-2">
                {HABIT_SUGGESTIONS.map((h) => (
                  <button
                    key={h.name}
                    onClick={() => setSelectedHabit(h.name)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${selectedHabit === h.name
                        ? "bg-indigo-500/10 border-indigo-500/40 text-white"
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                  >
                    <span className="text-zinc-400 shrink-0">{h.icon}</span>
                    <span className="text-sm font-medium">{h.name}</span>
                  </button>
                ))}
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedHabit === "custom" ? "border-indigo-500/40 bg-indigo-500/10" : "border-zinc-800"}`}
                >
                  <Pencil size={16} className="text-zinc-500 shrink-0" />
                  <input
                    type="text"
                    value={customHabit}
                    onChange={(e) => {
                      setCustomHabit(e.target.value);
                      setSelectedHabit("custom");
                    }}
                    placeholder="Or type your own..."
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-700 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Focus Preference */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  How long can you focus?
                </h1>
                <p className="text-zinc-400 text-sm">
                  Set your default Pomodoro duration.
                </p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
                <div className="text-6xl font-bold text-white mb-2">
                  {pomoDuration}
                </div>
                <div className="text-zinc-500 mb-6">minutes</div>
                <input
                  type="range"
                  min={15}
                  max={60}
                  step={5}
                  value={pomoDuration}
                  onChange={(e) => setPomoDuration(+e.target.value)}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-zinc-600 mt-2">
                  <span>15 min</span>
                  <span>60 min</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-700 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? "Setting up..." : "Start FlowHaven"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
