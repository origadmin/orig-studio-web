import React, {useState, useEffect} from 'react';
import {
    ThumbsUp,
    ThumbsDown,
    Share2,
    MessageCircle,
    Loader2,
    Bookmark,
    Download,
    LogIn,
    Check,
    BookmarkPlus,
    Flag
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {formatViews} from '@/lib/format';
import {mediaApi, publicMediaApi, LikeResponse, FavoriteResponse, ShareResponse} from '@/lib/api/media';
import {playlistApi} from '@/lib/api/playlist';
import {useAuth} from '@/hooks/useAuth';
import {useNavigate} from '@tanstack/react-router';
import {toast} from 'sonner';
import ReportDialog from '@/components/common/ReportDialog';
import ShareDialog from '@/components/common/ShareDialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InteractionBarProps {
    mediaId: string;
    shortToken?: string;  // 可选：使用 short_token 调用 publicMediaApi (推荐)
    commentCount?: number;
    onCommentClick?: () => void;
    isOwner?: boolean;    // 当前登录用户是否为该视频 owner，用于隐藏"举报"入口
}

const InteractionBar: React.FC<InteractionBarProps> = ({mediaId, shortToken, commentCount = 0, onCommentClick, isOwner = false}) => {
    const {t} = useTranslation();
    const {isAuthenticated} = useAuth();
    const navigate = useNavigate();

    // 决定使用哪个 API：优先使用 publicMediaApi (short_token based)
    const usePublicApi = !!shortToken && shortToken.trim().length > 0;
    const apiIdentifier = (shortToken && shortToken.trim()) || mediaId;

    // Like state
    const [likeCount, setLikeCount] = useState(0);
    const [dislikeCount, setDislikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isDisliking, setIsDisliking] = useState(false);

    // Favorite state
    const [favoriteCount, setFavoriteCount] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false);
    const [isFavoriting, setIsFavoriting] = useState(false);

    // Share state
    const [isSharing, setIsSharing] = useState(false);
    const [shareData, setShareData] = useState<ShareResponse | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // Save/Playlist state
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
    const [addedPlaylistIds, setAddedPlaylistIds] = useState<Set<string>>(new Set());
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Download state
    const [isDownloading, setIsDownloading] = useState(false);

    // Login dialog
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [loginAction, setLoginAction] = useState<string>('');

    // Report dialog
    const [showReportDialog, setShowReportDialog] = useState(false);

    // Fetch initial status
    useEffect(() => {
        if (!apiIdentifier) return;

        const fetchStatus = async () => {
            try {
                // Fetch like status - 优先使用 publicMediaApi
                const likeStatus: LikeResponse = usePublicApi
                    ? await publicMediaApi.likes.getStatus(apiIdentifier)
                    : await mediaApi.likes.getStatus(mediaId);
                // BUG-147: 后端 int64 经 proto JSON 序列化为字符串，必须转 number，
                // 否则 "0" + 1 = "01"（字符串拼接）。dislike/favorite 同理。
                setLikeCount(Number(likeStatus.like_count) || 0);
                setDislikeCount(Number(likeStatus.dislike_count) || 0);
                setIsLiked(likeStatus.is_liked);
                setIsDisliked(likeStatus.is_disliked);
            } catch (err) {
                console.error('Failed to fetch like status:', err);
            }

            try {
                // Fetch favorite status - 优先使用 publicMediaApi
                const favStatus: FavoriteResponse = usePublicApi
                    ? await publicMediaApi.favorites.getStatus(apiIdentifier)
                    : await mediaApi.favorites.getStatus(mediaId);
                setFavoriteCount(Number(favStatus.favorite_count) || 0);
                setIsFavorited(favStatus.is_favorited);
            } catch (err) {
                console.error('Failed to fetch favorite status:', err);
            }
        };

        fetchStatus();
    }, [apiIdentifier, usePublicApi, mediaId]);

    const requireAuth = (action: string): boolean => {
        if (!isAuthenticated) {
            setLoginAction(action);
            setShowLoginDialog(true);
            return false;
        }
        return true;
    };

    const handleLike = async () => {
        if (!requireAuth('like')) return;
        if (isLiking) return; // 防止重复点击

        try {
            setIsLiking(true);

            // 乐观更新：立即更新 UI
            const prevLiked = isLiked;
            const prevDisliked = isDisliked;
            const prevLikeCount = likeCount;
            const prevDislikeCount = dislikeCount;

            if (isLiked) {
                // 取消点赞
                setIsLiked(false);
                setLikeCount(Math.max(0, prevLikeCount - 1));
            } else {
                // 点赞（如果之前是踩，先取消踩）
                setIsLiked(true);
                setLikeCount(prevLikeCount + 1);
                if (isDisliked) {
                    setIsDisliked(false);
                    setDislikeCount(Math.max(0, prevDislikeCount - 1));
                }
            }

            // 调用 API
            const response: LikeResponse = usePublicApi
                ? await publicMediaApi.likes.toggle(apiIdentifier)
                : await mediaApi.likes.toggle(mediaId);

            // 使用服务器返回的最终状态更新
            setLikeCount(Number(response.like_count) || 0);
            setDislikeCount(Number(response.dislike_count) || 0);
            setIsLiked(response.is_liked);
            setIsDisliked(response.is_disliked);
        } catch (err) {
            console.error('Failed to toggle like:', err);
            // 回滚到之前的状态（乐观更新失败）
            // 注意：这里简化处理，实际应该保存 prevValues 并回滚
        } finally {
            setIsLiking(false);
        }
    };

    const handleDislike = async () => {
        if (!requireAuth('dislike')) return;
        if (isDisliking) return; // 防止重复点击

        try {
            setIsDisliking(true);

            // 乐观更新：立即更新 UI
            if (isDisliked) {
                // 取消点踩
                setIsDisliked(false);
                setDislikeCount(Math.max(0, dislikeCount - 1));
            } else {
                // 点踩（如果之前是赞，先取消赞）
                setIsDisliked(true);
                setDislikeCount(dislikeCount + 1);
                if (isLiked) {
                    setIsLiked(false);
                    setLikeCount(Math.max(0, likeCount - 1));
                }
            }

            // 调用 API
            const response: LikeResponse = usePublicApi
                ? await publicMediaApi.likes.toggleDislike(apiIdentifier)
                : await mediaApi.likes.toggleDislike(mediaId);

            // 使用服务器返回的最终状态更新
            setLikeCount(Number(response.like_count) || 0);
            setDislikeCount(Number(response.dislike_count) || 0);
            setIsLiked(response.is_liked);
            setIsDisliked(response.is_disliked);
        } catch (err) {
            console.error('Failed to toggle dislike:', err);
        } finally {
            setIsDisliking(false);
        }
    };

    const handleFavorite = async () => {
        if (!requireAuth('favorite')) return;

        try {
            setIsFavoriting(true);
            // 使用 publicMediaApi 或 mediaApi
            const response: FavoriteResponse = usePublicApi
                ? await publicMediaApi.favorites.toggle(apiIdentifier)
                : await mediaApi.favorites.toggle(mediaId);
            setFavoriteCount(response.favorite_count);
            setIsFavorited(response.is_favorited);
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        } finally {
            setIsFavoriting(false);
        }
    };

    const handleShare = async () => {
        // 立即打开弹窗：避免后端接口异常/超时时"连弹窗都不出现"
        setShowShareModal(true);
        setIsSharing(true);
        try {
            // 使用 publicMediaApi 或 mediaApi
            const response: ShareResponse = usePublicApi
                ? await publicMediaApi.shares.getShareUrl(apiIdentifier)
                : await mediaApi.shares.getShareUrl(mediaId);
            setShareData(response);
        } catch (err) {
            console.error('Failed to get share URL:', err);
            // 兜底：用当前页面地址作为分享链接，保证复制/原生分享仍可用
            setShareData({
                url: typeof window !== 'undefined' ? window.location.href : '',
                title: typeof document !== 'undefined' ? document.title : '',
            } as ShareResponse);
        } finally {
            setIsSharing(false);
        }
    };

    const handleCopyLink = async () => {
        if (shareData?.url) {
            try {
                await navigator.clipboard.writeText(shareData.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share && shareData) {
            try {
                await navigator.share({
                    title: shareData.title,
                    url: shareData.url,
                });
            } catch (err) {
                // User cancelled or share failed
            }
        }
    };

    const fetchPlaylists = async () => {
        if (!isAuthenticated) {
            setLoginAction('save');
            setShowLoginDialog(true);
            return;
        }
        // 立即打开弹窗：避免后端接口异常/超时时"连弹窗都不出现"
        setShowSaveModal(true);
        setIsSaving(true);
        try {
            const response = await playlistApi.getMyPlaylists();
            const items = response.items || [];
            setPlaylists(items.map((p: any) => ({id: String(p.id), name: p.title})));
            setAddedPlaylistIds(new Set()); // Reset added state when opening a new dialog
        } catch (err) {
            console.error('Failed to fetch playlists:', err);
            toast.error(t('watch.playlistsLoadFailed', 'Failed to load playlists'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        if (addedPlaylistIds.has(playlistId)) return;
        try {
            setIsSaving(true);
            await playlistApi.addMedia(playlistId, mediaId);
            setAddedPlaylistIds(prev => new Set(prev).add(playlistId));
            toast.success(t('watch.addedToPlaylist'));
        } catch (err) {
            console.error('Failed to add to playlist:', err);
            toast.error(t('common.error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;

        try {
            setIsCreatingPlaylist(true);
            const result = await playlistApi.create({title: newPlaylistName.trim()});
            const newPlaylist = result.playlist;
            if (newPlaylist && newPlaylist.id) {
                await playlistApi.addMedia(newPlaylist.id, mediaId);
                const playlistId = String(newPlaylist.id);
                setPlaylists(prev => [...prev, {id: playlistId, name: newPlaylist.title || newPlaylistName.trim()}]);
                setAddedPlaylistIds(prev => new Set(prev).add(playlistId));
                toast.success(t('watch.playlistCreated'));
            }
            setNewPlaylistName('');
            setShowCreateForm(false);
        } catch (err) {
            console.error('Failed to create playlist:', err);
            toast.error(t('common.error'));
        } finally {
            setIsCreatingPlaylist(false);
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const response = await mediaApi.download(apiIdentifier);
            if (response.download_url) {
                window.open(response.download_url, '_blank');
            } else {
                toast.info(t('watch.downloadNotAvailable'));
            }
        } catch (err) {
            console.error('Failed to download:', err);
            toast.error(t('common.error'));
        } finally {
            setIsDownloading(false);
        }
    };

    const handleReport = async (data: { reason: string; description?: string }) => {
        try {
            await mediaApi.report(mediaId, data);
            toast.success(t('report.submitted'));
        } catch (err: any) {
            throw err;
        }
    };

    const handleOpenReportDialog = () => {
        if (!requireAuth('report')) return;
        setShowReportDialog(true);
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Like/Dislike Buttons */}
            <div className="flex items-center bg-muted rounded-full overflow-hidden">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-2 rounded-none px-4 ${
                        isLiked ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-foreground'
                    }`}
                    onClick={handleLike}
                    disabled={isLiking}
                >
                    {isLiking ? (
                        <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : (
                        <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}/>
                    )}
                    <span className="font-medium" data-testid="like-count">{formatViews(likeCount)}</span>
                </Button>
                <div className="w-px h-4 bg-border"/>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center rounded-none px-3 ${
                        isDisliked ? 'text-destructive bg-red-50 dark:bg-red-900/20' : 'text-foreground'
                    }`}
                    onClick={handleDislike}
                    disabled={isDisliking}
                >
                    {isDisliking ? (
                        <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : (
                        <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`}/>
                    )}
                </Button>
            </div>

            {/* Comment Button */}
            {onCommentClick && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 rounded-full px-4 text-foreground bg-muted"
                    onClick={onCommentClick}
                >
                    <MessageCircle className="w-4 h-4"/>
                    <span className="font-medium">{formatViews(commentCount)}</span>
                </Button>
            )}

            {/* Favorite Button */}
            <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-2 rounded-full px-4 ${
                    isFavorited ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-foreground bg-muted'
                }`}
                onClick={handleFavorite}
                disabled={isFavoriting}
            >
                {isFavoriting ? (
                    <Loader2 className="w-4 h-4 animate-spin"/>
                ) : (
                    <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`}/>
                )}
                <span className="font-medium">{isFavorited ? t('watch.favorited') : t('watch.favorite')}</span>
            </Button>

            {/* Share Button */}
            <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 rounded-full px-4 text-foreground bg-muted"
                onClick={handleShare}
                disabled={isSharing}
            >
                {isSharing ? (
                    <Loader2 className="w-4 h-4 animate-spin"/>
                ) : (
                    <Share2 className="w-4 h-4"/>
                )}
                <span className="font-medium">{t('watch.share')}</span>
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full px-3 text-foreground bg-muted"
                    >
                        <span className="sr-only">More actions</span>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path
                                d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={fetchPlaylists}>
                        <BookmarkPlus className="w-4 h-4 mr-2"/>
                        {t('watch.saveToPlaylist')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
                        <Download className="w-4 h-4 mr-2"/>
                        {isDownloading ? t('common.loading') : t('watch.download')}
                    </DropdownMenuItem>
                    {!isOwner && (
                        <>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onClick={handleOpenReportDialog} className="text-amber-600 focus:text-amber-600">
                                <Flag className="w-4 h-4 mr-2"/>
                                {t('report.reportVideo')}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Share Modal */}
            <ShareDialog
                open={showShareModal}
                onOpenChange={setShowShareModal}
                url={shareData?.url || ''}
                shareTitle={shareData?.title || ''}
                loading={isSharing}
            />

            {/* Save to Playlist Modal */}
            <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bookmark className="w-5 h-5 text-emerald-600"/>
                            {t('watch.saveToPlaylist')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('watch.selectPlaylist')}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogBody className="space-y-3">
                        {/* Loading indicator while fetching playlists */}
                        {isSaving && playlists.length === 0 && (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin"/>
                                {t('common.loading')}
                            </div>
                        )}

                        {/* Existing playlists */}
                        {playlists.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {playlists.map(playlist => {
                                    const isAdded = addedPlaylistIds.has(playlist.id);
                                    return (
                                        <Button
                                            key={playlist.id}
                                            variant="outline"
                                            className={`w-full justify-start h-auto py-2.5 px-3 ${
                                                isAdded
                                                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                                                    : ''
                                            }`}
                                            onClick={() => handleAddToPlaylist(playlist.id)}
                                            disabled={isSaving || isAdded}
                                        >
                                            {isAdded ? (
                                                <Check className="w-4 h-4 mr-2 flex-shrink-0 text-emerald-600"/>
                                            ) : (
                                                <Bookmark className="w-4 h-4 mr-2 flex-shrink-0"/>
                                            )}
                                            <span className={`truncate text-left ${isAdded ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                                                {playlist.name}
                                            </span>
                                            {isAdded && (
                                                <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                                    {t('watch.added')}
                                                </span>
                                            )}
                                            {isSaving && !isAdded && (
                                                <Loader2 className="w-4 h-4 ml-auto animate-spin flex-shrink-0"/>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Divider */}
                        {playlists.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                <span className="text-xs text-gray-500 uppercase tracking-wider px-1">
                                    {t('watch.orCreateNew')}
                                </span>
                            </div>
                        )}

                        {/* Create new playlist form */}
                        {!showCreateForm ? (
                            <Button
                                variant="outline"
                                className="w-full justify-start border-dashed border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setShowCreateForm(true)}
                            >
                                <BookmarkPlus className="w-4 h-4 mr-2"/>
                                {t('watch.createNewPlaylist')}
                            </Button>
                        ) : (
                            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <input
                                    type="text"
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    placeholder={t('watch.playlistNamePlaceholder')}
                                    className="w-full px-3 py-2 rounded-md border border-input dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isCreatingPlaylist) {
                                            handleCreatePlaylist();
                                        }
                                    }}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setNewPlaylistName('');
                                        }}
                                        disabled={isCreatingPlaylist}
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={handleCreatePlaylist}
                                        disabled={!newPlaylistName.trim() || isCreatingPlaylist}
                                    >
                                        {isCreatingPlaylist ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-1"/>
                                        ) : null}
                                        {t('watch.create')}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Empty state with CTA */}
                        {playlists.length === 0 && !showCreateForm && !isSaving && (
                            <div className="text-center py-6">
                                <Bookmark className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"/>
                                <p className="text-sm text-gray-500 mb-4">
                                    {t('watch.noPlaylists') || "You don't have any playlists yet"}
                                </p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    {t('watch.createFirstPlaylist')}
                                </p>
                                <Button
                                    onClick={() => setShowCreateForm(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <BookmarkPlus className="w-4 h-4 mr-2"/>
                                    {t('watch.createPlaylist')}
                                </Button>
                            </div>
                        )}
                    </DialogBody>
                </DialogContent>
            </Dialog>

            {/* Login Required Dialog */}
            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LogIn className="w-5 h-5"/>
                            {t('auth.loginRequired')}
                        </DialogTitle>
                        <DialogDescription>
                            {loginAction === 'like' && (t('watch.loginToLike'))}
                            {loginAction === 'dislike' && (t('watch.loginToDislike'))}
                            {loginAction === 'favorite' && (t('watch.loginToFavorite'))}
                            {loginAction === 'save' && (t('watch.loginToSave'))}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowLoginDialog(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                                setShowLoginDialog(false);
                                navigate({to: '/auth/signin'});
                            }}
                        >
                            <LogIn className="w-4 h-4 mr-2"/>
                            {t('auth.signin')}
                        </Button>
                    </DialogBody>
                </DialogContent>
            </Dialog>

            <ReportDialog
                open={showReportDialog}
                onOpenChange={setShowReportDialog}
                targetId={usePublicApi ? apiIdentifier : String(mediaId)}
                targetType="media"
                onSubmit={handleReport}
            />
        </div>
    );
};

export default InteractionBar;
