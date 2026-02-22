import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, icon, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
                    {
                        // Variants
                        'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-transparent': variant === 'primary',
                        'bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm': variant === 'secondary',
                        'bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]': variant === 'outline',
                        'bg-transparent hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]': variant === 'ghost',
                        'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/10': variant === 'danger',

                        // Sizes
                        'h-8 px-3 text-xs': size === 'sm',
                        'h-10 px-4 text-sm': size === 'md',
                        'h-12 px-6 text-base': size === 'lg',
                        'h-10 w-10 p-2': size === 'icon',
                    },
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : icon ? (
                    <span className={cn("mr-2", { "mr-0": !children })}>{icon}</span>
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
