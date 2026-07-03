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
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table';
import {AdminPageTemplate} from '@/components/AdminPageTemplate';

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

    const pageActions = (
        <>
            <Button variant="outline">
                <Download className="w-4 h-4"/>
                {t('admin.exportReport', '导出报表')}
            </Button>
            <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4"/>
                {t('admin.syncData', '同步数据')}
            </Button>
        </>
    );

    return (
        <AdminPageTemplate
            title={t('admin.dashboardTitle', '系统概览')}
            titleIcon={<BarChart3 className="h-8 w-8" />}
            themeColor="indigo"
            description={t('admin.dashboardTitleDesc', '实时性能指标和内容分布分析。')}
            actions={pageActions}
        >
            <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* Total Media */}
                    <Card className="shadow-none hover:shadow-md transition-all group">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em]">
                                        {t('admin.totalMedia', '媒体总数')}
                                    </p>
                                    <h3 className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                                        {formatNumber(stats.total_media)}
                                    </h3>
                                </div>
                                <span className="text-xs font-mono text-success flex items-center gap-1">
                                    {stats.new_media_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                    +{formatNumber(stats.new_media_today)}
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
                                        {t('admin.totalUsers', '总用户数')}
                                    </p>
                                    <h3 className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                                        {formatNumber(stats.total_users)}
                                    </h3>
                                </div>
                                <span className="text-xs font-mono text-info flex items-center gap-1">
                                    {stats.new_users_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                    +{formatNumber(stats.new_users_today)}
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
                                        {t('admin.totalViews', '总播放量')}
                                    </p>
                                    <h3 className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                                        {formatNumber(stats.total_views)}
                                    </h3>
                                </div>
                                <span className="text-xs font-mono text-success flex items-center gap-1">
                                    {stats.new_views_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                    +{formatNumber(stats.new_views_today)}
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
                                        {t('admin.totalComments', '评论总数')}
                                    </p>
                                    <h3 className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                                        {formatNumber(stats.total_comments)}
                                    </h3>
                                </div>
                                <span className={`text-xs font-mono flex items-center gap-1 ${stats.new_comments_today > 0 ? 'text-success' : 'text-destructive'}`}>
                                    {stats.new_comments_today > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                    {stats.new_comments_today > 0 ? '+' : ''}{formatNumber(stats.new_comments_today)}
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
                                {t('admin.mediaByType', '按类型媒体')}
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
                                        {t('admin.items', '项')}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-6 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2 text-sm text-foreground">
                                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>{t('admin.video', '视频')}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {mediaTypeTotal > 0 ? Math.round(((stats.media_by_type?.video || 0) / mediaTypeTotal) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2 text-sm text-foreground">
                                        <span className="w-2.5 h-2.5 rounded-full bg-info"></span>{t('admin.image', '图片')}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {mediaTypeTotal > 0 ? Math.round(((stats.media_by_type?.image || 0) / mediaTypeTotal) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2 text-sm text-foreground">
                                        <span className="w-2.5 h-2.5 rounded-full bg-success"></span>{t('admin.audio', '音频')}
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
                                {t('admin.usersByRole', '按角色用户')}
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
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{t('admin.users', '用户')}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <Users className="w-12 h-12 mb-2 opacity-30"/>
                                        <span className="text-sm">{t('common.noData', '暂无数据')}</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex flex-wrap gap-2">
                                <div className="bg-muted px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-border">
                                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                                    <span className="text-xs font-medium text-foreground">
                                        {t('admin.admin', '管理员')}: {usersTotal > 0 ? Math.round(((stats.users_by_role?.admin || 0) / usersTotal) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="bg-muted px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-border">
                                    <span className="w-2 h-2 rounded-full bg-info"></span>
                                    <span className="text-xs font-medium text-foreground">
                                        {t('admin.editor', '编辑者')}: {usersTotal > 0 ? Math.round(((stats.users_by_role?.editor || 0) / usersTotal) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="bg-muted px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-border">
                                    <span className="w-2 h-2 rounded-full bg-success"></span>
                                    <span className="text-xs font-medium text-foreground">
                                        {t('admin.regular', '普通用户')}: {usersTotal > 0 ? Math.round(((stats.users_by_role?.user || 0) / usersTotal) * 100) : 0}%
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Categories */}
                    <Card className="shadow-none">
                        <CardContent className="p-6">
                            <CardTitle className="mb-6">
                                {t('admin.topCategories', '一级分类')}
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
                                    <p className="text-sm text-muted-foreground text-center py-8">{t('admin.noCategoriesYet', '暂无分类')}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Performance Table */}
                <Card className="overflow-hidden shadow-none">
                    <CardHeader className="px-6 py-5 border-b border-border flex flex-row items-center justify-between space-y-0">
                        <CardTitle>
                            {t('admin.trendingContent', '热门内容')}
                        </CardTitle>
                        <Button variant="link" className="text-primary text-sm font-semibold p-0 h-auto">
                            {t('admin.viewAllReport', '查看全部报表')}
                        </Button>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted border-b border-border">
                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('admin.mediaItem', '媒体项目')}
                                </TableHead>
                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('admin.category', '分类')}
                                </TableHead>
                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                                    {t('admin.views', '播放量')}
                                </TableHead>
                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                                    {t('admin.engagement', '互动')}
                                </TableHead>
                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                                    {t('admin.status', '状态')}
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
                                            <span className="w-1.5 h-1.5 rounded-full bg-success mr-1"></span>{t('admin.live', '在线')}
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
                                            {t('admin.noTrendingContent', '暂无热门内容')}
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                            {t('admin.noTrendingContentDesc', '随着播放量积累，内容表现数据将显示在这里。')}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AdminPageTemplate>
    );
};

export default Dashboard;
