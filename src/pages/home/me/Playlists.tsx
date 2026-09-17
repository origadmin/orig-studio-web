/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 *
 * My Playlists — the CONTENT of the profile "My Playlists" tab.
 *
 * BUG-363: a tab renders content only. This component used to draw its own page
 * chrome (a "My Playlists" h1 + list count + a "New List" button) and a second
 * create button in the empty state, so the tab carried its own management
 * surface next to the profile's header actions — and the two disagreed. The
 * create action now lives in the profile Manage menu (CreatePlaylistDialog);
 * what remains here is the list plus per-item actions, like every other tab.
 */

import React, {useState} from 'react';
import {ListVideo, Play, Video, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/hooks/useAuth';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {playlistApi, type Playlist} from '@/lib/api/playlist';
import {formatDate} from '@/lib/format';
import {Spinner} from '@/components/ui/spinner';
import {Link} from '@tanstack/react-router';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const PlaylistsPage = () => {
    const {t} = useTranslation();
    const {user} = useAuth();
    const queryClient = useQueryClient();

    // Delete dialog state
    const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const {data, isLoading, error} = useQuery({
        queryKey: ['playlists', user?.id],
        queryFn: async () => {
            if (!user) throw new Error('User not logged in');
            const response = await playlistApi.getMyPlaylists();
            return response.items || [];
        },
        enabled: !!user
    });

    const playlists: Playlist[] = data || [];

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setIsDeleting(true);
            await playlistApi.delete(deleteTarget.id);
            setDeleteTarget(null);
            queryClient.invalidateQueries({queryKey: ['playlists', user?.id]});
        } catch (err) {
            console.error('Failed to delete playlist:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const visibilityLabel = (v: string) => {
        const map: Record<string, string> = {
            public: t('common.public'),
            private: t('common.private'),
            unlisted: t('common.unlisted')
        };
        return map[v] || v;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                <ListVideo size={48} className="mx-auto mb-3 opacity-30"/>
                <p className="text-lg mb-1">{t('playlists.empty')}</p>
                <p className="text-sm">{t('playlists.emptyDesc')}</p>
            </div>
        );
    }

    if (playlists.length === 0) {
        // No CTA here on purpose: the create entry is a page-level action and
        // lives in the profile Manage menu, so the tab stays content-only.
        return (
            <div data-testid="playlist-empty-state" className="text-center py-20 text-muted-foreground">
                <ListVideo size={48} className="mx-auto mb-3 opacity-30"/>
                <p data-testid="playlist-empty-text" className="text-lg mb-1">{t('playlists.empty')}</p>
                <p className="text-sm">{t('playlists.emptyDesc')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div
                data-testid="playlist-grid"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6"
            >
                {playlists.map((pl) => (
                    <div
                        key={pl.id}
                        data-testid="playlist-card"
                        className="bg-card rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all group relative"
                    >
                        {/* Cover - clickable to detail */}
                        <Link to="/playlist/$token" params={{token: pl.short_token || pl.id}}>
                            <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <ListVideo size={48} className="text-gray-300 dark:text-gray-600"/>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                    <Video size={14} className="text-white/80"/>
                                    <span
                                        className="text-white text-sm">{pl.media_count ?? pl.media_items?.length ?? 0} {t('common.videos_count')}</span>
                                </div>
                                <div className="absolute top-3 right-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        pl.is_public
                                            ? 'bg-primary/80 text-white'
                                            : 'bg-gray-600/80 text-white'
                                    }`}>
                                        {visibilityLabel(pl.is_public ? 'public' : 'private')}
                                    </span>
                                </div>
                                {/* Play all overlay */}
                                <div
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div
                                        className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                        <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Info */}
                        <div className="p-4">
                            <Link to="/playlist/$token" params={{token: pl.short_token || pl.id}}>
                                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors cursor-pointer">
                                    {pl.title}
                                </h3>
                            </Link>
                            <p className="text-sm text-muted-foreground line-clamp-2">{pl.description}</p>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-muted-foreground">{t('playlists.updated', {date: formatDate(pl.update_time)})}</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid="playlist-delete-btn"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleteTarget(pl)}
                                    title={t('common.delete')}
                                >
                                    <Trash2 className="w-3.5 h-3.5"/>
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Delete Playlist Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-md" data-testid="delete-playlist-dialog">
                    <DialogHeader>
                        <DialogTitle>{t('playlists.deletePlaylist')}</DialogTitle>
                        <DialogDescription>
                            {t('playlists.deleteConfirm', {title: deleteTarget?.title}) || `Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <Spinner className="w-4 h-4 mr-1"/> : null}
                            {t('common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PlaylistsPage;
