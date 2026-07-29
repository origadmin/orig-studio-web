import React, {useState} from 'react';
import {
    Layout, Plus, Edit, Trash2, Settings, ChevronDown,
    GripVertical, ArrowUp, ArrowDown, Megaphone, BarChart3, ImageOff,
    Calendar, Minus, Link2, Navigation, Image as ImageIcon, Layers, Clock as ClockIcon, Film,
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
import {getFullUrl} from '@/lib/utils';
import {generateSlug} from '@/lib/utils/slug';
import {toast} from 'sonner';
import {
    useAdminNavItems, useAdminBanners,
    useCreateNavItem, useUpdateNavItem, useDeleteNavItem,
    useCreateBanner, useUpdateBanner, useToggleBanner, useDeleteBanner,
    useAdminAdPlacements, useCreateAdPlacement, useUpdateAdPlacement, useToggleAdPlacement, useDeleteAdPlacement,
} from '@/hooks/queries';
import {type NavItem, type Banner, type CreateNavItemRequest, type CreateBannerRequest, type UpdateBannerRequest, type AdPlacement, type CreateAdPlacementRequest, type UpdateAdPlacementRequest, adminPortalApi, type AdCreative, type CreateAdCreativeRequest, type UpdateAdCreativeRequest} from '@/lib/api/portal';
import {adminCreativesApi, adminPlacementCreativesApi} from '@/lib/api/ads';
import {useQuery, useQueryClient} from '@tanstack/react-query';

export default function PortalConfigPage() {
    const {t} = useTranslation();
    const defaultTab = React.useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        // 兼容旧tab名：ad-placements 和 ads 统一指向 ad-management
        if (tab === 'ad-placements' || tab === 'ads') return 'ad-management';
        if (tab && ['navigation', 'banners', 'ad-management'].includes(tab)) return tab;
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
                    <TabsTrigger value="ad-management" className="pb-3 px-1 border-b-2 flex items-center gap-2 text-sm font-semibold transition-colors rounded-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none border-transparent text-muted-foreground hover:text-foreground">
                        <Megaphone className="w-4 h-4"/>{t('admin.adManagementTab', '广告管理')}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="navigation">
                    <NavigationTab/>
                </TabsContent>
                <TabsContent value="banners">
                    <BannersTab/>
                </TabsContent>
                <TabsContent value="ad-management">
                    <AdManagerTab/>
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
            queryClient.invalidateQueries({queryKey: ['adminNavItems']});
            queryClient.invalidateQueries({queryKey: ['portalConfig']});
            toast.success(t('admin.navItemCreated', '导航项创建成功'));
        } catch (err) {
            console.error('Failed to create nav item:', err);
            toast.error(t('admin.navItemCreateFail', '导航项创建失败'));
        }
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        try {
            await updateMutation.mutateAsync({id: editingItem.id, data: editForm});
            setEditDialogOpen(false);
            queryClient.invalidateQueries({queryKey: ['adminNavItems']});
            queryClient.invalidateQueries({queryKey: ['portalConfig']});
            toast.success(t('admin.navItemUpdated', '导航项更新成功'));
        } catch (err) {
            console.error('Failed to update nav item:', err);
            toast.error(t('admin.navItemUpdateFail', '导航项更新失败'));
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            await deleteMutation.mutateAsync(editingItem.id);
            setDeleteDialogOpen(false);
            setEditingItem(null);
            queryClient.invalidateQueries({queryKey: ['adminNavItems']});
            queryClient.invalidateQueries({queryKey: ['portalConfig']});
            toast.success(t('admin.navItemDeleted', '导航项删除成功'));
        } catch (err) {
            console.error('Failed to delete nav item:', err);
            toast.error(t('admin.navItemDeleteFail', '导航项删除失败'));
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
    video_url: string;
    primary_btn_text: string;
    primary_btn_url: string;
    sequence: number;
    is_active: boolean;
    start_at: string;
    end_at: string;
    type: 'custom' | 'hot_videos' | 'new_videos';
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
    video_url: '',
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
        let title = f.title;
        if (!title) {
            if (f.type === 'hot_videos') title = '最火视频';
            else if (f.type === 'new_videos') title = '最新上线';
            else title = 'Banner';
        }
        const payload: CreateBannerRequest = {
            title: title,
            type: f.type,
            is_active: f.is_active,
            sequence: f.sequence,
        };
        if (f.type === 'custom') {
            if (f.image_url) payload.image_url = f.image_url;
            if (f.video_url) payload.video_url = f.video_url;
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
        if (f.type === 'custom') {
            payload.image_url = f.image_url || '';
            payload.video_url = f.video_url || '';
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
            video_url: banner.video_url || '',
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
            {(form.type === 'custom') && (
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
                    <ImageUploadField
                        value={form.video_url}
                        onChange={url => setForm({...form, video_url: url})}
                        label={t('admin.bannerVideoUrl', 'Banner视频（可选，作为背景视频自动播放）')}
                        kind="video"
                        accept="video/*"
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
                                    {banner.video_url ? (
                                        <>
                                            <video
                                                src={getFullUrl(banner.video_url) || undefined}
                                                poster={getFullUrl(banner.image_url) || undefined}
                                                muted
                                                loop
                                                playsInline
                                                autoPlay
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute top-2 right-2 bg-black/60 text-white rounded-md px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-1">
                                                <Film className="w-3 h-3"/>
                                                <span>VIDEO</span>
                                            </div>
                                        </>
                                    ) : banner.image_url ? (
                                        <img
                                            src={getFullUrl(banner.image_url)}
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
                            disabled={(createForm.type === 'custom') && (!createForm.title || (!createForm.image_url && !createForm.video_url))}
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

const AdManagerTab: React.FC = () => {
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const {data: placementsData, isLoading: placementsLoading} = useAdminAdPlacements();
    const createPlacementMutation = useCreateAdPlacement();
    const updatePlacementMutation = useUpdateAdPlacement();
    const togglePlacementMutation = useToggleAdPlacement();
    const deletePlacementMutation = useDeleteAdPlacement();

    const placements = (placementsData as AdPlacement[] | undefined) || [];
    const [selectedPlacementId, setSelectedPlacementId] = useState<string>('');
    const selectedPlacement = placements.find(p => p.id === selectedPlacementId) || null;

    // D2（G6-3 重构）：广告列表改为展示「绑定该广告位的创意 AdCreative」，后端 M2M 不动
    const {data: boundIds = [], isLoading: boundLoading} = useQuery({
        queryKey: ['admin', 'placementCreatives', selectedPlacementId],
        queryFn: () => adminPlacementCreativesApi.list(selectedPlacementId),
        enabled: !!selectedPlacementId,
    });
    const {data: allCreatives = []} = useQuery({
        queryKey: ['admin', 'creatives'],
        queryFn: () => adminCreativesApi.list(),
    });
    const creatives = allCreatives.filter(c => boundIds.includes(c.id));
    const adsLoading = boundLoading;

    // 广告位弹窗
    const [placementDialogMode, setPlacementDialogMode] = useState<'create' | 'edit'>('create');
    const [placementDialogOpen, setPlacementDialogOpen] = useState(false);
    const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null);
    const [placementForm, setPlacementForm] = useState<CreateAdPlacementRequest & Partial<UpdateAdPlacementRequest>>({
        name: '', slug: '', type: 'banner', width: 0, height: 0, max_ads: 1, is_active: true, sequence: 0, description: '',
    });
    const [placementPage, setPlacementPage] = useState('home');
    const [placementSlugManuallyEdited, setPlacementSlugManuallyEdited] = useState(false);
    const [placementNameFromPreset, setPlacementNameFromPreset] = useState(false);
    const [placementPosition, setPlacementPosition] = useState('top-banner');

    const placementPages = [
        { value: 'home', label: t('admin.pageHome', '首页') },
        { value: 'player', label: t('admin.pagePlayer', '播放页') },
        { value: 'category', label: t('admin.pageCategory', '分类页') },
        { value: 'article', label: t('admin.pageArticle', '文章页') },
        { value: 'custom', label: t('admin.pageCustom', '其他') },
    ];

    const placementPositions = [
        { value: 'top-banner', label: t('admin.positionTopBanner', '顶部横幅'), type: 'banner', width: 960, height: 90 },
        { value: 'sidebar', label: t('admin.positionSidebar', '侧边栏'), type: 'sidebar', width: 320, height: 240 },
        { value: 'feed', label: t('admin.positionFeed', '信息流'), type: 'feed', width: 300, height: 250 },
        { value: 'bottom', label: t('admin.positionBottom', '底部'), type: 'banner', width: 960, height: 90 },
        { value: 'floating', label: t('admin.positionFloating', '悬浮'), type: 'card', width: 300, height: 250 },
        { value: 'custom', label: t('admin.positionCustom', '其他'), type: 'banner', width: 0, height: 0 },
    ];

    const resolvePageAndPositionFromSlug = (slug: string): { page: string; position: string } => {
        for (const page of placementPages) {
            for (const pos of placementPositions) {
                if (slug === `${page.value}-${pos.value}`) {
                    return { page: page.value, position: pos.value };
                }
            }
        }
        return { page: 'custom', position: 'custom' };
    };

    const handlePlacementPageChange = (page: string) => {
        setPlacementPage(page);
        const pos = placementPositions.find(p => p.value === placementPosition);
        const pageInfo = placementPages.find(p => p.value === page);
        if (pos && pageInfo && page !== 'custom' && pos.value !== 'custom') {
            setPlacementNameFromPreset(true);
            setPlacementSlugManuallyEdited(false);
            setPlacementForm(prev => ({
                ...prev,
                name: `${pageInfo.label}${pos.label}广告位`,
                slug: `${page}-${pos.value}`,
                type: pos.type,
                width: pos.width,
                height: pos.height,
            }));
        }
    };

    const handlePlacementPositionChange = (position: string) => {
        setPlacementPosition(position);
        const pos = placementPositions.find(p => p.value === position);
        const pageInfo = placementPages.find(p => p.value === placementPage);
        if (pos && pageInfo && placementPage !== 'custom' && position !== 'custom') {
            setPlacementNameFromPreset(true);
            setPlacementSlugManuallyEdited(false);
            setPlacementForm(prev => ({
                ...prev,
                name: `${pageInfo.label}${pos.label}广告位`,
                slug: `${placementPage}-${position}`,
                type: pos.type,
                width: pos.width,
                height: pos.height,
            }));
        } else if (pos && position !== 'custom') {
            setPlacementForm(prev => ({
                ...prev,
                type: pos.type,
                width: pos.width,
                height: pos.height,
            }));
        }
    };

    // 创意弹窗（D2：新建创意并关联 / 从创意库选择复用）
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addMode, setAddMode] = useState<'create' | 'library'>('create');
    const [creativeForm, setCreativeForm] = useState<CreateAdCreativeRequest>({
        title: '', image_url: '', image_mobile_url: '', link_url: '', link_target: '_blank',
        badge_text: '', priority: 0, is_active: true,
    });
    const [editingCreative, setEditingCreative] = useState<AdCreative | null>(null);
    const [creativeEditOpen, setCreativeEditOpen] = useState(false);
    // 轻量创意库查看/管理弹窗
    const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);

    // 删除弹窗
    const [deleteType, setDeleteType] = useState<'placement' | 'creative'>('placement');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingPlacement, setDeletingPlacement] = useState<AdPlacement | null>(null);
    const [deletingCreative, setDeletingCreative] = useState<AdCreative | null>(null);
    const [cascadeCount, setCascadeCount] = useState(0);

    // 自动选中第一个广告位
    React.useEffect(() => {
        if (placements.length > 0 && !selectedPlacementId) {
            setSelectedPlacementId(placements[0].id);
        }
    }, [placements, selectedPlacementId]);

    // 非预设状态下，根据名称自动生成 slug
    React.useEffect(() => {
        if (!placementNameFromPreset && !placementSlugManuallyEdited && placementForm.name) {
            const generated = generateSlug(placementForm.name);
            setPlacementForm(prev => (generated && generated !== prev.slug ? {...prev, slug: generated} : prev));
        }
    }, [placementForm.name, placementNameFromPreset, placementSlugManuallyEdited]);

    const typeLabels: Record<string, string> = {
        banner: t('admin.placementTypeBanner', '横幅'),
        card: t('admin.placementTypeCard', '卡片'),
        rectangle: t('admin.placementTypeRectangle', '矩形'),
        leaderboard: t('admin.placementTypeLeaderboard', '排行榜'),
        feed: t('admin.placementTypeFeed', '信息流'),
        sidebar: t('admin.placementTypeSidebar', '侧边栏'),
    };

    const PlacementPreview: React.FC<{slug: string; name: string}> = ({slug}) => {
        const previewStyles: Record<string, React.ReactNode> = {
            'home-banner': (
                <div className="w-full h-full flex items-stretch gap-1 p-1.5">
                    <div className="flex-1 bg-gray-200/50 rounded-sm flex items-center justify-center">
                        <span className="text-[7px] text-muted-foreground">主内容</span>
                    </div>
                    <div className="w-2/5 bg-rose-500/30 rounded-sm border border-rose-500/50 flex items-center justify-center">
                        <span className="text-[7px] text-rose-600 font-medium">AD</span>
                    </div>
                </div>
            ),
            'home-sponsored': (
                <div className="w-full h-full flex flex-col gap-1 p-1.5">
                    <div className="h-1/4 grid grid-cols-4 gap-0.5">
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                    </div>
                    <div className="h-1/4 grid grid-cols-4 gap-0.5">
                        <div className="bg-amber-500/30 rounded-sm border border-amber-500/50 flex items-center justify-center">
                            <span className="text-[7px] text-amber-600 font-medium">AD</span>
                        </div>
                        <div className="bg-amber-500/30 rounded-sm border border-amber-500/50"/>
                        <div className="bg-amber-500/30 rounded-sm border border-amber-500/50"/>
                        <div className="bg-amber-500/30 rounded-sm border border-amber-500/50"/>
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-0.5">
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                    </div>
                </div>
            ),
            'home-feed': (
                <div className="w-full h-full flex flex-col gap-0.5 p-1.5">
                    <div className="flex-1 grid grid-cols-3 gap-0.5">
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-emerald-500/30 rounded-sm border border-emerald-500/50 flex items-center justify-center">
                            <span className="text-[7px] text-emerald-600 font-medium">AD</span>
                        </div>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                        <div className="bg-gray-200/50 rounded-sm"/>
                    </div>
                </div>
            ),
            'sidebar': (
                <div className="w-full h-full flex flex-col gap-0.5 p-1.5">
                    <div className="h-1/3 bg-blue-500/30 rounded-sm border border-blue-500/50 flex items-center justify-center">
                        <span className="text-[7px] text-blue-600 font-medium">AD</span>
                    </div>
                    <div className="flex-1 bg-gray-200/50 rounded-sm"/>
                    <div className="flex-1 bg-gray-200/50 rounded-sm"/>
                </div>
            ),
            'watch-sidebar': (
                <div className="w-full h-full flex gap-1 p-1.5">
                    <div className="flex-1 bg-gray-200/50 rounded-sm flex items-center justify-center">
                        <span className="text-[7px] text-muted-foreground">播放器</span>
                    </div>
                    <div className="w-1/3 flex flex-col gap-0.5">
                        <div className="h-1/4 bg-blue-500/30 rounded-sm border border-blue-500/50 flex items-center justify-center">
                            <span className="text-[7px] text-blue-600 font-medium">AD</span>
                        </div>
                        <div className="flex-1 bg-gray-200/50 rounded-sm"/>
                        <div className="flex-1 bg-gray-200/50 rounded-sm"/>
                    </div>
                </div>
            ),
        };
        return (
            <div className="w-20 h-12 bg-muted/30 rounded border border-border">
                {previewStyles[slug] || (
                    <div className="w-full h-full flex items-center justify-center">
                        <Megaphone className="w-3 h-3 text-muted-foreground"/>
                    </div>
                )}
            </div>
        );
    };

    // ========== 广告位操作 ==========
    const openCreatePlacementDialog = () => {
        setPlacementDialogMode('create');
        setEditingPlacement(null);
        setPlacementPage('home');
        setPlacementPosition('top-banner');
        setPlacementSlugManuallyEdited(false);
        setPlacementNameFromPreset(true);
        const defaultPos = placementPositions.find(p => p.value === 'top-banner');
        setPlacementForm({
            name: '首页顶部横幅广告位',
            slug: 'home-top-banner',
            type: defaultPos?.type || 'banner',
            width: defaultPos?.width || 0,
            height: defaultPos?.height || 0,
            max_ads: 1, is_active: true, sequence: 0, description: '',
        });
        setPlacementDialogOpen(true);
    };

    const openEditPlacementDialog = (p: AdPlacement) => {
        setPlacementDialogMode('edit');
        setEditingPlacement(p);
        const { page, position } = resolvePageAndPositionFromSlug(p.slug);
        setPlacementPage(page);
        setPlacementPosition(position);
        setPlacementSlugManuallyEdited(true);
        setPlacementNameFromPreset(false);
        setPlacementForm({
            name: p.name, slug: p.slug, type: p.type,
            width: p.width, height: p.height, max_ads: p.max_ads,
            is_active: p.is_active, sequence: p.sequence,
            description: (p as {description?: string}).description || '',
        });
        setPlacementDialogOpen(true);
    };

    const handleSavePlacement = async () => {
        try {
            if (placementDialogMode === 'create') {
                await createPlacementMutation.mutateAsync(placementForm);
                toast.success(t('admin.placementCreateSuccess', '广告位创建成功'));
            } else if (editingPlacement) {
                await updatePlacementMutation.mutateAsync({id: editingPlacement.id, data: placementForm});
                toast.success(t('admin.placementUpdateSuccess', '广告位更新成功'));
            }
            setPlacementDialogOpen(false);
            queryClient.invalidateQueries({queryKey: ['adminAdPlacements']});
        } catch (err) {
            console.error('Failed to save placement:', err);
            toast.error(t('admin.placementSaveFail', '广告位保存失败'));
        }
    };

    const handleTogglePlacement = async (id: string) => {
        try {
            await togglePlacementMutation.mutateAsync(id);
            queryClient.invalidateQueries({queryKey: ['adminAdPlacements']});
        } catch (err) {
            console.error('Failed to toggle:', err);
        }
    };

    const openDeletePlacementDialog = async (p: AdPlacement) => {
        setDeleteType('placement');
        setDeletingPlacement(p);
        setDeletingCreative(null);
        // D2：统计该广告位已绑定的创意数量（绑定关系而非 legacy Ad）
        try {
            const bound = await adminPlacementCreativesApi.list(p.id);
            setCascadeCount(bound.length);
        } catch {
            setCascadeCount(0);
        }
        setDeleteDialogOpen(true);
    };

    // ========== 创意操作（D2：G6-3 重构） ==========
    const resetCreativeForm = () =>
        setCreativeForm({
            title: '', image_url: '', image_mobile_url: '', link_url: '', link_target: '_blank',
            badge_text: '', priority: 0, is_active: true,
        });

    const openAddDialog = (mode: 'create' | 'library' = 'create') => {
        if (!selectedPlacementId) {
            toast.info(t('admin.selectPlacementFirst', '请先选择广告位'));
            return;
        }
        setAddMode(mode);
        resetCreativeForm();
        setAddDialogOpen(true);
    };

    const handleCreateAndAssign = async () => {
        if (!selectedPlacementId) return;
        try {
            const created = await adminCreativesApi.create(creativeForm);
            await adminPlacementCreativesApi.assign(selectedPlacementId, created.id);
            toast.success(t('admin.creativeCreateAndAssignSuccess', '创意已创建并关联到当前广告位'));
            setAddDialogOpen(false);
            queryClient.invalidateQueries({queryKey: ['admin', 'creatives']});
            queryClient.invalidateQueries({queryKey: ['admin', 'placementCreatives', selectedPlacementId]});
        } catch (err) {
            console.error('Failed to create & assign creative:', err);
            toast.error(t('admin.creativeSaveFail', '创意保存失败'));
        }
    };

    const openEditCreativeDialog = (c: AdCreative) => {
        setEditingCreative(c);
        setCreativeForm({
            title: c.title, image_url: c.image_url || '', image_mobile_url: c.image_mobile_url || '',
            link_url: c.link_url || '', link_target: c.link_target || '_blank', badge_text: c.badge_text || '',
            priority: c.priority, is_active: c.is_active,
        });
        setCreativeEditOpen(true);
    };

    const handleUpdateCreative = async () => {
        if (!editingCreative) return;
        try {
            await adminCreativesApi.update(editingCreative.id, creativeForm);
            toast.success(t('admin.creativeUpdateSuccess', '创意更新成功'));
            setCreativeEditOpen(false);
            queryClient.invalidateQueries({queryKey: ['admin', 'creatives']});
            queryClient.invalidateQueries({queryKey: ['admin', 'placementCreatives', selectedPlacementId]});
        } catch (err) {
            console.error('Failed to update creative:', err);
            toast.error(t('admin.creativeSaveFail', '创意保存失败'));
        }
    };

    const handleToggleCreative = async (c: AdCreative) => {
        try {
            await adminCreativesApi.update(c.id, {is_active: !c.is_active});
            queryClient.invalidateQueries({queryKey: ['admin', 'creatives']});
            queryClient.invalidateQueries({queryKey: ['admin', 'placementCreatives', selectedPlacementId]});
        } catch (err) {
            console.error('Failed to toggle creative:', err);
        }
    };

    const openRemoveCreativeDialog = (c: AdCreative) => {
        setDeleteType('creative');
        setDeletingCreative(c);
        setDeletingPlacement(null);
        setCascadeCount(0);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            if (deleteType === 'placement' && deletingPlacement) {
                await deletePlacementMutation.mutateAsync(deletingPlacement.id);
                toast.success(t('admin.placementDeleteSuccess', '广告位已删除'));
                // 如果删除的是当前选中的广告位，清空选中
                if (selectedPlacementId === deletingPlacement.id) {
                    setSelectedPlacementId('');
                }
                queryClient.invalidateQueries({queryKey: ['adminAdPlacements']});
            } else if (deleteType === 'creative' && deletingCreative) {
                if (selectedPlacementId) {
                    await adminPlacementCreativesApi.unassign(selectedPlacementId, deletingCreative.id);
                }
                toast.success(t('admin.creativeUnassignSuccess', '已从该广告位移除创意'));
                queryClient.invalidateQueries({queryKey: ['admin', 'placementCreatives', selectedPlacementId]});
            }
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete:', err);
            toast.error(t('admin.deleteFail', '删除失败'));
        }
    };

    return (
        <>
            {/* 顶部：广告位切换器 */}
            <Card className="mb-4">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5"/>{t('admin.adManagement', '广告管理')}</CardTitle>
                            <CardDescription>{t('admin.adManagementDesc', '管理广告位与广告创意')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={openCreatePlacementDialog}>
                            <Plus className="w-4 h-4 mr-2"/>{t('admin.addAdPlacement', '添加广告位')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {placementsLoading ? (
                        <div className="py-8 text-center"><Spinner className="mx-auto"/></div>
                    ) : placements.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                            <p>{t('admin.noAdPlacements', '暂无广告位，请先创建')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {placements.map(p => {
                                const isSelected = p.id === selectedPlacementId;
                                const currentAds = selectedPlacementId === p.id ? creatives.length : 0;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedPlacementId(p.id)}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                            isSelected
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border bg-background hover:bg-muted/50 text-foreground'
                                        }`}
                                    >
                                        <PlacementPreview slug={p.slug} name={p.name}/>
                                        <div className="text-left">
                                            <div className="font-medium text-sm">{p.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {currentAds}/{p.max_ads}
                                                {!p.is_active && <span className="ml-1 text-red-500">({t('admin.disabled', '禁用')})</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 左右布局：广告位信息 + 广告列表 */}
            {selectedPlacement && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 左侧：广告位信息卡片 */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Layers className="w-5 h-5"/>{t('admin.placementInfo', '广告位信息')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">{t('admin.placementName', '名称')}</span><span className="font-medium">{selectedPlacement.name}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{selectedPlacement.slug}</code></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">{t('admin.placementType', '类型')}</span><Badge variant="outline">{typeLabels[selectedPlacement.type] || selectedPlacement.type}</Badge></div>
                                {(selectedPlacement.width > 0 || selectedPlacement.height > 0) && (
                                    <div className="flex justify-between"><span className="text-muted-foreground">{t('admin.placementSize', '建议尺寸')}</span><span className="font-medium">{selectedPlacement.width}×{selectedPlacement.height}</span></div>
                                )}
                                <div className="flex justify-between"><span className="text-muted-foreground">{t('admin.placementMaxAds', '最大广告数')}</span><span className="font-medium">{selectedPlacement.max_ads}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">{t('admin.currentAds', '当前广告数')}</span><span className="font-medium">{creatives.length}</span></div>
                                <div className="flex items-center justify-between pt-2 border-t border-border">
                                    <span className="text-muted-foreground">{t('admin.placementStatus', '状态')}</span>
                                    <div className="flex items-center gap-2">
                                        <Switch checked={selectedPlacement.is_active} onCheckedChange={() => handleTogglePlacement(selectedPlacement.id)}/>
                                        <span className={`text-sm ${selectedPlacement.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {selectedPlacement.is_active ? t('admin.enabled', '启用') : t('admin.disabled', '禁用')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardContent className="pt-0 flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditPlacementDialog(selectedPlacement)}>
                                <Edit className="w-4 h-4 mr-2"/>{t('admin.edit', '编辑')}
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDeletePlacementDialog(selectedPlacement)}>
                                <Trash2 className="w-4 h-4 mr-2"/>{t('admin.delete', '删除')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* 右侧：该广告位下的创意列表（D2：绑定 AdCreative） */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg"><Layers className="w-5 h-5"/>{t('admin.creativeList', '创意列表')}</CardTitle>
                                    <CardDescription>{t('admin.creativeListDesc', '该广告位下绑定的广告创意（可一次定义、多处复用）')}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setLibraryDialogOpen(true)}>
                                        <Layers className="w-4 h-4 mr-2"/>{t('admin.creativeLibrary', '创意库')}
                                    </Button>
                                    <Button size="sm" onClick={() => openAddDialog('create')}>
                                        <Plus className="w-4 h-4 mr-2"/>{t('admin.addCreative', '添加创意')}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {adsLoading ? (
                                <div className="py-8 text-center"><Spinner className="mx-auto"/></div>
                            ) : creatives.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    <ImageOff className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                                    <p>{t('admin.noCreativesBound', '该广告位尚未绑定创意')}</p>
                                    <div className="flex items-center justify-center gap-2 mt-3">
                                        <Button variant="outline" size="sm" onClick={() => openAddDialog('create')}>
                                            <Plus className="w-4 h-4 mr-2"/>{t('admin.createCreative', '新建创意')}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openAddDialog('library')}>
                                            <Layers className="w-4 h-4 mr-2"/>{t('admin.assignFromLibrary', '从创意库选择')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {creatives.map(c => (
                                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                                            <div className="w-20 h-12 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-muted to-muted/50">
                                {c.image_url ? (
                                    <img src={getFullUrl(c.image_url)} alt={c.title}
                                         className="w-full h-full object-cover"
                                         onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; const ph = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null; if (ph) ph.style.display = 'flex'; }}/>
                                ) : null}
                                <div className="w-full h-full items-center justify-center text-muted-foreground flex-col gap-0.5"
                                     style={{display: c.image_url ? 'none' : 'flex'}}>
                                    <ImageOff className="w-6 h-6"/>
                                </div>
                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium truncate">{c.title}</span>
                                                    {c.badge_text && <Badge variant="secondary" className="text-xs">{c.badge_text}</Badge>}
                                                    {!c.is_active && <Badge variant="soft-neutral" className="text-xs">{t('admin.inactive', '禁用')}</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                                                    <span>{t('admin.priority', '优先级')}: {c.priority}</span>
                                                    {c.link_url && <a href={c.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><Link2 className="w-3 h-3"/>{t('ad.viewDetail', '查看')}</a>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon-sm" onClick={() => openEditCreativeDialog(c)}>
                                                    <Edit className="w-4 h-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => openRemoveCreativeDialog(c)}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 广告位创建/编辑弹窗 */}
            <Dialog open={placementDialogOpen} onOpenChange={setPlacementDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            {placementDialogMode === 'create' ? <Plus className="w-5 h-5 text-primary"/> : <Edit className="w-5 h-5 text-primary"/>}
                            {placementDialogMode === 'create' ? t('admin.addAdPlacementTitle', '添加广告位') : t('admin.editAdPlacement', '编辑广告位')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.adPlacementDesc', '配置广告展示位置的尺寸、类型和数量限制')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.placementPage', '页面')}</Label>
                                <Select value={placementPage} onValueChange={handlePlacementPageChange}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {placementPages.map(p => (
                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.placementPosition', '位置')}</Label>
                                <Select value={placementPosition} onValueChange={handlePlacementPositionChange}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {placementPositions.map(p => (
                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="h-px bg-border -mx-2"/>
                        <div className="grid gap-2">
                            <Label>{t('admin.placementName', '名称')}*</Label>
                            <Input value={placementForm.name} onChange={e => { setPlacementForm({...placementForm, name: e.target.value}); setPlacementNameFromPreset(false); }} placeholder={t('admin.placementNamePlaceholder', '如：首页横幅')}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>Slug*</Label>
                            <Input value={placementForm.slug} onChange={e => { setPlacementForm({...placementForm, slug: e.target.value}); setPlacementSlugManuallyEdited(true); }} placeholder="home-banner"/>
                            <p className="text-xs text-muted-foreground">{t('admin.slugHint', '英文标识，用于前端匹配展示样式；输入名称时会自动根据名称生成，也可手动覆盖')}</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.placementType', '类型')}</Label>
                            <Select value={placementForm.type} onValueChange={v => setPlacementForm({...placementForm, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="banner">{t('admin.placementTypeBanner', '横幅')}</SelectItem>
                                    <SelectItem value="feed">{t('admin.placementTypeFeed', '信息流')}</SelectItem>
                                    <SelectItem value="sidebar">{t('admin.placementTypeSidebar', '侧边栏')}</SelectItem>
                                    <SelectItem value="card">{t('admin.placementTypeCard', '卡片')}</SelectItem>
                                    <SelectItem value="rectangle">{t('admin.placementTypeRectangle', '矩形')}</SelectItem>
                                    <SelectItem value="leaderboard">{t('admin.placementTypeLeaderboard', '排行榜')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.placementWidth', '宽度（px）')}</Label>
                                <Input type="number" value={placementForm.width || 0} onChange={e => setPlacementForm({...placementForm, width: Number(e.target.value)})}/>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.placementHeight', '高度（px）')}</Label>
                                <Input type="number" value={placementForm.height || 0} onChange={e => setPlacementForm({...placementForm, height: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('admin.sizeHint', '尺寸用于提示上传图片的建议大小，不会强制校验')}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.placementMaxAds', '最大广告数')}</Label>
                                <Input type="number" value={placementForm.max_ads || 1} onChange={e => setPlacementForm({...placementForm, max_ads: Number(e.target.value)})}/>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.placementSequence', '排序')}</Label>
                                <Input type="number" value={placementForm.sequence || 0} onChange={e => setPlacementForm({...placementForm, sequence: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.placementDescription', '描述')}</Label>
                            <Input value={placementForm.description || ''} onChange={e => setPlacementForm({...placementForm, description: e.target.value})} placeholder={t('admin.placementDescriptionPlaceholder', '广告位用途说明')}/>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={placementForm.is_active ?? true} onCheckedChange={v => setPlacementForm({...placementForm, is_active: v})}/>
                            <Label>{t('admin.enabled', '启用')}</Label>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setPlacementDialogOpen(false)}>{t('common.cancel', '取消')}</Button>
                        <Button onClick={handleSavePlacement} disabled={!placementForm.name || !placementForm.slug}>
                            {placementDialogMode === 'create' ? t('common.add', '添加') : t('common.save', '保存')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 广告创建/编辑弹窗 */}
            {/* 添加创意弹窗（D2：新建并关联 / 从创意库选择复用） */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary"/>
                            {t('admin.addCreative', '添加创意')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {selectedPlacement && (
                                <span>{t('admin.placement', '广告位')}: <strong>{selectedPlacement.name}</strong></span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <div className="flex items-center gap-2">
                            <Button variant={addMode === 'create' ? 'default' : 'outline'} size="sm" onClick={() => setAddMode('create')}>
                                {t('admin.createCreative', '新建创意')}
                            </Button>
                            <Button variant={addMode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => setAddMode('library')}>
                                {t('admin.assignFromLibrary', '从创意库选择')}
                            </Button>
                        </div>
                        {addMode === 'create' ? (
                            <CreativeFormFields form={creativeForm} setForm={setCreativeForm}/>
                        ) : (
                            <AssignCreativesInline
                                placementId={selectedPlacementId}
                                onDone={() => setAddDialogOpen(false)}
                            />
                        )}
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{t('common.cancel', '取消')}</Button>
                        {addMode === 'create' && (
                            <Button onClick={handleCreateAndAssign} disabled={!creativeForm.title || !creativeForm.image_url}>
                                {t('common.add', '添加')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 编辑创意弹窗 */}
            <Dialog open={creativeEditOpen} onOpenChange={setCreativeEditOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary"/>{t('admin.editCreative', '编辑创意')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0">
                        <CreativeFormFields form={creativeForm} setForm={setCreativeForm}/>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setCreativeEditOpen(false)}>{t('common.cancel', '取消')}</Button>
                        <Button onClick={handleUpdateCreative} disabled={!creativeForm.title}>
                            {t('common.save', '保存')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 轻量创意库查看/管理弹窗 */}
            <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
                <DialogContent className="max-w-3xl p-0 gap-0 grid grid-rows-[auto_1fr_auto] overflow-hidden max-h-[calc(100vh-4rem)]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary"/>{t('admin.creativeLibrary', '创意库')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.creativeLibraryDesc', '定义一次创意，即可复用到多个广告位（G6-3）')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 overflow-y-auto min-h-0">
                        <CreativeLibraryList/>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setLibraryDialogOpen(false)}>{t('common.close', '关闭')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 删除确认弹窗 */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
                    <AlertDialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500"/>
                            {t('admin.confirmDelete', '确认删除')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                            {deleteType === 'placement' && deletingPlacement ? (
                                cascadeCount > 0 ? (
                                    <span>{t('admin.deletePlacementCascadeWarning', {
                                        name: deletingPlacement.name,
                                        count: cascadeCount,
                                        defaultValue: `广告位"${deletingPlacement.name}"下绑定了 ${cascadeCount} 条创意。删除广告位后，这些创意的绑定将一并解除。此操作不可撤销，是否继续？`
                                    })}</span>
                                ) : (
                                    <span>{t('admin.deleteAdPlacementConfirm', {
                                        name: deletingPlacement.name,
                                        defaultValue: `确定要删除广告位"${deletingPlacement.name}"吗？此操作不可撤销。`
                                    })}</span>
                                )
                            ) : deletingCreative ? (
                                <span>{t('admin.deleteCreativeFromPlacementConfirm', {
                                    defaultValue: `确定将创意"${deletingCreative.title}"从该广告位移除吗？此操作仅解除绑定，不影响创意库中的创意。`
                                })}</span>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <AlertDialogCancel className="rounded-lg h-10 px-5 border-border/60 mt-0">{t('common.cancel', '取消')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium">
                            {t('admin.confirmDelete', '确认删除')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

// ═════════════════════════════════════════════════════════════
// D2 复用组件：创意表单 / 从创意库选择（分配） / 轻量创意库（G6-3）
// ═════════════════════════════════════════════════════════════

const CreativeFormFields: React.FC<{
    form: CreateAdCreativeRequest;
    setForm: React.Dispatch<React.SetStateAction<CreateAdCreativeRequest>>;
}> = ({form, setForm}) => {
    const {t} = useTranslation();
    return (
        <>
            <div className="grid gap-2">
                <Label>{t('admin.creativeTitle', '创意标题')}*</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder={t('admin.adTitlePlaceholder', '如：夏季促销')}/>
            </div>
            <div className="grid gap-2">
                <Label>{t('admin.creativeImage', '图片 URL')}</Label>
                <Input value={form.image_url || ''} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..."/>
            </div>
            <div className="grid gap-2">
                <Label>{t('admin.creativeMobileImage', '移动端图片 URL')}</Label>
                <Input value={form.image_mobile_url || ''} onChange={e => setForm({...form, image_mobile_url: e.target.value})} placeholder="https://..."/>
            </div>
            <div className="grid gap-2">
                <Label>{t('admin.creativeLink', '跳转链接')}</Label>
                <Input value={form.link_url || ''} onChange={e => setForm({...form, link_url: e.target.value})} placeholder="https://..."/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>{t('admin.creativeBadge', '角标文案')}</Label>
                    <Input value={form.badge_text || ''} onChange={e => setForm({...form, badge_text: e.target.value})} placeholder="HOT"/>
                </div>
                <div className="grid gap-2">
                    <Label>{t('admin.priority', '优先级')}</Label>
                    <Input type="number" value={form.priority} onChange={e => setForm({...form, priority: Number(e.target.value)})}/>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Switch checked={!!form.is_active} onCheckedChange={v => setForm({...form, is_active: v})}/>
                <Label>{t('admin.isActive', '启用')}</Label>
            </div>
        </>
    );
};

const AssignCreativesInline: React.FC<{
    placementId?: string;
    onDone?: () => void;
}> = ({placementId, onDone}) => {
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const [creatives, setCreatives] = useState<AdCreative[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (!placementId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [all, assigned] = await Promise.all([
                    adminCreativesApi.list(),
                    adminPlacementCreativesApi.list(placementId),
                ]);
                if (cancelled) return;
                setCreatives(all);
                setSelected(new Set(assigned));
            } catch (err) {
                console.error('Failed to load creatives:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [placementId]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        if (!placementId) return;
        setSaving(true);
        try {
            const assigned = await adminPlacementCreativesApi.list(placementId);
            const toAdd = [...selected].filter(id => !assigned.includes(id));
            const toRemove = assigned.filter(id => !selected.has(id));
            await Promise.all([
                ...toAdd.map(id => adminPlacementCreativesApi.assign(placementId, id)),
                ...toRemove.map(id => adminPlacementCreativesApi.unassign(placementId, id)),
            ]);
            queryClient.invalidateQueries({queryKey: ['admin', 'placementCreatives', placementId]});
            queryClient.invalidateQueries({queryKey: ['admin', 'creatives']});
            onDone?.();
        } catch (err) {
            console.error('Failed to assign creatives:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="py-12 flex justify-center"><Spinner className="h-7 w-7"/></div>;
    }
    if (creatives.length === 0) {
        return <p className="text-sm text-muted-foreground py-8 text-center">{t('admin.noCreatives', '创意库还是空的，请先新建创意')}</p>;
    }
    return (
        <div className="space-y-2">
            {creatives.map(c => (
                <label key={c.id}
                       className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)}
                           className="h-4 w-4 accent-primary"/>
                    <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-muted to-muted/50 border border-border/40">
                        {c.image_url ? (
                            <img src={getFullUrl(c.image_url)} alt={c.title}
                                 className="w-full h-full object-cover"
                                 onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; const ph = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null; if (ph) ph.style.display = 'flex'; }}/>
                        ) : null}
                        <div className="w-full h-full items-center justify-center text-muted-foreground"
                             style={{display: c.image_url ? 'none' : 'flex'}}>
                            <ImageOff className="w-5 h-5"/>
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                        {c.badge_text && <span className="text-xs text-muted-foreground">{c.badge_text}</span>}
                    </div>
                    {!c.is_active && <Badge variant="soft-neutral">{t('admin.inactive', '禁用')}</Badge>}
                </label>
            ))}
            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? t('common.saving', '保存中…') : t('common.save', '保存')}
                </Button>
            </div>
        </div>
    );
};

const CreativeLibraryList: React.FC = () => {
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const [creatives, setCreatives] = useState<AdCreative[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<AdCreative | null>(null);
    const [deleting, setDeleting] = useState<AdCreative | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [form, setForm] = useState<CreateAdCreativeRequest>({
        title: '', image_url: '', image_mobile_url: '', link_url: '', link_target: '_blank',
        badge_text: '', priority: 0, is_active: true,
    });

    const load = async () => {
        setLoading(true);
        try {
            setCreatives(await adminCreativesApi.list());
        } catch (err) {
            console.error('Failed to load creatives:', err);
        } finally {
            setLoading(false);
        }
    };
    React.useEffect(() => { load(); }, []);

    const openEdit = (c: AdCreative) => {
        setEditing(c);
        setForm({
            title: c.title, image_url: c.image_url || '', image_mobile_url: c.image_mobile_url || '',
            link_url: c.link_url || '', link_target: c.link_target || '_blank', badge_text: c.badge_text || '',
            priority: c.priority, is_active: c.is_active,
        });
        setEditOpen(true);
    };
    const resetForm = () => setForm({
        title: '', image_url: '', image_mobile_url: '', link_url: '', link_target: '_blank',
        badge_text: '', priority: 0, is_active: true,
    });
    const handleCreate = async () => {
        try {
            await adminCreativesApi.create(form);
            setCreateOpen(false);
            resetForm();
            await load();
            queryClient.invalidateQueries({queryKey: ['admin', 'creatives']});
        } catch (err) {
            console.error('Failed to create creative:', err);
        }
    };
    const handleUpdate = async () => {
        if (!editing) return;
        try {
            await adminCreativesApi.update(editing.id, form);
            setEditOpen(false);
            await load();
            queryClient.invalidateQueries({queryKey: ['admin', 'creatives']});
        } catch (err) {
            console.error('Failed to update creative:', err);
        }
    };
    const handleDelete = async () => {
        if (!deleting) return;
        try {
            await adminCreativesApi.remove(deleting.id);
            setDeleteOpen(false);
            await load();
            queryClient.invalidateQueries({queryKey: ['admin', 'creatives']});
        } catch (err) {
            console.error('Failed to delete creative:', err);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2"/>{t('admin.createCreative', '新建创意')}
                </Button>
            </div>
            {loading ? (
                <div className="py-12 flex justify-center"><Spinner className="h-7 w-7"/></div>
            ) : creatives.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t('admin.noCreatives', '创意库还是空的')}</p>
            ) : (
                <div className="space-y-2">
                    {creatives.map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30">
                            <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-muted to-muted/50">
                                {c.image_url ? (
                                    <img src={getFullUrl(c.image_url)} alt={c.title}
                                         className="w-full h-full object-cover"
                                         onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; const ph = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null; if (ph) ph.style.display = 'flex'; }}/>
                                ) : null}
                                <div className="w-full h-full items-center justify-center text-muted-foreground flex-col"
                                     style={{display: c.image_url ? 'none' : 'flex'}}>
                                    <ImageOff className="w-5 h-5"/>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{c.title}</span>
                                    {c.badge_text && <Badge variant="secondary" className="text-xs">{c.badge_text}</Badge>}
                                    {!c.is_active && <Badge variant="soft-neutral" className="text-xs">{t('admin.inactive', '禁用')}</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    <span>{t('admin.priority', '优先级')}: {c.priority}</span>
                                    {c.link_url && <a href={c.link_url} target="_blank" rel="noopener noreferrer" className="ml-3 text-primary hover:underline inline-flex items-center gap-1"><Link2 className="w-3 h-3"/>{t('ad.viewDetail', '查看')}</a>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}><Edit className="w-4 h-4"/></Button>
                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { setDeleting(c); setDeleteOpen(true); }}><Trash2 className="w-4 h-4"/></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 新建创意 */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2"><Plus className="w-5 h-5 text-primary"/>{t('admin.createCreative', '新建创意')}</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 grid gap-4">
                        <CreativeFormFields form={form} setForm={setForm}/>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel', '取消')}</Button>
                        <Button onClick={handleCreate} disabled={!form.title || !form.image_url}>{t('common.create', '创建')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 编辑创意 */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2"><Edit className="w-5 h-5 text-primary"/>{t('admin.editCreative', '编辑创意')}</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 grid gap-4">
                        <CreativeFormFields form={form} setForm={setForm}/>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>{t('common.cancel', '取消')}</Button>
                        <Button onClick={handleUpdate} disabled={!form.title}>{t('common.save', '保存')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 删除创意 */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
                    <AlertDialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500"/>{t('admin.deleteCreative', '删除创意')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteCreativeConfirm', {defaultValue: `确定删除创意"${deleting?.title}"？已分配到广告位的引用会一并解除。`})}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <AlertDialogCancel className="rounded-lg h-10 px-5 border-border/60 mt-0">{t('common.cancel', '取消')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium">
                            {t('admin.confirmDelete', '确认删除')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
