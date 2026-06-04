import React, {useState, useMemo} from 'react';
import {
    Plus, Trash2, Play, Square, Radio, ChevronLeft, ChevronRight,
    RefreshCw, Settings, Tv2, Copy, Eye, EyeOff, ExternalLink,
    Terminal, MonitorPlay, Users, TrendingUp, Gauge,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {useFeatureFlags} from '@/contexts/FeatureFlagsContext';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent} from '@/components/ui/card';
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Label} from '@/components/ui/label';
import {ImageUploadField} from '@/components/upload/ImageUploadField';
import {
    useAdminLiveRooms,
    useCreateLiveRoom,
    useUpdateLiveRoom,
    useDeleteLiveRoom,
    useStartLiveRoom,
    useEndLiveRoom,
} from '@/hooks/queries';
import {type LiveRoom, type CreateLiveRoomRequest, type UpdateLiveRoomRequest} from '@/lib/api/live';

/* ── Status helpers ─────────────────────────────────────────────── */
const statusConfig: Record<string, {
    labelKey: string;
    defaultLabel: string;
    badgeVariant: 'soft-danger' | 'soft-warning' | 'soft-neutral' | 'soft-info';
    dotColorClass: string;
    pulse: boolean;
}> = {
    live: {
        labelKey: 'admin.statusLive',
        defaultLabel: 'LIVE',
        badgeVariant: 'soft-danger',
        dotColorClass: 'bg-destructive',
        pulse: true,
    },
    preparing: {
        labelKey: 'admin.statusPreparing',
        defaultLabel: 'PREPARING',
        badgeVariant: 'soft-warning',
        dotColorClass: 'bg-warning',
        pulse: true,
    },
    idle: {
        labelKey: 'admin.statusIdle',
        defaultLabel: 'IDLE',
        badgeVariant: 'soft-neutral',
        dotColorClass: 'bg-muted-foreground',
        pulse: false,
    },
    ended: {
        labelKey: 'admin.statusEnded',
        defaultLabel: 'ENDED',
        badgeVariant: 'soft-neutral',
        dotColorClass: 'bg-muted-foreground',
        pulse: false,
    },
    offline: {
        labelKey: 'admin.statusOffline',
        defaultLabel: 'OFFLINE',
        badgeVariant: 'soft-info',
        dotColorClass: 'bg-muted-foreground',
        pulse: false,
    },
};

/* ── Status badge ────────────────────────────────────────────────── */
const StatusBadge: React.FC<{status: string}> = ({status}) => {
    const {t} = useTranslation();
    const sc = statusConfig[status] || statusConfig.idle;
    return (
        <Badge variant={sc.badgeVariant} className="gap-2 px-3 py-1 text-[11px] font-bold font-mono">
            <span className="relative flex h-2 w-2">
                {sc.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${sc.dotColorClass} opacity-75`} />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${sc.dotColorClass}`} />
            </span>
            {t(sc.labelKey, sc.defaultLabel)}
        </Badge>
    );
};

/* ── Category badge ──────────────────────────────────────────────── */
const categoryBadgeVariant: Record<string, 'soft-info' | 'soft-success' | 'soft-primary' | 'soft-warning' | 'soft-danger' | 'soft-neutral'> = {
    corporate: 'soft-info',
    engineering: 'soft-success',
    marketing: 'soft-primary',
    gaming: 'soft-warning',
    music: 'soft-danger',
};

const CategoryBadge: React.FC<{category?: string}> = ({category}) => {
    if (!category) return <span className="text-muted-foreground">-</span>;
    const key = category.toLowerCase();
    const variant = categoryBadgeVariant[key] || 'soft-neutral';
    return (
        <Badge variant={variant} className="text-[11px] font-bold font-mono uppercase tracking-wider">
            {category}
        </Badge>
    );
};

/* ── Main page ───────────────────────────────────────────────────── */
export default function LiveRoomsPage() {
    const {t} = useTranslation();
    const featureFlags = useFeatureFlags();

    if (!featureFlags.liveRooms) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                {t('admin.featureDisabled', 'Live Rooms feature is not enabled for this portal.')}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.title', 'Admin')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.liveRooms', 'Live Rooms')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Page Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-foreground flex items-center gap-3">
                        <Tv2 className="h-7 w-7 text-primary" />
                        {t('admin.liveRoomsManagement', 'Live Rooms Management')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('admin.liveRoomsDesc', 'Monitor, configure, and control your enterprise streaming channels in real-time.')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-[18px]">
                        <RefreshCw className="w-4 h-4" />
                        {t('admin.refreshAll', 'Refresh All')}
                    </Button>
                    <Button className="rounded-[18px] shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4" />
                        {t('admin.addLiveRoom', 'Create New Room')}
                    </Button>
                </div>
            </header>

            <LiveRoomsTab />
        </div>
    );
}

/* ── Data + layout tab ───────────────────────────────────────────── */
const LiveRoomsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: liveRoomsData, isLoading} = useAdminLiveRooms({page, page_size: 20});
    const createMutation = useCreateLiveRoom();
    const updateMutation = useUpdateLiveRoom();
    const deleteMutation = useDeleteLiveRoom();
    const startMutation = useStartLiveRoom();
    const endMutation = useEndLiveRoom();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<LiveRoom | null>(null);
    const [deletingRoom, setDeletingRoom] = useState<LiveRoom | null>(null);
    const [createForm, setCreateForm] = useState<CreateLiveRoomRequest>({title: ''});
    const [editForm, setEditForm] = useState<UpdateLiveRoomRequest>({
        title: '', description: '', rtmp_url: '', hls_url: '',
        max_viewers: 0, thumbnail: '', category: '', tags: [],
    });
    const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null);
    const [showStreamKey, setShowStreamKey] = useState(false);

    const rooms = liveRoomsData?.items || [];
    const total = liveRoomsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    /* ── Computed stats ────────────────────────────────────────── */
    const stats = useMemo(() => {
        const active = rooms.filter(r => r.status === 'live').length;
        const totalViewers = rooms.reduce((sum, r) => sum + (r.current_viewers || 0), 0);
        return {
            activeRooms: active,
            totalViewers,
            avgBitrate: '4.8',
            bandwidth: '2.4',
        };
    }, [rooms]);

    /* ── Handlers ───────────────────────────────────────────────── */
    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({title: ''});
        } catch (err) {
            console.error('Failed to create live room:', err);
        }
    };

    const openEditDialog = (room: LiveRoom) => {
        setEditingRoom(room);
        setEditForm({
            title: room.title,
            description: room.description,
            rtmp_url: room.rtmp_url,
            hls_url: room.hls_url,
            max_viewers: room.max_viewers,
            thumbnail: room.thumbnail,
            category: room.category,
            tags: room.tags,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingRoom) return;
        try {
            await updateMutation.mutateAsync({id: editingRoom.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update live room:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingRoom) return;
        try {
            await deleteMutation.mutateAsync(deletingRoom.id);
            setDeleteDialogOpen(false);
            if (selectedRoom?.id === deletingRoom.id) setSelectedRoom(null);
        } catch (err) {
            console.error('Failed to delete live room:', err);
        }
    };

    const handleStart = async (id: string) => {
        try {
            await startMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to start live room:', err);
        }
    };

    const handleEnd = async (id: string) => {
        try {
            await endMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to end live room:', err);
        }
    };

    const handleSelectRoom = (room: LiveRoom) => {
        setSelectedRoom(room);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
    };

    /* ── Config panel data ─────────────────────────────────────── */
    const configRoom = selectedRoom || editingRoom;
    const rtmpUrl = configRoom?.rtmp_url || 'rtmp://stream.origstudio.io/live';
    const streamKey = configRoom?.id ? `os_ent_${configRoom.id.substring(0, 8)}` : 'os_ent_441_9901_x_v88';
    const hlsUrl = configRoom?.hls_url || 'https://hls.origstudio.io/live.m3u8';

    return (
        <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                            <MonitorPlay className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-foreground">{stats.activeRooms}</div>
                            <div className="text-xs text-muted-foreground">{t('admin.activeRooms', 'Active Rooms')}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-info" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-foreground">
                                {stats.totalViewers >= 1000 ? `${(stats.totalViewers / 1000).toFixed(1)}k` : stats.totalViewers}
                            </div>
                            <div className="text-xs text-muted-foreground">{t('admin.totalViewers', 'Total Viewers')}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-foreground">{stats.avgBitrate}<span className="text-base font-normal text-muted-foreground ml-0.5">Mbps</span></div>
                            <div className="text-xs text-muted-foreground">{t('admin.avgBitrate', 'Avg Bitrate')}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Gauge className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-foreground">{stats.bandwidth}<span className="text-base font-normal text-muted-foreground ml-0.5">Gbps</span></div>
                            <div className="text-xs text-muted-foreground">{t('admin.bandwidth', 'Bandwidth')}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-6">
                {/* Table Section (9 columns) */}
                <section className="col-span-12 lg:col-span-9">
                    <Card className="overflow-hidden">
                        <Table className="text-left border-collapse">
                            <TableHeader className="bg-secondary/50 border-b border-border">
                                <TableRow className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground hover:bg-transparent">
                                    <TableHead className="px-4 py-4">{t('admin.liveRoomTitle', 'Room Title & ID')}</TableHead>
                                    <TableHead className="px-4 py-4">{t('admin.liveRoomCategory', 'Category')}</TableHead>
                                    <TableHead className="px-4 py-4 text-center">{t('admin.liveRoomStatus', 'Status')}</TableHead>
                                    <TableHead className="px-4 py-4 text-right">{t('admin.liveRoomViewers', 'Viewers')}</TableHead>
                                    <TableHead className="px-4 py-4 text-center">{t('admin.controls', 'Controls')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/30">
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="py-12 text-center"><Spinner className="mx-auto"/></TableCell></TableRow>
                                ) : rooms.length > 0 ? rooms.map(room => {
                                    return (
                                        <TableRow
                                            key={room.id}
                                            className={`hover:bg-accent/30 transition-colors group ${room.status === 'ended' ? 'opacity-75' : ''}`}
                                        >
                                            {/* Room Title & ID */}
                                            <TableCell className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-secondary relative overflow-hidden flex-shrink-0">
                                                        {room.thumbnail ? (
                                                            <img
                                                                src={room.thumbnail}
                                                                alt=""
                                                                className={`object-cover w-full h-full ${room.status === 'ended' || room.status === 'idle' ? 'opacity-40 grayscale' : 'opacity-60'}`}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Radio className="w-5 h-5 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        {room.status === 'live' && (
                                                            <span className="absolute top-1 left-1 flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-foreground">{room.title}</div>
                                                        <code className="text-[11px] text-muted-foreground font-mono">
                                                            {room.id.length > 12 ? `${room.id.substring(0, 8)}...` : room.id}
                                                        </code>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            {/* Category */}
                                            <TableCell className="px-4 py-4">
                                                <CategoryBadge category={room.category} />
                                            </TableCell>
                                            {/* Status */}
                                            <TableCell className="px-4 py-4 text-center">
                                                <StatusBadge status={room.status} />
                                            </TableCell>
                                            {/* Viewers */}
                                            <TableCell className="px-4 py-4 text-right">
                                                <div className="text-sm font-bold text-foreground font-mono">
                                                    {room.current_viewers != null
                                                        ? room.current_viewers >= 1000
                                                            ? `${(room.current_viewers / 1000).toFixed(1)}k`
                                                            : room.current_viewers
                                                        : '--'}
                                                </div>
                                                {room.status === 'live' && (
                                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                                        {t('admin.currentPeak', 'Current Peak')}
                                                    </div>
                                                )}
                                                {room.status === 'ended' && (
                                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                                        {t('admin.finalViews', 'Final Views')}
                                                    </div>
                                                )}
                                            </TableCell>
                                            {/* Controls */}
                                            <TableCell className="px-4 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => {
                                                            handleSelectRoom(room);
                                                            openEditDialog(room);
                                                        }}
                                                        title={t('admin.settings', 'Settings')}
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </Button>
                                                    {room.status !== 'live' && room.status !== 'ended' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => handleStart(room.id)}
                                                            title={t('admin.startStream', 'Start Stream')}
                                                            className="text-primary hover:bg-primary hover:text-primary-foreground"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {room.status === 'live' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => handleEnd(room.id)}
                                                            title={t('admin.stopStream', 'Stop Stream')}
                                                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                        >
                                                            <Square className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {room.status === 'ended' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title={t('admin.viewRecording', 'View Recording')}
                                                        >
                                                            <MonitorPlay className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="hover:text-destructive"
                                                        onClick={() => { setDeletingRoom(room); setDeleteDialogOpen(true); }}
                                                        title={t('admin.delete', 'Delete')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={5}>
                                            <div className="py-16 flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                                                    <Tv2 size={32} className="text-muted-foreground" />
                                                </div>
                                                <h3 className="text-base font-semibold text-foreground mb-1">
                                                    {t('admin.noLiveRooms', 'No live rooms found')}
                                                </h3>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {total > 20 && (
                            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    {t('admin.showing', 'Showing')} {(page - 1) * 20 + 1} {t('admin.to', 'to')} {Math.min(page * 20, total)} {t('admin.of', 'of')} {total} {t('admin.items', 'items')}
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >
                                        <ChevronLeft size={16}/>
                                    </Button>
                                    {Array.from({length: totalPages}, (_, i) => i + 1)
                                        .slice(Math.max(0, page - 2), Math.min(totalPages, page + 1))
                                        .map(p => (
                                            <Button
                                                key={p}
                                                variant={p === page ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </Button>
                                        ))}
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                    >
                                        <ChevronRight size={16}/>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </section>

                {/* Configuration Panel (3 columns) */}
                <aside className="col-span-12 lg:col-span-3">
                    <div className="sticky top-6 space-y-4">
                        {/* Stream Config Card */}
                        <Card className="bg-card/70 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-semibold leading-7 tracking-[-0.01em] text-foreground">
                                        {t('admin.streamConfig', 'Stream Config')}
                                    </h3>
                                    <Terminal className="w-5 h-5 text-info" />
                                </div>
                                <div className="space-y-6">
                                    {/* RTMP Ingest URL */}
                                    <div>
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground mb-2">
                                            {t('admin.rtmpIngestUrl', 'RTMP Ingest URL')}
                                        </Label>
                                        <div className="relative flex items-center">
                                            <Input
                                                className="text-xs font-mono pr-10"
                                                readOnly
                                                type="text"
                                                value={rtmpUrl}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="absolute right-1 text-muted-foreground hover:text-primary"
                                                onClick={() => copyToClipboard(rtmpUrl)}
                                                title={t('common.copy', 'Copy')}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Stream Key */}
                                    <div>
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground mb-2">
                                            {t('admin.streamKey', 'Stream Key')}
                                        </Label>
                                        <div className="relative flex items-center">
                                            <Input
                                                className="text-xs font-mono pr-20"
                                                readOnly
                                                type={showStreamKey ? 'text' : 'password'}
                                                value={streamKey}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="absolute right-9 text-muted-foreground hover:text-primary"
                                                onClick={() => setShowStreamKey(!showStreamKey)}
                                                title={showStreamKey ? t('common.hide', 'Hide') : t('common.show', 'Show')}
                                            >
                                                {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="absolute right-1 text-muted-foreground hover:text-primary"
                                                onClick={() => copyToClipboard(streamKey)}
                                                title={t('common.copy', 'Copy')}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-2 italic font-mono">
                                            {t('admin.streamKeyHint', 'Rotation recommended every 30 days.')}
                                        </p>
                                    </div>
                                    {/* HLS Playback URL */}
                                    <div className="pt-4 border-t border-border">
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground mb-2">
                                            {t('admin.hlsPlaybackUrl', 'HLS Playback URL')}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                className="flex-1 text-xs font-mono"
                                                readOnly
                                                type="text"
                                                value={hlsUrl}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-info hover:bg-info/20"
                                                title={t('common.openInNew', 'Open in new tab')}
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <Button variant="secondary" className="w-full">
                                        {t('admin.advancedTranscoding', 'Advanced Transcoding')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bandwidth Meter */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <Gauge className="w-5 h-5 text-success" />
                                    <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">
                                        {t('admin.currentBandwidth', 'Current Bandwidth')}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-foreground tracking-tight">{stats.bandwidth}</span>
                                    <span className="text-muted-foreground font-mono">Gbps</span>
                                </div>
                                <div className="mt-4 h-1 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-success rounded-full transition-all duration-500"
                                        style={{width: '65%'}}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </aside>
            </div>

            {/* ── Create Dialog ─────────────────────────────────── */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-xl shadow-2xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.createLiveRoom', 'Create Live Room')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomTitle', 'Title')}</Label>
                            <Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder={t('admin.liveRoomTitlePlaceholder', 'Live Room Title')}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomDescription', 'Description')}</Label>
                            <Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder={t('admin.descriptionPlaceholder', 'Description')}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.liveRoomCategory', 'Category')}</Label>
                                <Input value={createForm.category || ''} onChange={e => setCreateForm({...createForm, category: e.target.value})} placeholder={t('admin.categoryPlaceholder', 'Gaming, Music...')}/>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.liveRoomMaxViewers', 'Max Viewers')}</Label>
                                <Input type="number" value={createForm.max_viewers || 0} onChange={e => setCreateForm({...createForm, max_viewers: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <ImageUploadField value={createForm.thumbnail || ''} onChange={url => setCreateForm({...createForm, thumbnail: url})} label={t('admin.liveRoomThumbnail', 'Thumbnail')}/>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomRtmpUrl', 'RTMP URL')}</Label>
                            <Input value={createForm.rtmp_url || ''} onChange={e => setCreateForm({...createForm, rtmp_url: e.target.value})} placeholder="rtmp://..."/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomHlsUrl', 'HLS URL')}</Label>
                            <Input value={createForm.hls_url || ''} onChange={e => setCreateForm({...createForm, hls_url: e.target.value})} placeholder="https://.../stream.m3u8"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleCreate} disabled={!createForm.title}>
                            {t('common.add', 'Add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ───────────────────────────────────── */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-xl shadow-2xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.editLiveRoom', 'Edit Live Room')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomTitle', 'Title')}</Label>
                            <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomDescription', 'Description')}</Label>
                            <Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.liveRoomCategory', 'Category')}</Label>
                                <Input value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}/>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.liveRoomMaxViewers', 'Max Viewers')}</Label>
                                <Input type="number" value={editForm.max_viewers || 0} onChange={e => setEditForm({...editForm, max_viewers: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <ImageUploadField value={editForm.thumbnail || ''} onChange={url => setEditForm({...editForm, thumbnail: url})} label={t('admin.liveRoomThumbnail', 'Thumbnail')}/>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomRtmpUrl', 'RTMP URL')}</Label>
                            <Input value={editForm.rtmp_url} onChange={e => setEditForm({...editForm, rtmp_url: e.target.value})}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomHlsUrl', 'HLS URL')}</Label>
                            <Input value={editForm.hls_url} onChange={e => setEditForm({...editForm, hls_url: e.target.value})}/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleUpdate} disabled={!editForm.title}>
                            {t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Dialog ─────────────────────────────────── */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-xl shadow-2xl overflow-hidden">
                    <DialogHeader>
                        <AlertDialogTitle className="text-lg font-semibold text-foreground">
                            {t('admin.confirmDelete', 'Confirm Delete')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteLiveRoomConfirm', 'Are you sure you want to delete this live room? This action cannot be undone.')}
                        </AlertDialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <AlertDialogCancel>
                            {t('common.cancel', 'Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
                        >
                            {t('admin.delete', 'Delete')}
                        </AlertDialogAction>
                    </DialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
