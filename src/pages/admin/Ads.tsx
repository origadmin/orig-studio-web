import React, {useState} from 'react';
import {
    Megaphone,
    Plus,
    Edit,
    Trash2,
    LayoutGrid,
    RectangleHorizontal,
    Square,
    List,
    PanelRight,
    Minus,
    Filter,
    MoreHorizontal,
    Search,
    Eye,
    Play,
    Gauge,
    ToggleLeft,
    ToggleRight,
    Layers,
    Link2,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent} from '@/components/ui/card';
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {
    useAdminAdPlacements, useCreateAdPlacement, useUpdateAdPlacement, useDeleteAdPlacement, useToggleAdPlacement,
} from '@/hooks/queries';
import {adminCreativesApi, adminPlacementCreativesApi} from '@/lib/api/ads';
import {
    type AdPlacement, type CreateAdPlacementRequest, type UpdateAdPlacementRequest,
    type AdCreative, type CreateAdCreativeRequest, type UpdateAdCreativeRequest,
} from '@/lib/api/portal';

const placementBadgeVariant = (p: AdPlacement): 'soft-success' | 'soft-neutral' => {
    if (!p.is_active) return 'soft-neutral';
    return 'soft-success';
};

const placementTypeIcon = (type: string): React.ComponentType<{className?: string; size?: number}> => {
    switch (type) {
        case 'banner': return RectangleHorizontal;
        case 'sidebar': return PanelRight;
        case 'inline': return Minus;
        case 'card': return Square;
        case 'feed': return List;
        default: return LayoutGrid;
    }
};

const PAGE_SIZE = 20;

export default function AdsPage() {
    const {t} = useTranslation();
    const [tab, setTab] = useState<'slots' | 'creatives'>('slots');
    return (
        <>
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.ads', '广告位')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-1 mb-6 border-b border-border">
                <button
                    onClick={() => setTab('slots')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'slots' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <span className="inline-flex items-center gap-2"><LayoutGrid className="h-4 w-4"/>{t('admin.adSlots', 'Ad Slots')}</span>
                </button>
                <button
                    onClick={() => setTab('creatives')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'creatives' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <span className="inline-flex items-center gap-2"><Layers className="h-4 w-4"/>{t('admin.creativeLibrary', '创意库')}</span>
                </button>
            </div>

            {tab === 'slots' ? <SlotsTab/> : <CreativesTab/>}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
// Slots Tab (Ad Placements)
// ═══════════════════════════════════════════════════════════════

const SlotsTab: React.FC = () => {
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
    const [deletingPlacement, setDeletingPlacement] = useState<AdPlacement | null>(null);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assigningPlacement, setAssigningPlacement] = useState<AdPlacement | null>(null);
    const [createForm, setCreateForm] = useState<CreateAdPlacementRequest>({
        name: '',
        slug: '',
        type: 'banner',
        description: '',
    });
    const [editForm, setEditForm] = useState<UpdateAdPlacementRequest>({
        name: '',
        slug: '',
        type: 'banner',
        description: '',
        is_active: true,
    });

    const placements = placementsData || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', slug: '', type: 'banner', description: ''});
        } catch (err) {
            console.error('Failed to create placement:', err);
        }
    };

    const openEditDialog = (placement: AdPlacement) => {
        setEditingPlacement(placement);
        setEditForm({
            name: placement.name,
            slug: placement.slug,
            type: placement.type,
            description: placement.description,
            is_active: placement.is_active,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingPlacement) return;
        try {
            await updateMutation.mutateAsync({id: editingPlacement.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update placement:', err);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to toggle placement:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingPlacement) return;
        try {
            await deleteMutation.mutateAsync(deletingPlacement.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete placement:', err);
        }
    };

    const openAssignDialog = (placement: AdPlacement) => {
        setAssigningPlacement(placement);
        setAssignDialogOpen(true);
    };

    return (
        <>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6 pt-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <LayoutGrid className="h-6 w-6 text-primary"/>
                        {t('admin.adSlots', 'Ad Slots')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.adSlotsDesc', 'Manage ad placements on your portal')}
                    </p>
                </div>
                <Button
                    onClick={() => setCreateDialogOpen(true)}
                >
                    <Plus className="h-4 w-4"/>
                    {t('admin.createSlot', 'Create Slot')}
                </Button>
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <Spinner className="h-8 w-8"/>
                </div>
            ) : (
                <Card className="overflow-hidden p-0">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="px-6 py-3">Slot</TableHead>
                                    <TableHead className="px-6 py-3">Slug</TableHead>
                                    <TableHead className="px-6 py-3">Type</TableHead>
                                    <TableHead className="px-6 py-3">Size</TableHead>
                                    <TableHead className="px-6 py-3">Status</TableHead>
                                    <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {placements.length > 0 ? placements.map((placement: AdPlacement) => (
                                <TableRow key={placement.id}>
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-muted/50 rounded-lg flex items-center justify-center border border-border">
                                                {(() => {
                                                    const Icon = placementTypeIcon(placement.type);
                                                    return <Icon className="h-5 w-5 text-muted-foreground" />;
                                                })()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground text-sm">{placement.name}</p>
                                                <p className="text-xs text-muted-foreground">{placement.description}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <span className="text-sm font-mono text-foreground bg-muted/30 px-2 py-1 rounded-md">
                                            {placement.slug}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <span className="text-sm text-muted-foreground">
                                            {placement.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <span className="text-sm font-mono text-muted-foreground">
                                            {placement.width} × {placement.height}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <Badge variant={placementBadgeVariant(placement)}>
                                            {placement.is_active ? t('admin.active', 'Active') : t('admin.inactive', 'Inactive')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => openAssignDialog(placement)}
                                                title={t('admin.assignCreatives', '分配创意')}
                                            >
                                                <Layers className="h-4 w-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleToggle(placement.id)}
                                                title={placement.is_active ? t('admin.disable', 'Disable') : t('admin.enable', 'Enable')}
                                            >
                                                {placement.is_active ? <ToggleLeft className="h-4 w-4"/> : <ToggleRight className="h-4 w-4"/>}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => openEditDialog(placement)}
                                            >
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => {
                                                    setDeletingPlacement(placement);
                                                    setDeleteDialogOpen(true);
                                                }}
                                                className="hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="py-16 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                                                <LayoutGrid size={32} className="text-muted-foreground"/>
                                            </div>
                                            <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.noSlots', 'No ad slots found')}</h3>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary"/>
                            {t('admin.createSlot', 'Create Slot')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.createSlotDesc', 'Create a new ad placement slot')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 grid gap-4">
                        <div>
                            <Label>{t('admin.slotName', 'Slot Name')}</Label>
                            <Input
                                value={createForm.name}
                                onChange={e => setCreateForm({...createForm, name: e.target.value})}
                                placeholder="Header Banner"
                            />
                        </div>
                        <div>
                            <Label>{t('admin.slug', 'Slug')}</Label>
                            <Input
                                value={createForm.slug}
                                onChange={e => setCreateForm({...createForm, slug: e.target.value})}
                                placeholder="header-banner"
                            />
                        </div>
                        <div>
                            <Label>{t('admin.type', 'Type')}</Label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="banner">Banner</SelectItem>
                                    <SelectItem value="sidebar">Sidebar</SelectItem>
                                    <SelectItem value="inline">Inline</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>{t('admin.width', 'Width')}</Label>
                                <Input
                                    type="number"
                                    value={createForm.width}
                                    onChange={e => setCreateForm({...createForm, width: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <Label>{t('admin.height', 'Height')}</Label>
                                <Input
                                    type="number"
                                    value={createForm.height}
                                    onChange={e => setCreateForm({...createForm, height: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>{t('admin.description', 'Description')}</Label>
                            <Input
                                value={createForm.description}
                                onChange={e => setCreateForm({...createForm, description: e.target.value})}
                                placeholder="Slot description"
                            />
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setCreateDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleCreate}>
                            {t('common.create', 'Create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary"/>
                            {t('admin.editSlot', 'Edit Slot')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.editSlotDesc', 'Edit ad placement slot details')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 grid gap-4">
                        <div>
                            <Label>{t('admin.slotName', 'Slot Name')}</Label>
                            <Input
                                value={editForm.name}
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label>{t('admin.slug', 'Slug')}</Label>
                            <Input
                                value={editForm.slug}
                                onChange={e => setEditForm({...editForm, slug: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label>{t('admin.type', 'Type')}</Label>
                            <Select value={editForm.type} onValueChange={v => setEditForm({...editForm, type: v})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="banner">Banner</SelectItem>
                                    <SelectItem value="sidebar">Sidebar</SelectItem>
                                    <SelectItem value="inline">Inline</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>{t('admin.width', 'Width')}</Label>
                                <Input
                                    type="number"
                                    value={editForm.width}
                                    onChange={e => setEditForm({...editForm, width: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <Label>{t('admin.height', 'Height')}</Label>
                                <Input
                                    type="number"
                                    value={editForm.height}
                                    onChange={e => setEditForm({...editForm, height: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>{t('admin.description', 'Description')}</Label>
                            <Input
                                value={editForm.description}
                                onChange={e => setEditForm({...editForm, description: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t('admin.isActive', 'Active')}</Label>
                            <Switch
                                checked={editForm.is_active}
                                onCheckedChange={v => setEditForm({...editForm, is_active: v})}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setEditDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleUpdate}>
                            {t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500"/>
                            {t('admin.deleteSlot', 'Delete Slot')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteSlotConfirm', 'Are you sure you want to delete this ad slot? This action cannot be undone.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setDeleteDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium" onClick={handleDelete}>
                            {t('common.delete', 'Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Creatives Dialog (G6-3) */}
            <AssignCreativesDialog
                placement={assigningPlacement}
                open={assignDialogOpen}
                onOpenChange={setAssignDialogOpen}
            />
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// Assign Creatives Dialog (G6-3)
// ═══════════════════════════════════════════════════════════════

const AssignCreativesDialog: React.FC<{
    placement: AdPlacement | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}> = ({placement, open, onOpenChange}) => {
    const {t} = useTranslation();
    const [creatives, setCreatives] = useState<AdCreative[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (!open || !placement) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [all, assigned] = await Promise.all([
                    adminCreativesApi.list(),
                    adminPlacementCreativesApi.list(placement.id),
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
    }, [open, placement]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        if (!placement) return;
        setSaving(true);
        try {
            const assigned = await adminPlacementCreativesApi.list(placement.id);
            const toAdd = [...selected].filter(id => !assigned.includes(id));
            const toRemove = assigned.filter(id => !selected.has(id));
            await Promise.all([
                ...toAdd.map(id => adminPlacementCreativesApi.assign(placement.id, id)),
                ...toRemove.map(id => adminPlacementCreativesApi.unassign(placement.id, id)),
            ]);
            onOpenChange(false);
        } catch (err) {
            console.error('Failed to assign creatives:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-2xl">
                <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary"/>
                        {t('admin.assignCreatives', '分配创意')} · {placement?.name}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                        {t('admin.assignCreativesDesc', '选择要复用到该广告位的创意（可多选，一次定义多处投放）')}
                    </DialogDescription>
                </DialogHeader>
                <div className="px-6 py-5">
                    {loading ? (
                        <div className="py-12 flex justify-center"><Spinner className="h-7 w-7"/></div>
                    ) : creatives.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">{t('admin.noCreatives', '暂无创意，请先在「创意库」中创建')}</p>
                    ) : (
                        <div className="space-y-2">
                            {creatives.map(c => (
                                <label key={c.id}
                                       className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer">
                                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)}
                                           className="h-4 w-4 accent-primary"/>
                                    {c.image_url && (
                                        <img src={c.image_url} alt={c.title}
                                             className="w-16 h-10 object-cover rounded-md border border-border/40"/>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                                        {c.badge_text && (
                                            <span className="text-xs text-muted-foreground">{c.badge_text}</span>
                                        )}
                                    </div>
                                    {!c.is_active && <Badge variant="soft-neutral">{t('admin.inactive', 'Inactive')}</Badge>}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                    <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => onOpenChange(false)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button className="rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleSave} disabled={saving}>
                        {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ═══════════════════════════════════════════════════════════════
// Creatives Tab (Creative Library — G6-3)
// ═══════════════════════════════════════════════════════════════

const CreativeFormFields: React.FC<{
    form: CreateAdCreativeRequest;
    setForm: React.Dispatch<React.SetStateAction<CreateAdCreativeRequest>>;
}> = ({form, setForm}) => (
    <>
        <div>
            <Label>{t('admin.creativeTitle', '创意标题')}</Label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="夏季大促"/>
        </div>
        <div>
            <Label>{t('admin.creativeImage', '图片 URL')}</Label>
            <Input value={form.image_url || ''} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..."/>
        </div>
        <div>
            <Label>{t('admin.creativeMobileImage', '移动端图片 URL')}</Label>
            <Input value={form.image_mobile_url || ''} onChange={e => setForm({...form, image_mobile_url: e.target.value})} placeholder="https://..."/>
        </div>
        <div>
            <Label>{t('admin.creativeLink', '跳转链接')}</Label>
            <Input value={form.link_url || ''} onChange={e => setForm({...form, link_url: e.target.value})} placeholder="https://..."/>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label>{t('admin.creativeBadge', '角标文案')}</Label>
                <Input value={form.badge_text || ''} onChange={e => setForm({...form, badge_text: e.target.value})} placeholder="限时"/>
            </div>
            <div>
                <Label>{t('admin.priority', '优先级')}</Label>
                <Input type="number" value={form.priority} onChange={e => setForm({...form, priority: Number(e.target.value)})} />
            </div>
        </div>
        <div className="flex items-center justify-between">
            <Label>{t('admin.isActive', 'Active')}</Label>
            <Switch checked={!!form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
        </div>
    </>
);

const CreativesTab: React.FC = () => {
    const {t} = useTranslation();
    const [creatives, setCreatives] = useState<AdCreative[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<AdCreative | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<AdCreative | null>(null);
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
        } catch (err) {
            console.error('Failed to delete creative:', err);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6 pt-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Layers className="h-6 w-6 text-primary"/>
                        {t('admin.creativeLibrary', '创意库')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.creativeLibraryDesc', '定义一次创意，即可复用到多个广告位（G6-3）')}
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
                    <Plus className="h-4 w-4"/>
                    {t('admin.createCreative', '新建创意')}
                </Button>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><Spinner className="h-8 w-8"/></div>
            ) : (
                <Card className="overflow-hidden p-0">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="px-6 py-3">创意</TableHead>
                                    <TableHead className="px-6 py-3">角标</TableHead>
                                    <TableHead className="px-6 py-3">链接</TableHead>
                                    <TableHead className="px-6 py-3">优先级</TableHead>
                                    <TableHead className="px-6 py-3">状态</TableHead>
                                    <TableHead className="px-6 py-3 text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {creatives.length > 0 ? creatives.map((c: AdCreative) => (
                                <TableRow key={c.id}>
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {c.image_url && (
                                                <img src={c.image_url} alt={c.title}
                                                     className="w-12 h-8 object-cover rounded-md border border-border/40"/>
                                            )}
                                            <p className="font-semibold text-foreground text-sm">{c.title}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <span className="text-sm text-muted-foreground">{c.badge_text || '-'}</span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        {c.link_url ? (
                                            <a href={c.link_url} target="_blank" rel="noopener noreferrer"
                                               className="text-sm text-primary hover:underline flex items-center gap-1">
                                                <Link2 className="w-3 h-3"/>{t('ad.viewDetail', '查看')}
                                            </a>
                                        ) : <span className="text-sm text-muted-foreground">-</span>}
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <span className="text-sm font-mono text-muted-foreground">{c.priority}</span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4">
                                        <Badge variant={c.is_active ? 'soft-success' : 'soft-neutral'}>
                                            {c.is_active ? t('admin.active', 'Active') : t('admin.inactive', 'Inactive')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon-sm" className="hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() => { setDeleting(c); setDeleteOpen(true); }}>
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="py-16 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                                                <Layers size={32} className="text-muted-foreground"/>
                                            </div>
                                            <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.noCreativesYet', '创意库还是空的')}</h3>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary"/>{t('admin.createCreative', '新建创意')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 grid gap-4">
                        <CreativeFormFields form={form} setForm={setForm}/>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button className="rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleCreate}>
                            {t('common.create', 'Create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary"/>{t('admin.editCreative', '编辑创意')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 grid gap-4">
                        <CreativeFormFields form={form} setForm={setForm}/>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setEditOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button className="rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleUpdate}>
                            {t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500"/>{t('admin.deleteCreative', '删除创意')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.deleteCreativeConfirm', '确定删除该创意？已分配到广告位的引用会一并解除。')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setDeleteOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium" onClick={handleDelete}>
                            {t('common.delete', 'Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
