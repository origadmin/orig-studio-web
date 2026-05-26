import React, {useState} from 'react';
import {
    Layout, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
    GripVertical, ArrowUp, ArrowDown, Megaphone, BarChart3,
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
import {ImageUploadField} from '@/components/upload/ImageUploadField';
import {
    useAdminNavItems, useAdminBanners,
    useCreateNavItem, useUpdateNavItem, useDeleteNavItem,
    useCreateBanner, useUpdateBanner, useToggleBanner, useDeleteBanner,
    useAdminAdPlacements, useCreateAdPlacement, useToggleAdPlacement, useDeleteAdPlacement,
    useAdminAds, useCreateAd, useToggleAd, useDeleteAd,
} from '@/hooks/queries';
import {type NavItem, type Banner, type CreateNavItemRequest, type CreateBannerRequest, type AdPlacement, type Ad, type CreateAdPlacementRequest, type CreateAdRequest, adminPortalApi} from '@/lib/api/portal';
import {useQueryClient} from '@tanstack/react-query';

export default function PortalConfigPage() {
    const {t} = useTranslation();
    return (
        <div className="space-y-4 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Layout className="h-6 w-6"/>{t('admin.portalConfig')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{t('admin.portalConfigDesc')}</p>
            </div>

            <Tabs defaultValue="navigation">
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
                                        <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{item.url}</TableCell>
                                        <TableCell>{item.open_new_tab ? <Badge variant="secondary">{t('admin.enabled')}</Badge> : <span className="text-xs text-muted-foreground">{t('admin.disabled')}</span>}</TableCell>
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
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader><DialogTitle>{t('admin.addNavItemTitle')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.label || !createForm.url}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader><DialogTitle>{t('admin.editNavItem')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleUpdate}>{t('common.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.deleteNavItemConfirm', {label: editingItem?.label})}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('admin.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const BannersTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: bannerData, isLoading} = useAdminBanners();
    const createMutation = useCreateBanner();
    const updateMutation = useUpdateBanner();
    const toggleMutation = useToggleBanner();
    const deleteMutation = useDeleteBanner();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [createForm, setCreateForm] = useState<CreateBannerRequest>({title: ''});
    const [editForm, setEditForm] = useState({
        title: '', subtitle: '', badge_text: '', image_url: '',
        primary_btn_text: '', primary_btn_url: '',
        secondary_btn_text: '', secondary_btn_url: '',
    });

    const banners = bannerData?.items || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({title: ''});
        } catch (err) {
            console.error('Failed to create banner:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingBanner) return;
        try {
            await updateMutation.mutateAsync({id: editingBanner.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update banner:', err);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to toggle banner:', err);
        }
    };

    const handleDelete = async () => {
        if (!editingBanner) return;
        try {
            await deleteMutation.mutateAsync(editingBanner.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete banner:', err);
        }
    };

    const openEditDialog = (banner: Banner) => {
        setEditingBanner(banner);
        setEditForm({
            title: banner.title,
            subtitle: banner.subtitle || '',
            badge_text: banner.badge_text || '',
            image_url: banner.image_url || '',
            primary_btn_text: banner.primary_btn_text || '',
            primary_btn_url: banner.primary_btn_url || '',
            secondary_btn_text: banner.secondary_btn_text || '',
            secondary_btn_url: banner.secondary_btn_url || '',
        });
        setEditDialogOpen(true);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('admin.bannerManagement')}</CardTitle>
                            <CardDescription>{t('admin.bannerManagementDesc')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2"/>{t('admin.addBanner')}
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
                                    <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
                                        {banner.image_url && <img src={banner.image_url} alt="" className="w-full h-full object-cover"/>}
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <div className="text-center text-white">
                                                <h3 className="font-bold text-lg">{banner.title}</h3>
                                                {banner.subtitle && <p className="text-sm opacity-80">{banner.subtitle}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Badge variant={banner.is_active ? 'default' : 'secondary'}>
                                                    {banner.is_active ? t('admin.bannerActive') : t('admin.bannerInactive')}
                                                </Badge>
                                                {banner.badge_text && <Badge variant="outline" className="ml-2">{banner.badge_text}</Badge>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon-sm"
                                                    onClick={() => handleToggle(banner.id)}>
                                                    {banner.is_active ? <ToggleRight className="w-4 h-4 text-success"/> : <ToggleLeft className="w-4 h-4 text-muted-foreground"/>}
                                                </Button>
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
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                CTA: {banner.primary_btn_text} → {banner.primary_btn_url}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-muted-foreground">{t('admin.noBanners')}</div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{t('admin.createBanner')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>{t('admin.bannerTitle')}</Label><Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder={t('admin.bannerTitle')}/></div>
                        <div className="grid gap-2"><Label>{t('admin.bannerSubtitle')}</Label><Input value={createForm.subtitle || ''} onChange={e => setCreateForm({...createForm, subtitle: e.target.value})} placeholder={t('admin.bannerSubtitle')}/></div>
                        <div className="grid gap-2"><Label>{t('admin.bannerBadgeText')}</Label><Input value={createForm.badge_text || ''} onChange={e => setCreateForm({...createForm, badge_text: e.target.value})} placeholder="HOT, NEW"/></div>
                        <ImageUploadField
                            value={createForm.image_url || ''}
                            onChange={url => setCreateForm({...createForm, image_url: url})}
                            label={t('admin.bannerImageUrl')}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.bannerPrimaryBtnText')}</Label><Input value={createForm.primary_btn_text || ''} onChange={e => setCreateForm({...createForm, primary_btn_text: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.bannerPrimaryBtnUrl')}</Label><Input value={createForm.primary_btn_url || ''} onChange={e => setCreateForm({...createForm, primary_btn_url: e.target.value})}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.bannerSecondaryBtnText')}</Label><Input value={createForm.secondary_btn_text || ''} onChange={e => setCreateForm({...createForm, secondary_btn_text: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.bannerSecondaryBtnUrl')}</Label><Input value={createForm.secondary_btn_url || ''} onChange={e => setCreateForm({...createForm, secondary_btn_url: e.target.value})}/></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.title}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{t('admin.editBanner')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>{t('admin.bannerTitle')}</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.bannerSubtitle')}</Label><Input value={editForm.subtitle} onChange={e => setEditForm({...editForm, subtitle: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.bannerBadgeText')}</Label><Input value={editForm.badge_text} onChange={e => setEditForm({...editForm, badge_text: e.target.value})}/></div>
                        <ImageUploadField
                            value={editForm.image_url}
                            onChange={url => setEditForm({...editForm, image_url: url})}
                            label={t('admin.bannerImageUrl')}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.bannerPrimaryBtnText')}</Label><Input value={editForm.primary_btn_text} onChange={e => setEditForm({...editForm, primary_btn_text: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.bannerPrimaryBtnUrl')}</Label><Input value={editForm.primary_btn_url} onChange={e => setEditForm({...editForm, primary_btn_url: e.target.value})}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t('admin.bannerSecondaryBtnText')}</Label><Input value={editForm.secondary_btn_text} onChange={e => setEditForm({...editForm, secondary_btn_text: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>{t('admin.bannerSecondaryBtnUrl')}</Label><Input value={editForm.secondary_btn_url} onChange={e => setEditForm({...editForm, secondary_btn_url: e.target.value})}/></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleUpdate}>{t('common.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.deleteBannerConfirm', {title: editingBanner?.title})}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('admin.delete')}</AlertDialogAction>
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
    const toggleMutation = useToggleAdPlacement();
    const deleteMutation = useDeleteAdPlacement();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<AdPlacement | null>(null);
    const [createForm, setCreateForm] = useState<CreateAdPlacementRequest>({
        name: '', slug: '', type: 'banner',
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
                                        <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? t('admin.enabled') : t('admin.disabled')}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => handleToggle(p.id)}>
                                                    {p.is_active ? <ToggleRight className="w-4 h-4 text-success"/> : <ToggleLeft className="w-4 h-4 text-muted-foreground"/>}
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
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>{t('admin.addAdPlacementTitle')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.name || !createForm.slug}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.deleteAdPlacementConfirm', {name: deletingItem?.name})}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('admin.delete')}</AlertDialogAction>
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
    const toggleMutation = useToggleAd();
    const deleteMutation = useDeleteAd();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingAd, setDeletingAd] = useState<Ad | null>(null);
    const [createForm, setCreateForm] = useState<CreateAdRequest>({placement_id: '', title: ''});

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
                                    {placements.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                                        <TableCell><Badge variant={ad.is_active ? 'default' : 'secondary'}>{ad.is_active ? t('admin.enabled') : t('admin.disabled')}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => handleToggle(ad.id)}>
                                                    {ad.is_active ? <ToggleRight className="w-4 h-4 text-success"/> : <ToggleLeft className="w-4 h-4 text-muted-foreground"/>}
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
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{t('admin.addAdTitle')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.title}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.deleteAdConfirm')}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('admin.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
