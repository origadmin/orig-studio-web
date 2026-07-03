import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
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
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {adminTagApi, Tag, CreateTagRequest, UpdateTagRequest} from '@/lib/api/admin-tags';
import {formatDateTime} from '@/lib/format';
import {generateSlug} from '@/lib/utils/slug';
import {getTagColor} from '@/lib/utils/tag-color';
import {PAGINATION_CONFIG} from '@/config/pagination';
import TagColorPicker from '@/components/common/TagColorPicker';

type SortKey = 'latest' | 'oldest' | 'name_asc' | 'name_desc' | 'count_desc';

const Tags: React.FC = () => {
    const {t} = useTranslation();
    const [searchParams, setSearchParams] = useState({search: '', page: 1, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});
    const [sortBy, setSortBy] = useState<SortKey>('latest');
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
        title: '',
        slug: '',
        description: '',
        color: '',
        status: 'active',
    });
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    useEffect(() => {
        loadTags();
    }, [searchParams.page, sortBy]);

    const loadTags = async (params = searchParams) => {
        setLoading(true);
        setError(null);
        try {
            const apiParams: Record<string, string | number> = {page: params.page, page_size: params.page_size};
            if (params.search) {
                apiParams.search = params.search;
            }
            // Map sortBy to API params
            const sortMap: Record<SortKey, { sort_by: string; sort_order: string }> = {
                latest: {sort_by: 'create_time', sort_order: 'desc'},
                oldest: {sort_by: 'create_time', sort_order: 'asc'},
                name_asc: {sort_by: 'title', sort_order: 'asc'},
                name_desc: {sort_by: 'title', sort_order: 'desc'},
                count_desc: {sort_by: 'media_count', sort_order: 'desc'},
            };
            const sort = sortMap[sortBy];
            if (sort) {
                apiParams.sort_by = sort.sort_by;
                apiParams.sort_order = sort.sort_order;
            }
            const response = await adminTagApi.list(apiParams);
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
            title: '',
            slug: '',
            description: '',
            color: '',
            status: 'active',
        });
        setSlugManuallyEdited(false);
    };

    const handleCreate = async () => {
        try {
            await adminTagApi.create(formData as CreateTagRequest);
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
            await adminTagApi.update(currentTag.id, formData as UpdateTagRequest);
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
            await adminTagApi.delete(currentTag.id);
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
            title: tag.title,
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
        setSortBy('latest');
        loadTags(newParams);
    };

    const handleSearchSubmit = () => {
        setSearchParams({...searchParams, page: 1});
        loadTags({...searchParams, page: 1});
    };

    const totalTags = tags.length;
    const activeTags = tags.length;
    const unusedTags = tags.filter(tag => (tag.count || 0) === 0).length;
    const colorAlerts = 0;

    const startItem = (searchParams.page - 1) * searchParams.page_size + 1;
    const endItem = Math.min(searchParams.page * searchParams.page_size, total);

    return (
        <div className="p-8">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.tags', '标签')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <TagsIcon className="w-6 h-6 text-indigo-600"/>
                        {t('admin.tagManagement', 'Tag Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.manageTags', 'Organize global metadata taxonomies and color schemes.')}
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4"/>
                    {t('admin.createNewTag', 'Create New Tag')}
                </Button>
            </div>

            {/* Stats Bento */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('admin.tagTotal', 'Total Tags')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{totalTags}</h3>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <TagsIcon className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('admin.activeTags', 'Active Filters')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{activeTags}</h3>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Filter className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('admin.unusedTags', 'Unused Tags')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{unusedTags}</h3>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Archive className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('admin.colorAlerts', 'Color Alerts')}
                                </p>
                                <h3 className="text-3xl font-extrabold tabular-nums text-red-600 mt-1">{colorAlerts}</h3>
                            </div>
                            <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <AlertTriangle className="w-5 h-5"/>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10"/>
                    <Input
                        className="pl-9"
                        placeholder={t('admin.searchTags', 'Search tags, metadata, or colors...')}
                        type="text"
                        value={searchParams.search}
                        onChange={(e) => setSearchParams({...searchParams, search: e.target.value})}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    />
                </div>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortKey)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="latest">{t('admin.sortLatest', 'Sort: Latest')}</SelectItem>
                        <SelectItem value="oldest">{t('admin.sortOldest', 'Sort: Oldest')}</SelectItem>
                        <SelectItem value="name_asc">{t('admin.sortNameAsc', 'Sort: Name A–Z')}</SelectItem>
                        <SelectItem value="name_desc">{t('admin.sortNameDesc', 'Sort: Name Z–A')}</SelectItem>
                        <SelectItem value="count_desc">{t('admin.sortMostUsed', 'Sort: Most Used')}</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="w-3.5 h-3.5"/>
                    {t('admin.reset', 'Reset')}
                </Button>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.id', 'ID')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.tagName', 'Name')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.slug', 'Slug')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.mediaCount', 'Media Count')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('admin.created', 'Date Created')}
                            </TableHead>
                            <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                                {t('admin.actions', 'Actions')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-50">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-6 py-12 text-center">
                                    <div className="animate-pulse text-muted-foreground">{t('admin.loadingTags', 'Loading tags...')}</div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-6 py-12 text-center">
                                    <div className="text-red-500">{error}</div>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => window.location.reload()}
                                    >
                                        {t('common.retry', 'Retry')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : tags.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                    {t('admin.noTagsFound', 'No tags found')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            tags.map((tag) => (
                                <TableRow key={tag.id} className="group">
                                    <TableCell className="px-6 py-3.5 text-xs font-mono text-muted-foreground">{tag.id}</TableCell>
                                    <TableCell className="px-6 py-3.5 text-sm font-semibold text-foreground">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{backgroundColor: getTagColor(tag)}}
                                            />
                                            {tag.title}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-3.5">
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground">{tag.slug}</code>
                                    </TableCell>
                                    <TableCell className="px-6 py-3.5 text-sm text-card-foreground">{tag.count || 0}</TableCell>
                                    <TableCell className="px-6 py-3.5 text-sm text-muted-foreground">{formatDateTime(tag.create_time)}</TableCell>
                                    <TableCell className="px-6 py-3.5 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                                                onClick={() => openEditDialog(tag)}
                                                title={t('admin.edit', 'Edit')}
                                            >
                                                <Edit3 className="w-4 h-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                onClick={() => openDeleteDialog(tag)}
                                                title={t('admin.delete', 'Delete')}
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {total > searchParams.page_size && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                            {t('admin.showingRange', 'Showing {{from}} to {{to}} of {{total}} tags')
                                .replace('{{from}}', String(startItem))
                                .replace('{{to}}', String(endItem))
                                .replace('{{total}}', String(total))}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon-sm"
                                disabled={searchParams.page <= 1}
                                onClick={() => setSearchParams({...searchParams, page: searchParams.page - 1})}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </Button>
                            {Array.from({length: Math.min(totalPages, 3)}, (_, i) => i + 1).map(p => (
                                <Button
                                    key={p}
                                    variant={p === searchParams.page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSearchParams({...searchParams, page: p})}
                                >
                                    {p}
                                </Button>
                            ))}
                            {totalPages > 3 && (
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={searchParams.page >= totalPages}
                                    onClick={() => setSearchParams({...searchParams, page: searchParams.page + 1})}
                                >
                                    <ChevronRight className="w-4 h-4"/>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Card>

            {/* Create Tag Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.newTag', 'New Tag')}</DialogTitle>
                        <DialogDescription>{t('admin.createTagDescription', 'Create a new tag for organizing content.')}</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t('admin.tagName', 'Tag Name')} *</Label>
                            <Input
                                type="text"
                                placeholder={t('admin.enterTagName', 'Enter tag name')}
                                value={formData.title || ''}
                                onChange={(e) => {
                                    const newName = e.target.value;
                                    const newFormData: typeof formData = {...formData, title: newName};
                                    if (!slugManuallyEdited) {
                                        newFormData.slug = generateSlug(newName);
                                    }
                                    setFormData(newFormData);
                                }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                {t('admin.slugLabel', 'Slug Identifier')}
                            </Label>
                            <Input
                                    className="text-xs font-mono text-muted-foreground"
                                    type="text"
                                    placeholder={t('admin.autoGeneratedFromName', 'Auto-generated from name')}
                                    value={formData.slug || ''}
                                    onChange={(e) => {
                                        setSlugManuallyEdited(true);
                                        setFormData({...formData, slug: e.target.value});
                                    }}
                                />
                            </div>
                            <div className="space-y-3">
                                <Label>{t('admin.color', 'Color')}</Label>
                                <TagColorPicker
                                    value={formData.color || ''}
                                    onChange={(color: string) => setFormData({...formData, color})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('admin.description', 'Description')}</Label>
                                <Textarea
                                    placeholder={t('admin.enterTagDescription', 'Enter tag description')}
                                    rows={3}
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                {t('admin.cancel', 'Cancel')}
                            </Button>
                            <Button onClick={handleCreate}>
                                {t('admin.create', 'Create')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Tag Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('admin.editTag', 'Edit Tag')}</DialogTitle>
                            <DialogDescription>{t('admin.editTagDescription', 'Modify the tag details.')}</DialogDescription>
                        </DialogHeader>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <Label>{t('admin.tagName', 'Tag Name')} *</Label>
                                <Input
                                    type="text"
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>
                                    {t('admin.slugLabel', 'Slug Identifier')}
                                </Label>
                                <Input
                                    className="text-xs font-mono text-muted-foreground"
                                    type="text"
                                    value={formData.slug || ''}
                                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                />
                        </div>
                        <div className="space-y-3">
                            <Label>{t('admin.color', 'Color')}</Label>
                            <TagColorPicker
                                value={formData.color || ''}
                                onChange={(color: string) => setFormData({...formData, color})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('admin.description', 'Description')}</Label>
                            <Textarea
                                placeholder={t('admin.enterTagDescription', 'Enter tag description')}
                                rows={3}
                                value={formData.description || ''}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleUpdate}>
                            {t('admin.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Tag Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.deleteTag', 'Delete Tag')}</DialogTitle>
                        <DialogDescription>{t('admin.deleteTagConfirm', 'Are you sure you want to delete this tag? This action cannot be undone.')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            {t('admin.delete', 'Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Tags;
