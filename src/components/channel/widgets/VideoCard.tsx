import React, {useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {Clock, Eye, MoreVertical, Pencil, BarChart3, Play, ListPlus, Share2, Flag, Trash2} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useAuth} from '@/hooks/useAuth';
import {mediaApi} from '@/lib/api/media';
import {toast} from 'sonner';
import ReportDialog from '@/components/common/ReportDialog';

interface Video {
    id: string;
    short_token?: string;
    title: string;
    thumbnail?: string;
    duration?: number;
    view_count?: number;
    published_at?: string;
    create_time?: string;
    progress?: number;
    user?: {
        id?: string;
        username?: string;
        nickname?: string;
        avatar?: string;
    };
}

interface VideoCardProps {
    video: Video;
    showChannelInfo?: boolean;
    showProgress?: boolean;
    isOwner?: boolean;
    size?: 'normal' | 'compact' | 'large';
    onEdit?: (videoId: string) => void;
    onViewStats?: (videoId: string) => void;
    onAddToPlaylist?: (videoId: string) => void;
    onShare?: (videoId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({
    video,
    showChannelInfo = false,
    showProgress = false,
    isOwner = false,
    size = 'normal',
    onEdit,
    onViewStats,
    onAddToPlaylist,
    onShare,
}) => {
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {user} = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [imgError, setImgError] = React.useState(false);
    const thumbnailUrl = getImageUrl(video.thumbnail, 'thumbnail');
    const hasThumbnail = !!video.thumbnail && !imgError;

    const handleThumbnailError = () => {
        setImgError(true);
    };

    const isActuallyOwner = isOwner || (user?.id && video.user?.id && user.id === video.user.id);

    const handleShare = async () => {
        if (onShare) {
            onShare(video.id);
            return;
        }
        const videoUrl = `${window.location.origin}/watch?v=${video.short_token || video.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: video.title,
                    url: videoUrl,
                });
            } catch {
                // User cancelled share
            }
        } else {
            await navigator.clipboard.writeText(videoUrl);
            toast.success(t('common.linkCopied') || 'Link copied to clipboard');
        }
    };

    const handleAddToPlaylist = () => {
        if (onAddToPlaylist) {
            onAddToPlaylist(video.id);
        } else {
            toast.info(t('common.featureComingSoon') || 'Feature coming soon');
        }
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(video.id);
        } else {
            navigate({to: '/media/$shortToken/edit', params: {shortToken: video.short_token || String(video.id)}} as any);
        }
    };

    const handleViewStats = () => {
        if (onViewStats) {
            onViewStats(video.id);
        } else {
            toast.info(t('common.featureComingSoon') || 'Feature coming soon');
        }
    };

    const handleOpenReport = () => {
        if (!user) {
            toast.error(t('auth.loginRequired'));
            navigate({to: '/auth/signin'});
            return;
        }
        setShowReportDialog(true);
    };

    const handleReport = async (data: { reason: string; description?: string }) => {
        await mediaApi.report(video.short_token || String(video.id), data);
        toast.success(t('report.submitted'));
    };

    const formatDuration = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatCount = (num: number): string => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const timeAgo = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('common.justNow');
        if (diffMins < 60) return t('common.minutesAgo', {count: diffMins});
        if (diffHours < 24) return t('common.hoursAgo', {count: diffHours});
        if (diffDays < 7) return t('common.daysAgo', {count: diffDays});
        if (diffDays < 30) return t('common.weeksAgo', {count: Math.floor(diffDays / 7)});
        if (diffDays < 365) return t('common.monthsAgo', {count: Math.floor(diffDays / 30)});
        return date.toLocaleDateString();
    };

    const sizeClasses = {
        compact: 'max-w-[200px]',
        normal: '',
        large: 'max-w-none',
    };

    return (
        <div
            className={`group cursor-pointer min-w-0 ${sizeClasses[size]}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => navigate({to: '/watch', search: {v: video.short_token || String(video.id)}})}
        >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow duration-200">
                {hasThumbnail ? (
                    <img
                        src={thumbnailUrl}
                        alt={video.title}
                        className={`w-full h-full object-cover transition-transform duration-300 ${isHovered ? 'scale-105' : 'scale-100'}`}
                        loading="lazy"
                        onError={handleThumbnailError}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-slate-500/10 dark:bg-slate-400/10 flex items-center justify-center">
                                <Play className="w-7 h-7 text-slate-400 dark:text-slate-500 ml-0.5" fill="currentColor"/>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">视频</span>
                        </div>
                    </div>
                )}

                {/* Duration badge */}
                {video.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        {formatDuration(video.duration)}
                    </span>
                )}

                {/* Play overlay on hover */}
                {isHovered && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200">
                        <div className="w-[clamp(2rem,6vw,3rem)] h-[clamp(2rem,6vw,3rem)] rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <Play className="text-white fill-white ml-0.5" style={{width: 'clamp(0.75rem,3vw,1.5rem)', height: 'clamp(0.75rem,3vw,1.5rem)'}}/>
                        </div>
                    </div>
                )}

                {/* Quick action buttons for owner on hover */}
                {isActuallyOwner && isHovered && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 transition-opacity duration-200">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit();
                            }}
                            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm transition-colors"
                            title={t('common.edit') || 'Edit video'}
                        >
                            <Pencil className="w-3.5 h-3.5 text-white"/>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewStats();
                            }}
                            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm transition-colors"
                            title={t('common.stats') || 'View stats'}
                        >
                            <BarChart3 className="w-3.5 h-3.5 text-white"/>
                        </button>
                    </div>
                )}

                {/* Progress bar */}
                {showProgress && video.progress !== undefined && video.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div
                            className="h-full bg-red-600 transition-all duration-300"
                            style={{width: `${Math.min(video.progress, 100)}%`}}
                        />
                    </div>
                )}
            </div>

            {/* Video info */}
            <div className="mt-2.5 flex gap-2.5">
                {!showChannelInfo && (
                    <div className="hidden sm:block w-9 h-9 rounded-full bg-primary/10 flex-shrink-0 mt-0.5 overflow-hidden">
                        {video.user?.avatar ? (
                            <img
                                src={getImageUrl(video.user.avatar, 'avatar')}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => handleImageError(e, 'avatar')}
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary">
                                {(video.user?.nickname || video.user?.username || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2 break-words group-hover:text-primary transition-colors leading-snug">
                        {video.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground min-w-0">
                        {video.user?.username && (
                            <span className="truncate min-w-0">@{video.user.nickname || video.user.username}</span>
                        )}
                        {video.user?.username && video.view_count !== undefined && (
                            <span className="shrink-0">·</span>
                        )}
                        {video.view_count !== undefined && (
                            <span className="flex items-center gap-0.5 shrink-0">
                                <Eye className="w-3 h-3"/>
                                {formatCount(video.view_count)}
                            </span>
                        )}
                        {(video.published_at || video.create_time) && (
                            <>
                                <span className="shrink-0">·</span>
                                <span className="shrink-0">{timeAgo(video.published_at || video.create_time!)}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* More options dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded-full transition-all self-start shrink-0 h-6 w-6 flex items-center justify-center"
                        >
                            <MoreVertical className="h-3 w-3"/>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {isActuallyOwner ? (
                            <>
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit();
                                }}>
                                    <Pencil className="h-4 w-4 mr-2"/>
                                    {t('common.edit') || 'Edit'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewStats();
                                }}>
                                    <BarChart3 className="h-4 w-4 mr-2"/>
                                    {t('common.stats') || 'Stats'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                            </>
                        ) : null}
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleAddToPlaylist();
                        }}>
                            <ListPlus className="h-4 w-4 mr-2"/>
                            {t('watch.saveToPlaylist')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleShare();
                        }}>
                            <Share2 className="h-4 w-4 mr-2"/>
                            {t('watch.share')}
                        </DropdownMenuItem>
                        {!isActuallyOwner && (
                            <>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenReport();
                                }} className="text-red-600 focus:text-red-600">
                                    <Flag className="h-4 w-4 mr-2"/>
                                    {t('video.reportVideo') || t('common.report') || 'Report'}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <ReportDialog
                open={showReportDialog}
                onOpenChange={setShowReportDialog}
                targetId={video.short_token || String(video.id)}
                targetType="media"
                onSubmit={handleReport}
            />
        </div>
    );
};

// Simple Film icon for placeholder
function Film({className}: {className?: string}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/>
            <line x1="7" x2="7" y1="2" y2="22"/>
            <line x1="17" x2="17" y1="2" y2="22"/>
            <line x1="2" x2="22" y1="12" y2="12"/>
            <line x1="2" x2="7" y1="7" y2="7"/>
            <line x1="2" x2="7" y1="17" y2="17"/>
            <line x1="17" x2="22" y1="7" y2="7"/>
            <line x1="17" x2="22" y1="17" y2="17"/>
        </svg>
    );
}

export default VideoCard;
