import React, {useMemo, useState} from 'react';
import {Link, useSearch} from '@tanstack/react-router';
import {Play, Eye, Flame, Star, Clock, TrendingUp, Filter} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia} from '@/components/ui/empty';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useTranslation} from 'react-i18next';
import {useMediaList} from '@/hooks/queries';
import ErrorPage from '@/components/common/ErrorPage';
import HeroBanner, {type HeroBannerItem} from '@/components/common/HeroBanner';

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
type SortMode = 'latest' | 'popular';

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
    const [sortMode, setSortMode] = useState<SortMode>('latest');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(activeCategoryId || null);

    const {data, isLoading, error} = useMediaList({
        featured: 'true',
        page_size: 50,
        status: 'active',
    });

    const featuredMedia: FeaturedItem[] = (data?.items as FeaturedItem[]) || [];

    const categories = useMemo(() => {
        const catMap = new Map<number, string>();
        featuredMedia.forEach((item) => {
            const catId = item.category_id;
            const catName = item.edges?.category?.name || item.category?.name;
            if (catId && catName && !catMap.has(catId)) {
                catMap.set(catId, catName);
            }
        });
        return Array.from(catMap.entries()).map(([id, name]) => ({id, name}));
    }, [featuredMedia]);

    const filteredAndSortedMedia = useMemo(() => {
        let result = featuredMedia;
        if (selectedCategory) {
            result = result.filter(item => item.category_id === selectedCategory);
        }
        const sorted = [...result];
        if (sortMode === 'popular') {
            sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        } else {
            sorted.sort((a, b) => {
                const aTime = a.create_time ? new Date(a.create_time).getTime() : 0;
                const bTime = b.create_time ? new Date(b.create_time).getTime() : 0;
                return bTime - aTime;
            });
        }
        return sorted;
    }, [featuredMedia, selectedCategory, sortMode]);

    const heroItems = useMemo<HeroBannerItem[]>(() => {
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
    }, [featuredMedia, t]);

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

            <div className="max-w-[1800px] mx-auto w-full px-4 md:px-6 lg:px-8">
                <section>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" fill="currentColor"/>
                            <h2 className="text-lg font-bold text-foreground">{t('featured.title', '精选视频')}</h2>
                            <Badge variant="secondary">{filteredAndSortedMedia.length}</Badge>
                        </div>

                        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                            <button
                                onClick={() => setSortMode('latest')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    sortMode === 'latest'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Clock size={14}/>
                                {t('featured.sortLatest', '最新')}
                            </button>
                            <button
                                onClick={() => setSortMode('popular')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    sortMode === 'popular'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <TrendingUp size={14}/>
                                {t('featured.sortPopular', '最热')}
                            </button>
                        </div>
                    </div>

                    {categories.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                    selectedCategory === null
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                            >
                                {t('home.all', '全部')}
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                        selectedCategory === cat.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredAndSortedMedia.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground">
                            <Filter className="w-16 h-16 mx-auto mb-4 opacity-50"/>
                            <p className="text-lg">{t('featured.noResultsTitle', '暂无符合条件的内容')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                            {filteredAndSortedMedia.map((item) => (
                                <VideoCard key={item.id} item={item}/>
                            ))}
                        </div>
                    )}
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

        <div className="max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full"/>
                    <Skeleton className="h-6 w-32"/>
                    <Skeleton className="h-5 w-10 rounded-full"/>
                </div>
                <Skeleton className="h-9 w-40 rounded-lg"/>
            </div>

            <div className="flex gap-2 mb-6">
                {Array.from({length: 5}).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-full"/>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                {Array.from({length: 18}).map((_, i) => (
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
        </div>
    </div>
);

export default FeaturedPage;
