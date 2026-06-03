import React, {useState} from 'react';
import {
    Shield, Plus, Edit, Trash2, Key, FileCheck, ChevronLeft, ChevronRight,
    Download, ShieldPlus,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Spinner} from '@/components/ui/spinner';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent} from '@/components/ui/dialog';
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

const StitchBadge: React.FC<{style: 'emerald' | 'slate' | 'amber' | 'red'; children: React.ReactNode; pulse?: boolean}> = ({style, children, pulse}) => {
    const styles = {
        emerald: 'bg-emerald-50 text-emerald-700',
        slate: 'bg-slate-100 text-slate-600',
        amber: 'bg-amber-50 text-amber-700',
        red: 'bg-red-50 text-red-700',
    };
    const dotStyles = {
        emerald: 'bg-emerald-500',
        slate: 'bg-slate-400',
        amber: 'bg-amber-500',
        red: 'bg-red-500',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[style]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[style]}${pulse ? ' animate-pulse' : ''}`}></span>
            {children}
        </span>
    );
};

export default function DRMPage() {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState('policies');

    return (
        <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                        <Shield className="h-6 w-6 text-indigo-600"/>
                        {t('admin.drmManagement', 'DRM Management')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.drmManagementDesc', 'Configure digital rights policies, encryption keys, and license issuance rules.')}</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4"/>
                        {t('admin.exportLogs', 'Export Logs')}
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2">
                        <ShieldPlus className="w-4 h-4"/>
                        {t('admin.createPolicy', 'Create Policy')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white">
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'policies' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('policies')}>{t('admin.drmPolicies', 'Policies')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'keys' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('keys')}>{t('admin.drmKeys', 'Keys')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'licenses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('licenses')}>{t('admin.drmLicenses', 'Licenses')}</button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'policies' && <PoliciesTab/>}
                {activeTab === 'keys' && <KeysTab/>}
                {activeTab === 'licenses' && <LicensesTab/>}
            </div>
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
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                            <th className="px-6 py-4">{t('admin.drmPolicyName', 'Name')}</th>
                            <th className="px-6 py-4">{t('admin.drmPolicyType', 'Type')}</th>
                            <th className="px-6 py-4">{t('admin.drmPolicyDefault', 'Default')}</th>
                            <th className="px-6 py-4">{t('admin.drmPolicyDescription', 'Description')}</th>
                            <th className="px-6 py-4 text-right">{t('admin.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                        ) : policies.length > 0 ? policies.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{p.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-700">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{typeLabels[p.type] || p.type}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700">
                                    {p.is_default ? <StitchBadge style="emerald">{t('admin.enabled', 'Enabled')}</StitchBadge> : <span className="text-xs text-slate-400">-</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate">{p.description || '-'}</td>
                                <td className="px-6 py-4 text-sm text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditDialog(p)}>
                                            <Edit className="w-4 h-4"/>
                                        </button>
                                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setEditingItem(p); setDeleteDialogOpen(true); }}>
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5}>
                                    <div className="py-16 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <Shield size={32} className="text-slate-300"/>
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noDrmPolicies', 'No DRM policies found')}</h3>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.addDrmPolicyTitle', 'Add DRM Policy')}</h3>
                    </div>
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
                            <input type="checkbox" id="create-policy-default" checked={createForm.is_default ?? false} onChange={e => setCreateForm({...createForm, is_default: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="create-policy-default">{t('admin.drmPolicyDefault', 'Default')}</Label>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.name}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editDrmPolicy', 'Edit DRM Policy')}</h3>
                    </div>
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
                            <input type="checkbox" id="edit-policy-default" checked={editForm.is_default} onChange={e => setEditForm({...editForm, is_default: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-policy-default">{t('admin.drmPolicyDefault', 'Default')}</Label>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleUpdate} disabled={!editForm.name}>{t('common.save', 'Save')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteDrmPolicyConfirm', 'Are you sure you want to delete this DRM policy?')}</AlertDialogDescription>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <AlertDialogCancel className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 border-0">{t('admin.delete', 'Delete')}</AlertDialogAction>
                    </div>
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
            {/* Search / Filter Bar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input className="h-9 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm max-w-sm focus:outline-none focus:ring-1 focus:ring-indigo-600" placeholder={t('admin.searchKeys', 'Search keys by Asset ID...')} type="text"/>
                    </div>
                    <select className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700" value={selectedPolicy} onChange={e => setSelectedPolicy(e.target.value)}>
                        <option value="">{t('admin.selectDrmPolicy', 'Select Policy')}</option>
                        {policies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setGenerateDialogOpen(true)} disabled={!selectedPolicy} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        <Plus className="w-4 h-4"/>
                        {t('admin.generateKey', 'Generate Key')}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                            <th className="px-6 py-4">{t('admin.drmKeyContentId', 'Key ID / Asset')}</th>
                            <th className="px-6 py-4">{t('admin.drmKeyId', 'Encryption Key (Masked)')}</th>
                            <th className="px-6 py-4">{t('admin.drmKeyStatus', 'Status')}</th>
                            <th className="px-6 py-4">{t('admin.drmKeyExpiresAt', 'Expiry Date')}</th>
                            <th className="px-6 py-4 text-right">{t('admin.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                        ) : keys.length > 0 ? keys.map(k => (
                            <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-semibold text-slate-700">{k.content_id}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded tracking-widest text-slate-500">•••••••• {k.key_id.substring(0, 4)} ••••</code>
                                </td>
                                <td className="px-6 py-4">
                                    <StitchBadge style={k.expires_at && new Date(k.expires_at) > new Date() ? 'emerald' : 'red'}>
                                        {k.expires_at && new Date(k.expires_at) > new Date() ? t('admin.licenseActive', 'Active') : t('admin.licenseExpired', 'Expired')}
                                    </StitchBadge>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setDeletingKey(k); setDeleteDialogOpen(true); }}>
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5}>
                                    <div className="py-16 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <Key size={32} className="text-slate-300"/>
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-700 mb-1">{selectedPolicy ? t('admin.noDrmKeys', 'No keys found') : t('admin.selectDrmPolicyFirst', 'Select a policy first')}</h3>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                <DialogContent className="sm:max-w-[450px] p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.generateDrmKeyTitle', 'Generate DRM Key')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.drmKeyContentId', 'Content ID')}</Label><Input value={generateForm.content_id} onChange={e => setGenerateForm({...generateForm, content_id: e.target.value})} placeholder="media-uuid"/></div>
                        <div className="grid gap-2"><Label>{t('admin.drmKeyExpiresAt', 'Expires At')}</Label><Input type="datetime-local" value={generateForm.expires_at || ''} onChange={e => setGenerateForm({...generateForm, expires_at: e.target.value})}/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setGenerateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleGenerate} disabled={!generateForm.content_id}>{t('admin.generate', 'Generate')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteDrmKeyConfirm', 'Are you sure you want to delete this DRM key?')}</AlertDialogDescription>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <AlertDialogCancel className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 border-0">{t('admin.delete', 'Delete')}</AlertDialogAction>
                    </div>
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

    const statusLabels: Record<string, {label: string; style: 'emerald' | 'slate' | 'amber' | 'red'}> = {
        active: {label: t('admin.licenseActive', 'Active'), style: 'emerald'},
        expired: {label: t('admin.licenseExpired', 'Expired'), style: 'slate'},
        revoked: {label: t('admin.licenseRevoked', 'Revoked'), style: 'red'},
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                        <th className="px-6 py-4">{t('admin.drmLicenseKeyId', 'Key ID')}</th>
                        <th className="px-6 py-4">{t('admin.drmLicenseUserId', 'User ID')}</th>
                        <th className="px-6 py-4">{t('admin.drmLicenseDeviceId', 'Device ID')}</th>
                        <th className="px-6 py-4">{t('admin.drmLicenseStatus', 'Status')}</th>
                        <th className="px-6 py-4">{t('admin.drmLicenseIssuedAt', 'Issued')}</th>
                        <th className="px-6 py-4">{t('admin.drmLicenseExpiresAt', 'Expires')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                        <tr><td colSpan={6} className="py-12 text-center"><Spinner className="mx-auto"/></td></tr>
                    ) : licenses.length > 0 ? licenses.map(l => {
                        const statusInfo = statusLabels[l.status] || {label: l.status, style: 'slate' as const};
                        return (
                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-700"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{l.key_id.substring(0, 16)}...</code></td>
                                <td className="px-6 py-4 text-sm text-slate-700">{l.user_id ? <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{l.user_id.substring(0, 8)}...</code> : '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-700">{l.device_id ? <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{l.device_id.substring(0, 8)}...</code> : '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-700"><StitchBadge style={statusInfo.style}>{statusInfo.label}</StitchBadge></td>
                                <td className="px-6 py-4 text-sm text-slate-500">{l.issued_at ? new Date(l.issued_at).toLocaleDateString() : '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : '-'}</td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan={6}>
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <FileCheck size={32} className="text-slate-300"/>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noDrmLicenses', 'No licenses found')}</h3>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {total > 20 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} items</p>
                    <div className="flex items-center gap-1">
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={16}/>
                        </button>
                        {Array.from({length: totalPages}, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map(p => (
                            <button key={p} className={`h-8 px-3 rounded-lg text-sm font-medium ${p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setPage(p)}>{p}</button>
                        ))}
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
