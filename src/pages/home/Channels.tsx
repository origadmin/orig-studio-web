import React, {useState, useEffect} from 'react';
import {Link} from '@tanstack/react-router';
import {Tv, Users, Video} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {formatViews} from '@/lib/format';
import {channelApi, type Channel} from '@/lib/api/channel';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';

const PAGE_SIZE = 24;

const ChannelCard: React.FC<{channel: Channel}> = ({channel}) => {
    const displayName = channel.name || channel.title || 'Channel';
    const channelId = channel.short_token || channel.id;
    return (
        <Link
            to={channel.short_token ? "/c/$id" : "/u/$id"}
            params={{id: String(channelId)}}
            className="group flex flex-col items-center p-5 bg-card border border-border rounded-xl hover:shadow-md transition-all hover:-translate-y-0.5"
        >
            <Avatar className="w-24 h-24 mb-3 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                <AvatarImage
                    src={getImageUrl(channel.avatar, 'avatar')}
                    loading="lazy"
                    onError={(e) => handleImageError(e, 'avatar')}
                />
                <AvatarFallback className="text-2xl">
                    {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <h3 className="font-medium text-foreground text-sm text-center line-clamp-1 group-hover:text-primary transition-colors">
                {displayName}
            </h3>
            {channel.description && (
                <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                    {channel.description}
                </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Users size={12}/>
                    {formatViews(channel.subscriber_count ?? 0)}
                </span>
                <span className="flex items-center gap-1">
                    <Video size={12}/>
                    {channel.media_count ?? 0}
                </span>
            </div>
        </Link>
    );
};

const ChannelsPage = () => {
    const {t} = useTranslation();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await channelApi.getAll({
                    page,
                    page_size: PAGE_SIZE,
                });
                const items = response?.items || [];
                if (page === 1) {
                    setChannels(items);
                } else {
                    setChannels(prev => [...prev, ...items]);
                }
                setTotal(response?.total || 0);
                setHasMore(items.length === PAGE_SIZE);
            } catch (err) {
                setError(err instanceof Error ? err.message : t('common.error'));
                console.error('Failed to fetch channels:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchChannels();
    }, [page, t]);

    if (error && channels.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <Tv size={48} className="mx-auto mb-3 opacity-30"/>
                <p>{error}</p>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                        setPage(1);
                        setError(null);
                    }}
                >
                    {t('common.retry')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Tv size={24} className="text-primary"/>
                    <h1 className="text-2xl font-bold text-foreground">{t('channels.title', 'Channels')}</h1>
                </div>
                <span className="text-sm text-muted-foreground">
                    {total} {t('channels.channels', 'channels')}
                </span>
            </div>

            {loading && channels.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                    <Spinner/>
                </div>
            ) : channels.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Tv size={48} className="mx-auto mb-3 opacity-30"/>
                    <p>{t('channels.noChannels', 'No channels found')}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {channels.map((channel) => (
                            <ChannelCard key={channel.id} channel={channel}/>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex items-center justify-center pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                onClick={() => setPage(p => p + 1)}
                            >
                                {loading ? <Spinner size="sm" className="mr-2"/> : null}
                                {t('common.loadMore', 'Load more')}
                            </Button>
                        </div>
                    )}

                    {!hasMore && channels.length > 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            — {t('common.allLoaded', 'All loaded')} —
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

export default ChannelsPage;
