/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 视频播放页 - 对接真实数据
 */

import React, {useState, useEffect, useRef} from 'react';
import {useSearch, useNavigate, Link} from '@tanstack/react-router';
import {
    Loader2, RefreshCw, AlertTriangle, Trash2, FileText, Eye, Pencil
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {formatViews, formatDate, formatDuration} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {publicMediaApi, adminMediaApi, encodingApi, type Media} from '@/lib/api/media';
import {commentApi} from '@/lib/api/comment';
import {usePublicMediaDetail, useMediaList, useDeleteMedia} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';
import {usePlayerSettings} from '@/hooks/usePlayerSettings';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {getFullUrl} from '@/lib/utils';
import ErrorPage from '@/components/common/ErrorPage';
import SubscribeButton from '@/components/common/SubscribeButton';
import CommentSection from '@/components/common/CommentSection';
import InteractionBar from '@/components/common/InteractionBar';
import VideoPlayer, {VideoPlayerHandle, NextVideoInfo} from '@/components/common/VideoPlayer';
import {DeleteConfirmDialog} from '@/components/common/DeleteConfirmDialog';
import {HashtagText} from '@/components/common/HashtagText';
import {colorFromName} from '@/lib/utils/tag-color';
import {mergeTagsWithHashtags} from '@/lib/utils/hashtag';
import {useWatchProgress} from '@/hooks/useWatchProgress';
import {usePublicAdPlacements} from '@/hooks/queries';
import AdDisplay from '@/components/portal/AdDisplay';
import {toast} from 'sonner';
import type {Ad, AdCreative} from '@/lib/api/portal';

const WATCHED_HISTORY_KEY = 'watch_autoplay_history';
const WATCHED_HISTORY_LIMIT = 20;
const SIDEBAR_AD_DECISION_KEY = 'ad-sidebar-decision-v1';   // {shown: bool, adId: string, decidedAt: timestamp}
const SIDEBAR_AD_DECISION_TTL_MS = 10 * 60 * 1000;          // 10 分钟内同会话保持决策，不频繁跳变
const SIDEBAR_AD_SHOW_PROBABILITY = 0.7;                     // 阶段1：70% 全局显示概率（后端 frequency/weight 字段缺失，前端先模拟）

const getWatchedHistory = (): string[] => {
    try {
        const stored = sessionStorage.getItem(WATCHED_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const addToWatchedHistory = (shortToken: string) => {
    try {
        const history = getWatchedHistory();
        const filtered = history.filter(t => t !== shortToken);
        filtered.unshift(shortToken);
        const trimmed = filtered.slice(0, WATCHED_HISTORY_LIMIT);
        sessionStorage.setItem(WATCHED_HISTORY_KEY, JSON.stringify(trimmed));
    } catch {
        // ignore storage errors
    }
};

const clearWatchedHistory = () => {
    try {
        sessionStorage.removeItem(WATCHED_HISTORY_KEY);
    } catch {
        // ignore storage errors
    }
};

const WatchPage = () => {
    const {t} = useTranslation();
    const {v: shortToken, autoplay: urlAutoPlay} = useSearch({strict: false});
    const navigate = useNavigate();
    // ✅ 使用新的 usePublicMediaDetail hook (short_token based)
    const {data: media, isLoading: isMediaLoading, error: mediaError} = usePublicMediaDetail(shortToken as string);
    const {user, isAdmin} = useAuth();
    const deleteMutation = useDeleteMedia();
    const {autoPlayNext, setAutoPlayNext} = usePlayerSettings();

    const [retrying, setRetrying] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const commentSectionRef = useRef<HTMLDivElement>(null);
    const viewCountedRef = useRef(false);
    const addedToHistoryRef = useRef(false);

    // Reset view count and history flag when shortToken changes
    useEffect(() => {
        viewCountedRef.current = false;
        addedToHistoryRef.current = false;
    }, [shortToken]);

    // Mark current video as watched when playback starts (for autoplay de-duplication)
    const markAsWatched = () => {
        if (shortToken && !addedToHistoryRef.current) {
            addedToHistoryRef.current = true;
            addToWatchedHistory(shortToken as string);
        }
    };

    // Video player ref for external control
    const videoPlayerRef = useRef<VideoPlayerHandle>(null);

    // Watch progress reporting - reports to history service
    const {handleTimeUpdate: handleProgressTimeUpdate, handlePause: handleProgressPause, handleEnded: handleProgressEnded} = useWatchProgress({
        contentId: media?.id || '',
        contentType: 'video',
        duration: media?.duration || 0,
        enabled: !!media?.id,
        title: media?.title || '',
        thumbnail: media?.thumbnail || '',
        shortToken: media?.short_token || '',
    });

    const {data: recData} = useMediaList({
        page_size: 30,
        status: 'active'
    });

    // 推荐视频过滤：过滤当前视频 + 已播放视频（避免A->B->A循环）
    // 当所有推荐视频都已播放时，重置历史记录
    const recommendations = React.useMemo(() => {
        const allItems = recData?.items || [];
        const watchedHistory = getWatchedHistory();
        let filtered = allItems.filter((m: Media) =>
            m.short_token !== shortToken && !watchedHistory.includes(m.short_token || '')
        );
        // 如果所有推荐都已播放，重置历史并重新过滤
        if (filtered.length === 0 && allItems.length > 0) {
            clearWatchedHistory();
            filtered = allItems.filter((m: Media) => m.short_token !== shortToken);
        }
        return filtered;
    }, [recData, shortToken]);
    const loading = isMediaLoading;
    const error = mediaError ? t('watch.failedToLoad') : null;

    const {data: adPlacements = []} = usePublicAdPlacements();
    const sidebarAds = React.useMemo<Array<Ad | AdCreative>>(() => {
        const p = adPlacements.find(x => x.slug === 'watch-sidebar');
        const items = [...(p?.ads || []), ...(p?.creatives || [])] as Array<Ad | AdCreative>;
        if (!items || items.length === 0) return [];

        // Session storage 防抖：10 分钟内保持同一决策，避免连续刷新一会儿有一会儿无
        let decision: {shown: boolean; adId?: string; decidedAt: number} | null = null;
        try {
            const raw = sessionStorage.getItem(SIDEBAR_AD_DECISION_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as {shown: boolean; adId?: string; decidedAt: number};
                if (Date.now() - parsed.decidedAt < SIDEBAR_AD_DECISION_TTL_MS) {
                    decision = parsed;
                }
            }
        } catch {}

        // 如果已有有效决策且 adId 仍然存在，则直接用该决策
        if (decision) {
            if (!decision.shown) return [];
            if (decision.adId) {
                const found = items.find(a => String(a.id) === String(decision.adId));
                if (found) return [found];
            }
        }

        // 首次决策：概率过滤
        const shouldShow = Math.random() < SIDEBAR_AD_SHOW_PROBABILITY;
        if (!shouldShow) {
            try { sessionStorage.setItem(SIDEBAR_AD_DECISION_KEY, JSON.stringify({shown: false, decidedAt: Date.now()})); } catch {}
            return [];
        }

        // 随机选 1 条（替代固定 sidebarAds[0]）
        const chosen = items[Math.floor(Math.random() * items.length)];
        try {
            sessionStorage.setItem(SIDEBAR_AD_DECISION_KEY, JSON.stringify({
                shown: true, adId: String(chosen.id), decidedAt: Date.now(),
            }));
        } catch {}
        return [chosen];
    }, [adPlacements]);

    // Next video for YouTube-style autoplay countdown
    const nextVideo: NextVideoInfo | null = recommendations.length > 0 ? {
        title: recommendations[0].title,
        thumbnail: recommendations[0].thumbnail || recommendations[0].poster || '',
        channelName: recommendations[0].edges?.user?.[0]?.nickname || recommendations[0].edges?.user?.[0]?.username,
        duration: recommendations[0].duration,
    } : null;

    // Handle media deletion
    const handleDeleteMedia = async () => {
        if (!media) return;

        try {
            // 使用 media.id 删除（Admin API 需要 ID）
            await deleteMutation.mutateAsync(media.id);
            window.location.href = '/';
        } catch (err) {
            console.error('Failed to delete media:', err);
        }
    };

    // Retry transcoding handler
    const handleRetry = async () => {
        if (!media || retrying) return;
        setRetrying(true);
        try {
            // 使用 encodingApi 的 admin 路径重试所有失败任务
            // mediaApi.encoding.retry 使用了不存在的 public 路径，且 :taskId 未替换
            await encodingApi.retryAllFailed(media.id);
            setTimeout(() => window.location.reload(), 1000);
        } catch {
        } finally {
            setRetrying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
                <div className="flex-1 space-y-4">
                    <Skeleton className="aspect-video w-full rounded-card"/>
                    <Skeleton className="h-8 w-3/4"/>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-12 w-12 rounded-full"/>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24"/>
                                <Skeleton className="h-3 w-16"/>
                            </div>
                        </div>
                        <Skeleton className="h-10 w-32 rounded-full"/>
                    </div>
                </div>
                <div className="lg:w-80 xl:w-96 space-y-4">
                    {Array.from({length: 5}).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="w-40 aspect-video rounded-lg shrink-0"/>
                            <div className="flex-1 space-y-2 py-1">
                                <Skeleton className="h-4 w-full"/>
                                <Skeleton className="h-3 w-2/3"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !media) {
        return <ErrorPage
            statusCode={404}
            title={error || t('watch.videoNotFound')}
            message={t('error.404Message')}
        />;
    }

    const mediaUser = media.edges?.user?.[0];
    const isProcessing = media.encoding_status !== 'success';

    return (
        <div className="flex flex-col lg:flex-row gap-6 relative w-full max-w-screen-2xl mx-auto">
            {/* Main Content: Player & Details */}
            <div className="flex-1 min-w-0">
                {/* Player Container with new YouTube-style VideoPlayer */}
                <div className="relative w-full">
                    <VideoPlayer
                        ref={videoPlayerRef}
                        src={media.url || ''}
                        hlsSrc={media.hls_file}
                        isProcessing={isProcessing}
                        poster={media.poster || media.thumbnail}
                        spriteVttUrl={media.type === 'video' && media.sprite_status === 'success' && media.vtt_path ? getFullUrl(media.vtt_path) : undefined}
                        enableSpritePreview={true}
                        onTimeUpdate={handleProgressTimeUpdate}
                        onPause={handleProgressPause}
                        onEnded={handleProgressEnded}
                        onPlay={() => {
                            if (!viewCountedRef.current && media.short_token) {
                                viewCountedRef.current = true;
                                publicMediaApi.incrementViewCount(media.short_token).catch(() => {});
                            }
                            markAsWatched();
                        }}
                        onError={(error) => {
                            console.error('Video player error:', error);
                        }}
                        onAutoPlayNext={() => {
                            if (recommendations.length > 0) {
                                const nextVideoItem = recommendations[0];
                                navigate({to: '/watch', search: {v: nextVideoItem.short_token, autoplay: '1'}});
                            }
                        }}
                        autoPlay={urlAutoPlay === '1'}
                        autoPlayNext={autoPlayNext}
                        nextVideo={nextVideo}
                    />
                    
                    {/* Encoding Status Indicator */}
                    {isProcessing && (
                        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                className="gap-1 bg-black/60 text-white border-white/20 backdrop-blur-md text-[10px] px-1.5 py-0 h-5 whitespace-nowrap"
                            >
                                {media.encoding_status === 'processing' ? (
                                    <><Loader2 size={9}
                                               className="animate-spin"/>{t('watch.transcoding')}</>
                                ) : media.encoding_status === 'failed' ? (
                                    <><AlertTriangle size={9}/>{t('watch.failed')}</>
                                ) : media.encoding_status === 'pending' ? (
                                    <><Eye size={9}/>{t('watch.optimizing')}</>
                                ) : (
                                    <><Eye size={9}/>{t('watch.partial')}</>
                                )}
                            </Badge>

                            {/* Retry button for failed status */}
                            {media.encoding_status === 'failed' && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1 bg-black/60 hover:bg-red-600/80 text-white border-white/20 backdrop-blur-md text-[10px] px-1.5 h-5"
                                    onClick={handleRetry}
                                    disabled={retrying}
                                >
                                    <RefreshCw size={9} className={retrying ? 'animate-spin' : ''}/>
                                    {retrying ? 'Retrying...' : 'Retry'}
                                </Button>
                            )}

                            {media.encoding_status !== 'success' && media.url && (
                                <Badge
                                    variant="outline"
                                    className="gap-1 bg-black/60 text-yellow-300 border-yellow-500/30 backdrop-blur-md text-[10px] px-1.5 py-0 h-5"
                                >
                                    {media.url.toLowerCase().match(/\.(mp4|webm|ogg|ogv|mov)$/) ? 'Original Preview' : 'Original (Unsupported)'}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                {/* Video Info */}
                <div className="mt-6 space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground line-clamp-2">
                        <HashtagText text={media.title} />
                    </h1>

                    {(user && (String(user.id) === String(media.user_id) || isAdmin)) && (
                        <div className="flex items-center gap-2 mt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => navigate({to: '/media/$shortToken/edit', params: {shortToken: media.short_token || (shortToken as string)}} as any)}
                            >
                                <Pencil className="w-4 h-4"/>
                                {t('common.edit')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                disabled
                                onClick={() => toast.info(t('watch.subtitleComingSoon'))}
                            >
                                <FileText className="w-4 h-4"/>
                                {t('common.subtitles')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-destructive hover:text-destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <Trash2 className="w-4 h-4"/>
                                {t('common.delete')}
                            </Button>
                        </div>
                    )}

                    <div
                        className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-border">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                {mediaUser ? (
                                    <Link to={`/@${mediaUser.username}` as any}>
                                        <Avatar className="h-12 w-12 ring-2 ring-border">
                                            <AvatarImage src={getImageUrl(mediaUser.avatar, 'avatar')} loading="lazy"
                                                         onError={(e) => handleImageError(e, 'avatar')}/>
                                            <AvatarFallback>{mediaUser.username?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                ) : (
                                    <Avatar className="h-12 w-12 ring-2 ring-border">
                                        <AvatarFallback>?</AvatarFallback>
                                    </Avatar>
                                )}
                                <div>
                                    {mediaUser ? (
                                        <>
                                            <Link to={`/@${mediaUser.username}` as any}
                                                  className="font-bold text-foreground hover:text-info transition-colors">
                                                {mediaUser.nickname || mediaUser.username}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">{formatViews(mediaUser.subscriber_count || 0)} {t('common.subscribers')}</p>
                                        </>
                                    ) : (
                                        <span className="font-bold text-muted-foreground">{t('watch.deletedUser')}</span>
                                    )}
                                </div>
                                <SubscribeButton
                                    channelId={media.channel_id || ''}
                                    className="ml-4 rounded-full"
                                />
                            </div>
                        </div>

                        <div className="flex items-center">
                            <InteractionBar
                                mediaId={String(media.id)}
                                shortToken={media.short_token || (shortToken as string)}
                                commentCount={media.comment_count}
                                isOwner={user != null && String(user.id) === String(media.user_id)}
                                onCommentClick={() => {
                                    commentSectionRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
                                }}
                            />
                        </div>
                    </div>

                    {/* Meta & Description */}
                    <Card
                        className="bg-muted/50 border border-border/40 shadow-none rounded-xl overflow-hidden mt-4">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
                                <span>{formatViews(media.view_count)} {t('watch.views')}</span>
                                <span className="text-muted-foreground/60">•</span>
                                <span>{formatDate(media.create_time)}</span>
                                {(() => {
                                    // 双保险：1) 后端返回的 media.tags; 2) 从标题/描述文本解析 #hashtag 并合并去重（与 Search.tsx 一致）
                                    const merged = mergeTagsWithHashtags(media.tags || [], media.title || '', media.description);
                                    return merged.map(tag => (
                                        <Link
                                            key={tag}
                                            to="/search"
                                            search={{tag: tag}}
                                            className="text-xs px-1.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                            style={{color: colorFromName(tag), backgroundColor: colorFromName(tag) + '15'}}
                                        >#{tag}</Link>
                                    ));
                                })()}
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                <HashtagText text={media.description || t('watch.noDescription')} />
                            </p>
                        </CardContent>
                    </Card>

                    {/* Comments Section */}
                    <div className="mt-8" ref={commentSectionRef}>
                        <CommentSection mediaId={String(media.id)}/>
                    </div>
                </div>
            </div>

            {/* Sidebar: Recommendations */}
            <div className="lg:w-72 xl:w-96 shrink-0 space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-foreground">
                        {t('watch.nextVideos')}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t('watch.autoplayNext', '自动播放')}</span>
                        <Switch
                            checked={autoPlayNext}
                            onCheckedChange={setAutoPlayNext}
                            aria-label="Toggle auto-play next"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {sidebarAds.length > 0 && (
                        <AdDisplay key={sidebarAds[0].id} ad={sidebarAds[0]} variant="sidebar"/>
                    )}
                    {recommendations.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 italic">{t('watch.noRecommendations')}</p>
                    ) : (
                        recommendations.map((item: Media) => {
                            const recUser = item.edges?.user?.[0];
                            const recThumb = getImageUrl(item.thumbnail, 'thumbnail');

                            return (
                                <Link
                                    key={item.id}
                                    to="/watch"
                                    search={{v: item.short_token, autoplay: undefined}}
                                    className="flex gap-3 group"
                                >
                                    <div className="relative w-36 aspect-video rounded-lg overflow-hidden shrink-0">
                                        <img
                                            src={recThumb}
                                            alt={item.title}
                                            loading="lazy"
                                            onError={(e) => handleImageError(e, 'thumbnail')}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div
                                            className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                                            {formatDuration(item.duration)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-info transition-colors">
                                            {item.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-1">{recUser?.nickname || recUser?.username || 'Unknown'}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{formatViews(item.view_count)} views</span>
                                            <span>·</span>
                                            <span>{formatDate(item.create_time)}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            <DeleteConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title={media.title}
                isDeleting={deleteMutation.isPending}
                onConfirm={handleDeleteMedia}
            />
        </div>
    );
};

export default WatchPage;
