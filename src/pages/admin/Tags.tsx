import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Tags as TagsIcon,
    Filter,
    Archive,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    X,
} from 'lucide-react';
import {tagApi, Tag, CreateTagRequest, UpdateTagRequest} from '@/lib/api/admin-tags';
import {formatDateTime} from '@/lib/format';
import {generateSlug} from '@/lib/utils/slug';
import {getTagColor} from '@/lib/utils/tag-color';
import {PAGINATION_CONFIG} from '@/config/pagination';
import TagColorPicker from '@/components/common/TagColorPicker';

const Tags: React.FC = () => {
    const {t} = useTranslation();
    const [searchParams, setSearchParams] = useState({search: '', page: 1, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [currentTag, setCurrentTag] = useState<Tag | null>(null);
    const [formData, setFormData] = useState<Partial<CreateTagRequest & UpdateTagRequest>>({
        name: '',
        slug: '',
        description: '',
        color: '',
        status: 'active',
    });
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    useEffect(() => {
        loadTags();
    }, [searchParams.page]);

    const loadTags = async (params = searchParams) => {
        setLoading(true);
        setError(null);
        try {
            const apiParams: any = {page: params.page, page_size: params.page_size};
            if (params.search) {
                apiParams.search = params.search;
            }
            const response = await tagApi.list(apiParams);
            const tagList = Array.isArray(response?.items) ? response.items : [];
            setTags(tagList);
            if (response?.total !== undefined) {
                setTotal(response.total);
                setTotalPages(Math.ceil(response.total / params.page_size));
            }
        } catch (err) {
            setError(t('admin.failedToLoadTags'));
            console.error('Error loading tags:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            slug: '',
            description: '',
            color: '',
            status: 'active',
        });
        setSlugManuallyEdited(false);
    };

    const handleCreate = async () => {
        try {
            await tagApi.create(formData as CreateTagRequest);
            await loadTags();
            setShowCreateDialog(false);
            resetForm();
        } catch (err) {
            console.error('Failed to create tag:', err);
        }
    };

    const handleUpdate = async () => {
        if (!currentTag) return;
        try {
            await tagApi.update(currentTag.id, formData as UpdateTagRequest);
            await loadTags();
            setShowEditDialog(false);
            resetForm();
            setCurrentTag(null);
        } catch (err) {
            console.error('Failed to update tag:', err);
        }
    };

    const handleDelete = async () => {
        if (!currentTag) return;
        try {
            await tagApi.delete(currentTag.id);
            await loadTags();
            setShowDeleteDialog(false);
            setCurrentTag(null);
        } catch (err) {
            console.error('Failed to delete tag:', err);
        }
    };

    const openCreateDialog = () => {
        resetForm();
        setShowCreateDialog(true);
    };

    const openEditDialog = (tag: Tag) => {
        setCurrentTag(tag);
        setFormData({
            name: tag.name,
            slug: tag.slug,
            description: tag.description || '',
            color: tag.color || '',
            status: tag.status,
        });
        setSlugManuallyEdited(true);
        setShowEditDialog(true);
    };

    const openDeleteDialog = (tag: Tag) => {
        setCurrentTag(tag);
        setShowDeleteDialog(true);
    };

    const handleReset = () => {
        const newParams = {search: '', page: 1, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE};
        setSearchParams(newParams);
        loadTags(newParams);
    };

    const handleSearchSubmit = () => {
        setSearchParams({...searchParams, page: 1});
        loadTags({...searchParams, page: 1});
    };

    const totalTags = tags.length;
    const activeTags = tags.length;
    const unusedTags = tags.filter(t => (t.count || 0) === 0).length;
    const colorAlerts = 0;

    const startItem = (searchParams.page - 1) * searchParams.page_size + 1;
    const endItem = Math.min(searchParams.page * searchParams.page_size, total);

    return (
        <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('admin.tags')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.manageTags')}</p>
                </div>
                <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                    onClick={openCreateDialog}
                >
                    <Plus className="w-4 h-4"/>
                    {t('admin.newTag')}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.tagTotal')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{totalTags}</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <TagsIcon className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.activeTags')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{activeTags}</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Filter className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.unusedTags', 'Unused Tags')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{unusedTags}</h3>
                        </div>
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Archive className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.colorAlerts', 'Color Alerts')}</p>
                            <h3 className="text-3xl font-extrabold tabular-nums text-red-600 mt-1">{colorAlerts}</h3>
                        </div>
                        <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <AlertTriangle className="w-5 h-5"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input
                        className="w-full pl-9 pr-4 h-9 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                        placeholder={t('admin.search') || t('admin.tags') + '...'}
                        type="text"
                        value={searchParams.search}
                        onChange={(e) => setSearchParams({...searchParams, search: e.target.value})}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    />
                </div>
                <button
                    className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                    onClick={handleReset}
                >
                    <RotateCcw className="w-3.5 h-3.5"/>
                    {t('admin.reset')}
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.id')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.tagName')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.slug')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.mediaCount')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.created')}</th>
                                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="animate-pulse text-slate-400">{t('admin.loadingTags')}</div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="text-red-500">{error}</div>
                                        <button
                                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                                            onClick={() => window.location.reload()}
                                        >
                                            {t('common.retry')}
                                        </button>
                                    </td>
                                </tr>
                            ) : tags.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        {t('admin.noTagsFound')}
                                    </td>
                                </tr>
                            ) : (
                                tags.map((tag) => (
                                    <tr key={tag.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-3.5 text-xs font-mono text-slate-500">{tag.id}</td>
                                        <td className="px-6 py-3.5 text-sm font-semibold text-slate-800">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{backgroundColor: getTagColor(tag)}}
                                                />
                                                {tag.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-600">{tag.slug}</code>
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-slate-700">{tag.count || 0}</td>
                                        <td className="px-6 py-3.5 text-sm text-slate-500">{formatDateTime(tag.create_time)}</td>
                                        <td className="px-6 py-3.5 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    onClick={() => openEditDialog(tag)}
                                                    title={t('admin.edit')}
                                                >
                                                    <Edit3 className="w-4 h-4"/>
                                                </button>
                                                <button
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    onClick={() => openDeleteDialog(tag)}
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
                </div>

                {/* Pagination */}
                {total > searchParams.page_size && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <p className="text-xs text-slate-500">
                            Showing {startItem} to {endItem} of {total} tags
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
                                disabled={searchParams.page <= 1}
                                onClick={() => setSearchParams({...searchParams, page: searchParams.page - 1})}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </button>
                            {Array.from({length: Math.min(totalPages, 3)}, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    className={`h-8 px-3 rounded-lg text-sm font-medium ${p === searchParams.page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50'}`}
                                    onClick={() => setSearchParams({...searchParams, page: p})}
                                >
                                    {p}
                                </button>
                            ))}
                            {totalPages > 3 && (
                                <button
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
                                    disabled={searchParams.page >= totalPages}
                                    onClick={() => setSearchParams({...searchParams, page: searchParams.page + 1})}
                                >
                                    <ChevronRight className="w-4 h-4"/>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Tag Modal */}
            {showCreateDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)}/>
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.newTag')}</h3>
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
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    type="text"
                                    placeholder={t('admin.enterTagName')}
                                    value={formData.name || ''}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        const newFormData: typeof formData = {...formData, name: newName};
                                        if (!slugManuallyEdited) {
                                            newFormData.slug = generateSlug(newName);
                                        }
                                        setFormData(newFormData);
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">
                                    {t('admin.slugLabel')} <span className="text-slate-400 font-normal">({t('admin.slugAutoHint')})</span>
                                </label>
                                <input
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    type="text"
                                    placeholder={t('admin.autoGeneratedFromName')}
                                    value={formData.slug || ''}
                                    onChange={(e) => {
                                        setSlugManuallyEdited(true);
                                        setFormData({...formData, slug: e.target.value});
                                    }}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">{t('admin.color')}</label>
                                <TagColorPicker
                                    value={formData.color || ''}
                                    onChange={(color: string) => setFormData({...formData, color})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.description')}</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    placeholder={t('admin.enterTagDescription')}
                                    rows={3}
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
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

            {/* Edit Tag Modal */}
            {showEditDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditDialog(false)}/>
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.editTag')}</h3>
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
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">
                                    {t('admin.slugLabel')} <span className="text-slate-400 font-normal">({t('admin.slugAutoHint')})</span>
                                </label>
                                <input
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    type="text"
                                    value={formData.slug || ''}
                                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">{t('admin.color')}</label>
                                <TagColorPicker
                                    value={formData.color || ''}
                                    onChange={(color: string) => setFormData({...formData, color})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">{t('admin.description')}</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                    placeholder={t('admin.enterTagDescription')}
                                    rows={3}
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
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

            {/* Delete Tag Modal */}
            {showDeleteDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteDialog(false)}/>
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">{t('admin.deleteTag')}</h3>
                            <button
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                onClick={() => setShowDeleteDialog(false)}
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600">{t('admin.deleteTagConfirm')}</p>
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

export default Tags;
