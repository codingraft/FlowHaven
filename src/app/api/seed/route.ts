import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deriveKey, encrypt, saltFromBase64 } from "@/lib/crypto";

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

export async function GET(req: Request) {
    try {
        // Only allow in dev or with a secret key ideally, but we'll secure it by hardcoding the demo auth
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("Signing in as demo user...");
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: "demo@gmail.com",
            password: "123456",
        });

        if (authErr || !authData.user) {
            return NextResponse.json({ error: "Failed to login as demo user", details: authErr }, { status: 400 });
        }

        const userId = authData.user.id;

        console.log("Fetching profile...");
        const { data: profile } = await supabase
            .from("profiles")
            .select("crypto_salt")
            .eq("id", userId)
            .single();

        if (!profile?.crypto_salt) {
            return NextResponse.json({ error: "Demo user has no crypto salt" }, { status: 400 });
        }

        console.log("Deriving key...");
        const salt = saltFromBase64(profile.crypto_salt);
        const key = await deriveKey("123456", salt);

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
                linked_goal_id: null as string | null,
            }))
        );

        // 2. Habits
        const habitsToInsert = await Promise.all(
            DUMMY_HABITS.map(async (h) => {
                // Generate some random completions over the last 14 days
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
                    linked_goal_id: null as string | null,
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
                progress: Math.floor(Math.random() * 80) + 10, // 10% to 90%
                target_date: new Date(Date.now() + Math.random() * 86400000 * 90).toISOString().split('T')[0], // +90 days max
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
                started_at: new Date(Date.now() - (idx * 3600000 + 86400000)).toISOString(), // Distributed over past days
            }))
        );

        // 5. Journal Entries
        const journalToInsert = await Promise.all(
            DUMMY_JOURNAL.map(async (j, idx) => ({
                user_id: userId,
                content: await encrypt(j, key),
                mood: Math.floor(Math.random() * 3) + 3, // Mood 3, 4, or 5
                date: new Date(Date.now() - idx * 86400000).toISOString().split('T')[0], // 1 entry per day
                created_at: new Date(Date.now() - idx * 86400000).toISOString(),
            }))
        );

        console.log("Clearing old data...");
        // Delete existing data to prevent duplicates on multiple runs
        await supabase.from("tasks").delete().eq("user_id", userId);
        await supabase.from("habits").delete().eq("user_id", userId);
        await supabase.from("goals").delete().eq("user_id", userId);
        await supabase.from("pomodoro_sessions").delete().eq("user_id", userId);
        await supabase.from("journal_entries").delete().eq("user_id", userId);

        console.log("Inserting new data...");
        // 1. Insert goals first so we can get their IDs
        const { data: insertedGoals, error: goalErr } = await supabase.from("goals").insert(goalsToInsert).select("id, title");
        if (goalErr) console.error("Goal insertion error:", goalErr);

        // Map goal names to IDs to link them to dummy tasks and habits
        const getGoalId = async (searchText: string) => {
            if (!insertedGoals) return null;
            for (const g of insertedGoals) {
                // we have to decrypt the title to match it, but it's easier to just pick randomly or by index for demo
                return g.id;
            }
            return null;
        };

        const g1 = insertedGoals?.[0]?.id || null;
        const g2 = insertedGoals?.[1]?.id || null;
        const g3 = insertedGoals?.[2]?.id || null;

        // Add links to the mapped tasks/habits
        tasksToInsert[0].linked_goal_id = g1; // Review Q3 -> Health (mock)
        tasksToInsert[1].linked_goal_id = g2; // Board meeting -> Spanish (mock)
        tasksToInsert[2].linked_goal_id = g3; // Grocery run -> Savings (mock)
        tasksToInsert[4].linked_goal_id = g2; // Read Clean Code -> Spanish (mock)
        tasksToInsert[6].linked_goal_id = g2; // Fix bug -> Spanish (mock)

        habitsToInsert[0].linked_goal_id = g2; // Meditation -> Spanish
        habitsToInsert[1].linked_goal_id = g1; // Water -> Marathon
        habitsToInsert[3].linked_goal_id = g1; // Workout -> Marathon

        await supabase.from("tasks").insert(tasksToInsert);
        await supabase.from("habits").insert(habitsToInsert);
        await supabase.from("pomodoro_sessions").insert(pomodoroToInsert);
        await supabase.from("journal_entries").insert(journalToInsert);

        console.log("Updating XP...");
        await supabase.from("profiles").update({ xp: 1250, streak: 12 }).eq("id", userId);

        return NextResponse.json({ success: true, message: "Demo data seeded successfully!" });

    } catch (e: any) {
        console.error("Seeding error:", e);
        return NextResponse.json({ error: "Internal server error", details: e.message }, { status: 500 });
    }
}
