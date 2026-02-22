"use client";

import { memo } from "react";
import { X } from "lucide-react";
import { NODE_CONFIG, getNodeColor, type GraphNodeData, type GraphNodeType, type GraphTheme } from "./graph-data";
import type { Node } from "@xyflow/react";

interface NodeDetailPanelProps {
    node: Node<GraphNodeData> | null;
    connectedNodes: Node<GraphNodeData>[];
    onClose: () => void;
    onNavigate: (nodeId: string) => void;
    theme: GraphTheme;
}

function NodeDetailPanel({ node, connectedNodes, onClose, onNavigate, theme }: NodeDetailPanelProps) {
    if (!node) return null;

    const config = NODE_CONFIG[node.data.nodeType];
    const color = theme[config.colorKey];
    const Icon = config.icon;

    return (
        <div
            className={`
                z-20 border shadow-2xl overflow-hidden animate-in fade-in duration-300
                fixed bottom-0 inset-x-0 rounded-t-2xl max-h-[55vh] overflow-y-auto
                slide-in-from-bottom-4
                sm:absolute sm:inset-auto sm:bottom-auto sm:top-4 sm:right-4
                sm:w-80 sm:rounded-2xl sm:max-h-none sm:overflow-visible
                sm:slide-in-from-right-4 sm:slide-in-from-bottom-0
            `}
            style={{
                background: theme.surface,
                borderColor: color + "40",
                boxShadow: `0 0 40px ${color}15, 0 8px 32px rgba(0,0,0,0.5)`,
            }}
        >
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-2 pb-1 sm:hidden">
                <div className="w-8 h-1 rounded-full opacity-30" style={{ background: theme.text }} />
            </div>
            <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />

            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: color + "20", color }}
                        >
                            <Icon size={20} />
                        </div>
                        <div>
                            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>
                                {config.label}
                            </span>
                            <h3 className="text-base font-bold leading-tight" style={{ color: theme.text }}>
                                {node.data.label}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        style={{ color: theme.muted }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="text-sm leading-relaxed mb-5" style={{ color: theme.muted }}>
                    {node.data.description}
                </p>

                {connectedNodes.length > 0 && (
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.muted }}>
                            Connected To
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {connectedNodes.map((cn) => {
                                const cnConfig = NODE_CONFIG[cn.data.nodeType];
                                const cnColor = theme[cnConfig.colorKey];
                                return (
                                    <button
                                        key={cn.id}
                                        onClick={() => onNavigate(cn.id)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all hover:scale-[1.03] active:scale-[0.98]"
                                        style={{
                                            background: cnColor + "10",
                                            borderColor: cnColor + "25",
                                            color: cnColor,
                                        }}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: cnColor }} />
                                        {cn.data.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(NodeDetailPanel);
