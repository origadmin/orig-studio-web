import React, {useState} from 'react';
import {
    Layout, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
    GripVertical, ArrowUp, ArrowDown, Megaphone, BarChart3,
} from 'lucide-react';
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
    useAdminNavItems, useAdminBanners,
    useCreateNavItem, useUpdateNavItem, useDeleteNavItem,
    useCreateBanner, useUpdateBanner, useToggleBanner,
} from '@/hooks/queries';
import {type NavItem, type Banner, type CreateNavItemRequest, type CreateBannerRequest, type AdPlacement, type Ad, type CreateAdPlacementRequest, type CreateAdRequest, adminPortalApi} from '@/lib/api/portal';
import {useQueryClient} from '@tanstack/react-query';

export default function PortalConfigPage() {
    return (
        <div className="space-y-4 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Layout className="h-6 w-6"/>门户配置
                </h1>
                <p className="text-muted-foreground text-sm mt-1">管理导航栏、Banner、广告位和首页展示内容</p>
            </div>

            <Tabs defaultValue="navigation">
                <TabsList>
                    <TabsTrigger value="navigation">导航管理</TabsTrigger>
                    <TabsTrigger value="banners">Banner管理</TabsTrigger>
                    <TabsTrigger value="ad-placements">广告位</TabsTrigger>
                    <TabsTrigger value="ads">广告管理</TabsTrigger>
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
            await adminPortalApi_reorder(newItems.map(i => i.id));
        } catch (err) {
            console.error('Failed to reorder:', err);
        }
    };

    const adminPortalApi_reorder = async (ids: string[]) => {
        const {adminPortalApi} = await import('@/lib/api/portal');
        await adminPortalApi.reorderNavItems({ids});
        queryClient.invalidateQueries({queryKey: ['adminNavItems']});
        queryClient.invalidateQueries({queryKey: ['portalConfig']});
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>导航项</CardTitle>
                            <CardDescription>管理顶部导航栏的链接项</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2"/>添加导航项
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
                                    <TableHead className="w-[40px]">排序</TableHead>
                                    <TableHead>标签</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead>链接</TableHead>
                                    <TableHead>新标签页</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
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
                                        <TableCell>{item.open_new_tab ? <Badge variant="secondary">是</Badge> : <span className="text-xs text-muted-foreground">否</span>}</TableCell>
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
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">暂无导航项</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader><DialogTitle>添加导航项</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>标签</Label><Input value={createForm.label} onChange={e => setCreateForm({...createForm, label: e.target.value})} placeholder="导航标签"/></div>
                        <div className="grid gap-2"><Label>类型</Label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v as any})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="internal_link">内部链接</SelectItem>
                                    <SelectItem value="external_link">外部链接</SelectItem>
                                    <SelectItem value="category">分类入口</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>URL</Label><Input value={createForm.url} onChange={e => setCreateForm({...createForm, url: e.target.value})} placeholder="/featured 或 https://..."/></div>
                        <div className="grid gap-2"><Label>排序</Label><Input type="number" value={createForm.sequence} onChange={e => setCreateForm({...createForm, sequence: Number(e.target.value)})}/></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={!createForm.label || !createForm.url}>添加</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader><DialogTitle>编辑导航项</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>标签</Label><Input value={editForm.label} onChange={e => setEditForm({...editForm, label: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>类型</Label>
                            <Select value={editForm.type} onValueChange={v => setEditForm({...editForm, type: v as any})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="internal_link">内部链接</SelectItem>
                                    <SelectItem value="external_link">外部链接</SelectItem>
                                    <SelectItem value="category">分类入口</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>URL</Label><Input value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})}/></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
                        <Button onClick={handleUpdate}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>确认删除？</AlertDialogTitle><AlertDialogDescription>将删除导航项 "{editingItem?.label}"</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">确认删除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const BannersTab: React.FC = () => {
    const {data: bannerData, isLoading} = useAdminBanners();
    const createMutation = useCreateBanner();
    const updateMutation = useUpdateBanner();
    const toggleMutation = useToggleBanner();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [createForm, setCreateForm] = useState<CreateBannerRequest>({title: ''});
    const [editForm, setEditForm] = useState({title: '', subtitle: '', primary_btn_text: '', primary_btn_url: ''});

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

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Banner管理</CardTitle>
                            <CardDescription>管理首页Banner轮播图</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2"/>添加Banner
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
                                                    {banner.is_active ? '启用' : '禁用'}
                                                </Badge>
                                                {banner.badge_text && <Badge variant="outline" className="ml-2">{banner.badge_text}</Badge>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon-sm"
                                                    onClick={() => handleToggle(banner.id)}>
                                                    {banner.is_active ? <ToggleRight className="w-4 h-4 text-success"/> : <ToggleLeft className="w-4 h-4 text-muted-foreground"/>}
                                                </Button>
                                                <Button variant="ghost" size="icon-sm"
                                                    onClick={() => { setEditingBanner(banner); setEditForm({title: banner.title, subtitle: banner.subtitle || '', primary_btn_text: banner.primary_btn_text || '', primary_btn_url: banner.primary_btn_url || ''}); setEditDialogOpen(true); }}>
                                                    <Edit className="w-4 h-4"/>
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
                        <div className="py-12 text-center text-muted-foreground">暂无Banner</div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>创建Banner</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>标题</Label><Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="Banner标题"/></div>
                        <div className="grid gap-2"><Label>副标题</Label><Input value={createForm.subtitle || ''} onChange={e => setCreateForm({...createForm, subtitle: e.target.value})} placeholder="副标题(可选)"/></div>
                        <div className="grid gap-2"><Label>徽章文字</Label><Input value={createForm.badge_text || ''} onChange={e => setCreateForm({...createForm, badge_text: e.target.value})} placeholder="如: HOT, NEW"/></div>
                        <div className="grid gap-2"><Label>图片URL</Label><Input value={createForm.image_url || ''} onChange={e => setCreateForm({...createForm, image_url: e.target.value})} placeholder="/uploads/banners/xxx.jpg"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>主按钮文字</Label><Input value={createForm.primary_btn_text || ''} onChange={e => setCreateForm({...createForm, primary_btn_text: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>主按钮链接</Label><Input value={createForm.primary_btn_url || ''} onChange={e => setCreateForm({...createForm, primary_btn_url: e.target.value})}/></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={!createForm.title}>创建</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>编辑Banner</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>标题</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>副标题</Label><Input value={editForm.subtitle} onChange={e => setEditForm({...editForm, subtitle: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>主按钮文字</Label><Input value={editForm.primary_btn_text} onChange={e => setEditForm({...editForm, primary_btn_text: e.target.value})}/></div>
                            <div className="grid gap-2"><Label>主按钮链接</Label><Input value={editForm.primary_btn_url} onChange={e => setEditForm({...editForm, primary_btn_url: e.target.value})}/></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
                        <Button onClick={handleUpdate}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

const AdPlacementsTab: React.FC = () => {
    const queryClient = useQueryClient();
    const [placements, setPlacements] = useState<AdPlacement[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateAdPlacementRequest>({
        name: '', slug: '', type: 'banner',
    });

    React.useEffect(() => {
        adminPortalApi.listAdPlacements().then(d => { setPlacements(d as any || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleCreate = async () => {
        try {
            await adminPortalApi.createAdPlacement(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', slug: '', type: 'banner'});
            const d = await adminPortalApi.listAdPlacements();
            setPlacements(d as any || []);
        } catch (err) { console.error('Failed to create ad placement:', err); }
    };

    const handleToggle = async (id: string) => {
        try {
            await adminPortalApi.toggleAdPlacement(id);
            const d = await adminPortalApi.listAdPlacements();
            setPlacements(d as any || []);
        } catch (err) { console.error('Failed to toggle:', err); }
    };

    const handleDelete = async (id: string) => {
        try {
            await adminPortalApi.deleteAdPlacement(id);
            const d = await adminPortalApi.listAdPlacements();
            setPlacements(d as any || []);
        } catch (err) { console.error('Failed to delete:', err); }
    };

    const typeLabels: Record<string, string> = {banner: '轮播', card: '卡片', rectangle: '矩形', leaderboard: '横幅'};

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5"/>广告位管理</CardTitle>
                            <CardDescription>配置门户各位置的展示广告位</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}><Plus className="w-4 h-4 mr-2"/>添加广告位</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>名称</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead>尺寸</TableHead>
                                    <TableHead>最大广告数</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
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
                                        <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? '启用' : '禁用'}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => handleToggle(p.id)}>
                                                    {p.is_active ? <ToggleRight className="w-4 h-4 text-success"/> : <ToggleLeft className="w-4 h-4 text-muted-foreground"/>}
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDelete(p.id)}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">暂无广告位</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>添加广告位</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>名称</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="如：首页Banner"/></div>
                        <div className="grid gap-2"><Label>Slug</Label><Input value={createForm.slug} onChange={e => setCreateForm({...createForm, slug: e.target.value})} placeholder="如：home-banner"/></div>
                        <div className="grid gap-2"><Label>类型</Label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="banner">轮播 (Banner)</SelectItem>
                                    <SelectItem value="card">卡片 (Card)</SelectItem>
                                    <SelectItem value="rectangle">矩形 (Rectangle)</SelectItem>
                                    <SelectItem value="leaderboard">横幅 (Leaderboard)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>宽度(px)</Label><Input type="number" value={createForm.width || 0} onChange={e => setCreateForm({...createForm, width: Number(e.target.value)})}/></div>
                            <div className="grid gap-2"><Label>高度(px)</Label><Input type="number" value={createForm.height || 0} onChange={e => setCreateForm({...createForm, height: Number(e.target.value)})}/></div>
                        </div>
                        <div className="grid gap-2"><Label>最大广告数</Label><Input type="number" value={createForm.max_ads || 1} onChange={e => setCreateForm({...createForm, max_ads: Number(e.target.value)})}/></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={!createForm.name || !createForm.slug}>创建</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

const AdsTab: React.FC = () => {
    const [placements, setPlacements] = useState<AdPlacement[]>([]);
    const [selectedPlacement, setSelectedPlacement] = useState<string>('');
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateAdRequest>({placement_id: '', title: ''});

    React.useEffect(() => {
        adminPortalApi.listAdPlacements().then(d => {
            const list = (d as any || []) as AdPlacement[];
            setPlacements(list);
            if (list.length > 0 && !selectedPlacement) setSelectedPlacement(list[0].id);
        });
    }, []);

    React.useEffect(() => {
        if (!selectedPlacement) return;
        setLoading(true);
        adminPortalApi.listAds(selectedPlacement).then(d => {
            const data = d as any;
            setAds(data?.items || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [selectedPlacement]);

    const handleCreate = async () => {
        try {
            await adminPortalApi.createAd({...createForm, placement_id: selectedPlacement});
            setCreateDialogOpen(false);
            setCreateForm({placement_id: '', title: ''});
            const d = await adminPortalApi.listAds(selectedPlacement);
            setAds((d as any)?.items || []);
        } catch (err) { console.error('Failed to create ad:', err); }
    };

    const handleToggle = async (id: string) => {
        try {
            await adminPortalApi.toggleAd(id);
            const d = await adminPortalApi.listAds(selectedPlacement);
            setAds((d as any)?.items || []);
        } catch (err) { console.error('Failed to toggle:', err); }
    };

    const handleDelete = async (id: string) => {
        try {
            await adminPortalApi.deleteAd(id);
            const d = await adminPortalApi.listAds(selectedPlacement);
            setAds((d as any)?.items || []);
        } catch (err) { console.error('Failed to delete:', err); }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5"/>广告管理</CardTitle>
                            <CardDescription>管理各广告位下的广告内容</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
                                <SelectTrigger className="w-[200px]"><SelectValue placeholder="选择广告位"/></SelectTrigger>
                                <SelectContent>
                                    {placements.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => setCreateDialogOpen(true)} disabled={!selectedPlacement}><Plus className="w-4 h-4 mr-2"/>添加广告</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>标题</TableHead>
                                    <TableHead>图片</TableHead>
                                    <TableHead>链接</TableHead>
                                    <TableHead>优先级</TableHead>
                                    <TableHead>展示/点击</TableHead>
                                    <TableHead>CTR</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
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
                                        <TableCell><Badge variant={ad.is_active ? 'default' : 'secondary'}>{ad.is_active ? '启用' : '禁用'}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => handleToggle(ad.id)}>
                                                    {ad.is_active ? <ToggleRight className="w-4 h-4 text-success"/> : <ToggleLeft className="w-4 h-4 text-muted-foreground"/>}
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDelete(ad.id)}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">{selectedPlacement ? '暂无广告' : '请先选择广告位'}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>添加广告</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>标题</Label><Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="广告标题"/></div>
                        <div className="grid gap-2"><Label>图片URL</Label><Input value={createForm.image_url || ''} onChange={e => setCreateForm({...createForm, image_url: e.target.value})} placeholder="/uploads/ads/xxx.jpg"/></div>
                        <div className="grid gap-2"><Label>移动端图片URL</Label><Input value={createForm.image_mobile_url || ''} onChange={e => setCreateForm({...createForm, image_mobile_url: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>链接URL</Label><Input value={createForm.link_url || ''} onChange={e => setCreateForm({...createForm, link_url: e.target.value})} placeholder="https://..."/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>徽章文字</Label><Input value={createForm.badge_text || ''} onChange={e => setCreateForm({...createForm, badge_text: e.target.value})} placeholder="推广/NEW"/></div>
                            <div className="grid gap-2"><Label>优先级</Label><Input type="number" value={createForm.priority || 0} onChange={e => setCreateForm({...createForm, priority: Number(e.target.value)})}/></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={!createForm.title}>创建</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
