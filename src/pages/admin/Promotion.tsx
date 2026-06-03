import React, {useState} from 'react';
import {
    Gift, Plus, Edit, Trash2, Tag, ChevronLeft, ChevronRight, Calendar,
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
    useAdminPromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion,
} from '@/hooks/queries';
import {type Promotion, type CreatePromotionRequest, type UpdatePromotionRequest} from '@/lib/api/promotion';

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

export default function PromotionPage() {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState('coupons');

    return (
        <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                        <Gift className="h-6 w-6 text-indigo-600"/>
                        {t('admin.promotionCenter', 'Promotion Center')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.promotionCenterDesc', 'Create and manage promotional campaigns, coupons, and discount rules.')}</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2">
                        <Plus className="w-4 h-4"/>
                        {t('admin.createPromotion', 'Create Promotion')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white">
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'coupons' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('coupons')}>{t('admin.couponsTab', 'Coupons')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'campaigns' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('campaigns')}>{t('admin.campaignsTab', 'Campaigns')}</button>
            </div>

            <div className="mt-6">
                {activeTab === 'coupons' && <CouponsTab/>}
                {activeTab === 'campaigns' && <CampaignsTab/>}
            </div>
        </div>
    );
}

const CouponsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: promotionsData, isLoading} = useAdminPromotions({page, page_size: 20});
    const createMutation = useCreatePromotion();
    const updateMutation = useUpdatePromotion();
    const deleteMutation = useDeletePromotion();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Promotion | null>(null);
    const [deletingItem, setDeletingItem] = useState<Promotion | null>(null);
    const [createForm, setCreateForm] = useState<CreatePromotionRequest>({
        name: '', type: 'percentage', value: 0,
    });
    const [editForm, setEditForm] = useState<UpdatePromotionRequest>({
        name: '', type: 'percentage', value: 0, is_active: true,
    });

    const promotions = promotionsData?.items || [];
    const total = promotionsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', type: 'percentage', value: 0});
        } catch (err) {
            console.error('Failed to create promotion:', err);
        }
    };

    const openEditDialog = (item: Promotion) => {
        setEditingItem(item);
        setEditForm({
            name: item.name,
            type: item.type,
            value: item.value,
            code: item.code,
            description: item.description,
            max_uses: item.max_uses,
            starts_at: item.starts_at,
            expires_at: item.expires_at,
            is_active: item.is_active,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        try {
            await updateMutation.mutateAsync({id: editingItem.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update promotion:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            await deleteMutation.mutateAsync(deletingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete promotion:', err);
        }
    };

    const typeLabels: Record<string, string> = {
        percentage: '% Off',
        fixed: 'Fixed Amount',
        free_trial: 'Free Trial',
        bundle: 'Bundle',
    };

    const statusStyle = (item: Promotion): 'emerald' | 'slate' | 'amber' | 'red' => {
        if (!item.is_active) return 'slate';
        if (item.expires_at && new Date(item.expires_at) < new Date()) return 'red';
        if (item.starts_at && new Date(item.starts_at) > new Date()) return 'amber';
        return 'emerald';
    };

    const statusLabel = (item: Promotion): string => {
        if (!item.is_active) return t('admin.disabled', 'Disabled');
        if (item.expires_at && new Date(item.expires_at) < new Date()) return t('admin.expired', 'Expired');
        if (item.starts_at && new Date(item.starts_at) > new Date()) return t('admin.scheduled', 'Scheduled');
        return t('admin.active', 'Active');
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                            <th className="px-6 py-4">{t('admin.promotionName', 'Name')}</th>
                            <th className="px-6 py-4">{t('admin.promotionCode', 'Code')}</th>
                            <th className="px-6 py-4">{t('admin.promotionType', 'Type')}</th>
                            <th className="px-6 py-4">{t('admin.promotionValue', 'Value')}</th>
                            <th className="px-6 py-4">{t('admin.promotionUsage', 'Usage')}</th>
                            <th className="px-6 py-4">{t('admin.promotionStatus', 'Status')}</th>
                            <th className="px-6 py-4">{t('admin.promotionExpires', 'Expires')}</th>
                            <th className="px-6 py-4 text-right">{t('admin.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={8} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                        ) : promotions.length > 0 ? promotions.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{item.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-700"><code className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono">{item.code || '-'}</code></td>
                                <td className="px-6 py-4 text-sm text-slate-700">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{typeLabels[item.type] || item.type}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700 font-semibold">
                                    {item.type === 'percentage' ? `${item.value}%` : item.type === 'fixed' ? `$${item.value}` : item.value}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {item.used_count || 0} / {item.max_uses || '∞'}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <StitchBadge style={statusStyle(item)} pulse={item.is_active && (!item.starts_at || new Date(item.starts_at) <= new Date()) && (!item.expires_at || new Date(item.expires_at) >= new Date())}>{statusLabel(item)}</StitchBadge>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">{item.expires_at ? new Date(item.expires_at).toLocaleDateString() : '-'}</td>
                                <td className="px-6 py-4 text-sm text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditDialog(item)}>
                                            <Edit className="w-4 h-4"/>
                                        </button>
                                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setDeletingItem(item); setDeleteDialogOpen(true); }}>
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={8}>
                                    <div className="py-16 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <Tag size={32} className="text-slate-300"/>
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noPromotions', 'No promotions found')}</h3>
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
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.createPromotion', 'Create Promotion')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.promotionName', 'Name')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="Promotion Name"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.promotionType', 'Type')}</Label>
                                <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">% Off</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                        <SelectItem value="free_trial">Free Trial</SelectItem>
                                        <SelectItem value="bundle">Bundle</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>{t('admin.promotionValue', 'Value')}</Label><Input type="number" step="0.01" value={createForm.value} onChange={e => setCreateForm({...createForm, value: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.promotionCode', 'Code')}</Label><Input value={createForm.code || ''} onChange={e => setCreateForm({...createForm, code: e.target.value})} placeholder="PROMO2024"/></div>
                        <div className="grid gap-2"><Label>{t('admin.promotionDescription', 'Description')}</Label><Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.promotionStartsAt', 'Starts At')}</Label><Input type="datetime-local" value={createForm.starts_at || ''} onChange={e => setCreateForm({...createForm, starts_at: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.promotionExpiresAt', 'Expires At')}</Label><Input type="datetime-local" value={createForm.expires_at || ''} onChange={e => setCreateForm({...createForm, expires_at: e.target.value})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.promotionMaxUses', 'Max Uses')}</Label><Input type="number" value={createForm.max_uses || 0} onChange={e => setCreateForm({...createForm, max_uses: Number(e.target.value)})}/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.name}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editPromotion', 'Edit Promotion')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.promotionName', 'Name')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.promotionType', 'Type')}</Label>
                                <Select value={editForm.type} onValueChange={v => setEditForm({...editForm, type: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">% Off</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                        <SelectItem value="free_trial">Free Trial</SelectItem>
                                        <SelectItem value="bundle">Bundle</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>{t('admin.promotionValue', 'Value')}</Label><Input type="number" step="0.01" value={editForm.value} onChange={e => setEditForm({...editForm, value: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.promotionCode', 'Code')}</Label><Input value={editForm.code || ''} onChange={e => setEditForm({...editForm, code: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.promotionDescription', 'Description')}</Label><Input value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.promotionStartsAt', 'Starts At')}</Label><Input type="datetime-local" value={editForm.starts_at || ''} onChange={e => setEditForm({...editForm, starts_at: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.promotionExpiresAt', 'Expires At')}</Label><Input type="datetime-local" value={editForm.expires_at || ''} onChange={e => setEditForm({...editForm, expires_at: e.target.value})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.promotionMaxUses', 'Max Uses')}</Label><Input type="number" value={editForm.max_uses || 0} onChange={e => setEditForm({...editForm, max_uses: Number(e.target.value)})}/></div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="edit-promo-active" checked={editForm.is_active ?? true} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-promo-active">{t('admin.enabled', 'Enabled')}</Label>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleUpdate} disabled={!editForm.name}>{t('common.save', 'Save')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deletePromotionConfirm', 'Are you sure you want to delete this promotion?')}</AlertDialogDescription>
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

const CampaignsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: promotionsData, isLoading} = useAdminPromotions({page, page_size: 20, type: 'campaign'});

    const campaigns = promotionsData?.items || [];
    const total = promotionsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                        <th className="px-6 py-4">{t('admin.campaignName', 'Campaign Name')}</th>
                        <th className="px-6 py-4">{t('admin.campaignPeriod', 'Period')}</th>
                        <th className="px-6 py-4">{t('admin.campaignStatus', 'Status')}</th>
                        <th className="px-6 py-4">{t('admin.campaignBudget', 'Budget Used')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                        <tr><td colSpan={4} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                    ) : campaigns.length > 0 ? campaigns.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-700 font-medium">{c.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400"/>
                                    {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '-'} — {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '-'}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                                <StitchBadge style={c.is_active ? 'emerald' : 'slate'}>{c.is_active ? t('admin.active', 'Active') : t('admin.disabled', 'Disabled')}</StitchBadge>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">{c.used_count || 0} / {c.max_uses || '∞'}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4}>
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Gift size={32} className="text-slate-300"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noCampaigns', 'No campaigns found')}</h3>
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
    );
};
