import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {
    Search,
    Edit3,
    Trash2,
    Plus,
    Loader2,
    List,
    Globe,
    Film,
    TrendingUp,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';
import {adminPlaylistApi, Playlist} from '@/lib/api/playlist';
import {formatDateTime} from '@/lib/format';
import {extractList} from '@/lib/extract';
import {usePagination} from '@/hooks/usePagination';

const Playlists: React.FC = () => {
    const {t} = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('all');
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {page, pageSize, total, setPage, setTotal, getParams} = usePagination();

    // Create dialog state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createTitle, setCreateTitle] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [createUserId, setCreateUserId] = useState('');
    const [createIsPublic, setCreateIsPublic] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Edit dialog state
    const [editTarget, setEditTarget] = useState<Playlist | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete dialog state
    const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load playlists
    const loadPlaylists = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminPlaylistApi.list(getParams());
            const playlistList = extractList<Playlist>(response);
            setPlaylists(playlistList);
            if (response?.total !== undefined) {
                setTotal(response.total);
            }
        } catch (err) {
            setError(t('admin.failedToLoadPlaylists'));
            console.error('Error loading playlists:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlaylists();
    }, [page]);

    const filteredPlaylists = playlists.filter(playlist => {
        const matchesSearch = playlist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (playlist.description && playlist.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesVisibility = visibilityFilter === 'all' ||
            (visibilityFilter === 'public' && playlist.is_public) ||
            (visibilityFilter === 'private' && !playlist.is_public);
        return matchesSearch && matchesVisibility;
    });

    const totalPlaylists = total;
    const publicCount = playlists.filter(p => p.is_public).length;
    const totalVideos = playlists.reduce((sum, p) => sum + (p.media_items?.length || 0), 0);

    const formatNumber = (num: number | undefined | null) => {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    const handleCreate = async () => {
        if (!createTitle.trim() || !createUserId.trim()) return;
        try {
            setIsCreating(true);
            await adminPlaylistApi.create({
                title: createTitle.trim(),
                description: createDescription.trim(),
                user_id: createUserId.trim(),
                is_public: createIsPublic,
            });
            setShowCreateDialog(false);
            setCreateTitle('');
            setCreateDescription('');
            setCreateUserId('');
            setCreateIsPublic(true);
            loadPlaylists();
        } catch (err) {
            console.error('Failed to create playlist:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editTarget) return;
        try {
            setIsUpdating(true);
            await adminPlaylistApi.update(editTarget.id, {
                title: editTitle,
                description: editDescription,
                is_public: editIsPublic,
            });
            setEditTarget(null);
            loadPlaylists();
        } catch (err) {
            console.error('Failed to update playlist:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setIsDeleting(true);
            await adminPlaylistApi.delete(deleteTarget.id);
            setDeleteTarget(null);
            loadPlaylists();
        } catch (err) {
            console.error('Failed to delete playlist:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const totalPages = Math.ceil(total / pageSize);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
        <div className="p-8">
            {/* Page Title Area */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('admin.playlistsManagement', 'Playlists Management')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.playlistsDesc', 'Organize and distribute your media assets across global edge nodes.')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                        onClick={() => setShowCreateDialog(true)}
                    >
                        <Plus className="w-4 h-4"/>
                        {t('admin.createPlaylist', 'Create Playlist')}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalPlaylists', 'Total Playlists')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatNumber(totalPlaylists)}</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <List className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.publicDistribution', 'Public Distribution')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatNumber(publicCount)}</h3>
                        </div>
                        <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <Globe className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalVideos', 'Total Videos')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatNumber(totalVideos)}</h3>
                        </div>
                        <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors">
                            <Film className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.activeViewers', 'Active Viewers')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">—</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <TrendingUp className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search + Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input
                        className="w-full pl-9 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                        type="text"
                        placeholder={t('admin.searchPlaylists', 'Search playlists...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                    value={visibilityFilter}
                    onChange={(e) => setVisibilityFilter(e.target.value)}
                >
                    <option value="all">{t('admin.allVisibility', 'All Visibility')}</option>
                    <option value="public">{t('admin.pub', 'Public')}</option>
                    <option value="private">{t('admin.priv', 'Private')}</option>
                </select>
                <button
                    className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                    onClick={() => { setSearchTerm(''); setVisibilityFilter('all'); }}
                >
                    <RotateCcw className="w-3.5 h-3.5"/>
                    {t('admin.reset', 'Reset')}
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">ID</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.titleAndDescription', 'Title & Description')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.creator', 'Creator')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.videos', 'Videos')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.visibility', 'Visibility')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.created', 'Created')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto"/>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <p className="text-sm text-red-500">{error}</p>
                                    <button className="mt-2 text-sm text-indigo-600 hover:underline" onClick={loadPlaylists}>{t('common.retry', 'Retry')}</button>
                                </td>
                            </tr>
                        ) : filteredPlaylists.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <List className="w-8 h-8 text-slate-300"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noPlaylistsYet', 'No playlists yet')}</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mx-auto">{t('admin.createFirstPlaylist', 'Create your first playlist to organize media content.')}</p>
                                    <button
                                        className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                                        onClick={() => setShowCreateDialog(true)}
                                    >
                                        <Plus className="w-4 h-4"/>
                                        {t('admin.createPlaylist', 'Create Playlist')}
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            filteredPlaylists.map((playlist) => (
                                <tr key={playlist.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-3.5 font-mono text-xs text-slate-500">{playlist.id?.substring(0, 8)}</td>
                                    <td className="px-6 py-3.5 max-w-xs">
                                        <div className="text-sm font-semibold text-slate-800">{playlist.title}</div>
                                        {playlist.description && (
                                            <div className="text-xs text-slate-400 truncate">{playlist.description}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-8 h-8 border border-slate-200">
                                                <AvatarFallback className="text-[10px] font-bold bg-indigo-100 text-indigo-600 border border-indigo-200">
                                                    {playlist.user_id?.substring(0, 2).toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-sm text-slate-700">{playlist.media_items?.length || 0}</td>
                                    <td className="px-6 py-3.5">
                                        {playlist.is_public ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                {t('admin.pub', 'Public')}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                {t('admin.priv', 'Private')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 text-sm text-slate-500">{formatDateTime(playlist.create_time)}</td>
                                    <td className="px-6 py-3.5 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                onClick={() => {
                                                    setEditTarget(playlist);
                                                    setEditTitle(playlist.title);
                                                    setEditDescription(playlist.description || '');
                                                    setEditIsPublic(playlist.is_public);
                                                }}
                                            >
                                                <Edit3 className="w-4 h-4"/>
                                            </button>
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                onClick={() => setDeleteTarget(playlist)}
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {/* Pagination — embedded in table container */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs text-slate-500">{t('admin.showingItems', `Showing ${startItem} to ${endItem} of ${total} items`)}</p>
                        <div className="flex items-center gap-1">
                            <button
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </button>
                            <button className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-sm font-medium">{page}</button>
                            {page < totalPages && (
                                <button className="h-8 w-8 rounded-lg text-sm text-slate-600 hover:bg-slate-50" onClick={() => setPage(page + 1)}>{page + 1}</button>
                            )}
                            <button
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                onClick={() => setPage(page + 1)}
                                disabled={page >= totalPages}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Playlist Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.createPlaylist', 'Create Playlist')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">{t('admin.playlistTitle', 'Playlist Title')}</label>
                            <input
                                className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                                type="text"
                                value={createTitle}
                                onChange={(e) => setCreateTitle(e.target.value)}
                                placeholder={t('admin.enterPlaylistTitle', 'Enter playlist title')}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">{t('admin.description', 'Description')}</label>
                            <textarea
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                                rows={3}
                                value={createDescription}
                                onChange={(e) => setCreateDescription(e.target.value)}
                                placeholder={t('admin.enterPlaylistDescription', 'Enter description')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.visibility', 'Visibility')}</label>
                                <select
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    value={createIsPublic ? 'public' : 'private'}
                                    onChange={(e) => setCreateIsPublic(e.target.value === 'public')}
                                >
                                    <option value="public">{t('admin.pub', 'Public')}</option>
                                    <option value="private">{t('admin.priv', 'Private')}</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.userId', 'User ID')}</label>
                                <input
                                    className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                                    type="text"
                                    value={createUserId}
                                    onChange={(e) => setCreateUserId(e.target.value)}
                                    placeholder={t('admin.enterUserId', 'Enter user ID')}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                            onClick={() => setShowCreateDialog(false)}
                            disabled={isCreating}
                        >
                            {t('admin.cancel', 'Cancel')}
                        </button>
                        <button
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                            onClick={handleCreate}
                            disabled={!createTitle.trim() || !createUserId.trim() || isCreating}
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 mr-1 animate-spin inline"/> : null}
                            {t('admin.create', 'Create')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Playlist Dialog */}
            <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editPlaylist', 'Edit Playlist')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">{t('admin.playlistTitle', 'Playlist Title')}</label>
                            <input
                                className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">{t('admin.description', 'Description')}</label>
                            <textarea
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                                rows={3}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">{t('admin.visibility', 'Visibility')}</label>
                            <select
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                value={editIsPublic ? 'public' : 'private'}
                                onChange={(e) => setEditIsPublic(e.target.value === 'public')}
                            >
                                <option value="public">{t('admin.pub', 'Public')}</option>
                                <option value="private">{t('admin.priv', 'Private')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                            onClick={() => setEditTarget(null)}
                            disabled={isUpdating}
                        >
                            {t('admin.cancel', 'Cancel')}
                        </button>
                        <button
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                            onClick={handleSaveEdit}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <Loader2 className="w-4 h-4 mr-1 animate-spin inline"/> : null}
                            {t('admin.saveChanges', 'Save Changes')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Playlist Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.deletePlaylist', 'Delete Playlist')}</h3>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-600">
                            {t('admin.deletePlaylistConfirm', 'Are you sure you want to delete this playlist? This action cannot be undone.')}
                        </p>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                            onClick={() => setDeleteTarget(null)}
                            disabled={isDeleting}
                        >
                            {t('admin.cancel', 'Cancel')}
                        </button>
                        <button
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin inline"/> : null}
                            {t('admin.delete', 'Delete')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Playlists;
