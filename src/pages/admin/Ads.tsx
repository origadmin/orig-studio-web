import React, {useState} from 'react';
import {
    Megaphone,
    Plus,
    Edit,
    Trash2,
    LayoutGrid,
    Filter,
    MoreHorizontal,
    Search,
    Eye,
    Play,
    Gauge,
    ToggleLeft,
    ToggleRight,
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
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {
    useAdminAdPlacements, useCreateAdPlacement, useUpdateAdPlacement, useDeleteAdPlacement, useToggleAdPlacement,
} from '@/hooks/queries';
import {type AdPlacement, type CreateAdPlacementRequest, type UpdateAdPlacementRequest} from '@/lib/api/portal';

const placementBadgeVariant = (p: AdPlacement): 'soft-success' | 'soft-neutral' => {
    if (!p.is_active) return 'soft-neutral';
    return 'soft-success';
};

const PAGE_SIZE = 20;

export default function AdsPage() {
    const {t} = useTranslation();
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
            <SlotsTab />
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
                                                <LayoutGrid className="h-5 w-5 text-muted-foreground"/>
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
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('admin.createSlot', 'Create Slot')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.createSlotDesc', 'Create a new ad placement slot')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 px-6">
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleCreate}>
                            {t('common.create', 'Create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('admin.editSlot', 'Edit Slot')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.editSlotDesc', 'Edit ad placement slot details')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 px-6">
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleUpdate}>
                            {t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogTitle>{t('admin.deleteSlot', 'Delete Slot')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('admin.deleteSlotConfirm', 'Are you sure you want to delete this ad slot?')}
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-2 pt-4">
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t('common.delete', 'Delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
