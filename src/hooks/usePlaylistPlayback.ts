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
    isLoading: boolean;
} {
    const query = useQuery({
        queryKey: ['playlist', token],
        queryFn: async () => {
            const res = await playlistApi.get(token!);
            return {
                title: res?.playlist?.title,
                items: res?.playlist?.media_details ?? [],
            };
        },
        enabled: !!token,
    });
    return {items: query.data?.items ?? [], title: query.data?.title, isLoading: query.isLoading};
}
