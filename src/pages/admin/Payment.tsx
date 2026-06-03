import React, {useState} from 'react';
import {
    CreditCard, Plus, Edit, Trash2, Receipt, Wallet, ChevronLeft, ChevronRight,
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
    useAdminSubscriptionPlans, useCreateSubscriptionPlan, useUpdateSubscriptionPlan, useDeleteSubscriptionPlan,
    useAdminOrders, useAdminWallets,
} from '@/hooks/queries';
import {
    type SubscriptionPlan, type CreateSubscriptionPlanRequest, type UpdateSubscriptionPlanRequest,
} from '@/lib/api/payment';

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

export default function PaymentPage() {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState('plans');

    return (
        <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                        <CreditCard className="h-6 w-6 text-indigo-600"/>
                        {t('admin.paymentManagement', 'Payments & Subscriptions')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.paymentManagementDesc', 'Manage subscription plans, orders, and wallet balances.')}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white">
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'plans' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('plans')}>{t('admin.plansTab', 'Plans')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'orders' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('orders')}>{t('admin.ordersTab', 'Orders')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'wallets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('wallets')}>{t('admin.walletsTab', 'Wallets')}</button>
            </div>

            <div className="mt-6">
                {activeTab === 'plans' && <PlansTab/>}
                {activeTab === 'orders' && <OrdersTab/>}
                {activeTab === 'wallets' && <WalletsTab/>}
            </div>
        </div>
    );
}

const PlansTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: plansData, isLoading} = useAdminSubscriptionPlans();
    const createMutation = useCreateSubscriptionPlan();
    const updateMutation = useUpdateSubscriptionPlan();
    const deleteMutation = useDeleteSubscriptionPlan();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null);
    const [createForm, setCreateForm] = useState<CreateSubscriptionPlanRequest>({
        name: '', price: 0, duration_days: 30,
    });
    const [editForm, setEditForm] = useState<UpdateSubscriptionPlanRequest>({
        name: '', price: 0, duration_days: 30, is_active: true, sort_order: 0,
    });

    const plans = (plansData as SubscriptionPlan[] | undefined) || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', price: 0, duration_days: 30});
        } catch (err) {
            console.error('Failed to create plan:', err);
        }
    };

    const openEditDialog = (plan: SubscriptionPlan) => {
        setEditingPlan(plan);
        setEditForm({
            name: plan.name,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            duration_days: plan.duration_days,
            is_active: plan.is_active,
            sort_order: plan.sort_order,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingPlan) return;
        try {
            await updateMutation.mutateAsync({id: editingPlan.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update plan:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingPlan) return;
        try {
            await deleteMutation.mutateAsync(deletingPlan.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete plan:', err);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">{t('admin.activeTierManagement', 'Active Tier Management')}</h2>
                <button onClick={() => setCreateDialogOpen(true)} className="px-4 py-2 border border-slate-200 rounded-lg text-indigo-600 text-sm font-semibold hover:bg-slate-50">{t('admin.addPlan', 'Add New Tier')}</button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                            <th className="px-6 py-4">{t('admin.planName', 'Name')}</th>
                            <th className="px-6 py-4">{t('admin.planPrice', 'Price')}</th>
                            <th className="px-6 py-4">{t('admin.planDuration', 'Duration')}</th>
                            <th className="px-6 py-4">{t('admin.planCurrency', 'Currency')}</th>
                            <th className="px-6 py-4">{t('admin.planStatus', 'Status')}</th>
                            <th className="px-6 py-4 text-right">{t('admin.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={6} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                        ) : plans.length > 0 ? plans.map(plan => (
                            <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{plan.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-700 font-semibold">${plan.price}</td>
                                <td className="px-6 py-4 text-sm text-slate-700">{plan.duration_days} {t('admin.days', 'days')}</td>
                                <td className="px-6 py-4 text-sm text-slate-700"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{plan.currency}</code></td>
                                <td className="px-6 py-4 text-sm text-slate-700">
                                    <StitchBadge style={plan.is_active ? 'emerald' : 'slate'}>{plan.is_active ? t('admin.enabled', 'Enabled') : t('admin.disabled', 'Disabled')}</StitchBadge>
                                </td>
                                <td className="px-6 py-4 text-sm text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditDialog(plan)}>
                                            <Edit className="w-4 h-4"/>
                                        </button>
                                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setDeletingPlan(plan); setDeleteDialogOpen(true); }}>
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6}>
                                    <div className="py-16 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <CreditCard size={32} className="text-slate-300"/>
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noPlans', 'No plans found')}</h3>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.addPlanTitle', 'Add Plan')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.planName', 'Name')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder={t('admin.planName')}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.planPrice', 'Price')}</Label><Input type="number" step="0.01" value={createForm.price} onChange={e => setCreateForm({...createForm, price: Number(e.target.value)})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.planDuration', 'Duration')}</Label><Input type="number" value={createForm.duration_days} onChange={e => setCreateForm({...createForm, duration_days: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.planCurrency', 'Currency')}</Label>
                                <Select value={createForm.currency || 'CNY'} onValueChange={v => setCreateForm({...createForm, currency: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CNY">CNY</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>{t('admin.planSortOrder', 'Sort Order')}</Label><Input type="number" value={createForm.sort_order || 0} onChange={e => setCreateForm({...createForm, sort_order: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.planDescription', 'Description')}</Label><Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})}/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.name || createForm.price <= 0}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editPlan', 'Edit Plan')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.planName', 'Name')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.planPrice', 'Price')}</Label><Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.planDuration', 'Duration')}</Label><Input type="number" value={editForm.duration_days} onChange={e => setEditForm({...editForm, duration_days: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.planCurrency', 'Currency')}</Label>
                                <Select value={editForm.currency || 'CNY'} onValueChange={v => setEditForm({...editForm, currency: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CNY">CNY</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>{t('admin.planSortOrder', 'Sort Order')}</Label><Input type="number" value={editForm.sort_order || 0} onChange={e => setEditForm({...editForm, sort_order: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.planDescription', 'Description')}</Label><Input value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})}/></div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="edit-plan-active" checked={editForm.is_active ?? true} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-plan-active">{t('admin.enabled', 'Enabled')}</Label>
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
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deletePlanConfirm', 'Are you sure you want to delete this plan?')}</AlertDialogDescription>
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

const OrdersTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: ordersData, isLoading} = useAdminOrders({page, page_size: 20});

    const orders = ordersData?.items || [];
    const total = ordersData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const statusStyles: Record<string, 'emerald' | 'slate' | 'amber' | 'red'> = {
        pending: 'amber',
        paid: 'emerald',
        completed: 'emerald',
        refunded: 'slate',
        expired: 'slate',
        cancelled: 'red',
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                        <th className="px-6 py-4">{t('admin.orderNo', 'Order ID')}</th>
                        <th className="px-6 py-4">{t('admin.orderAmount', 'Amount')}</th>
                        <th className="px-6 py-4">{t('admin.orderStatus', 'Status')}</th>
                        <th className="px-6 py-4">{t('admin.orderPaymentMethod', 'Payment Method')}</th>
                        <th className="px-6 py-4">{t('admin.orderTime', 'Date')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                        <tr><td colSpan={5} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                    ) : orders.length > 0 ? orders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-700 font-medium"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{order.order_no}</code></td>
                            <td className="px-6 py-4 text-sm text-slate-700 font-semibold">{order.amount} {order.currency}</td>
                            <td className="px-6 py-4 text-sm">
                                <StitchBadge style={statusStyles[order.status] || 'slate'}>{order.status}</StitchBadge>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">{order.payment_method || '-'}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{order.create_time ? new Date(order.create_time).toLocaleDateString() : '-'}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5}>
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Receipt size={32} className="text-slate-300"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noOrders', 'No orders found')}</h3>
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

const WalletsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: walletsData, isLoading} = useAdminWallets({page, page_size: 20});

    const wallets = walletsData?.items || [];
    const total = walletsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                        <th className="px-6 py-4">{t('admin.walletUserId', 'User ID')}</th>
                        <th className="px-6 py-4">{t('admin.walletBalance', 'Balance')}</th>
                        <th className="px-6 py-4">{t('admin.walletFrozen', 'Frozen')}</th>
                        <th className="px-6 py-4">{t('admin.walletCurrency', 'Currency')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                        <tr><td colSpan={4} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                    ) : wallets.length > 0 ? wallets.map(wallet => (
                        <tr key={wallet.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-700 font-medium"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{wallet.user_id}</code></td>
                            <td className="px-6 py-4 text-sm text-slate-700 font-semibold">{wallet.balance}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{wallet.frozen}</td>
                            <td className="px-6 py-4 text-sm text-slate-700"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{wallet.currency}</code></td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4}>
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Wallet size={32} className="text-slate-300"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noWallets', 'No wallets found')}</h3>
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
