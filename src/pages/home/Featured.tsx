import React, {useMemo, useState} from 'react';
import {Link, useSearch} from '@tanstack/react-router';
import {Play, Eye, Flame, Star, Clock, TrendingUp, Filter} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia} from '@/components/ui/empty';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useTranslation} from 'react-i18next';
import {useMediaList} from '@/hooks/queries';
import ErrorPage from '@/components/common/ErrorPage';

interface FeaturedItem {
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
}

type SortMode = 'latest' | 'popular';

const LargeFeaturedCard: React.FC<{item: FeaturedItem}> = ({item}) => {
    const {t} = useTranslation();
    const user = item.edges?.user?.[0] || item.user;

    return (
        <Link
            to="/watch"
            search={{v: item.short_token || item.id}}
            className="group block"
        >
            <div className="relative aspect-[16/10] max-w-[1200px] mx-auto overflow-hidden rounded-xl bg-card border border-border/60 hover:shadow-xl transition-all duration-300">
                <img
                    src={getImageUrl(item.thumbnail || item.poster, 'thumbnail')}
                    alt={item.title}
                    loading="eager"
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
                <Badge
                    variant="secondary"
                    className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-semibold backdrop-blur-sm"
                >
                    <Star size={12} className="mr-1 fill-current"/>
                    {t('featured.badge', '精选')}
                </Badge>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white line-clamp-2 drop-shadow-lg">
                        {item.title || item.short_token || ''}
                    </h3>
                    <p className="text-sm text-white/70 line-clamp-1 mt-2">
                        {item.description || t('watch.noDescription')}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-sm text-white/80">
                        <Avatar className="h-8 w-8 border-2 border-white/30">
                            <AvatarImage
                                src={user?.avatar ? getImageUrl(user.avatar, 'avatar') : undefined}
                                alt={user?.username}
                            />
                            <AvatarFallback className="text-xs bg-white/20">
                                {user?.username?.[0] || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user?.nickname || user?.username || 'Unknown'}</span>
                        <span className="flex items-center gap-1">
                            <Eye size={14}/>
                            {formatViews(item.view_count)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={14}/>
                            {formatDate(item.create_time)}
                        </span>
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-7 h-7 text-gray-900 ml-0.5" fill="currentColor"/>
                    </div>
                </div>
            </div>
        </Link>
    );
};

const MediumFeaturedCard: React.FC<{item: FeaturedItem}> = ({item}) => {
    const {t} = useTranslation();
    const user = item.edges?.user?.[0] || item.user;

    return (
        <Link
            to="/watch"
            search={{v: item.short_token || item.id}}
            className="group block"
        >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-card border border-border/60 hover:shadow-lg transition-all duration-300">
                <img
                    src={getImageUrl(item.thumbnail || item.poster, 'thumbnail')}
                    alt={item.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/>
                <Badge
                    variant="secondary"
                    className="absolute top-3 left-3 bg-orange-500/90 text-white text-[10px] font-semibold"
                >
                    <Star size={10} className="mr-1 fill-current"/>
                    {t('featured.badge', '精选')}
                </Badge>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-sm font-bold text-white line-clamp-2">
                        {item.title || item.short_token || ''}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <Avatar className="h-5 w-5 border border-white/30">
                            <AvatarImage
                                src={user?.avatar ? getImageUrl(user.avatar, 'avatar') : undefined}
                                alt={user?.username}
                            />
                            <AvatarFallback className="text-[9px] bg-white/20">
                                {user?.username?.[0] || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/70 truncate">
                            {user?.nickname || user?.username || 'Unknown'}
                        </span>
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-xl scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                    </div>
                </div>
            </div>
        </Link>
    );
};

const SmallFeaturedCard: React.FC<{item: FeaturedItem}> = ({item}) => {
    const {t} = useTranslation();
    const user = item.edges?.user?.[0] || item.user;

    return (
        <Link
            to="/watch"
            search={{v: item.short_token || item.id}}
            className="group block"
        >
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <img
                    src={getImageUrl(item.thumbnail || item.poster, 'thumbnail')}
                    alt={item.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <Badge
                    variant="secondary"
                    className="absolute top-1.5 left-1.5 bg-orange-500/90 text-white text-[9px] font-semibold px-1.5"
                >
                    <Star size={9} className="mr-0.5 fill-current"/>
                    {t('featured.badge', '精选')}
                </Badge>
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded">
                    {formatDuration(item.duration)}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                        <Play className="w-4 h-4 text-gray-900 ml-0.5" fill="currentColor"/>
                    </div>
                </div>
            </div>
            <div className="pt-2">
                <h3 className="font-semibold text-foreground text-xs line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {item.title || item.short_token || ''}
                </h3>
                <div className="flex items-center gap-1">
                    <img
                        src={getImageUrl(user?.avatar, 'avatar')}
                        alt={user?.username}
                        onError={(e) => handleImageError(e, 'avatar')}
                        className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                    />
                    <span className="text-[11px] text-muted-foreground truncate">
                        {user?.nickname || user?.username || 'Unknown'}
                    </span>
                </div>
            </div>
        </Link>
    );
};

const FeaturedPage = () => {
    const {t} = useTranslation();
    const search = useSearch({strict: false}) as {category_id?: number};
    const [sortMode, setSortMode] = useState<SortMode>('latest');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(search.category_id || null);

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

    const topFeatured = filteredAndSortedMedia[0];
    const largeCards = filteredAndSortedMedia.slice(1, 3);
    const mediumCards = filteredAndSortedMedia.slice(3, 7);
    const smallCards = filteredAndSortedMedia.slice(7);

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
            <div className="max-w-[1800px] mx-auto w-full px-4 md:px-6 lg:px-8 space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                            <Star className="w-5 h-5 text-white" fill="currentColor"/>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">{t('featured.pageTitle', '精选')}</h1>
                            <p className="text-sm text-muted-foreground">{t('featured.pageDesc', '编辑团队精心挑选的高质量内容')}</p>
                        </div>
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
                    <div className="flex flex-wrap items-center gap-2">
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
                    <>
                        {topFeatured && (
                            <section>
                                <LargeFeaturedCard item={topFeatured}/>
                            </section>
                        )}

                        {largeCards.length > 0 && (
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {largeCards.map((item) => (
                                    <MediumFeaturedCard key={item.id} item={item}/>
                                ))}
                            </section>
                        )}

                        {mediumCards.length > 0 && (
                            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {mediumCards.map((item) => (
                                    <MediumFeaturedCard key={item.id} item={item}/>
                                ))}
                            </section>
                        )}

                        {smallCards.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Flame className="w-5 h-5 text-orange-500" fill="currentColor"/>
                                    <h2 className="text-lg font-bold text-foreground">{t('featured.moreFeatured', '更多精选')}</h2>
                                    <Badge variant="secondary">{smallCards.length}</Badge>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-4">
                                    {smallCards.map((item) => (
                                        <SmallFeaturedCard key={item.id} item={item}/>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const FeaturedPageSkeleton: React.FC = () => (
    <div className="w-full">
        <div className="max-w-[1800px] mx-auto w-full px-4 md:px-6 lg:px-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl"/>
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-32"/>
                        <Skeleton className="h-4 w-48"/>
                    </div>
                </div>
                <Skeleton className="h-9 w-40 rounded-lg"/>
            </div>

            <div className="flex gap-2">
                {Array.from({length: 5}).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-full"/>
                ))}
            </div>

            <section>
                <Skeleton className="aspect-[16/10] rounded-xl"/>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({length: 2}).map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-xl"/>
                ))}
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({length: 4}).map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-xl"/>
                ))}
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-5 w-5 rounded-full"/>
                    <Skeleton className="h-6 w-32"/>
                    <Skeleton className="h-5 w-10 rounded-full"/>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-4">
                    {Array.from({length: 12}).map((_, i) => (
                        <div key={i}>
                            <Skeleton className="aspect-video rounded-lg"/>
                            <div className="pt-2 space-y-1">
                                <Skeleton className="h-4 w-full"/>
                                <Skeleton className="h-3 w-3/4"/>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    </div>
);

export default FeaturedPage;
