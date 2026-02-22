import React from 'react';
import { cn } from '@/lib/utils';

// PageHeader Component
interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export const PageHeader = ({ title, description, children, className }: PageHeaderProps) => {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-8", className)}>
            <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                        {description}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3 min-w-0 max-w-full">
                    {children}
                </div>
            )}
        </div>
    );
};

// Card Component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, hoverEffect = false, style, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-3xl border overflow-hidden transition-all duration-300",
                    hoverEffect && "hover:shadow-xl hover:-translate-y-1 hover:border-zinc-500/30",
                    className
                )}
                style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--border)',
                    ...style
                }}
                {...props}
            />
        );
    }
);

Card.displayName = "Card";
