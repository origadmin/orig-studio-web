import React, {useState} from 'react';
import {
    Shield, Edit, Trash2, Key, FileCheck, ChevronLeft, ChevronRight,
    Download, ShieldPlus, Verified, Lock, ShieldAlert,
    Search, ListFilter, RefreshCw, ArrowRight, BarChart3, Monitor,
    LockOpen,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {Switch} from '@/components/ui/switch';
import {Slider} from '@/components/ui/slider';
import {Checkbox} from '@/components/ui/checkbox';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {
    useAdminDrmPolicies, useCreateDrmPolicy, useUpdateDrmPolicy, useDeleteDrmPolicy,
    useAdminDrmKeys, useGenerateDrmKey, useDeleteDrmKey,
    useAdminDrmLicenses,
} from '@/hooks/queries';
import {type DrmPolicy, type DrmKey, type CreateDrmPolicyRequest, type GenerateDrmKeyRequest} from '@/lib/api/drm';

export default function DRMPage() {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState('policies');

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumbs & Header */}
            <div className="px-6 py-6">
                <Breadcrumb className="mb-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/admin">{t('admin.title', 'Admin')}</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator/>
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t('admin.drmManagement', 'DRM Management')}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <Verified className="w-8 h-8 text-primary"/>
                            {t('admin.drmManagement', 'DRM Management')}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">{t('admin.drmManagementDesc', 'Configure digital rights policies, encryption keys, and license issuance rules.')}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="rounded-xl">
                            <Download className="w-4 h-4"/>
                            {t('admin.exportLogs', 'Export Logs')}
                        </Button>
                        <Button className="rounded-xl">
                            <ShieldPlus className="w-4 h-4"/>
                            {t('admin.createPolicy', 'Create Policy')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                <nav className="px-6 border-b border-border">
                    <TabsList className="bg-transparent h-auto p-0 gap-8">
                        <TabsTrigger
                            value="policies"
                            className="relative py-4 px-0 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none text-sm data-[state=active]:text-primary data-[state=active]:font-semibold text-muted-foreground hover:text-foreground"
                        >
                            {t('admin.drmPolicies', 'Policies')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="keys"
                            className="relative py-4 px-0 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none text-sm data-[state=active]:text-primary data-[state=active]:font-semibold text-muted-foreground hover:text-foreground"
                        >
                            {t('admin.drmKeys', 'Keys')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="licenses"
                            className="relative py-4 px-0 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none text-sm data-[state=active]:text-primary data-[state=active]:font-semibold text-muted-foreground hover:text-foreground"
                        >
                            {t('admin.drmLicenses', 'Licenses')}
                        </TabsTrigger>
                    </TabsList>
                </nav>

                {/* Tab Content */}
                <TabsContent value="policies" className="flex-1 overflow-y-auto p-6 mt-0">
                    <PoliciesTab/>
                </TabsContent>
                <TabsContent value="keys" className="flex-1 overflow-y-auto p-6 mt-0">
                    <KeysTab/>
                </TabsContent>
                <TabsContent value="licenses" className="flex-1 overflow-y-auto p-6 mt-0">
                    <LicensesTab/>
                </TabsContent>
            </Tabs>
        </div>
    );
}

const PoliciesTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: policiesData} = useAdminDrmPolicies();
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
    const [keyRotation, setKeyRotation] = useState(24);
    const [autoFailover, setAutoFailover] = useState(true);

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

    const policyCardDefs = [
        {
            type: 'hls_aes128',
            icon: Lock,
            iconBg: 'bg-secondary/20',
            iconColor: 'text-secondary-foreground',
            title: 'HLS AES-128',
            desc: 'Standard envelope encryption for generic Apple HLS streams. Lowest overhead, widely supported.',
            idLabel: 'ID: POL_7721_AES',
            watermark: LockOpen,
        },
        {
            type: 'widevine',
            icon: Shield,
            iconBg: 'bg-primary/10',
            iconColor: 'text-primary',
            title: 'Widevine Modular',
            desc: 'Google\'s DRM technology for Chrome, Android, and connected TV devices. Supports L1/L3 security levels.',
            idLabel: 'ID: POL_4402_WDV',
            watermark: Monitor,
        },
        {
            type: 'fairplay',
            icon: ShieldAlert,
            iconBg: 'bg-destructive/10',
            iconColor: 'text-destructive',
            title: 'Apple FairPlay',
            desc: 'Secure streaming protocol for iOS, tvOS, and Safari. Requires custom certificate integration.',
            idLabel: 'ID: POL_0918_FPL',
            watermark: Monitor,
        },
    ];

    const getPolicyForCard = (type: string) => policies.find(p => p.type === type);

    const keyRotationLabels: Record<number, string> = {1: '1 Hour', 6: '6 Hours', 12: '12 Hours', 24: '24 Hours', 48: '48 Hours', 72: '72 Hours'};

    return (
        <>
            <div className="space-y-6">
                {/* 3-column Bento Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {policyCardDefs.map((card) => {
                        const policy = getPolicyForCard(card.type);
                        const isActive = policy?.is_default ?? (card.type === 'hls_aes128' || card.type === 'widevine');
                        const WatermarkIcon = card.watermark;
                        const IconComponent = card.icon;
                        const displayId = policy?.id ? `ID: ${policy.id.substring(0, 8).toUpperCase()}_${card.type.substring(0, 3).toUpperCase()}` : card.idLabel;

                        return (
                            <Card
                                key={card.type}
                                className="p-6 flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group relative overflow-hidden"
                                onClick={() => policy && openEditDialog(policy)}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <WatermarkIcon className="w-[120px] h-[120px]"/>
                                </div>
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-lg ${card.iconBg}`}>
                                            <IconComponent className={`w-6 h-6 ${card.iconColor}`}/>
                                        </div>
                                        <Badge variant={isActive ? 'soft-success' : 'soft-neutral'} className="uppercase text-[11px]">
                                            {isActive ? t('admin.licenseActive', 'Active') : t('admin.inactive', 'Inactive')}
                                        </Badge>
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">{card.title}</h3>
                                    <p className="text-muted-foreground text-sm">{card.desc}</p>
                                </div>
                                <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
                                    <span className="text-xs font-mono text-muted-foreground">{displayId}</span>
                                    <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform"/>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Show existing policies that don't match the 3 card types */}
                {policies.filter(p => !policyCardDefs.some(c => c.type === p.type)).map(p => (
                    <Card key={p.id} className="p-6 flex items-center justify-between hover:border-primary/50 transition-colors">
                        <div>
                            <div className="text-sm font-semibold text-foreground">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.type} {p.description ? `- ${p.description}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => openEditDialog(p)}
                            >
                                <Edit className="w-4 h-4"/>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => { setEditingItem(p); setDeleteDialogOpen(true); }}
                            >
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        </div>
                    </Card>
                ))}

                {/* Global Encryption Settings */}
                <Card className="overflow-hidden">
                    <CardHeader className="px-6 py-4 border-b border-border bg-accent/30 flex flex-row justify-between items-center space-y-0">
                        <CardTitle className="text-xl font-semibold text-foreground">{t('admin.globalEncryptionSettings', 'Global Encryption Settings')}</CardTitle>
                        <span className="text-muted-foreground text-sm italic">Auto-save enabled</span>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-2">
                            <Label className="block text-foreground font-semibold text-sm">{t('admin.keyRotationInterval', 'Key Rotation Interval')}</Label>
                            <div className="flex items-center gap-4">
                                <Slider
                                    value={[keyRotation]}
                                    onValueChange={([v]) => setKeyRotation(v)}
                                    min={1}
                                    max={72}
                                    step={1}
                                    className="flex-1"
                                />
                                <span className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded">{keyRotationLabels[keyRotation] || `${keyRotation} Hours`}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Recommended: 24h for premium tier assets.</p>
                        </div>
                        <div className="flex items-center justify-between bg-secondary/20 p-4 rounded-lg border border-border">
                            <div>
                                <div className="font-semibold text-sm text-foreground">{t('admin.multiDrmAutoFailover', 'Multi-DRM Auto-Failover')}</div>
                                <div className="text-xs text-muted-foreground">Switch to backup DRM if primary fails.</div>
                            </div>
                            <Switch checked={autoFailover} onCheckedChange={setAutoFailover}/>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <DialogHeader className="px-6 py-5 border-b border-border">
                        <DialogTitle className="text-lg font-semibold text-foreground">{t('admin.addDrmPolicyTitle', 'Add DRM Policy')}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
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
                            <Checkbox id="create-policy-default" checked={createForm.is_default ?? false} onCheckedChange={(checked) => setCreateForm({...createForm, is_default: checked === true})}/>
                            <Label htmlFor="create-policy-default">{t('admin.drmPolicyDefault', 'Default')}</Label>
                        </div>
                    </div>
                    <DialogFooter className="px-6 py-4 bg-muted flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!createForm.name}>{t('common.add', 'Add')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <DialogHeader className="px-6 py-5 border-b border-border">
                        <DialogTitle className="text-lg font-semibold text-foreground">{t('admin.editDrmPolicy', 'Edit DRM Policy')}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
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
                            <Checkbox id="edit-policy-default" checked={editForm.is_default} onCheckedChange={(checked) => setEditForm({...editForm, is_default: checked === true})}/>
                            <Label htmlFor="edit-policy-default">{t('admin.drmPolicyDefault', 'Default')}</Label>
                        </div>
                    </div>
                    <DialogFooter className="px-6 py-4 bg-muted flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleUpdate} disabled={!editForm.name}>{t('common.save', 'Save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <AlertDialogHeader className="px-6 py-5 border-b border-border">
                        <AlertDialogTitle className="text-lg font-semibold text-foreground">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">{t('admin.deleteDrmPolicyConfirm', 'Are you sure you want to delete this DRM policy?')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="px-6 py-4 bg-muted flex-row justify-end gap-3">
                        <AlertDialogCancel className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent">{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 border-0">{t('admin.delete', 'Delete')}</AlertDialogAction>
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
            {/* Keys Table */}
            <Card className="overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b border-border">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <Input
                            className="w-full pl-10 pr-4 py-2 bg-background rounded-lg border border-border focus:border-primary focus:ring-0 text-sm"
                            placeholder={t('admin.searchKeys', 'Search keys by Asset ID...')}
                            type="text"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedPolicy} onValueChange={v => setSelectedPolicy(v)}>
                            <SelectTrigger className="h-9 w-[180px] bg-background border border-border rounded-lg text-sm text-foreground">
                                <SelectValue placeholder={t('admin.selectDrmPolicy', 'Select Policy')}/>
                            </SelectTrigger>
                            <SelectContent>
                                {policies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="rounded-lg">
                            <ListFilter className="w-4 h-4 text-muted-foreground"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-lg">
                            <RefreshCw className="w-4 h-4 text-muted-foreground"/>
                        </Button>
                    </div>
                </div>
                <Table className="text-left">
                    <TableHeader>
                        <TableRow className="bg-accent/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border hover:bg-accent/30">
                            <TableHead className="px-6 py-4">{t('admin.drmKeyContentId', 'Key ID / Asset')}</TableHead>
                            <TableHead className="px-6 py-4">{t('admin.drmKeyId', 'Encryption Key (Masked)')}</TableHead>
                            <TableHead className="px-6 py-4">{t('admin.drmKeyStatus', 'Status')}</TableHead>
                            <TableHead className="px-6 py-4">{t('admin.drmKeyExpiresAt', 'Expiry Date')}</TableHead>
                            <TableHead className="px-6 py-4 text-right">{t('admin.actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/30">
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="py-12 text-center"><Spinner className="mx-auto"/></TableCell></TableRow>
                        ) : keys.length > 0 ? keys.map(k => (
                            <TableRow key={k.id} className="hover:bg-accent/30 transition-colors">
                                <TableCell className="px-6 py-4">
                                    <div className="text-sm font-semibold text-foreground">{k.content_id}</div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <code className="text-xs font-mono tracking-widest text-primary">•••••••• {k.key_id.substring(0, 4)} ••••</code>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    {k.expires_at && new Date(k.expires_at) > new Date() ? (
                                        <Badge variant="soft-success" className="flex items-center gap-1.5 w-fit">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500"/>
                                            {t('admin.licenseActive', 'Active')}
                                        </Badge>
                                    ) : (
                                        <Badge variant="soft-danger" className="flex items-center gap-1.5 w-fit">
                                            <span className="h-2 w-2 rounded-full bg-red-500"/>
                                            {t('admin.licenseExpired', 'Expired')}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="px-6 py-4 text-sm text-muted-foreground font-mono">{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : '-'}</TableCell>
                                <TableCell className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" className="text-primary hover:underline font-semibold">
                                            {t('admin.reveal', 'Reveal')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => { setDeletingKey(k); setDeleteDialogOpen(true); }}
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <div className="py-16 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-accent/50 rounded-full flex items-center justify-center mb-4">
                                            <Key size={32} className="text-muted-foreground"/>
                                        </div>
                                        <h3 className="text-base font-semibold text-foreground mb-1">{selectedPolicy ? t('admin.noDrmKeys', 'No keys found') : t('admin.selectDrmPolicyFirst', 'Select a policy first')}</h3>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Generate Dialog */}
            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                <DialogContent className="sm:max-w-[450px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <DialogHeader className="px-6 py-5 border-b border-border">
                        <DialogTitle className="text-lg font-semibold text-foreground">{t('admin.generateDrmKeyTitle', 'Generate DRM Key')}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.drmKeyContentId', 'Content ID')}</Label><Input value={generateForm.content_id} onChange={e => setGenerateForm({...generateForm, content_id: e.target.value})} placeholder="media-uuid"/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmKeyExpiresAt', 'Expires At')}</Label><Input type="datetime-local" value={generateForm.expires_at || ''} onChange={e => setGenerateForm({...generateForm, expires_at: e.target.value})}/></div>
                    </div>
                    <DialogFooter className="px-6 py-4 bg-muted flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleGenerate} disabled={!generateForm.content_id}>{t('admin.generate', 'Generate')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <AlertDialogHeader className="px-6 py-5 border-b border-border">
                        <AlertDialogTitle className="text-lg font-semibold text-foreground">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground mt-1">{t('admin.deleteDrmKeyConfirm', 'Are you sure you want to delete this DRM key?')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="px-6 py-4 bg-muted flex-row justify-end gap-3">
                        <AlertDialogCancel className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent">{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 border-0">{t('admin.delete', 'Delete')}</AlertDialogAction>
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
    const totalPages = Math.ceil(total / 20);

    const statusLabels: Record<string, {label: string; variant: 'soft-success' | 'soft-neutral' | 'soft-danger'}> = {
        active: {label: t('admin.licenseActive', 'Active'), variant: 'soft-success'},
        expired: {label: t('admin.licenseExpired', 'Expired'), variant: 'soft-neutral'},
        revoked: {label: t('admin.licenseRevoked', 'Revoked'), variant: 'soft-danger'},
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* License Traffic Chart */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="rounded-xl p-4">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-4">{t('admin.licenseTraffic', 'License Traffic')}</h4>
                    <div className="h-32 flex items-end gap-1 px-2">
                        <div className="w-full bg-primary/20 h-[30%] rounded-t-sm"/>
                        <div className="w-full bg-primary/20 h-[45%] rounded-t-sm"/>
                        <div className="w-full bg-primary/20 h-[60%] rounded-t-sm"/>
                        <div className="w-full bg-primary/40 h-[80%] rounded-t-sm"/>
                        <div className="w-full bg-primary h-[95%] rounded-t-sm"/>
                        <div className="w-full bg-primary h-[70%] rounded-t-sm"/>
                        <div className="w-full bg-primary/60 h-[50%] rounded-t-sm"/>
                    </div>
                    <div className="mt-4 text-center">
                        <div className="text-3xl font-bold text-foreground">{total.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{t('admin.licensesIssued24h', 'Licenses Issued (24h)')}</div>
                    </div>
                </Card>
            </div>

            {/* License Server Monitor + Table */}
            <div className="lg:col-span-3 space-y-6">
                <Card className="p-6 flex flex-col justify-center items-center text-center">
                    <div className="h-16 w-16 bg-accent/50 rounded-full flex items-center justify-center mb-4">
                        <BarChart3 className="w-8 h-8 text-muted-foreground"/>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{t('admin.licenseServerMonitor', 'License Server Monitor')}</h3>
                    <p className="text-muted-foreground max-w-sm">
                        {t('admin.licenseServerHealthy', 'License issuing servers are currently healthy.')}
                        {' '}
                        <span className="text-success">{t('admin.avgResponseTime', 'Average response time')}: 14ms</span>.
                    </p>
                    <Button variant="outline" className="mt-6">{t('admin.viewServerLogs', 'View Server Logs')}</Button>
                </Card>

                {/* Licenses Table */}
                <Card className="overflow-hidden">
                    <Table className="text-left">
                        <TableHeader>
                            <TableRow className="bg-accent/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border hover:bg-accent/30">
                                <TableHead className="px-6 py-4">{t('admin.drmLicenseKeyId', 'Key ID')}</TableHead>
                                <TableHead className="px-6 py-4">{t('admin.drmLicenseUserId', 'User ID')}</TableHead>
                                <TableHead className="px-6 py-4">{t('admin.drmLicenseDeviceId', 'Device ID')}</TableHead>
                                <TableHead className="px-6 py-4">{t('admin.drmLicenseStatus', 'Status')}</TableHead>
                                <TableHead className="px-6 py-4">{t('admin.drmLicenseIssuedAt', 'Issued')}</TableHead>
                                <TableHead className="px-6 py-4">{t('admin.drmLicenseExpiresAt', 'Expires')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/30">
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="py-12 text-center"><Spinner className="mx-auto"/></TableCell></TableRow>
                            ) : licenses.length > 0 ? licenses.map(l => {
                                const statusInfo = statusLabels[l.status] || {label: l.status, variant: 'soft-neutral' as const};
                                return (
                                    <TableRow key={l.id} className="hover:bg-accent/30 transition-colors">
                                        <TableCell className="px-6 py-4 text-sm text-foreground"><code className="text-xs bg-accent/50 px-1.5 py-0.5 rounded">{l.key_id.substring(0, 16)}...</code></TableCell>
                                        <TableCell className="px-6 py-4 text-sm text-foreground">{l.user_id ? <code className="text-xs bg-accent/50 px-1.5 py-0.5 rounded">{l.user_id.substring(0, 8)}...</code> : '-'}</TableCell>
                                        <TableCell className="px-6 py-4 text-sm text-foreground">{l.device_id ? <code className="text-xs bg-accent/50 px-1.5 py-0.5 rounded">{l.device_id.substring(0, 8)}...</code> : '-'}</TableCell>
                                        <TableCell className="px-6 py-4 text-sm"><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">{l.issued_at ? new Date(l.issued_at).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : '-'}</TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="py-16 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-accent/50 rounded-full flex items-center justify-center mb-4">
                                                <FileCheck size={32} className="text-muted-foreground"/>
                                            </div>
                                            <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.noDrmLicenses', 'No licenses found')}</h3>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {total > 20 && (
                        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} items</p>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                    <ChevronLeft size={16}/>
                                </Button>
                                {Array.from({length: totalPages}, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map(p => (
                                    <Button key={p} variant={p === page ? 'default' : 'ghost'} size="sm" className="h-8" onClick={() => setPage(p)}>{p}</Button>
                                ))}
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                    <ChevronRight size={16}/>
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
