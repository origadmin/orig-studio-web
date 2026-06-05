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
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Link} from '@tanstack/react-router';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table';

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
            <div className="p-8 text-center py-20 text-muted-foreground">
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
        <div className="p-8 space-y-8">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.title', 'Admin')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.dashboardTitle', 'Dashboard')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Page Title Area */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {t('admin.dashboardTitle', 'System Overview')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.dashboardTitleDesc', 'Real-time performance metrics and content distribution analytics.')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Download className="w-4 h-4"/>
                        {t('admin.exportReport', 'Export PDF')}
                    </Button>
                    <Button
                        onClick={() => refetch()}
                    >
                        <RefreshCw className="w-4 h-4"/>
                        {t('admin.syncData', 'Sync Data')}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Total Media */}
                <Card className="shadow-none hover:shadow-md transition-all group">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em]">
                                    {t('admin.totalMedia', 'TOTAL MEDIA')}
                                </p>
                                <h3 className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                                    {formatNumber(stats.total_media)}
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-success flex items-center gap-1">
                                {stats.new_media_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                +{formatNumber(stats.new_media_today)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Users */}
                <Card className="shadow-none hover:shadow-md transition-all group">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em]">
                                    {t('admin.totalUsers', 'TOTAL USERS')}
                                </p>
                                <h3 className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                                    {formatNumber(stats.total_users)}
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-info flex items-center gap-1">
                                {stats.new_users_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                +{formatNumber(stats.new_users_today)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Views */}
                <Card className="shadow-none hover:shadow-md transition-all group">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em]">
                                    {t('admin.totalViews', 'TOTAL VIEWS')}
                                </p>
                                <h3 className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                                    {formatNumber(stats.total_views)}
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-success flex items-center gap-1">
                                {stats.new_views_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                +{formatNumber(stats.new_views_today)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Comments */}
                <Card className="shadow-none hover:shadow-md transition-all group">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em]">
                                    {t('admin.totalComments', 'COMMENTS')}
                                </p>
                                <h3 className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                                    {formatNumber(stats.total_comments)}
                                </h3>
                            </div>
                            <span className={`text-xs font-mono flex items-center gap-1 ${stats.new_comments_today > 0 ? 'text-success' : 'text-destructive'}`}>
                                {stats.new_comments_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                {stats.new_comments_today > 0 ? '+' : ''}{formatNumber(stats.new_comments_today)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {/* Content Type Distribution */}
                <Card className="shadow-none">
                    <CardContent className="p-6">
                        <CardTitle className="mb-6">
                            {t('admin.mediaByType', 'Content Type Distribution')}
                        </CardTitle>
                        <div className="flex items-center justify-center h-48 relative">
                            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                                <circle className="text-muted" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="12"/>
                                <circle className="text-primary" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor"
                                        strokeDasharray={440}
                                        strokeDashoffset={440 - 440 * ((stats.media_by_type?.video || 0) / mediaTypeTotal)}
                                        strokeWidth="12"/>
                                <circle className="text-info" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor"
                                        strokeDasharray={440}
                                        strokeDashoffset={440 - 440 * ((stats.media_by_type?.image || 0) / mediaTypeTotal)}
                                        strokeWidth="12"/>
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-2xl font-bold text-foreground">
                                    {formatNumber(stats.total_media)}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Items
                                </span>
                            </div>
                        </div>
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2 text-sm text-foreground">
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>Videos
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                    {mediaTypeTotal > 0 ? Math.round(((stats.media_by_type?.video || 0) / mediaTypeTotal) * 100) : 0}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2 text-sm text-foreground">
                                    <span className="w-2.5 h-2.5 rounded-full bg-info"></span>Images
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                    {mediaTypeTotal > 0 ? Math.round(((stats.media_by_type?.image || 0) / mediaTypeTotal) * 100) : 0}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2 text-sm text-foreground">
                                    <span className="w-2.5 h-2.5 rounded-full bg-success"></span>Audio
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                    {mediaTypeTotal > 0 ? Math.round(((stats.media_by_type?.audio || 0) / mediaTypeTotal) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* User Role Distribution */}
                <Card className="shadow-none">
                    <CardContent className="p-6">
                        <CardTitle className="mb-6">
                            {t('admin.usersByRole', 'User Role Distribution')}
                        </CardTitle>
                        <div className="flex items-center justify-center h-48">
                            {usersTotal > 0 ? (
                                <div className="relative w-40 h-40 rounded-full overflow-hidden flex items-center justify-center"
                                     style={{
                                         background: `conic-gradient(
                                             hsl(var(--primary)) 0deg ${(stats.users_by_role?.admin || 0) / usersTotal * 360}deg,
                                             hsl(var(--info-foreground)) ${(stats.users_by_role?.admin || 0) / usersTotal * 360}deg ${((stats.users_by_role?.admin || 0) + (stats.users_by_role?.editor || 0)) / usersTotal * 360}deg,
                                             hsl(var(--success)) ${((stats.users_by_role?.admin || 0) + (stats.users_by_role?.editor || 0)) / usersTotal * 360}deg 360deg
                                         )`,
                                     }}
                                >
                                    <div className="w-32 h-32 bg-card rounded-full z-10 flex flex-col items-center justify-center">
                                        <Users className="w-6 h-6 text-primary"/>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Users</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <Users className="w-12 h-12 mb-2 opacity-30"/>
                                    <span className="text-sm">暂无数据</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex flex-wrap gap-2">
                            <div className="bg-muted px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-border">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span className="text-xs font-medium text-foreground">
                                    Admin: {usersTotal > 0 ? Math.round(((stats.users_by_role?.admin || 0) / usersTotal) * 100) : 0}%
                                </span>
                            </div>
                            <div className="bg-muted px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-border">
                                <span className="w-2 h-2 rounded-full bg-info"></span>
                                <span className="text-xs font-medium text-foreground">
                                    Editor: {usersTotal > 0 ? Math.round(((stats.users_by_role?.editor || 0) / usersTotal) * 100) : 0}%
                                </span>
                            </div>
                            <div className="bg-muted px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-border">
                                <span className="w-2 h-2 rounded-full bg-success"></span>
                                <span className="text-xs font-medium text-foreground">
                                    Regular: {usersTotal > 0 ? Math.round(((stats.users_by_role?.user || 0) / usersTotal) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Categories */}
                <Card className="shadow-none">
                    <CardContent className="p-6">
                        <CardTitle className="mb-6">
                            {t('admin.topCategories', 'Top Categories')}
                        </CardTitle>
                        <div className="space-y-6">
                            {stats.top_categories?.slice(0, 3).map((category: any, index: number) => {
                                const maxCount = stats.top_categories?.[0]?.count || 1;
                                const percentage = Math.round((category.count / maxCount) * 100);
                                const colors = ['bg-primary', 'bg-info', 'bg-success'];
                                return (
                                    <div key={category.id} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground font-medium">{category.name}</span>
                                            <span className="font-mono text-muted-foreground text-xs">{percentage}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full ${colors[index] || 'bg-muted-foreground'}`} style={{width: `${percentage}%`}}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!stats.top_categories || stats.top_categories.length === 0) && (
                                <p className="text-sm text-muted-foreground text-center py-8">No categories yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Table */}
            <Card className="overflow-hidden shadow-none">
                <CardHeader className="px-6 py-5 border-b border-border flex flex-row items-center justify-between space-y-0">
                    <CardTitle>
                        {t('admin.trendingContent', 'Top Content Performance')}
                    </CardTitle>
                    <Button variant="link" className="text-primary text-sm font-semibold p-0 h-auto">
                        {t('admin.viewAllReport', 'View All Report')}
                    </Button>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted border-b border-border">
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.mediaItem', 'Media Item')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.category', 'Category')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                                {t('admin.views', 'Views')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                                {t('admin.engagement', 'Engagement')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                                {t('admin.status', 'Status')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                        {stats.top_media?.slice(0, 5).map((item: any, index: number) => (
                            <TableRow key={item.id || index}>
                                <TableCell className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                                            <Film className="w-4 h-4 text-muted-foreground"/>
                                        </div>
                                        <span className="text-sm font-semibold text-foreground">{item.title}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-sm text-muted-foreground">—</TableCell>
                                <TableCell className="px-6 py-4 text-center font-mono text-xs text-muted-foreground">
                                    {formatNumber(item.views)}
                                </TableCell>
                                <TableCell className="px-6 py-4 text-center font-mono text-xs text-success font-semibold">—</TableCell>
                                <TableCell className="px-6 py-4 text-right">
                                    <Badge variant="soft-success">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>Live
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!stats.top_media || stats.top_media.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="px-6 py-16 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BarChart3 className="w-8 h-8 text-muted-foreground/50"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-foreground mb-1">
                                        {t('admin.noTrendingContent', 'No trending content yet')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                        {t('admin.noTrendingContentDesc', 'Content performance data will appear here as views accumulate.')}
                                    </p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default Dashboard;
