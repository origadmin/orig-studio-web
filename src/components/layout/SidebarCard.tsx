import React, {ReactNode} from 'react';
import {LucideIcon} from 'lucide-react';

interface SidebarCardProps {
    title?: string;
    icon?: LucideIcon;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    padded?: boolean;
}

export function SidebarCard({
    title,
    icon: Icon,
    action,
    children,
    className = '',
    padded = true,
}: SidebarCardProps) {
    return (
        <div className={`bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden ${className}`}>
            {title && (
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {Icon && <Icon size={15} className="text-muted-foreground"/>}
                        {title}
                    </h3>
                    {action && <div className="flex items-center">{action}</div>}
                </div>
            )}
            <div className={padded ? 'px-4 pb-4' : ''}>
                {children}
            </div>
        </div>
    );
}
