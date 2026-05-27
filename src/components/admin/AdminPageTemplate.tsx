import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export interface AdminPageTemplateProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  filters?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const AdminPageTemplate: React.FC<AdminPageTemplateProps> = ({
  title,
  description,
  actions,
  stats,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  filters,
  className,
  children,
}) => {
  const hasSearchBar = onSearchChange || onSearchSubmit;

  return (
    <div className={cn('space-y-6 p-4 md:p-6', className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold leading-9 text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {stats}

      {hasSearchBar && (
        <div className="rounded-2xl border shadow-sm bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder || 'Search...'}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
              className="pl-10 rounded-xl"
            />
          </div>
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        </div>
      )}

      {children}
    </div>
  );
};

export default AdminPageTemplate;
