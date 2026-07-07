import {useState} from 'react';
import {
    Shield, Plus, Edit, Trash2, Users, ToggleLeft, ToggleRight,
    Search, ArrowLeft, UserPlus,
} from 'lucide-react';
import {Link} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Separator} from '@/components/ui/separator';
import {Typography} from '@/components/ui/typography';
import {
    usePermissionGroups, usePermissionGroup, useGroupMembers,
    useUserPermissions,
} from '@/hooks/queries';
import {adminPermissionApi, type CreatePermissionGroupRequest, type UpdatePermissionGroupRequest} from '@/lib/api/permission';
import {useQueryClient} from '@tanstack/react-query';
import {TablePagination} from '@/components/common/TablePagination';
import {PAGINATION_CONFIG} from '@/config/pagination';
import {useTranslation} from 'react-i18next';

export default function PermissionsPage() {
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'detail' | 'members' | 'user-perms'>('list');

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<{id: string; name: string; description: string; permissions: string[]; category_scope: string[]} | null>(null);
    const [createForm, setCreateForm] = useState<CreatePermissionGroupRequest>({name: '', description: '', permissions: [], category_scope: []});
    const [editForm, setEditForm] = useState<UpdatePermissionGroupRequest>({});

    const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
    const [addMemberIds, setAddMemberIds] = useState('');
    const [userPermId, setUserPermId] = useState<string | null>(null);

    const {data: groupsData, isLoading} = usePermissionGroups({page, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});
    const {data: groupDetail} = usePermissionGroup(selectedGroupId);
    const {data: membersData} = useGroupMembers(selectedGroupId, {page: 1, page_size: PAGINATION_CONFIG.MAX_PAGE_SIZE});
    const {data: userPermsData} = useUserPermissions(userPermId);

    const groups = groupsData?.items || [];
    const members = membersData?.items || [];

    const filteredGroups = search
        ? groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
        : groups;

    const handleCreate = async () => {
        try {
            await adminPermissionApi.create(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', description: '', permissions: [], category_scope: []});
            queryClient.invalidateQueries({queryKey: ['permissionGroups']});
        } catch (err) {
            console.error('Failed to create group:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingGroup) return;
        try {
            await adminPermissionApi.update(editingGroup.id, editForm);
            setEditDialogOpen(false);
            queryClient.invalidateQueries({queryKey: ['permissionGroups']});
            queryClient.invalidateQueries({queryKey: ['permissionGroup', editingGroup.id]});
        } catch (err) {
            console.error('Failed to update group:', err);
        }
    };

    const handleDelete = async () => {
        if (!editingGroup) return;
        try {
            await adminPermissionApi.delete(editingGroup.id);
            setDeleteDialogOpen(false);
            setSelectedGroupId(null);
            setView('list');
            queryClient.invalidateQueries({queryKey: ['permissionGroups']});
        } catch (err) {
            console.error('Failed to delete group:', err);
        }
    };

    const handleToggle = async (id: string, isActive: boolean) => {
        try {
            await adminPermissionApi.toggle(id, {is_active: !isActive});
            queryClient.invalidateQueries({queryKey: ['permissionGroups']});
        } catch (err) {
            console.error('Failed to toggle group:', err);
        }
    };

    const handleAddMembers = async () => {
        if (!selectedGroupId || !addMemberIds.trim()) return;
        try {
            const ids = addMemberIds.split(',').map(s => s.trim()).filter(Boolean);
            await adminPermissionApi.addMembers(selectedGroupId, {user_ids: ids});
            setAddMemberDialogOpen(false);
            setAddMemberIds('');
            queryClient.invalidateQueries({queryKey: ['groupMembers', selectedGroupId]});
        } catch (err) {
            console.error('Failed to add members:', err);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!selectedGroupId) return;
        try {
            await adminPermissionApi.removeMember(selectedGroupId, userId);
            queryClient.invalidateQueries({queryKey: ['groupMembers', selectedGroupId]});
        } catch (err) {
            console.error('Failed to remove member:', err);
        }
    };

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
                        <BreadcrumbPage>{t('admin.breadcrumb.permissions', '权限管理')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Shield className="h-6 w-6"/>{t('permissions.title')}
                    </h1>
                    <Typography variant="muted" as="p" className="mt-1">{t('permissions.description')}</Typography>
                </div>
                {view !== 'list' && (
                    <Button variant="outline" size="sm" onClick={() => { setView('list'); setSelectedGroupId(null); }}>
                        <ArrowLeft className="w-4 h-4 mr-2"/>{t('permissions.backToList')}
                    </Button>
                )}
                {view === 'list' && (
                    <Button size="sm" onClick={() => { setCreateForm({name: '', description: '', permissions: [], category_scope: []}); setCreateDialogOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2"/>{t('permissions.createGroup')}
                    </Button>
                )}
            </div>

            {view === 'list' && (
                <>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                            <Input placeholder={t('permissions.searchGroups')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 rounded-md"/>
                        </div>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <Typography variant="muted" as="div" className="py-12 text-center">{t('common.loading')}</Typography>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('admin.name')}</TableHead>
                                            <TableHead>{t('admin.description')}</TableHead>
                                            <TableHead>{t('permissions.permissionCount')}</TableHead>
                                            <TableHead>{t('permissions.memberCount')}</TableHead>
                                            <TableHead>{t('admin.status')}</TableHead>
                                            <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGroups.length > 0 ? filteredGroups.map(group => (
                                            <TableRow key={group.id} className="cursor-pointer" onClick={() => { setSelectedGroupId(group.id); setView('detail'); }}>
                                                <TableCell className="font-medium">{group.name}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{group.description || '-'}</TableCell>
                                                <TableCell><Badge variant="outline">{group.permissions?.length || 0}</Badge></TableCell>
                                                <TableCell><Badge variant="secondary">{group.member_count || 0}</Badge></TableCell>
                                                <TableCell>
                                                    <Badge variant={group.is_active ? 'default' : 'secondary'}>
                                                        {group.is_active ? t('admin.enabled') : t('admin.disabled')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon-sm"
                                                            onClick={() => handleToggle(group.id, group.is_active)}>
                                                            {group.is_active ? <ToggleRight className="h-4 w-4 text-success"/> : <ToggleLeft className="h-4 w-4 text-muted-foreground"/>}
                                                        </Button>
                                                        <Button variant="ghost" size="icon-sm"
                                                            onClick={() => { setEditingGroup({id: group.id, name: group.name, description: group.description || '', permissions: group.permissions, category_scope: group.category_scope || []}); setEditForm({name: group.name, description: group.description, permissions: group.permissions, category_scope: group.category_scope}); setEditDialogOpen(true); }}>
                                                            <Edit className="h-4 w-4"/>
                                                        </Button>
                                                        <Button variant="ghost" size="icon-sm" className="text-destructive"
                                                            onClick={() => { setEditingGroup({id: group.id, name: group.name, description: group.description || '', permissions: group.permissions, category_scope: group.category_scope || []}); setDeleteDialogOpen(true); }}>
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t('permissions.noGroups')}</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <TablePagination
                        page={page}
                        pageSize={20}
                        total={groupsData?.total || 0}
                        onPageChange={setPage}
                    />
                </>
            )}

            {view === 'detail' && groupDetail && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{groupDetail.name}</CardTitle>
                                    <CardDescription>{groupDetail.description || t('permissions.noDescription')}</CardDescription>
                                </div>
                                <Badge variant={groupDetail.is_active ? 'default' : 'secondary'}>
                                    {groupDetail.is_active ? t('admin.enabled') : t('admin.disabled')}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">{t('permissions.permissionList')}</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {groupDetail.permissions.map(p => (
                                        <Badge key={p} variant="outline">{p}</Badge>
                                    ))}
                                    {groupDetail.permissions.length === 0 && <Typography variant="muted" as="span">{t('permissions.noPermissions')}</Typography>}
                                </div>
                            </div>
                            {groupDetail.category_scope && groupDetail.category_scope.length > 0 && (
                                <div>
                                    <Label className="text-sm font-medium">{t('permissions.categoryScope')}</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {groupDetail.category_scope.map(c => (
                                            <Badge key={c} variant="secondary">{c}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <Separator/>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setView('members')}>
                                    <Users className="w-4 h-4 mr-2"/>{t('permissions.manageMembers')} ({groupDetail.member_count || 0})
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => { setUserPermId(null); setView('user-perms'); }}>
                                    <Shield className="w-4 h-4 mr-2"/>{t('permissions.viewUserPermissions')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {view === 'members' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{t('permissions.groupMemberManagement')}</CardTitle>
                            <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2"/>{t('permissions.addMember')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('permissions.userId')}</TableHead>
                                    <TableHead>{t('admin.username')}</TableHead>
                                    <TableHead>{t('permissions.joinedAt')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.length > 0 ? members.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-mono text-sm">{m.user_id}</TableCell>
                                        <TableCell>{m.username}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{m.joined_at}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-destructive"
                                                onClick={() => handleRemoveMember(m.user_id)}>
                                                <Trash2 className="w-4 h-4 mr-1"/>{t('permissions.remove')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{t('permissions.noMembers')}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {view === 'user-perms' && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('permissions.userPermissionView')}</CardTitle>
                        <CardDescription>{t('permissions.userPermissionViewDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input placeholder={t('permissions.enterUserId')} value={userPermId || ''} onChange={e => setUserPermId(e.target.value)} className="max-w-xs"/>
                        </div>
                        {userPermsData && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium">{t('permissions.role')}</Label>
                                    <Badge variant="outline" className="ml-2">{userPermsData.role}</Badge>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium mb-2 block">{t('permissions.belongGroups')}</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {userPermsData.groups.map(g => (
                                            <Badge key={g.id} variant={g.is_active ? 'default' : 'secondary'}>
                                                {g.name}
                                            </Badge>
                                        ))}
                                        {userPermsData.groups.length === 0 && <Typography variant="muted" as="span">{t('permissions.noGroups')}</Typography>}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium mb-2 block">{t('permissions.effectivePermissions')}</Label>
                                    <div className="space-y-2">
                                        {Object.entries(userPermsData.effective_permissions).map(([key, val]) => (
                                            <div key={key} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                                                <Badge variant="outline">{key}</Badge>
                                                <Typography variant="muted" as="span" className="text-xs">{t('permissions.source')}: {val.sources.join(', ')}</Typography>
                                                {val.scope && <Typography variant="muted" as="span" className="text-xs">{t('permissions.scope')}: {val.scope.join(', ')}</Typography>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-[500px]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary"/>
                            {t('permissions.createGroup')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('permissions.createGroupDesc') || 'Create a new permission group with specified access rights'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.name')}</Label>
                            <Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder={t('permissions.groupNamePlaceholder')}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.description')}</Label>
                            <Textarea value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder={t('permissions.groupDescPlaceholder')} rows={2}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('permissions.permissionsCommaSeparated')}</Label>
                            <Input value={createForm.permissions.join(', ')} onChange={e => setCreateForm({...createForm, permissions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="media:read, media:write"/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('permissions.categoryScopeCommaOptional')}</Label>
                            <Input value={(createForm.category_scope || []).join(', ')} onChange={e => setCreateForm({...createForm, category_scope: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="category1, category2"/>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleCreate} disabled={!createForm.name}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-[500px]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary"/>
                            {t('permissions.editGroup')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('permissions.editGroupDesc', {name: editingGroup?.name}) || 'Update permission group settings and access rights'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4">
                        <div className="grid gap-2">
                            <Label>{t('admin.name')}</Label>
                            <Input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.description')}</Label>
                            <Textarea value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={2}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('permissions.permissionsCommaSeparated')}</Label>
                            <Input value={(editForm.permissions || []).join(', ')} onChange={e => setEditForm({...editForm, permissions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('permissions.categoryScopeComma')}</Label>
                            <Input value={(editForm.category_scope || []).join(', ')} onChange={e => setEditForm({...editForm, category_scope: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}/>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleUpdate}>{t('common.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500"/>
                            {t('admin.confirmDelete')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('permissions.deleteGroupConfirm', {name: editingGroup?.name}) || 'This action cannot be undone. The permission group will be permanently removed.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium" onClick={handleDelete}>{t('admin.delete')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-[400px]">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary"/>
                            {t('permissions.addMember')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('permissions.addMemberDesc') || 'Enter user IDs separated by commas to add multiple members at once'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5">
                        <Textarea value={addMemberIds} onChange={e => setAddMemberIds(e.target.value)} placeholder="user_id_1, user_id_2" rows={3}/>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setAddMemberDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleAddMembers} disabled={!addMemberIds.trim()}>{t('common.add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
