/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Admin - Article Create/Edit Page (Enterprise CMS Style)
 */

import {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {useParams, useNavigate, Link as RouterLink} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {adminArticleApi, type Article, type CreateArticleRequest, type UpdateArticleRequest, type MediaBrief} from '@/lib/api/article';
import {adminMediaApi, type Media} from '@/lib/api/media';
import {useCategoryList} from '@/hooks/queries';
import {API_BASE_URL} from '@/lib/request';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {DeleteConfirmDialog} from '@/components/common/DeleteConfirmDialog';
import {useDirtyState, useSaveState, useKeyboardShortcut} from '@/hooks/useEditPage';
import {Spinner} from '@/components/ui/spinner';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
    ArrowLeft, Eye, Bell, Bold, Italic, Underline,
    List, ListOrdered, Link, ImagePlus, Code,
    ChevronDown, Save, Send, Globe, Lock,
    Calendar, X, AlertTriangle, Search, Image as ImageIcon,
} from 'lucide-react';
import {formatDateTime} from '@/lib/format';
import {generateSlug} from '@/lib/utils/slug';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';

// ============================================================================
// Helpers
// ============================================================================

function resolveMediaUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    const base = API_BASE_URL || '';
    return `${base}/${url.replace(/^\//, '')}`;
}

function countWords(text: string): number {
    if (!text || !text.trim()) return 0;
    // Strip HTML tags for word count
    const plain = text.replace(/<[^>]*>/g, '').trim();
    if (!plain) return 0;
    // Count CJK characters + space-separated words
    const cjk = plain.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
    const cjkCount = cjk ? cjk.length : 0;
    const withoutCjk = plain.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ');
    const words = withoutCjk.split(/\s+/).filter(Boolean);
    return cjkCount + words.length;
}

// ============================================================================
// Media Selector Dialog
// ============================================================================

interface MediaSelectorDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (media: Media) => void;
}

function MediaSelectorDialog({open, onClose, onSelect}: MediaSelectorDialogProps) {
    const {t} = useTranslation();
    const [medias, setMedias] = useState<Media[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 12;

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        adminMediaApi.list({page, page_size: pageSize, type: 'video', keyword: search || undefined})
            .then(res => {
                const items = res?.items || [];
                setMedias(items);
                setTotal(res?.total || 0);
            })
            .catch(() => {
                setMedias([]);
            })
            .finally(() => setLoading(false));
    }, [open, page, search]);

    const handleSelect = () => {
        const media = medias.find(m => m.id === selectedId);
        if (media) {
            onSelect(media);
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-card shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">{t('admin.selectVideo')}</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4"/>
                    </Button>
                </div>

                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <Input
                            placeholder={t('admin.searchVideos')}
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner/>
                        </div>
                    ) : medias.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {t('admin.noVideosFound')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {medias.map(media => (
                                <Button
                                    key={media.id}
                                    variant="ghost"
                                    className={cn(
                                        'relative rounded-input border-2 overflow-hidden text-left transition-colors p-0 h-auto',
                                        selectedId === media.id
                                            ? 'border-primary'
                                            : 'border-transparent hover:border-muted-foreground/30'
                                    )}
                                    onClick={() => setSelectedId(media.id)}
                                >
                                    <div className="aspect-video bg-muted relative">
                                        {media.thumbnail ? (
                                            <img
                                                src={resolveMediaUrl(media.thumbnail)}
                                                alt={media.title}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground"/>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xs font-medium truncate">{media.title}</p>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t">
                    <span className="text-sm text-muted-foreground">
                        {t('admin.videosFound', {count: total})}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>{t('admin.cancel')}</Button>
                        <Button onClick={handleSelect} disabled={!selectedId}>
                            {t('admin.confirm')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Rich Text Editor Toolbar Button
// ============================================================================

interface ToolbarButtonProps {
    icon: React.ReactNode;
    title: string;
    onClick: () => void;
    active?: boolean;
}

function ToolbarButton({icon, title, onClick, active}: ToolbarButtonProps) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            title={title}
            onClick={onClick}
            className={cn(
                'h-auto w-auto p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5',
                active && 'text-primary bg-primary/5'
            )}
        >
            {icon}
        </Button>
    );
}

// ============================================================================
// ArticleEditPage
// ============================================================================

interface ArticleEditPageProps {
    mode: 'create' | 'edit';
}

export default function ArticleEditPage({mode}: ArticleEditPageProps) {
    const {t} = useTranslation();
    const {id} = useParams({strict: false}) as {id?: string};
    const navigate = useNavigate();
    const {data: categoriesData} = useCategoryList();

    // Article data for edit mode
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(mode === 'edit');
    const [loadError, setLoadError] = useState<string | null>(null);

    // Form state with dirty tracking
    const {form, setForm, isDirty, resetDirty, syncFromData} = useDirtyState({
        title: '',
        slug: '',
        content: '',
        summary: '',
        state: 'draft',
        category_id: '' as string | number,
        media_id: '',
        thumbnail: '',
        tags: '',
        featured: false,
        visibility: 'public' as 'public' | 'internal',
        meta_title: '',
        meta_description: '',
    });

    // Selected media info (for display in sidebar)
    const [selectedMedia, setSelectedMedia] = useState<MediaBrief | null>(null);
    const [thumbnailError, setThumbnailError] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
    const [seoOpen, setSeoOpen] = useState(false);

    // Tag input state
    const [tagInput, setTagInput] = useState('');

    // Save state management
    const {saveState, isSaving, setSaving, setSuccess, setError} = useSaveState();

    // Track whether slug was manually edited
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    // Editor ref for contenteditable
    const editorRef = useRef<HTMLDivElement>(null);

    // Auto-save timestamp
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    // Load article data in edit mode
    useEffect(() => {
        if (mode !== 'edit' || !id) return;
        setLoading(true);
        setLoadError(null);
        adminArticleApi.get(id)
            .then(data => {
                setArticle(data);
                setSelectedMedia(data.media || null);
                syncFromData({
                    title: data.title || '',
                    slug: data.slug || '',
                    content: data.content || '',
                    summary: data.summary || '',
                    state: data.state || 'draft',
                    category_id: data.category_id ?? '',
                    media_id: data.media_id || '',
                    thumbnail: data.thumbnail || '',
                    tags: data.tags?.join(', ') || '',
                    featured: data.featured || false,
                    visibility: 'public' as const,
                    meta_title: '',
                    meta_description: '',
                });
            })
            .catch(err => {
                setLoadError(t('admin.failedToLoadArticle'));
                console.error('Error loading article:', err);
            })
            .finally(() => setLoading(false));
    }, [mode, id, syncFromData]);

    // Sync contenteditable content when form.content changes externally
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== form.content) {
            editorRef.current.innerHTML = form.content;
        }
    }, [form.content]);

    // Auto-generate slug from title
    useEffect(() => {
        if (!slugManuallyEdited && form.title && !form.slug) {
            setForm(prev => ({...prev, slug: generateSlug(form.title)}));
        }
    }, [form.title, slugManuallyEdited, form.slug, setForm]);

    // Auto-save timer
    useEffect(() => {
        if (!isDirty || isSaving) return;
        const timer = setInterval(() => {
            setLastSavedAt(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, [isDirty, isSaving]);

    // Word count
    const wordCount = useMemo(() => countWords(form.content), [form.content]);

    // Parsed tags
    const tagsList = useMemo(() => {
        return form.tags.split(',').map(s => s.trim()).filter(Boolean);
    }, [form.tags]);

    // Save handler
    const handleSave = useCallback(async () => {
        if (isSaving) return;
        setSaving();
        try {
            const tagsArray = form.tags.split(',').map(s => s.trim()).filter(Boolean);
            const categoryId = form.category_id !== '' && form.category_id !== undefined
                ? Number(form.category_id) : undefined;

            if (mode === 'create') {
                const data: CreateArticleRequest = {
                    title: form.title,
                    slug: form.slug || generateSlug(form.title),
                    content: form.content,
                    summary: form.summary || undefined,
                    state: form.state || 'draft',
                    category_id: categoryId,
                    media_id: form.media_id || undefined,
                    thumbnail: form.thumbnail || undefined,
                    tags: tagsArray.length > 0 ? tagsArray : undefined,
                    featured: form.featured,
                };
                const created = await adminArticleApi.create(data);
                resetDirty();
                setSuccess();
                setLastSavedAt(new Date());
                toast.success(t('admin.articleCreated'));
                if (created?.id) {
                    navigate({to: '/admin/articles/$id/edit', params: {id: created.id}});
                }
            } else if (id) {
                const data: UpdateArticleRequest = {
                    title: form.title,
                    slug: form.slug,
                    content: form.content,
                    summary: form.summary,
                    state: form.state,
                    category_id: categoryId,
                    media_id: form.media_id || undefined,
                    thumbnail: form.thumbnail,
                    tags: tagsArray,
                    featured: form.featured,
                };
                await adminArticleApi.update(id, data);
                resetDirty();
                setSuccess();
                setLastSavedAt(new Date());
                toast.success(t('admin.articleSaved'));
            }
        } catch (err: any) {
            setError();
            toast.error(`${t('admin.saveFailed')}: ${err?.message || t('admin.unknownError')}`);
            console.error('Failed to save', err);
        }
    }, [mode, id, isSaving, form, resetDirty, setSaving, setSuccess, setError, navigate]);

    // Save as draft
    const handleSaveDraft = useCallback(async () => {
        if (isSaving) return;
        setForm(prev => ({...prev, state: 'draft'}));
        // Directly save with draft state
        setSaving();
        try {
            const tagsArray = form.tags.split(',').map(s => s.trim()).filter(Boolean);
            const categoryId = form.category_id !== '' && form.category_id !== undefined
                ? Number(form.category_id) : undefined;
            const data = mode === 'create'
                ? {
                    title: form.title,
                    slug: form.slug || generateSlug(form.title),
                    content: form.content,
                    summary: form.summary || undefined,
                    state: 'draft' as const,
                    category_id: categoryId,
                    media_id: form.media_id || undefined,
                    thumbnail: form.thumbnail || undefined,
                    tags: tagsArray.length > 0 ? tagsArray : undefined,
                    featured: form.featured,
                }
                : {
                    title: form.title,
                    slug: form.slug,
                    content: form.content,
                    summary: form.summary,
                    state: 'draft' as const,
                    category_id: categoryId,
                    media_id: form.media_id || undefined,
                    thumbnail: form.thumbnail,
                    tags: tagsArray,
                    featured: form.featured,
                };
            if (mode === 'create') {
                const created = await adminArticleApi.create(data as CreateArticleRequest);
                resetDirty();
                setSuccess();
                setLastSavedAt(new Date());
                toast.success(t('admin.articleCreated'));
                if (created?.id) {
                    navigate({to: '/admin/articles/$id/edit', params: {id: created.id}});
                }
            } else if (id) {
                await adminArticleApi.update(id, data as UpdateArticleRequest);
                resetDirty();
                setSuccess();
                setLastSavedAt(new Date());
                toast.success(t('admin.articleSaved'));
            }
        } catch (err: any) {
            setError();
            toast.error(`${t('admin.saveFailed')}: ${err?.message || t('admin.unknownError')}`);
        }
    }, [mode, id, isSaving, form, setSaving, resetDirty, setSuccess, setError, navigate]);

    // Submit for review
    const handleSubmitForReview = useCallback(async () => {
        // Save as draft (pending review state not supported by API yet)
        await handleSaveDraft();
    }, [handleSaveDraft]);

    // Publish
    const handlePublish = useCallback(async () => {
        if (isSaving) return;
        setForm(prev => ({...prev, state: 'published'}));
        setSaving();
        try {
            const tagsArray = form.tags.split(',').map(s => s.trim()).filter(Boolean);
            const categoryId = form.category_id !== '' && form.category_id !== undefined
                ? Number(form.category_id) : undefined;
            const data = mode === 'create'
                ? {
                    title: form.title,
                    slug: form.slug || generateSlug(form.title),
                    content: form.content,
                    summary: form.summary || undefined,
                    state: 'published' as const,
                    category_id: categoryId,
                    media_id: form.media_id || undefined,
                    thumbnail: form.thumbnail || undefined,
                    tags: tagsArray.length > 0 ? tagsArray : undefined,
                    featured: form.featured,
                }
                : {
                    title: form.title,
                    slug: form.slug,
                    content: form.content,
                    summary: form.summary,
                    state: 'published' as const,
                    category_id: categoryId,
                    media_id: form.media_id || undefined,
                    thumbnail: form.thumbnail,
                    tags: tagsArray,
                    featured: form.featured,
                };
            if (mode === 'create') {
                const created = await adminArticleApi.create(data as CreateArticleRequest);
                resetDirty();
                setSuccess();
                setLastSavedAt(new Date());
                toast.success(t('admin.articleCreated'));
                if (created?.id) {
                    navigate({to: '/admin/articles/$id/edit', params: {id: created.id}});
                }
            } else if (id) {
                await adminArticleApi.update(id, data as UpdateArticleRequest);
                resetDirty();
                setSuccess();
                setLastSavedAt(new Date());
                toast.success(t('admin.articleSaved'));
            }
        } catch (err: any) {
            setError();
            toast.error(`${t('admin.saveFailed')}: ${err?.message || t('admin.unknownError')}`);
        }
    }, [mode, id, isSaving, form, setSaving, resetDirty, setSuccess, setError, navigate]);

    // Delete handler
    const handleDelete = useCallback(async () => {
        if (!id) return;
        setIsDeleting(true);
        try {
            await adminArticleApi.delete(id);
            setDeleteDialogOpen(false);
            toast.success(t('admin.articleDeleted'));
            navigate({to: '/admin/articles'});
        } catch (err: any) {
            setIsDeleting(false);
            toast.error(`${t('admin.deleteFailed')}: ${err?.message || t('admin.unknownError')}`);
            console.error('Failed to delete', err);
        }
    }, [id, navigate]);

    // Preview handler
    const handlePreview = useCallback(() => {
        if (article?.slug) {
            window.open(`/articles/${article.slug}`, '_blank', 'noopener,noreferrer');
        }
    }, [article?.slug]);

    // Back handler
    const handleBack = useCallback(() => {
        navigate({to: '/admin/articles'});
    }, [navigate]);

    // Media selector handler
    const handleMediaSelect = useCallback((media: Media) => {
        setForm(prev => ({
            ...prev,
            media_id: media.id,
            thumbnail: media.thumbnail || prev.thumbnail,
        }));
        setSelectedMedia({
            id: media.id,
            title: media.title,
            thumbnail: media.thumbnail,
            duration: media.duration,
            type: media.type,
            short_token: media.short_token,
        });
    }, [setForm]);

    // Clear media handler
    const handleClearMedia = useCallback(() => {
        setForm(prev => ({
            ...prev,
            media_id: '',
        }));
        setSelectedMedia(null);
    }, [setForm]);

    // Rich text editor commands
    const execCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        // Sync content back to form
        if (editorRef.current) {
            setForm(prev => ({...prev, content: editorRef.current!.innerHTML}));
        }
    }, [setForm]);

    const handleEditorInput = useCallback(() => {
        if (editorRef.current) {
            setForm(prev => ({...prev, content: editorRef.current!.innerHTML}));
        }
    }, [setForm]);

    // Tag management
    const addTag = useCallback((tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        const currentTags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
        if (currentTags.includes(trimmed)) return;
        const newTags = currentTags.length > 0 ? [...currentTags, trimmed].join(', ') : trimmed;
        setForm(prev => ({...prev, tags: newTags}));
        setTagInput('');
    }, [form.tags, setForm]);

    const removeTag = useCallback((tagToRemove: string) => {
        const currentTags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
        const newTags = currentTags.filter(t => t !== tagToRemove).join(', ');
        setForm(prev => ({...prev, tags: newTags}));
    }, [form.tags, setForm]);

    const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        }
    }, [tagInput, addTag]);

    // Keyboard shortcut: Ctrl+S / Cmd+S
    useKeyboardShortcut('ctrl+s', handleSave, {enabled: !isSaving});

    // Resolve thumbnail for display
    const displayThumbnail = resolveMediaUrl(form.thumbnail || selectedMedia?.thumbnail);

    // Auto-save indicator text
    const autoSaveText = useMemo(() => {
        if (saveState === 'saving') return t('admin.saving', {defaultValue: 'Saving...'});
        if (!lastSavedAt) return t('admin.notSavedYet', {defaultValue: 'Not saved yet'});
        const diffMs = Date.now() - lastSavedAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return t('admin.savedJustNow', {defaultValue: 'Last saved just now'});
        return t('admin.lastSavedAgo', {minutes: diffMins, defaultValue: `Last saved ${diffMins} mins ago`});
    }, [saveState, lastSavedAt]);

    // Category options
    const categoryOptions = useMemo(() => {
        const raw = categoriesData?.items || (Array.isArray(categoriesData) ? categoriesData : []);
        return raw as any[];
    }, [categoriesData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner/>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle className="w-12 h-12 text-destructive"/>
                <p className="text-lg text-muted-foreground">{loadError}</p>
                <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>{t('admin.backToList')}
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* ===== Top Navigation Bar ===== */}
            <header className="sticky top-0 z-40 h-14 bg-card border-b border-border shadow-sm flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={t('admin.backToList', {defaultValue: 'Back'})}
                    >
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                    <h1 className="text-lg font-semibold text-primary">
                        {mode === 'create'
                            ? t('admin.createArticle', {defaultValue: 'Create Article'})
                            : t('admin.editArticle', {defaultValue: 'Edit Article'})
                        }
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {mode === 'edit' && article?.slug && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreview}
                            className="flex items-center gap-2 rounded-lg"
                        >
                            <Eye className="w-4 h-4"/>
                            <span className="text-xs font-medium">{t('admin.preview', {defaultValue: 'Preview'})}</span>
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Bell className="w-5 h-5"/>
                    </Button>
                    <div className="h-8 w-8 rounded-full bg-primary/10 overflow-hidden ml-1 border border-border flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">A</span>
                    </div>
                </div>
            </header>

            {/* ===== Main Content ===== */}
            <main className="flex-1 pb-24">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <Breadcrumb className="mb-4">
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <RouterLink to="/admin">{t('admin.title', 'Admin')}</RouterLink>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator/>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <RouterLink to="/admin/articles">{t('admin.articles', 'Articles')}</RouterLink>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator/>
                            <BreadcrumbItem>
                                <BreadcrumbPage>{t('admin.editArticle', 'Edit Article')}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* ===== Left Column: Editor (Col 1-8) ===== */}
                        <div className="lg:col-span-8 space-y-8">
                            <Card className="rounded-card">
                                <CardContent className="p-8">
                                    {/* Title Input */}
                                    <div className="space-y-4 mb-8">
                                        <Input
                                            className="w-full border-0 p-0 text-3xl font-extrabold focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50 bg-transparent tracking-tight h-auto shadow-none"
                                            placeholder={t('admin.enterArticleTitle', {defaultValue: 'Enter article title...'})}
                                            value={form.title}
                                            onChange={e => {
                                                setForm({...form, title: e.target.value});
                                                if (!slugManuallyEdited) {
                                                    setForm(prev => ({...prev, slug: generateSlug(e.target.value)}));
                                                }
                                            }}
                                        />
                                        <Input
                                            className="w-full border-0 p-0 text-base focus:ring-0 focus:outline-none placeholder:text-muted-foreground/40 bg-transparent h-auto shadow-none"
                                            placeholder={t('admin.addSubtitle', {defaultValue: 'Add a compelling subtitle or summary...'})}
                                            value={form.summary}
                                            onChange={e => setForm({...form, summary: e.target.value})}
                                        />
                                    </div>

                                    {/* Cover Image Upload */}
                                    <div
                                        className="w-full aspect-video rounded-card border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center bg-muted/30 group hover:bg-muted/50 transition-colors cursor-pointer mb-8 overflow-hidden relative"
                                        onClick={() => {
                                            // Trigger file input or URL input
                                            const url = window.prompt(t('admin.enterThumbnailUrl', {defaultValue: 'Enter cover image URL:'}));
                                            if (url) {
                                                setForm(prev => ({...prev, thumbnail: url}));
                                            }
                                        }}
                                    >
                                        {displayThumbnail && !thumbnailError ? (
                                            <>
                                                <img
                                                    src={displayThumbnail}
                                                    alt="Cover"
                                                    className="w-full h-full object-cover"
                                                    onError={() => setThumbnailError(true)}
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-card text-foreground px-4 py-2 rounded-lg text-xs font-medium shadow-lg">
                                                        {t('admin.changeImage', {defaultValue: 'Change Image'})}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-4 rounded-full bg-muted mb-3 group-hover:scale-110 transition-transform duration-200">
                                                    <ImagePlus className="w-8 h-8 text-primary"/>
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    {t('admin.clickToUploadCover', {defaultValue: 'Click to upload cover image'})}
                                                </p>
                                                <p className="text-xs text-muted-foreground/60 mt-1">
                                                    1920x1080px (PNG, JPG, WEBP)
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Rich Text Editor */}
                                    <div className="border border-border rounded-card overflow-hidden">
                                        {/* Toolbar */}
                                        <div className="bg-muted px-3 py-2 border-b border-border flex flex-wrap items-center gap-1">
                                            <ToolbarButton
                                                icon={<Bold className="w-4 h-4"/>}
                                                title="Bold"
                                                onClick={() => execCommand('bold')}
                                            />
                                            <ToolbarButton
                                                icon={<Italic className="w-4 h-4"/>}
                                                title="Italic"
                                                onClick={() => execCommand('italic')}
                                            />
                                            <ToolbarButton
                                                icon={<Underline className="w-4 h-4"/>}
                                                title="Underline"
                                                onClick={() => execCommand('underline')}
                                            />
                                            <div className="w-px h-5 bg-border mx-1"/>
                                            <ToolbarButton
                                                icon={<List className="w-4 h-4"/>}
                                                title="Bullet List"
                                                onClick={() => execCommand('insertUnorderedList')}
                                            />
                                            <ToolbarButton
                                                icon={<ListOrdered className="w-4 h-4"/>}
                                                title="Numbered List"
                                                onClick={() => execCommand('insertOrderedList')}
                                            />
                                            <div className="w-px h-5 bg-border mx-1"/>
                                            <ToolbarButton
                                                icon={<Link className="w-4 h-4"/>}
                                                title="Insert Link"
                                                onClick={() => {
                                                    const url = window.prompt('Enter URL:');
                                                    if (url) execCommand('createLink', url);
                                                }}
                                            />
                                            <ToolbarButton
                                                icon={<ImagePlus className="w-4 h-4"/>}
                                                title="Insert Image"
                                                onClick={() => {
                                                    const url = window.prompt('Enter image URL:');
                                                    if (url) execCommand('insertImage', url);
                                                }}
                                            />
                                            <ToolbarButton
                                                icon={<Code className="w-4 h-4"/>}
                                                title="Code Block"
                                                onClick={() => execCommand('formatBlock', 'pre')}
                                            />
                                            <div className="ml-auto flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground px-2">
                                                    {t('admin.words', {defaultValue: 'Words'})}: {wordCount}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Editor Content Area */}
                                        <div
                                            ref={editorRef}
                                            contentEditable
                                            onInput={handleEditorInput}
                                            className="min-h-[500px] p-6 focus:outline-none bg-card text-sm text-muted-foreground/80 prose prose-sm max-w-none"
                                            data-placeholder={t('admin.startTyping', {defaultValue: 'Start typing your story here...'})}
                                            suppressContentEditableWarning
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ===== Right Column: Settings (Col 9-12) ===== */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Publishing Settings */}
                            <Card className="rounded-card overflow-hidden">
                                <div className="px-5 py-4 border-b border-border bg-muted/20">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t('admin.publishingSettings', {defaultValue: 'Publishing Settings'})}
                                    </h3>
                                </div>
                                <CardContent className="p-5 space-y-5">
                                    {/* Status */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">
                                            {t('admin.status', {defaultValue: 'Status'})}
                                        </Label>
                                        <Select value={form.state} onValueChange={val => setForm({...form, state: val})}>
                                            <SelectTrigger className="rounded-input">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        'h-2 w-2 rounded-full',
                                                        form.state === 'draft' && 'bg-muted-foreground',
                                                        form.state === 'published' && 'bg-green-500',
                                                        form.state === 'archived' && 'bg-destructive',
                                                    )}/>
                                                    <SelectValue/>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">{t('admin.draft', {defaultValue: 'Draft'})}</SelectItem>
                                                <SelectItem value="published">{t('admin.published', {defaultValue: 'Published'})}</SelectItem>
                                                <SelectItem value="archived">{t('admin.archived', {defaultValue: 'Archived'})}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Visibility */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">
                                            {t('admin.visibility', {defaultValue: 'Visibility'})}
                                        </Label>
                                        <RadioGroup
                                            value={form.visibility}
                                            onValueChange={val => setForm({...form, visibility: val as 'public' | 'internal'})}
                                            className="flex items-center gap-4"
                                        >
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="public" id="visibility-public"/>
                                                <Label htmlFor="visibility-public" className="flex items-center gap-2 cursor-pointer">
                                                    <Globe className="w-3.5 h-3.5 text-muted-foreground"/>
                                                    <span className="text-xs">{t('admin.public', {defaultValue: 'Public'})}</span>
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="internal" id="visibility-internal"/>
                                                <Label htmlFor="visibility-internal" className="flex items-center gap-2 cursor-pointer">
                                                    <Lock className="w-3.5 h-3.5 text-muted-foreground"/>
                                                    <span className="text-xs">{t('admin.internal', {defaultValue: 'Internal'})}</span>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Publish Date */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">
                                            {t('admin.publishDate', {defaultValue: 'Publish Date'})}
                                        </Label>
                                        <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-input bg-card">
                                            <Calendar className="w-4 h-4 text-muted-foreground"/>
                                            <span className="text-xs">
                                                {article?.published_at
                                                    ? formatDateTime(article.published_at)
                                                    : t('admin.immediately', {defaultValue: 'Immediately'})
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* URL Slug */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">
                                            {t('admin.urlSlug', {defaultValue: 'URL Slug'})}
                                        </Label>
                                        <div className="flex items-center border border-border rounded-input bg-muted/30 overflow-hidden">
                                            <span className="text-xs px-3 text-muted-foreground border-r border-border py-2">/blog/</span>
                                            <Input
                                                className="flex-1 border-0 bg-transparent text-sm px-3 py-2 focus:ring-0 focus:outline-none h-auto shadow-none"
                                                placeholder="article-title-here"
                                                value={form.slug}
                                                onChange={e => {
                                                    setForm({...form, slug: e.target.value});
                                                    setSlugManuallyEdited(true);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Taxonomy */}
                            <Card className="rounded-card overflow-hidden">
                                <div className="px-5 py-4 border-b border-border bg-muted/20">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t('admin.taxonomy', {defaultValue: 'Taxonomy'})}
                                    </h3>
                                </div>
                                <CardContent className="p-5 space-y-5">
                                    {/* Category */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">
                                            {t('admin.category', {defaultValue: 'Category'})}
                                        </Label>
                                        <Select
                                            value={form.category_id !== '' && form.category_id !== undefined ? String(form.category_id) : '_none_'}
                                            onValueChange={val => setForm({...form, category_id: val === '_none_' ? '' : val})}
                                        >
                                            <SelectTrigger className="rounded-input">
                                                <SelectValue placeholder={t('admin.selectCategory', {defaultValue: 'Select Category...'})}/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_none_">
                                                    {t('admin.noCategory', {defaultValue: 'No Category'})}
                                                </SelectItem>
                                                {categoryOptions.map((cat: any) => (
                                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">
                                            {t('admin.tags', {defaultValue: 'Tags'})}
                                        </Label>
                                        <div className="flex flex-wrap gap-2 p-2 border border-border rounded-input bg-card min-h-[80px]">
                                            {tagsList.map((tag) => (
                                                <div
                                                    key={tag}
                                                    className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-badge text-xs"
                                                >
                                                    <span>{tag}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeTag(tag)}
                                                        className="hover:text-destructive h-auto w-auto p-0"
                                                    >
                                                        <X className="w-3 h-3"/>
                                                    </Button>
                                                </div>
                                            ))}
                                            <Input
                                                className="flex-1 border-0 bg-transparent text-sm min-w-[100px] focus:ring-0 focus:outline-none p-1 h-auto shadow-none"
                                                placeholder={t('admin.addTag', {defaultValue: 'Add tag...'})}
                                                value={tagInput}
                                                onChange={e => setTagInput(e.target.value)}
                                                onKeyDown={handleTagKeyDown}
                                                onBlur={() => {
                                                    if (tagInput.trim()) addTag(tagInput);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Featured Image */}
                            <Card className="rounded-card overflow-hidden">
                                <div className="px-5 py-4 border-b border-border bg-muted/20">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t('admin.featuredImage', {defaultValue: 'Featured Image'})}
                                    </h3>
                                </div>
                                <CardContent className="p-5">
                                    <div className="w-full aspect-video rounded-input border border-border bg-muted flex items-center justify-center relative group overflow-hidden">
                                        {displayThumbnail && !thumbnailError ? (
                                            <>
                                                <img
                                                    src={displayThumbnail}
                                                    alt="Featured"
                                                    className="w-full h-full object-cover"
                                                    onError={() => setThumbnailError(true)}
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="bg-card text-foreground px-4 py-2 rounded-lg text-xs font-medium shadow-lg hover:bg-muted"
                                                        onClick={() => {
                                                            const url = window.prompt(t('admin.enterThumbnailUrl', {defaultValue: 'Enter image URL:'}));
                                                            if (url) setForm(prev => ({...prev, thumbnail: url}));
                                                        }}
                                                    >
                                                        {t('admin.changeImage', {defaultValue: 'Change Image'})}
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <ImageIcon className="w-10 h-10 text-muted-foreground/40"/>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3 text-center">
                                        {t('admin.appearsInSearchResults', {defaultValue: 'Appears in search results and cards'})}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* SEO Settings (Collapsible) */}
                            <Card className="rounded-card overflow-hidden">
                                <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/10">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                {t('admin.seoSettings', {defaultValue: 'SEO Settings'})}
                                            </h3>
                                            <ChevronDown className={cn(
                                                'w-4 h-4 text-muted-foreground transition-transform duration-200',
                                                seoOpen && 'rotate-180'
                                            )}/>
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent className="px-5 pb-5 border-t border-border pt-5 space-y-4">
                                            <div>
                                                <Label className="text-xs text-muted-foreground mb-2 block">
                                                    {t('admin.metaTitle', {defaultValue: 'Meta Title'})}
                                                </Label>
                                                <Input
                                                    className="rounded-input"
                                                    placeholder={t('admin.googleSearchTitle', {defaultValue: 'Google Search Title'})}
                                                    value={form.meta_title}
                                                    onChange={e => setForm({...form, meta_title: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground mb-2 block">
                                                    {t('admin.metaDescription', {defaultValue: 'Meta Description'})}
                                                </Label>
                                                <Textarea
                                                    className="rounded-input h-24 resize-none"
                                                    placeholder={t('admin.enterSeoDescription', {defaultValue: 'Enter SEO description...'})}
                                                    value={form.meta_description}
                                                    onChange={e => setForm({...form, meta_description: e.target.value})}
                                                />
                                            </div>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>

                            {/* Metadata (edit mode only) */}
                            {mode === 'edit' && article && (
                                <Card className="rounded-card overflow-hidden">
                                    <div className="px-5 py-4 border-b border-border bg-muted/20">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {t('admin.metadata', {defaultValue: 'Metadata'})}
                                        </h3>
                                    </div>
                                    <CardContent className="p-5">
                                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                            <span className="text-muted-foreground">{t('admin.id', {defaultValue: 'ID'})}</span>
                                            <span className="font-mono text-xs text-right break-all">{article.id}</span>
                                            <span className="text-muted-foreground">{t('admin.views', {defaultValue: 'Views'})}</span>
                                            <span className="text-xs text-right">{article.view_count}</span>
                                            <span className="text-muted-foreground">{t('admin.comments', {defaultValue: 'Comments'})}</span>
                                            <span className="text-xs text-right">{article.comment_count}</span>
                                            <span className="text-muted-foreground">{t('admin.created', {defaultValue: 'Created'})}</span>
                                            <span className="text-xs text-right whitespace-nowrap">{formatDateTime(article.create_time)}</span>
                                            <span className="text-muted-foreground">{t('admin.updated', {defaultValue: 'Updated'})}</span>
                                            <span className="text-xs text-right whitespace-nowrap">{formatDateTime(article.update_time)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Quick Actions */}
                            <Card className="rounded-card overflow-hidden">
                                <div className="px-5 py-4 border-b border-border bg-muted/20">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t('admin.quickActions', {defaultValue: 'Quick Actions'})}
                                    </h3>
                                </div>
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="featured"
                                            checked={form.featured}
                                            onCheckedChange={checked => setForm({...form, featured: checked})}
                                        />
                                        <Label htmlFor="featured" className="cursor-pointer text-sm">
                                            {t('admin.featuredArticle', {defaultValue: 'Featured Article'})}
                                        </Label>
                                    </div>
                                    {mode === 'edit' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start text-destructive hover:text-destructive"
                                            onClick={() => setDeleteDialogOpen(true)}
                                        >
                                            <X className="w-4 h-4 mr-2"/>
                                            {t('admin.deleteArticle', {defaultValue: 'Delete Article'})}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            {/* ===== Sticky Bottom Bar ===== */}
            <footer className="fixed bottom-0 right-0 left-0 h-16 bg-card border-t border-border px-6 flex items-center justify-between z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        'h-2 w-2 rounded-full animate-pulse',
                        saveState === 'success' ? 'bg-green-500' : saveState === 'error' ? 'bg-destructive' : 'bg-muted-foreground'
                    )}/>
                    <span className="text-xs text-muted-foreground italic">{autoSaveText}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="rounded-lg font-semibold"
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                    >
                        <Save className="w-4 h-4 mr-2"/>
                        {t('admin.saveDraft', {defaultValue: 'Save Draft'})}
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-lg border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-semibold"
                        onClick={handleSubmitForReview}
                        disabled={isSaving}
                    >
                        <Send className="w-4 h-4 mr-2"/>
                        {t('admin.submitForReview', {defaultValue: 'Submit for Review'})}
                    </Button>
                    <Button
                        className="rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                        onClick={handlePublish}
                        disabled={isSaving}
                    >
                        {t('admin.publish', {defaultValue: 'Publish'})}
                    </Button>
                </div>
            </footer>

            {/* Media Selector Dialog */}
            <MediaSelectorDialog
                open={mediaSelectorOpen}
                onClose={() => setMediaSelectorOpen(false)}
                onSelect={handleMediaSelect}
            />

            {/* Delete Confirmation Dialog */}
            {mode === 'edit' && (
                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    title={article?.title || t('admin.untitledArticle', {defaultValue: 'Untitled Article'})}
                    isDeleting={isDeleting}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}
