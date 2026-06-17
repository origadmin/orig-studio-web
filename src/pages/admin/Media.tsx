/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 管理端 - 媒体管理页面
 */

import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {useLocation, useNavigate} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
    Play,
    Trash2,
    Edit3,
    Search,
    Plus,
    Image as ImageIcon,
    Video,
    Music,
    ExternalLink,
    RotateCcw,
    Loader2,
    Film,
    Cpu,
    HardDrive,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {encodingApi, adminMediaApi, type Media, type MediaVariantSummary} from '@/lib/api/media';
import {API_BASE_URL} from '@/lib/request';
import {useAdminMediaList, useDeleteMedia} from '@/hooks/queries';
import {UploadComponent} from '@/components/upload/UploadComponent';
import {formatFileSize, formatDateTime} from '@/lib/format';
import {PAGINATION_CONFIG} from '@/config/pagination';

export default function MediaPage() {
    const {t} = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const urlSearch = new URLSearchParams(location.search).get("q");

    // 弹窗状态
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

    // 删除状态
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingMedia, setDeletingMedia] = useState<Media | null>(null);

    // 转码详情弹窗
    const [variantDetailOpen, setVariantDetailOpen] = useState(false);
    const [variantData, setVariantData] = useState<MediaVariantSummary | null>(null);
    const [retryingAllId, setRetryingAllId] = useState<string | number | null>(null);

    const [searchParams, setSearchParams] = useState({keyword: urlSearch || '', state: '', type: '', tags: '' as string, page: 1, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});

    const [total, setTotal] = useState(0);

    // React Query Hooks
    const {data: mediaData, isLoading: loading, error, refetch: loadMedia} = useAdminMediaList({
        ...searchParams,
        tags: searchParams.tags ? searchParams.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined,
    });
    const deleteMutation = useDeleteMedia();

    const mediaList = (mediaData?.items || (Array.isArray(mediaData) ? mediaData : [])) as Media[];

    React.useEffect(() => {
        if (mediaData?.total !== undefined) {
            setTotal(mediaData.total);
        }
    }, [mediaData?.total]);

    const formatDuration = (seconds: number) => {
        if (!seconds) return '-';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    };

    const formatViews = (count: number | undefined | null) => {
        if (count === undefined || count === null || count === 0) return '0';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const handleEditClick = (media: Media) => {
        navigate({to: '/admin/media/$id', params: {id: String(media.id)}});
    };

    const handleDeleteClick = (media: Media) => {
        setDeletingMedia(media);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingMedia) return;
        try {
            await deleteMutation.mutateAsync(String(deletingMedia.id));
            setDeleteDialogOpen(false);
            loadMedia();
        } catch (err) {
            console.error("Failed to delete media", err);
        }
    };

    // Show transcoding variant details for a media
    const handleShowVariants = async (media: Media) => {
        try {
            const data = await adminMediaApi.getVariants(media.id);
            setVariantData(data);
            setVariantDetailOpen(true);
        } catch (err: any) {
            console.error("Failed to fetch variants:", err.message);
        }
    };

    // Retry all failed tasks for a media
    const handleRetryAllFailed = async (mediaId: string | number) => {
        setRetryingAllId(mediaId);
        try {
            await encodingApi.retryAllFailed(String(mediaId));
            if (variantData?.media_id === String(mediaId)) {
                handleShowVariants({id: mediaId} as Media);
            }
        } catch (err: any) {
            console.error("Retry all failed:", err.message);
        } finally {
            setRetryingAllId(null);
        }
    };

    // Helper: resolve preview image URL
    const resolvePreview = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        const base = API_BASE_URL;
        return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    };

    // Stats
    const totalAssets = total || mediaList.length;
    const activeTranscodes = mediaList.filter((m: Media) => m.encoding_status === 'processing').length;
    const failedTasks = mediaList.filter((m: Media) => m.encoding_status === 'failed').length;

    // Pagination
    const totalPages = Math.ceil(total / searchParams.page_size);
    const startItem = total > 0 ? (searchParams.page - 1) * searchParams.page_size + 1 : 0;
    const endItem = Math.min(searchParams.page * searchParams.page_size, total);

    // Unified status badge — mirrors the prototype's single Status column.
    // Priority: encoding failures → processing → success/published → draft → deleted → fallback
    const unifiedStatusBadge = (media: Media) => {
        const enc = media.encoding_status;
        const st = media.state;

        if (enc === 'failed') {
            return (
                <Badge variant="soft-danger">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{t('admin.failedStatus', 'Failed')}
                </Badge>
            );
        }
        if (enc === 'processing') {
            return (
                <Badge variant="soft-warning">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{t('admin.processing', 'Processing')}
                </Badge>
            );
        }
        if (enc === 'success' || st === 'active') {
            return (
                <Badge variant="soft-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{t('admin.publishedStatus', 'Published')}
                </Badge>
            );
        }
        if (st === 'draft' || enc === 'pending') {
            return (
                <Badge variant="soft-neutral">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{t('admin.draftStatus', 'Draft')}
                </Badge>
            );
        }
        if (st === 'deleted') {
            return (
                <Badge variant="soft-danger">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{t('admin.deletedStatus', 'Deleted')}
                </Badge>
            );
        }
        if (enc === 'partial') {
            return (
                <Badge variant="soft-warning">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{t('admin.partialComplete', 'Partial')}
                </Badge>
            );
        }
        return <span className="text-xs text-muted-foreground">--</span>;
    };

    // Encoding status badge helper (used in the variant details dialog header)
    const encBadge = (status?: string) => {
        switch (status) {
            case 'success':
                return (
                    <Badge variant="soft-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{t('admin.complete', 'Complete')}
                    </Badge>
                );
            case 'processing':
                return (
                    <Badge variant="soft-warning">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{t('admin.processing', 'Processing')}
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="soft-info">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>{t('admin.queued', 'Queued')}
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge variant="soft-danger">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{t('admin.failed', 'Failed')}
                    </Badge>
                );
            case 'partial':
                return (
                    <Badge variant="soft-warning">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{t('admin.partialComplete', 'Partial')}
                    </Badge>
                );
            default:
                return <span className="text-xs text-muted-foreground">--</span>;
        }
    };

    // Type badge helper
    const typeBadge = (type?: string) => {
        switch (type) {
            case 'video':
                return <Badge variant="soft-primary" className="rounded text-[10px] font-bold uppercase">Video</Badge>;
            case 'image':
                return <Badge variant="soft-success" className="rounded text-[10px] font-bold uppercase">Image</Badge>;
            case 'audio':
                return <Badge variant="soft-info" className="rounded text-[10px] font-bold uppercase">Audio</Badge>;
            default:
                return <Badge variant="soft-neutral" className="rounded text-[10px] font-bold uppercase">{type || 'Unknown'}</Badge>;
        }
    };

    return (
        <div className="p-8">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.title', 'Admin')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.mediaManagement', 'Media Library')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Page Title Area */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('admin.mediaManagement', 'Media Library')}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t('admin.mediaManagementDesc', 'Manage video, audio, and image assets across the network.')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setUploadDialogOpen(true)}
                    >
                        <Plus className="w-4 h-4"/>
                        {t('admin.uploadMedia', 'Upload')}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Total Assets */}
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.totalAssets', 'Total Assets')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{totalAssets}</h3>
                                <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3"/>
                                    {t('admin.assetsGrowth', '+12% vs last month')}
                                </p>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Film className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Active Transcodes */}
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.activeTranscodes', 'Active Transcodes')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{activeTranscodes}</h3>
                                <p className="text-xs font-semibold text-muted-foreground mt-2">{t('admin.nodesOnline', '6 nodes online')}</p>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Cpu className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Storage Used */}
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.storageUsed', 'Storage Used')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">4.2TB</h3>
                                <div className="w-32 h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-indigo-600 w-[84%]"></div>
                                </div>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <HardDrive className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Failed Tasks */}
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.failedTasks', 'Failed Tasks')}</p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-red-600 mt-1">{String(failedTasks).padStart(2, '0')}</h3>
                                <p className="text-xs font-semibold text-red-600 mt-2 hover:underline cursor-pointer">{t('admin.viewErrorLogs', 'View error logs')}</p>
                            </div>
                            <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <AlertCircle className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <Input
                            className="pl-9"
                            type="text"
                            placeholder={t('admin.searchAssets', 'Search assets...')}
                            value={searchParams.keyword}
                            onChange={(e) => setSearchParams({...searchParams, keyword: e.target.value})}
                        />
                    </div>
                    <Select
                        value={searchParams.state || 'all'}
                        onValueChange={(value) => setSearchParams({...searchParams, state: value === 'all' ? '' : value, page: 1})}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.allStatus', 'Status: All')}</SelectItem>
                            <SelectItem value="active">{t('admin.publishedStatus', 'Published')}</SelectItem>
                            <SelectItem value="draft">{t('admin.draftStatus', 'Draft')}</SelectItem>
                            <SelectItem value="deleted">{t('admin.deletedStatus', 'Deleted')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={searchParams.type || 'all'}
                        onValueChange={(value) => setSearchParams({...searchParams, type: value === 'all' ? '' : value, page: 1})}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.allTypes', 'Type: All')}</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="audio">Audio</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder={t('admin.filterByTags', 'Filter by tags (comma separated)')}
                        value={searchParams.tags}
                        onChange={(e) => setSearchParams({...searchParams, tags: e.target.value, page: 1})}
                        className="w-[200px]"
                    />
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSearchParams({keyword: '', state: '', type: '', tags: '', page: 1, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});
                            loadMedia();
                        }}
                    >
                        <RotateCcw className="w-3.5 h-3.5"/>
                        {t('admin.reset', 'Reset')}
                    </Button>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                    {t('admin.showingAssets', `Showing ${startItem} - ${endItem} of ${total} assets`)}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-card rounded-lg border border-border shadow-sm">
                <Table className="text-left">
                    <TableHeader>
                        <TableRow className="bg-muted border-b border-border">
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.thumbnail', 'Thumbnail')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.assetName', 'Asset Name')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.type', 'Type')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.size', 'Size')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.views', 'Views')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.status', 'Status')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.date', 'Date')}</TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">{t('admin.actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-50">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="px-6 py-16 text-center">
                                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto"/>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={8} className="px-6 py-16 text-center">
                                    <p className="text-sm text-destructive mb-3">{t('admin.loadFailed', 'Failed to load media')}</p>
                                    <Button variant="outline" onClick={() => loadMedia()}>
                                        <RotateCcw className="w-3.5 h-3.5"/>
                                        {t('admin.retry', 'Retry')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : mediaList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="px-6 py-16 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Film className="w-8 h-8 text-slate-300"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-card-foreground mb-1">{t('admin.noMediaFound', 'No media found')}</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('admin.uploadFirstMedia', 'Upload your first media asset to get started.')}</p>
                                    <Button
                                        className="mt-4"
                                        onClick={() => setUploadDialogOpen(true)}
                                    >
                                        <Plus className="w-4 h-4"/>
                                        {t('admin.uploadMedia', 'Upload')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            mediaList.map((media: Media) => {
                                const isFailed = media.encoding_status === 'failed';
                                return (
                                    <TableRow
                                        key={media.id}
                                        className={`${isFailed ? 'bg-red-50/30' : ''}`}
                                    >
                                        {/* Thumbnail */}
                                        <TableCell className="px-6 py-3.5">
                                            <div className="w-16 aspect-video rounded-md bg-muted overflow-hidden relative border border-border">
                                                {media.thumbnail ? (
                                                    <img
                                                        alt="Preview"
                                                        className={`w-full h-full object-cover ${isFailed ? 'grayscale opacity-50' : ''}`}
                                                        src={media.thumbnail.startsWith('http') ? media.thumbnail : `${API_BASE_URL}${media.thumbnail.startsWith('/') ? '' : '/'}${media.thumbnail}`}
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {media.type === 'video' ? <Video className="w-5 h-5 text-slate-300"/> :
                                                         media.type === 'audio' ? <Music className="w-5 h-5 text-slate-300"/> :
                                                         <ImageIcon className="w-5 h-5 text-slate-300"/>}
                                                    </div>
                                                )}
                                                {media.type === 'video' && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                                        <Play className="w-5 h-5"/>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Asset Name */}
                                        <TableCell className="px-6 py-3.5">
                                            <div className="text-sm font-semibold text-foreground">{media.title || t('admin.unnamedMedia')}</div>
                                            <div className="text-xs text-muted-foreground">{media.duration ? formatDuration(media.duration) : ''}</div>
                                        </TableCell>

                                        {/* Type */}
                                        <TableCell className="px-6 py-3.5 text-sm text-card-foreground">
                                            {typeBadge(media.type)}
                                        </TableCell>

                                        {/* Size */}
                                        <TableCell className="px-6 py-3.5 text-xs font-mono text-muted-foreground">
                                            {media.size ? formatFileSize(parseInt(media.size)) : '-'}
                                        </TableCell>

                                        {/* Views */}
                                        <TableCell className="px-6 py-3.5 text-xs font-mono text-muted-foreground">
                                            {formatViews(media.view_count)}
                                        </TableCell>

                                        {/* Status (unified: encoding + state) */}
                                        <TableCell className="px-6 py-3.5">
                                            {unifiedStatusBadge(media)}
                                        </TableCell>

                                        {/* Date */}
                                        <TableCell className="px-6 py-3.5 text-xs text-muted-foreground">
                                            {formatDateTime(media.create_time)}
                                        </TableCell>

                                        {/* Actions — prototype: edit for non-failed, delete for failed */}
                                        <TableCell className="px-6 py-3.5 text-right">
                                            {isFailed ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDeleteClick(media)}
                                                    title={t('admin.delete', 'Delete')}
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-muted-foreground hover:text-indigo-600 hover:bg-muted"
                                                    onClick={() => handleEditClick(media)}
                                                    title={t('admin.edit', 'Edit')}
                                                >
                                                    <Edit3 className="w-4 h-4"/>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
                        <p className="text-xs text-muted-foreground">{t('admin.showingItems', `Showing ${startItem} to ${endItem} of ${total} items`)}</p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon-sm"
                                className="text-muted-foreground"
                                onClick={() => setSearchParams({...searchParams, page: searchParams.page - 1})}
                                disabled={searchParams.page <= 1}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </Button>
                            <Button size="sm" className="shadow-sm">{searchParams.page}</Button>
                            {searchParams.page < totalPages && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground"
                                    onClick={() => setSearchParams({...searchParams, page: searchParams.page + 1})}
                                >
                                    {searchParams.page + 1}
                                </Button>
                            )}
                            {totalPages > 2 && searchParams.page < totalPages - 1 && (
                                <Button variant="ghost" size="sm" className="text-muted-foreground">...</Button>
                            )}
                            {totalPages > 2 && searchParams.page < totalPages - 1 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground"
                                    onClick={() => setSearchParams({...searchParams, page: totalPages})}
                                >
                                    {totalPages}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="icon-sm"
                                className="text-muted-foreground"
                                onClick={() => setSearchParams({...searchParams, page: searchParams.page + 1})}
                                disabled={searchParams.page >= totalPages}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogContent className="sm:max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{t('admin.uploadMediaFiles', 'Upload Assets')}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6">
                        <UploadComponent
                            onSuccess={() => {
                                setUploadDialogOpen(false);
                                loadMedia();
                            }}
                            onCancel={() => setUploadDialogOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{t('admin.confirmDelete', 'Delete Asset?')}</DialogTitle>
                        <DialogDescription>{t('admin.deleteMediaConfirm', 'This action cannot be undone. The file will be removed from storage clusters.')}</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-7 h-7"/>
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{t('admin.confirmDelete', 'Delete Asset?')}</h3>
                        <p className="text-sm text-muted-foreground mt-2 mb-6">{t('admin.deleteMediaConfirm', 'This action cannot be undone. The file will be removed from storage clusters.')}</p>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setDeleteDialogOpen(false)}
                                disabled={deleteMutation.isPending}
                            >
                                {t('admin.cancel', 'Cancel')}
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={handleConfirmDelete}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin inline"/> : null}
                                {t('admin.confirmDeleteBtn', 'Delete')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Transcoding Detail Dialog */}
            <Dialog open={variantDetailOpen} onOpenChange={setVariantDetailOpen}>
                <DialogContent className="sm:max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {t('admin.transcodingOverview', 'Transcoding Overview')}
                            {variantData?.encoding_status && encBadge(variantData.encoding_status)}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        {variantData && (
                            <>
                                {/* Summary stats */}
                                <div className="grid grid-cols-5 gap-2 text-center">
                                    <div className="rounded-lg bg-yellow-50 p-3">
                                        <p className="text-lg font-bold text-yellow-600">{variantData.video_pending_count ?? 0}</p>
                                        <p className="text-[11px] text-muted-foreground">{t('admin.queued', 'Queued')}</p>
                                    </div>
                                    <div className="rounded-lg bg-blue-50 p-3">
                                        <p className="text-lg font-bold text-blue-600">{variantData.video_processing_count ?? 0}</p>
                                        <p className="text-[11px] text-muted-foreground">{t('admin.transcoding', 'Transcoding')}</p>
                                    </div>
                                    <div className="rounded-lg bg-green-50 p-3">
                                        <p className="text-lg font-bold text-emerald-600">{variantData.video_success_count}</p>
                                        <p className="text-[11px] text-muted-foreground">{t('admin.success', 'Success')}</p>
                                    </div>
                                    <div className="rounded-lg bg-red-50 p-3">
                                        <p className="text-lg font-bold text-red-600">{variantData.video_failed_count}</p>
                                        <p className="text-[11px] text-muted-foreground">{t('admin.failed', 'Failed')}</p>
                                    </div>
                                    <div className="rounded-lg bg-muted p-3">
                                        <p className="text-lg font-bold text-card-foreground">{variantData.video_total_count}</p>
                                        <p className="text-[11px] text-muted-foreground">{t('admin.total', 'Total')}</p>
                                    </div>
                                </div>

                                {/* HLS / Preview paths */}
                                {(variantData.hls_file || variantData.preview_file) && (
                                    <div className="text-xs space-y-1 bg-muted rounded-md p-3 border border-border">
                                        {variantData.hls_file && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-muted-foreground">HLS:</span>
                                                <code className="text-green-700">{variantData.hls_file}</code>
                                            </div>
                                        )}
                                        {variantData.preview_file && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-muted-foreground">Preview:</span>
                                                <img
                                                    src={resolvePreview(variantData.preview_file)}
                                                    alt="preview"
                                                    className="h-12 rounded border"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Variant list */}
                                {variantData.variants && variantData.variants.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-medium flex items-center gap-2">
                                            {t('admin.variantTasks', 'Variant Tasks')}
                                            {variantData.video_failed_count > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 text-[10px] ml-auto"
                                                    disabled={retryingAllId === variantData.media_id}
                                                    onClick={() => handleRetryAllFailed(variantData.media_id)}
                                                >
                                                    {retryingAllId === variantData.media_id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin"/>
                                                    ) : (
                                                        <RotateCcw className="w-3 h-3"/>
                                                    )}
                                                    {t('admin.retryAllFailed', 'Retry All Failed')}
                                                </Button>
                                            )}
                                        </p>
                                        {variantData.variants.map((v) => (
                                            <div
                                                key={v.task_id}
                                                className={`flex items-center justify-between rounded-md px-3 py-2 text-xs ${
                                                    v.status === "failed" ? "bg-red-50" :
                                                    v.status === "success" ? "bg-green-50" :
                                                    "bg-muted"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-mono font-medium truncate">{v.profile_name}</span>
                                                    {v.resolution && (
                                                        <span className="text-muted-foreground hidden sm:inline">{v.resolution}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    {encBadge(v.status)}
                                                    {v.output_path && v.status === "success" && (
                                                        <code className="text-[10px] text-green-700 max-w-[150px] truncate block">{v.output_path}</code>
                                                    )}
                                                    {v.error_message && (
                                                        <span className="text-red-600 max-w-[200px] truncate block" title={v.error_message}>{v.error_message}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Link to full task list */}
                                <div className="pt-2 border-t border-border">
                                    <a
                                        href={`/admin/transcoding/status?media_id=${variantData.media_id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                        {t('admin.viewFullTaskList', 'View Full Task List')}
                                        <ExternalLink className="w-3 h-3"/>
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
