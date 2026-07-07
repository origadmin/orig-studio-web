import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
    Search,
    Edit3,
    Trash2,
    Plus,
    Loader2,
    List,
    Globe,
    Film,
    Eye,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Music2,
    Image as ImageIcon,
} from 'lucide-react';
import {adminPlaylistApi, Playlist} from '@/lib/api/playlist';
import {formatDateTime, formatNumber, formatViews} from '@/lib/format';
import {extractList} from '@/lib/extract';
import {usePagination} from '@/hooks/usePagination';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Select, SelectTrigger, SelectContent, SelectItem, SelectValue} from '@/components/ui/select';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '@/components/ui/dialog';
import {getFullUrl} from '@/lib/utils';

const Playlists: React.FC = () => {
    const {t} = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('all');
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {page, pageSize, total, totalPages, setPage, setTotal, getParams} = usePagination();

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const filteredPlaylists = playlists.filter(playlist => {
        const matchesSearch = playlist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (playlist.description && playlist.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesVisibility = visibilityFilter === 'all' ||
            (visibilityFilter === 'public' && playlist.is_public) ||
            (visibilityFilter === 'private' && !playlist.is_public);
        return matchesSearch && matchesVisibility;
    });

    // Stats calculations
    const totalPlaylists = total;
    const publicCount = playlists.filter(p => p.is_public).length;
    const totalItems = playlists.reduce(
        (sum, p) => sum + (p.media_items?.length || p.media_details?.length || 0),
        0,
    );
    const totalViews = playlists.reduce(
        (sum, p) => sum + (p.media_details?.reduce((s, m) => s + (m.view_count || 0), 0) || 0),
        0,
    );

    const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
    const endItem = Math.min(page * pageSize, total);

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

    const handleReset = () => {
        setSearchTerm('');
        setVisibilityFilter('all');
    };

    // Compute per-row metrics
    const getItemCount = (p: Playlist) => p.media_items?.length ?? p.media_details?.length ?? 0;
    const getViewCount = (p: Playlist) =>
        p.media_details?.reduce((s, m) => s + (m.view_count || 0), 0) ?? 0;
    const getThumbnail = (p: Playlist) => p.media_details?.[0]?.thumbnail;

    return (
        <div className="p-8">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.playlists', '播放列表')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Page Title Area */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                            <Music2 className="w-4 h-4"/>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            {t('admin.playlistsManagement', 'Playlists Management')}
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-[42px]">
                        {t('admin.playlistsDesc', 'Organize and distribute your media assets across global edge nodes.')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="w-4 h-4"/>
                        {t('admin.createPlaylist', 'Create Playlist')}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('admin.totalPlaylists', 'Total Playlists')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                    {formatNumber(totalPlaylists)}
                                </h3>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <List className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('admin.publicPlaylists', 'Public')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                    {formatNumber(publicCount)}
                                </h3>
                            </div>
                            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <Globe className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('admin.totalItems', 'Total Items')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                    {formatNumber(totalItems)}
                                </h3>
                            </div>
                            <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                <Film className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('admin.totalViews', 'Total Views')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                    {formatViews(totalViews)}
                                </h3>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Eye className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search + Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[240px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                    <Input
                        className="pl-9 pr-4"
                        type="text"
                        placeholder={t('admin.searchPlaylists', 'Search playlists...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('admin.allVisibility', 'All Visibility')}</SelectItem>
                        <SelectItem value="public">{t('admin.public', 'Public')}</SelectItem>
                        <SelectItem value="private">{t('admin.private', 'Private')}</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="w-3.5 h-3.5"/>
                    {t('admin.reset', 'Reset')}
                </Button>
            </div>

            {/* Data Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <Table className="text-left">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-6 py-3 text-[11px]">
                                {t('admin.titleAndDescription', 'Title & Description')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px]">
                                {t('admin.creator', 'Creator')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px]">
                                {t('admin.items', 'Items')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px]">
                                {t('admin.visibility', 'Visibility')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px]">
                                {t('admin.views', 'Views')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px]">
                                {t('admin.updated', 'Updated')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] text-right">
                                {t('admin.actions', 'Actions')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-50">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="px-6 py-16 text-center">
                                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto"/>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={7} className="px-6 py-16 text-center">
                                    <p className="text-sm text-red-500">{error}</p>
                                    <Button variant="link" size="sm" className="mt-2" onClick={loadPlaylists}>
                                        {t('common.retry', 'Retry')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : filteredPlaylists.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="px-6 py-16 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Music2 className="w-8 h-8 text-slate-300"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-card-foreground mb-1">
                                        {t('admin.noPlaylistsYet', 'No playlists yet')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                        {t('admin.createFirstPlaylist', 'Create your first playlist to organize media content.')}
                                    </p>
                                    <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                                        <Plus className="w-4 h-4"/>
                                        {t('admin.createPlaylist', 'Create Playlist')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPlaylists.map((playlist) => {
                                const thumbnail = getThumbnail(playlist);
                                return (
                                    <TableRow key={playlist.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="px-6 py-3.5 max-w-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-indigo-50 border border-border flex items-center justify-center shrink-0">
                                                    {thumbnail ? (
                                                        <img
                                                            alt={playlist.title}
                                                            className="w-full h-full object-cover"
                                                            src={getFullUrl(thumbnail)}
                                                        />
                                                    ) : (
                                                        <ImageIcon className="w-4 h-4 text-indigo-400"/>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-foreground truncate">
                                                        {playlist.title}
                                                    </div>
                                                    {playlist.description && (
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            {playlist.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] border border-indigo-200">
                                                    {playlist.user_id?.substring(0, 2).toUpperCase() || 'U'}
                                                </div>
                                                <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                                                    {playlist.user_id}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-3.5 text-sm text-card-foreground tabular-nums">
                                            {getItemCount(playlist)}
                                        </TableCell>
                                        <TableCell className="px-6 py-3.5">
                                            {playlist.is_public ? (
                                                <Badge variant="soft-success" className="gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                                                    {t('admin.public', 'Public')}
                                                </Badge>
                                            ) : (
                                                <Badge variant="soft-neutral" className="gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/>
                                                    {t('admin.private', 'Private')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-6 py-3.5 text-sm text-card-foreground tabular-nums">
                                            {formatViews(getViewCount(playlist))}
                                        </TableCell>
                                        <TableCell className="px-6 py-3.5 text-sm text-muted-foreground">
                                            {formatDateTime(playlist.update_time || playlist.create_time)}
                                        </TableCell>
                                        <TableCell className="px-6 py-3.5 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-muted-foreground hover:text-indigo-600"
                                                    onClick={() => {
                                                        setEditTarget(playlist);
                                                        setEditTitle(playlist.title);
                                                        setEditDescription(playlist.description || '');
                                                        setEditIsPublic(playlist.is_public);
                                                    }}
                                                >
                                                    <Edit3 className="w-4 h-4"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => setDeleteTarget(playlist)}
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                {/* Pagination — embedded in table container */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {t('admin.showingItems', '显示第 {{start}} 到 {{end}} 项，共 {{total}} 项', {start: startItem, end: endItem, total})}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon-sm"
                                className="h-8 w-8"
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </Button>
                            <Button size="sm" className="h-8 px-3">
                                {page}
                            </Button>
                            {page < totalPages && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8"
                                    onClick={() => setPage(page + 1)}
                                >
                                    {page + 1}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="icon-sm"
                                className="h-8 w-8"
                                onClick={() => setPage(page + 1)}
                                disabled={page >= totalPages}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Playlist Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary"/>
                            {t('admin.createPlaylist', 'Create Playlist')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.createPlaylistDesc', 'Create a new playlist to organize your media content')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t('admin.playlistTitle', 'Playlist Title')}</Label>
                            <Input
                                type="text"
                                value={createTitle}
                                onChange={(e) => setCreateTitle(e.target.value)}
                                placeholder={t('admin.enterPlaylistTitle', 'Enter playlist title')}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.description', 'Description')}</Label>
                            <Textarea
                                rows={3}
                                value={createDescription}
                                onChange={(e) => setCreateDescription(e.target.value)}
                                placeholder={t('admin.enterPlaylistDescription', 'Enter description')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>{t('admin.visibility', 'Visibility')}</Label>
                                <Select
                                    value={createIsPublic ? 'public' : 'private'}
                                    onValueChange={(value) => setCreateIsPublic(value === 'public')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="public">{t('admin.public', 'Public')}</SelectItem>
                                        <SelectItem value="private">{t('admin.private', 'Private')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('admin.userId', 'User ID')}</Label>
                                <Input
                                    type="text"
                                    value={createUserId}
                                    onChange={(e) => setCreateUserId(e.target.value)}
                                    placeholder={t('admin.enterUserId', 'Enter user ID')}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium"
                            onClick={handleCreate}
                            disabled={!createTitle.trim() || !createUserId.trim() || isCreating}
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 mr-1 animate-spin inline"/> : null}
                            {t('admin.create', 'Create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Playlist Dialog */}
            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-primary"/>
                            {t('admin.editPlaylist', 'Edit Playlist')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.editPlaylistDesc', 'Update playlist information and settings')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t('admin.playlistTitle', 'Playlist Title')}</Label>
                            <Input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.description', 'Description')}</Label>
                            <Textarea
                                rows={3}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.visibility', 'Visibility')}</Label>
                            <Select
                                value={editIsPublic ? 'public' : 'private'}
                                onValueChange={(value) => setEditIsPublic(value === 'public')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">{t('admin.public', 'Public')}</SelectItem>
                                    <SelectItem value="private">{t('admin.private', 'Private')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setEditTarget(null)} disabled={isUpdating}>
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleSaveEdit} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="w-4 h-4 mr-1 animate-spin inline"/> : null}
                            {t('admin.saveChanges', 'Save Changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Playlist Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500"/>
                            {t('admin.deletePlaylist', 'Delete Playlist')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t(
                                'admin.deletePlaylistConfirm',
                                'Are you sure you want to delete this playlist? This action cannot be undone.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin inline"/> : null}
                            {t('admin.delete', 'Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Playlists;