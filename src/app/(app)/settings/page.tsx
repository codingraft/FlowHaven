"use client";

import { useAppStore, getLevelInfo } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { clearSessionKey } from "@/lib/crypto";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
    LogOut,
    Crown,
    Zap,
    Flame,
    CheckCircle2,
    Shield,
    ChevronRight,
    Moon,
    Sun,
    Laptop,
    User,
    Mail
} from "lucide-react";

const NEXT_BILLING_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

export default function SettingsPage() {
    const { user, setUser, tasks, clearData } = useAppStore();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const levelInfo = useMemo(() => user ? getLevelInfo(user.xp) : null, [user]);
    const completedTasks = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);

    async function handleLogout() {
        setLoading(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        clearSessionKey();
        clearData();
        setUser(null);
        toast.success("See you next time! 👋");
        router.push("/auth/login");
    }


    const STATS = [
        { label: "Day Streak", value: user?.streak ?? 0, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
        { label: "Total XP", value: user?.xp ?? 0, icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
        { label: "Tasks Done", value: completedTasks, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in active:fade-out slide-in-from-bottom-4 duration-500">

            {/* Hero Section */}
            <div className="relative group">
                <div className="absolute inset-0 bg-linear-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl rounded-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="relative surface-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 backdrop-blur-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(to bottom right, var(--bg-elevated), var(--bg-surface))', borderColor: 'var(--bg-base)' }}>
                            <span className="text-4xl md:text-5xl font-bold text-zinc-500">
                                {user?.name?.[0]?.toUpperCase() ?? "U"}
                            </span>
                        </div>
                        <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full" style={{ background: 'var(--bg-surface)' }}>
                            <div className="bg-indigo-500 text-white text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-400/30 shadow-lg shadow-indigo-900/50">
                                Lvl {levelInfo?.current.level}
                            </div>
                        </div>
                    </div>

                    {/* Info & Progress */}
                    <div className="flex-1 w-full text-center md:text-left space-y-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">{user?.name}</h1>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-zinc-500 font-medium">
                                <Mail size={14} />
                                <span className="text-sm">{user?.email}</span>
                                {user?.is_pro && (
                                    <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-linear-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/30">
                                        PRO
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* XP Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-zinc-400">
                                    <span className="text-indigo-400">{levelInfo?.xpInLevel} XP</span> / {levelInfo?.xpNeeded} XP
                                </span>
                                <span className="text-zinc-500">{levelInfo?.progress}% to Level {levelInfo?.next.level}</span>
                            </div>
                            <div className="h-2.5 w-full bg-zinc-800/50 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-size-[200%_100%] animate-shimmer rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${levelInfo?.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STATS.map((stat) => (
                    <div key={stat.label} className="surface-card p-5 rounded-2xl flex items-center gap-4 hover:bg-zinc-800/50 transition-colors group">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={22} className={stat.color} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white tabular-nums">{stat.value}</div>
                            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Settings */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Account Settings */}
                    <section>
                        <h3 className="text-sm font-semibold text-zinc-400 mb-4 px-1 uppercase tracking-wider">Account</h3>
                        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors text-left group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-zinc-200">Personal Information</div>
                                        <div className="text-xs text-zinc-500">Update your name and profile details</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                            </button>

                            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors text-left group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                                        <Shield size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-zinc-200">Security</div>
                                        <div className="text-xs text-zinc-500">Password, 2FA, and sessions</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                            </button>
                        </div>
                    </section>

                    {/* Preferences */}
                    <section>
                        <h3 className="text-sm font-semibold text-zinc-400 mb-4 px-1 uppercase tracking-wider">App Preferences</h3>
                        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-400">
                                        <Moon size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-zinc-200">Appearance</div>
                                        <div className="text-xs text-zinc-500">Customize your interface theme</div>
                                    </div>
                                </div>
                                <div className="flex bg-zinc-900 p-1 rounded-lg">
                                    <button className="p-1.5 rounded-md bg-zinc-800 text-white shadow-sm"><Moon size={14} /></button>
                                    <button className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300"><Sun size={14} /></button>
                                    <button className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300"><Laptop size={14} /></button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Danger Zone */}
                    <section>
                        <h3 className="text-sm font-semibold text-red-500/80 mb-4 px-1 uppercase tracking-wider">Danger Zone</h3>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl overflow-hidden p-1">
                            <button
                                onClick={handleLogout}
                                disabled={loading}
                                className="w-full flex items-center gap-3 p-4 hover:bg-red-500/10 rounded-xl transition-colors text-left text-red-400 group"
                            >
                                <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-sm">Sign Out</span>
                            </button>
                        </div>
                    </section>
                </div>

                {/* Right Column: Pro Banner */}
                <div className="lg:col-span-1">
                    {!user?.is_pro ? (
                        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-linear-to-b from-[#1a1a20] to-[#09090b]">
                            {/* Decorative gradients */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -translate-x-10 translate-y-10" />

                            <div className="relative p-6 flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/20 mb-4">
                                    <Crown size={28} className="text-white" fill="currentColor" />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h3>
                                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                                    Unlock unlimited habits, streak freezes, advanced analytics, and support independent creators.
                                </p>

                                <div className="w-full space-y-3 mb-8">
                                    {["Unlimited Habits", "Streak Freeze (3x/mo)", "Data Export", "Priority Support"].map(feature => (
                                        <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                                            <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400"><CheckCircle2 size={10} strokeWidth={4} /></div>
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => toast.info("Payment gateway coming soon!")}
                                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
                                >
                                    Get Pro · $4.99/mo
                                </button>
                                <p className="text-[10px] text-zinc-500 mt-3 font-medium">7-day money-back guarantee</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-amber-500/20 flex flex-col items-center text-center">
                            <Crown size={48} className="text-amber-400 mb-4" />
                            <h3 className="text-lg font-bold text-white">You are a Pro Member</h3>
                            <p className="text-sm text-zinc-500 mt-2">Thank you for supporting FlowHaven!</p>
                            <div className="mt-6 w-full py-2 bg-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
                                Next billing: {NEXT_BILLING_DATE}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
