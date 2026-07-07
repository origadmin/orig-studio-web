import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type TabItem = {
    value: string;
    label: string;
    icon?: React.ReactNode;
};

export interface PortalPageTemplateProps {
    title: string;
    titleIcon?: React.ReactNode;
    themeColor?: string;
    subtitle?: string;
    description?: string;
    actions?: React.ReactNode;
    primaryAction?: React.ReactNode;
    stats?: React.ReactNode;
    tabs?: TabItem[];
    activeTab?: string;
    onTabChange?: (value: string) => void;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onSearchSubmit?: () => void;
    filters?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    className?: string;
    children?: React.ReactNode;
}

const MAX_WIDTH_MAP: Record<string, string> = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none',
};

const THEME_COLOR_MAP: Record<string, { icon: string; activeTab: string; hoverTab: string }> = {
    rose: { icon: 'text-rose-600 dark:text-rose-400', activeTab: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300', hoverTab: 'hover:bg-rose-50 dark:hover:bg-rose-950/30' },
    violet: { icon: 'text-violet-600 dark:text-violet-400', activeTab: 'bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300', hoverTab: 'hover:bg-violet-50 dark:hover:bg-violet-950/30' },
    sky: { icon: 'text-sky-600 dark:text-sky-400', activeTab: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300', hoverTab: 'hover:bg-sky-50 dark:hover:bg-sky-950/30' },
    emerald: { icon: 'text-emerald-600 dark:text-emerald-400', activeTab: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300', hoverTab: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30' },
    pink: { icon: 'text-pink-600 dark:text-pink-400', activeTab: 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300', hoverTab: 'hover:bg-pink-50 dark:hover:bg-pink-950/30' },
    amber: { icon: 'text-amber-600 dark:text-amber-400', activeTab: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300', hoverTab: 'hover:bg-amber-50 dark:hover:bg-amber-950/30' },
    blue: { icon: 'text-blue-600 dark:text-blue-400', activeTab: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300', hoverTab: 'hover:bg-blue-50 dark:hover:bg-blue-950/30' },
    indigo: { icon: 'text-indigo-600 dark:text-indigo-400', activeTab: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300', hoverTab: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30' },
    teal: { icon: 'text-teal-600 dark:text-teal-400', activeTab: 'bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300', hoverTab: 'hover:bg-teal-50 dark:hover:bg-teal-950/30' },
    orange: { icon: 'text-orange-600 dark:text-orange-400', activeTab: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300', hoverTab: 'hover:bg-orange-50 dark:hover:bg-orange-950/30' },
};

export const PortalPageTemplate: React.FC<PortalPageTemplateProps> = ({
    title,
    titleIcon,
    themeColor = 'primary',
    subtitle,
    description,
    actions,
    primaryAction,
    stats,
    tabs,
    activeTab,
    onTabChange,
    searchPlaceholder,
    searchValue,
    onSearchChange,
    onSearchSubmit,
    filters,
    maxWidth = 'lg',
    className,
    children,
}) => {
    const { t } = useTranslation();
    const hasSearchBar = onSearchChange || onSearchSubmit;
    const hasTabs = tabs && tabs.length > 0;
    const theme = THEME_COLOR_MAP[themeColor] || { icon: 'text-primary', activeTab: 'bg-accent text-foreground', hoverTab: 'hover:bg-accent/50' };
    const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || MAX_WIDTH_MAP.lg;

    return (
        <div className={cn('mx-auto space-y-6', maxWidthClass, className)}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0">
                    {titleIcon ? (
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <span className={cn('h-8 w-8 shrink-0 flex items-center justify-center', theme.icon)}>
                                {titleIcon}
                            </span>
                            {title}
                        </h1>
                    ) : (
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
                    )}
                    {subtitle && (
                        <p className="text-sm font-medium text-foreground/80 mt-1">{subtitle}</p>
                    )}
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>

            {stats}

            {hasTabs && (
                <div className="flex gap-1 p-1 bg-muted/60 rounded-full w-fit overflow-x-auto">
                    {tabs!.map((tab) => {
                        const isActive = activeTab === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => onTabChange?.(tab.value)}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200',
                                    isActive
                                        ? theme.activeTab + ' shadow-sm'
                                        : 'text-muted-foreground ' + theme.hoverTab
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {hasSearchBar && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={searchPlaceholder || t('common.search', '搜索...')}
                                value={searchValue}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
                                className="pl-9 h-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                            />
                        </div>
                        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
                    </div>
                </div>
            )}

            <div>{children}</div>

            {primaryAction && (
                <div className="flex justify-end pt-6 border-t border-border">
                    {primaryAction}
                </div>
            )}
        </div>
    );
};

export const EmptyState: React.FC<{
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground/50">
            {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        {description && (
            <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
        )}
        {action}
    </div>
);

export const VideoCardSkeleton: React.FC = () => (
    <div className="rounded-2xl overflow-hidden">
        <div className="aspect-video bg-muted rounded-2xl animate-pulse" />
        <div className="flex gap-3 mt-3">
            <div className="w-9 h-9 rounded-full bg-muted shrink-0 animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-full animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
            </div>
        </div>
    </div>
);

export const ListItemSkeleton: React.FC = () => (
    <div className="flex items-center gap-3 p-4 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-full animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
        </div>
    </div>
);

export default PortalPageTemplate;
