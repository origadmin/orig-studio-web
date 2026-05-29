import React, {useState} from 'react';
import {Plus, Edit, Trash2, Play, Square, Radio} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Label} from '@/components/ui/label';
import {ImageUploadField} from '@/components/upload/ImageUploadField';
import {
    useAdminLiveRooms,
    useCreateLiveRoom,
    useUpdateLiveRoom,
    useDeleteLiveRoom,
    useStartLiveRoom,
    useEndLiveRoom,
} from '@/hooks/queries';
import {type LiveRoom, type CreateLiveRoomRequest, type UpdateLiveRoomRequest} from '@/lib/api/live';

const statusConfig: Record<string, {label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'}> = {
    idle: {label: 'Idle', variant: 'secondary'},
    preparing: {label: 'Preparing', variant: 'outline'},
    live: {label: 'Live', variant: 'default'},
    ended: {label: 'Ended', variant: 'secondary'},
    offline: {label: 'Offline', variant: 'outline'},
};

export default function LiveRoomsPage() {
    const {t} = useTranslation();
    return (
        <div className="space-y-4 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Radio className="h-6 w-6"/>{t('admin.liveRooms', 'Live Rooms')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{t('admin.liveRoomsDesc', 'Manage live streaming rooms')}</p>
            </div>
            <LiveRoomsTab/>
        </div>
    );
}

const LiveRoomsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: liveRoomsData, isLoading} = useAdminLiveRooms({page, page_size: 20});
    const createMutation = useCreateLiveRoom();
    const updateMutation = useUpdateLiveRoom();
    const deleteMutation = useDeleteLiveRoom();
    const startMutation = useStartLiveRoom();
    const endMutation = useEndLiveRoom();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<LiveRoom | null>(null);
    const [deletingRoom, setDeletingRoom] = useState<LiveRoom | null>(null);
    const [createForm, setCreateForm] = useState<CreateLiveRoomRequest>({title: ''});
    const [editForm, setEditForm] = useState<UpdateLiveRoomRequest>({
        title: '', description: '', rtmp_url: '', hls_url: '',
        max_viewers: 0, thumbnail: '', category: '', tags: [],
    });

    const rooms = liveRoomsData?.items || [];
    const total = liveRoomsData?.total || 0;

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({title: ''});
        } catch (err) {
            console.error('Failed to create live room:', err);
        }
    };

    const openEditDialog = (room: LiveRoom) => {
        setEditingRoom(room);
        setEditForm({
            title: room.title,
            description: room.description,
            rtmp_url: room.rtmp_url,
            hls_url: room.hls_url,
            max_viewers: room.max_viewers,
            thumbnail: room.thumbnail,
            category: room.category,
            tags: room.tags,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingRoom) return;
        try {
            await updateMutation.mutateAsync({id: editingRoom.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update live room:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingRoom) return;
        try {
            await deleteMutation.mutateAsync(deletingRoom.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete live room:', err);
        }
    };

    const handleStart = async (id: string) => {
        try {
            await startMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to start live room:', err);
        }
    };

    const handleEnd = async (id: string) => {
        try {
            await endMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to end live room:', err);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Radio className="w-5 h-5"/>
                                {t('admin.liveRoomManagement', 'Live Room Management')}
                            </CardTitle>
                            <CardDescription>{t('admin.liveRoomManagementDesc', 'Create and manage live streaming rooms')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2"/>{t('admin.addLiveRoom', 'Add Room')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-12 text-center"><Spinner className="mx-auto"/></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.liveRoomTitle', 'Title')}</TableHead>
                                    <TableHead>{t('admin.liveRoomCategory', 'Category')}</TableHead>
                                    <TableHead>{t('admin.liveRoomStatus', 'Status')}</TableHead>
                                    <TableHead>{t('admin.liveRoomViewers', 'Viewers')}</TableHead>
                                    <TableHead>{t('admin.liveRoomCreatedAt', 'Created')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rooms.length > 0 ? rooms.map(room => {
                                    const sc = statusConfig[room.status] || statusConfig.idle;
                                    return (
                                        <TableRow key={room.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {room.thumbnail && (
                                                        <img src={room.thumbnail} alt="" className="w-8 h-8 rounded object-cover"/>
                                                    )}
                                                    <span className="font-medium">{room.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {room.category ? <Badge variant="outline">{room.category}</Badge> : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={sc.variant}>{sc.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {room.current_viewers}/{room.max_viewers || '∞'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(room.create_time).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {room.status !== 'live' && room.status !== 'ended' && (
                                                        <Button variant="ghost" size="icon-sm" onClick={() => handleStart(room.id)} title="Start">
                                                            <Play className="w-4 h-4 text-green-600"/>
                                                        </Button>
                                                    )}
                                                    {room.status === 'live' && (
                                                        <Button variant="ghost" size="icon-sm" onClick={() => handleEnd(room.id)} title="End">
                                                            <Square className="w-4 h-4 text-red-600"/>
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(room)}>
                                                        <Edit className="w-4 h-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon-sm" className="text-destructive"
                                                        onClick={() => { setDeletingRoom(room); setDeleteDialogOpen(true); }}>
                                                        <Trash2 className="w-4 h-4"/>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            {t('admin.noLiveRooms', 'No live rooms found')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                    {total > 20 && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-sm text-muted-foreground">{t('admin.total', 'Total')}: {total}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                    {t('common.prev', 'Previous')}
                                </Button>
                                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
                                    {t('common.next', 'Next')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('admin.createLiveRoom', 'Create Live Room')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomTitle', 'Title')}</Label>
                            <Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="Live Room Title"/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomDescription', 'Description')}</Label>
                            <Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="Description"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.liveRoomCategory', 'Category')}</Label>
                                <Input value={createForm.category || ''} onChange={e => setCreateForm({...createForm, category: e.target.value})} placeholder="Gaming, Music..."/>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.liveRoomMaxViewers', 'Max Viewers')}</Label>
                                <Input type="number" value={createForm.max_viewers || 0} onChange={e => setCreateForm({...createForm, max_viewers: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <ImageUploadField
                            value={createForm.thumbnail || ''}
                            onChange={url => setCreateForm({...createForm, thumbnail: url})}
                            label={t('admin.liveRoomThumbnail', 'Thumbnail')}
                        />
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomRtmpUrl', 'RTMP URL')}</Label>
                            <Input value={createForm.rtmp_url || ''} onChange={e => setCreateForm({...createForm, rtmp_url: e.target.value})} placeholder="rtmp://..."/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomHlsUrl', 'HLS URL')}</Label>
                            <Input value={createForm.hls_url || ''} onChange={e => setCreateForm({...createForm, hls_url: e.target.value})} placeholder="https://.../stream.m3u8"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.title}>{t('common.add', 'Add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('admin.editLiveRoom', 'Edit Live Room')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomTitle', 'Title')}</Label>
                            <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomDescription', 'Description')}</Label>
                            <Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.liveRoomCategory', 'Category')}</Label>
                                <Input value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}/>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.liveRoomMaxViewers', 'Max Viewers')}</Label>
                                <Input type="number" value={editForm.max_viewers || 0} onChange={e => setEditForm({...editForm, max_viewers: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <ImageUploadField
                            value={editForm.thumbnail || ''}
                            onChange={url => setEditForm({...editForm, thumbnail: url})}
                            label={t('admin.liveRoomThumbnail', 'Thumbnail')}
                        />
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomRtmpUrl', 'RTMP URL')}</Label>
                            <Input value={editForm.rtmp_url} onChange={e => setEditForm({...editForm, rtmp_url: e.target.value})}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.liveRoomHlsUrl', 'HLS URL')}</Label>
                            <Input value={editForm.hls_url} onChange={e => setEditForm({...editForm, hls_url: e.target.value})}/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleUpdate} disabled={!editForm.title}>{t('common.save', 'Save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.deleteLiveRoomConfirm', 'Are you sure you want to delete this live room?', {title: deletingRoom?.title})}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {t('admin.delete', 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
