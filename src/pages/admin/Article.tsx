/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Admin - Article Management Page
 */

import {useState, useEffect} from 'react';
import {useNavigate} from '@tanstack/react-router';
import {
    Search,
    Plus,
    FileText,
    Eye,
    Clock,
    Calendar,
    TrendingUp,
    TrendingDown,
    Minus,
    Edit3,
    Trash2,
    RotateCcw,
    Info,
    Zap,
} from 'lucide-react';
import {adminArticleApi, Article} from '@/lib/api/article';
import {formatDateTime, formatViews} from '@/lib/format';
import {extractList} from '@/lib/extract';
import {usePagination} from '@/hooks/usePagination';
import {toast} from 'sonner';

export default function ArticlePage() {
    const navigate = useNavigate();
    const [articles, setArticles] = useState<Article[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {page, pageSize, total, setPage, setTotal, getParams} = usePagination();

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
    }, [page]);

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

    const totalPages = Math.ceil(total / pageSize);
    const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    // Stats derived from current data
    const totalArticles = total;
    const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);
    const publishedCount = articles.filter(a => a.state === 'published').length;

    const statusBadge = (state: string) => {
        switch (state) {
            case 'published':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Published
                    </span>
                );
            case 'draft':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Draft
                    </span>
                );
            case 'archived':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Archived
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{state}
                    </span>
                );
        }
    };

    return (
        <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Articles Management</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage, edit and publish your studio content across all distribution channels.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        onClick={handleReset}
                    >
                        <RotateCcw className="w-4 h-4"/>Filter
                    </button>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                        onClick={() => navigate({to: '/admin/articles/new'})}
                    >
                        <Plus className="w-4 h-4"/>New Article
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Articles</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{totalArticles.toLocaleString()}</h3>
                            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3"/>+12% vs last month
                            </p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <FileText className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Views</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatViews(totalViews)}</h3>
                            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3"/>+5.4%
                            </p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Eye className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Read Time</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">6.5m</h3>
                            <p className="text-xs font-semibold text-slate-400 mt-2 flex items-center gap-1">Stable</p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Clock className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Publish Rate</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{publishedCount}/wk</h3>
                            <p className="text-xs font-semibold text-red-600 mt-2 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3"/>-2%
                            </p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Calendar className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input
                            className="w-full pl-9 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                            placeholder="Search articles..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                    </select>
                    <select
                        className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        <option value="technology">Technology</option>
                        <option value="workflow">Workflow</option>
                        <option value="archive">Archive</option>
                    </select>
                    <button
                        className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                        onClick={handleReset}
                    >
                        <RotateCcw className="w-3.5 h-3.5"/>Reset
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Title + Excerpt</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Author</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Category</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="animate-pulse text-slate-400">Loading articles...</div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="text-red-500">{error}</div>
                                        <button
                                            className="mt-2 px-4 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                            onClick={() => window.location.reload()}
                                        >
                                            Retry
                                        </button>
                                    </td>
                                </tr>
                            ) : filteredArticles.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No articles found
                                    </td>
                                </tr>
                            ) : (
                                filteredArticles.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 max-w-md">
                                            <div className="flex flex-col">
                                                <span
                                                    className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors cursor-pointer"
                                                    onClick={() => navigate({to: '/admin/articles/$id/edit', params: {id: item.id}})}
                                                >
                                                    {item.title}
                                                </span>
                                                {item.summary && (
                                                    <span className="text-xs text-slate-500 line-clamp-1 mt-1">{item.summary}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                    {item.user_id ? item.user_id.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <span className="text-sm text-slate-700">{item.user_id || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 uppercase tracking-tight">
                                                {item.category_id ? `Cat-${item.category_id}` : 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {statusBadge(item.state)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-500">{formatDateTime(item.create_time)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Edit"
                                                    onClick={() => navigate({to: '/admin/articles/$id/edit', params: {id: item.id}})}
                                                >
                                                    <Edit3 className="w-4 h-4"/>
                                                </button>
                                                <button
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <p className="text-xs text-slate-500">
                        Showing {startItem} to {endItem} of {total.toLocaleString()} entries
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-colors disabled:opacity-50"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                            const pageNum = i + 1;
                            return (
                                <button
                                    key={pageNum}
                                    className={`h-8 ${pageNum === page ? 'px-3 bg-indigo-600 text-white text-sm font-medium' : 'w-8 text-sm text-slate-600 hover:bg-white'} rounded-lg transition-colors`}
                                    onClick={() => setPage(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        {totalPages > 5 && <span className="text-slate-400 px-1">...</span>}
                        <button
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-colors disabled:opacity-50"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Context Info */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 flex gap-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5"/>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800">Content Distribution Update</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Global SEO indexing for published articles is now automated. Any changes to Title or Slug will trigger a re-index. Please allow up to 15 minutes for propagation.</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 flex gap-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5"/>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800">System Performance</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Database latency is currently optimal at 14ms. Media library synchronization is running at full capacity with no items in the encoding retry queue.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
