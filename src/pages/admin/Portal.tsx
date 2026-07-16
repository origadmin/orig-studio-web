import React, {useState} from 'react';
import {
    Layout, Plus, Edit, Trash2, Settings, ChevronDown,
    GripVertical, ArrowUp, ArrowDown, Megaphone, BarChart3,
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
                <TabsList>
                    <TabsTrigger value="navigation">{t('admin.navigationTab')}</TabsTrigger>
                    <TabsTrigger value="banners">{t('admin.bannersTab')}</TabsTrigger>
                    <TabsTrigger value="ad-placements">{t('admin.adPlacementsTab')}</TabsTrigger>
                    <TabsTrigger value="ads">{t('admin.adsTab')}</TabsTrigger>
                </TabsList>
                <TabsContent value="navigation" className="mt-4">
                    <NavigationTab/>
                </TabsContent>
                <TabsContent value="banners" className="mt-4">
                    <BannersTab/>
                </TabsContent>
                <TabsContent value="ad-placements" className="mt-4">
                    <AdPlacementsTab/>
                </TabsContent>
                <TabsContent value="ads" className="mt-4">
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
        return {
            display_mode: first.display_mode || 'wide',
            auto_slide_interval: first.auto_slide_interval ?? 5,
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
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const buildCreatePayload = (f: BannerFormData): CreateBannerRequest => {
        const payload: CreateBannerRequest = {
            title: f.title,
            type: 'custom',
            image_url: f.image_url || undefined,
            is_active: f.is_active,
            sequence: f.sequence,
        };
        if (f.subtitle) payload.subtitle = f.subtitle;
        if (f.badge_text) payload.badge_text = f.badge_text;
        if (f.primary_btn_text) payload.primary_btn_text = f.primary_btn_text;
        if (f.primary_btn_url) payload.primary_btn_url = f.primary_btn_url;
        const startISO = toISO(f.start_at);
        const endISO = toISO(f.end_at);
        if (startISO) payload.start_at = startISO;
        if (endISO) payload.end_at = endISO;
        return payload;
    };

    const buildUpdatePayload = (f: BannerFormData): UpdateBannerRequest => {
        const payload: UpdateBannerRequest = {
            title: f.title,
            type: 'custom',
            image_url: f.image_url || undefined,
            is_active: f.is_active,
            sequence: f.sequence,
        };
        if (f.subtitle) payload.subtitle = f.subtitle;
        if (f.badge_text) payload.badge_text = f.badge_text;
        if (f.primary_btn_text) payload.primary_btn_text = f.primary_btn_text;
        if (f.primary_btn_url) payload.primary_btn_url = f.primary_btn_url;
        const startISO = toISO(f.start_at);
        const endISO = toISO(f.end_at);
        if (startISO) payload.start_at = startISO;
        if (endISO) payload.end_at = endISO;
        return payload;
    };

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(buildCreatePayload(createForm));
            toast.success(t('admin.bannerCreateSuccess', 'Banner created'));
            setCreateDialogOpen(false);
            setCreateForm(emptyBannerForm);
            setAdvancedOpen(false);
            queryClient.invalidateQueries({queryKey: ['adminBanners']});
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
            queryClient.invalidateQueries({queryKey: ['adminBanners']});
        } catch (err) {
            console.error('Failed to update banner:', err);
            toast.error(t('admin.bannerUpdateFail', 'Failed to update banner'));
        }
    };

    const handleSaveGlobal = async () => {
        if (!globalDirty) return;
        setGlobalSaving(true);
        try {
            await Promise.all(
                banners.map(b =>
                    updateMutation.mutateAsync({
                        id: b.id,
                        data: {
                            display_mode: globalSettings.display_mode,
                            auto_slide_interval: globalSettings.auto_slide_interval,
                        },
                    })
                )
            );
            toast.success(t('admin.bannerGlobalSaveSuccess', 'Carousel settings saved'));
            setGlobalDirty(false);
            queryClient.invalidateQueries({queryKey: ['adminBanners']});
        } catch (err) {
            console.error('Failed to save global banner settings:', err);
            toast.error(t('admin.bannerGlobalSaveFail', 'Failed to save carousel settings'));
        } finally {
            setGlobalSaving(false);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleMutation.mutateAsync(id);
            queryClient.invalidateQueries({queryKey: ['adminBanners']});
        } catch (err) {
            console.error('Failed to toggle banner:', err);
        }
    };

    const handleDelete = async () => {
        if (!editingBanner) return;
        try {
            await deleteMutation.mutateAsync(editingBanner.id);
            toast.success(t('admin.bannerDeleteSuccess', 'Banner deleted'));
            setDeleteDialogOpen(false);
            queryClient.invalidateQueries({queryKey: ['adminBanners']});
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
        });
        setAdvancedOpen(!!(banner.start_at || banner.end_at) || banner.sequence !== 0);
        setEditDialogOpen(true);
    };

    const aspectClass = globalSettings.display_mode === 'narrow' ? 'aspect-video' : 'aspect-[21/9]';

    const renderBannerFormFields = (
        form: BannerFormData,
        setForm: React.Dispatch<React.SetStateAction<BannerFormData>>,
    ) => (
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
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="px-0 text-sm flex items-center gap-1 -ml-1">
                        <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}/>
                        {t('admin.bannerAdvanced', '其他设置')}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
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
                            <Label htmlFor="banner-end">{t('admin.bannerEndAt', '结束时间')}</Label>
                            <Input
                                id="banner-end"
                                type="datetime-local"
                                value={form.end_at}
                                onChange={e => setForm({...form, end_at: e.target.value})}
                            />
                        </div>
                    </div>
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
            <div className="flex items-center gap-2">
                <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({...form, is_active: v})}
                    id="banner-active"
                />
                <Label htmlFor="banner-active" className="cursor-pointer">{t('admin.bannerIsActive', '是否启用')}</Label>
            </div>
        </>
    );

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary"/>
                        {t('admin.bannerGlobalSettings', '轮播全局设置')}
                    </CardTitle>
                    <CardDescription>
                        {t('admin.bannerGlobalSettingsDesc', '控制所有Banner轮播的展示模式与切换速度。')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>{t('admin.bannerDisplayMode', '展示模式')}</Label>
                        <RadioGroup
                            value={globalSettings.display_mode}
                            onValueChange={(v: 'wide' | 'narrow') => updateGlobal({display_mode: v})}
                            className="flex gap-6"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="wide" id="mode-wide"/>
                                <Label htmlFor="mode-wide" className="cursor-pointer">
                                    {t('admin.bannerDisplayModeWide', '宽屏 (21:9)')}
                                </Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="narrow" id="mode-narrow"/>
                                <Label htmlFor="mode-narrow" className="cursor-pointer">
                                    {t('admin.bannerDisplayModeNarrow', '窄屏 (16:9)')}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="grid gap-2 max-w-xs">
                        <Label htmlFor="carousel-interval">{t('admin.bannerAutoSlide', '自动轮播间隔(秒)')}</Label>
                        <Input
                            id="carousel-interval"
                            type="number"
                            min={1}
                            max={30}
                            value={globalSettings.auto_slide_interval}
                            onChange={e => updateGlobal({auto_slide_interval: Math.max(1, Number(e.target.value) || 5)})}
                        />
                    </div>
                    <Button
                        size="sm"
                        onClick={handleSaveGlobal}
                        disabled={!globalDirty || globalSaving}
                    >
                        {globalSaving ? <Spinner className="w-4 h-4 mr-2"/> : null}
                        {t('common.save', '保存')}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('admin.bannerManagement', 'Banner管理')}</CardTitle>
                            <CardDescription>{t('admin.bannerManagementDesc', '管理首页轮播Banner')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={openCreateDialog}>
                            <Plus className="w-4 h-4 mr-2"/>{t('admin.addBanner', '添加Banner')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-12 text-center"><Spinner className="mx-auto"/></div>
                    ) : banners.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {banners.map(banner => (
                                <Card key={banner.id} className={`overflow-hidden ${!banner.is_active ? 'opacity-60' : ''}`}>
                                    <div className={`relative ${aspectClass} bg-slate-800`}>
                                        {banner.image_url ? (
                                            <img src={banner.image_url} alt="" className="w-full h-full object-cover"/>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/70">
                                                {banner.title || t('admin.noImage', '无图片')}
                                            </div>
                                        )}
                                        {banner.badge_text && (
                                            <Badge className="absolute top-2 left-2" variant="secondary">
                                                {banner.badge_text}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <div>
                                            <h3 className="font-semibold text-sm truncate">{banner.title}</h3>
                                            {banner.subtitle && (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">{banner.subtitle}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={banner.is_active}
                                                    onCheckedChange={() => handleToggle(banner.id)}
                                                    aria-label={banner.is_active ? t('admin.disable', '禁用') : t('admin.enable', '启用')}
                                                />
                                                <span className={`text-sm ${banner.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {banner.is_active ? t('admin.enabled', '启用') : t('admin.disabled', '禁用')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon-sm"
                                                    onClick={() => openEditDialog(banner)}>
                                                    <Edit className="w-4 h-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive"
                                                    onClick={() => { setEditingBanner(banner); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                        {banner.primary_btn_text && (
                                            <div className="text-xs text-muted-foreground truncate">
                                                CTA: {banner.primary_btn_text} {banner.primary_btn_url ? `→ ${banner.primary_btn_url}` : ''}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-muted-foreground">{t('admin.noBanners', '暂无Banner')}</div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary"/>
                            {t('admin.createBanner', '添加Banner')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        {renderBannerFormFields(createForm, setCreateForm)}
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', '取消')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.title || !createForm.image_url}>{t('common.add', '添加')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary"/>
                            {t('admin.editBanner', '编辑Banner')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        {renderBannerFormFields(editForm, setEditForm)}
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', '取消')}</Button>
                        <Button onClick={handleUpdate}>{t('common.save', '保存')}</Button>
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
