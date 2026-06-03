/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 管理端 - 媒体管理页面
 */

import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useLocation, useNavigate} from '@tanstack/react-router';
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
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {mediaApi, encodingApi, adminMediaApi, type Media, type MediaVariantSummary} from '@/lib/api/media';
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

    const [searchParams, setSearchParams] = useState({keyword: urlSearch || '', state: '', page: 1, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});

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
            setVariantData(data as unknown as MediaVariantSummary);
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
            if (variantData?.media_id === mediaId) {
                handleShowVariants({id: mediaId} as Media);
            }
        } catch (err: any) {
            console.error("Retry all failed:", err.message);
        } finally {
            setRetryingAllId(null);
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

    // Helper: resolve preview image URL
    const resolvePreview = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        const base = API_BASE_URL;
        return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    };

    // Stats
    const totalAssets = total || mediaList.length;
    const activeTranscodes = mediaList.filter(m => m.encoding_status === 'processing').length;
    const failedTasks = mediaList.filter(m => m.encoding_status === 'failed').length;

    // Pagination
    const totalPages = Math.ceil(total / searchParams.page_size);
    const startItem = (searchParams.page - 1) * searchParams.page_size + 1;
    const endItem = Math.min(searchParams.page * searchParams.page_size, total);

    // Status badge helper
    const statusBadge = (state?: string) => {
        switch (state) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{t('admin.publishedStatus', 'Published')}
                    </span>
                );
            case 'draft':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{t('admin.draftStatus', 'Draft')}
                    </span>
                );
            case 'deleted':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{t('admin.deletedStatus', 'Deleted')}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{state || '—'}
                    </span>
                );
        }
    };

    // Encoding status badge helper
    const encBadge = (status?: string) => {
        switch (status) {
            case 'success':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{encStatusLabel(status)}
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{encStatusLabel(status)}
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>{encStatusLabel(status)}
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{encStatusLabel(status)}
                    </span>
                );
            case 'partial':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{encStatusLabel(status)}
                    </span>
                );
            default:
                return <span className="text-xs text-slate-400">--</span>;
        }
    };

    // Type badge helper
    const typeBadge = (type?: string) => {
        switch (type) {
            case 'video':
                return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase">Video</span>;
            case 'image':
                return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase">Image</span>;
            case 'audio':
                return <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[10px] font-bold uppercase">Audio</span>;
            default:
                return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{type || 'Unknown'}</span>;
        }
    };

    return (
        <div className="p-8">
            {/* Page Title Area */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('admin.mediaManagement', 'Media Library')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.mediaManagementDesc', 'Manage video, audio, and image assets across the network.')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                        onClick={() => setUploadDialogOpen(true)}
                    >
                        <Plus className="w-4 h-4"/>
                        {t('admin.uploadMedia', 'Upload')}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Total Assets */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalAssets', 'Total Assets')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{totalAssets}</h3>
                            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                +12% vs last month
                            </p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Film className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                {/* Active Transcodes */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.activeTranscodes', 'Active Transcodes')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{activeTranscodes}</h3>
                            <p className="text-xs font-semibold text-slate-400 mt-2">{t('admin.nodesOnline', '6 nodes online')}</p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Cpu className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                {/* Storage Used */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.storageUsed', 'Storage Used')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">4.2TB</h3>
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-indigo-600 w-[84%]"></div>
                            </div>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <HardDrive className="w-5 h-5"/>
                        </div>
                    </div>
                </div>

                {/* Failed Tasks */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.failedTasks', 'Failed Tasks')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-red-600 mt-1">{String(failedTasks).padStart(2, '0')}</h3>
                            <p className="text-xs font-semibold text-red-600 mt-2 hover:underline cursor-pointer">{t('admin.viewErrorLogs', 'View error logs')}</p>
                        </div>
                        <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <AlertCircle className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input
                            className="w-full pl-9 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                            type="text"
                            placeholder={t('admin.searchAssets', 'Search assets...')}
                            value={searchParams.keyword}
                            onChange={(e) => setSearchParams({...searchParams, keyword: e.target.value})}
                        />
                    </div>
                    <select
                        className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                        value={searchParams.state || 'all'}
                        onChange={(e) => setSearchParams({...searchParams, state: e.target.value === 'all' ? '' : e.target.value, page: 1})}
                    >
                        <option value="all">{t('admin.allStatus', 'Status: All')}</option>
                        <option value="active">{t('admin.publishedStatus', 'Published')}</option>
                        <option value="draft">{t('admin.draftStatus', 'Draft')}</option>
                        <option value="deleted">{t('admin.deletedStatus', 'Deleted')}</option>
                    </select>
                    <select
                        className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                        value="all"
                        onChange={() => {}}
                    >
                        <option value="all">{t('admin.allTypes', 'Type: All')}</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                        <option value="audio">Audio</option>
                    </select>
                    <button
                        className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                        onClick={() => {
                            setSearchParams({keyword: '', state: '', page: 1, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});
                            loadMedia();
                        }}
                    >
                        <RotateCcw className="w-3.5 h-3.5"/>
                        {t('admin.reset', 'Reset')}
                    </button>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                    {t('admin.showingAssets', `Showing ${startItem} - ${endItem} of ${total} assets`)}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.thumbnail', 'Thumbnail')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.assetName', 'Asset Name')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.type', 'Type')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.size', 'Size')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.views', 'Views')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status', 'Status')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.transcoding', 'Transcoding')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.date', 'Date')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-16 text-center">
                                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto"/>
                                </td>
                            </tr>
                        ) : mediaList.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-16 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Film className="w-8 h-8 text-slate-300"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noMediaFound', 'No media found')}</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mx-auto">{t('admin.uploadFirstMedia', 'Upload your first media asset to get started.')}</p>
                                    <button
                                        className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                                        onClick={() => setUploadDialogOpen(true)}
                                    >
                                        <Plus className="w-4 h-4"/>
                                        {t('admin.uploadMedia', 'Upload')}
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            mediaList.map((media) => (
                                <tr key={media.id} className={`hover:bg-slate-50/50 transition-colors ${media.encoding_status === 'failed' ? 'bg-red-50/30' : ''}`}>
                                    {/* Thumbnail */}
                                    <td className="px-6 py-3.5">
                                        <div className="w-16 aspect-video rounded-md bg-slate-100 overflow-hidden relative border border-slate-200">
                                            {media.thumbnail ? (
                                                <img
                                                    alt="Preview"
                                                    className={`w-full h-full object-cover ${media.encoding_status === 'failed' ? 'grayscale opacity-50' : ''}`}
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
                                    </td>

                                    {/* Asset Name */}
                                    <td className="px-6 py-3.5">
                                        <div className="text-sm font-semibold text-slate-800">{media.title || t('admin.unnamedMedia')}</div>
                                        <div className="text-xs text-slate-400">{media.duration ? formatDuration(media.duration) : ''}</div>
                                    </td>

                                    {/* Type */}
                                    <td className="px-6 py-3.5 text-sm text-slate-700">
                                        {typeBadge(media.type)}
                                    </td>

                                    {/* Size */}
                                    <td className="px-6 py-3.5 text-xs font-mono text-slate-500">
                                        {media.size ? formatFileSize(parseInt(media.size)) : '-'}
                                    </td>

                                    {/* Views */}
                                    <td className="px-6 py-3.5 text-xs font-mono text-slate-500">
                                        {formatViews(media.view_count)}
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-3.5">
                                        {statusBadge(media.state)}
                                    </td>

                                    {/* Transcoding */}
                                    <td className="px-6 py-3.5">
                                        {media.encoding_status ? (
                                            <div className="flex items-center gap-1.5">
                                                {encBadge(media.encoding_status)}
                                                <button
                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShowVariants(media);
                                                    }}
                                                    title={t('admin.viewTranscodingDetails')}
                                                >
                                                    <ExternalLink className="w-3 h-3"/>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">--</span>
                                        )}
                                    </td>

                                    {/* Date */}
                                    <td className="px-6 py-3.5 text-xs text-slate-400">
                                        {formatDateTime(media.create_time)}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-3.5 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                onClick={() => handleEditClick(media)}
                                            >
                                                <Edit3 className="w-4 h-4"/>
                                            </button>
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                onClick={() => handleDeleteClick(media)}
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs text-slate-500">{t('admin.showingItems', `Showing ${startItem} to ${endItem} of ${total} items`)}</p>
                        <div className="flex items-center gap-1">
                            <button
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                onClick={() => setSearchParams({...searchParams, page: searchParams.page - 1})}
                                disabled={searchParams.page <= 1}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </button>
                            <button className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm">{searchParams.page}</button>
                            {searchParams.page < totalPages && (
                                <button
                                    className="h-8 w-8 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                    onClick={() => setSearchParams({...searchParams, page: searchParams.page + 1})}
                                >
                                    {searchParams.page + 1}
                                </button>
                            )}
                            {totalPages > 2 && searchParams.page < totalPages - 1 && (
                                <button className="h-8 w-8 rounded-lg text-sm text-slate-600">...</button>
                            )}
                            {totalPages > 2 && searchParams.page < totalPages - 1 && (
                                <button
                                    className="h-8 w-8 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                    onClick={() => setSearchParams({...searchParams, page: totalPages})}
                                >
                                    {totalPages}
                                </button>
                            )}
                            <button
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                onClick={() => setSearchParams({...searchParams, page: searchParams.page + 1})}
                                disabled={searchParams.page >= totalPages}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogContent className="sm:max-w-4xl rounded-2xl shadow-2xl p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.uploadMediaFiles', 'Upload Assets')}</h3>
                    </div>
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
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-7 h-7"/>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">{t('admin.confirmDelete', 'Delete Asset?')}</h3>
                        <p className="text-sm text-slate-500 mt-2 mb-6">{t('admin.deleteMediaConfirm', 'This action cannot be undone. The file will be removed from storage clusters.')}</p>
                        <div className="flex gap-3">
                            <button
                                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200"
                                onClick={() => setDeleteDialogOpen(false)}
                                disabled={deleteMutation.isPending}
                            >
                                {t('admin.cancel', 'Cancel')}
                            </button>
                            <button
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                                onClick={handleConfirmDelete}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin inline"/> : null}
                                {t('admin.confirmDeleteBtn', 'Delete')}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Transcoding Detail Dialog */}
            <Dialog open={variantDetailOpen} onOpenChange={setVariantDetailOpen}>
                <DialogContent className="sm:max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden max-h-[80vh] overflow-y-auto">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            {t('admin.transcodingOverview', 'Transcoding Overview')}
                            {variantData?.encoding_status && encBadge(variantData.encoding_status)}
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {variantData && (
                            <>
                                {/* Summary stats */}
                                <div className="grid grid-cols-5 gap-2 text-center">
                                    <div className="rounded-lg bg-yellow-50 p-3">
                                        <p className="text-lg font-bold text-yellow-600">{variantData.video_pending_count ?? 0}</p>
                                        <p className="text-[11px] text-slate-500">{t('admin.queued', 'Queued')}</p>
                                    </div>
                                    <div className="rounded-lg bg-blue-50 p-3">
                                        <p className="text-lg font-bold text-blue-600">{variantData.video_processing_count ?? 0}</p>
                                        <p className="text-[11px] text-slate-500">{t('admin.transcoding', 'Transcoding')}</p>
                                    </div>
                                    <div className="rounded-lg bg-green-50 p-3">
                                        <p className="text-lg font-bold text-emerald-600">{variantData.video_success_count}</p>
                                        <p className="text-[11px] text-slate-500">{t('admin.success', 'Success')}</p>
                                    </div>
                                    <div className="rounded-lg bg-red-50 p-3">
                                        <p className="text-lg font-bold text-red-600">{variantData.video_failed_count}</p>
                                        <p className="text-[11px] text-slate-500">{t('admin.failed', 'Failed')}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-100 p-3">
                                        <p className="text-lg font-bold text-slate-700">{variantData.video_total_count}</p>
                                        <p className="text-[11px] text-slate-500">{t('admin.total', 'Total')}</p>
                                    </div>
                                </div>

                                {/* HLS / Preview paths */}
                                {(variantData.hls_file || variantData.preview_file) && (
                                    <div className="text-xs space-y-1 bg-slate-50 rounded-md p-3 border border-slate-100">
                                        {variantData.hls_file && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-slate-500">HLS:</span>
                                                <code className="text-green-700">{variantData.hls_file}</code>
                                            </div>
                                        )}
                                        {variantData.preview_file && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-slate-500">Preview:</span>
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
                                                <button
                                                    className="h-6 text-[10px] ml-auto inline-flex items-center gap-1 px-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                                                    disabled={retryingAllId === variantData.media_id}
                                                    onClick={() => handleRetryAllFailed(variantData.media_id)}
                                                >
                                                    {retryingAllId === variantData.media_id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin"/>
                                                    ) : (
                                                        <RotateCcw className="w-3 h-3"/>
                                                    )}
                                                    {t('admin.retryAllFailed', 'Retry All Failed')}
                                                </button>
                                            )}
                                        </p>
                                        {variantData.variants.map((v) => (
                                            <div
                                                key={v.task_id}
                                                className={`flex items-center justify-between rounded-md px-3 py-2 text-xs ${
                                                    v.status === "failed" ? "bg-red-50" :
                                                    v.status === "success" ? "bg-green-50" :
                                                    "bg-slate-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-mono font-medium truncate">{v.profile_name}</span>
                                                    {v.resolution && (
                                                        <span className="text-slate-400 hidden sm:inline">{v.resolution}</span>
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
                                <div className="pt-2 border-t border-slate-100">
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
