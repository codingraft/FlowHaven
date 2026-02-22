"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAppStore, getLevelInfo } from "@/lib/store";
import { clearSessionKey, restoreSessionKey } from "@/lib/crypto";
import { toast } from "sonner";

import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import PageTransition from "@/components/PageTransition";
import NextTopLoader from "nextjs-toploader";
import { LayoutDashboard, CheckSquare, Flame, Timer, Target, BookOpen, BarChart2, X, Settings as SettingsIcon, LogOut, Zap, Waypoints } from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
    { href: "/tasks", icon: <CheckSquare size={16} />, label: "Tasks" },
    { href: "/habits", icon: <Flame size={16} />, label: "Habits" },
    { href: "/pomodoro", icon: <Timer size={16} />, label: "Focus" },
    { href: "/goals", icon: <Target size={16} />, label: "Goals" },
    { href: "/journal", icon: <BookOpen size={16} />, label: "Journal" },
    { href: "/analytics", icon: <BarChart2 size={16} />, label: "Analytics" },
    { href: "/graph", icon: <Waypoints size={16} />, label: "Knowledge Graph" },
];

type Theme = "dark" | "light";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, setUser, tasks, clearData } = useAppStore();
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === "undefined") return "dark";
        const saved = localStorage.getItem("flowhaven-theme") as Theme | null;
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return saved || (systemDark ? "dark" : "light");
    });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    // Load profile — middleware already guards auth, so we just fetch the profile
    useEffect(() => {
        let cancelled = false;
        const supabase = createClient();

        async function loadProfile(userId: string) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (cancelled) return;
            if (profile) {
                // CRITICAL: Restore the encryption key BEFORE setting user,
                // because setUser triggers useUserData which decrypts data.
                await restoreSessionKey();
                setUser(profile);
            }
            setAuthLoading(false);
        }

        (async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (cancelled) return;

            if (authUser) {
                await loadProfile(authUser.id);
            }
            // If still no user, middleware will handle the redirect on next navigation
        })();

        return () => { cancelled = true; };
    }, [setUser]);

    // Theme logic — synced with globals.css (html.light scoping)
    useEffect(() => {
        if (theme === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === "dark" ? "light" : "dark";
            localStorage.setItem("flowhaven-theme", next);
            if (next === "light") {
                document.documentElement.classList.add("light");
                document.documentElement.classList.remove("dark");
            } else {
                document.documentElement.classList.add("dark");
                document.documentElement.classList.remove("light");
            }
            return next;
        });
    }, []);

    // Data is fetched lazily by each page via per-entity hooks (useTasks, useHabits, etc.)

    const handleLogout = useCallback(async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        clearSessionKey();
        clearData(); // reset dataLoaded so next session re-fetches fresh data
        setUser(null);
        toast.success("Signed out successfully");
        router.push("/auth/login");
    }, [router, setUser, clearData]);

    const levelInfo = useMemo(() => user ? getLevelInfo(user.xp) : null, [user]);
    const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);

    // ─── Early return after all hooks ──────────────────────────────────────
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
                <div className="text-center animate-fade-in">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-600 to-violet-800 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-900/40">
                        <Zap size={24} className="text-white" />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading FlowHaven...</p>
                </div>
            </div>
        );
    }

    const pageTitles: Record<string, string> = {
        "/dashboard": "Dashboard",
        "/tasks": "Tasks",
        "/habits": "Habits",
        "/pomodoro": "Focus Timer",
        "/goals": "Goals",
        "/journal": "Journal",
        "/analytics": "Analytics",
        "/graph": "Knowledge Graph",
        "/settings": "Settings",
    };

    return (
        <div className="flex min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
            <NextTopLoader color="var(--text-primary)" showSpinner={false} />
            {/* Sidebar overlay (mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 bottom-0 w-64 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    }`}
                style={{ background: 'var(--bg-base)', borderRight: '1px solid var(--border)' }}
            >
                {/* Logo */}
                <div className="flex items-center justify-between px-6 py-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                        </div>
                        <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>FlowHaven</span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden transition-colors p-1"
                        style={{ color: 'var(--text-secondary)' }}
                        aria-label="Close sidebar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* User info */}
                <div className="px-4 py-4 mx-2 mb-2 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {user?.name?.[0]?.toUpperCase() ?? "U"}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{user?.name ?? "Loading..."}</div>
                            <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                Lvl {levelInfo?.current.level ?? 1} · {levelInfo?.current.name ?? "Beginner"}
                            </div>
                        </div>
                    </div>

                    {/* XP bar - Minimal */}
                    <div className="mt-3">
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                style={{ width: `${levelInfo?.progress ?? 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group"
                                style={active
                                    ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                                    : { color: 'var(--text-secondary)' }
                                }
                            >
                                <span style={{ color: active ? 'var(--accent-light)' : 'var(--text-secondary)' }}>{item.icon}</span>
                                <span className="flex-1">{item.label}</span>
                                {item.href === "/tasks" && pendingTasks > 0 && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md min-w-4.5 text-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                        {pendingTasks}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-3 pb-4 pt-3 space-y-0.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}>
                    <Link
                        href="/settings"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        style={pathname === "/settings"
                            ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                            : { color: 'var(--text-secondary)' }
                        }
                    >
                        <SettingsIcon size={16} />
                        <span>Settings</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col lg:ml-64 min-h-screen min-w-0 overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
                {/* Topbar */}
                <header className="sticky top-0 z-30 flex items-center justify-between px-6 h-14 backdrop-blur-md" style={{ background: 'color-mix(in srgb, var(--bg-base) 80%, transparent)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-1.5 rounded-md transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pageTitles[pathname] ?? "FlowHaven"}</h1>
                    </div>

                    {/* Search Trigger */}
                    <div className="hidden md:flex flex-1 max-w-md mx-6">
                        <button
                            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all group"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        >
                            <div className="flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                <span className="text-xs">Search...</span>
                            </div>
                            <div className="flex gap-1">
                                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>⌘K</kbd>
                            </div>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Streak */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/10">
                            <Flame size={14} className="text-orange-400" />
                            <span className="text-xs font-semibold text-orange-400">{user?.streak ?? 0}</span>
                        </div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all border border-transparent"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {theme === "dark" ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="5" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                            ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </header>

                {/* Page content with transition */}
                <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full relative z-0 overflow-x-hidden">
                    <PageTransition>{children}</PageTransition>
                </main>
            </div>

            <CommandPalette />
            <KeyboardShortcuts />
        </div>
    );
}
