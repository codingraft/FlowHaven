import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, style, ...props }, ref) => {
        return (
            <div className="space-y-1.5 w-full">
                {label && (
                    <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            "w-full px-4 py-2 md:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm",
                            icon && "pl-11",
                            error ? "border-red-500/50 focus:border-red-500" : "focus:border-indigo-500/50",
                            className
                        )}
                        style={{
                            background: 'var(--bg-base)',
                            borderColor: error ? undefined : 'var(--border)',
                            color: 'var(--text-primary)',
                            ...style
                        }}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, children, style, ...props }, ref) => {
        return (
            <div className="space-y-1.5 w-full">
                {label && (
                    <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={cn(
                            "w-full px-4 py-2 md:py-3 border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm cursor-pointer",
                            error ? "border-red-500/50 focus:border-red-500" : "focus:border-indigo-500/50",
                            className
                        )}
                        style={{
                            background: 'var(--bg-base)',
                            borderColor: error ? undefined : 'var(--border)',
                            color: 'var(--text-primary)',
                            ...style
                        }}
                        {...props}
                    >
                        {children}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <ChevronDown size={14} />
                    </div>
                </div>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
        );
    }
);
Select.displayName = "Select";
