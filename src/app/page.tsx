import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Layout,
  BarChart3,
  Lock,
  Flame,
  BookOpen,
  ChevronRight,
  Terminal,
  Cpu
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Server-side auth check
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  } catch {
    // Supabase not configured, show landing page
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 overflow-x-hidden">

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-900/20">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="font-bold text-lg tracking-tight">FlowHaven</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-bold rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 z-10">
        <div className="max-w-5xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-white/10 text-xs font-medium text-zinc-300 mb-8 animate-fade-in hover:border-indigo-500/30 transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>v1.0 is now live</span>
            <span className="text-zinc-600 px-1">|</span>
            <span className="text-indigo-400 flex items-center gap-1">Read the launch post <ChevronRight size={10} /></span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 animate-fade-in leading-[1.1]">
            Focus on what <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 via-white to-zinc-500">
              truly matters.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in delay-100">
            The all-in-one productivity workspace. Manage tasks, build habits, track goals, and journal—all end-to-end encrypted.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in delay-200">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-white text-black font-bold rounded-2xl text-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-xl shadow-white/10"
            >
              Start for free <ArrowRight size={18} />
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-semibold rounded-2xl text-lg transition-all"
            >
              Explore features
            </Link>
          </div>
        </div>
      </section>

      {/* App Preview - Tilted Glass */}
      <section className="px-4 pb-24 z-10 relative perspective-1000">
        <div className="max-w-6xl mx-auto transform-gpu rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out group">
          <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {/* Window Controls */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5 bg-[#0c0c0e]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E] shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-inner" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-md text-[10px] text-zinc-500 font-mono border border-white/5">
                  <Lock size={10} /> flowhaven.app
                </div>
              </div>
              <div className="w-10" />
            </div>

            {/* Content Mockup */}
            <div className="relative aspect-[4/5] md:aspect-[21/9] bg-[#050505] flex overflow-hidden group/mockup select-none">
              {/* Sidebar Mockup */}
              <div className="w-64 border-r border-white/5 p-4 flex-col gap-2 hidden md:flex bg-[#09090b]">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400"><Zap size={12} fill="currentColor" /></div>
                  <span className="font-bold text-xs text-zinc-200">FlowHaven</span>
                </div>
                {["Dashboard", "Tasks", "Habits", "Focus", "Goals", "Journal"].map((item, idx) => (
                  <div key={item} className={`h-7 rounded-md w-full ${idx === 0 ? "bg-zinc-800 text-white shadow-inner" : "text-zinc-500"} flex items-center px-2.5 gap-2.5`}>
                    <div className={`w-3 h-3 rounded-full ${idx === 0 ? "bg-indigo-500" : "bg-zinc-800 border border-white/10"}`} />
                    <span className="text-[10px] font-medium">{item}</span>
                  </div>
                ))}

                <div className="mt-auto p-3 rounded-xl bg-zinc-900 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500" />
                    <div>
                      <div className="text-[10px] font-bold text-white leading-none">Alex Maker</div>
                      <div className="text-[8px] text-zinc-500">Pro Plan</div>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full w-[70%] bg-indigo-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Main Mockup Content */}
              <div className="flex-1 p-4 md:p-8 relative overflow-y-auto md:overflow-hidden no-scrollbar bg-[#050505]">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 md:mb-8">
                  <div>
                    <h3 className="text-lg md:text-2xl font-bold text-white mb-1">Good morning, Alex</h3>
                    <p className="text-xs text-zinc-500">You have <span className="text-indigo-400 font-medium">4 tasks</span> remaining today.</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400"><Lock size={12} /></div>
                    <div className="h-8 w-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400"><Zap size={12} /></div>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
                  <div className="h-20 md:h-24 bg-zinc-900/40 border border-white/5 rounded-xl p-3 md:p-4 flex flex-col justify-between hover:border-indigo-500/20 transition-colors">
                    <div className="flex items-center gap-2 text-indigo-400 mb-auto">
                      <CheckCircle2 size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Tasks</span>
                    </div>
                    <div>
                      <div className="text-lg md:text-2xl font-bold text-white">12</div>
                      <div className="text-[10px] text-zinc-500">Pending items</div>
                    </div>
                  </div>
                  <div className="h-20 md:h-24 bg-zinc-900/40 border border-white/5 rounded-xl p-3 md:p-4 flex flex-col justify-between hover:border-emerald-500/20 transition-colors">
                    <div className="flex items-center gap-2 text-emerald-400 mb-auto">
                      <Flame size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Streak</span>
                    </div>
                    <div>
                      <div className="text-lg md:text-2xl font-bold text-white">8</div>
                      <div className="text-[10px] text-zinc-500">Day streak</div>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1 h-20 md:h-24 bg-zinc-900/40 border border-white/5 rounded-xl p-3 md:p-4 flex flex-col justify-between hover:border-amber-500/20 transition-colors">
                    <div className="flex items-center gap-2 text-amber-400 mb-auto">
                      <BarChart3 size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Focus</span>
                    </div>
                    <div>
                      <div className="text-lg md:text-2xl font-bold text-white">85%</div>
                      <div className="text-[10px] text-zinc-500">Productivity</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* Task List */}
                  <div className="col-span-1 md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Today's Focus</h4>
                      <div className="text-[10px] text-zinc-500">Sort by: Priority</div>
                    </div>
                    {[
                      { t: "Review Design System", tag: "Design", c: "border-pink-500/20 text-pink-400 bg-pink-500/5" },
                      { t: "Quarterly Planning", tag: "Strategy", c: "border-blue-500/20 text-blue-400 bg-blue-500/5" },
                      { t: "Fix Mobile Navigation", tag: "Dev", c: "border-amber-500/20 text-amber-400 bg-amber-500/5" },
                    ].map((item, i) => (
                      <div key={i} className="h-10 md:h-12 bg-zinc-900/30 border border-white/5 rounded-lg w-full flex items-center px-3 md:px-4 gap-3 group hover:bg-zinc-900/60 transition-colors">
                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-md border-2 border-zinc-700 group-hover:border-indigo-500 transition-colors" />
                        <span className="text-xs md:text-sm text-zinc-300 font-medium">{item.t}</span>
                        <div className={`ml-auto px-2 py-0.5 text-[9px] md:text-[10px] rounded border ${item.c} font-bold`}>{item.tag}</div>
                      </div>
                    ))}
                  </div>

                  {/* Timer */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Timer</h4>
                    </div>
                    <div className="h-32 md:h-40 bg-gradient-to-b from-indigo-900/20 to-zinc-900/50 border border-indigo-500/20 rounded-xl relative overflow-hidden flex flex-col items-center justify-center text-center">
                      <div className="text-2xl md:text-3xl font-mono font-bold text-white mb-1">25:00</div>
                      <div className="text-[10px] text-indigo-300 font-medium px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">Focus Mode</div>

                      <div className="absolute inset-0 bg-indigo-500/5 blur-xl pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-white/5 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mb-8">Trusted by productive people at</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Simple Text Logos for Cleanliness */}
            {["ACME Corp", "Nebula", "Vertex", "Oasis", "Horizon"].map(name => (
              <span key={name} className="text-xl font-bold font-mono text-zinc-400">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need.<br />Nothing you don&apos;t.</h2>
            <p className="text-zinc-400 max-w-xl text-lg">We stripped away the clutter to build a workspace that allows for deep work and organized thought.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">

            {/* FEATURE 1: Focus Mode (Large) */}
            <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
              <div className="relative z-10 h-full flex flex-col">
                <div className="mb-auto">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400 border border-indigo-500/20"><TimerIcon /></div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Focus Mode</h3>
                  <p className="text-zinc-400 max-w-sm">Built-in Pomodoro timer with distraction blocking. Enter flow state with one click.</p>
                </div>

                {/* Visual */}
                <div className="mt-8 flex justify-end">
                  <div className="w-64 h-64 rounded-full border border-indigo-500/30 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full" />
                    <span className="text-5xl font-mono font-bold text-white tracking-widest">25:00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FEATURE 2: Habits (Tall) */}
            <div className="md:row-span-2 bg-zinc-900/50 border border-white/10 rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-400 border border-emerald-500/20"><Flame size={24} /></div>
              <h3 className="text-xl font-bold mb-2">Habit Tracking</h3>
              <p className="text-zinc-400 text-sm mb-8">Visualize your consistency with daily heatmaps.</p>

              <div className="flex-1 flex flex-col justify-end gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                    <span className="text-xs text-zinc-300">Read 30 mins</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(j => <div key={j} className={`w-2 h-2 rounded-sm ${j > 2 ? "bg-zinc-700" : "bg-emerald-500"}`} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FEATURE 3: Encryption (Wide) */}
            <div className="md:col-span-2 bg-gradient-to-r from-zinc-900 to-zinc-800 border border-white/10 rounded-3xl p-8 flex items-center justify-between group hover:border-amber-500/30 transition-colors relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-amber-400">
                  <Lock size={20} /> <span className="text-sm font-bold uppercase tracking-wider">End-to-End Encrypted</span>
                </div>
                <h3 className="text-xl font-bold mb-1">Your data is yours.</h3>
                <p className="text-zinc-400 text-sm">Client-side AES-256 encryption. We can't read your journal.</p>
              </div>
              <div className="text-zinc-800 group-hover:text-zinc-700 transition-colors">
                <Cpu size={120} strokeWidth={1} />
              </div>
            </div>

            {/* FEATURE 4: Command Palette (Small) */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 flex flex-col hover:border-white/20 transition-colors">
              <Terminal className="text-zinc-400 mb-4" />
              <h3 className="text-lg font-bold">Command Palette</h3>
              <div className="mt-auto flex gap-2">
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-xs border border-white/10">⌘</kbd>
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-xs border border-white/10">K</kbd>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonial / Final CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to get in flow?</h2>
          <div className="flex flex-col items-center gap-6">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-zinc-950 font-bold rounded-2xl text-xl transition-all shadow-xl shadow-indigo-500/20 hover:scale-105 hover:bg-zinc-100"
            >
              Join FlowHaven Free <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-zinc-500 text-sm">No credit card required · Free plan for everyone</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#08080a]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400"><Zap size={14} fill="currentColor" /></div>
              <span className="font-bold text-lg">FlowHaven</span>
            </div>
            <p className="text-zinc-500 text-sm max-w-xs">
              The productivity operating system for high performers.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 text-center text-zinc-600 text-sm">
          © 2026 FlowHaven Inc. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

function TimerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
