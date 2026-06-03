import React, {useState} from 'react';
import {
    Megaphone, Plus, Edit, Trash2, Send, FileText, BarChart3, Clock, ChevronLeft, ChevronRight,
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
import {Textarea} from '@/components/ui/textarea';
import {
    useAdminPromotionChannels, useCreatePromotionChannel, useUpdatePromotionChannel, useDeletePromotionChannel,
    useAdminPromotionTemplates, useCreatePromotionTemplate, useUpdatePromotionTemplate, useDeletePromotionTemplate,
    useAdminPromotionTasks, useCreatePromotionTask, useDeletePromotionTask,
    useAdminPromotionLogs,
} from '@/hooks/queries';
import {type PromotionChannel, type PromotionTemplate, type PromotionTask, type PromotionLog,
    type CreatePromotionChannelRequest, type CreatePromotionTemplateRequest, type CreatePromotionTaskRequest} from '@/lib/api/promotion';

const platformLabels: Record<string, string> = {
    telegram: 'Telegram',
    discord: 'Discord',
    twitter: 'Twitter/X',
    wechat: 'WeChat',
    weibo: 'Weibo',
    rss: 'RSS',
    email: 'Email',
};

const taskStatusConfig: Record<string, {label: string; style: 'emerald' | 'slate' | 'amber' | 'red'}> = {
    pending: {label: 'Pending', style: 'amber'},
    scheduled: {label: 'Scheduled', style: 'slate'},
    running: {label: 'Running', style: 'emerald'},
    completed: {label: 'Completed', style: 'emerald'},
    failed: {label: 'Failed', style: 'red'},
    cancelled: {label: 'Cancelled', style: 'slate'},
};

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

export default function PromotionPage() {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState('channels');

    return (
        <div className="space-y-4 p-4 md:p-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                    <Megaphone className="h-6 w-6"/>{t('admin.promotionCenter', 'Promotion Center')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{t('admin.promotionDesc', 'Manage promotion channels, templates, and publishing tasks')}</p>
            </div>

            <div className="flex border-b border-slate-200 bg-white mb-6">
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'channels' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('channels')}>{t('admin.channels', 'Channels')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'templates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('templates')}>{t('admin.templates', 'Templates')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('tasks')}>{t('admin.tasks', 'Tasks')}</button>
                <button className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setActiveTab('logs')}>{t('admin.logs', 'Logs')}</button>
            </div>

            {activeTab === 'channels' && <ChannelsTab/>}
            {activeTab === 'templates' && <TemplatesTab/>}
            {activeTab === 'tasks' && <TasksTab/>}
            {activeTab === 'logs' && <LogsTab/>}
        </div>
    );
}

const ChannelsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: channelsData, isLoading} = useAdminPromotionChannels({page, page_size: 20});
    const createMutation = useCreatePromotionChannel();
    const updateMutation = useUpdatePromotionChannel();
    const deleteMutation = useDeletePromotionChannel();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PromotionChannel | null>(null);
    const [createForm, setCreateForm] = useState<CreatePromotionChannelRequest>({name: '', platform: 'telegram', config: {}});
    const [editForm, setEditForm] = useState({name: '', config: {} as Record<string, string>, is_active: true});

    const channels = channelsData?.items || [];
    const total = channelsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', platform: 'telegram', config: {}});
        } catch (err) { console.error('Failed to create channel:', err); }
    };

    const openEditDialog = (ch: PromotionChannel) => {
        setEditingItem(ch);
        setEditForm({name: ch.name, config: ch.config, is_active: ch.is_active});
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        try {
            await updateMutation.mutateAsync({id: editingItem.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) { console.error('Failed to update channel:', err); }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            await deleteMutation.mutateAsync(editingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) { console.error('Failed to delete channel:', err); }
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><Send className="w-5 h-5"/>{t('admin.promotionChannels', 'Promotion Channels')}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{t('admin.promotionChannelsDesc', 'Configure publishing channels')}</p>
                    </div>
                    <button onClick={() => setCreateDialogOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4 mr-2 inline"/>{t('admin.addChannel', 'Add Channel')}</button>
                </div>
                <div className="p-6">
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.channelName', 'Name')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.platform', 'Platform')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status', 'Status')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.published', 'Published')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.lastPublished', 'Last Published')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {channels.length > 0 ? channels.map(ch => (
                                        <tr key={ch.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">{ch.name}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{platformLabels[ch.platform] || ch.platform}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <StitchBadge style={ch.is_active ? 'emerald' : 'slate'}>{ch.is_active ? t('admin.active', 'Active') : t('admin.inactive', 'Inactive')}</StitchBadge>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">{ch.total_published}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-500">{ch.last_published_at ? new Date(ch.last_published_at).toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-3.5 text-sm text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditDialog(ch)}><Edit className="w-4 h-4"/></button>
                                                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setEditingItem(ch); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                        <Send size={32} className="text-slate-300"/>
                                                    </div>
                                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noChannels', 'No channels found')}</h3>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
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
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.addChannel', 'Add Channel')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.channelName', 'Name')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="My Channel"/></div>
                        <div className="grid gap-2"><Label>{t('admin.platform', 'Platform')}</Label>
                            <Select value={createForm.platform} onValueChange={v => setCreateForm({...createForm, platform: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="telegram">Telegram</SelectItem>
                                    <SelectItem value="discord">Discord</SelectItem>
                                    <SelectItem value="twitter">Twitter/X</SelectItem>
                                    <SelectItem value="wechat">WeChat</SelectItem>
                                    <SelectItem value="weibo">Weibo</SelectItem>
                                    <SelectItem value="rss">RSS</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.name}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editChannel', 'Edit Channel')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.channelName', 'Name')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="edit-channel-active" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-channel-active">{t('admin.active', 'Active')}</Label>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleUpdate}>{t('common.save', 'Save')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteChannelConfirm', 'Are you sure you want to delete this channel?')}</AlertDialogDescription>
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

const TemplatesTab: React.FC = () => {
    const {t} = useTranslation();
    const {data: templatesData, isLoading} = useAdminPromotionTemplates();
    const createMutation = useCreatePromotionTemplate();
    const updateMutation = useUpdatePromotionTemplate();
    const deleteMutation = useDeletePromotionTemplate();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PromotionTemplate | null>(null);
    const [createForm, setCreateForm] = useState<CreatePromotionTemplateRequest>({name: '', platform: 'telegram', content_template: ''});
    const [editForm, setEditForm] = useState({name: '', content_template: '', is_active: true});

    const templates = (templatesData as PromotionTemplate[] | undefined) || [];

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({name: '', platform: 'telegram', content_template: ''});
        } catch (err) { console.error('Failed to create template:', err); }
    };

    const openEditDialog = (tpl: PromotionTemplate) => {
        setEditingItem(tpl);
        setEditForm({name: tpl.name, content_template: tpl.content_template, is_active: tpl.is_active});
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        try {
            await updateMutation.mutateAsync({id: editingItem.id, data: editForm});
            setEditDialogOpen(false);
        } catch (err) { console.error('Failed to update template:', err); }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            await deleteMutation.mutateAsync(editingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) { console.error('Failed to delete template:', err); }
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5"/>{t('admin.promotionTemplates', 'Promotion Templates')}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{t('admin.promotionTemplatesDesc', 'Create reusable content templates')}</p>
                    </div>
                    <button onClick={() => setCreateDialogOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4 mr-2 inline"/>{t('admin.addTemplate', 'Add Template')}</button>
                </div>
                <div className="p-6">
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.templateName', 'Name')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.platform', 'Platform')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status', 'Status')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.usageCount', 'Usage Count')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {templates.length > 0 ? templates.map(tpl => (
                                        <tr key={tpl.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">{tpl.name}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{platformLabels[tpl.platform] || tpl.platform}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <StitchBadge style={tpl.is_active ? 'emerald' : 'slate'}>{tpl.is_active ? t('admin.active', 'Active') : t('admin.inactive', 'Inactive')}</StitchBadge>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">{tpl.usage_count}</td>
                                            <td className="px-6 py-3.5 text-sm text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditDialog(tpl)}><Edit className="w-4 h-4"/></button>
                                                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setEditingItem(tpl); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5}>
                                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                        <FileText size={32} className="text-slate-300"/>
                                                    </div>
                                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noTemplates', 'No templates found')}</h3>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.addTemplate', 'Add Template')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.templateName', 'Name')}</Label><Input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="Video Release Template"/></div>
                        <div className="grid gap-2"><Label>{t('admin.platform', 'Platform')}</Label>
                            <Select value={createForm.platform} onValueChange={v => setCreateForm({...createForm, platform: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="telegram">Telegram</SelectItem>
                                    <SelectItem value="discord">Discord</SelectItem>
                                    <SelectItem value="twitter">Twitter/X</SelectItem>
                                    <SelectItem value="wechat">WeChat</SelectItem>
                                    <SelectItem value="weibo">Weibo</SelectItem>
                                    <SelectItem value="rss">RSS</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>{t('admin.contentTemplate', 'Content Template')}</Label><Textarea value={createForm.content_template} onChange={e => setCreateForm({...createForm, content_template: e.target.value})} placeholder="New video: {{title}} - {{url}}" rows={4}/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.name || !createForm.content_template}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.editTemplate', 'Edit Template')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.templateName', 'Name')}</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div className="grid gap-2"><Label>{t('admin.contentTemplate', 'Content Template')}</Label><Textarea value={editForm.content_template} onChange={e => setEditForm({...editForm, content_template: e.target.value})} rows={4}/></div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="edit-template-active" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4 rounded border-border"/>
                            <Label htmlFor="edit-template-active">{t('admin.active', 'Active')}</Label>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleUpdate}>{t('common.save', 'Save')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteTemplateConfirm', 'Are you sure you want to delete this template?')}</AlertDialogDescription>
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

const TasksTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: tasksData, isLoading} = useAdminPromotionTasks({page, page_size: 20});
    const createMutation = useCreatePromotionTask();
    const deleteMutation = useDeletePromotionTask();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<PromotionTask | null>(null);
    const [createForm, setCreateForm] = useState<CreatePromotionTaskRequest>({title: '', channel_id: '', template_id: '', media_id: ''});

    const tasks = tasksData?.items || [];
    const total = tasksData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(createForm);
            setCreateDialogOpen(false);
            setCreateForm({title: '', channel_id: '', template_id: '', media_id: ''});
        } catch (err) { console.error('Failed to create task:', err); }
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            await deleteMutation.mutateAsync(deletingItem.id);
            setDeleteDialogOpen(false);
        } catch (err) { console.error('Failed to delete task:', err); }
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><Clock className="w-5 h-5"/>{t('admin.promotionTasks', 'Promotion Tasks')}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{t('admin.promotionTasksDesc', 'Manage content publishing tasks')}</p>
                    </div>
                    <button onClick={() => setCreateDialogOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4 mr-2 inline"/>{t('admin.addTask', 'Add Task')}</button>
                </div>
                <div className="p-6">
                    {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.taskTitle', 'Title')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status', 'Status')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.scheduledAt', 'Scheduled')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.publishedAt', 'Published')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.error', 'Error')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {tasks.length > 0 ? tasks.map(task => {
                                        const sc = taskStatusConfig[task.status] || taskStatusConfig.pending;
                                        return (
                                            <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">{task.title}</td>
                                                <td className="px-6 py-3.5 text-sm text-slate-700">
                                                    <StitchBadge style={sc.style} pulse={task.status === 'running' || task.status === 'pending'}>{sc.label}</StitchBadge>
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-500">{task.scheduled_at ? new Date(task.scheduled_at).toLocaleString() : '-'}</td>
                                                <td className="px-6 py-3.5 text-sm text-slate-500">{task.published_at ? new Date(task.published_at).toLocaleString() : '-'}</td>
                                                <td className="px-6 py-3.5 text-sm text-red-600 max-w-[200px] truncate">{task.error_message || '-'}</td>
                                                <td className="px-6 py-3.5 text-sm text-right">
                                                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" onClick={() => { setDeletingItem(task); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4"/></button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                        <Clock size={32} className="text-slate-300"/>
                                                    </div>
                                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noTasks', 'No tasks found')}</h3>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
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
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{t('admin.addTask', 'Add Task')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid gap-2"><Label>{t('admin.taskTitle', 'Title')}</Label><Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="Promote new video"/></div>
                        <div className="grid gap-2"><Label>{t('admin.channelId', 'Channel ID')}</Label><Input value={createForm.channel_id} onChange={e => setCreateForm({...createForm, channel_id: e.target.value})} placeholder="UUID"/></div>
                        <div className="grid gap-2"><Label>{t('admin.templateId', 'Template ID')}</Label><Input value={createForm.template_id} onChange={e => setCreateForm({...createForm, template_id: e.target.value})} placeholder="UUID"/></div>
                        <div className="grid gap-2"><Label>{t('admin.mediaId', 'Media ID')}</Label><Input value={createForm.media_id} onChange={e => setCreateForm({...createForm, media_id: e.target.value})} placeholder="UUID"/></div>
                        <div className="grid gap-2"><Label>{t('admin.scheduledAt', 'Scheduled At')}</Label><Input type="datetime-local" value={createForm.scheduled_at || ''} onChange={e => setCreateForm({...createForm, scheduled_at: e.target.value})}/></div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" onClick={handleCreate} disabled={!createForm.title || !createForm.channel_id}>{t('common.add', 'Add')}</button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <AlertDialogTitle className="text-lg font-semibold text-slate-800">{t('admin.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-slate-500 mt-1">{t('admin.deleteTaskConfirm', 'Are you sure you want to delete this task?')}</AlertDialogDescription>
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

const LogsTab: React.FC = () => {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const {data: logsData, isLoading} = useAdminPromotionLogs({page, page_size: 20});

    const logs = logsData?.items || [];
    const total = logsData?.total || 0;
    const totalPages = Math.ceil(total / 20);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5"/>{t('admin.promotionLogs', 'Promotion Logs')}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{t('admin.promotionLogsDesc', 'View publishing activity logs')}</p>
            </div>
            <div className="p-6">
                {isLoading ? <div className="py-12 text-center"><Spinner className="mx-auto"/></div> : (
                    <>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.action', 'Action')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status', 'Status')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.message', 'Message')}</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.time', 'Time')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {logs.length > 0 ? logs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{log.action}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700">
                                                <StitchBadge style={log.status === 'success' ? 'emerald' : 'red'}>{log.status}</StitchBadge>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-700 max-w-[300px] truncate">{log.message || '-'}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-500">{new Date(log.create_time).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4}>
                                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                        <BarChart3 size={32} className="text-slate-300"/>
                                                    </div>
                                                    <h3 className="text-base font-semibold text-slate-700 mb-1">{t('admin.noLogs', 'No logs found')}</h3>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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
                    </>
                )}
            </div>
        </div>
    );
};
