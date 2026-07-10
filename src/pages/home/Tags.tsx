import React, {useState, useEffect} from 'react';
import {Link} from '@tanstack/react-router';
import {Tag as TagIcon, Hash, Search} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import {tagApi, type Tag} from '@/lib/api/tag';
import {colorFromName} from '@/lib/utils/tag-color';

const TagsPage = () => {
    const {t} = useTranslation();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const fetchTags = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await tagApi.getAll();
                setTags(response?.items || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : t('common.error'));
                console.error('Failed to fetch tags:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTags();
    }, [t]);

    const getTagColor = (tag: Tag): string => {
        return tag.color || colorFromName(tag.title);
    };

    const filteredTags = tags.filter(tag =>
        tag.title.toLowerCase().includes(filter.toLowerCase())
    );

    const sortedTags = filter
        ? [...filteredTags].sort((a, b) => a.title.localeCompare(b.title))
        : [...filteredTags].sort((a, b) => (b.count || 0) - (a.count || 0));

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <TagIcon size={24} className="text-primary"/>
                    <h1 className="text-2xl font-bold text-foreground">{t('tags.title')}</h1>
                </div>
                <div className="flex items-center justify-center py-16">
                    <Spinner/>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <TagIcon size={48} className="mx-auto mb-3 opacity-30"/>
                <p>{error}</p>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => window.location.reload()}
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
                    <TagIcon size={24} className="text-primary"/>
                    <h1 className="text-2xl font-bold text-foreground">{t('tags.title')}</h1>
                </div>
                <span className="text-sm text-muted-foreground">
                    {t('tags.tagCount', {count: tags.length})}
                </span>
            </div>

            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={t('tags.searchPlaceholder')}
                    className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
            </div>

            {sortedTags.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <TagIcon size={48} className="mx-auto mb-3 opacity-30"/>
                    <p>{filter ? t('tags.noMatch') : t('tags.noTags', 'No tags found')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {sortedTags.map((tag) => {
                        const tagColor = getTagColor(tag);
                        return (
                            <Link
                                key={tag.id}
                                to="/search"
                                search={{q: tag.title}}
                                className="group flex items-center gap-2 p-3 bg-card border border-border rounded-card hover:shadow-md transition-all hover:-translate-y-0.5"
                                style={{'--tag-color': tagColor} as React.CSSProperties}
                            >
                                <Hash size={16} className="shrink-0" style={{color: tagColor}}/>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate transition-colors group-hover:text-primary" style={{color: tagColor}}>
                                        {tag.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{t('tags.videosCount', {count: tag.count || 0})}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TagsPage;
