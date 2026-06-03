import React, {useState} from 'react';
import {Plus, Edit, Trash2, Play, Square, Radio, ChevronLeft, ChevronRight, RefreshCw, Settings} from 'lucide-react';
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
        <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                        <Radio className="h-6 w-6 text-indigo-600"/>
                        {t('admin.liveRooms', 'Live Rooms Management')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.liveRoomsDesc', 'Monitor, configure, and control your enterprise streaming channels in real-time.')}</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <RefreshCw className="w-4 h-4"/>
                        {t('admin.refreshAll', 'Refresh All')}
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2">
                        <Plus className="w-4 h-4"/>
                        {t('admin.addLiveRoom', 'Create New Room')}
                    </button>
                </div>
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
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                            <th className="px-6 py-4">{t('admin.liveRoomTitle', 'Room Title & ID')}</th>
                            <th className="px-6 py-4">{t('admin.liveRoomCategory', 'Category')}</th>
                            <th className="px-6 py-4 text-center">{t('admin.liveRoomStatus', 'Status')}</th>
                            <th className="px-6 py-4 text-right">{t('admin.liveRoomViewers', 'Viewers')}</th>
                            <th className="px-6 py-4 text-center">{t('admin.controls', 'Controls')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                        ) : rooms.length > 0 ? rooms.map(room => {
                            const sc = statusConfig[room.status] || statusConfig.idle;
                            return (
                                <tr key={room.id} className={`hover:bg-slate-50/50 transition-colors ${room.status === 'ended' ? 'opacity-75' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 relative overflow-hidden flex-shrink-0">
                                                {room.thumbnail ? (
                                                    <img src={room.thumbnail} alt="" className="object-cover w-full h-full"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Radio className="w-5 h-5 text-slate-300"/>
                                                    </div>
                                                )}
                                                {room.status === 'live' && (
                                                    <span className="absolute top-1 left-1 flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-700">{room.title}</div>
                                                <code className="text-[11px] text-slate-400">{room.id.substring(0, 12)}...</code>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {room.category ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">{room.category}</span>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StitchBadge style={sc.style} pulse={room.status === 'preparing' || room.status === 'live'}>{sc.label}</StitchBadge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-sm font-semibold text-slate-700">{room.current_viewers || '--'}</div>
                                        {room.status === 'live' && <div className="text-[10px] text-slate-400 uppercase tracking-wider">Current Peak</div>}
                                        {room.status === 'ended' && <div className="text-[10px] text-slate-400 uppercase tracking-wider">Final Views</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openEditDialog(room)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Settings">
                                                <Settings className="w-4 h-4"/>
                                            </button>
                                            {room.status !== 'live' && room.status !== 'ended' && (
                                                <button onClick={() => handleStart(room.id)} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors" title="Start Stream">
                                                    <Play className="w-4 h-4"/>
                                                </button>
                                            )}
                                            {room.status === 'live' && (
                                                <button onClick={() => handleEnd(room.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Stop Stream">
                                                    <Square className="w-4 h-4"/>
                                                </button>
                                            )}
                                            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors" onClick={() => { setDeletingRoom(room); setDeleteDialogOpen(true); }}>
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5}>
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

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.createLiveRoom', 'Create Live Room')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.liveRoomTitle', 'Title')}</Label><Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="Live Room Title"/></div>
                        <div className="grid gap-2"><Label>{t('admin.liveRoomDescription', 'Description')}</Label><Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="Description"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.liveRoomCategory', 'Category')}</Label><Input value={createForm.category || ''} onChange={e => setCreateForm({...createForm, category: e.target.value})} placeholder="Gaming, Music..."/></div>
                            <div className="grid gap-2"><Label>{t('admin.liveRoomMaxViewers', 'Max Viewers')}</Label><Input type="number" value={createForm.max_viewers || 0} onChange={e => setCreateForm({...createForm, max_viewers: Number(e.target.value)})}/></div>
                        </div>
                        <ImageUploadField value={createForm.thumbnail || ''} onChange={url => setCreateForm({...createForm, thumbnail: url})} label={t('admin.liveRoomThumbnail', 'Thumbnail')}/>
                        <div className="grid gap-2"><Label>{t('admin.liveRoomRtmpUrl', 'RTMP URL')}</Label><Input value={createForm.rtmp_url || ''} onChange={e => setCreateForm({...createForm, rtmp_url: e.target.value})} placeholder="rtmp://..."/></div>
                        <div className="grid gap-2"><Label>{t('admin.liveRoomHlsUrl', 'HLS URL')}</Label><Input value={createForm.hls_url || ''} onChange={e => setCreateForm({...createForm, hls_url: e.target.value})} placeholder="https://.../stream.m3u8"/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.title}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editLiveRoom', 'Edit Live Room')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.liveRoomTitle', 'Title')}</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.liveRoomDescription', 'Description')}</Label><Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.liveRoomCategory', 'Category')}</Label><Input value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.liveRoomMaxViewers', 'Max Viewers')}</Label><Input type="number" value={editForm.max_viewers || 0} onChange={e => setEditForm({...editForm, max_viewers: Number(e.target.value)})}/></div>
                        </div>
                        <ImageUploadField value={editForm.thumbnail || ''} onChange={url => setEditForm({...editForm, thumbnail: url})} label={t('admin.liveRoomThumbnail', 'Thumbnail')}/>
                        <div className="grid gap-2"><Label>{t('admin.liveRoomRtmpUrl', 'RTMP URL')}</Label><Input value={editForm.rtmp_url} onChange={e => setEditForm({...editForm, rtmp_url: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.liveRoomHlsUrl', 'HLS URL')}</Label><Input value={editForm.hls_url} onChange={e => setEditForm({...editForm, hls_url: e.target.value})}/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleUpdate} disabled={!editForm.title}>{t('common.save', 'Save')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteLiveRoomConfirm', 'Are you sure you want to delete this live room?')}</AlertDialogDescription>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <AlertDialogCancel className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 border-0">{t('admin.delete', 'Delete')}</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
