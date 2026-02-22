import { createClient } from "@supabase/supabase-js";
import { deriveKey, encrypt, saltFromBase64, generateSalt } from "../src/lib/crypto";

// We need a fresh server-side client with the anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const DUMMY_TASKS = [
    { title: "Review Q3 Marketing Strategy", notes: "Check budget allocations", priority: "high" },
    { title: "Prepare for board meeting", notes: "Slides need updates", priority: "high" },
    { title: "Weekly grocery run", notes: null, priority: "low" },
    { title: "Call Mom", notes: "Ask about her weekend", priority: "medium" },
    { title: "Read Chapter 4 of Clean Code", notes: null, priority: "medium" },
    { title: "Renew gym membership", notes: null, priority: "low" },
    { title: "Fix bug in payment gateway", notes: "Ticket #1024", priority: "high" },
    { title: "Plan vacation itinerary", notes: "Look up Airbnbs in Kyoto", priority: "medium" }
];

const DUMMY_HABITS = [
    { name: "Morning Meditation", icon: "🧘‍♂️", frequency: "daily" },
    { name: "Drink 2L Water", icon: "💧", frequency: "daily" },
    { name: "Read 10 Pages", icon: "📚", frequency: "daily" },
    { name: "Workout", icon: "💪", frequency: "custom" },
];

const DUMMY_GOALS = [
    { title: "Run a Marathon", description: "Complete the local city marathon in under 4 hours.", category: "health" },
    { title: "Learn Spanish", description: "Reach B2 conversational level.", category: "personal" },
    { title: "Save $10,000", description: "Emergency fund savings.", category: "finance" },
];

const DUMMY_POMODORO = [
    { task: "Design System Updates", duration: 25, completed: true },
    { task: "Emails & Slack", duration: 25, completed: true },
    { task: "Deep Work: React refactor", duration: 25, completed: true },
    { task: "Deep Work: React refactor", duration: 25, completed: true },
    { task: "Code Review", duration: 25, completed: true },
];

const DUMMY_JOURNAL = [
    "Today was a highly productive day. I finally got around to fixing that pesky bug in the authentication flow that's been bothering me all week. It feels great to cross that off the list.",
    "Felt a bit overwhelmed this morning with all the emails, but using the Pomodoro timer really helped me focus. Re-centered myself during the afternoon break.",
    "Had a great workout session! Hit a new personal record on the bench press. Consistency is definitely paying off.",
    "Spent the evening reading. I'm really enjoying this new sci-fi book. It's nice to disconnect from screens for a bit.",
    "Reflecting on the past week, I need to get better at prioritizing my sleep. 6 hours just isn't cutting it. I'll aim for 8 hours starting tonight."
];

async function seed() {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("Signing in as demo user...");
        let userId: string;
        let authData;
        let authErr;

        ({ data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: "testdemo@fitcrypt.app",
            password: "password123",
        }));

        if (authErr || !authData.user) {
            console.log("Login failed or user not found. Attempting to sign up...");
            const saltB64 = generateSalt();

            ({ data: authData, error: authErr } = await supabase.auth.signUp({
                email: "testdemo@fitcrypt.app",
                password: "password123",
                options: {
                    data: { name: "Demo User", encryption_salt: saltB64 },
                },
            }));

            if (authErr || !authData.user) {
                console.error("Failed to sign up demo user either", authErr);
                process.exit(1);
            }

            userId = authData.user.id;
            console.log(`Signed up new user. ID: ${userId}`);

            // Insert initial profile
            await supabase.from("profiles").upsert({
                id: userId,
                name: "Demo User",
                email: "demo@gmail.com",
                xp: 0,
                level: 1,
                streak: 0,
                last_active: new Date().toISOString().split("T")[0],
                is_pro: false,
                encryption_salt: saltB64,
                created_at: new Date().toISOString(),
            });

        } else {
            userId = authData.user.id;
            console.log(`Logged in. ID: ${userId}`);
        }

        console.log("Fetching profile...");
        const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("encryption_salt")
            .eq("id", userId)
            .single();

        if (profileErr) {
            console.error("Failed to fetch profile:", profileErr);
        }

        if (!profile?.encryption_salt) {
            console.error("Demo user has no encryption salt in profile.");
            process.exit(1);
        }

        console.log("Deriving key...");
        // Polyfill crypto if needed, though Node 19+ has it globally.
        // If it throws, we can handle it, but tsx usually loads Node globals.
        const salt = saltFromBase64(profile.encryption_salt);
        const key = await deriveKey("password123", salt);

        console.log("Encrypting and preparing data...");
        // 1. Tasks
        const tasksToInsert = await Promise.all(
            DUMMY_TASKS.map(async (t) => ({
                user_id: userId,
                title: await encrypt(t.title, key),
                notes: t.notes ? await encrypt(t.notes, key) : null,
                priority: t.priority,
                completed: Math.random() > 0.5,
                due_date: new Date(Date.now() + (Math.random() * 10 - 5) * 86400000).toISOString().split('T')[0], // Random due date within +/- 5 days
                created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
            }))
        );

        // 2. Habits
        const habitsToInsert = await Promise.all(
            DUMMY_HABITS.map(async (h) => {
                const completions: string[] = [];
                const now = new Date();
                for (let i = 0; i < 14; i++) {
                    if (Math.random() > 0.3) {
                        const d = new Date();
                        d.setDate(now.getDate() - i);
                        completions.push(d.toISOString().split('T')[0]);
                    }
                }

                return {
                    user_id: userId,
                    name: await encrypt(h.name, key),
                    icon: h.icon,
                    frequency: h.frequency,
                    completions,
                    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
                };
            })
        );

        // 3. Goals
        const goalsToInsert = await Promise.all(
            DUMMY_GOALS.map(async (g) => ({
                user_id: userId,
                title: await encrypt(g.title, key),
                description: await encrypt(g.description, key),
                category: g.category,
                progress: Math.floor(Math.random() * 80) + 10,
                target_date: new Date(Date.now() + Math.random() * 86400000 * 90).toISOString().split('T')[0],
                created_at: new Date().toISOString(),
            }))
        );

        // 4. Pomodoro Sessions
        const pomodoroToInsert = await Promise.all(
            DUMMY_POMODORO.map(async (p, idx) => ({
                user_id: userId,
                task_name: await encrypt(p.task, key),
                duration: p.duration,
                completed: p.completed,
                started_at: new Date(Date.now() - (idx * 3600000 + 86400000)).toISOString(),
            }))
        );

        // 5. Journal Entries
        const journalToInsert = await Promise.all(
            DUMMY_JOURNAL.map(async (j, idx) => ({
                user_id: userId,
                content: await encrypt(j, key),
                mood: Math.floor(Math.random() * 3) + 3,
                date: new Date(Date.now() - idx * 86400000).toISOString().split('T')[0],
                created_at: new Date(Date.now() - idx * 86400000).toISOString(),
            }))
        );

        console.log("Clearing old data...");
        await supabase.from("tasks").delete().eq("user_id", userId);
        await supabase.from("habits").delete().eq("user_id", userId);
        await supabase.from("goals").delete().eq("user_id", userId);
        await supabase.from("pomodoro_sessions").delete().eq("user_id", userId);
        await supabase.from("journal_entries").delete().eq("user_id", userId);

        console.log("Inserting new data...");
        await supabase.from("tasks").insert(tasksToInsert);
        await supabase.from("habits").insert(habitsToInsert);
        await supabase.from("goals").insert(goalsToInsert);
        await supabase.from("pomodoro_sessions").insert(pomodoroToInsert);
        await supabase.from("journal_entries").insert(journalToInsert);

        console.log("Updating XP...");
        await supabase.from("profiles").update({ xp: 1250, streak: 12 }).eq("id", userId);

        console.log("Demo data seeded successfully!");
        process.exit(0);

    } catch (e: any) {
        console.error("Seeding error:", e);
        process.exit(1);
    }
}

seed();
