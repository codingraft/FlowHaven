"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import type { Task, Habit, Goal, JournalEntry, PomodoroSession } from "@/lib/store";
import {
    fetchTasks,
    fetchHabits,
    fetchGoals,
    fetchJournal,
    fetchPomodoro,
    fetchDashboardData,
    fetchGraphData,
    fetchAnalyticsData,
} from "@/actions/data";
import { decryptField } from "@/lib/crypto";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = { tasks: 25, journal: 20, pomodoro: 50 } as const;

// ── Types ────────────────────────────────────────────────────────────────────

type DataLoadedKey = "tasks" | "habits" | "goals" | "journal" | "pomodoro";
type DecryptMapper<T> = (raw: unknown) => Promise<T>;

// ── Decrypt mappers ──────────────────────────────────────────────────────────

const decryptTask: DecryptMapper<Task> = async (raw) => {
    const t = raw as Task;
    return { ...t, title: await decryptField(t.title), notes: t.notes ? await decryptField(t.notes) : undefined };
};

const decryptHabit: DecryptMapper<Habit> = async (raw) => {
    const h = raw as Habit;
    return { ...h, name: await decryptField(h.name) };
};

const decryptGoal: DecryptMapper<Goal> = async (raw) => {
    const g = raw as Goal;
    return { ...g, title: await decryptField(g.title), description: g.description ? await decryptField(g.description) : undefined };
};

const decryptJournalEntry: DecryptMapper<JournalEntry> = async (raw) => {
    const e = raw as JournalEntry;
    return { ...e, content: await decryptField(e.content) };
};

const decryptPomodoro: DecryptMapper<PomodoroSession> = async (raw) => {
    const s = raw as PomodoroSession;
    return { ...s, task_name: s.task_name ? await decryptField(s.task_name) : undefined };
};

const decryptAll = <T>(items: unknown[], mapper: DecryptMapper<T>): Promise<T[]> =>
    Promise.all(items.map(mapper));

// ── Generic entity loader (TanStack Query) ───────────────────────────────────
// TanStack Query handles: deduplication, caching, stale/gc, retry — replacing
// our manual dedup map, mounted flags, and useEffect boilerplate.

function useEntityLoader<T>(
    entityKey: DataLoadedKey,
    queryKey: readonly unknown[],
    queryFn: () => Promise<unknown[]>,
    mapper: DecryptMapper<T>,
    setter: (data: T[]) => void,
) {
    const userId = useAppStore((s) => s.user?.id);
    const loaded = useAppStore((s) => s.dataLoaded[entityKey]);
    const setEntityLoaded = useAppStore((s) => s.setEntityLoaded);

    const query = useQuery({
        queryKey: ["entity", ...queryKey, userId],
        enabled: Boolean(userId) && !loaded,
        queryFn: async () => {
            const raw = await queryFn();
            return decryptAll(raw, mapper);
        },
        staleTime: 60_000,
    });

    // Sync TanStack cache → Zustand store (once)
    useEffect(() => {
        if (!query.data || loaded) return;
        setter(query.data);
        setEntityLoaded(entityKey, true);
    }, [query.data, loaded, setter, setEntityLoaded, entityKey]);

    return { loading: !loaded && (query.isPending || query.isFetching) };
}

// ── Simple entity hooks ──────────────────────────────────────────────────────

export function useHabits() {
    const setter = useAppStore((s) => s.setHabits);
    return useEntityLoader("habits", ["habits"], fetchHabits, decryptHabit, setter);
}

export function useGoals() {
    const setter = useAppStore((s) => s.setGoals);
    return useEntityLoader("goals", ["goals"], fetchGoals, decryptGoal, setter);
}

export function usePomodoro() {
    const setter = useAppStore((s) => s.setPomodoroSessions);
    return useEntityLoader(
        "pomodoro",
        ["pomodoro"],
        () => fetchPomodoro(PAGE_SIZE.pomodoro, 0),
        decryptPomodoro,
        setter,
    );
}

// ── Paginated: Tasks ─────────────────────────────────────────────────────────

export function useTasks() {
    const queryClient = useQueryClient();
    const userId = useAppStore((s) => s.user?.id);
    const tasks = useAppStore((s) => s.tasks);
    const setTasks = useAppStore((s) => s.setTasks);
    const loaded = useAppStore((s) => s.dataLoaded.tasks);
    const setEntityLoaded = useAppStore((s) => s.setEntityLoaded);

    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    const query = useQuery({
        queryKey: ["entity", "tasks", userId, 0],
        enabled: Boolean(userId) && !loaded,
        queryFn: async () => {
            const raw = await fetchTasks(PAGE_SIZE.tasks, 0);
            const decrypted = await decryptAll(raw, decryptTask);
            return { items: decrypted, hasMore: raw.length === PAGE_SIZE.tasks };
        },
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!query.data || loaded) return;
        setTasks(query.data.items);
        setEntityLoaded("tasks", true);
        setHasMore(query.data.hasMore);
        setPage(1);
    }, [query.data, loaded, setTasks, setEntityLoaded]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || !userId) return;
        setLoadingMore(true);
        try {
            const offset = page * PAGE_SIZE.tasks;
            const raw = await queryClient.fetchQuery({
                queryKey: ["entity", "tasks", userId, offset],
                queryFn: () => fetchTasks(PAGE_SIZE.tasks, offset),
                staleTime: 60_000,
            });
            const decrypted = await decryptAll(raw, decryptTask);
            const existingIds = new Set(tasks.map((t) => t.id));
            const fresh = decrypted.filter((t) => !existingIds.has(t.id));
            setTasks([...tasks, ...fresh]);
            setPage((p) => p + 1);
            setHasMore(raw.length === PAGE_SIZE.tasks);
        } catch (e) {
            console.error("Failed to load more tasks", e);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, userId, page, tasks, setTasks, queryClient]);

    return { loading: !loaded && (query.isPending || query.isFetching), loadingMore, hasMore, loadMore };
}

// ── Paginated: Journal ───────────────────────────────────────────────────────

export function useJournal() {
    const queryClient = useQueryClient();
    const userId = useAppStore((s) => s.user?.id);
    const entries = useAppStore((s) => s.journalEntries);
    const setEntries = useAppStore((s) => s.setJournalEntries);
    const loaded = useAppStore((s) => s.dataLoaded.journal);
    const setEntityLoaded = useAppStore((s) => s.setEntityLoaded);

    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    const query = useQuery({
        queryKey: ["entity", "journal", userId, 0],
        enabled: Boolean(userId) && !loaded,
        queryFn: async () => {
            const raw = await fetchJournal(PAGE_SIZE.journal, 0);
            const decrypted = await decryptAll(raw, decryptJournalEntry);
            return { items: decrypted, hasMore: raw.length === PAGE_SIZE.journal };
        },
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!query.data || loaded) return;
        setEntries(query.data.items);
        setEntityLoaded("journal", true);
        setHasMore(query.data.hasMore);
        setPage(1);
    }, [query.data, loaded, setEntries, setEntityLoaded]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || !userId) return;
        setLoadingMore(true);
        try {
            const offset = page * PAGE_SIZE.journal;
            const raw = await queryClient.fetchQuery({
                queryKey: ["entity", "journal", userId, offset],
                queryFn: () => fetchJournal(PAGE_SIZE.journal, offset),
                staleTime: 60_000,
            });
            const decrypted = await decryptAll(raw, decryptJournalEntry);
            const existingIds = new Set(entries.map((e) => e.id));
            const fresh = decrypted.filter((e) => !existingIds.has(e.id));
            setEntries([...entries, ...fresh]);
            setPage((p) => p + 1);
            setHasMore(raw.length === PAGE_SIZE.journal);
        } catch (e) {
            console.error("Failed to load more journal", e);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, userId, page, entries, setEntries, queryClient]);

    return { loading: !loaded && (query.isPending || query.isFetching), loadingMore, hasMore, loadMore };
}

// ── Composite: Dashboard (tasks + habits + pomodoro in 1 POST) ───────────────

export function useDashboardData() {
    const userId = useAppStore((s) => s.user?.id);
    const tLoaded = useAppStore((s) => s.dataLoaded.tasks);
    const hLoaded = useAppStore((s) => s.dataLoaded.habits);
    const pLoaded = useAppStore((s) => s.dataLoaded.pomodoro);
    const setTasks = useAppStore((s) => s.setTasks);
    const setHabits = useAppStore((s) => s.setHabits);
    const setSessions = useAppStore((s) => s.setPomodoroSessions);
    const setEntityLoaded = useAppStore((s) => s.setEntityLoaded);

    const allLoaded = tLoaded && hLoaded && pLoaded;

    const query = useQuery({
        queryKey: ["composite", "dashboard", userId],
        enabled: Boolean(userId) && !allLoaded,
        queryFn: async () => {
            const raw = await fetchDashboardData();
            const [tasks, habits, sessions] = await Promise.all([
                tLoaded ? null : decryptAll(raw.tasks, decryptTask),
                hLoaded ? null : decryptAll(raw.habits, decryptHabit),
                pLoaded ? null : decryptAll(raw.pomodoroSessions, decryptPomodoro),
            ]);
            return { tasks, habits, sessions };
        },
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!query.data) return;
        if (query.data.tasks) { setTasks(query.data.tasks); setEntityLoaded("tasks", true); }
        if (query.data.habits) { setHabits(query.data.habits); setEntityLoaded("habits", true); }
        if (query.data.sessions) { setSessions(query.data.sessions); setEntityLoaded("pomodoro", true); }
    }, [query.data, setTasks, setHabits, setSessions, setEntityLoaded]);

    return { loading: !allLoaded && (query.isPending || query.isFetching) };
}

// ── Composite: Analytics (all 5 entities in 1 POST) ──────────────────────────

export function useAnalyticsData() {
    const userId = useAppStore((s) => s.user?.id);
    const tLoaded = useAppStore((s) => s.dataLoaded.tasks);
    const hLoaded = useAppStore((s) => s.dataLoaded.habits);
    const gLoaded = useAppStore((s) => s.dataLoaded.goals);
    const jLoaded = useAppStore((s) => s.dataLoaded.journal);
    const pLoaded = useAppStore((s) => s.dataLoaded.pomodoro);
    const setTasks = useAppStore((s) => s.setTasks);
    const setHabits = useAppStore((s) => s.setHabits);
    const setGoals = useAppStore((s) => s.setGoals);
    const setJournal = useAppStore((s) => s.setJournalEntries);
    const setSessions = useAppStore((s) => s.setPomodoroSessions);
    const setEntityLoaded = useAppStore((s) => s.setEntityLoaded);

    const allLoaded = tLoaded && hLoaded && gLoaded && jLoaded && pLoaded;

    const query = useQuery({
        queryKey: ["composite", "analytics", userId],
        enabled: Boolean(userId) && !allLoaded,
        queryFn: async () => {
            const raw = await fetchAnalyticsData();
            const [tasks, habits, goals, journal, sessions] = await Promise.all([
                tLoaded ? null : decryptAll(raw.tasks, decryptTask),
                hLoaded ? null : decryptAll(raw.habits, decryptHabit),
                gLoaded ? null : decryptAll(raw.goals, decryptGoal),
                jLoaded ? null : decryptAll(raw.journalEntries, decryptJournalEntry),
                pLoaded ? null : decryptAll(raw.pomodoroSessions, decryptPomodoro),
            ]);
            return { tasks, habits, goals, journal, sessions };
        },
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!query.data) return;
        if (query.data.tasks) { setTasks(query.data.tasks); setEntityLoaded("tasks", true); }
        if (query.data.habits) { setHabits(query.data.habits); setEntityLoaded("habits", true); }
        if (query.data.goals) { setGoals(query.data.goals); setEntityLoaded("goals", true); }
        if (query.data.journal) { setJournal(query.data.journal); setEntityLoaded("journal", true); }
        if (query.data.sessions) { setSessions(query.data.sessions); setEntityLoaded("pomodoro", true); }
    }, [query.data, setTasks, setHabits, setGoals, setJournal, setSessions, setEntityLoaded]);

    return { loading: !allLoaded && (query.isPending || query.isFetching) };
}

// ── Composite: Graph (tasks + habits + goals in 1 POST) ──────────────────────

export function useGraphData() {
    const userId = useAppStore((s) => s.user?.id);
    const tLoaded = useAppStore((s) => s.dataLoaded.tasks);
    const hLoaded = useAppStore((s) => s.dataLoaded.habits);
    const gLoaded = useAppStore((s) => s.dataLoaded.goals);
    const setTasks = useAppStore((s) => s.setTasks);
    const setHabits = useAppStore((s) => s.setHabits);
    const setGoals = useAppStore((s) => s.setGoals);
    const setEntityLoaded = useAppStore((s) => s.setEntityLoaded);

    const allLoaded = tLoaded && hLoaded && gLoaded;

    const query = useQuery({
        queryKey: ["composite", "graph", userId],
        enabled: Boolean(userId) && !allLoaded,
        queryFn: async () => {
            const raw = await fetchGraphData();
            const [tasks, habits, goals] = await Promise.all([
                tLoaded ? null : decryptAll(raw.tasks, decryptTask),
                hLoaded ? null : decryptAll(raw.habits, decryptHabit),
                gLoaded ? null : decryptAll(raw.goals, decryptGoal),
            ]);
            return { tasks, habits, goals };
        },
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!query.data) return;
        if (query.data.tasks) { setTasks(query.data.tasks); setEntityLoaded("tasks", true); }
        if (query.data.habits) { setHabits(query.data.habits); setEntityLoaded("habits", true); }
        if (query.data.goals) { setGoals(query.data.goals); setEntityLoaded("goals", true); }
    }, [query.data, setTasks, setHabits, setGoals, setEntityLoaded]);

    return { loading: !allLoaded && (query.isPending || query.isFetching) };
}
