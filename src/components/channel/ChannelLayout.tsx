import React, {useState, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate, Link} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {Search, ExternalLink, Globe, Link2, Users, UserPlus, Loader2} from 'lucide-react';
import type {ChannelDetail} from '@/lib/api/channel';
import type {Media} from '@/lib/api/media';
import {
    useChannelVideos,
    useSubscribe,
    useUnsubscribe,
    useUpdateNotificationSetting,
} from '@/hooks/queries';
import {mediaApi} from '@/lib/api/media';
import {subscriptionApi, type SubscriptionListResponse} from '@/lib/api/subscription';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Spinner} from '@/components/ui/spinner';
import {formatDate} from '@/lib/format';
import {PAGINATION_CONFIG} from '@/config/pagination';
import {getImageUrl} from '@/lib/imageUtils';
import ChannelHeader from './ChannelHeader';
import ChannelNav from './ChannelNav';
import VideoCard from './widgets/VideoCard';
import EmptyState from './widgets/EmptyState';

interface ChannelLayoutProps {
    channel: ChannelDetail;
    isOwner: boolean;
    isFromMeChannel?: boolean;
    isSubscribed?: boolean;
    subscriptionLoading?: boolean;
}

const ChannelLayout: React.FC<ChannelLayoutProps> = ({
    channel,
    isOwner,
    isFromMeChannel = false,
    isSubscribed = false,
    subscriptionLoading = false,
}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [subscriberCount, setSubscriberCount] = useState(channel.subscriber_count || 0);
    const [subscribed, setSubscribed] = useState(isSubscribed);
    const [contentEmpty, setContentEmpty] = useState(false);

    const subscribeMutation = useSubscribe();
    const unsubscribeMutation = useUnsubscribe();
    const notificationMutation = useUpdateNotificationSetting();

    const channelToken = channel.short_token || channel.id;

    // The videos query lives HERE (always mounted), so switching tabs never drops
    // the data or depends on React Query cache timing. VideosTabContent only renders it.
    const [videosSort, setVideosSort] = useState('newest');
    const [videosKeyword, setVideosKeyword] = useState('');
    const [videosPage, setVideosPage] = useState(1);
    const videosPageSize = 12;
    const {data: videosQueryData, isLoading: videosLoading, isFetching: videosFetching} = useChannelVideos(
        channelToken,
        {
            sort: videosSort,
            keyword: videosKeyword || undefined,
            page: videosPage,
            page_size: videosPageSize,
        }
    );
    const handleVideosSortChange = useCallback((s: string) => {
        setVideosSort(s);
        setVideosPage(1);
    }, []);
    const handleVideosSearchChange = useCallback((kw: string) => {
        setVideosKeyword(kw);
        setVideosPage(1);
    }, []);
    const handleVideosPageChange = useCallback((p: number) => {
        setVideosPage(p);
    }, []);

    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab);
        setContentEmpty(false);
    }, []);

    const handleContentEmptyChange = useCallback((empty: boolean) => {
        setContentEmpty(empty);
    }, []);

    const handleSubscribe = () => {
        if (!channelToken) return;
        setSubscribed(true);
        setSubscriberCount((prev) => prev + 1);
        subscribeMutation.mutate(channelToken, {
            onError: () => {
                setSubscribed(false);
                setSubscriberCount((prev) => Math.max(0, prev - 1));
            },
        });
    };

    const handleUnsubscribe = async () => {
        if (!channelToken) return;
        setSubscribed(false);
        setSubscriberCount((prev) => Math.max(0, prev - 1));
        unsubscribeMutation.mutate(channelToken, {
            onError: () => {
                setSubscribed(true);
                setSubscriberCount((prev) => prev + 1);
            },
        });
    };

    const handleNotificationSettingChange = async (setting: string) => {
        if (!channelToken) return;
        await notificationMutation.mutateAsync({channelToken, setting});
    };

    return (
        <div className="channel-page min-h-screen bg-background">
            <div className="max-w-[1920px] mx-auto">
                <ChannelHeader
                    channel={channel}
                    isOwner={isOwner}
                    isFromMeChannel={isFromMeChannel}
                    isSubscribed={subscribed}
                    subscriberCount={subscriberCount}
                    subscribing={subscribeMutation.isPending || unsubscribeMutation.isPending}
                    onSubscribe={handleSubscribe}
                    onUnsubscribe={handleUnsubscribe}
                    onNotificationSettingChange={handleNotificationSettingChange}
                />

                <ChannelNav
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    isOwner={isOwner}
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <main className="w-full">
                        {activeTab === 'home' && (
                            <HomeTabContent
                                channelToken={channelToken}
                                channelId={channel.id}
                                isOwner={isOwner}
                                channelName={channel.name}
                                onTabChange={handleTabChange}
                                onEmptyChange={handleContentEmptyChange}
                            />
                        )}
                        {activeTab === 'videos' && (
                            <VideosTabContent
                                isOwner={isOwner}
                                videosData={videosQueryData}
                                isLoading={videosLoading}
                                isFetching={videosFetching}
                                sortBy={videosSort}
                                onSortChange={handleVideosSortChange}
                                searchKeyword={videosKeyword}
                                onSearchChange={handleVideosSearchChange}
                                page={videosPage}
                                onPageChange={handleVideosPageChange}
                                onEmptyChange={handleContentEmptyChange}
                            />
                        )}
                        {activeTab === 'community' && (
                            <CommunityTabContent
                                channelId={channel.id}
                                isOwner={isOwner}
                                channelName={channel.name}
                                onEmptyChange={handleContentEmptyChange}
                            />
                        )}
                        {activeTab === 'subscriptions' && isOwner && (
                            <SubscriptionsTabContent
                                onEmptyChange={handleContentEmptyChange}
                            />
                        )}
                        {activeTab === 'about' && (
                            <AboutTabContent
                                channel={channel}
                                isOwner={isOwner}
                                subscriberCount={subscriberCount}
                                onEmptyChange={handleContentEmptyChange}
                            />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

// ================================
// Home Tab - Shows featured + latest videos from API
// ================================
const HomeTabContent: React.FC<{
    channelToken?: string;
    channelId?: string;
    isOwner: boolean;
    channelName?: string;
    onTabChange: (tab: string) => void;
    onEmptyChange?: (empty: boolean) => void;
}> = ({channelToken, channelId, isOwner, channelName, onTabChange, onEmptyChange}) => {
    const {t} = useTranslation();

    const {data: videosData, isLoading} = useChannelVideos(channelToken || null, {
        sort: 'newest',
        page_size: 8,
    });

    const videos = videosData?.items || [];

    React.useEffect(() => {
        if (!isLoading) {
            onEmptyChange?.(videos.length === 0);
        }
    }, [isLoading, videos.length, onEmptyChange]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="aspect-video bg-muted rounded-lg"/>
                            <div className="mt-2 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4"/>
                                <div className="h-3 bg-muted rounded w-1/2"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (videos.length === 0) {
        return <EmptyState type="home" isOwner={isOwner}/>;
    }

    return (
        <div className="space-y-8">
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span>{t('home.latestVideos')}</span>
                    </h2>
                    <button
                        onClick={() => onTabChange('videos')}
                        className="text-sm text-primary hover:underline font-medium"
                    >
                        {t('home.viewAll')}
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                    {videos.map((video) => (
                        <VideoCard
                            key={video.id}
                            video={mapMediaToVideo(video)}
                            showChannelInfo={false}
                            isOwner={isOwner}
                            showProgress
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};

// ================================
// Videos Tab - Full video list with sort and search
// ================================
const VideosTabContent: React.FC<{
    isOwner: boolean;
    videosData?: {items?: any[]; total?: number};
    isLoading: boolean;
    isFetching: boolean;
    sortBy: string;
    onSortChange: (s: string) => void;
    searchKeyword: string;
    onSearchChange: (s: string) => void;
    page: number;
    onPageChange: (p: number) => void;
    onEmptyChange?: (empty: boolean) => void;
}> = ({isOwner, videosData, isLoading, isFetching, sortBy, onSortChange, searchKeyword, onSearchChange, page, onPageChange, onEmptyChange}) => {
    const {t} = useTranslation();
    const [allVideos, setAllVideos] = useState<any[]>([]);

    // The real query lives in ChannelLayout (always mounted), so `videosData` is
    // always available here — switching tabs can never drop it. `allVideos` is only
    // an accumulation buffer for "load more" paging.
    const items = videosData?.items || [];

    React.useEffect(() => {
        if (!items.length) return;
        setAllVideos((prev: any[]) => {
            if (page === 1) return items;
            const known = new Set(prev.map((v: any) => v.id));
            return [...prev, ...items.filter((v: any) => !known.has(v.id))];
        });
    }, [videosData, page]);

    const videos = allVideos.length > 0 ? allVideos : items;
    const total = videosData?.total || 0;
    const hasMore = videos.length < total;

    React.useEffect(() => {
        if (!isLoading) {
            onEmptyChange?.(videos.length === 0 && !searchKeyword);
        }
    }, [isLoading, videos.length, searchKeyword, onEmptyChange]);

    const sortOptions = [
        {value: 'newest', label: t('channel.sortNewest')},
        {value: 'popular', label: t('channel.sortPopular')},
        {value: 'oldest', label: t('channel.sortOldest')},
    ];

    const handleLoadMore = () => {
        onPageChange(page + 1);
    };

    if (isLoading && page === 1) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="aspect-video bg-muted rounded-lg"/>
                            <div className="mt-2 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4"/>
                                <div className="h-3 bg-muted rounded w-1/2"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Don't show empty state while refetching (isFetching) either — avoids flash of "no videos"
    if (videos.length === 0 && !searchKeyword && !isLoading && !isFetching) {
        return <EmptyState type="videos" isOwner={isOwner}/>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">
                    {t('channel.allVideos')} ({total})
                </h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <Input
                            placeholder={t('channel.searchVideos')}
                            value={searchKeyword}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9 h-9 w-48 sm:w-64"
                        />
                    </div>
                    <Select value={sortBy} onValueChange={onSortChange}>
                        <SelectTrigger className="w-[160px] h-9">
                            <SelectValue placeholder={t('channel.sortBy')}/>
                        </SelectTrigger>
                        <SelectContent>
                            {sortOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {videos.length === 0 && searchKeyword ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                    <p>{t('channel.noSearchResults')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                    {videos.map((video) => (
                        <VideoCard
                            key={video.id}
                            video={mapMediaToVideo(video)}
                            showChannelInfo={false}
                            isOwner={isOwner}
                            showProgress
                            onEdit={(id) => console.log('Edit video:', id)}
                            onViewStats={(id) => console.log('View stats:', id)}
                        />
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" className="mr-2"/> : null}
                        {t('channel.loadMore')}
                    </Button>
                </div>
            )}
        </div>
    );
};

// ================================
// Community Tab - Placeholder for future implementation
// ================================
const CommunityTabContent: React.FC<{
    channelId?: string;
    isOwner: boolean;
    channelName?: string;
    onEmptyChange?: (empty: boolean) => void;
}> = ({channelId, isOwner, channelName, onEmptyChange}) => {
    const {t} = useTranslation();

    React.useEffect(() => {
        onEmptyChange?.(true);
    }, [onEmptyChange]);

    return (
        <div className="space-y-4">
            <EmptyState type="community" isOwner={isOwner}/>
        </div>
    );
};

// ================================
// About Tab - Channel description, stats, links, tags
// ================================
const AboutTabContent: React.FC<{
    channel: ChannelDetail;
    isOwner: boolean;
    subscriberCount?: number;
    onEmptyChange?: (empty: boolean) => void;
}> = ({channel, isOwner, subscriberCount = 0, onEmptyChange}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const hasContent = !!(channel.description || channel.links?.length || channel.tags?.length);

    React.useEffect(() => {
        onEmptyChange?.(!hasContent);
    }, [hasContent, onEmptyChange]);

    const formatCount = (num: number): string => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const stats = [
        {label: t('channel.subscribers'), value: formatCount(subscriberCount), icon: '👥'},
        {label: t('channel.videoCount'), value: String(channel.media_count || 0), icon: '🎬'},
        {label: t('channel.views'), value: formatCount(channel.total_views || 0), icon: '👁️'},
        {label: t('channel.joinDate'), value: channel.create_time ? new Date(channel.create_time).toLocaleDateString() : t('channel.notAvailable'), icon: '📅'},
    ];

    const links = channel.links || [];
    const tags = channel.tags || [];

    const getLinkIcon = (type: string, platform?: string) => {
        switch (platform?.toLowerCase() || type) {
            case 'website':
                return <Globe className="w-5 h-5"/>;
            default:
                return <Link2 className="w-5 h-5"/>;
        }
    };

    return (
        <div className="space-y-8">
            <section>
                <h2 className="text-lg font-semibold mb-4">{t('channel.description')}</h2>
                <div className="p-4 sm:p-6 bg-card rounded-lg border">
                    {channel.description ? (
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                            {channel.description}
                        </p>
                    ) : (
                        <p className="text-muted-foreground/60 italic">
                            {t('channel.noDescription')}
                        </p>
                    )}
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold mb-4">{t('channel.stats')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className="p-4 bg-card rounded-lg border text-center hover:border-primary/30 transition-colors"
                        >
                            <p className="text-2xl mb-1">{stat.icon}</p>
                            <p className="text-xl sm:text-2xl font-bold text-foreground">
                                {stat.value}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {links.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">{t('channel.links')}</h2>
                    <div className="space-y-2">
                        {links.map((link, idx) => (
                            <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent hover:border-primary/30 transition-all group"
                            >
                                <span className="w-8 h-8 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                    {getLinkIcon(link.type, link.platform)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                                        {link.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {link.url}
                                    </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity"/>
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {tags.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">{t('channel.tags')}</h2>
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-default"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <section className="p-4 bg-card rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground text-center">
                    {t('channel.channelId')}: <code className="bg-background px-2 py-0.5 rounded text-xs">{channel.id}</code>
                </p>
            </section>
        </div>
    );
};

// ================================
// Subscriptions Tab - Shows subscribed channels (owner only)
// ================================
const SubscriptionsTabContent: React.FC<{
    onEmptyChange?: (empty: boolean) => void;
}> = ({onEmptyChange}) => {
    const {t} = useTranslation();
    const [subscriptions, setSubscriptions] = useState<SubscriptionListResponse['items']>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchData = async (pageNum: number) => {
        try {
            setLoading(true);
            setError(null);
            const response = await subscriptionApi.getSubscriptions({page: pageNum, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});
            setSubscriptions(prev => pageNum === 1 ? response.items : [...prev, ...response.items]);
            setHasMore(response.items.length === PAGINATION_CONFIG.DEFAULT_PAGE_SIZE);
        } catch (err) {
            setError('Failed to fetch data');
            console.error('Failed to fetch subscription data:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData(1);
    }, []);

    React.useEffect(() => {
        if (!loading) {
            onEmptyChange?.(subscriptions.length === 0);
        }
    }, [loading, subscriptions, onEmptyChange]);

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchData(nextPage);
        }
    };

    if (loading && page === 1) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>{error}</p>
                <Button variant="outline" className="mt-4" onClick={() => fetchData(1)}>
                    {t('common.retry')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Users size={24} className="text-emerald-600"/>
                <h2 className="text-lg font-semibold">{t('subscriptions.title')}</h2>
            </div>

            {subscriptions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Users size={48} className="mx-auto mb-3 opacity-30"/>
                    <p>{t('subscriptions.noSubscriptions')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {subscriptions.map((user) => {
                        const displayName = user.name || user.username;
                        return (
                        <div key={user.id}
                             className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <Link to={user.short_token ? '/c/$id' : '/$handle'} params={user.short_token ? {id: user.short_token} : {handle: `@${user.username}`}} className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-12 w-12 flex-shrink-0">
                                    <AvatarImage src={user.avatar}/>
                                    <AvatarFallback>{displayName?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                                    <p className="text-xs text-gray-500 dark:text-muted-foreground">
                                        {t('subscriptions.subscribedAt', {date: formatDate(user.subscribed_at)})}
                                    </p>
                                </div>
                            </Link>
                            <Button variant="outline" className="rounded-full">
                                <UserPlus className="w-4 h-4 mr-2"/>
                                {t('common.subscribed')}
                            </Button>
                        </div>
                        );
                    })}
                    {hasMore && (
                        <div className="flex justify-center mt-8">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    t('common.loading')
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ================================
// Utility: Map Media API type to VideoCard-compatible type
// ================================
function mapMediaToVideo(media: any): {
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
} {
    // Proto JSON uses snake_case: user is direct field (not edges.user array)
    const userData = media.user || media.User;
    return {
        id: media.id,
        short_token: media.short_token,
        title: media.title || media.filename || media.id,
        thumbnail: getImageUrl(media.thumbnail || media.poster, 'thumbnail'),
        duration: typeof media.duration === 'string' ? parseInt(media.duration, 10) : media.duration,
        view_count: typeof media.view_count === 'string' ? parseInt(media.view_count, 10) : media.view_count,
        published_at: media.published_at || media.publishedAt,
        create_time: media.create_time || media.createTime,
        progress: 0,
        user: userData ? {
            id: userData.id,
            username: userData.username,
            nickname: userData.nickname || userData.username,
            avatar: getImageUrl(userData.avatar || userData.logo, 'avatar'),
        } : undefined,
    };
}

export default ChannelLayout;
