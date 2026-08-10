import React, {useState, useEffect} from 'react';
import {Link, useSearch, useNavigate} from '@tanstack/react-router';
import {Tag as TagIcon, Hash, Search} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import {tagApi, type Tag} from '@/lib/api/tag';
import {colorFromName} from '@/lib/utils/tag-color';
import {generateSlug} from '@/lib/utils/slug';
import {getTagSuggestions} from '@/lib/utils/tag-suggest';
import TagDetailView from '@/pages/home/Tag';

const TagsPage = () => {
    const {t} = useTranslation();
    // URL standard: /tags?v={slug} (GOV-STD-URL D1: unified `v` = value).
    // Legacy ?tag={slug} still read for compatibility (D8), new writes use `v`.
    const search = useSearch({strict: false}) as {v?: string; tag?: string};
    const urlTagSlug = (search.v ?? search.tag)?.trim() || null;
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const navigate = useNavigate();

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

    // BUG-154: 联想候选（前缀优先 + 子串），供搜索框下拉使用
    const suggestions = getTagSuggestions(tags, filter);

    const sortedTags = filter
        ? [...filteredTags].sort((a, b) => a.title.localeCompare(b.title))
        : [...filteredTags].sort((a, b) => (b.count || 0) - (a.count || 0));

    // A ?tag={slug} filter turns this collection page into the tag detail view.
    if (urlTagSlug) {
        return <TagDetailView slug={urlTagSlug}/>;
    }

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
                    onChange={(e) => {
                        setFilter(e.target.value);
                        setOpen(true);
                        setActiveIndex(-1);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    onKeyDown={(e) => {
                        if (!open || suggestions.length === 0) return;
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActiveIndex((i) => Math.max(i - 1, 0));
                        } else if (e.key === 'Enter' && activeIndex >= 0) {
                            e.preventDefault();
                            const s = suggestions[activeIndex];
                            const slug = s.slug || generateSlug(s.title);
                            navigate({to: '/tags', search: {v: slug}});
                        } else if (e.key === 'Escape') {
                            setOpen(false);
                        }
                    }}
                    placeholder={t('tags.searchPlaceholder')}
                    className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    role="combobox"
                    aria-expanded={open}
                    aria-autocomplete="list"
                />
                {open && suggestions.length > 0 && (
                    <ul
                        className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-auto"
                        role="listbox"
                    >
                        {suggestions.map((s, idx) => {
                            const slug = s.slug || generateSlug(s.title);
                            const tagColor = s.color || colorFromName(s.title);
                            return (
                                <li key={s.id} role="option" aria-selected={idx === activeIndex}>
                                    <Link
                                        to="/tags"
                                        search={{v: slug}}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm ${idx === activeIndex ? 'bg-muted' : ''}`}
                                        style={{color: tagColor}}
                                    >
                                        <Hash size={14} className="shrink-0" style={{color: tagColor}}/>
                                        <span className="truncate">{s.title}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">{t('tags.videosCount', {count: s.count || 0})}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {sortedTags.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <TagIcon size={48} className="mx-auto mb-3 opacity-30"/>
                    <p>{filter ? t('tags.noMatch') : t('tags.noTags', 'No tags found')}</p>
                </div>
            ) : (
                <div className="grid gap-3" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))'}}>
                    {sortedTags.map((tag) => {
                        const tagColor = getTagColor(tag);
                        // BUG-143 / BUG-156: legacy rows may lack a backend slug; derive one
                        // client-side so the link always resolves to /tags?v={slug} (GOV-STD-URL D1).
                        const tagSlug = tag.slug || generateSlug(tag.title);
                        return (
                            <Link
                                key={tag.id}
                                to="/tags"
                                search={{v: tagSlug}}
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
