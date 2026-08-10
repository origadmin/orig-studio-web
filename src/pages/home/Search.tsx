import React, {useState, useEffect, useCallback} from 'react';
import {Link, useLocation, useNavigate, useSearch} from '@tanstack/react-router';
import {Filter, Eye, Play, Loader2, Search as SearchIcon} from 'lucide-react';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {useMediaList} from '@/hooks/queries';
import {getFullUrl} from '@/lib/utils';
import {Input} from '@/components/ui/input';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import {useCategoryList} from '@/hooks/queries';
import {HashtagText} from '@/components/common/HashtagText';
import {mergeTagsWithHashtags} from '@/lib/utils/hashtag';
import {colorFromName} from '@/lib/utils/tag-color';
import {sanitizeSearchQuery} from '@/lib/utils/search';
import {generateSlug} from '@/lib/utils/slug';
import type {Media} from '@/lib/api/media';

const SearchPage = () => {
    const {t} = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = useSearch({strict: false}) as { q?: string; category_id?: string };

    const [searchQuery, setSearchQuery] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const pageSize = 10;

    useEffect(() => {
        const q = sanitizeSearchQuery(searchParams.q || '');
        const categoryId = searchParams.category_id || '';

        setSearchQuery(q);
        setInputValue(q);
        if (categoryId) {
            setSelectedCategory(categoryId);
        }
        setPage(1);
    }, [searchParams.q, searchParams.category_id]);

    const {data: categories} = useCategoryList();

    const {data, isLoading, error} = useMediaList({
        page,
        page_size: pageSize,
        status: 'active',
        keyword: searchQuery,
        category_id: selectedCategory ? Number(selectedCategory) : undefined
    });

    const searchResults = data?.items || [];
    const totalResults = data?.total || 0;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanQuery = sanitizeSearchQuery(inputValue);
        setSearchQuery(cleanQuery);
        setInputValue(cleanQuery);
        setPage(1);
        const params = new URLSearchParams();
        if (cleanQuery) params.set('q', cleanQuery);
        if (selectedCategory) params.set('category_id', selectedCategory);
        window.history.replaceState({}, '', `/search?${params.toString()}`);
    };

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setPage(1);
        const cleanQuery = sanitizeSearchQuery(searchQuery);
        const params = new URLSearchParams();
        if (cleanQuery) params.set('q', cleanQuery);
        if (categoryId) params.set('category_id', categoryId);
        window.history.replaceState({}, '', `/search?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setInputValue('');
        setSelectedCategory('');
        setPage(1);
        window.history.replaceState({}, '', '/search');
    };

    return (
        <div className="space-y-8">
            {/* Search Header */}
            <div className="pb-6 border-b border-border">
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/>
                        <Input
                            type="text"
                            placeholder={t('search.placeholder')}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="pl-10 h-12 text-base"
                        />
                    </div>
                    <Button type="submit" className="h-12 px-6 bg-primary hover:bg-primary/90">
                        <SearchIcon className="w-5 h-5 mr-2"/>
                        {t('search.search')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-12 px-4"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={18} className={showFilters ? 'text-primary' : ''}/>
                    </Button>
                </form>

                {/* Filters */}
                {showFilters && (
                    <div className="mt-4 p-4 bg-muted rounded-card">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-foreground">
                                {t('search.filterByCategory')}
                            </span>
                            {(selectedCategory || searchQuery) && (
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-primary hover:text-primary/80"
                                >
                                    {t('search.clearFilters')}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleCategoryChange('')}
                                className={`px-4 py-2 rounded-badge text-sm font-medium transition-colors ${
                                    !selectedCategory
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-card text-foreground hover:bg-muted'
                                }`}
                            >
                                {t('search.allCategories')}
                            </button>
                            {categories?.items?.map((category: any) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategoryChange(String(category.id))}
                                    className={`px-4 py-2 rounded-badge text-sm font-medium transition-colors ${
                                        selectedCategory === String(category.id)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-card text-foreground hover:bg-muted'
                                    }`}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Results Header */}
            {searchQuery && (
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('search.resultsFor', {query: searchQuery})}
                    </h1>
                    <span className="text-sm text-muted-foreground">
                        {totalResults} {t('search.results')}
                    </span>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Spinner />
                </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
                <div className="py-20 text-center space-y-4">
                    <div className="text-muted-foreground text-lg">{t('common.error')}</div>
                    <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
                    <Link to="/">
                        <button
                            className="flex items-center space-x-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-black hover:bg-primary/90 transition-all mx-auto">
                            <span>{t('common.backToHome')}</span>
                        </button>
                    </Link>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && searchResults.length === 0 && (
                <div className="py-20 text-center space-y-4">
                    <div className="text-muted-foreground text-lg">
                        {searchQuery
                            ? t('search.noResults', {query: searchQuery})
                            : t('search.enterQuery')}
                    </div>
                    {searchQuery && (
                        <Link to="/">
                            <button
                                className="flex items-center space-x-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-black hover:bg-primary/90 transition-all mx-auto">
                                <span>{t('common.backToHome')}</span>
                            </button>
                        </Link>
                    )}
                </div>
            )}

            {/* Results List */}
            {!isLoading && !error && searchResults.length > 0 && (
                <>
                    <div className="space-y-6">
                        {searchResults.map((item: Media) => (
                            <Link key={item.id} to="/watch" search={{v: item.short_token}}
                                  className="flex flex-col md:flex-row gap-6 group p-4 rounded-card hover:bg-muted/50 transition-all">
                                <div
                                    className="relative w-full md:w-72 aspect-video bg-muted rounded-card overflow-hidden shrink-0 border border-border shadow-sm">
                                    <img src={item.thumbnail ? getFullUrl(item.thumbnail) : undefined}
                                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                         alt={item.title}/>
                                    <div
                                        className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                                        {formatDuration(item.duration)}
                                    </div>
                                    <div
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div
                                            className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                            <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2 min-w-0">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                        <HashtagText text={item.title} />
                                    </h3>
                                    <div
                                        className="flex items-center space-x-3 text-xs font-medium text-muted-foreground">
                                        <span>{item.edges?.user?.[0]?.username || 'Unknown'}</span>
                                        <span>·</span>
                                        <span className="flex items-center gap-1">
                                            <Eye size={12}/>
                                            {formatViews(item.view_count)} {t('common.views')}
                                        </span>
                                        <span>·</span>
                                        <span>{formatDate(item.create_time)}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                        {item.description || t('watch.noDescription')}
                                    </p>
                                    {(() => {
                                        const allTags = mergeTagsWithHashtags(item.tags || [], item.title, item.description);
                                        return allTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {allTags.map(tag => {
                                                    const slug = generateSlug(tag);
                                                    return (
                                                        <Link
                                                            key={tag}
                                                            to="/tags"
                                                            search={{v: slug}}
                                                            className="text-xs px-1.5 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                                                            style={{color: colorFromName(tag), backgroundColor: colorFromName(tag) + '15'}}
                                                        >#{tag}</Link>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalResults > pageSize && (
                        <div className="flex justify-center pt-8">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('common.previous')}
                                </button>
                                {Array.from({length: Math.min(5, Math.ceil(totalResults / pageSize))}, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`px-4 py-2 rounded-lg ${
                                                page === pageNum
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= Math.ceil(totalResults / pageSize)}
                                    className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('common.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
export default SearchPage;
