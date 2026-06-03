import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Tv,
    Users,
    CheckCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    X,
} from 'lucide-react';
import {adminApi, Channel} from '@/lib/api/admin';
import {usePagination} from '@/hooks/usePagination';
import {formatDateTime} from '@/lib/format';

const Channels: React.FC = () => {
    const {t} = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {page, pageSize, total, totalPages, setPage, setTotal, getParams} = usePagination();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
    const [formData, setFormData] = useState<Partial<Channel>>({
        name: '',
        short_token: '',
        description: '',
        status: 'active',
    });

    useEffect(() => {
        loadChannels();
    }, [page]);

    const loadChannels = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.getChannels(getParams());
            const channelList = Array.isArray(response?.items) ? response.items : [];
            setChannels(channelList);
            if (response?.total !== undefined) {
                setTotal(response.total);
            }
        } catch (err) {
            setError(t('admin.failedToLoadChannels'));
            console.error('Error loading channels:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            short_token: '',
            description: '',
            status: 'active',
        });
    };

    const handleCreate = async () => {
        try {
            await adminApi.createChannel(formData);
            await loadChannels();
            setShowCreateDialog(false);
            resetForm();
        } catch (err) {
            console.error('Failed to create channel:', err);
        }
    };

    const handleUpdate = async () => {
        if (!currentChannel) return;
        try {
            await adminApi.updateChannel(currentChannel.id, formData);
            await loadChannels();
            setShowEditDialog(false);
            resetForm();
            setCurrentChannel(null);
        } catch (err) {
            console.error('Failed to update channel:', err);
        }
    };

    const handleDelete = async () => {
        if (!currentChannel) return;
        try {
            await adminApi.deleteChannel(currentChannel.id);
            await loadChannels();
            setShowDeleteDialog(false);
            setCurrentChannel(null);
        } catch (err) {
            console.error('Failed to delete channel:', err);
        }
    };

    const openCreateDialog = () => {
        resetForm();
        setShowCreateDialog(true);
    };

    const openEditDialog = (channel: Channel) => {
        setCurrentChannel(channel);
        setFormData({
            name: channel.name,
            short_token: channel.short_token,
            description: channel.description,
            status: channel.status,
        });
        setShowEditDialog(true);
    };

    const openDeleteDialog = (channel: Channel) => {
        setCurrentChannel(channel);
        setShowDeleteDialog(true);
    };

    const filteredChannels = channels.filter(channel => {
        const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            channel.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || channel.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalSubscribers = channels.reduce((sum, c) => sum + (c.subscriber_count || 0), 0);
    const verifiedCount = channels.filter(c => c.status === 'verified').length;
    const pendingCount = channels.filter(c => c.status === 'pending').length;

    const getStatusBadge = (status: string) => {
        const config: Record<string, {bg: string; text: string; dot: string; label: string}> = {
            verified: {bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: t('common.verified')},
            active: {bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: t('admin.normal')},
            pending: {bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: t('admin.pending')},
            banned: {bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: t('admin.banned')},
        };
        const c = config[status] || config.active;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}${status === 'pending' ? ' animate-pulse' : ''}`}/>
                {c.label}
            </span>
        );
    };

    const formatNumber = (num: number | undefined | null) => {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 10000) return (num / 10000).toFixed(1) + t('common.wan');
        return num.toLocaleString();
    };

    const handleReset = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setCategoryFilter('all');
    };

    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
        <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('admin.channels')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.manageChannels')}</p>
                </div>
                <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                    onClick={openCreateDialog}
                >
                    <Plus className="w-4 h-4"/>
                    {t('admin.newChannel')}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.channelTotal')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{channels.length}</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Tv className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalSubscribers')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{formatNumber(totalSubscribers)}</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Users className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.verifiedChannels')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{verifiedCount}</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <CheckCircle className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.pending')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{pendingCount}</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Clock className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input
                            className="w-full pl-9 pr-4 h-9 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                            placeholder={t('admin.search') || t('admin.channels') + '...'}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">{t('admin.category')}: {t('admin.allStatus')}</option>
                        <option value="tech">Tech</option>
                        <option value="cooking">Cooking</option>
                        <option value="music">Music</option>
                        <option value="gaming">Gaming</option>
                    </select>
                    <select
                        className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">{t('admin.status')}: {t('admin.allStatus')}</option>
                        <option value="verified">{t('common.verified')}</option>
                        <option value="active">{t('admin.normal')}</option>
                        <option value="pending">{t('admin.pending')}</option>
                        <option value="banned">{t('admin.banned')}</option>
                    </select>
                    <button
                        className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                        onClick={handleReset}
                    >
                        <RotateCcw className="w-3.5 h-3.5"/>
                        {t('admin.reset')}
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.channel')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.owner')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.subscriberCount')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.videoCount')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.category')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.createdAt')}</th>
                            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center">
                                    <div className="animate-pulse text-slate-400">{t('admin.loadingChannels')}</div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center">
                                    <div className="text-red-500">{error}</div>
                                    <button
                                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                                        onClick={() => window.location.reload()}
                                    >
                                        {t('common.retry')}
                                    </button>
                                </td>
                            </tr>
                        ) : filteredChannels.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                    {t('admin.noChannelsFound')}
                                </td>
                            </tr>
                        ) : (
                            filteredChannels.map((channel) => (
                                <tr
                                    key={channel.id}
                                    className={`hover:bg-slate-50/50 transition-colors${channel.status === 'banned' ? ' bg-slate-50/30' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-3${channel.status === 'banned' ? ' opacity-60' : ''}`}>
                                            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                                {channel.name[0]}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-semibold text-slate-800${channel.status === 'banned' ? ' line-through' : ''}`}>
                                                    {channel.name}
                                                </p>
                                                <p className="text-xs text-slate-400 font-mono">@{channel.short_token}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{channel.user_id}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700 tabular-nums">{formatNumber(channel.subscriber_count)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700 tabular-nums">{channel.media_count || 0}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">-</span>
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(channel.status ?? 'active')}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(channel.create_time)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                onClick={() => openEditDialog(channel)}
                                                title={t('admin.edit')}
                                            >
                                                <Edit3 className="w-4 h-4"/>
                                            </button>
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                onClick={() => openDeleteDialog(channel)}
                                                title={t('admin.delete')}
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {total > pageSize && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Showing {startItem} to {endItem} of {total} channels
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </button>
                            {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        className={`h-8 px-3 rounded-lg text-sm font-medium ${pageNum === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && page < totalPages - 2 && (
                                <span className="text-slate-300 mx-1">...</span>
                            )}
                            {totalPages > 5 && page < totalPages - 2 && (
                                <button
                                    className="h-8 w-8 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                    onClick={() => setPage(totalPages)}
                                >
                                    {totalPages}
                                </button>
                            )}
                            <button
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            {showCreateDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)}/>
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.newChannel')}</h3>
                            <button
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                onClick={() => setShowCreateDialog(false)}
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.name')} *</label>
                                <input
                                    className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    placeholder={t('admin.enterChannelName')}
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.shortToken')} *</label>
                                <input
                                    className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    placeholder={t('admin.enterChannelShortToken')}
                                    type="text"
                                    value={formData.short_token || ''}
                                    onChange={(e) => setFormData({...formData, short_token: e.target.value})}
                                    maxLength={12}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">{t('admin.category')}</label>
                                    <select
                                        className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none"
                                        value={formData.category_id || ''}
                                        onChange={(e) => setFormData({...formData, category_id: e.target.value ? Number(e.target.value) : undefined})}
                                    >
                                        <option value="">-</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">{t('admin.status')}</label>
                                    <select
                                        className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none"
                                        value={formData.status || 'active'}
                                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    >
                                        <option value="active">{t('admin.active')}</option>
                                        <option value="verified">{t('admin.verified')}</option>
                                        <option value="pending">{t('admin.pending')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.description')}</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    placeholder={t('admin.enterChannelDescription')}
                                    rows={3}
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                onClick={() => setShowCreateDialog(false)}
                            >
                                {t('admin.cancel')}
                            </button>
                            <button
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                                onClick={handleCreate}
                            >
                                {t('admin.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Channel Modal */}
            {showEditDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditDialog(false)}/>
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.editChannel')}</h3>
                            <button
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                onClick={() => setShowEditDialog(false)}
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.name')} *</label>
                                <input
                                    className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    placeholder={t('admin.enterChannelName')}
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.shortToken')}</label>
                                <input
                                    className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    placeholder={t('admin.enterChannelShortToken')}
                                    type="text"
                                    value={formData.short_token || ''}
                                    onChange={(e) => setFormData({...formData, short_token: e.target.value})}
                                    maxLength={12}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">{t('admin.category')}</label>
                                    <select
                                        className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none"
                                        value={formData.category_id || ''}
                                        onChange={(e) => setFormData({...formData, category_id: e.target.value ? Number(e.target.value) : undefined})}
                                    >
                                        <option value="">-</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">{t('admin.status')}</label>
                                    <select
                                        className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none"
                                        value={formData.status || 'active'}
                                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    >
                                        <option value="active">{t('admin.active')}</option>
                                        <option value="verified">{t('admin.verified')}</option>
                                        <option value="pending">{t('admin.pending')}</option>
                                        <option value="banned">{t('admin.banned')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.description')}</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    placeholder={t('admin.enterChannelDescription')}
                                    rows={3}
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                onClick={() => setShowEditDialog(false)}
                            >
                                {t('admin.cancel')}
                            </button>
                            <button
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                                onClick={handleUpdate}
                            >
                                {t('admin.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Channel Modal */}
            {showDeleteDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteDialog(false)}/>
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.deleteChannel')}</h3>
                            <button
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                onClick={() => setShowDeleteDialog(false)}
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600">{t('admin.deleteChannelConfirm')}</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                onClick={() => setShowDeleteDialog(false)}
                            >
                                {t('admin.cancel')}
                            </button>
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                                onClick={handleDelete}
                            >
                                {t('admin.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Channels;
