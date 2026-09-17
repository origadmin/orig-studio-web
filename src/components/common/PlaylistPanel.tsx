import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate} from '@tanstack/react-router';
import {AlignLeft, GalleryHorizontal, Hash, Play, Shuffle} from 'lucide-react';
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
    /** The playlist short_token used to keep the URL context. */
    playlistToken?: string;
}

// BUG-366 correction (G5): the multi-view requirement was FOR THE WATCH PANEL
// — bilibili ss109700 is a watch page and its 集数/标题 toggle lives on the
// watch page. So the panel carries the FULL mode set: compact text rows
// (default, the mainstream treatment), thumbnail rows, and numbered chips.
type PanelView = 'rows' | 'thumbs' | 'chips';
const VIEW_STORAGE_KEY = 'watch.playlistView';
// Like bilibili's 全X话, very long playlists render a capped window first;
// rendering 500 chips up front is wasted work nobody scrolls through.
const INITIAL_VISIBLE = 50;

/**
 * Playlist panel for the watch page sidebar (BUG-197; view modes BUG-366).
 *
 * Three display modes, switchable and persisted (user-level preference):
 *   - `rows`  (DEFAULT): index + title + duration + progress, NO thumbnail —
 *     the treatment every mainstream watch-page playlist panel uses;
 *   - `thumbs`: index + 96px thumbnail + title + duration + progress;
 *   - `chips`: numbered chip grid (bilibili 集数) for jumping long playlists.
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
}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {user} = useAuth();
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const [view, setView] = useState<PanelView>(() => {
        const stored = localStorage.getItem(VIEW_STORAGE_KEY);
        return stored === 'thumbs' || stored === 'chips' ? stored : 'rows';
    });
    const [showAll, setShowAll] = useState(false);
    useEffect(() => {
        localStorage.setItem(VIEW_STORAGE_KEY, view);
    }, [view]);

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
    }, [currentToken, items, view]);

    if (!items || items.length === 0) return null;

    const searchFor = (item: PlaylistMediaItem, index: number) =>
        playlistToken
            ? {v: item.short_token, playlist: playlistToken, index: String(index)}
            : {v: item.short_token};

    const playAt = (index: number) => navigate({
        to: '/watch',
        search: {...searchFor(items[index], index), autoplay: '1'},
    });

    const visible = showAll ? items : items.slice(0, INITIAL_VISIBLE);

    return (
        <div
            data-testid="playlist-panel"
            className="bg-card border border-border rounded-xl flex flex-col max-h-[min(60vh,480px)] overflow-hidden"
        >
            {/* Panel header (BUG-366): identity + count + view toggle + play/shuffle. */}
            <div className="px-4 pt-3 pb-2 shrink-0 space-y-2 border-b border-border">
                <div className="flex items-center justify-between gap-2">
                    {title && (
                        <h3 className="font-bold text-foreground text-sm truncate min-w-0">{title}</h3>
                    )}
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {items.length} {t('common.videos_count')}
                        </span>
                        <div
                            data-testid="playlist-panel-view-switcher"
                            className="flex items-center rounded-md border border-border overflow-hidden"
                        >
                            {([
                                {id: 'rows' as PanelView, icon: AlignLeft, label: '列表'},
                                {id: 'thumbs' as PanelView, icon: GalleryHorizontal, label: '缩略图'},
                                {id: 'chips' as PanelView, icon: Hash, label: '编号'},
                            ]).map(({id, icon: Icon, label}) => (
                                <button
                                    key={id}
                                    type="button"
                                    data-testid={`playlist-panel-view-${id}`}
                                    title={t(`playlists.view_${id}`, label)}
                                    onClick={() => setView(id)}
                                    className={`px-2 py-1 flex items-center transition-colors ${
                                        view === id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5"/>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        data-testid="playlist-panel-play-all"
                        onClick={() => playAt(0)}
                        className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Play className="w-3 h-3" fill="currentColor"/>
                        {t('playlists.playAll', '播放全部')}
                    </button>
                    <button
                        type="button"
                        data-testid="playlist-panel-shuffle"
                        onClick={() => playAt(Math.floor(Math.random() * items.length))}
                        className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <Shuffle className="w-3 h-3"/>
                        {t('playlists.shuffle', '随机播放')}
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                data-testid="playlist-panel-scroll"
                className="relative overflow-y-auto overscroll-contain px-4 pb-4"
            >
                {view === 'rows' && (
                    <div className="space-y-0.5 pt-2" data-testid="playlist-panel-body-rows">
                        {visible.map((item, index) => {
                            const isActive = item.short_token === currentToken;
                            const progress = progressByMediaId.get(item.id) ?? 0;
                            return (
                                <Link
                                    key={item.id}
                                    to="/watch"
                                    search={searchFor(item, index)}
                                    className={`relative flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
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
                                    <div className="flex-1 min-w-0">
                                        <h4
                                            className={`text-sm font-medium truncate ${
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
                                    {item.duration > 0 && (
                                        <span className="text-[11px] text-muted-foreground shrink-0">
                                            {formatDuration(item.duration)}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}

                {view === 'thumbs' && (
                    <div className="space-y-1 pt-2" data-testid="playlist-panel-body-thumbs">
                        {visible.map((item, index) => {
                            const isActive = item.short_token === currentToken;
                            const progress = progressByMediaId.get(item.id) ?? 0;
                            return (
                                <Link
                                    key={item.id}
                                    to="/watch"
                                    search={searchFor(item, index)}
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
                                    <div className="relative w-24 aspect-video rounded overflow-hidden bg-muted shrink-0">
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
                                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                                                {formatDuration(item.duration)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4
                                            className={`text-sm font-medium line-clamp-2 ${
                                                isActive ? 'text-primary' : 'text-foreground'
                                            }`}
                                        >
                                            {item.title}
                                        </h4>
                                        {progress > 0 && (
                                            <div className="mt-1 h-0.5 w-full rounded bg-muted overflow-hidden">
                                                <div className="h-full bg-primary" style={{width: `${progress}%`}}/>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {view === 'chips' && (
                    <div className="flex flex-wrap gap-1.5 pt-3" data-testid="playlist-panel-body-chips">
                        {visible.map((item, index) => {
                            const isActive = item.short_token === currentToken;
                            return (
                                <Link
                                    key={item.id}
                                    to="/watch"
                                    search={searchFor(item, index)}
                                    title={item.title}
                                    className={`h-8 min-w-8 px-2 flex items-center justify-center rounded-md border text-sm transition-colors ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'border-border text-muted-foreground hover:bg-muted'
                                    }`}
                                    data-testid={isActive ? 'playlist-panel-current' : 'playlist-panel-item'}
                                >
                                    {index + 1}
                                </Link>
                            );
                        })}
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
