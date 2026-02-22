"use server";

import { createClient } from "@/lib/supabase/server";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

// ── Cache TTLs (seconds) ────────────────────────────────────────────────────
const TTL = {
    tasks: 300,      // 5 min — frequently changing
    habits: 600,     // 10 min
    goals: 1800,     // 30 min — rarely changes
    journal: 600,    // 10 min
    pomodoro: 300,   // 5 min — active during focus sessions
} as const;

type Entity = keyof typeof TTL;

async function getRequestIp(): Promise<string> {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for") || "";
    const first = forwarded.split(",")[0]?.trim();
    return first || h.get("x-real-ip") || "unknown";
}

async function allowReadBurst(scope: string, userId?: string | null): Promise<boolean> {
    const ip = await getRequestIp();

    // IP guard (edge-facing): protects from request floods before user resolution.
    const ipGuard = await checkRateLimit({
        key: `rl:${scope}:ip:${ip}`,
        limit: 240,
        windowSec: 60,
    });
    if (!ipGuard.allowed) return false;

    // User guard (after auth): stricter per-account cap.
    if (userId) {
        const userGuard = await checkRateLimit({
            key: `rl:${scope}:user:${userId}`,
            limit: 120,
            windowSec: 60,
        });
        if (!userGuard.allowed) return false;
    }

    return true;
}

// ── Helper: get authenticated user ID ───────────────────────────────────────
async function getUserId(): Promise<string | null> {
    const ip = await getRequestIp();
    const authGuard = await checkRateLimit({
        key: `rl:auth:ip:${ip}`,
        limit: 180,
        windowSec: 60,
    });
    if (!authGuard.allowed) return null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
}

// ── Generic cache-through query ─────────────────────────────────────────────
// Eliminates the repeated try/redis.get/parse → query → redis.set/catch in
// every core fetcher.

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function cachedQuery(
    entity: Entity,
    cacheKey: string,
    queryFn: () => Promise<unknown[]>,
): Promise<unknown[]> {
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (e) { console.error(`Redis read error (${entity}):`, e); }

    const result = await queryFn();

    try { await redis.set(cacheKey, JSON.stringify(result), "EX", TTL[entity]); }
    catch (e) { console.error(`Redis write error (${entity}):`, e); }
    return result;
}

// ── Generic auth + rate-limit wrapper for exported fetchers ─────────────────

async function withAuth<T>(
    scope: string,
    fallback: T,
    fn: (userId: string, supabase: SupabaseClient) => Promise<T>,
): Promise<T> {
    const userId = await getUserId();
    if (!userId) return fallback;
    if (!(await allowReadBurst(scope, userId))) return fallback;
    const supabase = await createClient();
    return fn(userId, supabase);
}

// ── Internal core fetchers (accept pre-resolved userId + supabase) ──────────

function _tasksCore(userId: string, supabase: SupabaseClient, limit = 50, offset = 0) {
    return cachedQuery('tasks', `tasks:${userId}:${limit}:${offset}`, async () => {
        const { data } = await supabase
            .from("tasks").select("*").eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);
        return data || [];
    });
}

function _habitsCore(userId: string, supabase: SupabaseClient) {
    return cachedQuery('habits', `habits:${userId}`, async () => {
        const { data } = await supabase
            .from("habits").select("*").eq("user_id", userId)
            .order("created_at", { ascending: false });
        return data || [];
    });
}

function _goalsCore(userId: string, supabase: SupabaseClient) {
    return cachedQuery('goals', `goals:${userId}`, async () => {
        const { data } = await supabase
            .from("goals").select("*").eq("user_id", userId)
            .order("created_at", { ascending: false });
        return data || [];
    });
}

function _journalCore(userId: string, supabase: SupabaseClient, limit = 30, offset = 0) {
    return cachedQuery('journal', `journal:${userId}:${limit}:${offset}`, async () => {
        const { data } = await supabase
            .from("journal_entries").select("*").eq("user_id", userId)
            .order("date", { ascending: false })
            .range(offset, offset + limit - 1);
        return data || [];
    });
}

function _pomodoroCore(userId: string, supabase: SupabaseClient, limit = 50, offset = 0) {
    return cachedQuery('pomodoro', `pomodoro:${userId}:${limit}:${offset}`, async () => {
        const { data } = await supabase
            .from("pomodoro_sessions").select("*").eq("user_id", userId)
            .order("started_at", { ascending: false })
            .range(offset, offset + limit - 1);
        return data || [];
    });
}

// ── Exported single-entity fetchers ─────────────────────────────────────────

export async function fetchTasks(limit = 50, offset = 0) {
    return withAuth('tasks', [] as unknown[], (uid, sb) => _tasksCore(uid, sb, limit, offset));
}

export async function fetchHabits() {
    return withAuth('habits', [] as unknown[], (uid, sb) => _habitsCore(uid, sb));
}

export async function fetchGoals() {
    return withAuth('goals', [] as unknown[], (uid, sb) => _goalsCore(uid, sb));
}

export async function fetchJournal(limit = 30, offset = 0) {
    return withAuth('journal', [] as unknown[], (uid, sb) => _journalCore(uid, sb, limit, offset));
}

export async function fetchPomodoro(limit = 50, offset = 0) {
    return withAuth('pomodoro', [] as unknown[], (uid, sb) => _pomodoroCore(uid, sb, limit, offset));
}

// ── Combined dashboard fetch — 1 auth call + 3 parallel queries ─────────────
// Replaces the pattern of calling fetchTasks/fetchHabits/fetchPomodoro
// separately, which generated 3 POST /dashboard round-trips.

const EMPTY_DASHBOARD = { tasks: [] as unknown[], habits: [] as unknown[], pomodoroSessions: [] as unknown[] };

export async function fetchDashboardData() {
    return withAuth('dashboard', EMPTY_DASHBOARD, async (uid, sb) => {
        const [tasks, habits, pomodoroSessions] = await Promise.all([
            _tasksCore(uid, sb, 25, 0),
            _habitsCore(uid, sb),
            _pomodoroCore(uid, sb, 50, 0),
        ]);
        return { tasks, habits, pomodoroSessions };
    });
}

// ── Combined graph fetch — 1 auth call + 3 parallel queries ─────────────────

const EMPTY_GRAPH = { tasks: [] as unknown[], habits: [] as unknown[], goals: [] as unknown[] };

export async function fetchGraphData() {
    return withAuth('graph', EMPTY_GRAPH, async (uid, sb) => {
        const [tasks, habits, goals] = await Promise.all([
            _tasksCore(uid, sb, 50, 0),
            _habitsCore(uid, sb),
            _goalsCore(uid, sb),
        ]);
        return { tasks, habits, goals };
    });
}

// ── Combined analytics fetch — 1 auth call + 5 parallel queries ───────────

const EMPTY_ALL = { tasks: [] as unknown[], habits: [] as unknown[], goals: [] as unknown[], journalEntries: [] as unknown[], pomodoroSessions: [] as unknown[] };

export async function fetchAnalyticsData() {
    return withAuth('analytics', EMPTY_ALL, async (uid, sb) => {
        const [tasks, habits, goals, journalEntries, pomodoroSessions] = await Promise.all([
            _tasksCore(uid, sb, 25, 0),
            _habitsCore(uid, sb),
            _goalsCore(uid, sb),
            _journalCore(uid, sb, 20, 0),
            _pomodoroCore(uid, sb, 50, 0),
        ]);
        return { tasks, habits, goals, journalEntries, pomodoroSessions };
    });
}

// ── Targeted cache invalidation ─────────────────────────────────────────────

export async function invalidateEntity(entity: Entity) {
    const userId = await getUserId();
    if (!userId) return;

    // Delete all cache keys for this entity (including paginated variants)
    try {
        const pattern = `${entity}:${userId}*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (e) {
        console.error(`Cache invalidation error (${entity}):`, e);
    }
}

// ── Backward compat: invalidate everything ──────────────────────────────────

export async function invalidateCache() {
    await Promise.all([
        invalidateEntity('tasks'),
        invalidateEntity('habits'),
        invalidateEntity('goals'),
        invalidateEntity('journal'),
        invalidateEntity('pomodoro'),
    ]);
}


