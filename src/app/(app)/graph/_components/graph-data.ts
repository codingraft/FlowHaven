import { type Node, type Edge } from "@xyflow/react";
import { Target, CheckSquare, BookOpen, Flame } from "lucide-react";
import type { ComponentType } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type GraphNodeType = "goal" | "task" | "journal" | "habit";

export interface GraphNodeData extends Record<string, unknown> {
    label: string;
    description: string;
    nodeType: GraphNodeType;
}

// ─── Theme (Violet Haven — Dark + Light) ────────────────────────────────────

export interface GraphThemeColors {
    bg: string;
    surface: string;
    surfaceBorder: string;
    violet: string;
    cyan: string;
    emerald: string;
    amber: string;
    text: string;
    muted: string;
    dotGrid: string;
}

export interface GraphTheme extends GraphThemeColors {
    isDark: boolean;
}

export const DARK_THEME: GraphTheme = {
    bg: "var(--bg-base)",
    surface: "var(--bg-surface)",
    surfaceBorder: "var(--border)",
    violet: "#7C3AED",
    cyan: "#22D3EE",
    emerald: "#34D399",
    amber: "#FBBF24",
    text: "var(--text-primary)",
    muted: "var(--text-secondary)",
    dotGrid: "rgba(255,255,255,0.1)",
    isDark: true,
};

export const LIGHT_THEME: GraphTheme = {
    bg: "var(--bg-base)",
    surface: "var(--bg-surface)",
    surfaceBorder: "var(--border)",
    violet: "#7C3AED",
    cyan: "#0891B2",
    emerald: "#059669",
    amber: "#D97706",
    text: "var(--text-primary)",
    muted: "var(--text-secondary)",
    dotGrid: "rgba(0,0,0,0.1)",
    isDark: false,
};

export function getTheme(): GraphTheme {
    // Both return same structural vars, but semantic colors differ slightly
    if (typeof document === "undefined") return DARK_THEME;
    return document.documentElement.classList.contains("dark") ? DARK_THEME : LIGHT_THEME;
}

export const NODE_CONFIG: Record<
    GraphNodeType,
    { colorKey: keyof GraphThemeColors; icon: ComponentType<{ size?: number }>; label: string }
> = {
    goal: { colorKey: "violet", icon: Target, label: "Goal" },
    task: { colorKey: "amber", icon: CheckSquare, label: "Task" },
    journal: { colorKey: "cyan", icon: BookOpen, label: "Journal" },
    habit: { colorKey: "emerald", icon: Flame, label: "Habit" },
};

export function getNodeColor(nodeType: GraphNodeType, theme: GraphTheme): string {
    return theme[NODE_CONFIG[nodeType].colorKey];
}

// ─── Sample Nodes ───────────────────────────────────────────────────────────

export const INITIAL_NODES: Node<GraphNodeData>[] = [
    {
        id: "goal-1",
        type: "graphNode",
        position: { x: 400, y: 250 },
        data: {
            label: "Launch FlowHaven",
            description: "Ship the MVP of FlowHaven productivity suite by end of Q1. Includes all core modules: tasks, habits, journal, and focus timer.",
            nodeType: "goal",
        },
    },
    {
        id: "task-1",
        type: "graphNode",
        position: { x: 50, y: 50 },
        data: {
            label: "Finish AI Coach UI",
            description: "Complete the HavenMind AI coach interface with chat bubbles, send button, and real-time response streaming.",
            nodeType: "task",
        },
    },
    {
        id: "task-2",
        type: "graphNode",
        position: { x: 750, y: 50 },
        data: {
            label: "Conduct User Testing",
            description: "Run usability tests with 5 beta users. Focus on onboarding flow and task management UX.",
            nodeType: "task",
        },
    },
    {
        id: "journal-1",
        type: "graphNode",
        position: { x: 700, y: 450 },
        data: {
            label: "Feb 18 Entry",
            description: "Reflected on the week's progress. User testing revealed UI navigation issues that need addressing before launch.",
            nodeType: "journal",
        },
    },
    {
        id: "habit-1",
        type: "graphNode",
        position: { x: 100, y: 450 },
        data: {
            label: "Daily Pomodoro · 7 days",
            description: "Completed 7 consecutive days of at least one pomodoro session. Current streak is strong.",
            nodeType: "habit",
        },
    },
];

// ─── Sample Edges ───────────────────────────────────────────────────────────

export const INITIAL_EDGES: Edge[] = [
    { id: "e-goal-task1", source: "goal-1", target: "task-1", type: "glowEdge" },
    { id: "e-goal-task2", source: "goal-1", target: "task-2", type: "glowEdge" },
    { id: "e-goal-journal", source: "goal-1", target: "journal-1", type: "glowEdge" },
    { id: "e-goal-habit", source: "goal-1", target: "habit-1", type: "glowEdge" },
    { id: "e-task2-journal", source: "task-2", target: "journal-1", type: "glowEdge" },
];
