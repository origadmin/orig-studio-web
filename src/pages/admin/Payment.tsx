import React, {useState} from 'react';
import {
    CreditCard, Plus, Trash2, Receipt, Wallet, ChevronLeft, ChevronRight,
    CheckCircle2, XCircle,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {useFeatureFlags} from '@/contexts/FeatureFlagsContext';
import {cn} from '@/lib/utils';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {
    Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {
    useAdminSubscriptionPlans, useCreateSubscriptionPlan, useUpdateSubscriptionPlan, useDeleteSubscriptionPlan,
    useAdminOrders, useAdminWallets,
} from '@/hooks/queries';
import {
    type SubscriptionPlan, type CreateSubscriptionPlanRequest, type UpdateSubscriptionPlanRequest,
} from '@/lib/api/payment';

/* ------------------------------------------------------------------ */
/*  Revenue Sparkline Card                                             */
/* ------------------------------------------------------------------ */
const RevenueCard: React.FC<{
    label: string; value: string; colorClass: string; path: string;
}> = ({label, value, colorClass, path}) => (
    <Card className="flex flex-col justify-between h-32">
        <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground mb-1">{label}</p>
                <h3 className="text-[30px] font-bold leading-[38px] -tracking-[0.02em]">{value}</h3>
            </div>
            <svg className="w-full h-10" viewBox="0 0 200 40">
                <path d={path} fill="none" className={colorClass} stroke="currentColor" strokeWidth="2"/>
            </svg>
        </CardContent>
    </Card>
);

/* ------------------------------------------------------------------ */
/*  Plan Feature Item (used in plan cards)                             */
/* ------------------------------------------------------------------ */
const PlanFeature: React.FC<{label: string; included: boolean}> = ({label, included}) => (
    <li className="flex items-center gap-2 text-sm">
        {included ? (
            <CheckCircle2 className="text-success shrink-0" size={16}/>
        ) : (
            <XCircle className="text-muted-foreground/40 shrink-0" size={16}/>
        )}
        <span className={included ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </li>
);

/* ================================================================== */
/*  PaymentPage (main)                                                 */
/* ================================================================== */
export default function PaymentPage() {
    const {t} = useTranslation();
    useFeatureFlags(); // respect feature gate
    const [activeTab, setActiveTab] = useState('plans');

    return (
        <div className="p-6 space-y-8">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.payment', '支付管理')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <CreditCard className="h-6 w-6 text-primary"/>
                        {t('admin.paymentManagement', 'Payments & Subscriptions')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.paymentManagementDesc', 'Manage subscription plans, orders, and wallet balances.')}
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="rounded-full px-6 py-2 font-semibold"
                    onClick={() => {
                        const el = document.getElementById('add-tier-trigger');
                        if (el) el.click();
                    }}
                >
                    <Plus className="h-4 w-4"/>
                    {t('admin.addSubscriptionTier', 'Add Subscription Tier')}
                </Button>
            </div>

            {/* ── Revenue Stats Bento Grid ────────────────────────────── */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <RevenueCard
                    label={t('admin.totalRevenue', 'TOTAL REVENUE')}
                    value="$428,930.00"
                    colorClass="text-primary"
                    path="M0,35 Q20,30 40,32 T80,20 T120,25 T160,10 T200,5"
                />
                <RevenueCard
                    label={t('admin.activeSubscriptions', 'ACTIVE SUBSCRIPTIONS')}
                    value="1,204"
                    colorClass="text-success"
                    path="M0,25 Q20,28 40,20 T80,22 T120,15 T160,18 T200,10"
                />
                <RevenueCard
                    label={t('admin.churnRate', 'CHURN RATE')}
                    value="2.4%"
                    colorClass="text-destructive"
                    path="M0,10 Q20,15 40,12 T80,25 T120,20 T160,35 T200,38"
                />
                <RevenueCard
                    label={t('admin.pendingPayouts', 'PENDING PAYOUTS')}
                    value="$12,400"
                    colorClass="text-secondary"
                    path="M0,30 L20,30 L40,28 L60,28 L80,25 L100,25 L120,22 L140,22 L160,20 L180,20 L200,18"
                />
            </section>

            {/* ── Tabs ────────────────────────────────────────────────── */}
            <section>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0 mb-6">
                        <TabsTrigger
                            value="plans"
                            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                        >
                            {t('admin.plansTab', 'Plans')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="orders"
                            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                        >
                            {t('admin.ordersTab', 'Orders')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="wallets"
                            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                        >
                            {t('admin.walletsTab', 'Wallets')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="plans"><PlansTab/></TabsContent>
                    <TabsContent value="orders"><OrdersTab/></TabsContent>
                    <TabsContent value="wallets"><WalletsTab/></TabsContent>
                </Tabs>
            </section>
        </div>
    );
}

/* ================================================================== */
/*  PlansTab                                                           */
/* ================================================================== */
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

    /* ── helpers ─────────────────────────────────────────────────────── */
    const DEFAULT_FEATURES = (plan: SubscriptionPlan) => {
        const price = plan.price || 0;
        if (price >= 149) return [
            {label: 'Unlimited Storage', included: true},
            {label: 'Priority Transcoding', included: true},
            {label: 'DRM Protection', included: true},
        ];
        if (price >= 29) return [
            {label: '100GB Storage', included: true},
            {label: '4K Transcoding', included: true},
            {label: 'DRM Protection', included: false},
        ];
        return [
            {label: '10GB Storage', included: true},
            {label: '720p Transcoding', included: false},
            {label: 'DRM Protection', included: false},
        ];
    };

    const isHighlighted = (plan: SubscriptionPlan) => {
        return (plan.price || 0) >= 149;
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                        {t('admin.activeTierManagement', 'Active Tier Management')}
                    </h2>
                    <Button
                        id="add-tier-trigger"
                        variant="outline"
                        className="rounded-full px-6 py-2 font-semibold"
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        {t('admin.addPlan', 'Add New Tier')}
                    </Button>
                </div>

                {isLoading ? (
                    <div className="py-24 flex justify-center"><Spinner/></div>
                ) : plans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map(plan => {
                            const features = (plan.features && typeof plan.features === 'object' && Array.isArray((plan.features as Record<string, unknown>).items))
                                ? ((plan.features as Record<string, unknown>).items as Array<{label: string; included: boolean}>)
                                : DEFAULT_FEATURES(plan);
                            const highlighted = isHighlighted(plan);

                            return (
                                <Card
                                    key={plan.id}
                                    className={cn(
                                        "flex flex-col gap-6 relative overflow-hidden",
                                        highlighted && "border-2 border-primary bg-accent"
                                    )}
                                >
                                    <CardContent className="p-6 flex flex-col gap-6 relative overflow-hidden h-full">
                                        {highlighted && (
                                            <div className="absolute top-4 -right-8 bg-primary text-primary-foreground text-[10px] font-bold uppercase py-1 px-10 rotate-45 tracking-wider">
                                                {t('admin.mostPopular', 'MOST POPULAR')}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className={`text-xl font-semibold ${highlighted ? 'text-primary' : ''}`}>
                                                    {plan.name}
                                                </h4>
                                                <p className="text-sm text-muted-foreground">{plan.description || plan.name}</p>
                                            </div>
                                            <Badge variant="soft-neutral" className="text-[11px] uppercase tracking-wider">
                                                ID: {plan.id?.slice(0, 8)}
                                            </Badge>
                                        </div>

                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[30px] font-bold leading-[38px] -tracking-[0.02em]">
                                                {plan.price > 0 ? `$${plan.price}` : t('admin.custom', 'Custom')}
                                            </span>
                                            {plan.price > 0 && (
                                                <span className="text-muted-foreground text-xs font-mono">
                                                    /{plan.duration_days >= 365 ? 'yr' : 'mo'}
                                                </span>
                                            )}
                                        </div>

                                        <ul className="space-y-3 flex-1">
                                            {features.map((f, i) => (
                                                <PlanFeature key={i} label={f.label} included={f.included}/>
                                            ))}
                                        </ul>

                                        <div className="flex gap-2">
                                            <Button
                                                variant={highlighted ? "default" : "outline"}
                                                className={cn(
                                                    "rounded-full flex-1",
                                                    !highlighted && "border-primary text-primary hover:bg-primary/5"
                                                )}
                                                onClick={() => openEditDialog(plan)}
                                            >
                                                {highlighted ? t('admin.manageUsers', 'Manage Users') : t('admin.editPlan', 'Edit Plan')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                className="rounded-full text-muted-foreground hover:text-destructive hover:border-destructive"
                                                onClick={() => { setDeletingPlan(plan); setDeleteDialogOpen(true); }}
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="flex flex-col items-center justify-center text-center py-16">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <CreditCard size={32} className="text-muted-foreground"/>
                        </div>
                        <h3 className="text-base font-semibold mb-1">
                            {t('admin.noPlans', 'No plans found')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('admin.noPlansDesc', 'Create your first subscription tier to get started.')}
                        </p>
                        <Button
                            variant="outline"
                            className="rounded-full px-6 py-2 font-semibold"
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            {t('admin.addPlan', 'Add New Tier')}
                        </Button>
                    </Card>
                )}
            </div>

            {/* ── Create Plan Dialog ──────────────────────────────────── */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <DialogHeader className="border-border">
                        <DialogTitle>{t('admin.addPlanTitle', 'Add Subscription Tier')}</DialogTitle>
                        <DialogDescription className="sr-only">{t('admin.addPlanTitle', 'Add Subscription Tier')}</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.planName', 'Name')}</Label>
                            <Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder={t('admin.planName')}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.planPrice', 'Price')}</Label>
                                <Input type="number" step="0.01" value={createForm.price} onChange={e => setCreateForm({...createForm, price: Number(e.target.value)})}/>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.planDuration', 'Duration')}</Label>
                                <Input type="number" value={createForm.duration_days} onChange={e => setCreateForm({...createForm, duration_days: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.planCurrency', 'Currency')}</Label>
                                <Select value={createForm.currency || 'CNY'} onValueChange={v => setCreateForm({...createForm, currency: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CNY">CNY</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.planSortOrder', 'Sort Order')}</Label>
                                <Input type="number" value={createForm.sort_order || 0} onChange={e => setCreateForm({...createForm, sort_order: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.planDescription', 'Description')}</Label>
                            <Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})}/>
                        </div>
                    </div>
                    <DialogFooter className="bg-muted/50">
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleCreate} disabled={!createForm.name || createForm.price <= 0}>
                            {t('common.add', 'Add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Plan Dialog ────────────────────────────────────── */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <DialogHeader className="border-border">
                        <DialogTitle>{t('admin.editPlan', 'Edit Plan')}</DialogTitle>
                        <DialogDescription className="sr-only">{t('admin.editPlan', 'Edit Plan')}</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.planName', 'Name')}</Label>
                            <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.planPrice', 'Price')}</Label>
                                <Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}/>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.planDuration', 'Duration')}</Label>
                                <Input type="number" value={editForm.duration_days} onChange={e => setEditForm({...editForm, duration_days: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.planCurrency', 'Currency')}</Label>
                                <Select value={editForm.currency || 'CNY'} onValueChange={v => setEditForm({...editForm, currency: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CNY">CNY</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.planSortOrder', 'Sort Order')}</Label>
                                <Input type="number" value={editForm.sort_order || 0} onChange={e => setEditForm({...editForm, sort_order: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.planDescription', 'Description')}</Label>
                            <Input value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})}/>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="edit-plan-active"
                                checked={editForm.is_active ?? true}
                                onCheckedChange={(checked) => setEditForm({...editForm, is_active: checked})}
                            />
                            <Label htmlFor="edit-plan-active">{t('admin.enabled', 'Enabled')}</Label>
                        </div>
                    </div>
                    <DialogFooter className="bg-muted/50">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleUpdate} disabled={!editForm.name}>
                            {t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Plan Dialog ──────────────────────────────────── */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <DialogHeader className="border-border">
                        <AlertDialogTitle className="text-lg font-semibold">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deletePlanConfirm', 'Are you sure you want to delete this plan? This action cannot be undone.')}
                        </AlertDialogDescription>
                    </DialogHeader>
                    <AlertDialogFooter className="px-6 py-4 bg-muted/50 flex justify-end gap-3">
                        <AlertDialogCancel className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent">
                            {t('common.cancel', 'Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:opacity-90 border-0">
                            {t('admin.delete', 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

/* ================================================================== */
/*  OrdersTab                                                          */
/* ================================================================== */
const OrdersTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: ordersData, isLoading} = useAdminOrders({page, page_size: 20});

    const orders = ordersData?.items || [];
    const total = ordersData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const statusVariant = (status: string): 'soft-success' | 'soft-danger' | 'soft-warning' | 'soft-neutral' => {
        switch (status) {
            case 'paid':
            case 'completed':
                return 'soft-success';
            case 'cancelled':
            case 'failed':
                return 'soft-danger';
            case 'pending':
                return 'soft-warning';
            default:
                return 'soft-neutral';
        }
    };

    return (
        <Card className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="px-6 py-4">{t('admin.orderNo', 'ORDER ID')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.orderCustomer', 'CUSTOMER')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.orderStatus', 'STATUS')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.orderTime', 'DATE')}</TableHead>
                        <TableHead className="px-6 py-4 text-right">{t('admin.orderAmount', 'AMOUNT')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="py-12 text-center">
                                <Spinner className="mx-auto"/>
                            </TableCell>
                        </TableRow>
                    ) : orders.length > 0 ? orders.map(order => (
                        <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="px-6 py-3 font-mono text-xs">{order.order_no}</TableCell>
                            <TableCell className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                                        {order.user_id?.slice(0, 2) || 'U'}
                                    </div>
                                    <span className="font-semibold text-sm">{order.user_id || '-'}</span>
                                </div>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                                <Badge variant={statusVariant(order.status)} className="text-[11px] uppercase tracking-wider">
                                    {order.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground">
                                {order.create_time ? new Date(order.create_time).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'}) : '-'}
                            </TableCell>
                            <TableCell className="px-6 py-3 font-mono text-xs text-right font-semibold">
                                {order.amount} {order.currency}
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5}>
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Receipt size={32} className="text-muted-foreground"/>
                                    </div>
                                    <h3 className="text-base font-semibold mb-1">
                                        {t('admin.noOrders', 'No orders found')}
                                    </h3>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {total > 20 && (
                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        {t('admin.showingItems', {start: (page - 1) * 20 + 1, end: Math.min(page * 20, total), total}, '显示第 {{start}} 到 {{end}} 项，共 {{total}} 项')}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon-sm" className="text-muted-foreground" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={16}/>
                        </Button>
                        {Array.from({length: totalPages}, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map(p => (
                            <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className={p === page ? "" : "text-muted-foreground"} onClick={() => setPage(p)}>
                                {p}
                            </Button>
                        ))}
                        <Button variant="outline" size="icon-sm" className="text-muted-foreground" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={16}/>
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};

/* ================================================================== */
/*  WalletsTab                                                         */
/* ================================================================== */
const WalletsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: walletsData, isLoading} = useAdminWallets({page, page_size: 20});

    const wallets = walletsData?.items || [];
    const total = walletsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    return (
        <Card className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="px-6 py-4">{t('admin.walletUserId', 'USER ID')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.walletBalance', 'BALANCE')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.walletFrozen', 'FROZEN')}</TableHead>
                        <TableHead className="px-6 py-4">{t('admin.walletCurrency', 'CURRENCY')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={4} className="py-12 text-center">
                                <Spinner className="mx-auto"/>
                            </TableCell>
                        </TableRow>
                    ) : wallets.length > 0 ? wallets.map(wallet => (
                        <TableRow key={wallet.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="px-6 py-3 font-mono text-xs">{wallet.user_id}</TableCell>
                            <TableCell className="px-6 py-3 font-semibold text-sm">{wallet.balance}</TableCell>
                            <TableCell className="px-6 py-3 text-sm">{wallet.frozen}</TableCell>
                            <TableCell className="px-6 py-3">
                                <Badge variant="soft-neutral" className="text-[11px]">{wallet.currency}</Badge>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4}>
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Wallet size={32} className="text-muted-foreground"/>
                                    </div>
                                    <h3 className="text-base font-semibold mb-1">
                                        {t('admin.noWallets', 'No wallets found')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('admin.walletsComingSoon', 'Wallet management and multi-currency controls coming soon.')}
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {total > 20 && (
                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        {t('admin.showingItems', {start: (page - 1) * 20 + 1, end: Math.min(page * 20, total), total}, '显示第 {{start}} 到 {{end}} 项，共 {{total}} 项')}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon-sm" className="text-muted-foreground" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={16}/>
                        </Button>
                        {Array.from({length: totalPages}, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map(p => (
                            <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className={p === page ? "" : "text-muted-foreground"} onClick={() => setPage(p)}>
                                {p}
                            </Button>
                        ))}
                        <Button variant="outline" size="icon-sm" className="text-muted-foreground" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={16}/>
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};
