/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 视频播放页 - 对接真实数据
 */

import React, {useState, useEffect, useRef} from 'react';
import {useSearch, useNavigate, Link} from '@tanstack/react-router';
import {
    Loader2, RefreshCw, AlertTriangle, Trash2, FileText, Eye, Pencil, Play
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
import {channelApi} from '@/lib/api/channel';
import {subtitleApi} from '@/lib/api/subtitle';
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
import {generateSlug} from '@/lib/utils/slug';
import {useWatchProgress} from '@/hooks/useWatchProgress';
import {usePublicAdPlacements} from '@/hooks/queries';
import AdDisplay from '@/components/portal/AdDisplay';
import {toast} from 'sonner';
import type {Ad, AdCreative} from '@/lib/api/portal';

const WATCHED_HISTORY_KEY = 'watch_autoplay_history';
const WATCHED_HISTORY_LIMIT = 20;
const SIDEBAR_AD_SHOW_PROBABILITY = 0.7;                     // 阶段1：每视频独立 70% 显示概率；前端内存态决策，刷新/卸载即重摇（BUG-172/BUG-187）

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

// Recommendation video card with proper image placeholder
const RecommendationVideoCard: React.FC<{item: Media; recUser?: any}> = ({item, recUser}) => {
    const [imgError, setImgError] = useState(false);
    const imageUrl = getImageUrl(item.thumbnail || item.poster, 'thumbnail');
    const hasImage = !!(item.thumbnail || item.poster) && !imgError;

    return (
        <Link
            to="/watch"
            search={{v: item.short_token, autoplay: undefined}}
            className="flex gap-3 group"
            data-testid="rec-card"
        >
            <div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                {hasImage ? (
                    <img
                        src={imageUrl}
                        alt={item.title}
                        loading="lazy"
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-slate-500/10 dark:bg-slate-400/10 flex items-center justify-center">
                                <Play className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-0.5" fill="currentColor"/>
                            </div>
                        </div>
                    </div>
                )}
                <div
                    className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                    {formatDuration(item.duration)}
                </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-start">
                <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-info transition-colors">
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
};

const WatchPage = () => {
    const {t} = useTranslation();
    const {v: rawToken, autoplay: urlAutoPlay} = useSearch({strict: false});
    // BUG-183: coerce to string — the search serializer may hand back a number
    // for numeric-looking tokens.
    const shortToken = rawToken != null ? String(rawToken) : undefined;
    const navigate = useNavigate();
    // ✅ 使用新的 usePublicMediaDetail hook (short_token based)
    const {data: media, isLoading: isMediaLoading, error: mediaError} = usePublicMediaDetail(shortToken as string);
    const {user, isAdmin} = useAuth();
    const deleteMutation = useDeleteMedia();
    const {autoPlayNext, setAutoPlayNext} = usePlayerSettings();

    const [retrying, setRetrying] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [commentCount, setCommentCount] = useState(media?.comment_count || 0);
    const commentSectionRef = useRef<HTMLDivElement>(null);
    const viewCountedRef = useRef(false);
    const addedToHistoryRef = useRef(false);

    // BUG-185: 订阅数的实时来源是 user_subscriptions 表
    // （GET /channels/{token}/subscribers?count=true）；media.edges.user[0].subscriber_count
    // 是未维护的陈旧快照（恒 0）。null = 尚未取到，回退到快照值。
    const [liveSubscriberCount, setLiveSubscriberCount] = useState<number | null>(null);

    // BUG-186: 字幕轨（active 才进播放器选择；failed 由管理页展示）
    const [subtitleTracks, setSubtitleTracks] = useState<Array<{label: string; src: string; language: string}>>([]);
    useEffect(() => {
        if (!media?.short_token) return;
        let cancelled = false;
        subtitleApi.getByMediaId(media.short_token)
            .then((list) => {
                if (cancelled) return;
                const tracks = (list || [])
                    .filter((s) => s.status === 'active' && s.file_url)
                    .map((s) => ({
                        label: s.label || s.language,
                        src: s.file_url,
                        language: s.language,
                    }));
                setSubtitleTracks(tracks);
            })
            .catch(() => { /* 无字幕属正常 */ });
        return () => { cancelled = true; };
    }, [media?.short_token]);

    // Sync commentCount when media loads
    useEffect(() => {
        if (media?.comment_count !== undefined) {
            setCommentCount(media.comment_count);
        }
    }, [media?.comment_count]);

    // BUG-185: 频道订阅数拉取（无需登录；token 变化时重取）
    useEffect(() => {
        if (!media?.channel_id) {
            setLiveSubscriberCount(null);
            return;
        }
        let cancelled = false;
        channelApi.getSubscriberCount(media.channel_id)
            .then((r) => { if (!cancelled) setLiveSubscriberCount(r.count); })
            .catch(() => { /* 取数失败保持快照回退，不阻塞页面 */ });
        return () => { cancelled = true; };
    }, [media?.channel_id]);

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
    // 侧边栏广告：前端内存态决策（BUG-172 修复）
    // - 刷新 / 卸载组件 → ref 重置 → 重新摇（满足"按几率显示"）
    // - 组件内 re-render / query refetch → ref 不变 → 不重摇（保留原防抖意图）
    // - 切视频（shortToken 变）→ effect 重跑 → 重新摇（保留"按视频维度"意图）
    const watchSidebarItems = React.useMemo<Array<Ad | AdCreative>>(() => {
        const p = adPlacements.find(x => x.slug === 'watch-sidebar');
        return [...(p?.ads || []), ...(p?.creatives || [])] as Array<Ad | AdCreative>;
    }, [adPlacements]);

    // BUG-187: 用户主动关闭侧栏广告后，同一视频内不重显；切换视频时随决策一起复位（内存态，刷新后随 BUG-172 重新摇）
    const sidebarDismissedRef = React.useRef(false);
    const [sidebarDismissed, setSidebarDismissed] = React.useState(false);

    // BUG-187: 决策按视频维度（shortToken）记录。
    // 同视频内 re-render 不重摇（防抖动）；切换视频（shortToken 变）必须重摇，
    // 否则广告会跨视频"常驻"。ref 存 {token, decision}，token 不一致即视为新视频→重摇。
    const sidebarDecisionRef = React.useRef<{token: string; decision: {shown: boolean; adId?: string}} | null>(null);
    const [sidebarDecision, setSidebarDecision] = React.useState<{shown: boolean; adId?: string} | null>(null);
    React.useEffect(() => {
        if (!shortToken) return;
        if (sidebarDecisionRef.current && sidebarDecisionRef.current.token === shortToken) return; // 同视频已决策 → 防 re-render 抖动
        const items = watchSidebarItems;
        if (items.length === 0) return;                    // 数据未就绪：先不决策（不设 ref），等 placement 加载完成后再摇
        // 新视频：复位用户手动关闭态，让本视频按新决策重新决定是否展示
        sidebarDismissedRef.current = false;
        setSidebarDismissed(false);
        const shouldShow = Math.random() < SIDEBAR_AD_SHOW_PROBABILITY;
        if (!shouldShow) {
            sidebarDecisionRef.current = {token: shortToken, decision: {shown: false}};
            setSidebarDecision({shown: false});
            return;   // shown:false → 派生为 []
        }
        const chosen = items[Math.floor(Math.random() * items.length)];
        const decision = {shown: true, adId: String(chosen.id)};
        sidebarDecisionRef.current = {token: shortToken, decision};
        setSidebarDecision(decision);
    }, [shortToken, watchSidebarItems]);

    const sidebarAds = React.useMemo<Array<Ad | AdCreative>>(() => {
        if (!sidebarDecision?.shown || !sidebarDecision.adId) return [];
        const found = watchSidebarItems.find(a => String(a.id) === String(sidebarDecision.adId));
        return found ? [found] : [];
    }, [sidebarDecision, watchSidebarItems]);

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
    // BUG-176: 频道主视角下统一隐藏订阅按钮 + 订阅者数（避免在自有频道页面出现
    // "1 位订阅者"这种鸡肋数字。判定=频道的 user_id == 当前登录用户 id）
    const isChannelOwner = !!(user && media.channel?.user_id && String(media.channel.user_id) === String(user.id));

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
                        spriteImageUrl={media.type === 'video' && media.sprite_status === 'success' && media.sprite_path ? media.sprite_path : undefined}
                        enableSpritePreview={true}
                        subtitles={subtitleTracks}
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
                            {/* BUG-186 G5 #5: portal owner subtitle entry -> edit page subtitle manager */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => navigate({to: '/media/$shortToken/edit', params: {shortToken: media.short_token || (shortToken as string)}} as any)}
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
                                            {!isChannelOwner && (
                                                <p className="text-xs text-muted-foreground">{formatViews(liveSubscriberCount ?? (mediaUser.subscriber_count || 0))} {t('common.subscribers')}</p>
                                            )}
                                        </>
                                    ) : (
                                        <span className="font-bold text-muted-foreground">{t('watch.deletedUser')}</span>
                                    )}
                                </div>
                                {media.channel_id && !isChannelOwner ? (
                                    <SubscribeButton
                                        channelId={media.channel_id}
                                        isOwner={isChannelOwner}
                                        className="ml-4 rounded-full"
                                        // BUG-185: 订阅/退订成功后同步实时计数（以 subscriptions 表为准）
                                        onSubscriberCountChange={(delta) => setLiveSubscriberCount(prev => Math.max(0, (prev ?? 0) + delta))}
                                    />
                                ) : null}
                            </div>
                        </div>

                        <div className="flex items-center">
                            <InteractionBar
                                mediaId={String(media.id)}
                                shortToken={media.short_token || (shortToken as string)}
                                commentCount={commentCount}
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
                                    return merged.map(tag => {
                                        const slug = generateSlug(tag);
                                        return (
                                            <Link
                                                key={tag}
                                                to="/tags"
                                                search={{v: slug}}
                                                className="text-xs px-1.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                                style={{color: colorFromName(tag), backgroundColor: colorFromName(tag) + '15'}}
                                            >#{tag}</Link>
                                        );
                                    });
                                })()}
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                <HashtagText text={media.description || t('watch.noDescription')} />
                            </p>
                        </CardContent>
                    </Card>

                    {/* Comments Section */}
                    <div className="mt-8" ref={commentSectionRef}>
                        <CommentSection 
                            mediaId={String(media.id)}
                            onCommentCountChange={setCommentCount}
                        />
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
                    {!sidebarDismissed && sidebarAds.length > 0 && (
                        <AdDisplay
                            key={sidebarAds[0].id}
                            ad={sidebarAds[0]}
                            variant="sidebar"
                            onClose={() => {
                                if (sidebarDismissedRef.current) return;
                                sidebarDismissedRef.current = true;
                                setSidebarDismissed(true);
                            }}
                        />
                    )}
                    {recommendations.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 italic">{t('watch.noRecommendations')}</p>
                    ) : (
                        recommendations.map((item: Media) => {
                            const recUser = item.edges?.user?.[0];
                            return (
                                <RecommendationVideoCard key={item.id} item={item} recUser={recUser}/>
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
