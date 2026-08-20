import React from 'react';
import {Search, RotateCcw} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {useTranslation} from 'react-i18next';

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterSelect {
    key: string;
    placeholder: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
    className?: string;
}

export interface FilterBarProps {
    /** Search keyword input (controlled). Empty string hides input. */
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    /** Optional select filters rendered after the search box. */
    filters?: FilterSelect[];
    /** Optional reset button (clears filters back to defaults). */
    onReset?: () => void;
    resetDisabled?: boolean;
    resetLabel?: string;
    className?: string;
}

/**
 * Unified admin FilterBar (BUG-200).
 *
 * Standardizes the per-page hand-rolled filter rows (search input + role/status
 * selects + reset button) into a single component with consistent sizing,
 * alignment and behavior: search filters as-you-type, selects apply immediately,
 * reset restores defaults.
 *
 * Usage:
 *   <FilterBar
 *     searchValue={keyword}
 *     onSearchChange={(v) => setFilters(prev => ({...prev, keyword: v, page: 1}))}
 *     filters={[{key: 'role', placeholder: '全部角色', value: role, options: roleOptions, onChange: ...}]}
 *     onReset={resetFilters}
 *     resetDisabled={!keyword && role === 'all'}
 *   />
 */
export function FilterBar({
    searchValue,
    onSearchChange,
    searchPlaceholder,
    filters = [],
    onReset,
    resetDisabled = false,
    resetLabel,
    className = '',
}: FilterBarProps) {
    const {t} = useTranslation();

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <div className="relative flex-1 min-w-[220px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    className="pl-9 h-9"
                    placeholder={searchPlaceholder ?? (t('admin.search', '搜索') as string)}
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            {filters.map((f) => (
                <Select key={f.key} value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className={`h-9 w-40 ${f.className ?? ''}`}>
                        <SelectValue placeholder={f.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {f.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}
            {onReset && (
                <Button variant="outline" onClick={onReset} disabled={resetDisabled}>
                    <RotateCcw className="w-4 h-4" />
                    {resetLabel ?? (t('admin.reset', '重置') as string)}
                </Button>
            )}
        </div>
    );
}

export default FilterBar;
