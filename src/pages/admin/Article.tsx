/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Admin - Article Management Page
 */

import {useState, useEffect} from 'react';
import {Link} from '@tanstack/react-router';
import {useNavigate} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
    Search,
    Plus,
    FileText,
    Eye,
    Clock,
    Calendar,
    TrendingUp,
    TrendingDown,
    Edit3,
    Trash2,
    RotateCcw,
    Info,
    Zap
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {adminArticleApi, Article} from '@/lib/api/article';
import {formatDateTime, formatViews} from '@/lib/format';
import {extractList} from '@/lib/extract';
import {usePagination} from '@/hooks/usePagination';
import {TablePagination} from '@/components/common/TablePagination';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Select, SelectTrigger, SelectContent, SelectItem, SelectValue} from '@/components/ui/select';

export default function ArticlePage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [articles, setArticles] = useState<Article[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {page, pageSize, total, setPage, setTotal, setPageSize, getParams} = usePagination();

    useEffect(() => {
        const loadArticles = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await adminArticleApi.adminList(getParams());
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
        };

        loadArticles();
    }, [page, pageSize]);

    const filteredArticles = articles.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || item.state === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = async (id: string) => {
        try {
            await adminArticleApi.delete(id);
            setArticles(prev => prev.filter(a => a.id !== id));
            toast.success('Article deleted');
        } catch (err: any) {
            toast.error(`Delete failed: ${err?.message || 'Unknown error'}`);
        }
    };

    const handleReset = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setCategoryFilter('all');
    };

    // Stats derived from current data
    const totalArticles = total;
    const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);
    const publishedCount = articles.filter(a => a.state === 'published').length;

    const statusBadge = (state: string) => {
        switch (state) {
            case 'published':
                return (
                    <Badge variant="soft-success" className="gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {t('admin.published')}
                    </Badge>
                );
            case 'draft':
                return (
                    <Badge variant="soft-neutral" className="gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        {t('admin.draft')}
                    </Badge>
                );
            case 'archived':
                return (
                    <Badge variant="soft-neutral" className="gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        {t('admin.archived')}
                    </Badge>
                );
            default:
                return (
                    <Badge variant="soft-neutral" className="gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        {state}
                    </Badge>
                );
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {t('admin.manageArticles')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.manageArticlesDesc', 'Manage, edit and publish your studio content across all distribution channels.')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4" />
                        {t('common.filter')}
                    </Button>
                    <Button onClick={() => navigate({to: '/admin/articles/new'})}>
                        <Plus className="w-4 h-4" />
                        {t('admin.createArticle')}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Articles */}
                <Card className="hover:shadow-md transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">
                                    {t('admin.totalArticles')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                    {totalArticles.toLocaleString()}
                                </h3>
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +12% vs last month
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <FileText className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Views */}
                <Card className="hover:shadow-md transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">
                                    {t('admin.totalViews')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                    {formatViews(totalViews)}
                                </h3>
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +5.4%
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Eye className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Avg Read Time */}
                <Card className="hover:shadow-md transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">
                                    {t('admin.avgReadTime')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                    6.5m
                                </h3>
                                <p className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1">
                                    {t('admin.stable')}
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Publish Rate */}
                <Card className="hover:shadow-md transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">
                                    {t('admin.publishRate')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                    {publishedCount}/wk
                                </h3>
                                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                                    <TrendingDown className="w-3 h-3" />
                                    -2%
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Calendar className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filter Bar */}
            <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder={t('admin.searchArticles', 'Search articles...')}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.allStatus')}</SelectItem>
                            <SelectItem value="published">{t('admin.published')}</SelectItem>
                            <SelectItem value="draft">{t('admin.draft')}</SelectItem>
                            <SelectItem value="archived">{t('admin.archived')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.allCategories')}</SelectItem>
                            <SelectItem value="technology">{t('admin.technology')}</SelectItem>
                            <SelectItem value="workflow">{t('admin.workflow')}</SelectItem>
                            <SelectItem value="archive">{t('admin.archive')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t('admin.reset')}
                    </Button>
                </div>
            </div>

            {/* Table Container */}
            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted border-b border-border">
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.title')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.author')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.category')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.status')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.date')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                                {t('admin.actions')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-6 py-12 text-center">
                                    <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-6 py-12 text-center">
                                    <div className="text-destructive">{error}</div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => window.location.reload()}
                                    >
                                        {t('common.retry')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : filteredArticles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                    {t('common.noResults')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredArticles.map((item) => (
                                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors group">
                                    <TableCell className="px-6 py-4 max-w-md">
                                        <div className="flex flex-col">
                                            <span
                                                className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer"
                                                onClick={() => navigate({to: '/admin/articles/$id/edit', params: {id: item.id}})}
                                            >
                                                {item.title}
                                            </span>
                                            {item.summary && (
                                                <span className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.summary}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {item.user_id ? item.user_id.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <span className="text-sm text-foreground">{item.user_id || 'Unknown'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground uppercase tracking-tight">
                                            {item.category_id ? `Cat-${item.category_id}` : 'General'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        {statusBadge(item.state)}
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <span className="font-mono text-xs text-muted-foreground">{formatDateTime(item.create_time)}</span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title={t('admin.edit')}
                                                onClick={() => navigate({to: '/admin/articles/$id/edit', params: {id: item.id}})}
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title={t('admin.delete')}
                                                onClick={() => handleDelete(item.id)}
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-border bg-muted/30">
                    <TablePagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                </div>
            </Card>

            {/* Footer Context Info */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardContent className="p-6 flex gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                            <Info className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-foreground">{t('admin.contentDistributionUpdate')}</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {t('admin.contentDistributionUpdateDesc', 'Global SEO indexing for published articles is now automated. Any changes to Title or Slug will trigger a re-index. Please allow up to 15 minutes for propagation.')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-foreground">{t('admin.systemPerformance')}</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {t('admin.systemPerformanceDesc', 'Database latency is currently optimal at 14ms. Media library synchronization is running at full capacity with no items in the encoding retry queue.')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
