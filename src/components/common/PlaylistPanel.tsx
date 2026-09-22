import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate} from '@tanstack/react-router';
import {Play} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {type PlaylistMediaItem} from '@/lib/api/playlist';
import {formatDuration} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useHistoryList} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';

interface PlaylistPanelProps {
    /** Optional panel title; defaults to no header. */
    title?: string;
    items: PlaylistMediaItem[];
    /** The short_token of the currently playing item. */
    currentToken?: string;
    /**
     * The playlist short_token used to keep the URL context.
     *
     * Kept as the prop name for the playlist case, but the context is now
     * generic: a panel may be a playlist OR a series (2026-09-21 ruling). Both
     * are carried the same way — clicking an item inside the panel must stay
     * inside its own list, and the list must outlive the navigation.
     */
    playlistToken?: string;
    /**
     * Which URL parameter `playlistToken` maps to. A series context has to be
     * written back as `?series=`, not `?playlist=`, otherwise the next page
     * resolves its context from the wrong field and the panel breaks apart
     * mid-playback (Group D gap: in-panel navigation used to hardcode
     * `playlist`).
     */
    contextKind?: 'playlist' | 'series';
    /**
     * BUG-373: the display mode is a PUBLISHER setting stored on the playlist
     * ('list' | 'thumbs' | 'chips') and it only drives THIS panel — the watch
     * page's right-hand playlist panel. Viewers cannot restyle it: there is
     * deliberately no viewer-side switcher and no localStorage view preference
     * (mainstream logic: YouTube/Netflix render the publisher's presentation).
     */
    publisherMode?: string;
}

// Very long playlists render a capped window first; rendering 500 chips up
// front is wasted work nobody scrolls through (bilibili 全X话 treatment).
const INITIAL_VISIBLE = 50;

/** The /watch search params this panel navigates with (route-typed). */
interface WatchSearch {
    v: string;
    playlist?: string;
    series?: string;
    index?: string;
    autoplay?: string;
}

interface PanelRowProps {
    item: PlaylistMediaItem;
    index: number;
    isActive: boolean;
    /** Watch progress ratio (0-100). 0 means "not watched yet". */
    progress: number;
    /** The /watch search params that keep the playlist context. */
    search: WatchSearch;
    /**
     * Width class of the thumbnail box. Undefined renders the COMPACT TEXT row
     * (publisher `list`): no thumbnail at all, duration as plain text on the
     * right. A class renders the THUMBNAIL row (publisher `thumbs`).
     */
    thumbWidth?: string;
}

/**
 * One playlist row, shared by the `list` and `thumbs` modes so the two cannot
 * silently drift apart again (they used to differ by a single w-20 / w-24
 * class, which is no difference at all — BUG-373).
 *
 * The watched-progress bar is kept in BOTH modes: it is the "which episode am
 * I on" cue and must never be dropped.
 */
const PanelRow: React.FC<PanelRowProps> = ({
    item,
    index,
    isActive,
    progress,
    search,
    thumbWidth,
}) => (
    <Link
        to="/watch"
        search={search}
        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
            isActive
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-muted'
        }`}
        data-testid={isActive ? 'playlist-panel-current' : 'playlist-panel-item'}
    >
        <span
            className={`text-xs font-medium w-5 text-center shrink-0 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
        >
            {index + 1}
        </span>
        {thumbWidth && (
            <div className={`relative ${thumbWidth} aspect-video rounded overflow-hidden bg-muted shrink-0`}>
                {item.thumbnail ? (
                    <img
                        src={getImageUrl(item.thumbnail, 'thumbnail')}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, 'thumbnail')}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-muted-foreground"/>
                    </div>
                )}
                {item.duration > 0 && (
                    <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 rounded">
                        {formatDuration(item.duration)}
                    </div>
                )}
            </div>
        )}
        <div className="flex-1 min-w-0">
            <h4
                className={`text-sm font-medium line-clamp-2 ${
                    isActive ? 'text-primary' : 'text-foreground'
                }`}
            >
                {item.title}
            </h4>
            {/* watched progress — the "which episode am I on" cue */}
            {progress > 0 && (
                <div className="mt-1 h-0.5 w-full rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{width: `${progress}%`}}/>
                </div>
            )}
        </div>
        {/* Compact text rows carry no thumbnail, so the duration has to be
            readable as text on the right-hand side instead. */}
        {!thumbWidth && item.duration > 0 && (
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {formatDuration(item.duration)}
            </span>
        )}
    </Link>
);

/**
 * Playlist panel for the watch page sidebar (BUG-197; view modes BUG-366/373).
 *
 * The publisher's display_mode drives the rendering:
 *   - `list`   (DEFAULT): COMPACT TEXT rows — index + title + duration text +
 *     watched-progress bar. No thumbnails, so a long series stays scannable.
 *   - `thumbs`: THUMBNAIL rows — a large poster + title + duration badge +
 *     progress bar.
 *   - `chips` : numbered chip grid (bilibili 集数) for jumping long playlists,
 *     with a watched dot and the current episode's title spelled out above the
 *     grid (a bare number grid cannot answer "what am I watching").
 *
 * The mode is set by the PUBLISHER on the playlist and travels with it — the
 * viewer never restyles it (no switcher, no localStorage preference).
 *
 * The panel is height-capped and scrolls **inside itself**, so a long playlist
 * never stretches the sidebar (the NextVideo block stays reachable). The header
 * stays pinned while only the item list scrolls, and the playing item is kept
 * within the panel's own scroll viewport (BUG-197, unchanged).
 */
export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
    title,
    items,
    currentToken,
    playlistToken,
    contextKind = 'playlist',
    publisherMode,
}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {user} = useAuth();
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const [showAll, setShowAll] = useState(false);

    // Watch progress per item, best effort: matched by media id from the
    // existing history endpoint. Absent history simply means no bar.
    const {data: historyData} = useHistoryList({
        page: 1,
        page_size: 100,
        isAuthenticated: !!user,
        userId: user?.id,
    });
    const progressByMediaId = useMemo(() => {
        const map = new Map<string, number>();
        const history = historyData?.items || [];
        for (const h of history) {
            const ratio = h.duration_seconds > 0
                ? Math.min(100, (h.progress_seconds / h.duration_seconds) * 100)
                : 0;
            if (ratio > 0) map.set(h.content_id, ratio);
        }
        return map;
    }, [historyData]);

    // Keep the playing item visible inside the panel's own scroll area without
    // scrolling the page (the list may be long and the user can jump to any
    // episode, including the last one).
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const active = container.querySelector<HTMLElement>('[data-testid="playlist-panel-current"]');
        if (!active) return;
        const top = active.offsetTop;
        const bottom = top + active.offsetHeight;
        if (top < container.scrollTop) {
            container.scrollTop = top;
        } else if (bottom > container.scrollTop + container.clientHeight) {
            container.scrollTop = bottom - container.clientHeight;
        }
    }, [currentToken, items, publisherMode]);

    if (!items || items.length === 0) return null;

    // Build the /watch search for an item, carrying the context forward so
    // clicking an item stays inside the same list (Group D gap: this used to
    // hardcode `playlist`, which silently dropped a series context and made the
    // panel disappear one click later).
    const searchFor = (item: PlaylistMediaItem, index: number): WatchSearch => {
        if (!playlistToken) return {v: item.short_token};
        return contextKind === 'series'
            ? {v: item.short_token, series: playlistToken, index: String(index)}
            : {v: item.short_token, playlist: playlistToken, index: String(index)};
    };

    const playAt = (index: number) => navigate({
        to: '/watch',
        search: {...searchFor(items[index], index), autoplay: '1'} as never,
    });

    // The publisher's choice drives the rendering; anything unknown falls back
    // to the publisher's default `list` so the configured presentation is
    // always honored on Watch.
    const mode = publisherMode === 'thumbs' || publisherMode === 'chips' ? publisherMode : 'rows';
    const visible = showAll ? items : items.slice(0, INITIAL_VISIBLE);

    // Chips carry numbers only, so the panel has to spell out what is playing.
    const currentIndex = items.findIndex((item) => item.short_token === currentToken);
    const currentItem = currentIndex >= 0 ? items[currentIndex] : undefined;

    return (
        <div
            data-testid="playlist-panel"
            className="bg-card border border-border rounded-xl flex flex-col max-h-[min(60vh,480px)] overflow-hidden"
        >
            {/* Panel header: identity + play. The per-item count carried no
                action and was removed; the slot now holds the play button
                (option-3 cleanup, BUG-372 tracks the shuffle/loop redesign). */}
            <div className="px-4 pt-3 pb-2 shrink-0 border-b border-border">
                <div className="flex items-center justify-between gap-2">
                    {title && (
                        <h3 className="font-bold text-foreground text-sm truncate min-w-0">{title}</h3>
                    )}
                    <button
                        type="button"
                        data-testid="playlist-panel-play-all"
                        onClick={() => playAt(0)}
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 ml-auto"
                    >
                        <Play className="w-3 h-3" fill="currentColor"/>
                        {t('playlists.playAll', '播放全部')}
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                data-testid="playlist-panel-scroll"
                className="relative overflow-y-auto overscroll-contain px-4 pb-4"
            >
                {/* `list` (publisher default): compact text rows, no thumbnail.
                    Keeps a long series scannable; the duration moves to the
                    right as text and the progress bar stays under the title. */}
                {mode === 'rows' && (
                    <div className="space-y-0.5 pt-2" data-testid="playlist-panel-body-rows">
                        {visible.map((item, index) => (
                            <PanelRow
                                key={item.id}
                                item={item}
                                index={index}
                                isActive={item.short_token === currentToken}
                                progress={progressByMediaId.get(item.id) ?? 0}
                                search={searchFor(item, index)}
                            />
                        ))}
                    </div>
                )}

                {/* `thumbs`: the same row with a large poster (w-28) — the
                    difference to `list` has to be visible, not a w-20/w-24
                    nudge (BUG-373). */}
                {mode === 'thumbs' && (
                    <div className="space-y-1 pt-2" data-testid="playlist-panel-body-thumbs">
                        {visible.map((item, index) => (
                            <PanelRow
                                key={item.id}
                                item={item}
                                index={index}
                                isActive={item.short_token === currentToken}
                                progress={progressByMediaId.get(item.id) ?? 0}
                                search={searchFor(item, index)}
                                thumbWidth="w-28"
                            />
                        ))}
                    </div>
                )}

                {/* `chips`: numbered grid for jumping around long playlists.
                    A bare number grid loses two cues, so both are added back:
                    a dot on the episodes already watched, and the current
                    episode's title spelled out above the grid. */}
                {mode === 'chips' && (
                    <div className="pt-2">
                        {currentItem && (
                            <p
                                data-testid="playlist-panel-chips-now"
                                className="pb-2 text-xs text-muted-foreground line-clamp-1"
                            >
                                {t('playlists.nowPlaying', '正在播放：第 {{n}} 集 · {{title}}', {
                                    n: currentIndex + 1,
                                    title: currentItem.title,
                                })}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-1.5" data-testid="playlist-panel-body-chips">
                            {visible.map((item, index) => {
                                const isActive = item.short_token === currentToken;
                                const watched = (progressByMediaId.get(item.id) ?? 0) > 0;
                                return (
                                    <Link
                                        key={item.id}
                                        to="/watch"
                                        search={searchFor(item, index)}
                                        title={watched ? `${item.title}（已观看）` : item.title}
                                        className={`relative h-8 min-w-8 px-2 flex items-center justify-center rounded-md border text-sm transition-colors ${
                                            isActive
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : watched
                                                    ? 'border-primary/40 text-foreground hover:bg-muted'
                                                    : 'border-border text-muted-foreground hover:bg-muted'
                                        }`}
                                        data-testid={isActive ? 'playlist-panel-current' : 'playlist-panel-item'}
                                    >
                                        {index + 1}
                                        {/* watched marker — the grid shows numbers
                                            only, so progress needs its own cue */}
                                        {watched && !isActive && (
                                            <span
                                                data-testid="playlist-panel-chip-watched"
                                                className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary"
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {items.length > INITIAL_VISIBLE && !showAll && (
                    <button
                        type="button"
                        data-testid="playlist-panel-show-all"
                        onClick={() => setShowAll(true)}
                        className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-md hover:bg-muted transition-colors"
                    >
                        {t('playlists.showAll', '显示全部 {{count}} 个', {count: items.length})}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PlaylistPanel;
