import React, {useState} from 'react';
import {
    CreditCard, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
    Receipt, Wallet,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
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

export default function PaymentPage() {
    const {t} = useTranslation();
    return (
        <div className="space-y-4 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard className="h-6 w-6"/>{t('admin.paymentManagement')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{t('admin.paymentManagementDesc')}</p>
            </div>

            <Tabs defaultValue="plans">
                <TabsList>
                    <TabsTrigger value="plans">{t('admin.plansTab')}</TabsTrigger>
                    <TabsTrigger value="orders">{t('admin.ordersTab')}</TabsTrigger>
                    <TabsTrigger value="wallets">{t('admin.walletsTab')}</TabsTrigger>
                </TabsList>
                <TabsContent value="plans" className="mt-4">
                    <PlansTab/>
                </TabsContent>
                <TabsContent value="orders" className="mt-4">
                    <OrdersTab/>
                </TabsContent>
                <TabsContent value="wallets" className="mt-4">
                    <WalletsTab/>
                </TabsContent>
            </Tabs>
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
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5"/>{t('admin.subscriptionPlans')}</CardTitle>
                            <CardDescription>{t('admin.subscriptionPlansDesc')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}><Plus className="w-4 h-4 mr-2"/>{t('admin.addPlan')}</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.planName')}</TableHead>
                                    <TableHead>{t('admin.planPrice')}</TableHead>
                                    <TableHead>{t('admin.planDuration')}</TableHead>
                                    <TableHead>{t('admin.planCurrency')}</TableHead>
                                    <TableHead>{t('admin.planStatus')}</TableHead>
                                    <TableHead>{t('admin.planSortOrder')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.length > 0 ? plans.map(plan => (
                                    <TableRow key={plan.id}>
                                        <TableCell className="font-medium">{plan.name}</TableCell>
                                        <TableCell>{plan.price}</TableCell>
                                        <TableCell>{plan.duration_days} {t('admin.days')}</TableCell>
                                        <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{plan.currency}</code></TableCell>
                                        <TableCell><Badge variant={plan.is_active ? 'default' : 'secondary'}>{plan.is_active ? t('admin.enabled') : t('admin.disabled')}</Badge></TableCell>
                                        <TableCell>{plan.sort_order}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(plan)}>
                                                    <Edit className="w-4 h-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { setDeletingPlan(plan); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{t('admin.noPlans')}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>{t('admin.addPlanTitle')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>{t('admin.planName')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder={t('admin.planName')}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.planPrice')}</Label><Input type="number" step="0.01" value={createForm.price} onChange={e => setCreateForm({...createForm, price: Number(e.target.value)})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.planDuration')}</Label><Input type="number" value={createForm.duration_days} onChange={e => setCreateForm({...createForm, duration_days: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.planCurrency')}</Label>
                                <Select value={createForm.currency || 'CNY'} onValueChange={v => setCreateForm({...createForm, currency: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CNY">CNY</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>{t('admin.planSortOrder')}</Label><Input type="number" value={createForm.sort_order || 0} onChange={e => setCreateForm({...createForm, sort_order: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.planDescription')}</Label><Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})}/></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.name || createForm.price <= 0}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>{t('admin.editPlan')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>{t('admin.planName')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.planPrice')}</Label><Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.planDuration')}</Label><Input type="number" value={editForm.duration_days} onChange={e => setEditForm({...editForm, duration_days: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.planCurrency')}</Label>
                                <Select value={editForm.currency || 'CNY'} onValueChange={v => setEditForm({...editForm, currency: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CNY">CNY</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>{t('admin.planSortOrder')}</Label><Input type="number" value={editForm.sort_order || 0} onChange={e => setEditForm({...editForm, sort_order: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.planDescription')}</Label><Input value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})}/></div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="edit-plan-active" checked={editForm.is_active ?? true} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-plan-active">{t('admin.enabled')}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleUpdate} disabled={!editForm.name}>{t('common.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.deletePlanConfirm', {name: deletingPlan?.name})}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('admin.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
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

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        refunded: 'bg-purple-100 text-purple-800',
        expired: 'bg-gray-100 text-gray-800',
        cancelled: 'bg-red-100 text-red-800',
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5"/>{t('admin.orders')}</CardTitle>
                <CardDescription>{t('admin.ordersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin.orderNo')}</TableHead>
                                <TableHead>{t('admin.orderAmount')}</TableHead>
                                <TableHead>{t('admin.orderStatus')}</TableHead>
                                <TableHead>{t('admin.orderPaymentMethod')}</TableHead>
                                <TableHead>{t('admin.orderTime')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length > 0 ? orders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium"><code className="text-xs bg-muted px-1 py-0.5 rounded">{order.order_no}</code></TableCell>
                                    <TableCell>{order.amount} {order.currency}</TableCell>
                                    <TableCell><Badge className={statusColors[order.status] || ''}>{order.status}</Badge></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{order.payment_method || '-'}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{order.create_time ? new Date(order.create_time).toLocaleString() : '-'}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t('admin.noOrders')}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
                {total > 20 && (
                    <div className="flex items-center justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.prev')}</Button>
                        <span className="text-sm text-muted-foreground">{page} / {Math.ceil(total / 20)}</span>
                        <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const WalletsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: walletsData, isLoading} = useAdminWallets({page, page_size: 20});

    const wallets = walletsData?.items || [];
    const total = walletsData?.total || 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5"/>{t('admin.wallets')}</CardTitle>
                <CardDescription>{t('admin.walletsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin.walletUserId')}</TableHead>
                                <TableHead>{t('admin.walletBalance')}</TableHead>
                                <TableHead>{t('admin.walletFrozen')}</TableHead>
                                <TableHead>{t('admin.walletCurrency')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {wallets.length > 0 ? wallets.map(wallet => (
                                <TableRow key={wallet.id}>
                                    <TableCell className="font-medium"><code className="text-xs bg-muted px-1 py-0.5 rounded">{wallet.user_id}</code></TableCell>
                                    <TableCell>{wallet.balance}</TableCell>
                                    <TableCell>{wallet.frozen}</TableCell>
                                    <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{wallet.currency}</code></TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{t('admin.noWallets')}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
                {total > 20 && (
                    <div className="flex items-center justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.prev')}</Button>
                        <span className="text-sm text-muted-foreground">{page} / {Math.ceil(total / 20)}</span>
                        <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
