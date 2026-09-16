import React, {useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Check, Loader2, Plus, Search} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {mediaApi, type Media} from '@/lib/api/media';
import {playlistApi} from '@/lib/api/playlist';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {formatDuration} from '@/lib/format';

interface AddVideosDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Playlist database id — the /me/playlists routes take the id, not the token. */
    playlistId: string;
    /** short_tokens already inside the playlist, so they show as added. */
    existingTokens: string[];
    /** Called after a successful add so the caller can refetch the playlist. */
    onChanged: () => void;
}

/**
 * Picker that appends videos to a playlist/series (BUG-197 review feedback:
 * there was no way to edit what a series contains).
 *
 * Videos already in the playlist are marked and cannot be added twice.
 */
export const AddVideosDialog: React.FC<AddVideosDialogProps> = ({
    open,
    onOpenChange,
    playlistId,
    existingTokens,
    onChanged,
}) => {
    const {t} = useTranslation();
    const [keyword, setKeyword] = useState('');
    const [pending, setPending] = useState<string | null>(null);
    const [added, setAdded] = useState<string[]>([]);

    const {data, isLoading} = useQuery({
        queryKey: ['playlist-add-videos'],
        queryFn: async () => {
            const res = await mediaApi.list({page_size: 50});
            return ((res as {items?: Media[]})?.items ?? []) as Media[];
        },
        enabled: open,
    });

    const videos = useMemo(() => {
        const list = data ?? [];
        const kw = keyword.trim().toLowerCase();
        if (!kw) return list;
        return list.filter((m) => (m.title || '').toLowerCase().includes(kw));
    }, [data, keyword]);

    const isIn = (m: Media) => {
        const st = m.short_token;
        return !!st && (existingTokens.includes(st) || added.includes(st));
    };

    const handleAdd = async (m: Media) => {
        const st = m.short_token;
        if (!st || isIn(m)) return;
        try {
            setPending(st);
            await playlistApi.addMedia(playlistId, m.id);
            setAdded((prev) => [...prev, st]);
            onChanged();
        } catch (err) {
            console.error('Failed to add media to playlist:', err);
        } finally {
            setPending(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-lg">
                <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                    <DialogTitle className="text-lg font-semibold">
                        {t('playlists.addVideos', '添加视频到剧集')}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                        {t('playlists.addVideosDesc', '选择要加入该剧集的视频，加入后可按顺序调整。')}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <Input
                            className="pl-9"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder={t('playlists.searchVideos', '搜索视频...')}
                        />
                    </div>
                </div>

                <div className="px-6 pb-6 max-h-[50vh] overflow-y-auto space-y-1">
                    {isLoading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>
                        </div>
                    ) : videos.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            {t('playlists.noVideos', '没有可用视频')}
                        </p>
                    ) : (
                        videos.map((m) => {
                            const inList = isIn(m);
                            return (
                                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                                    <div className="relative w-20 aspect-video rounded overflow-hidden bg-muted shrink-0">
                                        {m.thumbnail ? (
                                            <img
                                                src={getImageUrl(m.thumbnail, 'thumbnail')}
                                                alt={m.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => handleImageError(e, 'thumbnail')}
                                            />
                                        ) : null}
                                        {m.duration > 0 && (
                                            <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 rounded">
                                                {formatDuration(m.duration)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="flex-1 min-w-0 text-sm text-foreground line-clamp-2">{m.title}</span>
                                    <Button
                                        size="sm"
                                        variant={inList ? 'secondary' : 'default'}
                                        disabled={inList || pending === m.short_token}
                                        data-testid={inList ? 'add-video-added' : 'add-video-action'}
                                        onClick={() => handleAdd(m)}
                                    >
                                        {pending === m.short_token
                                            ? <Loader2 className="w-4 h-4 animate-spin"/>
                                            : inList ? <Check className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                                        {inList ? t('playlists.added', '已添加') : t('playlists.add', '添加')}
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddVideosDialog;
