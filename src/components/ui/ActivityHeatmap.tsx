"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { format, subDays, startOfWeek, addDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

interface ActivityHeatmapProps {
    /** Map of "YYYY-MM-DD" → activity count */
    data: Record<string, number>;
    /** Label shown above the heatmap */
    label: string;
    /** Base color hue */
    color?: "indigo" | "emerald" | "amber" | "violet";
    /** Number of weeks (desktop). On mobile, only current month is shown. */
    weeks?: number;
    /** Unit label for tooltip */
    unit?: string;
    /** Show summary stats row (active days, streaks, best day) */
    showStats?: boolean;
}

const COLOR_SCALES: Record<string, { empty: string; levels: string[] }> = {
    indigo: {
        empty: "var(--bg-elevated)",
        levels: [
            "rgba(99,102,241,0.40)",
            "rgba(99,102,241,0.60)",
            "rgba(99,102,241,0.80)",
            "rgba(99,102,241,1.00)",
        ],
    },
    emerald: {
        empty: "var(--bg-elevated)",
        levels: [
            "rgba(52,211,153,0.40)",
            "rgba(52,211,153,0.60)",
            "rgba(52,211,153,0.80)",
            "rgba(52,211,153,1.00)",
        ],
    },
    amber: {
        empty: "var(--bg-elevated)",
        levels: [
            "rgba(251,191,36,0.40)",
            "rgba(251,191,36,0.60)",
            "rgba(251,191,36,0.80)",
            "rgba(251,191,36,1.00)",
        ],
    },
    violet: {
        empty: "var(--bg-elevated)",
        levels: [
            "rgba(167,139,250,0.40)",
            "rgba(167,139,250,0.60)",
            "rgba(167,139,250,0.80)",
            "rgba(167,139,250,1.00)",
        ],
    },
};

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

type DayCell = { date: string; count: number; isFuture: boolean };

// ─── Desktop Full-Year Grid (weeks × 7) ──────────────────────────────────────
function buildDesktopGrid(data: Record<string, number>, weeks: number) {
    const today = new Date();
    const totalDays = weeks * 7;
    const startDate = startOfWeek(subDays(today, totalDays - 1), { weekStartsOn: 1 });

    let maxCount = 0;
    const grid: DayCell[][] = [];
    const monthLabels: { label: string; colIndex: number }[] = [];
    let lastMonth = "";

    for (let w = 0; w < weeks; w++) {
        const week: DayCell[] = [];
        for (let d = 0; d < 7; d++) {
            const cellDate = addDays(startDate, w * 7 + d);
            const dateStr = format(cellDate, "yyyy-MM-dd");
            const count = data[dateStr] || 0;
            const isFuture = cellDate > today;
            if (!isFuture && count > maxCount) maxCount = count;

            const monthStr = format(cellDate, "MMM");
            if (d === 0 && monthStr !== lastMonth) {
                monthLabels.push({ label: monthStr, colIndex: w });
                lastMonth = monthStr;
            }
            week.push({ date: dateStr, count: isFuture ? 0 : count, isFuture });
        }
        grid.push(week);
    }
    return { grid, monthLabels, maxCount };
}

// ─── Mobile: Current Month Grid (calendar layout) ────────────────────────────
function buildMobileGrid(data: Record<string, number>) {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let maxCount = 0;
    const cells: (DayCell | null)[] = [];

    // Pad start: getDay returns 0=Sun. We want Monday=0, so offset.
    const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // 0=Mon
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);

    days.forEach(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const count = data[dateStr] || 0;
        const isFuture = day > today;
        if (!isFuture && count > maxCount) maxCount = count;
        cells.push({ date: dateStr, count: isFuture ? 0 : count, isFuture });
    });

    // Pad end
    while (cells.length % 7 !== 0) cells.push(null);

    // Break into weeks (rows)
    const weeks: (DayCell | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }

    return { weeks, maxCount, monthLabel: format(today, "MMMM yyyy") };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ActivityHeatmap({
    data,
    label,
    color = "indigo",
    weeks = 20,
    unit = "activities",
    showStats = false,
}: ActivityHeatmapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{ date: string; count: number; top: number; left: number } | null>(null);

    const scale = COLOR_SCALES[color] || COLOR_SCALES.indigo;

    // Desktop grid
    const desktop = useMemo(() => buildDesktopGrid(data, weeks), [data, weeks]);
    // Mobile grid
    const mobile = useMemo(() => buildMobileGrid(data), [data]);

    const getLevel = useCallback((count: number, max: number): number => {
        if (count <= 0 || max === 0) return 0;
        const r = count / max;
        if (r <= 0.25) return 1;
        if (r <= 0.5) return 2;
        if (r <= 0.75) return 3;
        return 4;
    }, []);

    const getCellBg = useCallback((count: number, isFuture: boolean, max: number) => {
        if (isFuture) return "transparent";
        const level = getLevel(count, max);
        return level === 0 ? scale.empty : scale.levels[level - 1];
    }, [getLevel, scale]);

    const totalCount = useMemo(() => Object.values(data).reduce((s, v) => s + v, 0), [data]);

    const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

    const streakInfo = useMemo(() => {
        const activeDays = Object.keys(data).filter(d => data[d] > 0).length;
        if (activeDays === 0) return { current: 0, longest: 0, bestCount: 0, activeDays: 0 };

        // Best day count
        let bestCount = 0;
        const values = Object.values(data);
        for (const v of values) { if (v > bestCount) bestCount = v; }

        // Current streak (consecutive days ending today or yesterday)
        let current = 0;
        const todayDate = new Date();
        for (let i = 0; i <= 365; i++) {
            const d = format(subDays(todayDate, i), "yyyy-MM-dd");
            if (data[d] && data[d] > 0) { current++; }
            else if (i === 0) { continue; } // today not active yet, bridge
            else { break; }
        }

        // Longest streak
        let longest = 0;
        let run = 0;
        const sorted = Object.keys(data).filter(d => data[d] > 0).sort();
        for (let i = 0; i < sorted.length; i++) {
            if (i === 0) { run = 1; }
            else {
                const prev = new Date(sorted[i - 1] + "T00:00:00").getTime();
                const curr = new Date(sorted[i] + "T00:00:00").getTime();
                run = (curr - prev) === 86400000 ? run + 1 : 1;
            }
            if (run > longest) longest = run;
        }

        return { current, longest, bestCount, activeDays };
    }, [data]);

    // Auto-scroll desktop heatmap to the right (current date) on mount
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [desktop]);

    const handleMouseEnter = useCallback((e: React.MouseEvent, day: DayCell) => {
        if (day.isFuture) return;
        const container = containerRef.current;
        if (!container) return;
        const cellRect = e.currentTarget.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setTooltip({
            date: day.date,
            count: day.count,
            top: cellRect.top - containerRect.top - 36,
            left: cellRect.left - containerRect.left + cellRect.width / 2,
        });
    }, []);

    const handleMouseLeave = useCallback(() => setTooltip(null), []);

    const CELL_SIZE = 14; // px
    const CELL_GAP = 3; // px
    const COL_WIDTH = CELL_SIZE + CELL_GAP; // 17px per col

    return (
        <div ref={containerRef} className="relative space-y-4">
            {/* ── Header ──────────────────────────── */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    {label}
                </h3>
                <span className="text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                    {totalCount} {unit}
                </span>
            </div>

            {/* ── Stats row ───────────────────────── */}
            {showStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {[
                        { emoji: "📅", value: `${streakInfo.activeDays}`, label: "Active Days", bg: "rgba(52,211,153,0.12)" },
                        { emoji: "🔥", value: `${streakInfo.current}d`, label: "Current Streak", bg: "rgba(251,191,36,0.12)" },
                        { emoji: "🏆", value: `${streakInfo.longest}d`, label: "Longest Streak", bg: "rgba(99,102,241,0.12)" },
                        { emoji: "⚡", value: `${streakInfo.bestCount}`, label: "Best Day", bg: "rgba(167,139,250,0.12)" },
                    ].map(s => (
                        <div key={s.label} className="flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl min-w-0" style={{ background: s.bg }}>
                            <span className="text-base sm:text-lg shrink-0">{s.emoji}</span>
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                                <div className="text-[9px] sm:text-[10px] font-semibold truncate" style={{ color: 'var(--text-tertiary)' }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Desktop Heatmap (hidden on mobile) ─────────── */}
            <div className="hidden md:block">
                <div ref={scrollRef} className="overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                    {/* Month labels */}
                    <div className="relative h-5 ml-10" style={{ width: `${weeks * COL_WIDTH}px` }}>
                        {desktop.monthLabels.map((m, i) => (
                            <span
                                key={`${m.label}-${i}`}
                                className="absolute text-[11px] font-semibold"
                                style={{ color: 'var(--text-tertiary)', left: `${m.colIndex * COL_WIDTH}px` }}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    <div className="flex" style={{ gap: `${CELL_GAP}px` }}>
                        {/* Day labels */}
                        <div className="shrink-0 flex flex-col pr-2" style={{ gap: `${CELL_GAP}px` }}>
                            {DAY_LABELS.map((d, i) => (
                                <div key={i} className="flex items-center justify-end text-[10px] font-semibold" style={{ height: `${CELL_SIZE}px`, width: 28, color: 'var(--text-tertiary)' }}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        {desktop.grid.map((week, wi) => (
                            <div key={wi} className="flex flex-col" style={{ gap: `${CELL_GAP}px` }}>
                                {week.map((day, di) => (
                                    <div
                                        key={`${wi}-${di}`}
                                        className="rounded-sm transition-colors duration-150"
                                        style={{
                                            width: CELL_SIZE,
                                            height: CELL_SIZE,
                                            background: getCellBg(day.count, day.isFuture, desktop.maxCount),
                                            outline: day.date === todayStr ? '2px solid var(--accent)' : day.isFuture ? 'none' : '1px solid var(--border)',
                                            outlineOffset: day.date === todayStr ? '1px' : '-1px',
                                        }}
                                        onMouseEnter={(e) => handleMouseEnter(e, day)}
                                        onMouseLeave={handleMouseLeave}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-1.5 mt-3">
                    <span className="text-[11px] font-medium mr-1" style={{ color: 'var(--text-tertiary)' }}>Less</span>
                    <div className="rounded-sm" style={{ width: CELL_SIZE, height: CELL_SIZE, background: scale.empty, outline: '1px solid var(--border)', outlineOffset: '-1px' }} />
                    {scale.levels.map((bg, i) => (
                        <div key={i} className="rounded-sm" style={{ width: CELL_SIZE, height: CELL_SIZE, background: bg, outline: '1px solid var(--border)', outlineOffset: '-1px' }} />
                    ))}
                    <span className="text-[11px] font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>More</span>
                </div>
            </div>

            {/* ── Mobile Heatmap (calendar-style current month) ─── */}
            <div className="md:hidden">
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-tertiary)' }}>{mobile.monthLabel}</p>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>{d}</div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="space-y-1.5">
                    {mobile.weeks.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 gap-1.5">
                            {week.map((day, di) => {
                                if (!day) return <div key={di} className="aspect-square" />;
                                const dayNum = parseInt(day.date.slice(-2), 10);
                                const bg = getCellBg(day.count, day.isFuture, mobile.maxCount);
                                const isToday = day.date === format(new Date(), "yyyy-MM-dd");
                                return (
                                    <div
                                        key={di}
                                        className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors ${isToday ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-(--bg-elevated)" : ""}`}
                                        style={{
                                            background: bg,
                                            color: day.count > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                            opacity: day.isFuture ? 0.3 : 1,
                                        }}
                                        onClick={() => {
                                            if (day.isFuture) return;
                                            setTooltip(t => t?.date === day.date ? null : { date: day.date, count: day.count, top: 0, left: 0 });
                                        }}
                                    >
                                        {dayNum}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Mobile summary for selected day */}
                {tooltip && (
                    <div className="mt-3 px-3 py-2 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)' }}>
                        <span className="font-bold">{tooltip.count}</span> {unit} on {format(new Date(tooltip.date + "T00:00:00"), "MMM d, yyyy")}
                    </div>
                )}

                {/* Legend */}
                <div className="flex items-center justify-center gap-1.5 mt-4">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Less</span>
                    <div className="w-4 h-4 rounded" style={{ background: scale.empty, border: '1px solid var(--border)' }} />
                    {scale.levels.map((bg, i) => (
                        <div key={i} className="w-4 h-4 rounded" style={{ background: bg, border: '1px solid var(--border)' }} />
                    ))}
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>More</span>
                </div>
            </div>

            {/* ── Desktop Tooltip (positioned relative to container) ─── */}
            {tooltip && (
                <div
                    className="hidden md:block absolute z-50 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xl pointer-events-none border whitespace-nowrap"
                    style={{
                        background: 'var(--bg-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                        top: `${tooltip.top}px`,
                        left: `${tooltip.left}px`,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <span className="font-black">{tooltip.count}</span> {unit} · {format(new Date(tooltip.date + "T00:00:00"), "MMM d, yyyy")}
                </div>
            )}
        </div>
    );
}
