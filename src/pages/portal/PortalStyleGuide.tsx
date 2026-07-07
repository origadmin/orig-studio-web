import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
    Palette,
    Bell,
    Video,
    FileText,
    ListVideo,
    Heart,
    History,
    Users,
    Tv,
    Upload,
    Settings,
    ChevronLeft,
    ChevronRight,
    Search,
    Trash2,
    Check,
    X,
    Eye,
    Clock,
    PlayCircle,
    Info,
    Layers,
    Square,
    Type,
    Layout as LayoutIcon,
    AlertTriangle,
    TrendingUp,
    Sun,
    Moon,
    Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/themes';
import PortalPageTemplate, { EmptyState, VideoCardSkeleton, ListItemSkeleton } from '@/components/portal/PortalPageTemplate';
import { cn } from '@/lib/utils';

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <Card className="mb-6 border-border/60">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

const ThemeSwatch: React.FC<{ name: string; icon: React.ReactNode; colorClass: string; label: string }> = ({ name, icon, colorClass, label }) => (
    <div className="flex flex-col items-center gap-2">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm', colorClass)}>
            {icon}
        </div>
        <span className="text-xs font-medium text-foreground">{name}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
);

const PAGE_THEMES = [
    { name: 'rose', icon: <Bell className="w-6 h-6 text-white" />, colorClass: 'bg-rose-500', label: '通知' },
    { name: 'violet', icon: <Video className="w-6 h-6 text-white" />, colorClass: 'bg-violet-500', label: '视频' },
    { name: 'sky', icon: <FileText className="w-6 h-6 text-white" />, colorClass: 'bg-sky-500', label: '文章' },
    { name: 'emerald', icon: <ListVideo className="w-6 h-6 text-white" />, colorClass: 'bg-emerald-500', label: '播放列表' },
    { name: 'pink', icon: <Heart className="w-6 h-6 text-white" />, colorClass: 'bg-pink-500', label: '收藏' },
    { name: 'amber', icon: <History className="w-6 h-6 text-white" />, colorClass: 'bg-amber-500', label: '历史' },
    { name: 'blue', icon: <Users className="w-6 h-6 text-white" />, colorClass: 'bg-blue-500', label: '订阅' },
    { name: 'indigo', icon: <Tv className="w-6 h-6 text-white" />, colorClass: 'bg-indigo-500', label: '频道' },
    { name: 'teal', icon: <Upload className="w-6 h-6 text-white" />, colorClass: 'bg-teal-500', label: '上传' },
    { name: 'orange', icon: <Settings className="w-6 h-6 text-white" />, colorClass: 'bg-orange-500', label: '设置' },
];

const NOTIFICATION_DEMO = [
    { id: 1, title: '新视频审核通过', body: '您上传的 "夏日海边Vlog" 已通过审核并发布', time: '2分钟前', read: false, type: 'video' },
    { id: 2, title: '新订阅者', body: '@cool_user 订阅了您的频道', time: '1小时前', read: false, type: 'sub' },
    { id: 3, title: '评论回复', body: 'john_doe 回复了您的评论: "确实如此！"', time: '3小时前', read: true, type: 'comment' },
    { id: 4, title: '系统通知', body: '平台将于本周日凌晨2点进行维护', time: '昨天', read: true, type: 'system' },
];

const VideoCardDemo: React.FC<{ title: string; channel: string; views: string; time: string; duration: string; badge?: string }> = ({ title, channel, views, time, duration, badge }) => (
    <div className="group cursor-pointer">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <img
                src={`https://picsum.photos/seed/${title.replace(/\s/g,'')}/640/360`}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-md font-medium tabular-nums">
                {duration}
            </div>
            {badge && (
                <Badge className="absolute top-2 left-2" variant="soft-info">{badge}</Badge>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
            </div>
        </div>
        <div className="flex gap-3 mt-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex-shrink-0" />
            <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors">
                    {channel}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                    {views} · {time}
                </p>
            </div>
        </div>
    </div>
);

const NotificationItemDemo: React.FC<{ n: typeof NOTIFICATION_DEMO[0] }> = ({ n }) => (
    <div className={cn(
        'relative flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors',
        !n.read ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/35' : 'hover:bg-accent/50'
    )}>
        {!n.read && (
            <span className="absolute left-0 top-4 bottom-4 w-[3px] bg-rose-500 rounded-r-full" />
        )}
        <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            n.type === 'video' ? 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400' :
            n.type === 'sub' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' :
            n.type === 'comment' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
            'bg-muted text-muted-foreground'
        )}>
            {n.type === 'video' ? <Video className="w-5 h-5" /> :
             n.type === 'sub' ? <Users className="w-5 h-5" /> :
             n.type === 'comment' ? <Eye className="w-5 h-5" /> :
             <Bell className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
            <p className={cn('text-sm leading-snug', !n.read ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                {n.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground/70 tabular-nums">{n.time}</span>
            {!n.read && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
            </Tooltip>
        </div>
    </div>
);

const HISTORY_DEMO = [
    { id: 1, title: '10分钟学会React 19新特性', channel: '技术学堂', views: '12万次观看', time: '今天 14:30', duration: '10:23', watched: true },
    { id: 2, title: '夏日海边Vlog - 青岛之旅', channel: '旅行日记', views: '3.2万次观看', time: '昨天 20:15', duration: '15:42', watched: false },
    { id: 3, title: 'Material Design 3 完全指南', channel: '设计工坊', views: '8.5万次观看', time: '2天前', duration: '22:15', watched: true },
];

export default function PortalStyleGuide() {
    const { t } = useTranslation();
    const { colorMode, setColorMode } = useTheme();
    const [activeTab, setActiveTab] = useState('all');
    const [page, setPage] = useState(1);

    const meTabs = [
        { value: 'all', label: '全部', icon: <Layers className="w-4 h-4" /> },
        { value: 'unread', label: '未读', icon: <Bell className="w-4 h-4" /> },
        { value: 'mentions', label: '提及', icon: <Users className="w-4 h-4" /> },
    ];

    return (
        <TooltipProvider>
            <PortalPageTemplate
                title={t('portalStyleGuide.title', '门户样式指南')}
                titleIcon={<Palette className="h-8 w-8" />}
                themeColor="indigo"
                description={t('portalStyleGuide.description', '用户门户与个人中心页面的视觉规范与组件标准')}
                actions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-full border border-border p-1 gap-0.5">
                            <Button
                                variant={colorMode === 'light' ? 'default' : 'ghost'}
                                size="icon-sm"
                                onClick={() => setColorMode('light')}
                            >
                                <Sun className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={colorMode === 'dark' ? 'default' : 'ghost'}
                                size="icon-sm"
                                onClick={() => setColorMode('dark')}
                            >
                                <Moon className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={colorMode === 'system' ? 'default' : 'ghost'}
                                size="icon-sm"
                                onClick={() => setColorMode('system')}
                            >
                                <Monitor className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                }
            >
                <Card className="border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 mb-6">
                    <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground mb-1">
                                    {t('portalStyleGuide.philosophy', '设计理念：Content-First (内容优先)')}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    门户页面以内容为核心，采用 Material Design 3 柔和圆角、充裕留白、精心设计的微交互。
                                    所有 me 页面使用 <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">PortalPageTemplate</code> 统一标题、导航、搜索和操作区布局，与管理端 <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">AdminPageTemplate</code> 风格保持一致但更轻松。
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <Card className="border-l-4 border-l-indigo-500 border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
                                    <LayoutIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h4 className="font-semibold text-foreground">
                                    {t('portalStyleGuide.ruleTemplate', '页面模板')}
                                </h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                所有 /me/* 页面必须使用 PortalPageTemplate 包裹，统一标题+ICON+主题色+操作区。
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-rose-500 border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
                                    <Palette className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                </div>
                                <h4 className="font-semibold text-foreground">
                                    {t('portalStyleGuide.ruleColor', '主题色分配')}
                                </h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                每个页面有专属主题色，用于标题ICON、tabs选中态、badge，保持统一性。
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-500 border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                                    <Square className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h4 className="font-semibold text-foreground">
                                    {t('portalStyleGuide.ruleRadius', '圆角标准')}
                                </h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                卡片 rounded-2xl，按钮/输入框 rounded-full（搜索），列表项 rounded-xl，图片容器 rounded-2xl。
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                                    <Type className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h4 className="font-semibold text-foreground">
                                    {t('portalStyleGuide.ruleType', '字体层级')}
                                </h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                页面标题 text-3xl font-bold，卡片标题 text-base font-semibold，正文 text-sm，辅助文字 text-xs。
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-sky-500 border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center">
                                    <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                </div>
                                <h4 className="font-semibold text-foreground">
                                    {t('portalStyleGuide.ruleMediaCard', '媒体卡片')}
                                </h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                视频卡：aspect-video缩略图 + 圆角时长badge + hover微浮起+播放icon，标题2行截断。
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-destructive border-border/60">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                </div>
                                <h4 className="font-semibold text-foreground">
                                    {t('portalStyleGuide.ruleForbidden', '禁止项')}
                                </h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                禁止硬编码slate/gray颜色、禁止内联style、禁止管理端数据表格（用卡片/列表）、禁止alert/confirm。
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="template" className="w-full">
                    <TabsList className="mb-6 h-auto flex-wrap bg-muted/60 p-1 rounded-full">
                        <TabsTrigger value="template" className="rounded-full data-[state=active]:shadow-sm">
                            <LayoutIcon className="w-4 h-4 mr-1.5" />
                            {t('portalStyleGuide.tabTemplate', '页面模板')}
                        </TabsTrigger>
                        <TabsTrigger value="themes" className="rounded-full data-[state=active]:shadow-sm">
                            <Palette className="w-4 h-4 mr-1.5" />
                            {t('portalStyleGuide.tabThemes', '主题色')}
                        </TabsTrigger>
                        <TabsTrigger value="media" className="rounded-full data-[state=active]:shadow-sm">
                            <Video className="w-4 h-4 mr-1.5" />
                            {t('portalStyleGuide.tabMedia', '媒体卡片')}
                        </TabsTrigger>
                        <TabsTrigger value="lists" className="rounded-full data-[state=active]:shadow-sm">
                            <ListVideo className="w-4 h-4 mr-1.5" />
                            {t('portalStyleGuide.tabLists', '列表项')}
                        </TabsTrigger>
                        <TabsTrigger value="navigation" className="rounded-full data-[state=active]:shadow-sm">
                            <Layers className="w-4 h-4 mr-1.5" />
                            {t('portalStyleGuide.tabNav', '导航与Tabs')}
                        </TabsTrigger>
                        <TabsTrigger value="empty" className="rounded-full data-[state=active]:shadow-sm">
                            <Bell className="w-4 h-4 mr-1.5" />
                            {t('portalStyleGuide.tabEmpty', '空状态')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="template">
                        <Section title={t('portalStyleGuide.pageHeader', '页面标题区 (Page Header)')} description={t('portalStyleGuide.pageHeaderDesc', '统一的标题+ICON+主题色+描述+操作区布局')}>
                            <div className="border border-dashed border-border rounded-2xl p-6 bg-muted/20">
                                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                            <span className="h-8 w-8 shrink-0 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                                <Bell className="h-8 w-8" />
                                            </span>
                                            {t('portalStyleGuide.demoTitle', '通知中心')}
                                        </h1>
                                        <p className="text-sm font-medium text-foreground/80 mt-1">
                                            {t('portalStyleGuide.demoSubtitle', '管理您的所有系统通知和消息')}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t('portalStyleGuide.demoDesc', '共 24 条通知，3 条未读')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button variant="outline" size="sm">
                                            {t('portalStyleGuide.markAllRead', '全部已读')}
                                        </Button>
                                        <Button size="sm">
                                            <Check className="w-4 h-4 mr-1" />
                                            {t('portalStyleGuide.batchAction', '批量操作')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Section>

                        <Section title={t('portalStyleGuide.searchBar', '搜索栏 (Search Bar)')} description={t('portalStyleGuide.searchBarDesc', '圆角药丸风格搜索栏，h-10高度，无硬边框')}>
                            <div className="max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('portalStyleGuide.searchPlaceholder', '搜索通知...')}
                                        className="pl-9 h-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                                    />
                                </div>
                            </div>
                        </Section>

                        <Section title={t('portalStyleGuide.primaryBottom', '主操作沉底')} description={t('portalStyleGuide.primaryBottomDesc', '主要CTA按钮放在内容区底部，border-t分隔，右对齐')}>
                            <div className="border border-dashed border-border rounded-2xl overflow-hidden">
                                <div className="p-6 text-sm text-muted-foreground bg-muted/20 min-h-[80px] flex items-center justify-center">
                                    {t('portalStyleGuide.contentArea', '页面内容区域...')}
                                </div>
                                <div className="flex justify-end pt-4 px-6 pb-6 border-t border-border">
                                    <Button>
                                        <Upload className="w-4 h-4 mr-1.5" />
                                        {t('portalStyleGuide.uploadVideo', '上传视频')}
                                    </Button>
                                </div>
                            </div>
                        </Section>
                    </TabsContent>

                    <TabsContent value="themes">
                        <Section title={t('portalStyleGuide.themeColors', '页面主题色 (Theme Colors)')} description={t('portalStyleGuide.themeColorsDesc', '每个me页面分配专属主题色，通过themeColor属性统一管理ICON和tabs颜色')}>
                            <div className="flex flex-wrap gap-6 py-4">
                                {PAGE_THEMES.map((theme) => (
                                    <ThemeSwatch key={theme.name} {...theme} />
                                ))}
                            </div>
                        </Section>

                        <Alert className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
                            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <AlertTitle className="text-amber-700 dark:text-amber-300 font-medium">
                                {t('portalStyleGuide.themeNote', '主题色使用说明')}
                            </AlertTitle>
                            <AlertDescription className="text-sm">
                                themeColor 只控制页面标题ICON颜色和tabs选中态背景色。按钮、badge等仍使用语义化颜色token（primary、destructive等），主题色仅作为页面"个性标识"。
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    <TabsContent value="media">
                        <Section title={t('portalStyleGuide.videoCard', '视频卡片 (Video Card)')} description={t('portalStyleGuide.videoCardDesc', '门户核心展示组件：16:9缩略图、hover微浮起+播放icon、时长badge、2行标题截断')}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <VideoCardDemo title="10分钟学会React 19新特性" channel="技术学堂" views="12万次观看" time="3天前" duration="10:23" badge={t('portalStyleGuide.new', '新')} />
                                <VideoCardDemo title="夏日海边Vlog - 青岛之旅完整版" channel="旅行日记" views="3.2万次观看" time="1周前" duration="15:42" />
                                <VideoCardDemo title="Material Design 3 完全指南" channel="设计工坊" views="8.5万次观看" time="2周前" duration="22:15" />
                                <VideoCardDemo title="Go微服务架构实战教程" channel="后端开发" views="5.1万次观看" time="3周前" duration="45:30" />
                            </div>
                        </Section>

                        <Section title={t('portalStyleGuide.skeletonCard', '骨架屏加载')} description={t('portalStyleGuide.skeletonCardDesc', '视频卡片加载态，使用VideoCardSkeleton组件')}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {[1,2,3,4].map(i => <VideoCardSkeleton key={i} />)}
                            </div>
                        </Section>
                    </TabsContent>

                    <TabsContent value="lists">
                        <Section title={t('portalStyleGuide.notificationList', '通知列表项 (Notification Item)')} description={t('portalStyleGuide.notificationListDesc', '未读项左侧彩色竖条+彩色图标背景+圆点，已读项muted风格，hover显示操作按钮')}>
                            <div className="space-y-2 max-w-2xl">
                                {NOTIFICATION_DEMO.map(n => (
                                    <div key={n.id} className="group">
                                        <NotificationItemDemo n={n} />
                                    </div>
                                ))}
                            </div>
                        </Section>

                        <Section title={t('portalStyleGuide.historyList', '历史/播放列表项 (History Item)')} description={t('portalStyleGuide.historyListDesc', '紧凑横向布局：缩略图+时长+标题+频道+时间，适合浏览历史、播放列表等')}>
                            <div className="space-y-3 max-w-3xl">
                                {HISTORY_DEMO.map(item => (
                                    <div key={item.id} className="group flex gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer">
                                        <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-muted shrink-0">
                                            <img
                                                src={`https://picsum.photos/seed/hist${item.id}/320/180`}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[11px] px-1.5 py-0.5 rounded font-medium tabular-nums">
                                                {item.duration}
                                            </div>
                                            {item.watched && (
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                    <Check className="w-6 h-6 text-white drop-shadow" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 py-1">
                                            <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                                {item.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-1">{item.channel}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />{item.time}
                                                </span>
                                                <span>{item.views}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                                            <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        <Section title={t('portalStyleGuide.pagination', '分页 (Pagination)')} description={t('portalStyleGuide.paginationDesc', '简洁居中的分页控件，适合列表页底部')}>
                            <div className="flex items-center justify-center gap-1 pt-4">
                                <Button variant="outline" size="sm" className="rounded-full h-9 w-9 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                {[1,2,3,4,5].map(p => (
                                    <Button
                                        key={p}
                                        variant={page === p ? 'default' : 'ghost'}
                                        size="sm"
                                        className={cn('rounded-full h-9 w-9 p-0', page === p ? '' : 'text-muted-foreground')}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </Button>
                                ))}
                                <span className="text-sm text-muted-foreground px-1">...</span>
                                <Button variant="ghost" size="sm" className="rounded-full h-9 w-9 p-0 text-muted-foreground" onClick={() => setPage(10)}>10</Button>
                                <Button variant="outline" size="sm" className="rounded-full h-9 w-9 p-0" onClick={() => setPage(p => Math.min(10, p + 1))} disabled={page >= 10}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </Section>
                    </TabsContent>

                    <TabsContent value="navigation">
                        <Section title={t('portalStyleGuide.pillTabs', '药丸风格 Tabs (Pill Tabs)')} description={t('portalStyleGuide.pillTabsDesc', '门户页面使用圆角药丸tabs，非传统underline风格，选中态有主题色背景')}>
                            <div className="flex gap-1 p-1 bg-muted/60 rounded-full w-fit">
                                {meTabs.map((tab) => {
                                    const isActive = activeTab === tab.value;
                                    return (
                                        <button
                                            key={tab.value}
                                            onClick={() => setActiveTab(tab.value)}
                                            className={cn(
                                                'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200',
                                                isActive
                                                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 shadow-sm'
                                                    : 'text-muted-foreground hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                            )}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">当前选中: {activeTab}（rose主题色，注意此处颜色随页面 themeColor 变化）</p>
                        </Section>

                        <Section title={t('portalStyleGuide.categoryChips', '分类 Chips')} description={t('portalStyleGuide.categoryChipsDesc', '内容分类标签，使用rounded-full chip风格')}>
                            <div className="flex flex-wrap gap-2">
                                {['全部', '音乐', '游戏', '科技', '旅行', '美食', '运动', '教育', '电影', 'Vlog'].map((chip, i) => (
                                    <button
                                        key={chip}
                                        className={cn(
                                            'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                                            i === 0
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-muted/60 text-foreground/80 hover:bg-muted'
                                        )}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </Section>
                    </TabsContent>

                    <TabsContent value="empty">
                        <Section title={t('portalStyleGuide.emptyState', '空状态 (Empty State)')} description={t('portalStyleGuide.emptyStateDesc', '统一空状态：圆形背景+大号图标+标题+描述+可选CTA，使用EmptyState组件')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-dashed border-border rounded-2xl p-4">
                                    <EmptyState
                                        icon={<Heart className="w-8 h-8" />}
                                        title={t('portalStyleGuide.emptyFav', '暂无收藏')}
                                        description={t('portalStyleGuide.emptyFavDesc', '收藏喜欢的视频，随时回来观看')}
                                        action={
                                            <Button variant="outline" size="sm">
                                                {t('portalStyleGuide.exploreNow', '去发现')}
                                            </Button>
                                        }
                                    />
                                </div>
                                <div className="border border-dashed border-border rounded-2xl p-4">
                                    <EmptyState
                                        icon={<Bell className="w-8 h-8" />}
                                        title={t('portalStyleGuide.emptyNotif', '暂无通知')}
                                        description={t('portalStyleGuide.emptyNotifDesc', '当有新消息时会在这里显示')}
                                    />
                                </div>
                            </div>
                        </Section>

                        <Section title={t('portalStyleGuide.badges', 'Badge 徽章')} description={t('portalStyleGuide.badgesDesc', '门户使用soft变体badge，颜色语义化')}>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="soft-success">{t('portalStyleGuide.published', '已发布')}</Badge>
                                <Badge variant="soft-info">{t('portalStyleGuide.new', '新')}</Badge>
                                <Badge variant="soft-warning">{t('portalStyleGuide.processing', '处理中')}</Badge>
                                <Badge variant="soft-danger">{t('portalStyleGuide.failed', '失败')}</Badge>
                                <Badge variant="soft-neutral">{t('portalStyleGuide.draft', '草稿')}</Badge>
                                <Badge variant="outline" className="rounded-full">{t('portalStyleGuide.duration', '10:23')}</Badge>
                                <Badge className="rounded-full bg-rose-500">{t('portalStyleGuide.live', '直播中')}</Badge>
                            </div>
                        </Section>
                    </TabsContent>
                </Tabs>

                <Card className="mt-6 border-destructive/20 bg-destructive/5">
                    <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-destructive mb-2">
                                    {t('portalStyleGuide.forbiddenTitle', '⚠️ 禁止模式 (Forbidden Patterns)')}
                                </h4>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>❌ 硬编码 text-slate-*、bg-slate-*、text-gray-*、bg-gray-*（破坏深色模式）</li>
                                    <li>❌ style 属性设置颜色/尺寸（除动态计算外）</li>
                                    <li>❌ 管理端数据表格（Table组件）— 门户用卡片/列表</li>
                                    <li>❌ window.alert/confirm/prompt — 使用 Dialog + sonner toast</li>
                                    <li>❌ text-xl 用于卡片标题 — 用 text-base font-semibold</li>
                                    <li>❌ 直角/小圆角卡片 — 最小 rounded-xl</li>
                                    <li>❌ JSX中硬编码中/英/日文字符串 — 用 t('key', 'fallback')</li>
                                    <li>❌ 自行实现分页组件 — 使用统一的分页模式</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-6 border-t border-border mt-6">
                    <Button asChild>
                        <Link to="/me/notifications">
                            <Bell className="w-4 h-4 mr-1.5" />
                            {t('portalStyleGuide.viewNotifications', '查看通知中心示例')}
                        </Link>
                    </Button>
                </div>
            </PortalPageTemplate>
        </TooltipProvider>
    );
}
