import React, {useState, useMemo} from 'react';
import {Link} from '@tanstack/react-router';
import {Play, Eye, Star, Clock, LayoutGrid, List, Filter} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Skeleton} from '@/components/ui/skeleton';
import {Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia} from '@/components/ui/empty';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useTranslation} from 'react-i18next';
import {useMediaList} from '@/hooks/queries';
import ErrorPage from '@/components/common/ErrorPage';
import CategoryFilter, {CategoryFilterSkeleton} from '@/components/common/CategoryFilter';
import VideoCardSkeleton from '@/components/common/VideoCardSkeleton';

type LayoutMode = 'grid' | 'list';

const FeaturedPage = () => {
    const {t} = useTranslation();
    const [activeCategoryId, setActiveCategoryId] = useState<number | string | null>(null);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');

    const {data, isLoading, error} = useMediaList({
        featured: 'true',
        page_size: 20,
        status: 'active',
    });

    const featuredMedia: FeaturedItem[] = (data?.items as FeaturedItem[]) || [];

    const categories = useMemo(() => {
        const catMap = new Map<number, {id: number; name: string}>();
        featuredMedia.forEach((item) => {
            if (item.category_id && item.edges?.category?.name) {
                if (!catMap.has(item.category_id)) {
                    catMap.set(item.category_id, {
                        id: item.category_id,
                        name: item.edges.category.name,
                    });
                }
            }
        });
        return Array.from(catMap.values());
    }, [featuredMedia]);

    const filteredMedia = useMemo(() => {
        if (activeCategoryId === null) return featuredMedia;
        return featuredMedia.filter((item) => item.category_id === activeCategoryId);
    }, [featuredMedia, activeCategoryId]);

    const primaryItem = featuredMedia[0];
    const editorPickItems = featuredMedia.slice(1, 7);

    if (isLoading) {
        return <FeaturedPageSkeleton/>;
    }

    if (error) {
        return <ErrorPage message={error.message || t('common.noData')}/>;
    }

    if (featuredMedia.length === 0) {
        return (
            <div className="max-w-[1800px] mx-auto w-full px-1 py-12">
                <Empty className="py-20">
                    <EmptyMedia variant="icon">
                        <Star size={24}/>
                    </EmptyMedia>
                    <EmptyHeader>
                        <EmptyTitle>{t('featured.emptyTitle')}</EmptyTitle>
                        <EmptyDescription>{t('featured.emptyDesc')}</EmptyDescription>
                    </EmptyHeader>
                    <Link to="/">
                        <Button variant="outline">{t('error.backToHome')}</Button>
                    </Link>
                </Empty>
            </div>
        );
    }

    return (
        <div className="max-w-[1800px] mx-auto w-full px-1 py-6 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-[7fr,3fr] gap-6 lg:gap-8">
                <PrimaryFeaturedCard item={primaryItem}/>
                <aside className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Star size={18} className="text-warning"/>
                        <h2 className="text-lg font-bold text-foreground">{t('featured.editorPick')}</h2>
                    </div>
                    <div className="space-y-3">
                        {editorPickItems.length > 0 ? (
                            editorPickItems.map((item) => <EditorPickListItem key={item.id} item={item}/>)
                        ) : (
                            <div className="text-sm text-muted-foreground py-4">
                                {t('common.noData')}
                            </div>
                        )}
                    </div>
                </aside>
            </section>

            <CategoryFilter
                categories={categories}
                activeId={activeCategoryId}
                onSelect={setActiveCategoryId}
            />

            <section className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">{t('featured.allFeatured')}</h2>
                        <span className="text-sm text-muted-foreground">
                            {t('featured.featuredCount', {count: filteredMedia.length})}
                        </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                        <Button
                            variant={layoutMode === 'grid' ? 'default' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setLayoutMode('grid')}
                            aria-label="Grid layout"
                        >
                            <LayoutGrid size={16}/>
                        </Button>
                        <Button
                            variant={layoutMode === 'list' ? 'default' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setLayoutMode('list')}
                            aria-label="List layout"
                        >
                            <List size={16}/>
                        </Button>
                    </div>
                </div>

                {filteredMedia.length === 0 ? (
                    <Empty className="py-12">
                        <EmptyMedia variant="icon">
                            <Filter size={24}/>
                        </EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>{t('featured.noResultsTitle')}</EmptyTitle>
                            <EmptyDescription>{t('featured.noResultsDesc')}</EmptyDescription>
                        </EmptyHeader>
                        <Button variant="outline" onClick={() => setActiveCategoryId(null)}>
                            {t('featured.clearFilter')}
                        </Button>
                    </Empty>
                ) : (
                    <>
                        {layoutMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                                {filteredMedia.map((item) => (
                                    <FeaturedGridCard key={item.id} item={item}/>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {filteredMedia.map((item) => (
                                    <FeaturedListCard key={item.id} item={item}/>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
};

interface FeaturedCardProps {
    item: {
        id: string;
        short_token?: string;
        title: string;
        description?: string;
        thumbnail?: string;
        category_id?: number;
        duration: number;
        view_count: number;
        create_time?: string;
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

const PrimaryFeaturedCard: React.FC<FeaturedCardProps> = ({item}) => {
    const {t} = useTranslation();
    const user = item.edges?.user?.[0];

    return (
        <Link
            to="/watch"
            search={{v: item.short_token || item.id}}
            className="group block"
        >
            <div className="relative rounded-lg overflow-hidden border border-border bg-card hover:shadow-md transition-all duration-300">
                <div className="relative aspect-video overflow-hidden">
                    <img
                        src={getImageUrl(item.thumbnail, 'thumbnail')}
                        alt={item.title}
                        loading="eager"
                        onError={(e) => handleImageError(e, 'thumbnail')}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge
                        variant="secondary"
                        className="absolute bottom-2 right-2 bg-black/80 text-white text-xs backdrop-blur-sm"
                    >
                        {formatDuration(item.duration)}
                    </Badge>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center shadow-lg scale-75 group-hover:scale-100 transition-transform duration-300">
                            <Play className="w-6 h-6 text-foreground ml-0.5" fill="currentColor"/>
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <h3 className="text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
                        {item.description || t('watch.noDescription')}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                            <AvatarImage
                                src={user?.avatar ? getImageUrl(user.avatar, 'avatar') : undefined}
                                alt={user?.username}
                            />
                            <AvatarFallback className="text-[10px]">
                                {user?.username?.[0] || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-foreground font-medium">{user?.username || 'Unknown'}</span>
                        <span className="flex items-center gap-1">
                            <Eye size={14}/>
                            {formatViews(item.view_count)}
                        </span>
                    </div>
                    <Button size="sm" className="mt-4">
                        <Play size={16} className="mr-1.5"/>
                        {t('featured.watchNow')}
                    </Button>
                </div>
            </div>
        </Link>
    );
};

const EditorPickListItem: React.FC<FeaturedCardProps> = ({item}) => {
    const user = item.edges?.user?.[0];

    return (
        <Link
            to="/watch"
            search={{v: item.short_token || item.id}}
            className="group flex gap-3 p-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
        >
            <div className="relative w-32 shrink-0 aspect-video rounded-lg overflow-hidden">
                <img
                    src={getImageUrl(item.thumbnail, 'thumbnail')}
                    alt={item.title}
                    loading="lazy"
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <Badge
                    variant="secondary"
                    className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] backdrop-blur-sm"
                >
                    {formatDuration(item.duration)}
                </Badge>
            </div>
            <div className="flex flex-col justify-center min-w-0 py-0.5">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                </h4>
                <span className="text-xs text-muted-foreground mt-1 truncate">
                    {user?.username || 'Unknown'}
                </span>
            </div>
        </Link>
    );
};

const FeaturedGridCard: React.FC<FeaturedCardProps> = ({item}) => {
    const {t} = useTranslation();
    const user = item.edges?.user?.[0];

    return (
        <Link to="/watch" search={{v: item.short_token || item.id}} className="group block">
            <div className="rounded-card bg-card overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <div className="relative aspect-video overflow-hidden">
                    <img
                        src={getImageUrl(item.thumbnail, 'thumbnail')}
                        alt={item.title}
                        loading="lazy"
                        onError={(e) => handleImageError(e, 'thumbnail')}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge
                        variant="secondary"
                        className="absolute bottom-2 right-2 bg-black/80 text-white text-xs backdrop-blur-sm"
                    >
                        {formatDuration(item.duration)}
                    </Badge>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <Play className="w-5 h-5 text-foreground ml-0.5" fill="currentColor"/>
                        </div>
                    </div>
                </div>
                <div className="p-3">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                        {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                            <AvatarImage
                                src={user?.avatar ? getImageUrl(user.avatar, 'avatar') : undefined}
                                alt={user?.username}
                            />
                            <AvatarFallback className="text-[10px]">
                                {user?.username?.[0] || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">
                            {user?.username || 'Unknown'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Eye size={12}/>
                            {formatViews(item.view_count)}
                        </span>
                        {item.create_time && (
                            <span className="flex items-center gap-1">
                                <Clock size={12}/>
                                {formatDate(item.create_time)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

const FeaturedListCard: React.FC<FeaturedCardProps> = ({item}) => {
    const user = item.edges?.user?.[0];

    return (
        <Link to="/watch" search={{v: item.short_token || item.id}} className="group block">
            <div className="flex gap-3 rounded-card bg-card overflow-hidden border border-border p-2 hover:shadow-md transition-all duration-200">
                <div className="w-40 shrink-0 aspect-video rounded-lg overflow-hidden relative">
                    <img
                        src={getImageUrl(item.thumbnail, 'thumbnail')}
                        alt={item.title}
                        loading="lazy"
                        onError={(e) => handleImageError(e, 'thumbnail')}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge
                        variant="secondary"
                        className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] backdrop-blur-sm"
                    >
                        {formatDuration(item.duration)}
                    </Badge>
                </div>
                <div className="flex flex-col justify-center py-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {item.title}
                    </h3>
                    <span className="text-xs text-muted-foreground mb-0.5">
                        {user?.username || 'Unknown'}
                    </span>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <Eye size={12}/>
                            {formatViews(item.view_count)}
                        </span>
                        {item.create_time && (
                            <span className="flex items-center gap-1">
                                <Clock size={12}/>
                                {formatDate(item.create_time)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

const FeaturedPageSkeleton: React.FC = () => (
    <div className="max-w-[1800px] mx-auto w-full px-1 py-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-[7fr,3fr] gap-6 lg:gap-8">
            <div className="space-y-4">
                <Skeleton className="aspect-video rounded-lg"/>
                <Skeleton className="h-7 w-3/4"/>
                <Skeleton className="h-4 w-1/2"/>
                <div className="flex items-center gap-3 pt-2">
                    <Skeleton className="h-8 w-8 rounded-full"/>
                    <Skeleton className="h-4 w-24"/>
                    <Skeleton className="h-4 w-16"/>
                </div>
                <Skeleton className="h-10 w-32 rounded-lg"/>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-6 w-32"/>
                <div className="space-y-3">
                    {Array.from({length: 5}).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="w-32 aspect-video rounded-lg"/>
                            <div className="flex-1 space-y-2 py-1">
                                <Skeleton className="h-4 w-3/4"/>
                                <Skeleton className="h-3 w-1/2"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <CategoryFilterSkeleton/>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32"/>
                <Skeleton className="h-4 w-20"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                {Array.from({length: 8}).map((_, i) => (
                    <VideoCardSkeleton key={i}/>
                ))}
            </div>
        </div>
    </div>
);

export default FeaturedPage;
