"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isValid } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface DatePickerProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
}

export function DatePicker({ label, value, onChange, placeholder = "Select date", className = "" }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Parse value strictly
    const initialDate = useMemo(() => {
        if (!value) return new Date();
        const parsed = parseISO(value);
        return isValid(parsed) ? parsed : new Date();
    }, [value]);

    const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate));
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync month when value changes from outside
    useEffect(() => {
        if (value) {
            const parsed = parseISO(value);
            if (isValid(parsed)) {
                setCurrentMonth(startOfMonth(parsed));
            }
        }
    }, [value]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpen]);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const handleSelectDate = (day: Date) => {
        onChange(format(day, "yyyy-MM-dd"));
        setIsOpen(false);
    };

    // Calendar generation
    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }); // Start Monday
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const selectedDate = useMemo(() => {
        if (!value) return null;
        const parsed = parseISO(value);
        return isValid(parsed) ? parsed : null;
    }, [value]);

    const displayValue = selectedDate ? format(selectedDate, "MMM d, yyyy") : "";

    // Calculate popover position
    const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const popoverHeight = 350; // approximate height
            const popoverWidth = 288; // w-72 = 288px

            // Keep popover within horizontal screen bounds (with 16px padding)
            let leftPos = rect.left + window.scrollX;
            if (leftPos + popoverWidth > window.innerWidth - 16) {
                leftPos = window.innerWidth - popoverWidth - 16;
            }
            if (leftPos < 16) leftPos = 16;

            if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
                // Show above
                setPopupStyle({
                    position: 'absolute',
                    top: `${rect.top - popoverHeight + window.scrollY - 8}px`,
                    left: `${leftPos}px`,
                    width: `${popoverWidth}px`
                });
            } else {
                // Show below
                setPopupStyle({
                    position: 'absolute',
                    top: `${rect.bottom + window.scrollY + 8}px`,
                    left: `${leftPos}px`,
                    width: `${popoverWidth}px`
                });
            }
        }
    }, [isOpen]);

    // Handle scroll to update position
    useEffect(() => {
        if (!isOpen) return;
        const handleScroll = () => {
            // Re-calculate or just close
            setIsOpen(false);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);


    // Portal rendering
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2 md:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm h-auto md:min-h-[48px]"
                style={{
                    background: 'var(--bg-base)',
                    borderColor: isOpen ? 'var(--accent-light)' : 'var(--border)',
                    color: value ? 'var(--text-primary)' : 'var(--text-muted)'
                }}
            >
                <span className="truncate">{displayValue || placeholder}</span>
                <CalendarIcon size={16} className="text-zinc-500 shrink-0" />
            </button>

            {isOpen && mounted && typeof document !== 'undefined' && require('react-dom').createPortal(
                <div
                    className="z-[99999] p-4 rounded-2xl shadow-xl shadow-black/40 border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                    style={{ ...popupStyle, background: 'var(--bg-glass)', borderColor: 'var(--border)' }}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent click propagating to modal underlay
                    onTouchStart={(e) => e.stopPropagation()} // Prevent mobile touch propagating
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); prevMonth(); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            <select
                                value={currentMonth.getMonth()}
                                onChange={(e) => {
                                    const newDate = new Date(currentMonth);
                                    newDate.setMonth(parseInt(e.target.value));
                                    setCurrentMonth(newDate);
                                }}
                                className="bg-transparent appearance-none cursor-pointer hover:bg-white/10 px-1 py-0.5 rounded outline-none focus:ring-1 focus:ring-indigo-500/50"
                            >
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <option key={i} value={i} className="bg-zinc-800 text-white">{format(new Date(2000, i, 1), 'MMMM')}</option>
                                ))}
                            </select>
                            <select
                                value={currentMonth.getFullYear()}
                                onChange={(e) => {
                                    const newDate = new Date(currentMonth);
                                    newDate.setFullYear(parseInt(e.target.value));
                                    setCurrentMonth(newDate);
                                }}
                                className="bg-transparent appearance-none cursor-pointer hover:bg-white/10 px-1 py-0.5 rounded outline-none focus:ring-1 focus:ring-indigo-500/50"
                            >
                                {Array.from({ length: 30 }).map((_, i) => {
                                    const year = new Date().getFullYear() - 5 + i;
                                    return <option key={year} value={year} className="bg-zinc-800 text-white">{year}</option>
                                })}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); nextMonth(); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                            <div key={day} className="text-[10px] font-medium text-zinc-500">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, idx) => {
                            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); handleSelectDate(day); }}
                                    className={`
                                        h-8 w-8 rounded-full flex items-center justify-center text-xs transition-all relative
                                        ${!isCurrentMonth ? "opacity-30" : "hover:bg-white/10"}
                                        ${isSelected ? "bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20" : ""}
                                        ${isToday && !isSelected ? "text-indigo-400 font-bold" : ""}
                                    `}
                                    style={!isSelected && isCurrentMonth ? { color: 'var(--text-primary)' } : undefined}
                                >
                                    {format(day, "d")}
                                    {isToday && !isSelected && (
                                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
