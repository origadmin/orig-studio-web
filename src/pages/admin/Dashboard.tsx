import {Spinner} from "@/components/ui/spinner"
import React from 'react';
import {
    Film,
    Users,
    Eye,
    MessageSquare,
    TrendingUp,
    TrendingDown,
    Download,
    RefreshCw,
    BarChart3,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {statsApi, type DashboardStats} from '@/lib/api/stats';

const Dashboard = () => {
    const {t} = useTranslation();

    const {data, isLoading, error, refetch} = useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: async () => {
            return await statsApi.getDashboard();
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center py-20 text-slate-500">
                <p className="text-lg mb-1">{t('common.loading')}</p>
                <p className="text-sm">{(error as Error).message}</p>
            </div>
        );
    }

    const stats: DashboardStats = data || {
        total_media: 0,
        total_users: 0,
        total_views: 0,
        total_comments: 0,
        total_subscribers: 0,
        total_revenue: 0,
        active_users: 0,
        new_users_today: 0,
        new_media_today: 0,
        new_views_today: 0,
        new_comments_today: 0,
        new_subscribers_today: 0,
        media_by_type: {video: 0, image: 0, audio: 0, other: 0},
        users_by_role: {admin: 0, editor: 0, user: 0},
        views_by_date: [],
        media_by_date: [],
        top_categories: [],
        top_creators: [],
        top_media: []
    };

    const formatNumber = (num: number | undefined | null) => {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    };

    const mediaTypeTotal = stats.media_by_type?.video + stats.media_by_type?.image + stats.media_by_type?.audio + stats.media_by_type?.other || 1;
    const usersTotal = stats.total_users || 1;

    return (
        <div className="p-8">
            {/* Page Title Area */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('admin.dashboard')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.dashboardDesc')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                        <Download className="w-4 h-4"/>
                        {t('admin.exportReport', 'Export PDF')}
                    </button>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                        onClick={() => refetch()}
                    >
                        <RefreshCw className="w-4 h-4"/>
                        {t('admin.syncData', 'Sync Data')}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Media */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalMedia')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatNumber(stats.total_media)}</h3>
                            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                {stats.new_media_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                +{stats.new_media_today} vs last month
                            </p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Film className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                {/* Total Users */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalUsers')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatNumber(stats.total_users)}</h3>
                            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                {stats.new_users_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                +{stats.new_users_today} vs last month
                            </p>
                        </div>
                        <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                            <Users className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                {/* Total Views */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalViews')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatNumber(stats.total_views)}</h3>
                            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                {stats.new_views_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                +{formatNumber(stats.new_views_today)} vs last month
                            </p>
                        </div>
                        <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Eye className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                {/* Comments */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalComments')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatNumber(stats.total_comments)}</h3>
                            <p className={`text-xs font-semibold mt-2 flex items-center gap-1 ${stats.new_comments_today > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {stats.new_comments_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                {stats.new_comments_today > 0 ? '+' : ''}{stats.new_comments_today} vs last month
                            </p>
                        </div>
                        <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <MessageSquare className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Row: Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Content Type Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-base font-semibold text-slate-800 mb-6">{t('admin.mediaByType', 'Content Type Distribution')}</h4>
                    <div className="flex items-center justify-center h-48 relative">
                        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                            <circle className="text-slate-100" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="12"/>
                            <circle className="text-indigo-600" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - 440 * (stats.media_by_type?.video / mediaTypeTotal)}
                                    strokeWidth="12"/>
                            <circle className="text-sky-400" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - 440 * (stats.media_by_type?.image / mediaTypeTotal)}
                                    strokeWidth="12"/>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-2xl font-bold text-slate-800">{formatNumber(stats.total_media)}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items</span>
                        </div>
                    </div>
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>Videos
                            </span>
                            <span className="font-mono text-xs text-slate-500">{mediaTypeTotal > 0 ? Math.round((stats.media_by_type?.video / mediaTypeTotal) * 100) : 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>Images
                            </span>
                            <span className="font-mono text-xs text-slate-500">{mediaTypeTotal > 0 ? Math.round((stats.media_by_type?.image / mediaTypeTotal) * 100) : 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Audio
                            </span>
                            <span className="font-mono text-xs text-slate-500">{mediaTypeTotal > 0 ? Math.round((stats.media_by_type?.audio / mediaTypeTotal) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>

                {/* User Role Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-base font-semibold text-slate-800 mb-6">{t('admin.usersByRole', 'User Role Distribution')}</h4>
                    <div className="flex items-center justify-center h-48">
                        <div className="relative w-40 h-40 rounded-full overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-indigo-600 opacity-20" style={{clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos(-Math.PI/2 + 2*Math.PI*(stats.users_by_role?.admin/usersTotal))}% ${50 - 50 * Math.sin(-Math.PI/2 + 2*Math.PI*(stats.users_by_role?.admin/usersTotal))}%, ${50 + 50 * Math.cos(-Math.PI/2 + 2*Math.PI*((stats.users_by_role?.admin + stats.users_by_role?.editor)/usersTotal))}% ${50 - 50 * Math.sin(-Math.PI/2 + 2*Math.PI*((stats.users_by_role?.admin + stats.users_by_role?.editor)/usersTotal))}%, 100% 50%)`}}></div>
                            <div className="absolute inset-0 bg-sky-400 opacity-40" style={{clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos(-Math.PI/2 + 2*Math.PI*((stats.users_by_role?.admin + stats.users_by_role?.editor)/usersTotal))}% ${50 - 50 * Math.sin(-Math.PI/2 + 2*Math.PI*((stats.users_by_role?.admin + stats.users_by_role?.editor)/usersTotal))}%, 100% 100%, 0% 100%)`}}></div>
                            <div className="absolute inset-0 bg-emerald-500 opacity-30" style={{clipPath: `polygon(50% 50%, 0% 100%, 0% 0%, 50% 0%)`}}></div>
                            <div className="w-32 h-32 bg-white rounded-full z-10 flex flex-col items-center justify-center">
                                <Users className="w-6 h-6 text-indigo-600"/>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Users</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-slate-100">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            <span className="text-xs font-medium text-slate-600">Admin: {usersTotal > 0 ? Math.round((stats.users_by_role?.admin / usersTotal) * 100) : 0}%</span>
                        </div>
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-slate-100">
                            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                            <span className="text-xs font-medium text-slate-600">Editor: {usersTotal > 0 ? Math.round((stats.users_by_role?.editor / usersTotal) * 100) : 0}%</span>
                        </div>
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-slate-100">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-medium text-slate-600">Regular: {usersTotal > 0 ? Math.round((stats.users_by_role?.user / usersTotal) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>

                {/* Top Categories */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-base font-semibold text-slate-800 mb-6">{t('admin.topCategories', 'Top Categories')}</h4>
                    <div className="space-y-6">
                        {stats.top_categories?.slice(0, 3).map((category: any, index: number) => {
                            const maxCount = stats.top_categories?.[0]?.count || 1;
                            const percentage = Math.round((category.count / maxCount) * 100);
                            const colors = ['bg-indigo-600', 'bg-sky-400', 'bg-emerald-500'];
                            return (
                                <div key={category.id} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 font-medium">{category.name}</span>
                                        <span className="font-mono text-slate-500 text-xs">{percentage}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${colors[index] || 'bg-slate-400'}`} style={{width: `${percentage}%`}}></div>
                                    </div>
                                </div>
                            );
                        })}
                        {(!stats.top_categories || stats.top_categories.length === 0) && (
                            <p className="text-sm text-slate-400 text-center py-8">No categories yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Performance Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-800">{t('admin.trendingContent', 'Top Content Performance')}</h3>
                    <button className="text-indigo-600 text-sm font-semibold hover:underline">{t('admin.viewAllReport', 'View All Report')}</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.mediaItem', 'Media Item')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.category', 'Category')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">{t('admin.views', 'Views')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">{t('admin.engagement', 'Engagement')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.status', 'Status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats.top_media?.slice(0, 5).map((item: any, index: number) => (
                                <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-8 rounded bg-slate-100 flex items-center justify-center">
                                                <Film className="w-4 h-4 text-slate-400"/>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700">{item.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">—</td>
                                    <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">{formatNumber(item.views)}</td>
                                    <td className="px-6 py-4 text-center font-mono text-xs text-emerald-600 font-semibold">—</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Live
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(!stats.top_media || stats.top_media.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <BarChart3 className="w-8 h-8 text-slate-300"/>
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noTrendingContent', 'No trending content yet')}</h3>
                                        <p className="text-sm text-slate-500 max-w-sm mx-auto">{t('admin.noTrendingContentDesc', 'Content performance data will appear here as views accumulate.')}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
