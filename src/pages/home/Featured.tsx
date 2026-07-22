import React, {useMemo, useState} from 'react';
import {Link, useSearch} from '@tanstack/react-router';
import {Play, Eye, Star, Clock, TrendingUp, Filter} from 'lucide-react';
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

const FeaturedHero: React.FC<{item: FeaturedItem}> = ({item}) => {
    const {t} = useTranslation();
    const user = item.edges?.user?.[0] || item.user;

    return (
        <Link
            to="/watch"
            search={{v: item.short_token || item.id}}
            className="group block"
        >
            <div className="relative w-full max-w-[1600px] mx-auto aspect-[21/9] overflow-hidden rounded-xl">
                <img
                    src={getImageUrl(item.thumbnail || item.poster, 'thumbnail')}
                    alt={item.title}
                    loading="eager"
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"/>
                <div className="absolute top-6 left-6">
                    <Badge className="bg-orange-500 text-white border-0 font-semibold px-3 py-1">
                        <Star size={12} className="mr-1 fill-current"/>
                        {t('featured.badge', '精选推荐')}
                    </Badge>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white line-clamp-2 drop-shadow-lg leading-tight">
                        {item.title || item.short_token || ''}
                    </h1>
                    <p className="text-sm md:text-base text-white/70 line-clamp-2 mt-3 max-w-2xl">
                        {item.description || t('watch.noDescription')}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-white/80">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-9 w-9 border-2 border-white/30">
                                <AvatarImage
                                    src={user?.avatar ? getImageUrl(user.avatar, 'avatar') : undefined}
                                    alt={user?.username}
                                />
                                <AvatarFallback className="text-xs bg-white/20 text-white">
                                    {user?.username?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user?.nickname || user?.username || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Eye size={16}/>
                            {formatViews(item.view_count)}
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock size={16}/>
                            {formatDate(item.create_time)}
                        </div>
                        <div className="flex items-center gap-1">
                            <Play size={16} fill="currentColor"/>
                            {formatDuration(item.duration)}
                        </div>
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/95 flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-9 h-9 md:w-10 md:h-10 text-gray-900 ml-1" fill="currentColor"/>
                    </div>
                </div>
            </div>
        </Link>
    );
};

const VideoCard: React.FC<{item: FeaturedItem}> = ({item}) => {
    const {t} = useTranslation();
    const user = item.edges?.user?.[0] || item.user;

    return (
        <Link
            to="/watch"
            search={{v: item.short_token || item.id}}
            className="group block"
        >
            <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                <img
                    src={getImageUrl(item.thumbnail || item.poster, 'thumbnail')}
                    alt={item.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute top-2.5 left-2.5">
                    <Badge variant="secondary" className="bg-orange-500/90 text-white border-0 text-[10px] font-semibold px-2 py-0.5">
                        <Star size={9} className="mr-0.5 fill-current"/>
                        {t('featured.badgeShort', '精选')}
                    </Badge>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
                    {formatDuration(item.duration)}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                        <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                    </div>
                </div>
            </div>
            <div className="pt-3">
                <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
                    {item.title || item.short_token || ''}
                </h3>
                <div className="flex items-center gap-2 mb-1.5">
                    <Avatar className="w-5 h-5">
                        <AvatarImage
                            src={user?.avatar ? getImageUrl(user.avatar, 'avatar') : undefined}
                            alt={user?.username}
                        />
                        <AvatarFallback className="text-[9px] bg-muted">
                            {user?.username?.[0] || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate">
                        {user?.nickname || user?.username || 'Unknown'}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                        <Eye size={11}/>{formatViews(item.view_count)}
                    </span>
                    {item.create_time && <span>{formatDate(item.create_time)}</span>}
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
        page_size: 48,
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

    if (isLoading) {
        return <FeaturedPageSkeleton/>;
    }

    if (error) {
        return <ErrorPage message={error.message || t('common.noData')}/>;
    }

    if (featuredMedia.length === 0) {
        return (
            <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8 py-12">
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
            <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                            <Star className="w-6 h-6 md:w-7 md:h-7 text-orange-500" fill="currentColor"/>
                            {t('featured.pageTitle', '精选')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('featured.pageDesc', '编辑团队精心挑选的高质量内容')}
                        </p>
                    </div>

                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                        <button
                            onClick={() => setSortMode('latest')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                selectedCategory === null
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                            }`}
                        >
                            {t('home.all', '全部')}
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    selectedCategory === cat.id
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {filteredAndSortedMedia.length === 0 ? (
                <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8 py-20 text-center text-muted-foreground">
                    <Filter className="w-16 h-16 mx-auto mb-4 opacity-50"/>
                    <p className="text-lg">{t('featured.noResultsTitle', '暂无符合条件的内容')}</p>
                </div>
            ) : (
                <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8 pb-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-7">
                        {filteredAndSortedMedia.map((item) => (
                            <VideoCard key={item.id} item={item}/>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const FeaturedPageSkeleton: React.FC = () => (
    <div className="w-full">
        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-7 h-7 rounded"/>
                        <Skeleton className="h-8 w-24"/>
                    </div>
                    <Skeleton className="h-4 w-48 mt-2"/>
                </div>
                <Skeleton className="h-10 w-40 rounded-lg"/>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {Array.from({length: 6}).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-16 rounded-full"/>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-7 pb-12">
                {Array.from({length: 10}).map((_, i) => (
                    <div key={i}>
                        <Skeleton className="aspect-video rounded-xl"/>
                        <div className="pt-3 space-y-2">
                            <Skeleton className="h-4 w-full"/>
                            <Skeleton className="h-4 w-3/4"/>
                            <div className="flex items-center gap-2">
                                <Skeleton className="w-5 h-5 rounded-full"/>
                                <Skeleton className="h-3 w-24"/>
                            </div>
                            <Skeleton className="h-3 w-20"/>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default FeaturedPage;
