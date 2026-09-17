/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Playlist Detail Page - displays a single playlist with its videos.
 * Accessed via /playlist/:token (portal, public playlists) or /me/playlists -> click (user's own).
 */

import React, {useState} from 'react';
import {useParams, Link, useNavigate} from '@tanstack/react-router';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {ListVideo, Play, Video, Trash2, Edit3, Globe, Lock, ArrowLeft, MoreHorizontal, Plus, ChevronUp, ChevronDown, Info, Shuffle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {Badge} from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {playlistApi, type Playlist, type PlaylistMediaItem} from '@/lib/api/playlist';
import {formatDate, formatDuration, formatViews} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useAuth} from '@/hooks/useAuth';
import AddVideosDialog from '@/components/playlist/AddVideosDialog';

// BUG-366 (G5 correction): the display mode is a PUBLISHER setting on the
// playlist (edit dialog), not a viewer preference — mainstream logic: the
// presentation travels with the content (YouTube/Netflix). list -> thumbnail
// rows, thumbs -> poster grid, chips -> numbered chips.
type PlaylistDisplayMode = 'list' | 'thumbs' | 'chips';
const DISPLAY_MODES: Array<{id: PlaylistDisplayMode; label: string}> = [
    {id: 'list', label: '列表'},
    {id: 'thumbs', label: '缩略图'},
    {id: 'chips', label: '编号格子'},
];
const normalizeDisplayMode = (v?: string | null): PlaylistDisplayMode =>
    v === 'thumbs' || v === 'chips' ? v : 'list';

const PlaylistDetailPage: React.FC = () => {
    const {token} = useParams({strict: false}) as {token?: string};
    const {t} = useTranslation();
    const {user, isAuthenticated} = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Edit dialog state
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Remove media dialog state
    const [removeMediaId, setRemoveMediaId] = useState<string | null>(null);
    const [isRemovingMedia, setIsRemovingMedia] = useState(false);

    // Add-videos dialog + episode ordering (BUG-197 review feedback: a series
    // used to be editable in name only — its contents could not be changed).
    const [showAddVideos, setShowAddVideos] = useState(false);
    const [isReordering, setIsReordering] = useState(false);

    // display mode being edited in the publisher dialog (defaults to the current one)
    const [editDisplayMode, setEditDisplayMode] = useState<PlaylistDisplayMode>('list');

    const {data: playlistData, isLoading, error} = useQuery({
        queryKey: ['playlist', token],
        queryFn: async () => {
            if (!token) throw new Error('No playlist token provided');
            // playlistApi.get normalizes both contracts (EE root `items`,
            // CE `playlist.media_details`) - see BUG-128.
            return await playlistApi.get(token);
        },
        enabled: !!token,
    });

    const playlist: Playlist | undefined = playlistData?.playlist;
    const isOwner = isAuthenticated && user && playlist && String(user.id) === String(playlist.user_id);
    const mediaItems: PlaylistMediaItem[] = playlistData?.items ?? [];
    // the publisher's chosen presentation drives the whole page (BUG-366)
    const publisherMode = normalizeDisplayMode(playlist?.display_mode);

    // BUG-368: opening an item must CARRY the playlist context, otherwise the
    // watch page has no playlist token, renders no playlist panel and continuous
    // playback is dead (the whole point of BUG-197).
    const itemSearch = (media: PlaylistMediaItem, index: number) => (playlist?.short_token
        ? {v: media.short_token, playlist: playlist.short_token, index: String(index)}
        : {v: media.short_token});

    const handleEdit = () => {
        if (!playlist) return;
        setEditTitle(playlist.title);
        setEditDescription(playlist.description || '');
        setEditIsPublic(playlist.is_public);
        setEditDisplayMode(normalizeDisplayMode(playlist.display_mode));
        setShowEditDialog(true);
    };

    const handleSaveEdit = async () => {
        if (!playlist) return;
        try {
            setIsUpdating(true);
            await playlistApi.update(playlist.id, {
                title: editTitle,
                description: editDescription,
                is_public: editIsPublic,
                display_mode: editDisplayMode,
            });
            setShowEditDialog(false);
            queryClient.invalidateQueries({queryKey: ['playlist', token]});
        } catch (err) {
            console.error('Failed to update playlist:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!playlist) return;
        try {
            setIsDeleting(true);
            await playlistApi.delete(playlist.id);
            setShowDeleteDialog(false);
            if (user?.username) {
                navigate({to: '/$handle', params: {handle: '@' + user.username}, search: {tab: 'playlists'}});
            } else {
                navigate({to: '/me/playlists'});
            }
        } catch (err) {
            console.error('Failed to delete playlist:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRemoveMedia = async () => {
        if (!playlist || !removeMediaId) return;
        try {
            setIsRemovingMedia(true);
            await playlistApi.removeMedia(playlist.id, removeMediaId);
            setRemoveMediaId(null);
            queryClient.invalidateQueries({queryKey: ['playlist', token]});
        } catch (err) {
            console.error('Failed to remove media from playlist:', err);
        } finally {
            setIsRemovingMedia(false);
        }
    };

    // Move an episode one slot up/down, then submit the whole new order as an
    // ordered id list (the backend reorders by that sequence).
    const handleMove = async (from: number, to: number) => {
        if (!playlist || to < 0 || to >= mediaItems.length || from === to) return;
        const next = [...mediaItems];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        try {
            setIsReordering(true);
            await playlistApi.reorderMedia(playlist.id, next.map((m) => m.id));
            queryClient.invalidateQueries({queryKey: ['playlist', token]});
        } catch (err) {
            console.error('Failed to reorder playlist:', err);
        } finally {
            setIsReordering(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner/>
            </div>
        );
    }

    if (error || !playlist) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                <ListVideo size={48} className="mx-auto mb-3 opacity-30"/>
                <p className="text-lg mb-1">{t('playlists.notFound')}</p>
                <p className="text-sm mb-4">{t('playlists.notFoundDesc')}</p>
                {user?.username ? (
                    <Link to="/$handle" params={{handle: '@' + user.username}} search={{tab: 'playlists'}}>
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2"/>
                            {t('playlists.backToList')}
                        </Button>
                    </Link>
                ) : (
                    <Link to="/">
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2"/>
                            {t('playlists.backToList')}
                        </Button>
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        {user?.username ? (
                            <Link
                                to="/$handle"
                                params={{handle: '@' + user.username}}
                                search={{tab: 'playlists'}}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5"/>
                            </Link>
                        ) : (
                            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                                <ArrowLeft className="w-5 h-5"/>
                            </Link>
                        )}
                        <ListVideo size={24} className="text-primary flex-shrink-0"/>
                        <h1 className="text-2xl font-bold text-foreground line-clamp-2">{playlist.title}</h1>
                        <Badge variant={playlist.is_public ? 'default' : 'secondary'} className="flex-shrink-0">
                            {playlist.is_public ? (
                                <><Globe className="w-3 h-3 mr-1"/>{t('common.public')}</>
                            ) : (
                                <><Lock className="w-3 h-3 mr-1"/>{t('common.private')}</>
                            )}
                        </Badge>
                    </div>
                    {playlist.description && (
                        <p className="text-sm text-muted-foreground ml-8">{playlist.description}</p>
                    )}
                    <div className="flex items-center gap-3 ml-8 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Video className="w-4 h-4"/>
                            {mediaItems.length} {t('common.videos_count')}
                        </span>
                        <span>{t('playlists.updated', {date: formatDate(playlist.update_time || playlist.create_time)})}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 ml-8 mt-3">
                        {mediaItems.length > 0 && (
                            <>
                                <Button
                                    data-testid="playlist-play-all"
                                    onClick={() => navigate({
                                        to: '/watch',
                                        search: {
                                            v: mediaItems[0].short_token,
                                            playlist: playlist.short_token,
                                            index: '0',
                                            autoplay: '1',
                                        },
                                    })}
                                    className="gap-2"
                                >
                                    <Play className="w-4 h-4" fill="currentColor"/>
                                    {t('playlists.playAll', '播放全部')}
                                </Button>
                                <Button
                                    variant="outline"
                                    data-testid="playlist-shuffle"
                                    onClick={() => {
                                        // BUG-366: land on a RANDOM episode with the
                                        // playlist context preserved (YouTube's shuffle).
                                        const i = Math.floor(Math.random() * mediaItems.length);
                                        navigate({
                                            to: '/watch',
                                            search: {
                                                v: mediaItems[i].short_token,
                                                playlist: playlist.short_token,
                                                index: String(i),
                                                autoplay: '1',
                                            },
                                        });
                                    }}
                                    className="gap-2"
                                >
                                    <Shuffle className="w-4 h-4"/>
                                    {t('playlists.shuffle', '随机播放')}
                                </Button>
                            </>
                        )}
                        {isOwner && (
                            <Button
                                variant="outline"
                                data-testid="playlist-add-videos"
                                onClick={() => setShowAddVideos(true)}
                                className="gap-2"
                            >
                                <Plus className="w-4 h-4"/>
                                {t('playlists.addVideos', '添加视频到剧集')}
                            </Button>
                        )}
                        {/* Display-mode switcher (BUG-366): a user preference, so it
                            lives in the page header next to the other page-level actions. */}
                        
                    </div>
                </div>

                {/* Owner actions */}
                {isOwner && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid="playlist-owner-menu">
                                <MoreHorizontal className="w-5 h-5"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleEdit} data-testid="playlist-edit-entry">
                                <Edit3 className="w-4 h-4 mr-2"/>
                                {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                                <Trash2 className="w-4 h-4 mr-2"/>
                                {t('common.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Operation manual: how to add / reorder / remove / view the result.
                The user rejected the previous delivery because the editing entry
                points were not discoverable and no acceptance proved the flow. */}
            {isOwner && (
                <div
                    data-testid="playlist-usage-guide"
                    className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
                >
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary"/>
                    <div className="space-y-1">
                        <p className="font-medium text-foreground">{t('playlists.usageTitle', '使用说明')}</p>
                        <ul className="list-disc space-y-0.5 pl-4">
                            <li>{t('playlists.usageAdd', '点击「添加视频到剧集」选择视频加入本剧集。')}</li>
                            <li>{t('playlists.usageReorder', '用每项的「上移 / 下移」调整播放顺序。')}</li>
                            <li>{t('playlists.usageRemove', '用每项的「移除」把视频移出本剧集。')}</li>
                            <li>{t('playlists.usageView', '点击「播放全部」进入观看页，右侧「播放列表」面板按此顺序展示，当前播放项高亮。')}</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Video list — rendered in the PUBLISHER's chosen display mode
                (BUG-366); the owner's reorder controls stay in the list view
                only (ordering has no meaning in grids). */}
            {mediaItems.length > 0 ? (
                <>
                    {publisherMode === 'list' && (
                        <div className="space-y-2" data-testid="playlist-body-list">
                    {mediaItems.map((media, index) => (
                        <div
                            key={media.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border hover:shadow-md transition-all group"
                        >
                            {/* Index */}
                            <span className="text-sm text-muted-foreground w-6 text-center flex-shrink-0">{index + 1}</span>

                            {/* Thumbnail */}
                            <Link to="/watch" search={itemSearch(media, index)} className="flex-shrink-0">
                                <div className="relative w-40 aspect-video rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    {media.thumbnail ? (
                                        <img
                                            src={getImageUrl(media.thumbnail, 'thumbnail')}
                                            alt={media.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => handleImageError(e, 'thumbnail')}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Play className="w-8 h-8 text-gray-300 dark:text-gray-600"/>
                                        </div>
                                    )}
                                    {media.duration > 0 && (
                                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                                            {formatDuration(media.duration)}
                                        </div>
                                    )}
                                    {/* Hover play overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                        <Play className="w-8 h-8 text-white" fill="currentColor"/>
                                    </div>
                                </div>
                            </Link>

                            {/* Info */}
                            <Link to="/watch" search={itemSearch(media, index)} className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors">
                                    {media.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>{formatViews(media.view_count)} {t('common.views')}</span>
                                    <span>{formatDate(media.create_time)}</span>
                                </div>
                            </Link>

                            {/* Episode ordering + removal (owner only). Kept always
                                visible instead of hover-only, so the series clearly
                                reads as editable. */}
                            {isOwner && (
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground"
                                        disabled={index === 0 || isReordering}
                                        onClick={() => handleMove(index, index - 1)}
                                        title={t('playlists.moveUp', '上移')}
                                        data-testid="playlist-move-up"
                                    >
                                        <ChevronUp className="w-4 h-4"/>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground"
                                        disabled={index === mediaItems.length - 1 || isReordering}
                                        onClick={() => handleMove(index, index + 1)}
                                        title={t('playlists.moveDown', '下移')}
                                        data-testid="playlist-move-down"
                                    >
                                        <ChevronDown className="w-4 h-4"/>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => setRemoveMediaId(media.id)}
                                        title={t('playlists.removeVideo')}
                                        data-testid="playlist-remove-video"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                        </div>
                    )}

                    {/* Poster grid: thumbnail cards with an index badge. */}
                    {publisherMode === 'thumbs' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" data-testid="playlist-body-grid">
                            {mediaItems.map((media, index) => (
                                <Link
                                    key={media.id}
                                    to="/watch"
                                    search={itemSearch(media, index)}
                                    className="group rounded-lg overflow-hidden border border-border bg-card hover:shadow-md transition-all"
                                >
                                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                                        {media.thumbnail ? (
                                            <img
                                                src={getImageUrl(media.thumbnail, 'thumbnail')}
                                                alt={media.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => handleImageError(e, 'thumbnail')}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Play className="w-8 h-8 text-gray-300 dark:text-gray-600"/>
                                            </div>
                                        )}
                                        <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                            {index + 1}
                                        </span>
                                        {media.duration > 0 && (
                                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                                                {formatDuration(media.duration)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <h3 className="text-sm font-medium text-foreground line-clamp-2">{media.title}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">{formatViews(media.view_count)} {t('common.views')}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Numbered chips: the densest mode (bilibili 集数), built for
                        jumping around long playlists. */}
                    {publisherMode === 'chips' && (
                        <div className="flex flex-wrap gap-2" data-testid="playlist-body-chips">
                            {mediaItems.map((media, index) => (
                                <Link
                                    key={media.id}
                                    to="/watch"
                                    search={itemSearch(media, index)}
                                    title={media.title}
                                    className="h-9 w-9 flex items-center justify-center rounded-md border border-border text-sm text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                >
                                    {index + 1}
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 text-muted-foreground">
                    <Video size={48} className="mx-auto mb-3 opacity-30"/>
                    <p className="text-lg mb-1">{t('playlists.emptyPlaylist')}</p>
                    <p className="text-sm">{t('playlists.emptyPlaylistDesc')}</p>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('playlists.editPlaylist')}</DialogTitle>
                        <DialogDescription>
                            {t('playlists.editPlaylistDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">{t('playlists.title')}</label>
                            <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder={t('playlists.titlePlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{t('playlists.description')}</label>
                            <Input
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder={t('playlists.descriptionPlaceholder')}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="edit-is-public"
                                checked={editIsPublic}
                                onChange={(e) => setEditIsPublic(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="edit-is-public" className="text-sm">
                                {t('playlists.makePublic')}
                            </label>
                        </div>
                        {/* BUG-366: the publisher chooses how viewers see this
                            playlist everywhere (watch panel included) — there is
                            deliberately NO viewer-side display switcher. */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">
                                {t('playlists.displayMode', '显示方式')}
                            </label>
                            <div className="flex items-center gap-2" data-testid="playlist-display-mode">
                                {DISPLAY_MODES.map(({id, label}) => (
                                    <button
                                        key={id}
                                        type="button"
                                        data-testid={`playlist-display-mode-${id}`}
                                        onClick={() => setEditDisplayMode(id)}
                                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                                            editDisplayMode === id
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'border-border text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {t(`playlists.displayMode_${id}`, label)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isUpdating}>
                            {t('common.cancel')}
                        </Button>
                        <Button data-testid="playlist-edit-save" onClick={handleSaveEdit} disabled={!editTitle.trim() || isUpdating}
                                className="bg-primary hover:bg-primary/90">
                            {isUpdating ? <Spinner className="w-4 h-4 mr-1"/> : null}
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('playlists.deletePlaylist')}</DialogTitle>
                        <DialogDescription>
                            {t('playlists.deleteConfirm')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <Spinner className="w-4 h-4 mr-1"/> : null}
                            {t('common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Media Dialog */}
            <Dialog open={!!removeMediaId} onOpenChange={() => setRemoveMediaId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('playlists.removeVideo')}</DialogTitle>
                        <DialogDescription>
                            {t('playlists.removeVideoConfirm')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemoveMediaId(null)} disabled={isRemovingMedia}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleRemoveMedia} disabled={isRemovingMedia}>
                            {isRemovingMedia ? <Spinner className="w-4 h-4 mr-1"/> : null}
                            {t('common.remove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AddVideosDialog
                open={showAddVideos}
                onOpenChange={setShowAddVideos}
                playlistId={playlist.id}
                existingTokens={mediaItems.map((m) => m.short_token)}
                onChanged={() => queryClient.invalidateQueries({queryKey: ['playlist', token]})}
            />
        </div>
    );
};

export default PlaylistDetailPage;
