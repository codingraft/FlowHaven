"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { NODE_CONFIG, getNodeColor, type GraphNodeData, type GraphTheme } from "./graph-data";

type GraphNodeComponentProps = NodeProps<Node<GraphNodeData>> & {
    theme?: GraphTheme;
};

function GraphNodeComponent({ data, selected }: GraphNodeComponentProps) {
    // Read theme from data (passed via GraphCanvas)
    const theme = (data as GraphNodeData & { _theme?: GraphTheme })._theme;
    const config = NODE_CONFIG[data.nodeType];
    const Icon = config.icon;
    const isGoal = data.nodeType === "goal";
    const color = theme ? theme[config.colorKey] : "#7C3AED";
    const surface = theme?.surface ?? "#1E2937";
    const surfaceBorder = theme?.surfaceBorder ?? "#334155";
    const text = theme?.text ?? "#F1F5F9";

    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                className="bg-transparent! border-0! w-3! h-3!"
            />

            <div
                className="group relative transition-all duration-300"
                style={{ minWidth: isGoal ? 220 : 190, maxWidth: 260 }}
            >
                {selected && (
                    <div
                        className="absolute -inset-2 rounded-2xl opacity-30 blur-xl pointer-events-none"
                        style={{ background: color }}
                    />
                )}

                <div
                    className="relative rounded-xl px-4 py-3 border-[1.5px] transition-all duration-200 hover:scale-[1.02]"
                    style={{
                        background: surface,
                        borderColor: selected ? color : surfaceBorder,
                        boxShadow: selected
                            ? `0 0 20px ${color}30, 0 4px 12px rgba(0,0,0,0.4)`
                            : "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                >
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: color + "20", color }}
                        >
                            <Icon size={14} />
                        </div>
                        <span
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                            style={{ color, background: color + "15" }}
                        >
                            {config.label}
                        </span>
                    </div>

                    <p
                        className="text-sm font-semibold leading-snug"
                        style={{ color: text, fontSize: isGoal ? 15 : 13 }}
                    >
                        {data.label}
                    </p>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="bg-transparent! border-0! w-3! h-3!"
            />
        </>
    );
}

export default memo(GraphNodeComponent);
