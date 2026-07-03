import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
    Plus,
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
import {formatNumber as fmtNumber} from '@/lib/format';
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
    });

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
            setError(t('admin.failedToLoadChannels'));
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

    const totalSubscribers = channels.reduce((sum, c) => sum + (c.subscriber_count || 0), 0);
    const verifiedCount = channels.filter(c => c.is_verified === true || c.status === 'verified').length;
    const pendingCount = channels.filter(c => c.status === 'pending').length;
    const verifiedRatio = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

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
            active: {variant: 'soft-success', dot: 'bg-emerald-500', label: t('admin.normal')},
            pending: {variant: 'soft-warning', dot: 'bg-amber-500', label: t('admin.pending')},
            banned: {variant: 'soft-danger', dot: 'bg-red-500', label: t('admin.banned')},
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('admin.channels')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.manageChannels') || 'Manage content creator channels, subscribers, and verification status across the platform.'}
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4"/>
                    {t('admin.newChannel') || 'Create New Channel'}
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.channelTotal') || 'Total Channels'}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{total || channels.length}</h3>
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
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.totalSubscribers') || 'Subscribers'}</p>
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
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.verifiedChannels') || 'Verified'}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{verifiedCount}</h3>
                                <p className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1">
                                    {verifiedRatio}% {t('admin.ofTotalChannels') || 'of total channels'}
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
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.pending')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{pendingCount}</h3>
                                <p className="text-xs font-semibold text-red-500 mt-2 flex items-center gap-1">
                                    {t('admin.requiresAttention') || 'Requires attention'}
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
                            placeholder={t('admin.searchChannels') || 'Search channels...'}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={`${t('admin.category')}: ${t('admin.allStatus')}`}/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.category')}: {t('admin.allStatus')}</SelectItem>
                            <SelectItem value="tech">科技</SelectItem>
                            <SelectItem value="cooking">美食</SelectItem>
                            <SelectItem value="music">音乐</SelectItem>
                            <SelectItem value="gaming">游戏</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={`${t('admin.verification')}: ${t('admin.allStatus')}`}/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.verification')}: {t('admin.allStatus')}</SelectItem>
                            <SelectItem value="verified">{t('common.verified')}</SelectItem>
                            <SelectItem value="not_verified">{t('admin.notVerified') || 'Not Verified'}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="w-3.5 h-3.5"/>
                        {t('admin.reset')}
                    </Button>
                </div>
            </div>

            {/* Main Table */}
            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.channel')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.ownerId') || 'Owner ID'}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.subscriberCount')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.videoCount')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.category')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.status')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="px-6 py-12 text-center">
                                    <div className="animate-pulse text-muted-foreground">{t('admin.loadingChannels')}</div>
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
                                    {t('admin.noChannelsFound')}
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
                                                        {isBanned ? t('admin.suspended') || 'Suspended' : `@${channel.short_token}`}
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
                                                    title={t('admin.actions')}
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
                                                            {t('admin.edit')}
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
                                                            {t('admin.delete')}
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
                            {t('admin.showing') || 'Showing'} {startItem} {t('admin.to') || 'to'} {endItem} {t('admin.of') || 'of'} {total} {t('admin.channels') || 'channels'}
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.newChannel') || 'Create New Channel'}</DialogTitle>
                        <DialogDescription>{t('admin.createChannel') || 'Create Channel'}</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t('admin.channelName') || 'Channel Name'}</Label>
                            <Input
                                placeholder={t('admin.enterChannelTitle') || 'Enter channel title'}
                                type="text"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.handle') || 'Handle (@token)'}</Label>
                            <Input
                                placeholder="@unique_handle"
                                type="text"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>{t('admin.category')}</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tech"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tech">Tech</SelectItem>
                                        <SelectItem value="cooking">Cooking</SelectItem>
                                        <SelectItem value="music">Music</SelectItem>
                                        <SelectItem value="gaming">Gaming</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('admin.status')}</Label>
                                <Select value={formData.status || 'active'} onValueChange={(value) => setFormData({...formData, status: value})}>
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('admin.active')}</SelectItem>
                                        <SelectItem value="pending">{t('admin.pending')}</SelectItem>
                                        <SelectItem value="draft">{t('admin.draft') || 'Draft'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.description')}</Label>
                            <Textarea
                                placeholder={t('admin.describeChannel') || 'Describe the channel...'}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            {t('admin.cancel')}
                        </Button>
                        <Button onClick={handleCreate}>
                            {t('admin.createChannel') || 'Create Channel'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Channel Modal */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.editChannel')}</DialogTitle>
                        <DialogDescription>{t('admin.editChannel')}</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t('admin.name')} *</Label>
                            <Input
                                placeholder={t('admin.enterChannelName')}
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.shortToken')}</Label>
                            <Input
                                placeholder={t('admin.enterChannelShortToken')}
                                type="text"
                                value={formData.short_token || ''}
                                onChange={(e) => setFormData({...formData, short_token: e.target.value})}
                                maxLength={12}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>{t('admin.category')}</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tech"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tech">Tech</SelectItem>
                                        <SelectItem value="cooking">Cooking</SelectItem>
                                        <SelectItem value="music">Music</SelectItem>
                                        <SelectItem value="gaming">Gaming</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('admin.status')}</Label>
                                <Select value={formData.status || 'active'} onValueChange={(value) => setFormData({...formData, status: value})}>
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('admin.active')}</SelectItem>
                                        <SelectItem value="verified">{t('admin.verified')}</SelectItem>
                                        <SelectItem value="pending">{t('admin.pending')}</SelectItem>
                                        <SelectItem value="banned">{t('admin.banned')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.description')}</Label>
                            <Textarea
                                placeholder={t('admin.enterChannelDescription')}
                                rows={3}
                                value={formData.description || ''}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                            {t('admin.delete')}
                        </Button>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            {t('admin.cancel')}
                        </Button>
                        <Button onClick={handleUpdate}>
                            {t('admin.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Channel Modal */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.deleteChannel')}</DialogTitle>
                        <DialogDescription>{t('admin.deleteChannelConfirm')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            {t('admin.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            {t('admin.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Channels;
