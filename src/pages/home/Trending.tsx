import {useState, useEffect} from 'react';
import {Link} from '@tanstack/react-router';
import {TrendingUp, Play, Eye, Heart} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Spinner} from '@/components/ui/spinner';
import {exploreApi} from '@/lib/api/explore';
import type {TrendingItem} from '@/lib/api/explore';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {formatViews, formatDuration} from '@/lib/format';

export default function Trending() {
    const {t} = useTranslation();
    const [items, setItems] = useState<TrendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        exploreApi.getTrending({limit: 50})
            .then((res) => {
                setItems(res.items || []);
            })
            .catch((err: Error) => setError(err.message || 'Failed to load trending'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <TrendingUp size={24} className="text-primary"/>
                    <h1 className="text-2xl font-bold text-foreground">{t('trending.title', 'Trending')}</h1>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                    {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="aspect-video bg-muted rounded-card mb-3"/>
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"/>
                            <div className="h-3 bg-muted rounded w-1/2"/>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16 text-destructive">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp size={24} className="text-primary"/>
                    <h1 className="text-2xl font-bold text-foreground">{t('trending.title', 'Trending')}</h1>
                </div>
                <span className="text-sm text-muted-foreground">{t('trending.resultCount', {count: items.length})}</span>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    {t('trending.noResults', 'No trending content')}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            to="/watch"
                            search={{v: item.short_token}}
                            className="group"
                        >
                            <div className="bg-card rounded-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                                <div className="relative aspect-video overflow-hidden">
                                    <img
                                        src={getImageUrl(item.thumbnail, 'thumbnail')}
                                        alt={item.title}
                                        onError={(e) => handleImageError(e, 'thumbnail')}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                    />
                                    {item.duration ? (
                                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                                            {formatDuration(item.duration)}
                                        </span>
                                    ) : null}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                            <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-medium text-foreground text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Eye size={12}/>
                                            {formatViews(item.view_count)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Heart size={12}/>
                                            {formatViews(item.like_count)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
