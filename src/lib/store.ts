import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Task {
    id: string
    title: string // encrypted
    notes?: string // encrypted
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    completed: boolean
    completed_at?: string
    created_at: string
    user_id: string
    linked_goal_id?: string
}

export interface Habit {
    id: string
    name: string // encrypted
    icon: string
    frequency: 'daily' | 'weekdays' | 'weekly'
    streak: number
    longest_streak: number
    completions: string[] // array of date strings "YYYY-MM-DD"
    created_at: string
    user_id: string
    linked_goal_id?: string
}

export interface Goal {
    id: string
    title: string // encrypted
    description?: string // encrypted
    category: 'health' | 'career' | 'finance' | 'learning' | 'personal'
    target_date?: string
    progress: number // 0-100
    completed: boolean
    created_at: string
    user_id: string
}

export interface JournalEntry {
    id: string
    content: string // encrypted
    mood: 1 | 2 | 3 | 4 | 5
    date: string // "YYYY-MM-DD"
    created_at: string
    user_id: string
}

export interface PomodoroSession {
    id: string
    duration: number // minutes
    task_name?: string // encrypted
    completed: boolean
    started_at: string
    user_id: string
}

export interface UserProfile {
    id: string
    name: string
    email: string
    xp: number
    level: number
    streak: number
    last_active: string
    is_pro: boolean
    encryption_salt: string
    created_at: string
    streak_freezes_used?: number
}

// ── Store ────────────────────────────────────────────────────────────────────

interface AppStore {
    // User
    user: UserProfile | null
    setUser: (user: UserProfile | null) => void

    // Tasks
    tasks: Task[]
    setTasks: (tasks: Task[]) => void
    addTask: (task: Task) => void
    updateTask: (id: string, updates: Partial<Task>) => void
    deleteTask: (id: string) => void

    // Habits
    habits: Habit[]
    setHabits: (habits: Habit[]) => void
    addHabit: (habit: Habit) => void
    updateHabit: (id: string, updates: Partial<Habit>) => void
    deleteHabit: (id: string) => void

    // Goals
    goals: Goal[]
    setGoals: (goals: Goal[]) => void
    addGoal: (goal: Goal) => void
    updateGoal: (id: string, updates: Partial<Goal>) => void
    deleteGoal: (id: string) => void

    // Journal
    journalEntries: JournalEntry[]
    setJournalEntries: (entries: JournalEntry[]) => void
    addJournalEntry: (entry: JournalEntry) => void
    updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void

    // Pomodoro
    pomodoroSessions: PomodoroSession[]
    setPomodoroSessions: (sessions: PomodoroSession[]) => void
    addPomodoroSession: (session: PomodoroSession) => void

    // UI
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
    currentPage: string
    setCurrentPage: (page: string) => void

    // Per-entity loading state — prevents redundant API calls
    dataLoaded: { tasks: boolean; habits: boolean; goals: boolean; journal: boolean; pomodoro: boolean }
    setDataLoaded: (loaded: { tasks?: boolean; habits?: boolean; goals?: boolean; journal?: boolean; pomodoro?: boolean }) => void
    setEntityLoaded: (entity: 'tasks' | 'habits' | 'goals' | 'journal' | 'pomodoro', loaded: boolean) => void
    clearData: () => void // call on logout to reset
}

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user) => set({ user }),

            tasks: [],
            setTasks: (tasks) => set({ tasks }),
            addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
            updateTask: (id, updates) =>
                set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
            deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

            habits: [],
            setHabits: (habits) => set({ habits }),
            addHabit: (habit) => set((s) => ({ habits: [habit, ...s.habits] })),
            updateHabit: (id, updates) =>
                set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)) })),
            deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

            goals: [],
            setGoals: (goals) => set({ goals }),
            addGoal: (goal) => set((s) => ({ goals: [goal, ...s.goals] })),
            updateGoal: (id, updates) =>
                set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)) })),
            deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

            journalEntries: [],
            setJournalEntries: (journalEntries) => set({ journalEntries }),
            addJournalEntry: (entry) =>
                set((s) => ({ journalEntries: [entry, ...s.journalEntries] })),
            updateJournalEntry: (id, updates) =>
                set((s) => ({
                    journalEntries: s.journalEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
                })),

            pomodoroSessions: [],
            setPomodoroSessions: (pomodoroSessions) => set({ pomodoroSessions }),
            addPomodoroSession: (session) =>
                set((s) => ({ pomodoroSessions: [session, ...s.pomodoroSessions] })),

            sidebarOpen: false,
            setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
            currentPage: 'dashboard',
            setCurrentPage: (currentPage) => set({ currentPage }),

            dataLoaded: { tasks: false, habits: false, goals: false, journal: false, pomodoro: false },
            setDataLoaded: (flags) => set((s) => ({ dataLoaded: { ...s.dataLoaded, ...flags } })),
            setEntityLoaded: (entity, loaded) => set((s) => ({ dataLoaded: { ...s.dataLoaded, [entity]: loaded } })),
            clearData: () => set({
                tasks: [],
                habits: [],
                goals: [],
                journalEntries: [],
                pomodoroSessions: [],
                dataLoaded: { tasks: false, habits: false, goals: false, journal: false, pomodoro: false },
            }),
        }),
        {
            name: 'flowhaven-store',
            partialize: (state) => ({
                // Only persist UI preferences, not sensitive data (that comes from Supabase)
                sidebarOpen: state.sidebarOpen,
            }),
        }
    )
)

// ── Gamification helpers ─────────────────────────────────────────────────────

export const LEVELS = [
    { level: 1, name: 'Beginner', xpRequired: 0 },
    { level: 2, name: 'Focused', xpRequired: 100 },
    { level: 3, name: 'Consistent', xpRequired: 250 },
    { level: 4, name: 'Productive', xpRequired: 500 },
    { level: 5, name: 'Achiever', xpRequired: 1000 },
    { level: 6, name: 'Expert', xpRequired: 2000 },
    { level: 7, name: 'Master', xpRequired: 4000 },
    { level: 8, name: 'Legend', xpRequired: 8000 },
]

export function getLevelInfo(xp: number) {
    let current = LEVELS[0]
    let next = LEVELS[1]

    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xpRequired) {
            current = LEVELS[i]
            next = LEVELS[i + 1] || LEVELS[i]
            break
        }
    }

    const xpInLevel = xp - current.xpRequired
    const xpNeeded = next.xpRequired - current.xpRequired
    const progress = next === current ? 100 : Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

    return { current, next, progress, xpInLevel, xpNeeded }
}

export const XP_REWARDS = {
    TASK_COMPLETE: 10,
    HABIT_CHECKIN: 15,
    POMODORO_COMPLETE: 20,
    JOURNAL_ENTRY: 10,
    GOAL_MILESTONE: 50,
    DAILY_STREAK: 5,
}

export const BADGES = [
    { id: 'first_task', name: 'First Step', emoji: '🎯', desc: 'Complete your first task' },
    { id: 'streak_7', name: 'Week Warrior', emoji: '🔥', desc: '7-day streak' },
    { id: 'streak_30', name: 'Month Master', emoji: '🏆', desc: '30-day streak' },
    { id: 'tasks_10', name: 'Task Crusher', emoji: '💪', desc: 'Complete 10 tasks' },
    { id: 'tasks_100', name: 'Centurion', emoji: '⚡', desc: 'Complete 100 tasks' },
    { id: 'habits_7', name: 'Habit Builder', emoji: '🧱', desc: 'Check in 7 habits in a day' },
    { id: 'pomodoro_10', name: 'Deep Worker', emoji: '🍅', desc: 'Complete 10 Pomodoros' },
    { id: 'journal_7', name: 'Reflector', emoji: '📓', desc: 'Journal for 7 days' },
    { id: 'level_5', name: 'Achiever', emoji: '🌟', desc: 'Reach Level 5' },
]
