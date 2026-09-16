import React, {useEffect, useRef} from 'react';
import {Link} from '@tanstack/react-router';
import {Play} from 'lucide-react';
import {type PlaylistMediaItem} from '@/lib/api/playlist';
import {formatDuration} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';

interface PlaylistPanelProps {
    /** Optional panel title; defaults to no header. */
    title?: string;
    items: PlaylistMediaItem[];
    /** The short_token of the currently playing item. */
    currentToken?: string;
    /** The playlist short_token used to keep the URL context. */
    playlistToken?: string;
}

/**
 * Playlist panel for the watch page sidebar (BUG-197).
 *
 * The panel is height-capped and scrolls **inside itself**, so a long playlist
 * never stretches the sidebar (the NextVideo block stays reachable). The header
 * stays pinned while only the item list scrolls, and the playing item is kept
 * within the panel's own scroll viewport.
 */
export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
    title,
    items,
    currentToken,
    playlistToken,
}) => {
    const scrollRef = useRef<HTMLDivElement | null>(null);

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
    }, [currentToken, items]);

    if (!items || items.length === 0) return null;

    return (
        <div
            data-testid="playlist-panel"
            className="bg-card border border-border rounded-xl flex flex-col max-h-[min(60vh,480px)] overflow-hidden"
        >
            {title && (
                <h3 className="font-bold text-foreground text-sm px-4 pt-4 pb-2 shrink-0">{title}</h3>
            )}
            <div
                ref={scrollRef}
                data-testid="playlist-panel-scroll"
                className="relative overflow-y-auto overscroll-contain px-4 pb-4 space-y-1"
            >
                {items.map((item, index) => {
                    const isActive = item.short_token === currentToken;
                    const search = playlistToken
                        ? {v: item.short_token, playlist: playlistToken, index: String(index)}
                        : {v: item.short_token};
                    return (
                        <Link
                            key={item.id}
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
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default PlaylistPanel;
