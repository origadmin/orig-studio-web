import React, {useState, useEffect} from 'react';
import {Users, Loader2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import ErrorPage from '@/components/common/ErrorPage';
import VideoCardWithHover from '@/components/common/VideoCardWithHover';
import {subscriptionVideosApi} from '@/lib/api/subscriptionVideos';
import {PAGINATION_CONFIG} from '@/config/pagination';

/*
 * 订阅内容流：展示已订阅频道的最新视频（YouTube 式网格）。
 * 复用 VideoCardWithHover（带缩略图/时长/播放量/hover 操作），
 * 数据来自 GET /api/v1/subscriptions/videos（subscriptionVideosApi）。
 */
const SubscriptionsPage = () => {
    const {t} = useTranslation();
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async (pageNum: number) => {
        try {
            setLoading(true);
            setError(null);
            const response = await subscriptionVideosApi.getVideos({page: pageNum, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});
            const items = Array.isArray(response?.items) ? response.items : [];
            setVideos(prev => pageNum === 1 ? items : [...prev, ...items]);
            setHasMore(items.length === PAGINATION_CONFIG.DEFAULT_PAGE_SIZE);
        } catch (err) {
            setError('Failed to fetch data');
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchData(nextPage);
        }
    };

    if (loading && page === 1) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    if (error) {
        return <ErrorPage message={error}/>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Users size={24} className="text-primary"/>
                <h1 className="text-2xl font-bold text-foreground">{t('subscriptions.title')}</h1>
                {videos.length > 0 && (
                    <span className="text-sm text-muted-foreground">{videos.length}</span>
                )}
            </div>

            {videos.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Users size={48} className="mx-auto mb-3 opacity-30"/>
                    <p>{t('subscriptions.noSubscriptions')}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                        {videos.map((video) => (
                            <VideoCardWithHover key={video.id} video={video}/>
                        ))}
                    </div>
                    {hasMore && (
                        <div className="flex justify-center mt-8">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    t('common.loadMore')
                                )}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SubscriptionsPage;
