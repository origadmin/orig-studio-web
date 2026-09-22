import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from '@tanstack/react-router';
import {useMyChannels, useChannelLimits} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';
import {useModuleState} from '@/contexts/ModuleConfigContext';
import {useQueryClient} from '@tanstack/react-query';
import {channelApi, type Channel} from '@/lib/api/channel';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarImage, AvatarFallback} from '@/components/ui/avatar';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {CreateChannelDialog} from '@/components/channel/CreateChannelDialog';
import {BannerPicker} from '@/components/channel/BannerPicker';
import {CHANNEL_BANNER_FALLBACK} from '@/components/channel/theme';
import {getImageUrl} from '@/lib/imageUtils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tv,
    Plus,
    Users,
    Video,
    Eye,
    Settings,
    ExternalLink,
    FileText,
    Loader2,
    ListVideo,
    Link2,
    Trash2,
    ChevronDown,
    CheckCircle2,
} from 'lucide-react';

/**
 * 频道状态徽章样式（docs/design/design-tokens.md「Status Badges」）。
 * 用语义 token 表达同一套观感：emerald→success、amber→warning、red→destructive、
 * slate→muted，保证深色主题下也能正确反色（硬编码 slate-* 类在深色模式下会失效）。
 */
type ChannelStatusStyle = {
    variant: 'soft-success' | 'soft-neutral' | 'soft-warning' | 'soft-danger';
    dot: string;
};

const CHANNEL_STATUS_STYLE: Record<string, ChannelStatusStyle> = {
    active: {variant: 'soft-success', dot: 'bg-success'},
    verified: {variant: 'soft-success', dot: 'bg-success'},
    inactive: {variant: 'soft-neutral', dot: 'bg-muted-foreground'},
    draft: {variant: 'soft-neutral', dot: 'bg-muted-foreground'},
    pending: {variant: 'soft-warning', dot: 'bg-warning'},
    pending_review: {variant: 'soft-warning', dot: 'bg-warning'},
    suspended: {variant: 'soft-danger', dot: 'bg-destructive'},
    banned: {variant: 'soft-danger', dot: 'bg-destructive'},
};

const NEUTRAL_STATUS_STYLE: ChannelStatusStyle = {
    variant: 'soft-neutral',
    dot: 'bg-muted-foreground',
};

/**
 * 后端下发的是 proto 枚举全名（'CHANNEL_STATUS_ACTIVE'，见 src/lib/mock.ts 的
 * statuses），统一归一成小写短名（'active'）后再比较 —— 直接拿全名和 'ACTIVE'
 * 比会恒不相等，导致活跃频道也被渲染出状态徽章。
 */
const normalizeChannelStatus = (status: string | undefined): string =>
    status ? status.replace('CHANNEL_STATUS_', '').toLowerCase() : '';

const MyChannels = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {isAuthenticated} = useAuth();
    const {modules} = useModuleState();
    const queryClient = useQueryClient();
    const {data: channels, isLoading} = useMyChannels(isAuthenticated);
    const {data: limits} = useChannelLimits(isAuthenticated);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editChannel, setEditChannel] = useState<Channel | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm, setEditForm] = useState({name: '', description: '', banner: ''});
    const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const channelList = channels || [];
    const canCreate = limits ? limits.can_create : true;
    const currentCount = limits?.current_count ?? 0;
    const maxChannels = limits?.max_channels ?? -1;

    /** 频道主键：proto 以 short_token 为主标识，id 仅作兜底（/me/videos 的筛选按 id）。 */
    const getChannelToken = (channel: Channel): string => channel.short_token || String(channel.id);

    // Map proto enum status to i18n key
    const getChannelStatusLabel = (status: string | undefined): string => {
        const normalized = normalizeChannelStatus(status);
        if (!normalized) return '';
        const key = `channel.status.${normalized}`;
        const translated = t(key);
        return translated === key ? status || '' : translated;
    };

    /** 状态 → 设计系统徽章样式（未知状态统一走中性灰）。 */
    const getChannelStatusStyle = (status: string | undefined): ChannelStatusStyle => {
        const normalized = normalizeChannelStatus(status);
        if (!normalized) return NEUTRAL_STATUS_STYLE;
        return CHANNEL_STATUS_STYLE[normalized] || NEUTRAL_STATUS_STYLE;
    };

    /** ACTIVE 是常态，只在异常态（pending/suspended/draft/banned…）才显示状态徽章。 */
    const shouldShowStatusBadge = (status: string | undefined): boolean => {
        const normalized = normalizeChannelStatus(status);
        return !!normalized && normalized !== 'active';
    };

    const handleCreateSuccess = () => {
        setCreateDialogOpen(false);
        queryClient.invalidateQueries({queryKey: ['channels']}); // BUG-314: owner key is ['channels','mine',uid] — invalidate the prefix
        queryClient.invalidateQueries({queryKey: ['channel', 'limits']});
    };

    const openEditDialog = (channel: Channel) => {
        setEditChannel(channel);
        setEditForm({name: channel.name, description: channel.description || '', banner: channel.banner || ''});
    };

    const handleEditSave = async () => {
        if (!editChannel?.short_token) return;
        setEditLoading(true);
        try {
            await channelApi.update(editChannel.short_token, {
                channel: {
                    name: editForm.name,
                    description: editForm.description,
                    banner: editForm.banner,
                },
            });
            queryClient.invalidateQueries({queryKey: ['channels']}); // BUG-314: owner key is ['channels','mine',uid] — invalidate the prefix
            setEditChannel(null);
        } catch {
            // 保存失败时保留弹窗，由用户重试或取消
        } finally {
            setEditLoading(false);
        }
    };

    // Channel-as-studio (BUG-317 r3): manage happens ON the channel page.
    // /c/{token} is owner-aware (backend is_owner) - the videos tab carries
    // the upload/edit/delete affordances there.
    const handleOpenChannelHome = (channel: Channel) => {
        navigate({to: '/c/$id', params: {id: getChannelToken(channel)}});
    };

    /** 频道主页在新标签打开，与「管理」入口（留在当前页）区分开。 */
    const handleOpenChannelHomeInNewTab = (channel: Channel) => {
        window.open(`/c/${getChannelToken(channel)}`, '_blank', 'noopener,noreferrer');
    };

    /**
     * 管理视频 → /me/videos?channel=<id>（MyVideos 的 scope 选择器按 channel.id 匹配，
     * 命中后走 GET /channels/{token}/videos 的真实频道级筛选，见 BUG-317）。
     */
    const handleManageVideos = (channel: Channel) => {
        navigate({to: '/me/videos', search: {channel: String(channel.id)}});
    };

    /** 管理文章 → /me/articles（文章管理页暂无频道级筛选参数）。 */
    const handleManageArticles = () => {
        navigate({to: '/me/articles'});
    };

    /** 复制频道链接：优先 Clipboard API，非安全上下文回退 execCommand。 */
    const handleCopyLink = async (channel: Channel): Promise<void> => {
        const url = `${window.location.origin}/c/${getChannelToken(channel)}`;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const helper = document.createElement('textarea');
                helper.value = url;
                helper.setAttribute('readonly', '');
                helper.style.position = 'fixed';
                helper.style.opacity = '0';
                document.body.appendChild(helper);
                helper.select();
                document.execCommand('copy');
                document.body.removeChild(helper);
            }
            toast.success(t('common.linkCopied', '链接已复制'));
        } catch {
            toast.error(t('channel.shareCopyFailed', '复制链接失败'));
        }
    };

    const handleDeleteChannel = async (): Promise<void> => {
        if (!deleteTarget?.short_token) return;
        setDeleteLoading(true);
        try {
            await channelApi.delete(deleteTarget.short_token);
            queryClient.invalidateQueries({queryKey: ['channels']});
            queryClient.invalidateQueries({queryKey: ['channel', 'limits']});
            toast.success(t('channel.deleteChannelSuccess', '频道已删除'));
            setDeleteTarget(null);
        } catch {
            toast.error(t('channel.deleteChannelFailed', '删除频道失败，请稍后重试'));
        } finally {
            setDeleteLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            {/*
              页面级顶部：/me/channels 不再复用 /me 布局的通用 sticky 头部
              （route.tsx 已对本路由隐藏该头部），改由本页自己渲染
              H1 + 副描述 + 配额进度 + 主操作，遵循 design-tokens 的层级与间距。
            */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {t('channel.myChannels')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('channel.myChannelsDescription', {
                            current: currentCount,
                            max: maxChannels === -1 ? t('common.unlimited') : maxChannels,
                        })}
                    </p>
                    {maxChannels > 0 && (
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted sm:w-56">
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{
                                        width: `${Math.min(100, Math.round((currentCount / maxChannels) * 100))}%`,
                                    }}
                                />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                                {currentCount}/{maxChannels}
                            </span>
                        </div>
                    )}
                </div>
                <Button
                    onClick={() => setCreateDialogOpen(true)}
                    disabled={!canCreate}
                    className="w-full shrink-0 rounded-lg text-sm font-semibold shadow-sm sm:w-auto"
                >
                    <Plus size={16}/>
                    {t('channel.create.title')}
                </Button>
            </div>

            {channelList.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Tv size={32} className="text-muted-foreground"/>
                        </div>
                        <h3 className="mb-1 text-base font-semibold text-foreground">
                            {t('channel.noChannelsTitle')}
                        </h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            {t('channel.noChannelsDescription')}
                        </p>
                        {canCreate && (
                            <Button
                                onClick={() => setCreateDialogOpen(true)}
                                className="mt-4 rounded-lg text-sm font-semibold shadow-sm"
                            >
                                <Plus size={16}/>
                                {t('channel.create.title')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                /*
                  还原为原来的大卡：白底卡片 + 顶部条图横幅 + 头像/信息区。
                  相对原实现的关键修正：banner 不再铺满整卡并叠 opacity-60 + 黑蒙版 +
                  全白字（那是「丑陋」的根因），改作正常的顶部横条；配色统一走
                  design tokens 的语义色，深色模式可正确反色。
                */
                <div className="grid gap-4">
                    {channelList.map(channel => (
                        <Card
                            key={channel.id}
                            data-testid="channel-card-row"
                            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                        >
                            {/* 顶部条图：真实 banner 作横条，不再整卡半透明铺底 */}
                            <div className="relative h-28 w-full sm:h-32">
                                {channel.banner ? (
                                    <img
                                        data-testid="channel-card-banner"
                                        src={getImageUrl(channel.banner)}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div
                                        data-testid="channel-card-banner"
                                        className={`h-full w-full ${CHANNEL_BANNER_FALLBACK}`}
                                    />
                                )}
                            </div>
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex min-w-0 flex-1 items-start gap-4">
                                        <Avatar
                                            data-testid="channel-card-avatar"
                                            className="h-14 w-14 flex-shrink-0 border-2 border-background shadow"
                                        >
                                            <AvatarImage
                                                src={getImageUrl(channel.avatar, 'avatar')}
                                                alt={channel.name}
                                            />
                                            <AvatarFallback className="bg-muted text-sm font-semibold text-muted-foreground">
                                                {channel.name?.charAt(0)?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-lg font-semibold text-foreground">
                                                    {channel.name}
                                                </h3>
                                                {channel.is_default && (
                                                    <Badge variant="soft-primary" className="font-medium">
                                                        {t('common.default', '默认')}
                                                    </Badge>
                                                )}
                                                {channel.is_verified && (
                                                    <Badge variant="soft-success" className="gap-1 font-medium">
                                                        <CheckCircle2 size={12}/>
                                                        {t('channel.verified')}
                                                    </Badge>
                                                )}
                                                {shouldShowStatusBadge(channel.status) && (
                                                    <Badge
                                                        variant={getChannelStatusStyle(channel.status).variant}
                                                        className="gap-1.5 font-medium"
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${getChannelStatusStyle(channel.status).dot}`}
                                                        />
                                                        {getChannelStatusLabel(channel.status)}
                                                    </Badge>
                                                )}
                                            </div>
                                            {channel.description && (
                                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                                    {channel.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1 whitespace-nowrap">
                                                    <Users size={13}/> {channel.subscriber_count || 0} {t('channel.subscribers')}
                                                </span>
                                                <span className="flex items-center gap-1 whitespace-nowrap">
                                                    <Video size={13}/> {channel.media_count || 0} {t('common.videos')}
                                                </span>
                                                {modules.articles && channel.article_count !== undefined && (
                                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                                        <FileText size={13}/> {channel.article_count} {t('common.articles')}
                                                    </span>
                                                )}
                                                {channel.total_views !== undefined && (
                                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                                        <Eye size={13}/> {channel.total_views} {t('common.views')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 右：主操作 + 带文字标签的下拉（齿轮已并入下拉的「频道设置」） */}
                                    <div className="flex flex-shrink-0 items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleOpenChannelHome(channel)}
                                            className="rounded-lg text-xs font-semibold shadow-sm"
                                        >
                                            <ExternalLink size={14}/>
                                            {t('channel.viewChannelHome', '查看频道主页')}
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-lg text-xs font-medium"
                                                >
                                                    {t('channel.moreOptions')}
                                                    <ChevronDown size={14}/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-52">
                                                <DropdownMenuItem onSelect={() => handleManageVideos(channel)}>
                                                    <ListVideo size={15} className="mr-2 text-muted-foreground"/>
                                                    {t('channel.manageVideos', '管理视频')}
                                                </DropdownMenuItem>
                                                {modules.articles && (
                                                    <DropdownMenuItem onSelect={() => handleManageArticles()}>
                                                        <FileText size={15} className="mr-2 text-muted-foreground"/>
                                                        {t('channel.manageArticles', '管理文章')}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onSelect={() => handleOpenChannelHomeInNewTab(channel)}>
                                                    <ExternalLink size={15} className="mr-2 text-muted-foreground"/>
                                                    {t('channel.viewChannelHome', '查看频道主页')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => void handleCopyLink(channel)}>
                                                    <Link2 size={15} className="mr-2 text-muted-foreground"/>
                                                    {t('channel.copyLink', '复制链接')}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator/>
                                                <DropdownMenuItem onSelect={() => openEditDialog(channel)}>
                                                    <Settings size={15} className="mr-2 text-muted-foreground"/>
                                                    {t('channel.channelSettings')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    disabled={channel.is_default}
                                                    onSelect={() => setDeleteTarget(channel)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 size={15} className="mr-2"/>
                                                    {t('channel.deleteChannel', '删除频道')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <CreateChannelDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={handleCreateSuccess}
            />

            <Dialog open={!!editChannel} onOpenChange={(open) => !open && setEditChannel(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('channel.channelSettings')}</DialogTitle>
                        <DialogDescription>
                            {editChannel?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 px-6 py-4">
                        <div className="grid gap-2">
                            <Label>{t('channel.create.name_label')}</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                                maxLength={150}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('channel.create.description_label')}</Label>
                            <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                                rows={3}
                            />
                        </div>
                        {/* SM-4: channel banner — template picker + owner upload (/me/banner) */}
                        <div className="grid gap-2">
                            <Label>{t('channel.banner_label', '频道条图')}</Label>
                            <BannerPicker
                                value={editForm.banner}
                                onChange={(v) => setEditForm(prev => ({...prev, banner: v}))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditChannel(null)} disabled={editLoading}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleEditSave} disabled={editLoading || !editForm.name.trim()}>
                            {editLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 删除频道：破坏性操作必须二次确认；默认频道不允许删除 */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('channel.deleteChannelTitle', '删除频道？')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('channel.deleteChannelConfirm', '频道「{{name}}」及其内容将被永久删除，此操作无法撤销。', {
                                name: deleteTarget?.name || '',
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteLoading}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void handleDeleteChannel()}
                            disabled={deleteLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                            {t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MyChannels;
