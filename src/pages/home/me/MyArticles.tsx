import {Spinner} from "@/components/ui/spinner"
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {userArticleApi, type Article} from '@/lib/api/article';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
    FileText,
    Eye,
    Clock,
    Trash2,
    Edit,
    Plus,
    Video,
} from 'lucide-react';
import {Link} from '@tanstack/react-router';
import {formatRelativeTime} from '@/lib/format';
import {getFullUrl} from '@/lib/utils';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';

type ArticleFilter = 'all' | 'draft' | 'published';

const PAGE_SIZE = 12;

const MyArticles = () => {
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<Article[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState<ArticleFilter>('all');
    const sentinelRef = useRef<HTMLDivElement>(null);

    const queryParams: { page: number; page_size: number; state?: string } = {
        page,
        page_size: PAGE_SIZE,
    };
    if (filter !== 'all') {
        queryParams.state = filter;
    }

    const {data, isLoading, error} = useQuery({
        queryKey: ['myArticles', page, filter],
        queryFn: async () => {
            const res = await userArticleApi.myArticles(queryParams);
            return res;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => userArticleApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['myArticles']});
            toast.success(t('common.deleted'));
        },
        onError: (err: any) => {
            toast.error(t('myArticles.deleteFailed'), {
                description: err?.message || '',
            });
        },
    });

    useEffect(() => {
        setPage(1);
        setItems([]);
        setHasMore(true);
    }, [filter]);

    useEffect(() => {
        if (data?.items) {
            if (page === 1) {
                setItems(data.items);
            } else {
                setItems(prev => [...prev, ...data.items]);
            }
            setHasMore(data.items.length === PAGE_SIZE);
        } else if (page > 1) {
            setHasMore(false);
        }
    }, [data, page]);

    const loadMore = useCallback(() => {
        if (isLoading || !hasMore) return;
        setPage(prev => prev + 1);
    }, [isLoading, hasMore]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            {rootMargin: '200px'},
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore]);

    const handleDelete = useCallback((article: Article) => {
        if (window.confirm(t('myArticles.confirmDelete'))) {
            deleteMutation.mutate(article.id);
            setItems(prev => prev.filter(i => i.id !== article.id));
        }
    }, [deleteMutation, t]);

    const filters: { key: ArticleFilter; label: string }[] = [
        {key: 'all', label: t('myArticles.filterAll')},
        {key: 'draft', label: t('myArticles.filterDrafts')},
        {key: 'published', label: t('myArticles.filterPublished')},
    ];

    if (isLoading && items.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    if (error && items.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-destructive">
                {error.message || t('common.error')}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('myArticles.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('myArticles.subtitle')}</p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                    <Link to="/me/articles/new">
                        <Plus className="w-4 h-4 mr-2"/>
                        {t('myArticles.writeArticle')}
                    </Link>
                </Button>
            </div>

            <div className="flex gap-2">
                {filters.map((f) => (
                    <Button
                        key={f.key}
                        variant={filter === f.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            {items.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div
                            className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-muted-foreground"/>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-foreground">{t('myArticles.emptyTitle')}</h3>
                            <p className="text-sm text-muted-foreground">{t('myArticles.emptyDesc')}</p>
                        </div>
                        <Button asChild variant="outline">
                            <Link to="/me/articles/new">{t('myArticles.writeArticle')}</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-x-4 gap-y-6" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'}}>
                        {items.map((article) => (
                            <Card key={article.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                                <div className="relative aspect-video bg-muted">
                                    {article.thumbnail ? (
                                        <img
                                            src={getFullUrl(article.thumbnail)}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : article.media?.thumbnail ? (
                                        <img
                                            src={getFullUrl(article.media.thumbnail)}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FileText className="w-10 h-10 text-muted-foreground/30"/>
                                        </div>
                                    )}
                                    {article.media_id && (
                                        <div className="absolute top-2 left-2">
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                <Video className="w-3 h-3 mr-1"/>
                                                {article.media?.duration ? `${Math.floor(article.media.duration / 60)}:${String(article.media.duration % 60).padStart(2, '0')}` : ''}
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="font-semibold text-foreground line-clamp-2 flex-1">
                                            {article.title}
                                        </h3>
                                        <Badge
                                            variant={article.state === 'published' ? 'default' : 'secondary'}
                                            className="text-[10px] px-1.5 py-0 capitalize shrink-0"
                                        >
                                            {article.state}
                                        </Badge>
                                    </div>

                                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Eye className="w-3 h-3"/>
                                            {article.view_count} {t('myArticles.views')}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3"/>
                                            {formatRelativeTime(article.create_time)}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" className="h-8" asChild>
                                            <Link to="/me/articles/$token/edit" params={{token: article.short_token}}>
                                                <Edit className="w-3.5 h-3.5 mr-1"/>
                                                {t('myArticles.edit')}
                                            </Link>
                                        </Button>
                                        {article.state === 'draft' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(article)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-1"/>
                                                {t('myArticles.delete')}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div ref={sentinelRef} className="flex flex-col items-center py-8">
                        {isLoading && (
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Spinner size="sm"/>
                                <span className="text-sm">{t('common.loading')}</span>
                            </div>
                        )}
                        {!hasMore && items.length > 0 && (
                            <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MyArticles;
