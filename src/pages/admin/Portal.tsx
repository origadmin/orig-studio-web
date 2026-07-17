import React, {useState} from 'react';
import {
    Layout, Plus, Edit, Trash2, Settings, ChevronDown,
    GripVertical, ArrowUp, ArrowDown, Megaphone, BarChart3, ImageOff,
    Calendar, Minus, Link2, Navigation, Image as ImageIcon, Layers, Clock as ClockIcon,
} from 'lucide-react';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Link} from '@tanstack/react-router';
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
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Slider} from '@/components/ui/slider';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {ImageUploadField} from '@/components/upload/ImageUploadField';
import {toast} from 'sonner';
import {
    useAdminNavItems, useAdminBanners,
    useCreateNavItem, useUpdateNavItem, useDeleteNavItem,
    useCreateBanner, useUpdateBanner, useToggleBanner, useDeleteBanner,
    useAdminAdPlacements, useCreateAdPlacement, useUpdateAdPlacement, useToggleAdPlacement, useDeleteAdPlacement,
    useAdminAds, useCreateAd, useUpdateAd, useToggleAd, useDeleteAd,
} from '@/hooks/queries';
import {type NavItem, type Banner, type CreateNavItemRequest, type CreateBannerRequest, type UpdateBannerRequest, type AdPlacement, type Ad, type CreateAdPlacementRequest, type UpdateAdPlacementRequest, type CreateAdRequest, type UpdateAdRequest, adminPortalApi} from '@/lib/api/portal';
import {useQueryClient} from '@tanstack/react-query';

export default function PortalConfigPage() {
    const {t} = useTranslation();
    const defaultTab = React.useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && ['navigation', 'banners', 'ad-placements', 'ads'].includes(tab)) return tab;
        return 'navigation';
    }, []);
    return (
        <div className="space-y-4 p-4 md:p-6">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.portal', '门户配置')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Layout className="h-6 w-6"/>{t('admin.portalConfig')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{t('admin.portalConfigDesc')}</p>
            </div>

            <Tabs defaultValue={defaultTab}>
                <TabsList className="gap-8 border-b border-border bg-transparent h-auto p-0 rounded-none w-full justify-start mb-6">
                    <TabsTrigger value="navigation" className="pb-3 px-1 border-b-2 flex items-center gap-2 text-sm font-semibold transition-colors rounded-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none border-transparent text-muted-foreground hover:text-foreground">
                        <Navigation className="w-4 h-4"/>{t('admin.navigationTab')}
                    </TabsTrigger>
                    <TabsTrigger value="banners" className="pb-3 px-1 border-b-2 flex items-center gap-2 text-sm font-semibold transition-colors rounded-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none border-transparent text-muted-foreground hover:text-foreground">
                        <ImageIcon className="w-4 h-4"/>{t('admin.bannersTab')}
                    </TabsTrigger>
                    <TabsTrigger value="ad-placements" className="pb-3 px-1 border-b-2 flex items-center gap-2 text-sm font-semibold transition-colors rounded-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none border-transparent text-muted-foreground hover:text-foreground">
                        <Layers className="w-4 h-4"/>{t('admin.adPlacementsTab')}
                    </TabsTrigger>
                    <TabsTrigger value="ads" className="pb-3 px-1 border-b-2 flex items-center gap-2 text-sm font-semibold transition-colors rounded-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none border-transparent text-muted-foreground hover:text-foreground">
                        <Megaphone className="w-4 h-4"/>{t('admin.adsTab')}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="navigation">
                    <NavigationTab/>
                </TabsContent>
                <TabsContent value="banners">
                    <BannersTab/>
                </TabsContent>
                <TabsContent value="ad-placements">
                    <AdPlacementsTab/>
                </TabsContent>
                <TabsContent value="ads">
                    <AdsTab/>
                </TabsContent>
            </Tabs>
        </div>
    );
}

const NavigationTab: React.FC = () => {
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const {data: navData, isLoading} = useAdminNavItems();
    const createMutation = useCreateNavItem();
    const updateMutation = useUpdateNavItem();
    const deleteMutation = useDeleteNavItem();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NavItem | null>(null);
    const [createForm, setCreateForm] = useState<CreateNavItemRequest>({
        type: 'internal_link', label: '', url: '', sequence: 0, open_new_tab: false,
    });
    const [editForm, setEditForm] = useState({label: '', url: '', type: 'internal_link' as "internal_link" | "external_link" | "category", open_new_tab: false});

    const navItems = navData?.items || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({type: 'internal_link', label: '', url: '', sequence: 0, open_new_tab: false});
        } catch (err) {
            console.error('Failed to create nav item:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        try {
            await updateMutation.mutateAsync({id: editingItem.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update nav item:', err);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            await deleteMutation.mutateAsync(editingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete nav item:', err);
        }
    };

    const moveItem = async (index: number, direction: 'up' | 'down') => {
        const newItems = [...navItems];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        try {
            await adminPortalApi.reorderNavItems({ids: newItems.map(i => i.id)});
            queryClient.invalidateQueries({queryKey: ['adminNavItems']});
            queryClient.invalidateQueries({queryKey: ['portalConfig']});
        } catch (err) {
            console.error('Failed to reorder:', err);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('admin.navItems')}</CardTitle>
                            <CardDescription>{t('admin.navItemsDesc')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2"/>{t('admin.addNavItem')}
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
                                    <TableHead className="w-[40px]">{t('admin.navSort')}</TableHead>
                                    <TableHead>{t('admin.navLabel')}</TableHead>
                                    <TableHead>{t('admin.navType')}</TableHead>
                                    <TableHead>{t('admin.navLink')}</TableHead>
                                    <TableHead>{t('admin.navNewTab')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {navItems.length > 0 ? navItems.map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <GripVertical className="w-4 h-4 text-muted-foreground"/>
                                                <Button variant="ghost" size="icon-sm" disabled={idx === 0}
                                                    onClick={() => moveItem(idx, 'up')}><ArrowUp className="w-3 h-3"/></Button>
                                                <Button variant="ghost" size="icon-sm" disabled={idx === navItems.length - 1}
                                                    onClick={() => moveItem(idx, 'down')}><ArrowDown className="w-3 h-3"/></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{item.label}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {item.type === 'internal_link' ? t('admin.internalLink', '内部链接')
                                                    : item.type === 'external_link' ? t('admin.externalLink', '外部链接')
                                                    : t('admin.categoryEntry', '分类入口')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{item.url}</TableCell>
                                        <TableCell>{item.open_new_tab ? <Badge variant="secondary">{t('common.yes', '是')}</Badge> : <span className="text-xs text-muted-foreground">{t('common.no', '否')}</span>}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm"
                                                    onClick={() => { setEditingItem(item); setEditForm({label: item.label, url: item.url, type: item.type, open_new_tab: item.open_new_tab}); setEditDialogOpen(true); }}>
                                                    <Edit className="w-4 h-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive"
                                                    onClick={() => { setEditingItem(item); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t('admin.noNavItems')}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            {t('admin.addNavItemTitle', 'Add Navigation Item')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.addNavItemDesc', 'Create a new navigation menu item with link type and display order.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <div className="grid gap-2"><Label>{t('admin.navLabel')}</Label><Input value={createForm.label} onChange={e => setCreateForm({...createForm, label: e.target.value})} placeholder={t('admin.navLabel')}/></div>
                        <div className="grid gap-2"><Label>{t('admin.navType')}</Label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v as any})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="internal_link">{t('admin.internalLink')}</SelectItem>
                                    <SelectItem value="external_link">{t('admin.externalLink')}</SelectItem>
                                    <SelectItem value="category">{t('admin.categoryEntry')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>URL</Label><Input value={createForm.url} onChange={e => setCreateForm({...createForm, url: e.target.value})} placeholder="/featured or https://..."/></div>
                        <div className="grid gap-2"><Label>{t('admin.navSort')}</Label><Input type="number" value={createForm.sequence} onChange={e => setCreateForm({...createForm, sequence: Number(e.target.value)})}/></div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleCreate} disabled={!createForm.label || !createForm.url}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary" />
                            {t('admin.editNavItem', 'Edit Navigation Item')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.editNavItemDesc', 'Update navigation item label, link type, and target URL.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <div className="grid gap-2"><Label>{t('admin.navLabel')}</Label><Input value={editForm.label} onChange={e => setEditForm({...editForm, label: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.navType')}</Label>
                            <Select value={editForm.type} onValueChange={v => setEditForm({...editForm, type: v as any})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="internal_link">{t('admin.internalLink')}</SelectItem>
                                    <SelectItem value="external_link">{t('admin.externalLink')}</SelectItem>
                                    <SelectItem value="category">{t('admin.categoryEntry')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>URL</Label><Input value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})}/></div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleUpdate}>{t('common.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
                    <AlertDialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            {t('admin.confirmDelete', 'Confirm Delete')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteNavItemConfirm', {label: editingItem?.label})}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <AlertDialogCancel className="rounded-lg h-10 px-5 border-border/60 mt-0">{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium">{t('admin.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

type BannerFormData = {
    title: string;
    subtitle: string;
    badge_text: string;
    image_url: string;
    primary_btn_text: string;
    primary_btn_url: string;
    sequence: number;
    is_active: boolean;
    start_at: string;
    end_at: string;
    type: 'custom' | 'hot_videos' | 'new_videos' | 'ad';
    count: number;
    never_expires: boolean;
};

type GlobalCarouselSettings = {
    display_mode: 'wide' | 'narrow';
    auto_slide_interval: number;
};

const emptyBannerForm: BannerFormData = {
    title: '',
    subtitle: '',
    badge_text: '',
    image_url: '',
    primary_btn_text: '',
    primary_btn_url: '',
    sequence: 0,
    is_active: true,
    start_at: '',
    end_at: '',
    type: 'custom',
    count: 5,
    never_expires: true,
};

const BannersTab: React.FC = () => {
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const {data: bannerData, isLoading} = useAdminBanners();
    const createMutation = useCreateBanner();
    const updateMutation = useUpdateBanner();
    const toggleMutation = useToggleBanner();
    const deleteMutation = useDeleteBanner();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [createForm, setCreateForm] = useState<BannerFormData>(emptyBannerForm);
    const [editForm, setEditForm] = useState<BannerFormData>(emptyBannerForm);

    const banners = bannerData?.items || [];

    const initialGlobal: GlobalCarouselSettings = React.useMemo(() => {
        if (banners.length === 0) return {display_mode: 'wide', auto_slide_interval: 5};
        const first = banners.find(b => b.is_active) || banners[0];
        const rawInterval = first.auto_slide_interval;
        const intervalSec = (typeof rawInterval === 'number' && rawInterval >= 1000)
            ? Math.max(1, Math.round(rawInterval / 1000))
            : (typeof rawInterval === 'number' && rawInterval > 0 && rawInterval < 1000 ? rawInterval : 5);
        return {
            display_mode: (first.display_mode as 'wide' | 'narrow') || 'wide',
            auto_slide_interval: intervalSec,
        };
    }, [banners]);

    const [globalSettings, setGlobalSettings] = useState<GlobalCarouselSettings>(initialGlobal);
    const [globalDirty, setGlobalDirty] = useState(false);
    const [globalSaving, setGlobalSaving] = useState(false);

    React.useEffect(() => {
        if (!globalDirty) setGlobalSettings(initialGlobal);
    }, [initialGlobal, globalDirty]);

    const updateGlobal = (patch: Partial<GlobalCarouselSettings>) => {
        setGlobalSettings(prev => ({...prev, ...patch}));
        setGlobalDirty(true);
    };

    const toISO = (v?: string): string | undefined => {
        if (!v) return undefined;
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
    };
    const fromISO = (v?: string): string => {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const buildCreatePayload = (f: BannerFormData): CreateBannerRequest => {
        const payload: CreateBannerRequest = {
            title: f.title,
            type: f.type,
            is_active: f.is_active,
            sequence: f.sequence,
        };
        if (f.type === 'custom' || f.type === 'ad') {
            if (f.image_url) payload.image_url = f.image_url;
            if (f.primary_btn_text) payload.primary_btn_text = f.primary_btn_text;
            if (f.primary_btn_url) payload.primary_btn_url = f.primary_btn_url;
        }
        if (f.subtitle) payload.subtitle = f.subtitle;
        if (f.badge_text) payload.badge_text = f.badge_text;
        if (f.type === 'hot_videos' || f.type === 'new_videos') {
            payload.count = f.count;
        }
        const startISO = toISO(f.start_at);
        if (startISO) payload.start_at = startISO;
        if (!f.never_expires) {
            const endISO = toISO(f.end_at);
            if (endISO) payload.end_at = endISO;
        }
        return payload;
    };

    const buildUpdatePayload = (f: BannerFormData): UpdateBannerRequest => {
        const payload: UpdateBannerRequest = {
            title: f.title,
            type: f.type,
            is_active: f.is_active,
            sequence: f.sequence,
        };
        if (f.type === 'custom' || f.type === 'ad') {
            payload.image_url = f.image_url || '';
            if (f.primary_btn_text) payload.primary_btn_text = f.primary_btn_text;
            if (f.primary_btn_url) payload.primary_btn_url = f.primary_btn_url;
        }
        if (f.subtitle) payload.subtitle = f.subtitle;
        if (f.badge_text) payload.badge_text = f.badge_text;
        if (f.type === 'hot_videos' || f.type === 'new_videos') {
            payload.count = f.count;
        }
        const startISO = toISO(f.start_at);
        if (startISO) payload.start_at = startISO;
        if (f.never_expires) {
            payload.clear_end_at = true;
        } else {
            const endISO = toISO(f.end_at);
            if (endISO) payload.end_at = endISO;
        }
        return payload;
    };

    const handleCreate = async () => {
        try {
            const payload = buildCreatePayload(createForm);
            payload.display_mode = globalSettings.display_mode;
            payload.auto_slide_interval = Math.max(1000, globalSettings.auto_slide_interval * 1000);
            await createMutation.mutateAsync(payload);
            toast.success(t('admin.bannerCreateSuccess', 'Banner created'));
            setCreateDialogOpen(false);
            setCreateForm({
                ...emptyBannerForm,
                sequence: banners.length > 0 ? Math.max(...banners.map(b => b.sequence ?? 0)) + 1 : 0,
            });
            setAdvancedOpen(false);
            queryClient.invalidateQueries({queryKey: ['admin', 'banners']});
        } catch (err) {
            console.error('Failed to create banner:', err);
            toast.error(t('admin.bannerCreateFail', 'Failed to create banner'));
        }
    };

    const handleUpdate = async () => {
        if (!editingBanner) return;
        try {
            await updateMutation.mutateAsync({
                id: editingBanner.id,
                data: buildUpdatePayload(editForm),
            });
            toast.success(t('admin.bannerUpdateSuccess', 'Banner updated'));
            setEditDialogOpen(false);
            setAdvancedOpen(false);
            queryClient.invalidateQueries({queryKey: ['admin', 'banners']});
        } catch (err) {
            console.error('Failed to update banner:', err);
            toast.error(t('admin.bannerUpdateFail', 'Failed to update banner'));
        }
    };

    const handleSaveGlobal = async () => {
        if (!globalDirty) return;
        setGlobalSaving(true);
        try {
            const intervalMs = Math.max(1000, globalSettings.auto_slide_interval * 1000);
            await Promise.all(
                banners.map(b =>
                    updateMutation.mutateAsync({
                        id: b.id,
                        data: {
                            display_mode: globalSettings.display_mode,
                            auto_slide_interval: intervalMs,
                        },
                    })
                )
            );
            toast.success(t('admin.bannerGlobalSaveSuccess', 'Carousel settings saved'));
            setGlobalDirty(false);
            queryClient.invalidateQueries({queryKey: ['admin', 'banners']});
        } catch (err) {
            console.error('Failed to save global banner settings:', err);
            toast.error(t('admin.bannerGlobalSaveFail', 'Failed to save carousel settings'));
        } finally {
            setGlobalSaving(false);
        }
    };

    const handleToggle = (id: string) => {
        toggleMutation.mutate(id);
    };

    const handleDelete = async () => {
        if (!editingBanner) return;
        try {
            await deleteMutation.mutateAsync(editingBanner.id);
            toast.success(t('admin.bannerDeleteSuccess', 'Banner deleted'));
            setDeleteDialogOpen(false);
            queryClient.invalidateQueries({queryKey: ['admin', 'banners']});
        } catch (err) {
            console.error('Failed to delete banner:', err);
            toast.error(t('admin.bannerDeleteFail', 'Failed to delete banner'));
        }
    };

    const openCreateDialog = () => {
        setCreateForm(emptyBannerForm);
        setAdvancedOpen(false);
        setCreateDialogOpen(true);
    };

    const openEditDialog = (banner: Banner) => {
        setEditingBanner(banner);
        const bType = (banner.type as BannerFormData['type']) || 'custom';
        setEditForm({
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            badge_text: banner.badge_text || '',
            image_url: banner.image_url || '',
            primary_btn_text: banner.primary_btn_text || '',
            primary_btn_url: banner.primary_btn_url || '',
            sequence: banner.sequence ?? 0,
            is_active: banner.is_active,
            start_at: fromISO(banner.start_at),
            end_at: fromISO(banner.end_at),
            type: bType,
            count: banner.count || 5,
            never_expires: !banner.end_at || new Date(banner.end_at).getFullYear() < 2000,
        });
        setAdvancedOpen(false);
        setEditDialogOpen(true);
    };

    const aspectClass = globalSettings.display_mode === 'narrow' ? 'aspect-video' : 'aspect-[21/9]';

    const formatExpiry = (iso?: string): string => {
        if (!iso) return t('admin.noExpiry', '永不过期');
        const d = new Date(iso);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return t('admin.noExpiry', '永不过期');
        const now = new Date();
        if (d < now) return t('admin.expiredOn', '已过期 {{date}}', {date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
        return t('admin.endsOn', '至 {{date}}', {date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
    };

    const isExpired = (iso?: string): boolean => {
        if (!iso) return false;
        const d = new Date(iso);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return false;
        return d < new Date();
    };

    const getTypeMeta = (type?: string): { label: string; cls: string } => {
        switch (type) {
            case 'hot_videos':
                return {label: t('admin.bannerTypeHot', '最火视频'), cls: 'bg-red-50 text-red-600 border-red-200'};
            case 'new_videos':
                return {label: t('admin.bannerTypeNew', '最新上线'), cls: 'bg-blue-50 text-blue-600 border-blue-200'};
            case 'ad':
                return {label: t('admin.bannerTypeAd', '广告位'), cls: 'bg-purple-50 text-purple-600 border-purple-200'};
            default:
                return {label: t('admin.bannerTypeCustom', '自定义'), cls: 'bg-muted text-muted-foreground border-border'};
        }
    };

    const renderBannerFormFields = (
        form: BannerFormData,
        setForm: React.Dispatch<React.SetStateAction<BannerFormData>>,
    ) => (
        <>
            <div className="grid gap-2">
                <Label>{t('admin.bannerType', 'Banner类型')}</Label>
                <Select value={form.type} onValueChange={(v: BannerFormData['type']) => setForm({...form, type: v})}>
                    <SelectTrigger>
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="custom">{t('admin.bannerTypeCustom', '自定义Banner')}</SelectItem>
                        <SelectItem value="hot_videos">{t('admin.bannerTypeHot', '最火视频（自动聚合）')}</SelectItem>
                        <SelectItem value="new_videos">{t('admin.bannerTypeNew', '最新上线（自动聚合）')}</SelectItem>
                        <SelectItem value="ad">{t('admin.bannerTypeAd', '广告位')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {(form.type === 'hot_videos' || form.type === 'new_videos') && (
                <div className="grid gap-2">
                    <Label htmlFor="banner-count">{t('admin.bannerVideoCount', '展示视频数量')}</Label>
                    <Input
                        id="banner-count"
                        type="number"
                        min={1}
                        max={20}
                        value={form.count}
                        onChange={e => setForm({...form, count: Number(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">{t('admin.bannerDynamicHint', '动态Banner将自动从视频库中取最火/最新视频作为轮播内容，图片取首个视频的封面')}</p>
                </div>
            )}
            {(form.type === 'custom' || form.type === 'ad') && (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor="banner-title">{t('admin.bannerTitle', '标题')}</Label>
                        <Input
                            id="banner-title"
                            value={form.title}
                            onChange={e => setForm({...form, title: e.target.value})}
                            placeholder={t('admin.bannerTitle', '标题')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="banner-subtitle">{t('admin.bannerSubtitle', '副标题')}</Label>
                        <Input
                            id="banner-subtitle"
                            value={form.subtitle}
                            onChange={e => setForm({...form, subtitle: e.target.value})}
                            placeholder={t('admin.bannerSubtitle', '副标题')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="banner-badge">{t('admin.bannerBadgeText', '角标文字')}</Label>
                        <Input
                            id="banner-badge"
                            value={form.badge_text}
                            onChange={e => setForm({...form, badge_text: e.target.value})}
                            placeholder="HOT, NEW"
                        />
                    </div>
                    <ImageUploadField
                        value={form.image_url}
                        onChange={url => setForm({...form, image_url: url})}
                        label={t('admin.bannerImageUrl', 'Banner图片')}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="banner-cta-text">{t('admin.bannerPrimaryBtnText', 'CTA按钮文字')}</Label>
                            <Input
                                id="banner-cta-text"
                                value={form.primary_btn_text}
                                onChange={e => setForm({...form, primary_btn_text: e.target.value})}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="banner-cta-url">{t('admin.bannerPrimaryBtnUrl', 'CTA按钮链接')}</Label>
                            <Input
                                id="banner-cta-url"
                                value={form.primary_btn_url}
                                onChange={e => setForm({...form, primary_btn_url: e.target.value})}
                                placeholder="/featured"
                            />
                        </div>
                    </div>
                </>
            )}
            {(form.type === 'hot_videos' || form.type === 'new_videos') && (
                <div className="grid gap-2">
                    <Label htmlFor="banner-title-dyn">{t('admin.bannerTitle', '标题（可选，覆盖默认标题）')}</Label>
                    <Input
                        id="banner-title-dyn"
                        value={form.title}
                        onChange={e => setForm({...form, title: e.target.value})}
                        placeholder={form.type === 'hot_videos' ? '最火视频' : '最新上线'}
                    />
                </div>
            )}
            <div className="flex items-center gap-2">
                <Switch
                    checked={form.never_expires}
                    onCheckedChange={(v) => setForm({...form, never_expires: v, end_at: v ? '' : form.end_at})}
                    id="banner-never-expires"
                />
                <Label htmlFor="banner-never-expires" className="cursor-pointer">{t('admin.bannerNeverExpires', '永不过期')}</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="banner-start">{t('admin.bannerStartAt', '开始时间')}</Label>
                    <Input
                        id="banner-start"
                        type="datetime-local"
                        value={form.start_at}
                        onChange={e => setForm({...form, start_at: e.target.value})}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="banner-end" className={form.never_expires ? 'text-muted-foreground' : ''}>{t('admin.bannerEndAt', '结束时间')}</Label>
                    <Input
                        id="banner-end"
                        type="datetime-local"
                        value={form.end_at}
                        onChange={e => setForm({...form, end_at: e.target.value})}
                        disabled={form.never_expires}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({...form, is_active: v})}
                    id="banner-active"
                />
                <Label htmlFor="banner-active" className="cursor-pointer">{t('admin.bannerIsActive', '是否启用')}</Label>
            </div>
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="px-0 text-sm flex items-center gap-1 -ml-1">
                        <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}/>
                        {t('admin.bannerAdvanced', '其他设置')}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="banner-sequence">{t('admin.bannerSequence', '排序')}</Label>
                        <Input
                            id="banner-sequence"
                            type="number"
                            value={form.sequence}
                            onChange={e => setForm({...form, sequence: Number(e.target.value)})}
                        />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </>
    );

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {t('admin.bannerManagement', 'Banner管理')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                        {t('admin.bannerManagementLongDesc', 'Configure global display logic and manage promotional banners for the homepage.')}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm font-medium gap-1.5 h-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        {t('admin.activeTotal', 'Active: {{active}} / Total: {{total}}', {active: banners.filter(b => b.is_active).length, total: banners.length})}
                    </Badge>
                </div>
            </div>

            <Card className="relative rounded-2xl overflow-hidden shadow-sm border border-border/40 mb-6 bg-gradient-to-br from-primary/[0.03] via-background to-background">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/30"/>
                <CardHeader className="pb-3 pt-6 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Settings className="h-5 w-5 text-primary"/>
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold">
                                    {t('admin.bannerGlobalSettings', '轮播全局设置')}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t('admin.bannerGlobalSettingsDesc', '统一管理所有Banner的显示比例、轮播速度等全局参数')}
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleSaveGlobal}
                            disabled={!globalDirty || globalSaving}
                            className="rounded-full px-6 h-10 font-medium shadow-sm data-[disabled]:opacity-50"
                        >
                            {globalSaving ? <Spinner className="w-4 h-4 mr-2"/> : null}
                            {t('common.save', '保存设置')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pb-6 pt-2 px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="space-y-4 p-4 rounded-xl bg-background/80 border border-border/50 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary"/>
                                <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">{t('admin.defaultAspectRatio', '显示比例')}</Label>
                            </div>
                            <div className="inline-flex items-center p-1 bg-muted rounded-xl w-full">
                                <button
                                    type="button"
                                    onClick={() => updateGlobal({display_mode: 'wide'})}
                                    className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        globalSettings.display_mode === 'wide'
                                            ? 'bg-background text-primary shadow-md'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="w-10 h-3.5 rounded-md bg-gradient-to-r from-primary/40 to-primary/20 inline-block"/>
                                        <span className="font-semibold">{t('admin.bannerDisplayModeWide', '宽屏')}</span>
                                        <span className="text-[10px] opacity-70">21:9 电影感</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateGlobal({display_mode: 'narrow'})}
                                    className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        globalSettings.display_mode === 'narrow'
                                            ? 'bg-background text-primary shadow-md'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="w-8 h-[18px] rounded-md bg-gradient-to-r from-primary/40 to-primary/20 inline-block"/>
                                        <span className="font-semibold">{t('admin.bannerDisplayModeNarrow', '标准')}</span>
                                        <span className="text-[10px] opacity-70">16:9 通用</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 rounded-xl bg-background/80 border border-border/50 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 pt-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"/>
                                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">{t('admin.autoPlayInterval', '轮播间隔')}</Label>
                                </div>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-3xl font-black text-primary tabular-nums leading-none">{globalSettings.auto_slide_interval}</span>
                                    <span className="text-lg font-bold text-primary/70">s</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full h-10 w-10 shrink-0 shadow-sm hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                                    onClick={() => updateGlobal({auto_slide_interval: Math.max(1, globalSettings.auto_slide_interval - 1)})}
                                    disabled={globalSettings.auto_slide_interval <= 1}
                                >
                                    <Minus className="h-4 w-4"/>
                                </Button>
                                <Slider
                                    value={[globalSettings.auto_slide_interval]}
                                    min={1}
                                    max={30}
                                    step={1}
                                    onValueChange={v => updateGlobal({auto_slide_interval: v[0]})}
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full h-10 w-10 shrink-0 shadow-sm hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                                    onClick={() => updateGlobal({auto_slide_interval: Math.min(30, globalSettings.auto_slide_interval + 1)})}
                                    disabled={globalSettings.auto_slide_interval >= 30}
                                >
                                    <Plus className="h-4 w-4"/>
                                </Button>
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground/60 px-1 tabular-nums pt-1">
                                <span>1s 快速</span>
                                <span>15s 适中</span>
                                <span>30s 缓慢</span>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 rounded-xl bg-background/80 border border-border/50 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"/>
                                <Label className="text-xs font-bold uppercase tracking-wider text-foreground/80">{t('admin.carouselStatus', '运行状态')}</Label>
                            </div>
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    <div>
                                        <span className="text-base font-bold">
                                            {banners.filter(b => b.is_active).length}
                                        </span>
                                        <span className="text-sm text-muted-foreground ml-1">
                                            {t('admin.activeBanners', '张启用')}
                                        </span>
                                        <span className="text-xs text-muted-foreground/60 ml-2">
                                            / 共 {banners.length} 张
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs ${globalSettings.display_mode === 'wide' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {globalSettings.display_mode === 'wide' ? (
                                            <>
                                                <span className="w-4 h-1.5 rounded-sm bg-current opacity-50"/>
                                                21:9 宽屏
                                            </>
                                        ) : (
                                            <>
                                                <span className="w-3.5 h-2 rounded-sm bg-current opacity-50"/>
                                                16:9 标准
                                            </>
                                        )}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium text-xs bg-blue-50 text-blue-600">
                                        <ClockIcon className="w-3 h-3"/>
                                        {globalSettings.auto_slide_interval}s/张
                                    </span>
                                </div>
                                {globalDirty ? (
                                    <div className="flex items-center gap-2 text-amber-600 text-sm font-medium pt-1 bg-amber-50 px-3 py-2 rounded-lg">
                                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"/>
                                        {t('admin.unsavedChanges', '有未保存的修改，请点击右上角保存')}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium pt-1 bg-green-50 px-3 py-2 rounded-lg">
                                        <span className="h-2 w-2 rounded-full bg-green-500"/>
                                        {t('admin.settingsUpToDate', '配置已同步')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="py-16 text-center"><Spinner className="mx-auto"/></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {banners.map((banner, idx) => {
                        const expired = isExpired(banner.end_at);
                        const typeMeta = getTypeMeta(banner.type);
                        const isDynamic = banner.type === 'hot_videos' || banner.type === 'new_videos';
                        return (
                            <Card
                                key={banner.id}
                                className={`group overflow-hidden rounded-xl border border-border/60 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${(!banner.is_active || expired) ? 'opacity-60' : ''}`}
                                onClick={() => openEditDialog(banner)}
                            >
                                <div className={`relative ${aspectClass} bg-muted overflow-hidden`}>
                                    {banner.image_url ? (
                                        <img
                                            src={banner.image_url}
                                            alt=""
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : isDynamic ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-primary/10 to-primary/5">
                                            <BarChart3 className="w-8 h-8 text-primary/40"/>
                                            <span className="text-[11px] text-primary/60 font-medium">{typeMeta.label}</span>
                                            <span className="text-[10px] text-muted-foreground/60">{t('admin.bannerDynamicAuto', '自动聚合内容')}</span>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-muted/40">
                                            <ImageOff className="w-8 h-8 text-muted-foreground/40"/>
                                            <span className="text-[11px] text-muted-foreground/60 font-medium">{t('admin.noImage', '无图片')}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"/>

                                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                        <div className="w-7 h-7 rounded-lg bg-primary/90 backdrop-blur-sm text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">
                                            {idx + 1}
                                        </div>
                                        {banner.badge_text && (
                                            <Badge className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground shadow-sm">
                                                {banner.badge_text}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="absolute top-3 right-3">
                                        {banner.is_active && !expired ? (
                                            <div className="flex items-center gap-1.5 bg-green-600 text-white rounded-full px-2.5 py-1 shadow-lg">
                                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"/>
                                                <span className="text-[10px] font-bold tracking-wide">ACTIVE</span>
                                            </div>
                                        ) : expired ? (
                                            <Badge variant="secondary" className="rounded-full text-[10px] font-semibold bg-background/90 backdrop-blur-sm text-red-500 shadow-sm">
                                                {t('admin.expired', '已过期')}
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="rounded-full text-[10px] font-semibold bg-background/90 backdrop-blur-sm text-muted-foreground shadow-sm">
                                                {t('admin.hidden', '已停用')}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 scale-90 group-hover:scale-100 transition-transform"
                                            onClick={(e) => { e.stopPropagation(); openEditDialog(banner); }}
                                        >
                                            <Edit className="h-5 w-5"/>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-11 w-11 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 scale-90 group-hover:scale-100 transition-transform"
                                            onClick={(e) => { e.stopPropagation(); setEditingBanner(banner); setDeleteDialogOpen(true); }}
                                        >
                                            <Trash2 className="h-5 w-5"/>
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-4 space-y-2.5">
                                    <div className="min-h-[2.5rem]">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-semibold text-sm leading-tight line-clamp-1 flex-1">{banner.title || t('admin.untitled', '未命名')}</h3>
                                            <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0 rounded shrink-0 ${typeMeta.cls}`}>
                                                {typeMeta.label}
                                            </Badge>
                                        </div>
                                        {banner.subtitle && (
                                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{banner.subtitle}</p>
                                        )}
                                    </div>

                                    {banner.primary_btn_url && (
                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                                            <Link2 className="w-3 h-3 shrink-0"/>
                                            <span className="truncate">{banner.primary_btn_url}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] gap-2">
                                        <div className={`flex items-center gap-1 ${expired ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                            <Calendar className={`w-3 h-3 shrink-0 ${expired ? 'text-red-500' : ''}`}/>
                                            <span>{formatExpiry(banner.end_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggle(banner.id); }}>
                                                <Switch
                                                    checked={banner.is_active}
                                                    onCheckedChange={() => handleToggle(banner.id)}
                                                    className="scale-75 data-[state=checked]:bg-green-500"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className={`text-[10px] font-medium ${banner.is_active ? 'text-green-600' : 'text-muted-foreground'} select-none`}>
                                                    {banner.is_active ? t('admin.enabled', '启用') : t('admin.disabled', '停用')}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] font-bold px-1.5 py-0 rounded ${
                                                    banner.display_mode === 'narrow'
                                                        ? 'bg-muted text-muted-foreground border-border'
                                                        : 'bg-primary/10 text-primary border-primary/20'
                                                }`}
                                            >
                                                {banner.display_mode === 'narrow' ? 'STD' : 'WIDE'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}

                    <button
                        type="button"
                        onClick={openCreateDialog}
                        className="group flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 min-h-[280px] bg-transparent p-0"
                    >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                            <Plus className="w-6 h-6 text-primary"/>
                        </div>
                        <p className="font-semibold text-sm text-foreground">{t('admin.addNewBanner', 'Add New Banner')}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{t('admin.bannerFileHint', 'PNG, JPG or MP4 (Max 10MB)')}</p>
                    </button>
                </div>
            )}

            {banners.length === 0 && !isLoading && (
                <div className="py-12 text-center mt-4">
                    <p className="text-sm text-muted-foreground/70">{t('admin.clickAddBannerHint', 'Click the card above to add your first banner')}</p>
                </div>
            )}


            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)] rounded-2xl">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Plus className="w-4 h-4 text-primary"/>
                            </div>
                            {t('admin.createBanner', '添加Banner')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        {renderBannerFormFields(createForm, setCreateForm)}
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/30 border-t border-border/50 flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-full px-5">{t('common.cancel', '取消')}</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={(createForm.type === 'custom' || createForm.type === 'ad') && (!createForm.title || !createForm.image_url)}
                            className="rounded-full px-6 shadow-sm"
                        >
                            {t('common.add', '添加')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)] rounded-2xl">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Edit className="w-4 h-4 text-primary"/>
                            </div>
                            {t('admin.editBanner', '编辑Banner')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        {renderBannerFormFields(editForm, setEditForm)}
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/30 border-t border-border/50 flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-full px-5">{t('common.cancel', '取消')}</Button>
                        <Button onClick={handleUpdate} className="rounded-full px-6 shadow-sm">{t('common.save', '保存')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
                    <AlertDialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500"/>
                            {t('admin.confirmDelete', '确认删除')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteBannerConfirm', {title: editingBanner?.title})}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <AlertDialogCancel className="rounded-lg h-10 px-5 border-border/60 mt-0">{t('common.cancel', '取消')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium">{t('admin.delete', '删除')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const AdPlacementsTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: placementsData, isLoading} = useAdminAdPlacements();
    const createMutation = useCreateAdPlacement();
    const updateMutation = useUpdateAdPlacement();
    const toggleMutation = useToggleAdPlacement();
    const deleteMutation = useDeleteAdPlacement();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null);
    const [deletingItem, setDeletingItem] = useState<AdPlacement | null>(null);
    const [createForm, setCreateForm] = useState<CreateAdPlacementRequest>({
        name: '', slug: '', type: 'banner',
    });
    const [editForm, setEditForm] = useState<UpdateAdPlacementRequest>({
        name: '', slug: '', type: 'banner', width: 0, height: 0, max_ads: 1, is_active: true, sequence: 0,
    });

    const placements = (placementsData as AdPlacement[] | undefined) || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', slug: '', type: 'banner'});
        } catch (err) {
            console.error('Failed to create ad placement:', err);
        }
    };

    const openEditDialog = (p: AdPlacement) => {
        setEditingPlacement(p);
        setEditForm({
            name: p.name,
            slug: p.slug,
            type: p.type,
            width: p.width,
            height: p.height,
            max_ads: p.max_ads,
            is_active: p.is_active,
            sequence: p.sequence,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingPlacement) return;
        try {
            await updateMutation.mutateAsync({id: editingPlacement.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update ad placement:', err);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to toggle:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            await deleteMutation.mutateAsync(deletingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const typeLabels: Record<string, string> = {
        banner: t('admin.placementTypeBanner'),
        card: t('admin.placementTypeCard'),
        rectangle: t('admin.placementTypeRectangle'),
        leaderboard: t('admin.placementTypeLeaderboard'),
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5"/>{t('admin.adPlacementManagement')}</CardTitle>
                            <CardDescription>{t('admin.adPlacementDesc')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}><Plus className="w-4 h-4 mr-2"/>{t('admin.addAdPlacement')}</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.placementName')}</TableHead>
                                    <TableHead>{t('admin.placementSlug')}</TableHead>
                                    <TableHead>{t('admin.placementType')}</TableHead>
                                    <TableHead>{t('admin.placementSize')}</TableHead>
                                    <TableHead>{t('admin.placementMaxAds')}</TableHead>
                                    <TableHead>{t('admin.placementStatus')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {placements.length > 0 ? placements.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{p.slug}</code></TableCell>
                                        <TableCell><Badge variant="outline">{typeLabels[p.type] || p.type}</Badge></TableCell>
                                        <TableCell className="text-sm">{p.width}×{p.height}</TableCell>
                                        <TableCell>{p.max_ads}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={p.is_active} onCheckedChange={() => handleToggle(p.id)}/>
                                                <span className={`text-sm ${p.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {p.is_active ? t('admin.enabled', '启用') : t('admin.disabled', '禁用')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(p)}>
                                                    <Edit className="w-4 h-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { setDeletingItem(p); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{t('admin.noAdPlacements')}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            {t('admin.addAdPlacementTitle', 'Add Ad Placement')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.addAdPlacementDesc', 'Create a new ad placement slot with dimensions and display limits.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <div className="grid gap-2"><Label>{t('admin.placementName')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder={t('admin.placementName')}/></div>
                        <div className="grid gap-2"><Label>{t('admin.placementSlug')}</Label><Input value={createForm.slug} onChange={e => setCreateForm({...createForm, slug: e.target.value})} placeholder="home-banner"/></div>
                        <div className="grid gap-2"><Label>{t('admin.placementType')}</Label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="banner">{t('admin.placementTypeBanner')}</SelectItem>
                                    <SelectItem value="card">{t('admin.placementTypeCard')}</SelectItem>
                                    <SelectItem value="rectangle">{t('admin.placementTypeRectangle')}</SelectItem>
                                    <SelectItem value="leaderboard">{t('admin.placementTypeLeaderboard')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.placementWidth')}</Label><Input type="number" value={createForm.width || 0} onChange={e => setCreateForm({...createForm, width: Number(e.target.value)})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.placementHeight')}</Label><Input type="number" value={createForm.height || 0} onChange={e => setCreateForm({...createForm, height: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.placementMaxAds')}</Label><Input type="number" value={createForm.max_ads || 1} onChange={e => setCreateForm({...createForm, max_ads: Number(e.target.value)})}/></div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleCreate} disabled={!createForm.name || !createForm.slug}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary" />
                            {t('admin.editAdPlacement', 'Edit Ad Placement')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.editAdPlacementDesc', 'Update ad placement dimensions, limits, and active status.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <div className="grid gap-2"><Label>{t('admin.placementName')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.placementSlug')}</Label><Input value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.placementType')}</Label>
                            <Select value={editForm.type} onValueChange={v => setEditForm({...editForm, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="banner">{t('admin.placementTypeBanner')}</SelectItem>
                                    <SelectItem value="card">{t('admin.placementTypeCard')}</SelectItem>
                                    <SelectItem value="rectangle">{t('admin.placementTypeRectangle')}</SelectItem>
                                    <SelectItem value="leaderboard">{t('admin.placementTypeLeaderboard')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.placementWidth')}</Label><Input type="number" value={editForm.width || 0} onChange={e => setEditForm({...editForm, width: Number(e.target.value)})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.placementHeight')}</Label><Input type="number" value={editForm.height || 0} onChange={e => setEditForm({...editForm, height: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.placementMaxAds')}</Label><Input type="number" value={editForm.max_ads || 1} onChange={e => setEditForm({...editForm, max_ads: Number(e.target.value)})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.placementSequence')}</Label><Input type="number" value={editForm.sequence || 0} onChange={e => setEditForm({...editForm, sequence: Number(e.target.value)})}/></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="edit-placement-active"
                                checked={editForm.is_active ?? true}
                                onCheckedChange={(v) => setEditForm({...editForm, is_active: v})}
                            />
                            <Label htmlFor="edit-placement-active" className="cursor-pointer">{t('admin.enabled')}</Label>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleUpdate} disabled={!editForm.name || !editForm.slug}>{t('common.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
                    <AlertDialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            {t('admin.confirmDelete', 'Confirm Delete')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteAdPlacementConfirm', {name: deletingItem?.name})}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <AlertDialogCancel className="rounded-lg h-10 px-5 border-border/60 mt-0">{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium">{t('admin.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const AdsTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: placementsData} = useAdminAdPlacements();
    const [selectedPlacement, setSelectedPlacement] = useState<string>('');
    const {data: adsData, isLoading} = useAdminAds(selectedPlacement);
    const createMutation = useCreateAd();
    const updateMutation = useUpdateAd();
    const toggleMutation = useToggleAd();
    const deleteMutation = useDeleteAd();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Ad | null>(null);
    const [deletingAd, setDeletingAd] = useState<Ad | null>(null);
    const [createForm, setCreateForm] = useState<CreateAdRequest>({placement_id: '', title: ''});
    const [editForm, setEditForm] = useState<UpdateAdRequest>({
        title: '', image_url: '', link_url: '', priority: 0, is_active: true, start_at: '', end_at: '',
    });

    const placements = (placementsData as AdPlacement[] | undefined) || [];
    const ads = adsData?.items || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync({...createForm, placement_id: selectedPlacement});
            setCreateDialogOpen(false);
            setCreateForm({placement_id: '', title: ''});
        } catch (err) {
            console.error('Failed to create ad:', err);
        }
    };

    const openEditDialog = (ad: Ad) => {
        setEditingAd(ad);
        setEditForm({
            title: ad.title,
            image_url: ad.image_url || '',
            link_url: ad.link_url || '',
            priority: ad.priority,
            is_active: ad.is_active,
            start_at: ad.start_at || '',
            end_at: ad.end_at || '',
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

    const handleToggle = async (id: string) => {
        try {
            await toggleMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to toggle:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingAd) return;
        try {
            await deleteMutation.mutateAsync(deletingAd.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5"/>{t('admin.adManagement')}</CardTitle>
                            <CardDescription>{t('admin.adManagementDesc')}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
                                <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('admin.selectAdPlacement')}/></SelectTrigger>
                                <SelectContent>
                                    {placements.filter(p => p.id).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => setCreateDialogOpen(true)} disabled={!selectedPlacement}><Plus className="w-4 h-4 mr-2"/>{t('admin.addAd')}</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.adTitle')}</TableHead>
                                    <TableHead>{t('admin.adImageUrl')}</TableHead>
                                    <TableHead>{t('admin.adLinkUrl')}</TableHead>
                                    <TableHead>{t('admin.adPriority')}</TableHead>
                                    <TableHead>{t('admin.adImpressions')}/{t('admin.adClicks')}</TableHead>
                                    <TableHead>{t('admin.adCtr')}</TableHead>
                                    <TableHead>{t('admin.placementStatus')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ads.length > 0 ? ads.map(ad => (
                                    <TableRow key={ad.id}>
                                        <TableCell className="font-medium">
                                            {ad.title}
                                            {ad.badge_text && <Badge variant="outline" className="ml-2">{ad.badge_text}</Badge>}
                                        </TableCell>
                                        <TableCell>{ad.image_url ? <span className="text-xs text-green-600">✓</span> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{ad.link_url || '-'}</TableCell>
                                        <TableCell>{ad.priority}</TableCell>
                                        <TableCell className="text-sm">{ad.impressions}/{ad.clicks}</TableCell>
                                        <TableCell className="text-sm">{ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) + '%' : '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={ad.is_active} onCheckedChange={() => handleToggle(ad.id)}/>
                                                <span className={`text-sm ${ad.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {ad.is_active ? t('admin.enabled', '启用') : t('admin.disabled', '禁用')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(ad)}>
                                                    <Edit className="w-4 h-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { setDeletingAd(ad); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">{selectedPlacement ? t('admin.noAds') : t('admin.selectPlacementFirst')}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            {t('admin.addAdTitle', 'Add Advertisement')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.addAdDesc', 'Create a new advertisement with creative assets, target link, and priority.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <div className="grid gap-2"><Label>{t('admin.adTitle')}</Label><Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder={t('admin.adTitle')}/></div>
                        <ImageUploadField
                            value={createForm.image_url || ''}
                            onChange={url => setCreateForm({...createForm, image_url: url})}
                            label={t('admin.adImageUrl')}
                        />
                        <ImageUploadField
                            value={createForm.image_mobile_url || ''}
                            onChange={url => setCreateForm({...createForm, image_mobile_url: url})}
                            label={t('admin.adMobileImageUrl')}
                        />
                        <div className="grid gap-2"><Label>{t('admin.adLinkUrl')}</Label><Input value={createForm.link_url || ''} onChange={e => setCreateForm({...createForm, link_url: e.target.value})} placeholder="https://..."/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.adBadgeText')}</Label><Input value={createForm.badge_text || ''} onChange={e => setCreateForm({...createForm, badge_text: e.target.value})} placeholder="NEW"/></div>
                            <div className="grid gap-2"><Label>{t('admin.adPriority')}</Label><Input type="number" value={createForm.priority || 0} onChange={e => setCreateForm({...createForm, priority: Number(e.target.value)})}/></div>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleCreate} disabled={!createForm.title}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary" />
                            {t('admin.editAd', 'Edit Advertisement')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.editAdDesc', 'Update advertisement creative, targeting, and scheduling settings.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <div className="grid gap-2"><Label>{t('admin.adTitle')}</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/></div>
                        <ImageUploadField
                            value={editForm.image_url || ''}
                            onChange={url => setEditForm({...editForm, image_url: url})}
                            label={t('admin.adImageUrl')}
                        />
                        <div className="grid gap-2"><Label>{t('admin.adLinkUrl')}</Label><Input value={editForm.link_url || ''} onChange={e => setEditForm({...editForm, link_url: e.target.value})} placeholder="https://..."/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.adPriority')}</Label><Input type="number" value={editForm.priority || 0} onChange={e => setEditForm({...editForm, priority: Number(e.target.value)})}/></div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="edit-ad-active"
                                    checked={editForm.is_active ?? true}
                                    onCheckedChange={(v) => setEditForm({...editForm, is_active: v})}
                                />
                                <Label htmlFor="edit-ad-active" className="cursor-pointer">{t('admin.enabled')}</Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.adStartAt')}</Label><Input type="datetime-local" value={editForm.start_at || ''} onChange={e => setEditForm({...editForm, start_at: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.adEndAt')}</Label><Input type="datetime-local" value={editForm.end_at || ''} onChange={e => setEditForm({...editForm, end_at: e.target.value})}/></div>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleUpdate} disabled={!editForm.title}>{t('common.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
                    <AlertDialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            {t('admin.confirmDelete', 'Confirm Delete')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteAdConfirm', 'Are you sure you want to delete this advertisement? This action cannot be undone.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <AlertDialogCancel className="rounded-lg h-10 px-5 border-border/60 mt-0">{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium">{t('admin.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
