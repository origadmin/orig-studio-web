import React from 'react';
import {Link} from '@tanstack/react-router';
import {useQuery} from '@tanstack/react-query';
import {Tag as TagIcon, ArrowLeft, Hash} from 'lucide-react';
import {Spinner} from '@/components/ui/spinner';
import {useTranslation} from 'react-i18next';
import {useMediaList} from '@/hooks/queries';
import {tagApi} from '@/lib/api/tag';
import type {Media} from '@/lib/api/media';
import {colorFromName} from '@/lib/utils/tag-color';
import VideoCard from '@/components/common/VideoCard';

interface TagDetailViewProps {
    /** Tag slug as it appears in the URL: /tags?tag={slug} */
    slug: string;
}

/**
 * Tag detail view — rendered inside the /tags collection page when a
 * ?tag={slug} filter is active (URL standard: collection pages use
 * plural + query filter, see docs/meta/STANDARDS.md).
 */
const TagDetailView = ({slug}: TagDetailViewProps) => {
    const {t} = useTranslation();

    // Resolve the tag by slug to obtain its canonical title (used for media filtering).
    // If the slug does not resolve (e.g. non-ASCII tag whose slug is Base58 on the
    // backend), fall back to using the raw slug as the filter term.
    const {data: tag, isFetched: tagFetched} = useQuery({
        queryKey: ['tag', slug],
        queryFn: () => tagApi.get(slug),
        retry: false,
    });

    const tagTitle = tag?.title ?? slug;

    // BUG-171b: nothing derived from the slug may be painted before the tag
    // query settles. `tagTitle` falls back to the raw slug, and `colorFromName`
    // hashes it into a *different* palette entry than the real title
    // ('2zrbYkYek' -> green, '视频' -> another hue), so rendering early caused a
    // visible two-step flash: green "2zrbYkYek" -> recoloured "视频".
    const tagResolved = tagFetched;
    const tagColor = tagResolved ? (tag?.color || colorFromName(tagTitle)) : undefined;

    // BUG-171: the backend filters media by jsonb tag TITLE, not by slug. The
    // title is only known after the tag query settles, so the media query must
    // stay disabled until then — otherwise the first render fires
    // `?tags={slug}` (0 results, flash of the empty state) before refetching
    // with the correct title.
    const {data: mediaData, isLoading, error} = useMediaList({
        page: 1,
        page_size: 24,
        tags: [tagTitle],
        enabled: tagFetched,
    });

    const items = mediaData?.items || [];

    // BUG-158: a tag may exist in media.tags (jsonb) but have no content_tags row
    // (GET /api/v1/tags/{slug} → 404). That is NOT fatal: fall back to filtering
    // media by the raw slug and still render the grid. Only a real media-query
    // failure or empty result shows an error/empty state.

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link to="/tags" className="text-muted-foreground hover:text-foreground transition-colors" aria-label={t('common.back')}>
                    <ArrowLeft size={22}/>
                </Link>
                <div className="flex items-center gap-2 min-w-0">
                    <span
                        className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${tagResolved ? '' : 'bg-muted animate-pulse text-muted-foreground'}`}
                        style={tagResolved ? {backgroundColor: `${tagColor}1A`, color: tagColor} : undefined}
                    >
                        <Hash size={18}/>
                    </span>
                    <div className="min-w-0">
                        {tagResolved ? (
                            <h1 className="text-2xl font-bold text-foreground truncate" style={{color: tagColor}}>
                                {tagTitle}
                            </h1>
                        ) : (
                            // Skeleton, not the slug: painting the slug here is what produced
                            // the "green 2zrbYkYek -> 视频" flash (BUG-171b).
                            <div
                                className="h-8 w-40 max-w-full rounded bg-muted animate-pulse"
                                role="status"
                                aria-label={t('common.loading', 'Loading')}
                            />
                        )}
                        {tag?.description && (
                            <p className="text-sm text-muted-foreground truncate">{tag.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {!tagResolved || isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Spinner/>
                </div>
            ) : error ? (
                <div className="py-20 text-center text-muted-foreground">
                    <p>{(error as Error).message || t('common.error')}</p>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <TagIcon size={48} className="mx-auto mb-3 opacity-30"/>
                    <p>{t('tag.noVideos', '该标签下暂无视频')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                    {items.map((media: Media) => (
                        <VideoCard key={media.id} media={media} size="md"/>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagDetailView;
