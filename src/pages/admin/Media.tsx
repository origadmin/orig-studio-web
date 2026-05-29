/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 管理端 - 媒体管理页面 (Media Library Grid View)
 */

import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useLocation, useNavigate, Link} from '@tanstack/react-router';
import {
    Image as ImageIcon,
    Video,
    FileText,
    HardDrive,
    Loader2,
    Upload,
    Search,
    Grid3X3,
    List,
    MoreHorizontal,
    Pencil,
    Trash2,
    Eye,
    RefreshCw,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Progress} from '@/components/ui/progress';
import {encodingApi, adminMediaApi, type Media, type MediaVariantSummary} from '@/lib/api/media';
import {API_BASE_URL} from '@/lib/request';
import {useAdminMediaList, useDeleteMedia} from '@/hooks/queries';
import {UploadComponent} from '@/components/upload/UploadComponent';
import {formatFileSize, formatDateTime, formatDuration} from '@/lib/format';
import {TablePagination} from '@/components/common/TablePagination';
import {PAGINATION_CONFIG} from '@/config/pagination';

// View mode toggle
type ViewMode = 'grid' | 'list';

export default function MediaPage() {
    const {t} = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const urlSearch = new URLSearchParams(location.search).get("q");

    // View mode
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Dialog states
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingMedia, setDeletingMedia] = useState<Media | null>(null);

    // Transcoding variant detail dialog
    const [variantDetailOpen, setVariantDetailOpen] = useState(false);
    const [variantData, setVariantData] = useState<MediaVariantSummary | null>(null);
    const [retryingAllId, setRetryingAllId] = useState<string | number | null>(null);

    // Search & filter params
    const [searchParams, setSearchParams] = useState({
        keyword: urlSearch || '',
        state: '',
        type: '',
        page: 1,
        page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    });

    const [total, setTotal] = useState(0);

    // React Query Hooks
    const {data: mediaData, isLoading: loading, refetch: loadMedia} = useAdminMediaList(searchParams);
    const deleteMutation = useDeleteMedia();

    const mediaList = mediaData?.items || (Array.isArray(mediaData) ? mediaData : []) as Media[];

    React.useEffect(() => {
        if (mediaData?.total !== undefined) {
            setTotal(mediaData.total);
        }
    }, [mediaData?.total]);

    // Derived stats
    const totalMedia = total || mediaList.length;
    const videoCount = mediaList.filter(m => m.type === 'video').length;
    const processingCount = mediaList.filter(m => m.encoding_status === 'processing' || m.encoding_status === 'pending').length;
    const totalSizeBytes = mediaList.reduce((acc, m) => acc + (m.size ? parseInt(m.size) : 0), 0);

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

    const handleShowVariants = async (media: Media) => {
        try {
            const data = await adminMediaApi.getVariants(media.id);
            setVariantData(data as unknown as MediaVariantSummary);
            setVariantDetailOpen(true);
        } catch (err: any) {
            console.error("Failed to fetch variants:", err.message);
        }
    };

    const handleRetryAllFailed = async (mediaId: string | number) => {
        setRetryingAllId(mediaId);
        try {
            await encodingApi.retryAllFailed(String(mediaId));
            if (variantData?.media_id === mediaId) {
                handleShowVariants({id: mediaId} as Media);
            }
        } catch (err: any) {
            console.error("Retry all failed:", err.message);
        } finally {
            setRetryingAllId(null);
        }
    };

    const encStatusBadge = (status?: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" => {
        switch (status) {
            case "success":
                return "success";
            case "processing":
                return "info";
            case "pending":
                return "warning";
            case "partial":
                return "warning";
            case "failed":
                return "destructive";
            default:
                return "secondary";
        }
    };

    const encStatusLabel = (status?: string) => {
        switch (status) {
            case "success":
                return t('admin.complete');
            case "processing":
                return t('admin.processing');
            case "pending":
                return t('admin.queued');
            case "partial":
                return t('admin.partialComplete');
            case "failed":
                return t('admin.failed');
            default:
                return status || "--";
        }
    };

    // Resolve media thumbnail/preview URL
    const resolveImageUrl = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        const base = API_BASE_URL;
        return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    };

    // Get status badge for media card overlay
    const getStatusBadge = (media: Media) => {
        const encStatus = media.encoding_status;
        if (encStatus === 'processing' || encStatus === 'pending') {
            return (
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-warning/90 text-white px-2 py-0.5 rounded-badge text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>
                    {t('admin.processing')}
                </div>
            );
        }
        if (encStatus === 'failed') {
            return (
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-destructive/90 text-white px-2 py-0.5 rounded-badge text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"/>
                    {t('admin.failed')}
                </div>
            );
        }
        return (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-success/90 text-white px-2 py-0.5 rounded-badge text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white"/>
                Ready
            </div>
        );
    };

    // Get type icon for card
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'video':
                return <Video className="w-3.5 h-3.5"/>;
            case 'image':
                return <ImageIcon className="w-3.5 h-3.5"/>;
            case 'document':
                return <FileText className="w-3.5 h-3.5"/>;
            default:
                return <HardDrive className="w-3.5 h-3.5"/>;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'video':
                return 'Video';
            case 'image':
                return 'Image';
            case 'document':
                return 'Document';
            default:
                return type || 'File';
        }
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t('admin.mediaManagement')}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t('admin.mediaManagementDesc')}</p>
                </div>
                <Button
                    onClick={() => setUploadDialogOpen(true)}
                    className="rounded-btn shadow-sm active:scale-95 transition-all"
                >
                    <Upload className="w-4 h-4 mr-2"/>
                    {t('admin.uploadMedia')}
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Media */}
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">{t('admin.totalMedia')}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold text-primary">{totalMedia.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>
                {/* Videos */}
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">{t('admin.videos')}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold text-foreground">{videoCount.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>
                {/* Storage Used */}
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">{t('admin.storageUsed', 'Storage Used')}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold text-foreground">{formatFileSize(totalSizeBytes)}</span>
                        </div>
                        <Progress value={Math.min((totalSizeBytes / (2 * 1073741824)) * 100, 100)} className="h-1.5 mt-3"/>
                    </CardContent>
                </Card>
                {/* Processing */}
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">{t('admin.processing')}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold text-warning">{processingCount}</span>
                            {processingCount > 0 && (
                                <Loader2 className="w-5 h-5 text-warning animate-spin"/>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="shadow-sm">
                <CardContent className="p-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Type Filter */}
                            <Select
                                value={searchParams.type || 'all'}
                                onValueChange={(v) => setSearchParams({...searchParams, type: v === 'all' ? '' : v, page: 1})}
                            >
                                <SelectTrigger className="w-[140px] h-8 rounded-input">
                                    <SelectValue placeholder="All Types"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="image">Images</SelectItem>
                                    <SelectItem value="video">Videos</SelectItem>
                                    <SelectItem value="document">Documents</SelectItem>
                                </SelectContent>
                            </Select>
                            {/* Status Filter */}
                            <Select
                                value={searchParams.state || 'all'}
                                onValueChange={(v) => setSearchParams({...searchParams, state: v === 'all' ? '' : v, page: 1})}
                            >
                                <SelectTrigger className="w-[140px] h-8 rounded-input">
                                    <SelectValue placeholder="Any Status"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any Status</SelectItem>
                                    <SelectItem value="active">{t('admin.publishedStatus')}</SelectItem>
                                    <SelectItem value="draft">{t('admin.draftStatus')}</SelectItem>
                                    <SelectItem value="deleted">{t('admin.deletedStatus')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {/* Search */}
                            <div className="relative w-[200px]">
                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
                                <Input
                                    placeholder={t('admin.search')}
                                    value={searchParams.keyword}
                                    onChange={(e) => setSearchParams({...searchParams, keyword: e.target.value})}
                                    className="pl-8 h-8 rounded-input"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Sort */}
                            <Select
                                onValueChange={(v) => {
                                    const descending = v === 'newest' || v === 'size';
                                    const order_by = v === 'size' ? 'size' : 'create_time';
                                    setSearchParams({...searchParams, page: 1} as any);
                                }}
                            >
                                <SelectTrigger className="w-[150px] h-8 rounded-input">
                                    <SelectValue placeholder="Newest First"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                    <SelectItem value="size">File Size</SelectItem>
                                    <SelectItem value="alpha">Alphabetical</SelectItem>
                                </SelectContent>
                            </Select>
                            {/* View Mode Toggle */}
                            <div className="flex border border-border rounded-btn overflow-hidden">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-8 w-8 p-0 rounded-none ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid3X3 className="h-4 w-4"/>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-8 w-8 p-0 rounded-none border-l border-border ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="h-4 w-4"/>
                                </Button>
                            </div>
                            {/* Refresh */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => loadMedia()}
                            >
                                <RefreshCw className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Media Grid / List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    <span className="ml-3 text-muted-foreground">{t('admin.loadingData')}</span>
                </div>
            ) : mediaList.length === 0 ? (
                /* Empty State */
                <Card className="shadow-sm">
                    <CardContent className="py-16 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <ImageIcon className="w-8 h-8 text-muted-foreground"/>
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">{t('admin.noMediaFound')}</h3>
                        <p className="text-sm text-muted-foreground mb-6">Upload your first media asset to get started.</p>
                        <Button onClick={() => setUploadDialogOpen(true)} className="rounded-btn">
                            <Upload className="w-4 h-4 mr-2"/>
                            {t('admin.uploadMedia')}
                        </Button>
                    </CardContent>
                </Card>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {mediaList.map((media) => (
                        <div
                            key={media.id}
                            className="group cursor-pointer bg-card rounded-card border border-border overflow-hidden hover:shadow-md transition-all duration-200"
                        >
                            {/* Thumbnail */}
                            <div className="aspect-video relative bg-muted overflow-hidden">
                                {media.thumbnail || media.preview_file_path || media.preview_file ? (
                                    <img
                                        src={resolveImageUrl(media.thumbnail || media.preview_file_path || media.preview_file)}
                                        alt={media.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {getTypeIcon(media.type)}
                                    </div>
                                )}
                                {/* Processing overlay */}
                                {(media.encoding_status === 'processing' || media.encoding_status === 'pending') && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 text-white animate-spin"/>
                                    </div>
                                )}
                                {/* Status badge */}
                                {getStatusBadge(media)}
                                {/* Duration badge for videos */}
                                {media.type === 'video' && media.duration > 0 && (
                                    <div className="absolute bottom-2 right-2 bg-black/60 text-white px-1.5 py-0.5 rounded-badge text-[10px] font-medium">
                                        {formatDuration(media.duration)}
                                    </div>
                                )}
                                {/* Hover more button */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 bg-white/90 dark:bg-black/60 text-foreground dark:text-white shadow-sm hover:bg-white dark:hover:bg-black/80 rounded-btn"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontal className="h-4 w-4"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={() => window.open(`/watch?v=${media.short_token || media.id}`, '_blank')}>
                                                <Eye className="w-4 h-4 mr-2"/>
                                                {t('admin.view')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link to="/admin/media/$id" params={{id: String(media.id)}}>
                                                    <Pencil className="w-4 h-4 mr-2"/>
                                                    {t('admin.edit')}
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleShowVariants(media)}>
                                                <HardDrive className="w-4 h-4 mr-2"/>
                                                {t('admin.transcoding')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => handleDeleteClick(media)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2"/>
                                                {t('admin.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            {/* Card info */}
                            <div className="p-3">
                                <h4 className="text-sm font-medium truncate text-foreground">{media.title || t('admin.unnamedMedia')}</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-[11px] text-muted-foreground">
                                        {media.size ? formatFileSize(parseInt(media.size)) : '-'}
                                        {' \u00B7 '}
                                        {formatDateTime(media.create_time).split(' ')[0]}
                                    </span>
                                    <span className="text-[11px] px-1.5 py-0.5 bg-muted rounded-badge uppercase text-muted-foreground">
                                        {getTypeLabel(media.type)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <Card className="shadow-sm">
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {mediaList.map((media) => (
                                <div
                                    key={media.id}
                                    className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors group"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-24 h-14 bg-muted rounded-btn overflow-hidden shrink-0 relative">
                                        {media.thumbnail || media.preview_file_path || media.preview_file ? (
                                            <img
                                                src={resolveImageUrl(media.thumbnail || media.preview_file_path || media.preview_file)}
                                                alt={media.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {getTypeIcon(media.type)}
                                            </div>
                                        )}
                                        {media.type === 'video' && media.duration > 0 && (
                                            <div className="absolute bottom-1 right-1 bg-black/60 text-white px-1 py-0.5 rounded-badge text-[9px] font-medium">
                                                {formatDuration(media.duration)}
                                            </div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium truncate text-foreground">{media.title || t('admin.unnamedMedia')}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[11px] text-muted-foreground">
                                                {media.size ? formatFileSize(parseInt(media.size)) : '-'}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                {formatDateTime(media.create_time).split(' ')[0]}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 rounded-badge uppercase">
                                                {getTypeLabel(media.type)}
                                            </Badge>
                                        </div>
                                    </div>
                                    {/* Status */}
                                    <div className="shrink-0">
                                        {media.encoding_status ? (
                                            <Badge variant={encStatusBadge(media.encoding_status)} className="text-[10px] h-5 px-1.5 rounded-badge">
                                                {encStatusLabel(media.encoding_status)}
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-badge">
                                                {media.state || 'draft'}
                                            </Badge>
                                        )}
                                    </div>
                                    {/* Actions */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal className="h-4 w-4"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={() => window.open(`/watch?v=${media.short_token || media.id}`, '_blank')}>
                                                <Eye className="w-4 h-4 mr-2"/>
                                                {t('admin.view')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link to="/admin/media/$id" params={{id: String(media.id)}}>
                                                    <Pencil className="w-4 h-4 mr-2"/>
                                                    {t('admin.edit')}
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleShowVariants(media)}>
                                                <HardDrive className="w-4 h-4 mr-2"/>
                                                {t('admin.transcoding')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => handleDeleteClick(media)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2"/>
                                                {t('admin.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            <TablePagination
                page={searchParams.page}
                pageSize={searchParams.page_size}
                total={total}
                onPageChange={(p) => setSearchParams({...searchParams, page: p})}
                onPageSizeChange={(ps) => setSearchParams({...searchParams, page_size: ps, page: 1})}
            />

            {/* Upload Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{t('admin.uploadMediaFiles')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.uploadMediaDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.deleteMediaConfirm')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('admin.cancelDelete')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                            {t('admin.confirmDeleteBtn')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Transcoding Variant Detail Dialog */}
            <Dialog open={variantDetailOpen} onOpenChange={setVariantDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {t('admin.transcodingOverview')}
                            {variantData?.encoding_status && (
                                <Badge variant={encStatusBadge(variantData.encoding_status)} className="text-xs rounded-badge">
                                    {encStatusLabel(variantData.encoding_status)}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admin.transcodingOverviewDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    {variantData && (
                        <div className="space-y-4 py-2">
                            {/* Summary stats */}
                            <div className="grid grid-cols-5 gap-2 text-center">
                                <div className="rounded-card bg-warning/10 p-3">
                                    <p className="text-lg font-bold text-warning">{variantData.video_pending_count ?? 0}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('admin.queued')}</p>
                                </div>
                                <div className="rounded-card bg-info/10 p-3">
                                    <p className="text-lg font-bold text-info">{variantData.video_processing_count ?? 0}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('admin.transcoding')}</p>
                                </div>
                                <div className="rounded-card bg-success/10 p-3">
                                    <p className="text-lg font-bold text-success">{variantData.video_success_count}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('admin.success')}</p>
                                </div>
                                <div className="rounded-card bg-destructive/10 p-3">
                                    <p className="text-lg font-bold text-destructive">{variantData.video_failed_count}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('admin.failed')}</p>
                                </div>
                                <div className="rounded-card bg-muted p-3">
                                    <p className="text-lg font-bold text-foreground">{variantData.video_total_count}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('admin.total')}</p>
                                </div>
                            </div>

                            {/* HLS / Preview paths */}
                            {(variantData.hls_file || variantData.preview_file) && (
                                <div className="text-xs space-y-1 bg-muted/50 rounded-card p-3">
                                    {variantData.hls_file && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-muted-foreground">HLS:</span>
                                            <code className="text-success">{variantData.hls_file}</code>
                                        </div>
                                    )}
                                    {variantData.preview_file && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-muted-foreground">Preview:</span>
                                            <img
                                                src={resolveImageUrl(variantData.preview_file)}
                                                alt="preview"
                                                className="h-12 rounded-btn border border-border"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Variant list */}
                            {variantData.variants && variantData.variants.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        {t('admin.variantTasks')}
                                        {variantData.video_failed_count > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[10px] ml-auto rounded-btn"
                                                disabled={retryingAllId === variantData.media_id}
                                                onClick={() => handleRetryAllFailed(variantData.media_id)}
                                            >
                                                {retryingAllId === variantData.media_id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin mr-1"/>
                                                ) : (
                                                    <RefreshCw className="w-3 h-3 mr-1"/>
                                                )}
                                                {t('admin.retryAllFailed')}
                                            </Button>
                                        )}
                                    </p>
                                    {variantData.variants.map((v) => (
                                        <div
                                            key={v.task_id}
                                            className={`flex items-center justify-between rounded-card px-3 py-2 text-xs ${
                                                v.status === "failed" ? "bg-destructive/10" :
                                                    v.status === "success" ? "bg-success/10" :
                                                        "bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-mono font-medium truncate">{v.profile_name}</span>
                                                {v.resolution && (
                                                    <span className="text-muted-foreground hidden sm:inline">{v.resolution}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <Badge variant={encStatusBadge(v.status)} className="text-[10px] px-1.5 py-0 h-4 rounded-badge">
                                                    {encStatusLabel(v.status)}
                                                </Badge>
                                                {v.output_path && v.status === "success" && (
                                                    <code className="text-[10px] text-success max-w-[150px] truncate block">{v.output_path}</code>
                                                )}
                                                {v.error_message && (
                                                    <span className="text-destructive max-w-[200px] truncate block" title={v.error_message}>{v.error_message}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Link to TranscodingStatus page */}
                            <div className="pt-2 border-t">
                                <a
                                    href={`/admin/transcoding/status?media_id=${variantData.media_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-info hover:underline"
                                >
                                    {t('admin.viewFullTaskList')}
                                </a>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
