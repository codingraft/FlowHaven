"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { deriveKey, generateSalt, setSessionKey, saltFromBase64 } from "@/lib/crypto";
import { toast } from "sonner";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState(false);

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        setLoading(true);

        try {
            const supabase = createClient();

            // Generate encryption salt for this user
            const saltB64 = generateSalt();
            const salt = saltFromBase64(saltB64);
            const key = await deriveKey(password, salt);

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name, encryption_salt: saltB64 },
                },
            });

            if (error) {
                toast.error(error.message);
                setLoading(false);
                return;
            }

            if (data.user) {
                // Create profile row
                await supabase.from("profiles").upsert({
                    id: data.user.id,
                    name,
                    email,
                    xp: 0,
                    level: 1,
                    streak: 0,
                    last_active: new Date().toISOString().split("T")[0],
                    is_pro: false,
                    encryption_salt: saltB64,
                    created_at: new Date().toISOString(),
                });

                // Check if session was created (no email confirmation required)
                if (data.session) {
                    await setSessionKey(key, salt);
                    toast.success("Account created! Welcome to FlowHaven 🎉");
                    router.push("/onboarding");
                } else {
                    // Email confirmation required
                    setConfirmEmail(true);
                    setLoading(false);
                }
            }
        } catch {
            toast.error("Something went wrong. Please try again.");
            setLoading(false);
        }
    }

    const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;


    return (
        <main className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <Link href="/" className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-8 group">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 group-hover:-translate-x-1 transition-transform"><path d="M15 18l-6-6 6-6" /></svg>
                    Back to Home
                </Link>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-6 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create an account</h1>
                    <p className="text-zinc-400 text-sm">Enter your details to get started with FlowHaven</p>
                </div>

                {confirmEmail ? (
                    <div className="bg-[#09090b] border border-white/10 rounded-2xl p-8 text-center animate-fade-in shadow-2xl">
                        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 animate-pulse">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="M3 7l9 6 9-6" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
                        <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                            We used <span className="text-white font-medium">{email}</span> to sign you up.
                            Click the link in the email to complete your registration.
                        </p>
                        <Link
                            href="/auth/login"
                            className="inline-flex items-center justify-center w-full px-4 py-3 bg-white text-zinc-950 text-sm font-bold rounded-xl transition-all hover:bg-zinc-200"
                        >
                            Back to Sign In
                        </Link>
                        <p className="text-zinc-500 text-xs mt-6">
                            Did not receive the email? Check your spam folder.
                        </p>
                    </div>
                ) : (
                    <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 sm:p-8 animate-fade-in shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50" />

                        <form onSubmit={handleSignup} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                                    placeholder="John Doe"
                                    required
                                    autoComplete="name"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                                    placeholder="name@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 pr-10 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                                        placeholder="Min 8 chars"
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                                    >
                                        {showPass ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>

                                {/* Strength indicator - Premium */}
                                {password.length > 0 && (
                                    <div className="flex gap-1.5 h-1 mt-3 overflow-hidden rounded-full opacity-80">
                                        <div className={`flex-1 transition-all duration-500 ${strength >= 0 ? (strength === 0 ? "bg-red-500" : strength === 1 ? "bg-orange-500" : strength === 2 ? "bg-yellow-400" : "bg-emerald-500") : "bg-zinc-800"}`} />
                                        <div className={`flex-1 transition-all duration-500 ${strength >= 2 ? (strength === 2 ? "bg-yellow-400" : "bg-emerald-500") : "bg-zinc-800"}`} />
                                        <div className={`flex-1 transition-all duration-500 ${strength >= 3 ? "bg-emerald-500" : "bg-zinc-800"}`} />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-white text-zinc-950 text-sm font-bold rounded-xl transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-zinc-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Creating account...
                                    </span>
                                ) : "Create Account"}
                            </button>

                            <p className="text-xs text-center text-zinc-500 mt-4 leading-relaxed px-4">
                                By signing up, you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </form>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-center text-sm text-zinc-500">
                        Already have an account?{" "}
                        <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
