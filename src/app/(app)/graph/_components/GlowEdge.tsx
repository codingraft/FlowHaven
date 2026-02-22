"use client";

import { memo } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { getTheme } from "./graph-data";

function GlowEdge({
    id,
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    style = {},
}: EdgeProps) {
    const theme = getTheme();
    const [edgePath] = getBezierPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        curvature: 0.3,
    });

    return (
        <>
            {/* Glow layer */}
            <path
                d={edgePath}
                fill="none"
                stroke={theme.cyan}
                strokeWidth={4}
                strokeOpacity={0.15}
                className="react-flow__edge-path"
            />

            {/* Main edge */}
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    stroke: theme.cyan,
                    strokeWidth: 1.5,
                    strokeOpacity: 0.6,
                    ...style,
                }}
            />

            {/* Animated dot */}
            <circle r="3" fill={theme.cyan} opacity={0.7}>
                <animateMotion dur="4s" repeatCount="indefinite" path={edgePath} />
            </circle>
        </>
    );
}

export default memo(GlowEdge);
