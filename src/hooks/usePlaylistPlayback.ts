import {useQuery} from '@tanstack/react-query';
import {playlistApi, type PlaylistMediaItem} from '@/lib/api/playlist';

/**
 * Playlist items for the watch page's continuous playback (BUG-197).
 *
 * The playlist is only fetched when a playlist context is present in the URL,
 * so the watch page keeps its current behaviour everywhere else.
 */
export function usePlaylistPlayback(token?: string | null): {
    items: PlaylistMediaItem[];
    title?: string;
    displayMode?: string;
    isLoading: boolean;
} {
    // BUG-368: a DISTINCT key, not ['playlist', token]. The playlist detail page
    // uses that key with a different queryFn shape, so sharing it meant the
    // panel silently consumed the detail page's cached object — displayMode was
    // missing and the panel always fell back to rows, no matter what the
    // publisher had configured.
    const query = useQuery({
        queryKey: ['playlist-playback', token],
        queryFn: async () => {
            const res = await playlistApi.get(token!);
            return {
                title: res?.playlist?.title,
                displayMode: res?.playlist?.display_mode,
                items: res?.playlist?.media_details ?? [],
            };
        },
        enabled: !!token,
    });
    return {
        items: query.data?.items ?? [],
        title: query.data?.title,
        displayMode: query.data?.displayMode,
        isLoading: query.isLoading,
    };
}
