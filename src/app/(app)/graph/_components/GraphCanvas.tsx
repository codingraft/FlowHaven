"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type NodeTypes,
    type EdgeTypes,
    BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import GraphNodeComponent from "./GraphNode";
import GlowEdge from "./GlowEdge";
import NodeDetailPanel from "./NodeDetailPanel";
import {
    INITIAL_EDGES,
    NODE_CONFIG,
    getTheme,
    type GraphNodeData,
    type GraphNodeType,
    type GraphTheme,
} from "./graph-data";
import { Waypoints } from "lucide-react";

// ─── Register custom types ─────────────────────────────────────────────────

const nodeTypes: NodeTypes = { graphNode: GraphNodeComponent };
const edgeTypes: EdgeTypes = { glowEdge: GlowEdge };

// ─── Hook: observe theme changes on <html> ─────────────────────────────────

function useGraphTheme(): GraphTheme {
    const [theme, setTheme] = useState<GraphTheme>(getTheme);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setTheme(getTheme());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    return theme;
}

// ─── Force Layout ──────────────────────────────────────────────────────────

import { useAppStore } from "@/lib/store";
import { useGraphData } from "@/hooks/useUserData";

// ─── Force Layout ──────────────────────────────────────────────────────────

async function applyForceLayoutAsync(
    nodes: Node<GraphNodeData>[],
    edges: typeof INITIAL_EDGES,
    onStepUpdate: (updatedNodes: Node<GraphNodeData>[]) => void
): Promise<void> {
    const positions = nodes.map(n => ({ x: n.position.x, y: n.position.y, vx: 0, vy: 0 }));
    const REPULSION = 15000;
    const ATTRACTION = 0.006;
    const DAMPING = 0.82;
    const CENTER_GRAVITY = 0.001;
    const STEPS = 200;

    const cx = nodes.reduce((s, n) => s + n.position.x, 0) / nodes.length || 0;
    const cy = nodes.reduce((s, n) => s + n.position.y, 0) / nodes.length || 0;

    for (let step = 0; step < STEPS; step++) {
        for (let i = 0; i < positions.length; i++) {
            let fx = 0, fy = 0;

            // Repulsion from every other node
            for (let j = 0; j < positions.length; j++) {
                if (i === j) continue;
                const dx = positions[i].x - positions[j].x;
                const dy = positions[i].y - positions[j].y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 40);
                fx += (dx / dist) * (REPULSION / (dist * dist));
                fy += (dy / dist) * (REPULSION / (dist * dist));
            }

            // Attraction along edges
            for (const edge of edges) {
                const si = nodes.findIndex(n => n.id === edge.source);
                const ti = nodes.findIndex(n => n.id === edge.target);
                if (si === -1 || ti === -1) continue;
                const other = si === i ? ti : ti === i ? si : -1;
                if (other === -1) continue;
                fx += (positions[other].x - positions[i].x) * ATTRACTION;
                fy += (positions[other].y - positions[i].y) * ATTRACTION;
            }

            // Center gravity
            fx -= (positions[i].x - cx) * CENTER_GRAVITY;
            fy -= (positions[i].y - cy) * CENTER_GRAVITY;

            positions[i].vx = (positions[i].vx + fx) * DAMPING;
            positions[i].vy = (positions[i].vy + fy) * DAMPING;
        }

        for (let i = 0; i < positions.length; i++) {
            positions[i].x += positions[i].vx;
            positions[i].y += positions[i].vy;
        }

        // Yield to the browser and update UI every 5 steps
        if (step % 5 === 0) {
            onStepUpdate(nodes.map((n, i) => ({
                ...n,
                position: { x: Math.round(positions[i].x), y: Math.round(positions[i].y) },
            })));
            await new Promise(r => requestAnimationFrame(r));
        }
    }

    onStepUpdate(nodes.map((n, i) => ({
        ...n,
        position: { x: Math.round(positions[i].x), y: Math.round(positions[i].y) },
    })));
}

// ─── GraphCanvas ───────────────────────────────────────────────────────────

export default function GraphCanvas() {
    const theme = useGraphTheme();
    useGraphData(); // trigger loading of data

    const { tasks, habits, goals } = useAppStore();

    const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Build graph from store when data changes
    useEffect(() => {
        const newNodes: Node<GraphNodeData>[] = [];
        const newEdges: Edge[] = [];

        // Hub nodes to connect everything so it doesn't float away
        newNodes.push({
            id: "hub-goals",
            type: "graphNode",
            position: { x: 400, y: 300 },
            data: { label: "My Goals", description: "Central hub for all tracked goals.", nodeType: "goal" },
        });
        newNodes.push({
            id: "hub-habits",
            type: "graphNode",
            position: { x: 200, y: 500 },
            data: { label: "My Habits", description: "Central hub for all tracked habits.", nodeType: "habit" },
        });
        newNodes.push({
            id: "hub-tasks",
            type: "graphNode",
            position: { x: 600, y: 500 },
            data: { label: "My Tasks", description: "Central hub for all active tasks.", nodeType: "task" },
        });

        // Edge between hubs
        newEdges.push(
            { id: "e-h-g", source: "hub-goals", target: "hub-habits", animated: true },
            { id: "e-h-t", source: "hub-goals", target: "hub-tasks", animated: true }
        );

        // Map real data
        goals.forEach((g, i) => {
            const rx = 400 + Math.cos(i) * 200;
            const ry = 300 + Math.sin(i) * 200;
            newNodes.push({
                id: `goal-${g.id}`,
                type: "graphNode",
                position: { x: rx, y: ry },
                data: { label: g.title, description: g.description || "", nodeType: "goal" },
            });
            newEdges.push({ id: `e-hg-${g.id}`, source: "hub-goals", target: `goal-${g.id}` });
        });

        habits.forEach((h, i) => {
            const rx = 200 + Math.cos(i) * 200;
            const ry = 500 + Math.sin(i) * 200;
            newNodes.push({
                id: `habit-${h.id}`,
                type: "graphNode",
                position: { x: rx, y: ry },
                data: { label: h.name, description: `Streak: ${h.streak}`, nodeType: "habit" },
            });
            if (h.linked_goal_id) {
                newEdges.push({ id: `e-hg-${h.id}`, source: `goal-${h.linked_goal_id}`, target: `habit-${h.id}` });
            } else {
                newEdges.push({ id: `e-hh-${h.id}`, source: "hub-habits", target: `habit-${h.id}` });
            }
        });

        tasks.forEach((t, i) => {
            if (t.completed) return; // Only show active tasks
            const rx = 600 + Math.cos(i) * 200;
            const ry = 500 + Math.sin(i) * 200;
            newNodes.push({
                id: `task-${t.id}`,
                type: "graphNode",
                position: { x: rx, y: ry },
                data: { label: t.title, description: t.notes || "", nodeType: "task" },
            });
            if (t.linked_goal_id) {
                newEdges.push({ id: `e-tg-${t.id}`, source: `goal-${t.linked_goal_id}`, target: `task-${t.id}` });
            } else {
                newEdges.push({ id: `e-ht-${t.id}`, source: "hub-tasks", target: `task-${t.id}` });
            }
        });

        if (newNodes.length > 0) {
            setNodes(newNodes);
            setEdges(newEdges);
            // Run force layout asynchronously so it animates instead of freezing the UI thread
            applyForceLayoutAsync(newNodes, newEdges, setNodes);
        }
    }, [tasks, habits, goals, setNodes, setEdges]);

    // Inject theme into node data so custom node component can read it
    const themedNodes = useMemo(
        () =>
            nodes.map(n => ({
                ...n,
                data: { ...n.data, _theme: theme },
            })),
        [nodes, theme]
    );

    const selectedNode = useMemo(
        () => nodes.find(n => n.id === selectedNodeId) ?? null,
        [nodes, selectedNodeId]
    );

    const connectedNodes = useMemo(() => {
        if (!selectedNodeId) return [];
        const ids = new Set<string>();
        edges.forEach(e => {
            if (e.source === selectedNodeId) ids.add(e.target);
            if (e.target === selectedNodeId) ids.add(e.source);
        });
        return nodes.filter(n => ids.has(n.id));
    }, [selectedNodeId, edges, nodes]);

    // Handlers
    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(prev => (prev === node.id ? null : node.id));
    }, []);

    const handlePaneClick = useCallback(() => setSelectedNodeId(null), []);
    const handleNavigate = useCallback((id: string) => setSelectedNodeId(id), []);

    const handleForceLayout = useCallback(() => {
        applyForceLayoutAsync(nodes as Node<GraphNodeData>[], edges, setNodes);
    }, [nodes, edges, setNodes]);

    // Dynamic control styles based on theme
    const controlsClass = theme.isDark
        ? "!bg-[var(--bg-elevated)] !border-[var(--border)] !shadow-xl [&_button]:!bg-[var(--bg-elevated)] [&_button]:!border-[var(--border)] [&_button]:!fill-[var(--text-secondary)] [&_button:hover]:!bg-[var(--bg-surface)] [&_button:hover]:!fill-white !rounded-xl !overflow-hidden"
        : "!bg-[var(--bg-surface)] !border-[var(--border)] !shadow-lg [&_button]:!bg-[var(--bg-surface)] [&_button]:!border-[var(--border)] [&_button]:!fill-[var(--text-secondary)] [&_button:hover]:!bg-[var(--bg-elevated)] [&_button:hover]:!fill-[var(--text-primary)] !rounded-xl !overflow-hidden";

    const minimapClass = theme.isDark
        ? "!bg-[var(--bg-elevated)]/80 !border-[var(--border)] !rounded-xl !shadow-xl !backdrop-blur-sm"
        : "!bg-[var(--bg-surface)]/80 !border-[var(--border)] !rounded-xl !shadow-lg !backdrop-blur-sm";

    return (
        <div className="w-full h-full relative">
            <ReactFlow
                nodes={themedNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                style={{ backgroundColor: theme.bg }}
                minZoom={0.2}
                maxZoom={3}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{ type: "glowEdge" }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={30}
                    size={1}
                    color={theme.dotGrid as string}
                />
                <Controls showInteractive={false} className={controlsClass} />
                <div className="hidden md:block">
                    <MiniMap
                        nodeColor={(node) => {
                            const data = node.data as GraphNodeData;
                            const cfg = NODE_CONFIG[data.nodeType];
                            return (cfg ? theme[cfg.colorKey] : theme.muted) as string;
                        }}
                        maskColor={theme.isDark ? "rgba(9, 9, 11, 0.85)" : "rgba(244, 244, 245, 0.85)"}
                        className={minimapClass}
                        pannable
                        zoomable
                    />
                </div>
            </ReactFlow>

            {/* Force Layout Button — moved up on mobile since no minimap */}
            <button
                onClick={handleForceLayout}
                className="absolute bottom-4 right-3 md:bottom-28 w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-lg border hover:scale-105 active:scale-95"
                style={{ background: theme.surface, borderColor: theme.surfaceBorder, color: theme.muted }}
                title="Auto-arrange (Force Layout)"
            >
                <Waypoints size={16} />
            </button>

            {/* Legend — full on sm+, compact dot row on mobile */}
            <div
                className="absolute top-4 left-4 rounded-xl p-3 border shadow-xl z-10 hidden sm:block"
                style={{ background: theme.surface + "E0", borderColor: theme.surfaceBorder, backdropFilter: "blur(12px)" }}
            >
                <div className="text-[11px] font-semibold mb-2" style={{ color: theme.text }}>
                    Knowledge Graph
                </div>
                <div className="space-y-1.5">
                    {(Object.entries(NODE_CONFIG) as [GraphNodeType, (typeof NODE_CONFIG)[GraphNodeType]][]).map(
                        ([type, config]) => (
                            <div key={type} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: theme[config.colorKey] }} />
                                <span className="text-[10px] font-medium" style={{ color: theme.muted }}>
                                    {config.label}
                                </span>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Mobile compact legend — icon dots only */}
            <div
                className="absolute top-4 left-4 flex items-center gap-2 rounded-full px-3 py-1.5 border shadow-lg z-10 sm:hidden"
                style={{ background: theme.surface + "E0", borderColor: theme.surfaceBorder, backdropFilter: "blur(12px)" }}
            >
                {(Object.entries(NODE_CONFIG) as [GraphNodeType, (typeof NODE_CONFIG)[GraphNodeType]][]).map(
                    ([type, config]) => (
                        <div key={type} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: theme[config.colorKey] }} />
                            <span className="text-[9px] font-medium" style={{ color: theme.muted }}>{config.label}</span>
                        </div>
                    )
                )}
            </div>

            {/* Detail Panel */}
            <NodeDetailPanel
                node={selectedNode as Node<GraphNodeData> | null}
                connectedNodes={connectedNodes as Node<GraphNodeData>[]}
                onClose={() => setSelectedNodeId(null)}
                onNavigate={handleNavigate}
                theme={theme}
            />
        </div>
    );
}
