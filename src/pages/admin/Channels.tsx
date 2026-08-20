import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    Tv,
    Users,
    CheckCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    TrendingUp,
    MoreHorizontal,
} from 'lucide-react';
import {adminApi, Channel} from '@/lib/api/admin';
import {usePagination} from '@/hooks/usePagination';
import {useCategoryList} from '@/hooks/queries';
import {buildCategoryTree, getTreeSelectOptions} from '@/lib/utils/categoryTree';
import {formatNumber as fmtNumber} from '@/lib/format';
import {PAGINATION_CONFIG} from '@/config/pagination';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectTrigger, SelectContent, SelectItem, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';

const Channels: React.FC = () => {
    const {t} = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [verificationFilter, setVerificationFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {page, pageSize, total, totalPages, setPage, setTotal, getParams} = usePagination();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
    const [formData, setFormData] = useState<Partial<Channel>>({
        name: '',
        short_token: '',
        description: '',
        status: 'active',
        category_id: undefined as number | undefined,
        handle: '',
    });

    // BUG-237: 频道分类来自后端分类体系（与媒体编辑一致），不再硬编码。
    const {data: categoriesData} = useCategoryList();
    const categoryOptions = React.useMemo(() => {
        const items = categoriesData?.items ?? [];
        if (!items.length) return [];
        // 频道分类通用：全部分类树（不限 video 根）
        return getTreeSelectOptions(buildCategoryTree(items));
    }, [categoriesData]);

    useEffect(() => {
        loadChannels();
    }, [page]);

    const loadChannels = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.getChannels(getParams());
            const channelList = Array.isArray(response?.items) ? response.items : [];
            setChannels(channelList);
            if (response?.total !== undefined) {
                setTotal(response.total);
            }
        } catch (err) {
            setError(t('admin.failedToLoadChannels', '加载频道失败'));
            console.error('Error loading channels:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            short_token: '',
            description: '',
            status: 'active',
            handle: '',
            category_id: undefined,
        });
    };

    const handleCreate = async () => {
        try {
            await adminApi.createChannel(formData);
            await loadChannels();
            setShowCreateDialog(false);
            resetForm();
        } catch (err) {
            console.error('Failed to create channel:', err);
        }
    };

    const handleUpdate = async () => {
        if (!currentChannel) return;
        try {
            await adminApi.updateChannel(currentChannel.id, formData);
            await loadChannels();
            setShowEditDialog(false);
            resetForm();
            setCurrentChannel(null);
        } catch (err) {
            console.error('Failed to update channel:', err);
        }
    };

    const handleDelete = async () => {
        if (!currentChannel) return;
        try {
            await adminApi.deleteChannel(currentChannel.id);
            await loadChannels();
            setShowDeleteDialog(false);
            setCurrentChannel(null);
        } catch (err) {
            console.error('Failed to delete channel:', err);
        }
    };

    const openCreateDialog = () => {
        resetForm();
        setShowCreateDialog(true);
    };

    const openEditDialog = (channel: Channel) => {
        setCurrentChannel(channel);
        setFormData({
            name: channel.name,
            short_token: channel.short_token,
            description: channel.description,
            status: channel.status,
            handle: channel.handle || '',
            category_id: channel.category_id != null ? Number(channel.category_id) : undefined,
        });
        setShowEditDialog(true);
    };

    const openDeleteDialog = (channel: Channel) => {
        setCurrentChannel(channel);
        setShowDeleteDialog(true);
    };

    const [actionMenuFor, setActionMenuFor] = useState<Channel | null>(null);

    const filteredChannels = channels.filter(channel => {
        const matchesSearch =
            searchTerm === '' ||
            channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (channel.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const isVerified = channel.is_verified === true || channel.status === 'verified';
        const matchesVerification =
            verificationFilter === 'all' ||
            (verificationFilter === 'verified' && isVerified) ||
            (verificationFilter === 'not_verified' && !isVerified);
        return matchesSearch && matchesVerification;
    });

    // Stats (BUG-210: page-level cards = global base data; unfiltered fetch,
    // not affected by search/filter or the current page)
    const [statsChannels, setStatsChannels] = useState<{total: number; subs: number; verified: number; pending: number}>({total: 0, subs: 0, verified: 0, pending: 0});
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await adminApi.getChannels({page: 1, page_size: PAGINATION_CONFIG.HARD_LIMIT});
                if (cancelled) return;
                const items = Array.isArray(res?.items) ? res.items : [];
                setStatsChannels({
                    total: res?.total ?? items.length,
                    subs: items.reduce((sum, c) => sum + (c.subscriber_count || 0), 0),
                    verified: items.filter((c) => c.is_verified === true || c.status === 'verified').length,
                    pending: items.filter((c) => c.status === 'pending').length,
                });
            } catch {
                // Best-effort global stats; keep zeros on failure.
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const totalSubscribers = statsChannels.subs;
    const verifiedCount = statsChannels.verified;
    const pendingCount = statsChannels.pending;
    const verifiedRatio = statsChannels.total > 0 ? Math.round((statsChannels.verified / statsChannels.total) * 100) : 0;

    const getStatusBadge = (status: string, isVerified?: boolean) => {
        if (isVerified) {
            return (
                <Badge variant="soft-success" className="gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                    {t('common.verified')}
                </Badge>
            );
        }
        const config: Record<string, {variant: 'soft-success' | 'soft-warning' | 'soft-danger' | 'soft-info' | 'soft-neutral' | 'soft-primary'; dot: string; label: string}> = {
            verified: {variant: 'soft-success', dot: 'bg-emerald-500', label: t('common.verified')},
            active: {variant: 'soft-success', dot: 'bg-emerald-500', label: t('admin.normal', '普通')},
            pending: {variant: 'soft-warning', dot: 'bg-amber-500', label: t('admin.pending', '待审核')},
            banned: {variant: 'soft-danger', dot: 'bg-red-500', label: t('admin.banned', '已封禁')},
        };
        const c = config[status] || config.active;
        return (
            <Badge variant={c.variant} className="gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}${status === 'pending' ? ' animate-pulse' : ''}`}/>
                {c.label}
            </Badge>
        );
    };

    const formatNumber = (num: number | undefined | null) => {
        if (num === undefined || num === null) return '0';
        return fmtNumber(num);
    };

    const getCategoryLabel = (channel: Channel): string => {
        const map: Record<string, string> = {
            tech: '科技',
            cooking: '美食',
            music: '音乐',
            gaming: '游戏',
        };
        if (channel.tags && channel.tags.length > 0) {
            const tag = channel.tags[0].toLowerCase();
            if (map[tag]) return map[tag];
        }
        return '-';
    };

    const handleReset = () => {
        setSearchTerm('');
        setVerificationFilter('all');
        setCategoryFilter('all');
    };

    const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
        <div className="p-8">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.channels', '频道')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('admin.channels', '频道管理')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.manageChannels', '管理内容创作者频道、订阅者与认证状态')}
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4"/>
                    {t('admin.newChannel', '新建频道')}
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.channelTotal', '频道总数')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{statsChannels.total}</h3>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Tv className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.totalSubscribers', '总订阅者')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{formatNumber(totalSubscribers)}</h3>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Users className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.verifiedChannels', 'verifiedChannels')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{verifiedCount}</h3>
                                <p className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1">
                                    {verifiedRatio}% {t('admin.ofTotalChannels', '占总频道数')}
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <CheckCircle className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.pending', '待审核')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{pendingCount}</h3>
                                <p className="text-xs font-semibold text-red-500 mt-2 flex items-center gap-1">
                                    {t('admin.requiresAttention', 'requiresAttention')}
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Clock className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Section */}
            <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <Input
                            className="pl-9"
                            placeholder={t('admin.searchChannels', '搜索频道...')}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={`${t('admin.category', '分类')}: ${t('admin.allStatus', '全部')}`}/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.category', '分类')}: {t('admin.allStatus', '全部')}</SelectItem>
                            {categoryOptions.map((cat) => (
                                <SelectItem key={cat.id} value={String(cat.id)} disabled={cat.isDisabled}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={`${t('admin.verification', 'verification')}: ${t('admin.allStatus', '全部')}`}/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.verification', 'verification')}: {t('admin.allStatus', '全部')}</SelectItem>
                            <SelectItem value="verified">{t('common.verified')}</SelectItem>
                            <SelectItem value="not_verified">{t('admin.notVerified', '未认证')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="w-3.5 h-3.5"/>
                        {t('admin.reset', 'reset')}
                    </Button>
                </div>
            </div>

            {/* Main Table */}
            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.channel', '频道')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.ownerId', 'ownerId')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.subscriberCount', 'subscriberCount')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.videoCount', 'videoCount')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.category', '分类')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.status', '状态')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.actions', '操作')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="px-6 py-12 text-center">
                                    <div className="animate-pulse text-muted-foreground">{t('admin.loadingChannels', '加载频道中...')}</div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={7} className="px-6 py-12 text-center">
                                    <div className="text-red-500">{error}</div>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="mt-2 text-indigo-600"
                                        onClick={() => window.location.reload()}
                                    >
                                        {t('common.retry')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : filteredChannels.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                    {t('admin.noChannelsFound', '未找到频道')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredChannels.map((channel) => {
                                const isBanned = channel.status === 'banned';
                                const isVerified = channel.is_verified === true || channel.status === 'verified';
                                return (
                                    <TableRow
                                        key={channel.id}
                                        className={isBanned ? 'bg-muted/30' : ''}
                                    >
                                        <TableCell className="px-6 py-4">
                                            <div className={`flex items-center gap-3${isBanned ? ' opacity-60' : ''}`}>
                                                {channel.avatar ? (
                                                    <img
                                                        alt={channel.name}
                                                        className={`h-10 w-10 rounded-lg object-cover${isBanned ? ' grayscale' : ''}`}
                                                        src={channel.avatar}
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                                        {channel.name?.[0] || '?'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className={`text-sm font-semibold text-foreground${isBanned ? ' line-through' : ''}`}>
                                                        {channel.name}
                                                    </p>
                                                    <p className={`text-xs font-mono ${isBanned ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                        {isBanned ? t('admin.suspended', 'suspended') : `@${channel.short_token}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className={`px-6 py-4 text-sm font-mono ${isBanned ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                            {channel.user_id}
                                        </TableCell>
                                        <TableCell className={`px-6 py-4 text-sm tabular-nums ${isBanned ? 'text-muted-foreground' : 'text-card-foreground'}`}>
                                            {formatNumber(channel.subscriber_count)}
                                        </TableCell>
                                        <TableCell className={`px-6 py-4 text-sm tabular-nums ${isBanned ? 'text-muted-foreground' : 'text-card-foreground'}`}>
                                            {channel.media_count || 0}
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <Badge variant="soft-neutral">
                                                {getCategoryLabel(channel)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">{getStatusBadge(channel.status ?? 'active', isVerified)}</TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="relative">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title={t('admin.actions', '操作')}
                                                    onClick={() =>
                                                        setActionMenuFor(
                                                            actionMenuFor?.id === channel.id ? null : channel,
                                                        )
                                                    }
                                                >
                                                    <MoreHorizontal className="w-4 h-4"/>
                                                </Button>
                                                {actionMenuFor?.id === channel.id && (
                                                    <div
                                                    className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10 py-1"
                                                    onMouseLeave={() => setActionMenuFor(null)}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full justify-start px-3 py-1.5 text-card-foreground hover:bg-muted"
                                                        onClick={() => {
                                                            setActionMenuFor(null);
                                                            openEditDialog(channel);
                                                        }}
                                                    >
                                                            {t('admin.edit', '编辑')}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full justify-start px-3 py-1.5 text-red-600 hover:bg-red-50"
                                                            onClick={() => {
                                                                setActionMenuFor(null);
                                                                openDeleteDialog(channel);
                                                            }}
                                                        >
                                                            {t('admin.delete', '删除')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {t('admin.showing', 'showing')} {startItem} {t('admin.to', 'to')} {endItem} {t('admin.of', 'of')} {total} {t('admin.channels', '频道管理')}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </Button>
                            {Array.from({length: Math.min(totalPages, 3)}, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 3) {
                                    pageNum = i + 1;
                                } else if (page <= 2) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 1) {
                                    pageNum = totalPages - 2 + i;
                                } else {
                                    pageNum = page - 1 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={pageNum === page ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                            {totalPages > 3 && page < totalPages - 1 && (
                                <span className="text-slate-300 mx-1">...</span>
                            )}
                            {totalPages > 3 && page < totalPages - 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(totalPages)}
                                >
                                    {totalPages}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Create Channel Modal */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary"/>
                            {t('admin.newChannel', '新建频道')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.createChannelDesc', 'Fill in the information to create a new content creator channel')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t('admin.channelName', '频道名称')}</Label>
                            <Input
                                placeholder={t('admin.enterChannelTitle', '输入频道标题')}
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.handle', '句柄 (@token)')}</Label>
                            <Input
                                placeholder="@unique_handle"
                                type="text"
                                value={formData.handle || ''}
                                onChange={(e) => setFormData({...formData, handle: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>{t('admin.category', '分类')}</Label>
                                <Select
                                    value={formData.category_id != null ? String(formData.category_id) : ''}
                                    onValueChange={(val) => setFormData({...formData, category_id: val ? Number(val) : undefined})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('admin.selectCategory', '选择分类')}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((cat) => (
                                            <SelectItem key={cat.id} value={String(cat.id)} disabled={cat.isDisabled}>
                                                {'　'.repeat(Math.max(0, cat.depth))}{cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('admin.status', '状态')}</Label>
                                <Select value={formData.status || 'active'} onValueChange={(value) => setFormData({...formData, status: value})}>
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('admin.active', '活跃')}</SelectItem>
                                        <SelectItem value="pending">{t('admin.pending', '待审核')}</SelectItem>
                                        <SelectItem value="draft">{t('admin.draft', '草稿')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.description', '描述')}</Label>
                            <Textarea
                                placeholder={t('admin.describeChannel', '描述此频道...')}
                                rows={3}
                                value={formData.description || ''}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setShowCreateDialog(false)}>
                            {t('admin.cancel', '取消')}
                        </Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleCreate}>
                            {t('admin.createChannel', '创建频道')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Channel Modal */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-primary"/>
                            {t('admin.editChannel', '编辑频道')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.editChannelDesc', 'Update channel information and settings')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t('admin.name', '名称')} *</Label>
                            <Input
                                placeholder={t('admin.enterChannelName', '输入频道名称')}
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.shortToken', '短链 Token')}</Label>
                            <Input
                                placeholder={t('admin.enterChannelShortToken', '输入短链 Token')}
                                type="text"
                                value={formData.short_token || ''}
                                onChange={(e) => setFormData({...formData, short_token: e.target.value})}
                                maxLength={12}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>{t('admin.category', '分类')}</Label>
                                <Select
                                    value={formData.category_id != null ? String(formData.category_id) : ''}
                                    onValueChange={(val) => setFormData({...formData, category_id: val ? Number(val) : undefined})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('admin.selectCategory', '选择分类')}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((cat) => (
                                            <SelectItem key={cat.id} value={String(cat.id)} disabled={cat.isDisabled}>
                                                {'　'.repeat(Math.max(0, cat.depth))}{cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('admin.status', '状态')}</Label>
                                <Select value={formData.status || 'active'} onValueChange={(value) => setFormData({...formData, status: value})}>
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('admin.active', '活跃')}</SelectItem>
                                        <SelectItem value="verified">{t('admin.verified', '已认证')}</SelectItem>
                                        <SelectItem value="pending">{t('admin.pending', '待审核')}</SelectItem>
                                        <SelectItem value="banned">{t('admin.banned', '已封禁')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.description', '描述')}</Label>
                            <Textarea
                                placeholder={t('admin.enterChannelDescription', '输入频道描述')}
                                rows={3}
                                value={formData.description || ''}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setShowEditDialog(false)}>
                            {t('admin.cancel', '取消')}
                        </Button>
                        <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium" onClick={() => setShowDeleteDialog(true)}>
                            {t('admin.delete', '删除')}
                        </Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleUpdate}>
                            {t('admin.save', '保存')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Channel Modal */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500"/>
                            {t('admin.deleteChannel', '删除频道')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteChannelConfirm', 'This action cannot be undone. The channel and all associated data will be permanently deleted.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setShowDeleteDialog(false)}>
                            {t('admin.cancel', '取消')}
                        </Button>
                        <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium" onClick={handleDelete}>
                            {t('admin.delete', '删除')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Channels;
