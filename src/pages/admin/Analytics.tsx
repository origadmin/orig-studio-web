import React, {useState} from 'react';
import {
    Eye,
    Users,
    Clock,
    UserPlus,
    TrendingUp,
    TrendingDown,
    BarChart3,
    ArrowRight,
    Calendar,
} from 'lucide-react';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Link} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

// ─── Mock Data ───────────────────────────────────────────────

const performanceData = [
    {date: 'Aug 01', views: 1200, engagement: 400},
    {date: 'Aug 04', views: 1800, engagement: 600},
    {date: 'Aug 07', views: 1400, engagement: 500},
    {date: 'Aug 10', views: 2200, engagement: 800},
    {date: 'Aug 13', views: 2800, engagement: 1100},
    {date: 'Aug 16', views: 2400, engagement: 900},
    {date: 'Aug 19', views: 3200, engagement: 1300},
    {date: 'Aug 22', views: 3800, engagement: 1500},
    {date: 'Aug 25', views: 3400, engagement: 1200},
    {date: 'Aug 28', views: 4200, engagement: 1800},
];

const categoryData = [
    {name: 'Video Training', value: 45, color: 'hsl(var(--primary))'},
    {name: 'Technical Docs', value: 28, color: 'hsl(var(--success))'},
    {name: 'Other', value: 27, color: 'hsl(var(--muted-foreground))'},
];

const funnelData = [
    {label: 'Published', value: '4,520', rate: '88.2%', icon: BarChart3},
    {label: 'Viewed', value: '3,984', rate: '42.5%', icon: Eye},
    {label: 'Engaged', value: '1,694', rate: '12.1%', icon: Users},
    {label: 'Shared', value: '205', rate: '', icon: ArrowRight},
];

const topContentData = [
    {
        rank: 1,
        title: 'Q3 Enterprise Security Audit Overview',
        category: 'Security',
        views: '428k',
        engagement: '5.2%',
        avgTime: '12:40',
        trend: '+18%',
        trendType: 'up' as const,
    },
    {
        rank: 2,
        title: 'Cloud Migration Strategy 2024',
        category: 'Infrastructure',
        views: '315k',
        engagement: '4.8%',
        avgTime: '08:15',
        trend: '+12%',
        trendType: 'up' as const,
    },
    {
        rank: 3,
        title: 'AI-Driven Predictive Analytics Guide',
        category: 'Advanced AI',
        views: '198k',
        engagement: '6.1%',
        avgTime: '15:22',
        trend: '-4%',
        trendType: 'down' as const,
    },
];

const sparklineViews = [
    {v: 25}, {v: 15}, {v: 20}, {v: 10}, {v: 25}, {v: 5}, {v: 15},
];
const sparklineEngagement = [
    {v: 20}, {v: 5}, {v: 22}, {v: 15}, {v: 10},
];
const sparklineWatchTime = [
    {v: 10}, {v: 12}, {v: 15}, {v: 20}, {v: 22},
];
const sparklineSubscribers = [
    {v: 28}, {v: 25}, {v: 15}, {v: 10}, {v: 2}, {v: 5},
];

// ─── Date Range Types ────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d' | 'custom';

// ─── Sub-components ──────────────────────────────────────────

const KPICard = ({
    label,
    value,
    trend,
    trendType,
    sparkData,
    sparkColor,
    icon: Icon,
}: {
    label: string;
    value: string;
    trend: string;
    trendType: 'up' | 'down';
    sparkData: {v: number}[];
    sparkColor: string;
    icon: React.ElementType;
}) => (
    <Card className="p-5 rounded-card shadow-sm border hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </span>
            <span
                className={`text-xs font-bold flex items-center gap-0.5 ${
                    trendType === 'up' ? 'text-success' : 'text-destructive'
                }`}
            >
                {trendType === 'up' ? (
                    <TrendingUp className="h-3.5 w-3.5"/>
                ) : (
                    <TrendingDown className="h-3.5 w-3.5"/>
                )}
                {trend}
            </span>
        </div>
        <div className="text-2xl font-bold text-foreground mb-3">{value}</div>
        <div className="h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{top: 0, right: 0, left: 0, bottom: 0}}>
                    <defs>
                        <linearGradient id={`grad-${label}`} x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3}/>
                            <stop offset="100%" stopColor={sparkColor} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="v"
                        stroke={sparkColor}
                        strokeWidth={2}
                        fill={`url(#grad-${label})`}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </Card>
);

const FunnelStep = ({
    label,
    value,
    icon: Icon,
    isLast,
    bgClass,
    textClass,
}: {
    label: string;
    value: string;
    icon: React.ElementType;
    isLast: boolean;
    bgClass: string;
    textClass: string;
}) => (
    <>
        <div
            className={`flex-1 ${bgClass} rounded-lg p-6 relative group overflow-hidden`}
        >
            <div
                className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="h-16 w-16"/>
            </div>
            <div className="relative z-10">
                <span
                    className={`text-[11px] font-medium uppercase tracking-wider ${
                        isLast ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                >
                    {label}
                </span>
                <div className={`text-2xl font-bold ${textClass}`}>{value}</div>
            </div>
        </div>
        {!isLast && (
            <div className="flex flex-col justify-center items-center px-2 shrink-0">
                <span className="text-xs font-bold text-success">
                    {funnelData[funnelData.findIndex((f) => f.label === label)].rate}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground"/>
            </div>
        )}
    </>
);

// ─── Main Component ──────────────────────────────────────────

const Analytics = () => {
    const {t} = useTranslation();
    const [dateRange, setDateRange] = useState<DateRange>('30d');

    const dateRangeOptions: {key: DateRange; label: string}[] = [
        {key: '7d', label: 'Last 7 days'},
        {key: '30d', label: 'Last 30 days'},
        {key: '90d', label: 'Last 90 days'},
        {key: 'custom', label: 'Custom'},
    ];

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* ── Breadcrumb ────────────────────────────────── */}
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.analytics', '数据分析')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* ── Page Header ────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        Analytics
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Performance monitoring for all platform content.
                    </p>
                </div>
                <div
                    className="flex items-center gap-1 bg-card p-1 rounded-card border border-border shadow-sm">
                    {dateRangeOptions.slice(0, 3).map((opt) => (
                        <Button
                            key={opt.key}
                            variant={dateRange === opt.key ? 'default' : 'ghost'}
                            size="sm"
                            className={`text-xs font-medium rounded-md ${
                                dateRange === opt.key
                                    ? ''
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setDateRange(opt.key)}
                        >
                            {opt.label}
                        </Button>
                    ))}
                    <div className="w-px h-4 bg-border mx-1"/>
                    <Button
                        variant={dateRange === 'custom' ? 'default' : 'ghost'}
                        size="sm"
                        className="text-xs font-medium rounded-md flex items-center gap-1.5"
                        onClick={() => setDateRange('custom')}
                    >
                        <Calendar className="h-3.5 w-3.5"/>
                        {dateRange === 'custom' ? 'Aug 01 - Aug 28' : 'Custom'}
                    </Button>
                </div>
            </div>

            {/* ── KPI Cards Row ──────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Total Views"
                    value="2.4M"
                    trend="12.5%"
                    trendType="up"
                    sparkData={sparklineViews}
                    sparkColor="hsl(var(--primary))"
                    icon={Eye}
                />
                <KPICard
                    label="Engagement Rate"
                    value="4.8%"
                    trend="3.2%"
                    trendType="up"
                    sparkData={sparklineEngagement}
                    sparkColor="hsl(var(--success))"
                    icon={BarChart3}
                />
                <KPICard
                    label="Avg. Watch Time"
                    value="8:42"
                    trend="0.8%"
                    trendType="down"
                    sparkData={sparklineWatchTime}
                    sparkColor="hsl(var(--destructive))"
                    icon={Clock}
                />
                <KPICard
                    label="New Subscribers"
                    value="1,284"
                    trend="8.4%"
                    trendType="up"
                    sparkData={sparklineSubscribers}
                    sparkColor="hsl(var(--info))"
                    icon={UserPlus}
                />
            </div>

            {/* ── Main Charts (8:4 split) ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Content Performance Over Time */}
                <div className="lg:col-span-8">
                    <Card className="rounded-card shadow-sm border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-semibold text-foreground">
                                    Content Performance Over Time
                                </h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary"/>
                    <span className="text-xs text-muted-foreground">Views</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary"/>
                    <span className="text-xs text-muted-foreground">Engagement</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={performanceData}
                                        margin={{top: 5, right: 10, left: -20, bottom: 0}}
                                    >
                                        <defs>
                                            <linearGradient id="grad-views" x1="0%" x2="0%" y1="0%" y2="100%">
                                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="grad-engagement" x1="0%" x2="0%" y1="0%" y2="100%">
                                                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.2}/>
                                                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="hsl(var(--border))"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="date"
                                            tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="views"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={2.5}
                                            fill="url(#grad-views)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="engagement"
                                            stroke="hsl(var(--secondary-foreground))"
                                            strokeWidth={2.5}
                                            fill="url(#grad-engagement)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Content by Category */}
                <div className="lg:col-span-4">
                    <Card className="rounded-card shadow-sm border h-full flex flex-col">
                        <CardContent className="p-6 flex flex-col h-full">
                            <h3 className="text-lg font-semibold text-foreground mb-8">
                                Content by Category
                            </h3>
                            <div className="flex-1 flex flex-col items-center justify-center relative">
                                <div className="w-48 h-48 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={80}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color}/>
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-extrabold text-foreground">
                                            1.2k
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Total Units
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 space-y-3">
                                {categoryData.map((cat) => (
                                    <div key={cat.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded"
                                                style={{backgroundColor: cat.color}}
                                            />
                                            <span className="text-sm text-foreground">{cat.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-foreground">
                                            {cat.value}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Conversion Funnel ──────────────────────────── */}
            <Card className="rounded-card shadow-sm border">
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-6">
                        Audience Conversion Funnel
                    </h3>
                    <div className="flex flex-col md:flex-row items-stretch justify-between gap-2">
                        <FunnelStep
                            label="Published"
                            value="4,520"
                            icon={BarChart3}
                            isLast={false}
                            bgClass="bg-primary/5"
                            textClass="text-foreground"
                        />
                        <FunnelStep
                            label="Viewed"
                            value="3,984"
                            icon={Eye}
                            isLast={false}
                            bgClass="bg-muted"
                            textClass="text-foreground"
                        />
                        <FunnelStep
                            label="Engaged"
                            value="1,694"
                            icon={Users}
                            isLast={false}
                            bgClass="bg-muted/70"
                            textClass="text-foreground"
                        />
                        <FunnelStep
                            label="Shared"
                            value="205"
                            icon={ArrowRight}
                            isLast={true}
                            bgClass="bg-primary"
                            textClass="text-primary-foreground"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── Top Performing Content Table ────────────────── */}
            <Card className="rounded-card shadow-sm border overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between bg-card">
                    <h3 className="text-lg font-semibold text-foreground">
                        Top Performing Content
                    </h3>
                    <Button variant="link" className="text-primary text-xs font-medium p-0 h-auto">
                        View All Report
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                                Rank
                            </th>
                            <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                                Content Title
                            </th>
                            <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                                Category
                            </th>
                            <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                                Views
                            </th>
                            <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                                Eng.
                            </th>
                            <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                                Avg. Time
                            </th>
                            <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                                Trend
                            </th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {topContentData.map((row) => (
                            <tr
                                key={row.rank}
                                className="hover:bg-muted/30 transition-colors group"
                            >
                                <td className="px-6 py-4">
                  <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                          row.rank === 1
                              ? 'bg-primary/10 text-primary'
                              : row.rank === 2
                                  ? 'bg-secondary text-secondary-foreground'
                                  : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    #{row.rank}
                  </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                        {row.title}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {row.category}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-foreground">
                                    {row.views}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                    {row.engagement}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                    {row.avgTime}
                                </td>
                                <td className="px-6 py-4">
                                    <div
                                        className={`flex items-center gap-1 ${
                                            row.trendType === 'up' ? 'text-success' : 'text-destructive'
                                        }`}
                                    >
                                        {row.trendType === 'up' ? (
                                            <TrendingUp className="h-4 w-4"/>
                                        ) : (
                                            <TrendingDown className="h-4 w-4"/>
                                        )}
                                        <span className="text-xs font-bold">{row.trend}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Analytics;
