import React, {useState} from 'react';
import {
    Shield, Plus, Edit, Trash2, Key, FileCheck,
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
    useAdminDrmPolicies, useCreateDrmPolicy, useUpdateDrmPolicy, useDeleteDrmPolicy,
    useAdminDrmKeys, useGenerateDrmKey, useDeleteDrmKey,
    useAdminDrmLicenses,
} from '@/hooks/queries';
import {type DrmPolicy, type DrmKey, type CreateDrmPolicyRequest, type GenerateDrmKeyRequest} from '@/lib/api/drm';

export default function DRMPage() {
    const {t} = useTranslation();
    return (
        <div className="space-y-4 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="h-6 w-6"/>{t('admin.drmManagement', 'DRM Management')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{t('admin.drmManagementDesc', 'Manage DRM policies, encryption keys, and licenses')}</p>
            </div>

            <Tabs defaultValue="policies">
                <TabsList>
                    <TabsTrigger value="policies">{t('admin.drmPolicies', 'Policies')}</TabsTrigger>
                    <TabsTrigger value="keys">{t('admin.drmKeys', 'Keys')}</TabsTrigger>
                    <TabsTrigger value="licenses">{t('admin.drmLicenses', 'Licenses')}</TabsTrigger>
                </TabsList>
                <TabsContent value="policies" className="mt-4">
                    <PoliciesTab/>
                </TabsContent>
                <TabsContent value="keys" className="mt-4">
                    <KeysTab/>
                </TabsContent>
                <TabsContent value="licenses" className="mt-4">
                    <LicensesTab/>
                </TabsContent>
            </Tabs>
        </div>
    );
}

const PoliciesTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: policiesData, isLoading} = useAdminDrmPolicies();
    const createMutation = useCreateDrmPolicy();
    const updateMutation = useUpdateDrmPolicy();
    const deleteMutation = useDeleteDrmPolicy();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DrmPolicy | null>(null);
    const [createForm, setCreateForm] = useState<CreateDrmPolicyRequest>({
        name: '', type: 'hls_aes128',
    });
    const [editForm, setEditForm] = useState({
        name: '', type: 'hls_aes128', hls_key_url: '', widevine_pssh: '',
        fairplay_cert_url: '', description: '', is_default: false,
    });

    const policies = (policiesData as DrmPolicy[] | undefined) || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', type: 'hls_aes128'});
        } catch (err) {
            console.error('Failed to create DRM policy:', err);
        }
    };

    const openEditDialog = (p: DrmPolicy) => {
        setEditingItem(p);
        setEditForm({
            name: p.name,
            type: p.type,
            hls_key_url: p.hls_key_url || '',
            widevine_pssh: p.widevine_pssh || '',
            fairplay_cert_url: p.fairplay_cert_url || '',
            description: p.description || '',
            is_default: p.is_default,
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        try {
            await updateMutation.mutateAsync({id: editingItem.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) {
            console.error('Failed to update DRM policy:', err);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            await deleteMutation.mutateAsync(editingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete DRM policy:', err);
        }
    };

    const typeLabels: Record<string, string> = {
        hls_aes128: 'HLS AES-128',
        widevine: 'Widevine',
        fairplay: 'FairPlay',
        multi: 'Multi-DRM',
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5"/>{t('admin.drmPolicyManagement', 'DRM Policy Management')}</CardTitle>
                            <CardDescription>{t('admin.drmPolicyDesc', 'Define DRM protection policies for your content')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setCreateDialogOpen(true)}><Plus className="w-4 h-4 mr-2"/>{t('admin.addDrmPolicy', 'Add Policy')}</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.drmPolicyName', 'Name')}</TableHead>
                                    <TableHead>{t('admin.drmPolicyType', 'Type')}</TableHead>
                                    <TableHead>{t('admin.drmPolicyDefault', 'Default')}</TableHead>
                                    <TableHead>{t('admin.drmPolicyDescription', 'Description')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {policies.length > 0 ? policies.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell><Badge variant="outline">{typeLabels[p.type] || p.type}</Badge></TableCell>
                                        <TableCell>{p.is_default ? <Badge variant="default">{t('admin.enabled', 'Enabled')}</Badge> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.description || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(p)}>
                                                    <Edit className="w-4 h-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { setEditingItem(p); setDeleteDialogOpen(true); }}>
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t('admin.noDrmPolicies', 'No DRM policies found')}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>{t('admin.addDrmPolicyTitle', 'Add DRM Policy')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyName', 'Name')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder={t('admin.drmPolicyName', 'Name')}/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyType', 'Type')}</Label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({...createForm, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hls_aes128">HLS AES-128</SelectItem>
                                    <SelectItem value="widevine">Widevine</SelectItem>
                                    <SelectItem value="fairplay">FairPlay</SelectItem>
                                    <SelectItem value="multi">Multi-DRM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyHlsKeyUrl', 'HLS Key URL')}</Label><Input value={createForm.hls_key_url || ''} onChange={e => setCreateForm({...createForm, hls_key_url: e.target.value})} placeholder="https://..."/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyDescription', 'Description')}</Label><Input value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})}/></div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="create-policy-default" checked={createForm.is_default ?? false} onChange={e => setCreateForm({...createForm, is_default: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="create-policy-default">{t('admin.drmPolicyDefault', 'Default')}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.name}>{t('common.add', 'Add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>{t('admin.editDrmPolicy', 'Edit DRM Policy')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyName', 'Name')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyType', 'Type')}</Label>
                            <Select value={editForm.type} onValueChange={v => setEditForm({...editForm, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hls_aes128">HLS AES-128</SelectItem>
                                    <SelectItem value="widevine">Widevine</SelectItem>
                                    <SelectItem value="fairplay">FairPlay</SelectItem>
                                    <SelectItem value="multi">Multi-DRM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyHlsKeyUrl', 'HLS Key URL')}</Label><Input value={editForm.hls_key_url} onChange={e => setEditForm({...editForm, hls_key_url: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyWidevinePssh', 'Widevine PSSH')}</Label><Input value={editForm.widevine_pssh} onChange={e => setEditForm({...editForm, widevine_pssh: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyFairplayCertUrl', 'FairPlay Cert URL')}</Label><Input value={editForm.fairplay_cert_url} onChange={e => setEditForm({...editForm, fairplay_cert_url: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmPolicyDescription', 'Description')}</Label><Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/></div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="edit-policy-default" checked={editForm.is_default} onChange={e => setEditForm({...editForm, is_default: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-policy-default">{t('admin.drmPolicyDefault', 'Default')}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleUpdate} disabled={!editForm.name}>{t('common.save', 'Save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.deleteDrmPolicyConfirm', 'Are you sure you want to delete this DRM policy?')}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('admin.delete', 'Delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const KeysTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: policiesData} = useAdminDrmPolicies();
    const [selectedPolicy, setSelectedPolicy] = useState<string>('');
    const {data: keysData, isLoading} = useAdminDrmKeys(selectedPolicy);
    const generateMutation = useGenerateDrmKey();
    const deleteMutation = useDeleteDrmKey();

    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingKey, setDeletingKey] = useState<DrmKey | null>(null);
    const [generateForm, setGenerateForm] = useState<GenerateDrmKeyRequest>({content_id: ''});

    const policies = (policiesData as DrmPolicy[] | undefined) || [];
    const keys = (keysData as DrmKey[] | undefined) || [];

    const handleGenerate = async () => {
        try {
            await generateMutation.mutateAsync({policyId: selectedPolicy, data: generateForm});
            setGenerateDialogOpen(false);
            setGenerateForm({content_id: ''});
        } catch (err) {
            console.error('Failed to generate DRM key:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingKey) return;
        try {
            await deleteMutation.mutateAsync(deletingKey.id);
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Failed to delete DRM key:', err);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5"/>{t('admin.drmKeyManagement', 'DRM Key Management')}</CardTitle>
                            <CardDescription>{t('admin.drmKeyDesc', 'Generate and manage encryption keys')}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                                <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('admin.selectDrmPolicy', 'Select Policy')}/></SelectTrigger>
                                <SelectContent>
                                    {policies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => setGenerateDialogOpen(true)} disabled={!selectedPolicy}><Plus className="w-4 h-4 mr-2"/>{t('admin.generateKey', 'Generate Key')}</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.drmKeyContentId', 'Content ID')}</TableHead>
                                    <TableHead>{t('admin.drmKeyId', 'Key ID')}</TableHead>
                                    <TableHead>{t('admin.drmKeyIv', 'IV')}</TableHead>
                                    <TableHead>{t('admin.drmKeyCreatedAt', 'Created')}</TableHead>
                                    <TableHead>{t('admin.drmKeyExpiresAt', 'Expires')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys.length > 0 ? keys.map(k => (
                                    <TableRow key={k.id}>
                                        <TableCell className="font-medium"><code className="text-xs bg-muted px-1 py-0.5 rounded">{k.content_id}</code></TableCell>
                                        <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{k.key_id.substring(0, 16)}...</code></TableCell>
                                        <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{k.iv ? k.iv.substring(0, 16) + '...' : '-'}</code></TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{k.created_at ? new Date(k.created_at).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { setDeletingKey(k); setDeleteDialogOpen(true); }}>
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{selectedPolicy ? t('admin.noDrmKeys', 'No keys found') : t('admin.selectDrmPolicyFirst', 'Select a policy first')}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader><DialogTitle>{t('admin.generateDrmKeyTitle', 'Generate DRM Key')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2"><Label>{t('admin.drmKeyContentId', 'Content ID')}</Label><Input value={generateForm.content_id} onChange={e => setGenerateForm({...generateForm, content_id: e.target.value})} placeholder="media-uuid"/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmKeyExpiresAt', 'Expires At')}</Label><Input type="datetime-local" value={generateForm.expires_at || ''} onChange={e => setGenerateForm({...generateForm, expires_at: e.target.value})}/></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleGenerate} disabled={!generateForm.content_id}>{t('admin.generate', 'Generate')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.deleteDrmKeyConfirm', 'Are you sure you want to delete this DRM key?')}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('admin.delete', 'Delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const LicensesTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: licensesData, isLoading} = useAdminDrmLicenses({page, page_size: 20});

    const licenses = licensesData?.items || [];
    const total = licensesData?.total || 0;

    const statusLabels: Record<string, {label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'}> = {
        active: {label: t('admin.licenseActive', 'Active'), variant: 'default'},
        expired: {label: t('admin.licenseExpired', 'Expired'), variant: 'secondary'},
        revoked: {label: t('admin.licenseRevoked', 'Revoked'), variant: 'destructive'},
    };

    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5"/>{t('admin.drmLicenseManagement', 'DRM License Management')}</CardTitle>
                    <CardDescription>{t('admin.drmLicenseDesc', 'View issued DRM licenses')}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.drmLicenseKeyId', 'Key ID')}</TableHead>
                                    <TableHead>{t('admin.drmLicenseUserId', 'User ID')}</TableHead>
                                    <TableHead>{t('admin.drmLicenseDeviceId', 'Device ID')}</TableHead>
                                    <TableHead>{t('admin.drmLicenseStatus', 'Status')}</TableHead>
                                    <TableHead>{t('admin.drmLicenseIssuedAt', 'Issued')}</TableHead>
                                    <TableHead>{t('admin.drmLicenseExpiresAt', 'Expires')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {licenses.length > 0 ? licenses.map(l => {
                                    const statusInfo = statusLabels[l.status] || {label: l.status, variant: 'outline' as const};
                                    return (
                                        <TableRow key={l.id}>
                                            <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{l.key_id.substring(0, 16)}...</code></TableCell>
                                            <TableCell className="text-sm">{l.user_id ? <code className="text-xs bg-muted px-1 py-0.5 rounded">{l.user_id.substring(0, 8)}...</code> : '-'}</TableCell>
                                            <TableCell className="text-sm">{l.device_id ? <code className="text-xs bg-muted px-1 py-0.5 rounded">{l.device_id.substring(0, 8)}...</code> : '-'}</TableCell>
                                            <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{l.issued_at ? new Date(l.issued_at).toLocaleDateString() : '-'}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : '-'}</TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t('admin.noDrmLicenses', 'No licenses found')}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                        {total > 20 && (
                            <div className="flex items-center justify-end gap-2 mt-4">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.prev', 'Prev')}</Button>
                                <span className="text-sm text-muted-foreground">{page} / {Math.ceil(total / 20)}</span>
                                <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>{t('common.next', 'Next')}</Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};
