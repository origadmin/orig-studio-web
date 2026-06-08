import React, {useState} from 'react';
import {
    Megaphone, Plus, Edit, Trash2, Tag, ChevronLeft, ChevronRight, Calendar,
    Search, Filter, Download, MoreVertical, ArrowRight, CheckCircle, X,
    Send, MessageCircle, TrendingUp, Smartphone, Sparkles,
    LayoutTemplate, CheckSquare, History, Globe, HelpCircle, Settings,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {useFeatureFlags} from '@/contexts/FeatureFlagsContext';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Switch} from '@/components/ui/switch';
import {
    useAdminPromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion,
    useAdminPromotionChannels, useAdminPromotionTemplates,
    useAdminPromotionTasks, useAdminPromotionLogs,
} from '@/hooks/queries';
import {type Promotion, type CreatePromotionRequest, type UpdatePromotionRequest} from '@/lib/api/promotion';
import type {PromotionChannel, PromotionTemplate, PromotionTask, PromotionLog} from '@/lib/api/promotion';

// ─── Badge variant mapping ───────────────────────────────────────────────────

const stitchStyleToBadgeVariant = (style: 'emerald' | 'slate' | 'amber' | 'red'): 'soft-success' | 'soft-neutral' | 'soft-warning' | 'soft-danger' => {
    switch (style) {
        case 'emerald': return 'soft-success';
        case 'slate': return 'soft-neutral';
        case 'amber': return 'soft-warning';
        case 'red': return 'soft-danger';
    }
};

// ─── Platform Icon ───────────────────────────────────────────────────────────

const XIcon = ({size = 14}: {size?: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
);

const platformIcons: Record<string, React.ReactNode> = {
    telegram: <Send size={14} />,
    discord: <MessageCircle size={14} />,
    twitter: <XIcon size={14} />,
    x: <XIcon size={14} />,
    default: <Globe size={14} />,
};

const platformColors: Record<string, string> = {
    telegram: 'text-[#0088cc]',
    discord: 'text-[#5865F2]',
    twitter: 'text-[#1DA1F2]',
    x: 'text-[#1DA1F2]',
    default: 'text-muted-foreground',
};

const PlatformBadge: React.FC<{platform: string}> = ({platform}) => {
    const p = platform.toLowerCase();
    const color = platformColors[p] || platformColors.default;
    const icon = platformIcons[p] || platformIcons.default;
    return (
        <Badge variant="outline" className={`gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${color} bg-accent border-border`}>
            {icon}
            {platform}
        </Badge>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PromotionPage() {
    const {t} = useTranslation();
    const featureFlags = useFeatureFlags();
    const [activeTab, setActiveTab] = useState('channels');

    const tabs = [
        {id: 'channels', icon: Globe, label: t('admin.promotionChannels', 'Channels')},
        {id: 'templates', icon: LayoutTemplate, label: t('admin.promotionTemplates', 'Templates')},
        {id: 'tasks', icon: CheckSquare, label: t('admin.promotionTasks', 'Tasks'), badge: '12'},
        {id: 'logs', icon: History, label: t('admin.promotionLogs', 'Logs')},
    ];

    return (
        <div className="p-6 space-y-6">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.title', 'Admin')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.promotion', 'Promotion')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Page Header */}
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Megaphone className="h-7 w-7 text-primary" />
                        {t('admin.promotionCenter', 'Promotion Center')}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-2xl">
                        {t('admin.promotionCenterDesc', 'Manage and monitor cross-platform promotional campaigns, social media distribution, and automated broadcasting tasks.')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-full px-5 py-2 font-semibold">
                        <Download size={18} />
                        {t('admin.exportReports', 'Export Reports')}
                    </Button>
                    <Button className="rounded-full px-5 py-2 font-semibold shadow-lg shadow-primary/20">
                        <Plus size={18} />
                        {t('admin.newCampaign', 'New Campaign')}
                    </Button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="gap-8 border-b border-border bg-transparent h-auto p-0 rounded-none w-full justify-start">
                    {tabs.map(tab => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="pb-3 px-1 border-b-2 flex items-center gap-2 text-sm font-semibold transition-colors rounded-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none border-transparent text-muted-foreground hover:text-foreground"
                        >
                            <tab.icon size={20} />
                            {tab.label}
                            {tab.badge && (
                                <Badge variant="soft-primary" className="text-[10px] font-bold px-1.5 py-0.5">
                                    {tab.badge}
                                </Badge>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Tab Content */}
                <TabsContent value="channels"><ChannelsTab /></TabsContent>
                <TabsContent value="templates"><TemplatesTab /></TabsContent>
                <TabsContent value="tasks"><TasksTab /></TabsContent>
                <TabsContent value="logs"><LogsTab /></TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Channels Tab ────────────────────────────────────────────────────────────

const ChannelsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const {data: channelsData, isLoading} = useAdminPromotionChannels({page, page_size: 20});

    const channels = channelsData?.items || [];
    const total = channelsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const statsCards = [
        {icon: Send, color: 'text-[#0088cc]', bgColor: 'bg-[#0088cc]/10', label: t('admin.telegramActive', 'Telegram Active'), value: '14.2k'},
        {icon: MessageCircle, color: 'text-[#5865F2]', bgColor: 'bg-[#5865F2]/10', label: t('admin.discordReach', 'Discord Reach'), value: '8.9k'},
        {icon: XIcon, color: 'text-[#1DA1F2]', bgColor: 'bg-[#1DA1F2]/10', label: t('admin.twitterImp', 'X / Twitter Imp.'), value: '124.5k'},
        {icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10', label: t('admin.avgConvRate', 'Avg. Conv. Rate'), value: '3.8%'},
    ];

    const statusStyle = (ch: PromotionChannel): 'emerald' | 'slate' | 'amber' | 'red' => {
        if (!ch.is_active) return 'slate';
        if (ch.status === 'failed') return 'red';
        if (ch.status === 'connecting') return 'amber';
        return 'emerald';
    };

    const statusLabel = (ch: PromotionChannel): string => {
        const s = ch.status?.toUpperCase();
        if (s === 'FAILED') return t('admin.failed', 'FAILED');
        if (s === 'CONNECTING') return t('admin.connecting', 'CONNECTING');
        if (ch.is_active) return t('admin.connected', 'CONNECTED');
        return t('admin.disabled', 'DISABLED');
    };

    return (
        <div className="space-y-6">
            {/* Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {statsCards.map((card, i) => (
                    <Card key={i} className="p-0">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full ${card.bgColor} flex items-center justify-center`}>
                                <card.icon className={`${card.color}`} size={22} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Channels Table */}
            <Card className="rounded-lg overflow-hidden p-0">
                {/* Table Header Bar */}
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30">
                    <div className="flex gap-4 items-center">
                        <h3 className="text-lg font-semibold text-foreground">{t('admin.activeChannels', 'Active Channels')}</h3>
                        <div className="flex bg-background border border-border rounded-lg p-0.5">
                            {(['all', 'connected', 'failed'] as const).map(f => (
                                <Button
                                    key={f}
                                    variant={statusFilter === f ? 'default' : 'ghost'}
                                    size="sm"
                                    className={`text-[11px] font-bold rounded-md ${statusFilter !== f ? 'text-muted-foreground hover:text-foreground' : ''}`}
                                    onClick={() => setStatusFilter(f)}
                                >
                                    {f.toUpperCase()}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-10 pr-4 py-1.5 h-9 text-sm w-64"
                                placeholder={t('admin.searchChannels', 'Search channels...')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                            <Filter size={18} />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <Table className="text-left border-collapse">
                    <TableHeader className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/20">
                        <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="px-6 py-4">{t('admin.channelName', 'Channel Name')}</TableHead>
                            <TableHead className="px-6 py-4">{t('admin.platform', 'Platform')}</TableHead>
                            <TableHead className="px-6 py-4">{t('admin.connectionStatus', 'Connection Status')}</TableHead>
                            <TableHead className="px-6 py-4">{t('admin.publishCount', 'Publish Count')}</TableHead>
                            <TableHead className="px-6 py-4">{t('admin.lastActivity', 'Last Activity')}</TableHead>
                            <TableHead className="px-6 py-4">{t('admin.avgReach', 'Avg Reach')}</TableHead>
                            <TableHead className="px-6 py-4 text-right">{t('admin.actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="py-12 text-center"><Spinner className="mx-auto" /></TableCell></TableRow>
                        ) : channels.length > 0 ? channels.map(ch => (
                            <TableRow key={ch.id} className="hover:bg-accent/30 transition-colors group">
                                <TableCell className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-accent overflow-hidden border border-border flex items-center justify-center">
                                            <Globe size={20} className="text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{ch.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{ch.config?.handle || ''}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <PlatformBadge platform={ch.platform} />
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${statusStyle(ch) === 'emerald' ? 'bg-success' : statusStyle(ch) === 'red' ? 'bg-destructive' : 'bg-warning'}`}></span>
                                        <Badge variant={stitchStyleToBadgeVariant(statusStyle(ch))} className="font-mono font-bold text-xs">
                                            {statusLabel(ch)}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <p className="text-xs font-mono font-bold text-foreground">{ch.total_published?.toLocaleString() || 0}</p>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <p className="text-sm text-muted-foreground">{ch.last_published_at || '-'}</p>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden max-w-[80px]">
                                        <div className="bg-success h-full w-[85%]"></div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-right">
                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                                        <MoreVertical size={18} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <div className="py-16 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                            <Globe size={32} className="text-muted-foreground" />
                        </div>
                                        <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.noChannels', 'No channels found')}</h3>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {total > 20 && (
                    <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-secondary/10">
                        <p className="text-xs font-mono text-muted-foreground">
                            {t('admin.showing', 'Showing')} {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} {t('admin.of', 'of')} {total} {t('admin.channels', 'Channels')}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon-sm" className="disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft size={16} />
                            </Button>
                            {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                                const p = i + 1 + Math.max(0, page - 3);
                                if (p > totalPages) return null;
                                return (
                                    <Button
                                        key={p}
                                        variant={p === page ? 'default' : 'ghost'}
                                        size="icon-sm"
                                        className="text-xs font-bold"
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </Button>
                                );
                            })}
                            <Button variant="outline" size="icon-sm" className="disabled:opacity-30" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Bottom Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Automated Rules */}
                <Card className="p-0">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                        <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">{t('admin.automatedRules', 'Automated Rules')}</h4>
                            <p className="text-xs text-muted-foreground">{t('admin.automatedRulesDesc', 'Active publishing rules configured for smart distribution across time zones.')}</p>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-primary text-sm font-semibold cursor-pointer hover:underline">
                            {t('admin.manageRules', 'Manage Rules')}
                            <ArrowRight size={16} />
                        </div>
                    </CardContent>
                </Card>

                {/* AI Content Rewriter */}
                <Card className="bg-accent/30 border-primary/20 p-0">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Sparkles size={20} className="text-primary" />
                            </div>
                            <Badge variant="default" className="text-[10px] font-bold px-2 py-0.5">BETA</Badge>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">{t('admin.aiRewriter', 'AI Content Rewriter')}</h4>
                        <p className="text-xs text-muted-foreground">{t('admin.aiRewriterDesc', 'Automatically adapt your post content tone for different platforms using Gemini Pro.')}</p>
                    </CardContent>
                </Card>

                {/* Connect New */}
                <Card className="relative overflow-hidden group cursor-pointer p-0">
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors">
                                <Plus size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-foreground">{t('admin.connectNew', 'Connect New')}</h4>
                                <p className="text-xs text-muted-foreground">{t('admin.connectNewDesc', 'WhatsApp, Instagram, etc.')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// ─── Templates Tab ───────────────────────────────────────────────────────────

const TemplatesTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: templates, isLoading} = useAdminPromotionTemplates();

    const templateList = Array.isArray(templates) ? templates : [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full py-12 text-center"><Spinner className="mx-auto" /></div>
                ) : templateList.length > 0 ? templateList.map(tmpl => (
                    <Card key={tmpl.id} className="hover:border-primary/30 transition-colors p-0">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PlatformBadge platform={tmpl.platform} />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{tmpl.platform}</span>
                                </div>
                                <Switch defaultChecked={tmpl.is_active} />
                            </div>
                            <h4 className="text-sm font-semibold text-foreground">{tmpl.name}</h4>
                            <div className="bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground font-mono line-clamp-3">
                                {tmpl.content_template || t('admin.noContentPreview', 'No content preview')}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{t('admin.usageCount', 'Used')}: {tmpl.usage_count || 0}x</span>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <Edit size={14} />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive hover:bg-accent">
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )) : (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                            <LayoutTemplate size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.noTemplates', 'No templates found')}</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Tasks Tab ───────────────────────────────────────────────────────────────

const TasksTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: tasksData, isLoading} = useAdminPromotionTasks({page, page_size: 20});

    const tasks = tasksData?.items || [];
    const total = tasksData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const statusStyle = (status: string): 'emerald' | 'slate' | 'amber' | 'red' => {
        switch (status) {
            case 'published': return 'emerald';
            case 'scheduled': return 'amber';
            case 'failed': return 'red';
            case 'draft': return 'slate';
            default: return 'slate';
        }
    };

    const statusLabel = (status: string): string => {
        switch (status) {
            case 'published': return t('admin.published', 'Published');
            case 'scheduled': return t('admin.scheduled', 'Scheduled');
            case 'failed': return t('admin.failed', 'Failed');
            case 'draft': return t('admin.draft', 'Draft');
            default: return status;
        }
    };

    return (
        <Card className="rounded-lg overflow-hidden p-0">
            <Table className="text-left border-collapse">
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/20">
                    <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="px-6 py-4">{t('admin.taskName', 'Task Name')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.channel', 'Channel')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.template', 'Template')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.status', 'Status')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.scheduled', 'Scheduled')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.published', 'Published')}</TableHead>
                        <TableHead className="px-6 py-4 text-right">{t('admin.actions', 'Actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                    {isLoading ? (
                        <TableRow><TableCell colSpan={7} className="py-12 text-center"><Spinner className="mx-auto" /></TableCell></TableRow>
                    ) : tasks.length > 0 ? tasks.map(task => (
                        <TableRow key={task.id} className="hover:bg-accent/30 transition-colors">
                            <TableCell className="px-6 py-4 text-sm font-semibold text-foreground">{task.title}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-muted-foreground">{task.channel_id}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-muted-foreground">{task.template_id}</TableCell>
                            <TableCell className="px-6 py-4">
                                <Badge variant={stitchStyleToBadgeVariant(statusStyle(task.status))} className="gap-1.5">
                                    {task.status === 'published' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                                    {statusLabel(task.status)}
                                </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-muted-foreground">{task.scheduled_at || '-'}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-muted-foreground">{task.published_at || '-'}</TableCell>
                            <TableCell className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <Edit size={14} />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive hover:bg-accent">
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={7}>
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                                        <CheckSquare size={32} className="text-muted-foreground" />
                                    </div>
                                    <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.noTasks', 'No tasks found')}</h3>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {total > 20 && (
                <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-secondary/10">
                    <p className="text-xs font-mono text-muted-foreground">
                        {t('admin.showing', 'Showing')} {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} {t('admin.of', 'of')} {total} {t('admin.tasks', 'Tasks')}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon-sm" className="disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={16} />
                        </Button>
                        {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                            const p = i + 1 + Math.max(0, page - 3);
                            if (p > totalPages) return null;
                            return (
                                <Button
                                    key={p}
                                    variant={p === page ? 'default' : 'ghost'}
                                    size="icon-sm"
                                    className="text-xs font-bold"
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </Button>
                            );
                        })}
                        <Button variant="outline" size="icon-sm" className="disabled:opacity-30" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};

// ─── Logs Tab ────────────────────────────────────────────────────────────────

const LogsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: logsData, isLoading} = useAdminPromotionLogs({page, page_size: 20});

    const logs = logsData?.items || [];
    const total = logsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const statusStyle = (status: string): 'emerald' | 'slate' | 'amber' | 'red' => {
        switch (status) {
            case 'success': return 'emerald';
            case 'failed': return 'red';
            case 'pending': return 'amber';
            case 'info': return 'slate';
            default: return 'slate';
        }
    };

    const statusLabel = (status: string): string => {
        switch (status) {
            case 'success': return t('admin.success', 'Success');
            case 'failed': return t('admin.failed', 'Failed');
            case 'pending': return t('admin.pending', 'Pending');
            case 'info': return t('admin.info', 'Info');
            default: return status;
        }
    };

    return (
        <Card className="rounded-lg overflow-hidden p-0">
            <Table className="text-left border-collapse">
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/20">
                    <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="px-6 py-4">{t('admin.timestamp', 'Timestamp')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.task', 'Task')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.channel', 'Channel')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.action', 'Action')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.status', 'Status')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.message', 'Message')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                    {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="py-12 text-center"><Spinner className="mx-auto" /></TableCell></TableRow>
                    ) : logs.length > 0 ? logs.map(log => (
                        <TableRow key={log.id} className="hover:bg-accent/30 transition-colors">
                            <TableCell className="px-6 py-4">
                                <p className="text-xs font-mono text-muted-foreground">{log.create_time ? new Date(log.create_time).toLocaleString() : '-'}</p>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm font-semibold text-foreground">{log.task_id}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-muted-foreground">{log.channel_id}</TableCell>
                            <TableCell className="px-6 py-4">
                                <Badge variant="outline" className="font-mono font-bold text-xs uppercase">{log.action}</Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                                <Badge variant={stitchStyleToBadgeVariant(statusStyle(log.status))} className="gap-1.5">
                                    {statusLabel(log.status)}
                                </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-[300px] truncate">{log.message}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6}>
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                                        <History size={32} className="text-muted-foreground" />
                                    </div>
                                    <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.noLogs', 'No logs found')}</h3>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {total > 20 && (
                <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-secondary/10">
                    <p className="text-xs font-mono text-muted-foreground">
                        {t('admin.showing', 'Showing')} {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} {t('admin.of', 'of')} {total} {t('admin.logs', 'Logs')}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon-sm" className="disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={16} />
                        </Button>
                        {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                            const p = i + 1 + Math.max(0, page - 3);
                            if (p > totalPages) return null;
                            return (
                                <Button
                                    key={p}
                                    variant={p === page ? 'default' : 'ghost'}
                                    size="icon-sm"
                                    className="text-xs font-bold"
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </Button>
                            );
                        })}
                        <Button variant="outline" size="icon-sm" className="disabled:opacity-30" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};
