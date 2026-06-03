import React, {useState} from 'react';
import {
    Megaphone, Plus, Edit, Trash2, BarChart3, LayoutGrid, DollarSign, Eye, MousePointerClick, ChevronLeft, ChevronRight,
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
import {
    useAdminAdCampaigns, useCreateAdCampaign, useUpdateAdCampaign, useDeleteAdCampaign,
    useAdminAdSlots, useCreateAdSlot, useUpdateAdSlot, useDeleteAdSlot,
} from '@/hooks/queries';
import {type AdCampaign, type AdSlot, type CreateAdCampaignRequest, type CreateAdSlotRequest} from '@/lib/api/ads';

const campaignStatusConfig: Record<string, {label: string; style: 'emerald' | 'slate' | 'amber' | 'red'}> = {
    draft: {label: 'Draft', style: 'slate'},
    active: {label: 'Active', style: 'emerald'},
    paused: {label: 'Paused', style: 'amber'},
    completed: {label: 'Completed', style: 'emerald'},
    expired: {label: 'Expired', style: 'red'},
};

const adTypeLabels: Record<string, string> = {
    banner: 'Banner',
    video: 'Video',
    native: 'Native',
    popup: 'Popup',
    sidebar: 'Sidebar',
    overlay: 'Overlay',
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

export default function AdsPage() {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState('campaigns');

    return (
        <div className="space-y-4 p-4 md:p-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                    <Megaphone className="h-6 w-6"/>{t('admin.adsManagement', 'Ads Management')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{t('admin.adsDesc', 'Manage ad campaigns, slots, and performance')}</p>
            </div>

            <div className="flex border-b border-slate-200 bg-white mb-6">
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'campaigns' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('campaigns')}>{t('admin.campaigns', 'Campaigns')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'slots' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('slots')}>{t('admin.slots', 'Slots')}</button>
            </div>

            {activeTab === 'campaigns' && <CampaignsTab/>}
            {activeTab === 'slots' && <SlotsTab/>}
        </div>
    );
}

const CampaignsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: campaignsData, isLoading} = useAdminAdCampaigns({page, page_size: 20});
    const createMutation = useCreateAdCampaign();
    const updateMutation = useUpdateAdCampaign();
    const deleteMutation = useDeleteAdCampaign();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AdCampaign | null>(null);
    const [createForm, setCreateForm] = useState<CreateAdCampaignRequest>({name: '', type: 'banner', start_date: '', end_date: ''});
    const [editForm, setEditForm] = useState({name: '', type: '', status: '', budget: 0, target_url: '', priority: 0});

    const campaigns = campaignsData?.items || [];
    const total = campaignsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', type: 'banner', start_date: '', end_date: ''});
        } catch (err) { console.error('Failed to create campaign:', err); }
    };

    const openEditDialog = (c: AdCampaign) => {
        setEditingItem(c);
        setEditForm({name: c.name, type: c.type, status: c.status, budget: c.budget, target_url: c.target_url, priority: c.priority});
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        try {
            await updateMutation.mutateAsync({id: editingItem.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) { console.error('Failed to update campaign:', err); }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            await deleteMutation.mutateAsync(editingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) { console.error('Failed to delete campaign:', err); }
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5"/>{t('admin.adCampaigns', 'Ad Campaigns')}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{t('admin.adCampaignsDesc', 'Create and manage advertising campaigns')}</p>
                    </div>
                    <button onClick={() => setCreateDialogOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4 mr-2 inline"/>{t('admin.addCampaign', 'Add Campaign')}</button>
                </div>
                <div className="p-6">
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.campaignName', 'Name')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.type', 'Type')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status', 'Status')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Eye className="w-4 h-4 inline mr-1"/>{t('admin.impressions', 'Impressions')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><MousePointerClick className="w-4 h-4 inline mr-1"/>{t('admin.clicks', 'Clicks')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.ctr', 'CTR')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><DollarSign className="w-4 h-4 inline mr-1"/>{t('admin.spent', 'Spent')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {campaigns.length > 0 ? campaigns.map(c => {
                                        const sc = campaignStatusConfig[c.status] || campaignStatusConfig.draft;
                                        return (
                                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">{c.name}</td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{adTypeLabels[c.type] || c.type}</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">
                                                    <StitchBadge style={sc.style} pulse={c.status === 'active'}>{sc.label}</StitchBadge>
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">{c.impressions.toLocaleString()}</td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">{c.clicks.toLocaleString()}</td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">{(c.ctr * 100).toFixed(2)}%</td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">${c.spent.toFixed(2)}</td>
                                                <td className="px-6 py-3.5 text-sm text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditDialog(c)}><Edit className="w-4 h-4"/></button>
                                                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setEditingItem(c); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={8}>
                                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                        <BarChart3 size={32} className="text-slate-300"/>
                                                    </div>
                                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noCampaigns', 'No campaigns found')}</h3>
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
                <DialogContent className="sm:max-w-[550px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.addCampaign', 'Add Campaign')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.campaignName', 'Name')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="Summer Sale Banner"/></div>
                        <div className="grid gap-2"><Label>{t('admin.type', 'Type')}</Label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="banner">Banner</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="native">Native</SelectItem>
                                    <SelectItem value="popup">Popup</SelectItem>
                                    <SelectItem value="sidebar">Sidebar</SelectItem>
                                    <SelectItem value="overlay">Overlay</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.startDate', 'Start Date')}</Label><Input type="date" value={createForm.start_date} onChange={e => setCreateForm({...createForm, start_date: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.endDate', 'End Date')}</Label><Input type="date" value={createForm.end_date} onChange={e => setCreateForm({...createForm, end_date: e.target.value})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.budget', 'Budget')}</Label><Input type="number" value={createForm.budget || 0} onChange={e => setCreateForm({...createForm, budget: Number(e.target.value)})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.targetUrl', 'Target URL')}</Label><Input value={createForm.target_url || ''} onChange={e => setCreateForm({...createForm, target_url: e.target.value})} placeholder="https://..."/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.name}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[550px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editCampaign', 'Edit Campaign')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.campaignName', 'Name')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.status', 'Status')}</Label>
                            <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="paused">Paused</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.budget', 'Budget')}</Label><Input type="number" value={editForm.budget} onChange={e => setEditForm({...editForm, budget: Number(e.target.value)})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.targetUrl', 'Target URL')}</Label><Input value={editForm.target_url} onChange={e => setEditForm({...editForm, target_url: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.priority', 'Priority')}</Label><Input type="number" value={editForm.priority} onChange={e => setEditForm({...editForm, priority: Number(e.target.value)})}/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleUpdate}>{t('common.save', 'Save')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteCampaignConfirm', 'Are you sure you want to delete this campaign?')}</AlertDialogDescription>
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

const SlotsTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: slotsData, isLoading} = useAdminAdSlots();
    const createMutation = useCreateAdSlot();
    const updateMutation = useUpdateAdSlot();
    const deleteMutation = useDeleteAdSlot();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AdSlot | null>(null);
    const [createForm, setCreateForm] = useState<CreateAdSlotRequest>({name: '', position: '', ad_type: 'banner'});
    const [editForm, setEditForm] = useState({name: '', position: '', ad_type: '', is_active: true});

    const slots = (slotsData as AdSlot[] | undefined) || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', position: '', ad_type: 'banner'});
        } catch (err) { console.error('Failed to create slot:', err); }
    };

    const openEditDialog = (s: AdSlot) => {
        setEditingItem(s);
        setEditForm({name: s.name, position: s.position, ad_type: s.ad_type, is_active: s.is_active});
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        try {
            await updateMutation.mutateAsync({id: editingItem.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) { console.error('Failed to update slot:', err); }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            await deleteMutation.mutateAsync(editingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) { console.error('Failed to delete slot:', err); }
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5"/>{t('admin.adSlots', 'Ad Slots')}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{t('admin.adSlotsDesc', 'Configure ad placement slots')}</p>
                    </div>
                    <button onClick={() => setCreateDialogOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4 mr-2 inline"/>{t('admin.addSlot', 'Add Slot')}</button>
                </div>
                <div className="p-6">
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.slotName', 'Name')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.position', 'Position')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.type', 'Type')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.dimensions', 'Dimensions')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status', 'Status')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.impressions', 'Impressions')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {slots.length > 0 ? slots.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">{s.name}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{s.position}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{adTypeLabels[s.ad_type] || s.ad_type}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">{s.dimensions || '-'}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <StitchBadge style={s.is_active ? 'emerald' : 'slate'}>{s.is_active ? t('admin.active', 'Active') : t('admin.inactive', 'Inactive')}</StitchBadge>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">{s.impressions.toLocaleString()}</td>
                                            <td className="px-6 py-3.5 text-sm text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditDialog(s)}><Edit className="w-4 h-4"/></button>
                                                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setEditingItem(s); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7}>
                                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                        <LayoutGrid size={32} className="text-slate-300"/>
                                                    </div>
                                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noSlots', 'No slots found')}</h3>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.addSlot', 'Add Slot')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.slotName', 'Name')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="Homepage Banner"/></div>
                        <div className="grid gap-2"><Label>{t('admin.position', 'Position')}</Label><Input value={createForm.position} onChange={e => setCreateForm({...createForm, position: e.target.value})} placeholder="header, sidebar, footer"/></div>
                        <div className="grid gap-2"><Label>{t('admin.type', 'Type')}</Label>
                            <Select value={createForm.ad_type} onValueChange={v => setCreateForm({...createForm, ad_type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="banner">Banner</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="native">Native</SelectItem>
                                    <SelectItem value="popup">Popup</SelectItem>
                                    <SelectItem value="sidebar">Sidebar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.dimensions', 'Dimensions')}</Label><Input value={createForm.dimensions || ''} onChange={e => setCreateForm({...createForm, dimensions: e.target.value})} placeholder="728x90"/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.name || !createForm.position}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editSlot', 'Edit Slot')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.slotName', 'Name')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.position', 'Position')}</Label><Input value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})}/></div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="edit-slot-active" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-slot-active">{t('admin.active', 'Active')}</Label>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleUpdate}>{t('common.save', 'Save')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteSlotConfirm', 'Are you sure you want to delete this slot?')}</AlertDialogDescription>
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
