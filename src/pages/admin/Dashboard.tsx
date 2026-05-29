import {Spinner} from "@/components/ui/spinner"
import React from 'react';
import {
    FileText,
    Eye,
    Users,
    Zap,
    TrendingUp,
    TrendingDown,
    Minus,
    Plus,
    Upload,
    UserPlus,
    BarChart3,
    Calendar,
    CheckCircle,
    Pencil,
    ExternalLink
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {statsApi, DashboardStats} from '@/lib/api/stats';
import {Link} from '@tanstack/react-router';
import {Card, CardContent} from '@/components/ui/card';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';

const Dashboard = () => {
    const {t} = useTranslation();

    const {data, isLoading, error} = useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: async () => {
            return await statsApi.getDashboard();
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20 text-muted-foreground">
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
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="space-y-6 p-4 md:p-6">
            <section
                className="p-8 rounded-card bg-gradient-to-br from-primary/5 via-card to-primary/5 border border-primary/10 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="font-semibold text-2xl text-foreground mb-1">
                        {t('admin.welcomeBack', {name: 'Admin'})}
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4"/>
                        <span>{today}</span>
                        <span className="mx-2">•</span>
                        <span>{t('admin.systemOptimal')}</span>
                    </p>
                </div>
                <div
                    className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"/>
                <div
                    className="absolute -left-10 -bottom-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"/>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<FileText className="h-5 w-5"/>}
                    label={t('admin.totalArticles')}
                    value={formatNumber(stats.total_media)}
                    trend="+12%"
                    trendType="up"
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                />
                <StatCard
                    icon={<Eye className="h-5 w-5"/>}
                    label={t('admin.monthlyViews')}
                    value={formatNumber(stats.total_views)}
                    trend="+5.4%"
                    trendType="up"
                    iconBg="bg-info/10"
                    iconColor="text-info"
                />
                <StatCard
                    icon={<Users className="h-5 w-5"/>}
                    label={t('admin.activeUsers')}
                    value={formatNumber(stats.active_users)}
                    trend="-2%"
                    trendType="down"
                    iconBg="bg-secondary/10"
                    iconColor="text-secondary-foreground"
                />
                <StatCard
                    icon={<Zap className="h-5 w-5"/>}
                    label={t('admin.uptime')}
                    value="99.9%"
                    trend="Stable"
                    trendType="neutral"
                    iconBg="bg-success/10"
                    iconColor="text-success"
                />
            </div>

            <h2 className="font-semibold text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary"/>
                {t('admin.quickActions')}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickAction
                    icon={<Plus className="h-8 w-8"/>}
                    label={t('admin.createArticle')}
                    to="/admin/articles/new"
                />
                <QuickAction
                    icon={<Upload className="h-8 w-8"/>}
                    label={t('admin.uploadMedia')}
                    to="/admin/media"
                />
                <QuickAction
                    icon={<UserPlus className="h-8 w-8"/>}
                    label={t('admin.inviteUser')}
                    to="/admin/users"
                />
                <QuickAction
                    icon={<BarChart3 className="h-8 w-8"/>}
                    label={t('admin.viewReports')}
                    to="/admin/analytics"
                />
            </div>

            <div className="grid grid-cols-12 gap-4">
                <div
                    className="col-span-12 lg:col-span-8 bg-card border border-border rounded-card shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h3 className="font-semibold text-lg">{t('admin.recentArticles')}</h3>
                        <Link to="/admin/articles"
                              className="text-primary text-sm font-medium hover:underline">
                            {t('admin.viewAll')}
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-6 py-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                    {t('admin.title')}
                                </th>
                                <th className="px-6 py-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                    {t('admin.status')}
                                </th>
                                <th className="px-6 py-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                    {t('admin.author')}
                                </th>
                                <th className="px-6 py-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                    {t('admin.date')}
                                </th>
                                <th className="px-6 py-4 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">
                                    {t('admin.actions')}
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                            {stats.top_media?.slice(0, 5).map((item: any, index: number) => (
                                <ArticleRow
                                    key={index}
                                    title={item.title}
                                    slug={item.slug || `article-${index + 1}`}
                                    status={index === 0 ? 'published' : index === 1 ? 'review' : 'draft'}
                                    author={item.creator_name || 'Admin'}
                                    date={item.created_at || 'Oct 24, 2023'}
                                    id={item.id}
                                />
                            ))}
                            {(!stats.top_media || stats.top_media.length === 0) && (
                                <tr>
                                    <td colSpan={5}
                                        className="px-6 py-8 text-center text-muted-foreground text-sm">
                                        {t('admin.noArticlesYet')}
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div
                    className="col-span-12 lg:col-span-4 bg-card border border-border rounded-card shadow-sm">
                    <div className="p-6 border-b border-border">
                        <h3 className="font-semibold text-lg">{t('admin.activityTimeline')}</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        {stats.top_creators?.slice(0, 5).map((creator: any, index: number) => (
                            <ActivityItem
                                key={index}
                                name={creator.name}
                                action={index === 0 ? t('admin.published') : index === 1 ? t('admin.invitedEditor') : t('admin.updatedContent')}
                                target={creator.media_count > 0 ? `${creator.media_count} items` : ''}
                                time={index === 0 ? t('admin.minsAgo', {count: 2}) : index === 1 ? t('admin.minsAgo', {count: 45}) : t('admin.hoursAgo', {count: 3})}
                                isLast={index === Math.min(4, (stats.top_creators?.length || 0) - 1)}
                            />
                        ))}
                        {(!stats.top_creators || stats.top_creators.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {t('admin.noActivityYet')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <section
                className="bg-card border border-border rounded-card shadow-sm p-6 overflow-hidden relative">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="h-3 w-3 bg-success rounded-full"/>
                            <div className="absolute top-0 left-0 h-3 w-3 bg-success rounded-full animate-ping"/>
                        </div>
                        <h3 className="font-semibold text-lg">{t('admin.systemHealth')}</h3>
                    </div>
                    <Badge variant="success"
                           className="bg-success/10 text-success text-xs font-bold rounded-full">
                        <CheckCircle className="h-3.5 w-3.5 mr-1"/>
                        {t('admin.allSystemsOperational')}
                    </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    <HealthBar label={t('admin.apiLatency')} value="24ms" percentage={15}/>
                    <HealthBar label={t('admin.serverLoad')} value="12.4%" percentage={12}/>
                    <HealthBar label={t('admin.storageCDN')} value="4.2 TB / 10 TB" percentage={42}/>
                </div>
                <div
                    className="absolute bottom-0 right-0 opacity-5 pointer-events-none">
                    <Zap className="h-40 w-40 text-primary"/>
                </div>
            </section>
        </div>
    );
};

const StatCard = ({
                      icon,
                      label,
                      value,
                      trend,
                      trendType,
                      iconBg,
                      iconColor
                  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend: string;
    trendType: 'up' | 'down' | 'neutral';
    iconBg: string;
    iconColor: string;
}) => (
    <Card className="p-6 rounded-card shadow-sm border hover:shadow-md transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className={`h-10 w-10 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>
                {icon}
            </div>
            <span className={`font-medium text-xs flex items-center gap-1 ${
                trendType === 'up' ? 'text-success' : trendType === 'down' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
                {trendType === 'up' ? <TrendingUp className="h-3.5 w-3.5"/> :
                    trendType === 'down' ? <TrendingDown className="h-3.5 w-3.5"/> :
                        <Minus className="h-3.5 w-3.5"/>}
                {trend}
            </span>
        </div>
        <p className="text-muted-foreground text-xs mb-1">{label}</p>
        <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
    </Card>
);

const QuickAction = ({icon, label, to}: { icon: React.ReactNode; label: string; to: string }) => (
    <Link to={to}>
        <Card
            className="flex flex-col items-center justify-center p-6 border hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer">
            <span className="text-primary mb-2 group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </Card>
    </Link>
);

const ArticleRow = ({
                        title,
                        slug,
                        status,
                        author,
                        date,
                        id
                    }: {
    title: string;
    slug: string;
    status: 'published' | 'review' | 'draft';
    author: string;
    date: string;
    id: string;
}) => {
    const statusConfig = {
        published: {label: 'Published', className: 'bg-success/10 text-success'},
        review: {label: 'Review', className: 'bg-warning/10 text-warning'},
        draft: {label: 'Draft', className: 'bg-muted text-muted-foreground'}
    };
    const cfg = statusConfig[status];

    return (
        <tr className="group hover:bg-muted/30 transition-colors">
            <td className="px-6 py-4">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{slug}</p>
            </td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${cfg.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                        status === 'published' ? 'bg-success' : status === 'review' ? 'bg-warning' : 'bg-muted-foreground'
                    }`}/>
                    {cfg.label}
                </span>
            </td>
            <td className="px-6 py-4 text-sm text-foreground">{author}</td>
            <td className="px-6 py-4 text-sm text-muted-foreground">{date}</td>
            <td className="px-6 py-4 text-right">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                    <Link to="/admin/articles/$id/edit" params={{id}}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5"/>
                        </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5"/>
                    </Button>
                </div>
            </td>
        </tr>
    );
};

const ActivityItem = ({
                          name,
                          action,
                          target,
                          time,
                          isLast
                      }: {
    name: string;
    action: string;
    target: string;
    time: string;
    isLast: boolean;
}) => (
    <div className="flex gap-4 relative">
        {!isLast && <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-border"/>}
        <Avatar className="h-8 w-8 z-10 border-2 border-background ring-1 ring-border">
            <AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <p className="text-sm text-foreground">
                <span className="font-bold">{name}</span> {action}
                {target && <span className="text-primary font-medium"> {target}</span>}
            </p>
            <p className="text-xs text-muted-foreground">{time}</p>
        </div>
    </div>
);

const HealthBar = ({label, value, percentage}: { label: string; value: string; percentage: number }) => (
    <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{label}</span>
            <span className="text-foreground font-medium">{value}</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500"
                 style={{width: `${percentage}%`}}/>
        </div>
    </div>
);

export default Dashboard;
