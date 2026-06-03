import React, {useState} from 'react';
import {
    Megaphone, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {ImageUploadField} from '@/components/upload/ImageUploadField';
import {
    useAdminAds, useCreateAd, useUpdateAd, useDeleteAd,
} from '@/hooks/queries';
import {type Ad, type CreateAdRequest, type UpdateAdRequest} from '@/lib/api/ads';

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

export default function AdsPage() {
    const {t} = useTranslation();

    return (
        <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                        <Megaphone className="h-6 w-6 text-indigo-600"/>
                        {t('admin.adsManagement', 'Ads Management')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.adsManagementDesc', 'Create, schedule, and monitor advertising campaigns across all channels.')}</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4"/>
                        {t('admin.exportReport', 'Export Report')}
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2">
                        <Plus className="w-4 h-4"/>
                        {t('admin.createAd', 'Create Ad')}
                    </button>
                </div>
            </div>

            <AdsTab/>
        </div>
    );
}

const AdsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: adsData, isLoading} = useAdminAds({page, page_size: 20});
    const createMutation = useCreateAd();
    const updateMutation = useUpdateAd();
    const deleteMutation = useDeleteAd();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Ad | null>(null);
    const [deletingAd, setDeletingAd] = useState<Ad | null>(null);
    const [createForm, setCreateForm] = useState<CreateAdRequest>({
        title: '', type: 'banner', position: 'top',
    });
    const [editForm, setEditForm] = useState<UpdateAdRequest>({
        title: '', type: 'banner', position: 'top', is_active: true,
    });

    const ads = adsData?.items || [];
    const total = adsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({title: '', type: 'banner', position: 'top'});
        } catch (err) {
            console.error('Failed to create ad:', err);
        }
    };

    const openEditDialog = (ad: Ad) => {
        setEditingAd(ad);
        setEditForm({
            title: ad.title,
            type: ad.type,
            position: ad.position,
            image_url: ad.image_url,
            target_url: ad.target_url,
            description: ad.description,
            starts_at: ad.starts_at,
            expires_at: ad.expires_at,
            is_active: ad.is_active,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingAd) return;
        try {
            await updateMutation.mutateAsync({id: editingAd.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update ad:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingAd) return;
        try {
            await deleteMutation.mutateAsync(deletingAd.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete ad:', err);
        }
    };

    const typeLabels: Record<string, string> = {
        banner: 'Banner',
        video: 'Video',
        native: 'Native',
        interstitial: 'Interstitial',
        popup: 'Popup',
    };

    const positionLabels: Record<string, string> = {
        top: 'Top',
        sidebar: 'Sidebar',
        bottom: 'Bottom',
        inline: 'Inline',
        fullscreen: 'Fullscreen',
    };

    const statusStyle = (ad: Ad): 'emerald' | 'slate' | 'amber' | 'red' => {
        if (!ad.is_active) return 'slate';
        if (ad.expires_at && new Date(ad.expires_at) < new Date()) return 'red';
        if (ad.starts_at && new Date(ad.starts_at) > new Date()) return 'amber';
        return 'emerald';
    };

    const statusLabel = (ad: Ad): string => {
        if (!ad.is_active) return t('admin.disabled', 'Disabled');
        if (ad.expires_at && new Date(ad.expires_at) < new Date()) return t('admin.expired', 'Expired');
        if (ad.starts_at && new Date(ad.starts_at) > new Date()) return t('admin.scheduled', 'Scheduled');
        return t('admin.active', 'Active');
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                            <th className="px-6 py-4">{t('admin.adTitle', 'Ad Title & Preview')}</th>
                            <th className="px-6 py-4">{t('admin.adType', 'Type')}</th>
                            <th className="px-6 py-4">{t('admin.adPosition', 'Position')}</th>
                            <th className="px-6 py-4">{t('admin.adStatus', 'Status')}</th>
                            <th className="px-6 py-4 text-right">{t('admin.adImpressions', 'Impressions')}</th>
                            <th className="px-6 py-4">{t('admin.adExpires', 'Expires')}</th>
                            <th className="px-6 py-4 text-right">{t('admin.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={7} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                        ) : ads.length > 0 ? ads.map(ad => (
                            <tr key={ad.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 relative overflow-hidden flex-shrink-0">
                                            {ad.image_url ? (
                                                <img src={ad.image_url} alt="" className="object-cover w-full h-full"/>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Megaphone className="w-5 h-5 text-slate-300"/>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-700">{ad.title}</div>
                                            {ad.description && <div className="text-xs text-slate-400 truncate max-w-[200px]">{ad.description}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{typeLabels[ad.type] || ad.type}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{positionLabels[ad.position] || ad.position}</span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <StitchBadge style={statusStyle(ad)} pulse={ad.is_active && (!ad.starts_at || new Date(ad.starts_at) <= new Date()) && (!ad.expires_at || new Date(ad.expires_at) >= new Date())}>{statusLabel(ad)}</StitchBadge>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700 text-right font-semibold tabular-nums">{ad.impressions || 0}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{ad.expires_at ? new Date(ad.expires_at).toLocaleDateString() : '-'}</td>
                                <td className="px-6 py-4 text-sm text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditDialog(ad)}>
                                            <Edit className="w-4 h-4"/>
                                        </button>
                                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setDeletingAd(ad); setDeleteDialogOpen(true); }}>
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7}>
                                    <div className="py-16 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <Megaphone size={32} className="text-slate-300"/>
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noAds', 'No ads found')}</h3>
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
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.createAd', 'Create Ad')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.adTitle', 'Title')}</Label><Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="Ad Title"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.adType', 'Type')}</Label>
                                <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="banner">Banner</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="native">Native</SelectItem>
                                        <SelectItem value="interstitial">Interstitial</SelectItem>
                                        <SelectItem value="popup">Popup</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>{t('admin.adPosition', 'Position')}</Label>
                                <Select value={createForm.position} onValueChange={v => setCreateForm({...createForm, position: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="top">Top</SelectItem>
                                        <SelectItem value="sidebar">Sidebar</SelectItem>
                                        <SelectItem value="bottom">Bottom</SelectItem>
                                        <SelectItem value="inline">Inline</SelectItem>
                                        <SelectItem value="fullscreen">Fullscreen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <ImageUploadField value={createForm.image_url || ''} onChange={url => setCreateForm({...createForm, image_url: url})} label={t('admin.adImage', 'Ad Image')}/>
                        <div className="grid gap-2"><Label>{t('admin.adTargetUrl', 'Target URL')}</Label><Input value={createForm.target_url || ''} onChange={e => setCreateForm({...createForm, target_url: e.target.value})} placeholder="https://..."/></div>
                        <div className="grid gap-2"><Label>{t('admin.adDescription', 'Description')}</Label><Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.adStartsAt', 'Starts At')}</Label><Input type="datetime-local" value={createForm.starts_at || ''} onChange={e => setCreateForm({...createForm, starts_at: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.adExpiresAt', 'Expires At')}</Label><Input type="datetime-local" value={createForm.expires_at || ''} onChange={e => setCreateForm({...createForm, expires_at: e.target.value})}/></div>
                        </div>
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
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editAd', 'Edit Ad')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.adTitle', 'Title')}</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.adType', 'Type')}</Label>
                                <Select value={editForm.type} onValueChange={v => setEditForm({...editForm, type: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="banner">Banner</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="native">Native</SelectItem>
                                        <SelectItem value="interstitial">Interstitial</SelectItem>
                                        <SelectItem value="popup">Popup</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>{t('admin.adPosition', 'Position')}</Label>
                                <Select value={editForm.position} onValueChange={v => setEditForm({...editForm, position: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="top">Top</SelectItem>
                                        <SelectItem value="sidebar">Sidebar</SelectItem>
                                        <SelectItem value="bottom">Bottom</SelectItem>
                                        <SelectItem value="inline">Inline</SelectItem>
                                        <SelectItem value="fullscreen">Fullscreen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <ImageUploadField value={editForm.image_url || ''} onChange={url => setEditForm({...editForm, image_url: url})} label={t('admin.adImage', 'Ad Image')}/>
                        <div className="grid gap-2"><Label>{t('admin.adTargetUrl', 'Target URL')}</Label><Input value={editForm.target_url || ''} onChange={e => setEditForm({...editForm, target_url: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.adDescription', 'Description')}</Label><Input value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.adStartsAt', 'Starts At')}</Label><Input type="datetime-local" value={editForm.starts_at || ''} onChange={e => setEditForm({...editForm, starts_at: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.adExpiresAt', 'Expires At')}</Label><Input type="datetime-local" value={editForm.expires_at || ''} onChange={e => setEditForm({...editForm, expires_at: e.target.value})}/></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="edit-ad-active" checked={editForm.is_active ?? true} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-ad-active">{t('admin.enabled', 'Enabled')}</Label>
                        </div>
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
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteAdConfirm', 'Are you sure you want to delete this ad?')}</AlertDialogDescription>
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
