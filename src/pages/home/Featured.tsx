import React, {useMemo} from 'react';
import {Link, useSearch} from '@tanstack/react-router';
import {Play, Eye, Clock, Flame, Star} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Skeleton} from '@/components/ui/skeleton';
import {Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia} from '@/components/ui/empty';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useTranslation} from 'react-i18next';
import {useMediaList} from '@/hooks/queries';
import ErrorPage from '@/components/common/ErrorPage';
import HeroBanner, {type HeroBannerItem} from '@/components/common/HeroBanner';
import HorizontalScroll from '@/components/common/HorizontalScroll';

const VIDEO_CARD_WIDTH = 240;

interface FeaturedCardProps {
    item: {
        id: string;
        short_token?: string;
        title: string;
        description?: string;
        thumbnail?: string;
        poster?: string;
        category_id?: number;
        duration: number;
        view_count: number;
        create_time?: string;
        user?: {
            id: string;
            username: string;
            nickname?: string;
            avatar?: string;
        };
        category?: {
            id: number;
            name: string;
        };
        edges?: {
            user?: Array<{
                id: string;
                username: string;
                nickname?: string;
                avatar?: string;
            }>;
            category?: {
                id: number;
                name: string;
            };
        };
    };
}

type FeaturedItem = FeaturedCardProps['item'];

const VideoCard: React.FC<FeaturedCardProps> = ({item}) => {
    const user = item.edges?.user?.[0] || item.user;

    return (
        <Link
            to="/watch"
            search={{v: item.short_token || item.id}}
            className="group block w-full"
        >
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <img
                    src={getImageUrl(item.thumbnail || item.poster, 'thumbnail')}
                    alt={item.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
                    {formatDuration(item.duration)}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                        <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                    </div>
                </div>
            </div>
            <div className="pt-2.5">
                <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors leading-snug">
                    {item.title || item.short_token || ''}
                </h3>
                <div className="flex items-center gap-1.5 mb-1">
                    <img
                        src={getImageUrl(user?.avatar, 'avatar')}
                        alt={user?.username}
                        onError={(e) => handleImageError(e, 'avatar')}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                    <span className="text-xs text-muted-foreground truncate">
                        {user?.nickname || user?.username || 'Unknown'}
                    </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                        <Eye size={12}/>{formatViews(item.view_count)}
                    </span>
                    {item.create_time && (
                        <span>{formatDate(item.create_time)}</span>
                    )}
                </div>
            </div>
        </Link>
    );
};

const FeaturedPage = () => {
    const {t, i18n} = useTranslation();
    const search = useSearch({strict: false}) as {category_id?: number};
    const activeCategoryId = search.category_id;

    const {data, isLoading, error} = useMediaList({
        featured: 'true',
        page_size: 30,
        status: 'active',
        category_id: activeCategoryId || undefined,
    });

    const featuredMedia: FeaturedItem[] = (data?.items as FeaturedItem[]) || [];

    const heroItems = useMemo<HeroBannerItem[]>(() => {
        const lang = i18n.language;
        const items: HeroBannerItem[] = [];
        for (const item of featuredMedia.slice(0, 5)) {
            const user = item.edges?.user?.[0] || item.user;
            items.push({
                id: item.id,
                title: item.title || item.short_token || '',
                subtitle: t('featured.subtitle', '这是编辑团队从海量内容中为您精心挑选的高质量视频，每日更新。'),
                thumbnail: item.thumbnail || item.poster || '',
                bgGradient: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)',
                shortToken: item.short_token || undefined,
                badge: '精选',
                duration: item.duration,
                viewCount: item.view_count,
                createTime: item.create_time,
                user: user ? {
                    name: user.nickname || user.username || '',
                    avatar: user.avatar,
                } : undefined,
            });
        }
        return items;
    }, [featuredMedia, i18n.language, t]);

    const cardOffset = useMemo(() => {
        const thumbHeight = VIDEO_CARD_WIDTH * 9 / 16;
        return thumbHeight / 2;
    }, []);

    if (isLoading) {
        return <FeaturedPageSkeleton/>;
    }

    if (error) {
        return <ErrorPage message={error.message || t('common.noData')}/>;
    }

    if (featuredMedia.length === 0) {
        return (
            <div className="max-w-[1800px] mx-auto w-full px-4 md:px-6 lg:px-8 py-12">
                <Empty className="py-20">
                    <EmptyMedia variant="icon">
                        <Star size={24}/>
                    </EmptyMedia>
                    <EmptyHeader>
                        <EmptyTitle>{t('featured.emptyTitle')}</EmptyTitle>
                        <EmptyDescription>{t('featured.emptyDesc')}</EmptyDescription>
                    </EmptyHeader>
                    <Link to="/">
                        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4">
                            {t('error.backToHome')}
                        </button>
                    </Link>
                </Empty>
            </div>
        );
    }

    return (
        <div className="w-full">
            {heroItems.length > 0 && (
                <section className="mb-8 max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8">
                    <HeroBanner items={heroItems} mode="wide" autoPlayInterval={5000}/>
                </section>
            )}

            <div className="max-w-[1800px] mx-auto w-full px-4 md:px-6 lg:px-8 space-y-8">
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Flame className="w-5 h-5 text-orange-500" fill="currentColor"/>
                        <h2 className="text-lg font-bold text-foreground">{t('featured.title', '精选视频')}</h2>
                        <Badge variant="secondary">{featuredMedia.length}</Badge>
                    </div>
                    <HorizontalScroll buttonOffset={cardOffset}>
                        {featuredMedia.map((item) => (
                            <div key={item.id} style={{width: VIDEO_CARD_WIDTH}}>
                                <VideoCard item={item}/>
                            </div>
                        ))}
                    </HorizontalScroll>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-lg font-bold text-foreground">{t('featured.allFeatured', '全部精选')}</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                        {featuredMedia.map((item) => (
                            <VideoCard key={item.id} item={item}/>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

const FeaturedPageSkeleton: React.FC = () => (
    <div className="w-full">
        <section className="mb-8 max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8">
            <div className="aspect-[21/9] rounded-2xl bg-muted/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20"/>
                <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
                    <Skeleton className="h-6 w-24 rounded-full"/>
                    <Skeleton className="h-10 w-3/4 rounded"/>
                    <Skeleton className="h-4 w-1/2 rounded"/>
                    <div className="flex items-center gap-4 pt-2">
                        <Skeleton className="h-10 w-10 rounded-full"/>
                        <Skeleton className="h-5 w-32 rounded"/>
                        <Skeleton className="h-4 w-24 rounded"/>
                    </div>
                </div>
            </div>
        </section>

        <div className="max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8 space-y-8">
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-5 w-5 rounded-full"/>
                    <Skeleton className="h-6 w-32"/>
                    <Skeleton className="h-5 w-10 rounded-full"/>
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {Array.from({length: 6}).map((_, i) => (
                        <div key={i} style={{width: VIDEO_CARD_WIDTH}} className="flex-shrink-0">
                            <Skeleton className="aspect-video rounded-lg"/>
                            <div className="pt-3 space-y-2">
                                <Skeleton className="h-4 w-full"/>
                                <Skeleton className="h-4 w-3/4"/>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-6 w-6 rounded-full"/>
                                    <Skeleton className="h-3 w-24"/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-6 w-32"/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                    {Array.from({length: 12}).map((_, i) => (
                        <div key={i}>
                            <Skeleton className="aspect-video rounded-lg"/>
                            <div className="pt-3 space-y-2">
                                <Skeleton className="h-4 w-full"/>
                                <Skeleton className="h-4 w-3/4"/>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-6 w-6 rounded-full"/>
                                    <Skeleton className="h-3 w-24"/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    </div>
);

export default FeaturedPage;