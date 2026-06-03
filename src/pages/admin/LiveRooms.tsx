import React, {useState} from 'react';
import {Plus, Edit, Trash2, Play, Square, Radio, ChevronLeft, ChevronRight} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent} from '@/components/ui/dialog';
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

const statusConfig: Record<string, {label: string; style: 'emerald' | 'slate' | 'amber' | 'red'}> = {
    idle: {label: 'Idle', style: 'slate'},
    preparing: {label: 'Preparing', style: 'amber'},
    live: {label: 'Live', style: 'emerald'},
    ended: {label: 'Ended', style: 'slate'},
    offline: {label: 'Offline', style: 'slate'},
};

const StitchBadge: React.FC<{style: 'emerald' | 'slate' | 'amber' | 'red'; children: React.ReactNode; pulse?: boolean}> = ({style, children, pulse}) => {
    const styles = {
        emerald: 'bg-emerald-50 text-emerald-700',
        slate: 'bg-slate-100 text-slate-600',
        amber: 'bg-amber-50 text-amber-700',
        red: 'bg-red-50 text-red-700',
    };
    const dotStyles = {
        emerald: 'bg-emerald-500',
        slate: 'bg-slate-400',
        amber: 'bg-amber-500',
        red: 'bg-red-500',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[style]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[style]}${pulse ? ' animate-pulse' : ''}`}></span>
            {children}
        </span>
    );
};

export default function LiveRoomsPage() {
    const {t} = useTranslation();
    return (
        <div className="space-y-4 p-4 md:p-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                    <Radio className="h-6 w-6"/>{t('admin.liveRooms', 'Live Rooms')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{t('admin.liveRoomsDesc', 'Manage live streaming rooms')}</p>
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
    const totalPages = Math.ceil(total / 20);

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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Radio className="w-5 h-5"/>
                            {t('admin.liveRoomManagement', 'Live Room Management')}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">{t('admin.liveRoomManagementDesc', 'Create and manage live streaming rooms')}</p>
                    </div>
                    <button onClick={() => setCreateDialogOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm">
                        <Plus className="w-4 h-4 mr-2 inline"/>{t('admin.addLiveRoom', 'Add Room')}
                    </button>
                </div>
                <div className="p-6">
                    {isLoading ? (
                        <div className="py-12 text-center"><Spinner className="mx-auto"/></div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.liveRoomTitle', 'Title')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.liveRoomCategory', 'Category')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.liveRoomStatus', 'Status')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.liveRoomViewers', 'Viewers')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.liveRoomCreatedAt', 'Created')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rooms.length > 0 ? rooms.map(room => {
                                        const sc = statusConfig[room.status] || statusConfig.idle;
                                        return (
                                            <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3.5 text-sm text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        {room.thumbnail && (
                                                            <img src={room.thumbnail} alt="" className="w-8 h-8 rounded object-cover"/>
                                                        )}
                                                        <span className="font-medium">{room.title}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">
                                                    {room.category ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{room.category}</span>
                                                    ) : <span className="text-slate-400">-</span>}
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">
                                                    <StitchBadge style={sc.style} pulse={room.status === 'preparing'}>{sc.label}</StitchBadge>
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">
                                                    {room.current_viewers}/{room.max_viewers || '∞'}
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-500">
                                                    {new Date(room.create_time).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {room.status !== 'live' && room.status !== 'ended' && (
                                                            <button onClick={() => handleStart(room.id)} title="Start" className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-100 rounded-lg">
                                                                <Play className="w-4 h-4"/>
                                                            </button>
                                                        )}
                                                        {room.status === 'live' && (
                                                            <button onClick={() => handleEnd(room.id)} title="End" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg">
                                                                <Square className="w-4 h-4"/>
                                                            </button>
                                                        )}
                                                        <button onClick={() => openEditDialog(room)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                                            <Edit className="w-4 h-4"/>
                                                        </button>
                                                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                                                            onClick={() => { setDeletingRoom(room); setDeleteDialogOpen(true); }}>
                                                            <Trash2 className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                        <Radio size={32} className="text-slate-300"/>
                                                    </div>
                                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noLiveRooms', 'No live rooms found')}</h3>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {total > 20 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-500">Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} items</p>
                            <div className="flex items-center gap-1">
                                <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                    <ChevronLeft size={16}/>
                                </button>
                                {Array.from({length: totalPages}, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map(p => (
                                    <button key={p} className={`h-8 px-3 rounded-lg text-sm font-medium ${p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setPage(p)}>{p}</button>
                                ))}
                                <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                    <ChevronRight size={16}/>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.createLiveRoom', 'Create Live Room')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
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
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.title}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editLiveRoom', 'Edit Live Room')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
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
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleUpdate} disabled={!editForm.title}>{t('common.save', 'Save')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">
                            {t('admin.deleteLiveRoomConfirm', 'Are you sure you want to delete this live room?', {title: deletingRoom?.title})}
                        </AlertDialogDescription>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <AlertDialogCancel className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 border-0">
                            {t('admin.delete', 'Delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
