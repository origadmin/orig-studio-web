/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Admin - Article Management Page
 * Rewritten based on articles_management_ee_v3 prototype
 */

import {useState, useEffect, useMemo, useCallback} from 'react';
import {useNavigate} from '@tanstack/react-router';
import {
    Search,
    Plus,
    FileText,
    MoreHorizontal,
    Trash2,
    Edit,
    Eye,
    FileStack,
    CheckCircle2,
    Edit3,
    Calendar,
    AlertCircle,
    List,
    LayoutGrid,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card} from '@/components/ui/card';
import {Checkbox} from '@/components/ui/checkbox';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {adminArticleApi, type Article} from '@/lib/api/article';
import {adminCategoryApi, type Category} from '@/lib/api/category';
import {formatDateTime} from '@/lib/format';
import {extractList} from '@/lib/extract';
import {usePagination} from '@/hooks/usePagination';
import {PAGINATION_CONFIG} from '@/config/pagination';
import {toast} from 'sonner';

// ---------------------------------------------------------------------------
// Status badge configuration: dot color + background + text color
// ---------------------------------------------------------------------------
type StatusStyle = {
    dot: string;
    bg: string;
    text: string;
    label: string;
};

const STATUS_STYLES: Record<string, StatusStyle> = {
    published: {
        dot: 'bg-success',
        bg: 'bg-success/10',
        text: 'text-success',
        label: 'Published',
    },
    draft: {
        dot: 'bg-muted-foreground',
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        label: 'Draft',
    },
    scheduled: {
        dot: 'bg-info',
        bg: 'bg-info/10',
        text: 'text-info',
        label: 'Scheduled',
    },
    review: {
        dot: 'bg-warning',
        bg: 'bg-warning/10',
        text: 'text-warning',
        label: 'Review',
    },
    archived: {
        dot: 'bg-destructive',
        bg: 'bg-destructive/10',
        text: 'text-destructive',
        label: 'Archived',
    },
};

function getStatusStyle(state: string): StatusStyle {
    return STATUS_STYLES[state] ?? {
        dot: 'bg-muted-foreground',
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        label: state,
    };
}

// ---------------------------------------------------------------------------
// StatusDotBadge - matches prototype: dot + label in a pill
// ---------------------------------------------------------------------------
function StatusDotBadge({state}: { state: string }) {
    const style = getStatusStyle(state);
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-bold ${style.bg} ${style.text}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} mr-1.5`}/>
            {style.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ArticlePage() {
    const navigate = useNavigate();

    // -- Data state --
    const [articles, setArticles] = useState<Article[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // -- Filter state --
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // -- Selection state --
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // -- Pagination --
    const {
        page,
        pageSize,
        total,
        totalPages,
        isFirstPage,
        isLastPage,
        setPage,
        setPageSize,
        setTotal,
        nextPage,
        prevPage,
        getParams,
    } = usePagination();

    // -- Category map for display --
    const categoryMap = useMemo(() => {
        const map = new Map<number, Category>();
        categories.forEach((c) => map.set(c.id, c));
        return map;
    }, [categories]);

    // -- Stats computed from loaded articles --
    const stats = useMemo(() => {
        const published = articles.filter((a) => a.state === 'published').length;
        const drafts = articles.filter((a) => a.state === 'draft').length;
        const scheduled = articles.filter((a) => a.state === 'scheduled').length;
        return {published, drafts, scheduled};
    }, [articles]);

    // -----------------------------------------------------------------------
    // Data loading
    // -----------------------------------------------------------------------
    const loadArticles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, unknown> = {
                ...getParams(),
            };
            if (statusFilter !== 'all') {
                params.state = statusFilter;
            }
            if (categoryFilter !== 'all') {
                params.category_id = Number(categoryFilter);
            }
            if (searchTerm.trim()) {
                params.keyword = searchTerm.trim();
            }
            const response = await adminArticleApi.adminList(params as Parameters<typeof adminArticleApi.adminList>[0]);
            const articleList = extractList<Article>(response);
            setArticles(articleList);
            if ((response as any)?.total !== undefined) {
                setTotal((response as any).total);
            }
        } catch (err) {
            setError('Failed to load articles');
            console.error('Error loading articles:', err);
        } finally {
            setLoading(false);
        }
    }, [getParams, statusFilter, categoryFilter, searchTerm, setTotal]);

    const loadCategories = useCallback(async () => {
        try {
            const response = await adminCategoryApi.list({page: 1, page_size: 100});
            const list = extractList<Category>(response);
            setCategories(list);
        } catch {
            // Non-critical: category filter just won't show names
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        loadArticles();
    }, [loadArticles]);

    // -----------------------------------------------------------------------
    // Selection helpers
    // -----------------------------------------------------------------------
    const allSelected = articles.length > 0 && articles.every((a) => selectedIds.has(a.id));
    const someSelected = !allSelected && articles.some((a) => selectedIds.has(a.id));

    function toggleAll() {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(articles.map((a) => a.id)));
        }
    }

    function toggleOne(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    const handleDelete = async (id: string) => {
        try {
            await adminArticleApi.delete(id);
            setArticles((prev) => prev.filter((a) => a.id !== id));
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            toast.success('Article deleted');
        } catch (err: any) {
            toast.error(`Delete failed: ${err?.message || 'Unknown error'}`);
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        try {
            await Promise.all(ids.map((id) => adminArticleApi.delete(id)));
            setArticles((prev) => prev.filter((a) => !selectedIds.has(a.id)));
            setSelectedIds(new Set());
            toast.success(`${ids.length} article(s) deleted`);
        } catch (err: any) {
            toast.error(`Bulk delete failed: ${err?.message || 'Unknown error'}`);
        }
    };

    // -----------------------------------------------------------------------
    // Pagination range
    // -----------------------------------------------------------------------
    const paginationRange = useMemo(() => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('ellipsis');
            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (page < totalPages - 2) pages.push('ellipsis');
            pages.push(totalPages);
        }
        return pages;
    }, [page, totalPages]);

    const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const showingTo = Math.min(page * pageSize, total);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* ---- Header ---- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Articles
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Comprehensive overview of your content catalog and publication
                        statuses.
                    </p>
                </div>
                <Button
                    onClick={() => navigate({to: '/admin/articles/new'})}
                    className="shadow-sm active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4 mr-2"/>
                    New Article
                </Button>
            </div>

            {/* ---- Stats Row ---- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Articles */}
                <Card className="p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                            Total Articles
                        </span>
                        <FileStack className="w-4 h-4 text-primary"/>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold">{total.toLocaleString()}</span>
                    </div>
                </Card>

                {/* Published */}
                <Card className="p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                            Published
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-success"/>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold">{stats.published}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                            {total > 0
                                ? `${Math.round((stats.published / articles.length) * 100)}% page`
                                : '0%'}
                        </span>
                    </div>
                </Card>

                {/* Drafts */}
                <Card className="p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                            Drafts
                        </span>
                        <Edit3 className="w-4 h-4 text-warning"/>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold">{stats.drafts}</span>
                        {stats.drafts > 0 && (
                            <span className="text-[10px] font-bold text-warning inline-flex items-center bg-warning/10 px-1.5 py-0.5 rounded">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5"/>
                                Review
                            </span>
                        )}
                    </div>
                </Card>

                {/* Scheduled */}
                <Card className="p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                            Scheduled
                        </span>
                        <Calendar className="w-4 h-4 text-info"/>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold">{stats.scheduled}</span>
                        {stats.scheduled > 0 && (
                            <span className="text-[10px] font-medium text-info">Queued</span>
                        )}
                    </div>
                </Card>
            </div>

            {/* ---- Filter Bar ---- */}
            <Card className="p-4 shadow-sm">
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"/>
                        <Input
                            placeholder="Search by title, author, or keyword..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-9 rounded-input"
                        />
                    </div>

                    {/* Status filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] h-9 rounded-input text-xs font-medium">
                            <SelectValue placeholder="All Status"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Category filter */}
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[150px] h-9 rounded-input text-xs font-medium">
                            <SelectValue placeholder="All Categories"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Divider */}
                    <div className="h-6 w-px bg-border dark:bg-outline/20 mx-1"/>

                    {/* View toggle */}
                    <div
                        className="flex bg-muted dark:bg-on-surface-variant/10 rounded-btn p-1 border border-border dark:border-outline/20">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 rounded shadow-sm transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-card dark:bg-on-surface-variant/20 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="w-4 h-4"/>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 rounded transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-card dark:bg-on-surface-variant/20 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="w-4 h-4"/>
                        </Button>
                    </div>

                    {/* Bulk actions */}
                    {selectedIds.size > 0 && (
                        <>
                            <div className="h-6 w-px bg-border dark:bg-outline/20 mx-1"/>
                            <span className="text-xs text-muted-foreground">
                                {selectedIds.size} selected
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1"/>
                                Delete
                            </Button>
                        </>
                    )}
                </div>
            </Card>

            {/* ---- Table ---- */}
            <Card className="shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 dark:bg-on-surface-variant/10 hover:bg-muted/50 dark:hover:bg-on-surface-variant/10">
                                <TableHead className="w-12 py-3 px-4">
                                    <Checkbox
                                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                        onCheckedChange={toggleAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="py-3 px-4 text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                                    Article Info
                                </TableHead>
                                <TableHead className="py-3 px-4 text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                                    Status
                                </TableHead>
                                <TableHead className="py-3 px-4 text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                                    Category
                                </TableHead>
                                <TableHead className="py-3 px-4 text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                                    Author
                                </TableHead>
                                <TableHead className="py-3 px-4 text-[12px] leading-[16px] tracking-[0.05em] font-medium uppercase text-muted-foreground">
                                    Date
                                </TableHead>
                                <TableHead className="w-16"/>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <div
                                                className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"/>
                                            <span className="text-sm text-muted-foreground">
                                                Loading articles...
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="text-destructive text-sm">{error}</div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-3"
                                            onClick={() => loadArticles()}
                                        >
                                            Retry
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : articles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="w-10 h-10 text-muted-foreground/40"/>
                                            <span className="text-sm text-muted-foreground">
                                                No articles found
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                articles.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className={`group transition-colors ${
                                            selectedIds.has(item.id)
                                                ? 'bg-primary/5 dark:bg-primary/10'
                                                : ''
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <TableCell className="py-4 px-4">
                                            <Checkbox
                                                checked={selectedIds.has(item.id)}
                                                onCheckedChange={() => toggleOne(item.id)}
                                                aria-label={`Select ${item.title}`}
                                            />
                                        </TableCell>

                                        {/* Article Info */}
                                        <TableCell className="py-4 px-4">
                                            <div className="flex items-center space-x-4">
                                                <div
                                                    className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                                                    {item.thumbnail ? (
                                                        <img
                                                            alt={item.title}
                                                            className="w-full h-full object-cover"
                                                            src={item.thumbnail}
                                                        />
                                                    ) : (
                                                        <FileText className="w-5 h-5 text-muted-foreground"/>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate max-w-[280px]">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
                                                        /{item.slug}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="py-4 px-4">
                                            <StatusDotBadge state={item.state}/>
                                        </TableCell>

                                        {/* Category */}
                                        <TableCell className="py-4 px-4">
                                            {item.category_id ? (
                                                <span className="text-xs font-medium text-on-surface-variant dark:text-muted-foreground">
                                                    {categoryMap.get(item.category_id)?.name ?? `#${item.category_id}`}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">--</span>
                                            )}
                                        </TableCell>

                                        {/* Author */}
                                        <TableCell className="py-4 px-4">
                                            <div className="flex items-center space-x-2">
                                                <Avatar className="h-6 w-6 border border-border">
                                                    <AvatarImage
                                                        alt="Author"
                                                        src={undefined}
                                                    />
                                                    <AvatarFallback className="text-[10px] bg-muted">
                                                        {item.user_id.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium truncate max-w-[100px]">
                                                    {item.user_id.slice(0, 8)}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Date */}
                                        <TableCell className="py-4 px-4">
                                            <span className="text-xs text-muted-foreground">
                                                {formatDateTime(item.create_time)}
                                            </span>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="py-4 px-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-foreground"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (item.slug) {
                                                                window.open(`/articles/${item.slug}`, '_blank');
                                                            }
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2"/>
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            navigate({
                                                                to: '/admin/articles/$id/edit',
                                                                params: {id: item.id},
                                                            })
                                                        }
                                                    >
                                                        <Edit className="w-4 h-4 mr-2"/>
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2"/>
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* ---- Pagination Footer ---- */}
                {total > 0 && (
                    <div
                        className="p-4 bg-muted/30 dark:bg-on-surface-variant/10 border-t border-border dark:border-outline/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <span className="text-xs text-muted-foreground">
                                Showing {showingFrom} to {showingTo} of {total.toLocaleString()}{' '}
                                articles
                            </span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(v) => setPageSize(Number(v))}
                            >
                                <SelectTrigger className="h-7 w-[110px] rounded-input text-xs font-medium">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGINATION_CONFIG.PAGE_SIZE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={String(opt)}>
                                            {opt} per page
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-btn"
                                disabled={isFirstPage}
                                onClick={prevPage}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </Button>

                            <div className="flex items-center px-2">
                                {paginationRange.map((p, idx) =>
                                    p === 'ellipsis' ? (
                                        <span
                                            key={`ellipsis-${idx}`}
                                            className="px-2 text-xs text-muted-foreground tracking-widest"
                                        >
                                            ...
                                        </span>
                                    ) : (
                                        <Button
                                            key={p}
                                            variant={p === page ? 'default' : 'ghost'}
                                            size="icon"
                                            className={`h-8 w-8 rounded-btn text-xs font-bold ${
                                                p === page ? 'shadow-sm' : 'font-medium'
                                            }`}
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </Button>
                                    ),
                                )}
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-btn"
                                disabled={isLastPage}
                                onClick={nextPage}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
