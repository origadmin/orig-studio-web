import {Spinner} from "@/components/ui/spinner"
import {useState, useEffect, useMemo, useCallback} from 'react';
import {useParams, useNavigate, Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {useTranslation} from 'react-i18next';
import type {TFunction} from 'i18next';
import {useAdminMediaDetail, useUpdateMedia, useDeleteMedia, useCategoryList} from '@/hooks/queries';
import {adminMediaApi, encodingApi, type EncodeProfile} from '@/lib/api/media';
import {api} from '@/lib/request';
import {getFullUrl} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {EditPageHeader, type HeaderBadgeConfig, type EncodingStatusConfig} from '@/components/common/EditPageHeader';
import {StatusDot, type StatusDotStatus} from '@/components/common/StatusDot';
import {DeleteConfirmDialog} from '@/components/common/DeleteConfirmDialog';
import {useDirtyState, useSaveState, useKeyboardShortcut} from '@/hooks/useEditPage';
import {ArrowLeft, RefreshCw, Play, Eye, ThumbsUp, MessageSquare, Download, AlertTriangle, CheckCircle, Clock, XCircle, Image, Film, Star, Share2, Upload, Copy, Subtitles, Video, Music, BookOpen, ShieldCheck, Edit, Link2, Delete, Loader2, Users} from 'lucide-react';
import {formatDateTime} from '@/lib/format';
import {toast} from 'sonner';
import type {Media} from '@/lib/api/media';

/**
 * Normalize privacy value from backend to a numeric enum value.
 * Backend (protojson) may return either:
 *   - A string enum name like "PRIVACY_PUBLIC", "PRIVACY_PRIVATE", "PRIVACY_UNLISTED"
 *   - A numeric value like 1, 2, 3
 * Frontend Select uses numeric string values ("1", "2", "3") for consistency.
 */
const PRIVACY_NAME_TO_VALUE: Record<string, number> = {
    PRIVACY_UNSPECIFIED: 0,
    PRIVACY_PUBLIC: 1,
    PRIVACY_PRIVATE: 2,
    PRIVACY_UNLISTED: 3,
    PRIVACY_PAID: 4,
    PRIVACY_SUBSCRIBERS_ONLY: 5,
};

function normalizePrivacy(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Try parsing as numeric string first (e.g., "1", "2")
        const num = Number(value);
        if (!isNaN(num) && num >= 0) return num;
        // Then try enum name (e.g., "PRIVACY_PUBLIC")
        const mapped = PRIVACY_NAME_TO_VALUE[value];
        if (mapped !== undefined) return mapped;
    }
    return 1; // Default to PUBLIC
}

interface EncodingTask {
    id: string;
    media_id: string;
    profile_id: number;
    status: string;
    progress: number;
    output_path: string;
    error_message: string;
    chunk: boolean;
    create_time: string;
    update_time: string;
}

interface MediaStats {
    view_count: number;
    like_count: number;
    dislike_count: number;
    comment_count: number;
    favorite_count: number;
    encoding_status: string;
}

const TYPE_I18N_KEYS: Record<string, string> = {
    video: 'admin.video',
    audio: 'admin.audio',
    image: 'admin.image',
    document: 'admin.document',
};

const STATE_TO_STATUS_DOT: Record<string, StatusDotStatus> = {
    active: 'success',
    published: 'success',
    draft: 'draft',
    deleted: 'deleted',
    pending: 'pending',
};

function mapMediaToHeaderBadges(media: Media, t: TFunction): HeaderBadgeConfig[] {
    const badges: HeaderBadgeConfig[] = [];

    const typeKey = TYPE_I18N_KEYS[media.type];
    const typeLabel = typeKey ? t(typeKey, media.type) : media.type;
    if (typeLabel) {
        badges.push({
            type: 'media-type',
            label: typeLabel,
            ariaLabel: t('mediaEdit.mediaTypeAria', 'Media type') + ': ' + typeLabel,
        });
    }

    const statusDot = STATE_TO_STATUS_DOT[media.state] || 'unknown';
    const stateLabel = t(`common.status.${media.state}`, media.state || t('common.unknown', 'Unknown'));
    badges.push({
        type: 'state',
        statusDot,
        label: stateLabel,
        ariaLabel: t('mediaEdit.stateAria', 'State') + ': ' + stateLabel,
    });

    if (media.featured) {
        badges.push({
            type: 'featured',
            label: t('mediaEdit.featured', 'Featured'),
            ariaLabel: t('mediaEdit.featuredContent', 'Featured content'),
        });
    }

    return badges;
}

/**
 * Map encoding_status string to EncodingStatusConfig
 */
function mapEncodingStatus(status: string | undefined): EncodingStatusConfig | undefined {
    const validStatuses = ['success', 'processing', 'pending', 'failed'];
    if (!status || !validStatuses.includes(status)) return undefined;
    return {status: status as EncodingStatusConfig['status']};
}

export default function MediaEditPage() {
    const {id} = useParams({strict: false}) as {id: string};
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {data: media, isLoading, error} = useAdminMediaDetail(id);
    const updateMutation = useUpdateMedia();
    const deleteMutation = useDeleteMedia();
    const {data: categoriesData} = useCategoryList();

    // Form state with dirty tracking
    const {form, setForm, isDirty, resetDirty, syncFromData} = useDirtyState({
        title: '',
        description: '',
        state: 'draft',
        category_id: '' as string | number,
        tags: '',
        privacy: 1,
        featured: false,
        enable_comments: true,
        allow_download: false,
        listable: false,
    });

    const [stats, setStats] = useState<MediaStats | null>(null);
    const [tasks, setTasks] = useState<EncodingTask[]>([]);
    const [profiles, setProfiles] = useState<Map<number, EncodeProfile>>(new Map());
    const [activeTab, setActiveTab] = useState<string>('metadata');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(false);
    const [regenThumbnailConfirmOpen, setRegenThumbnailConfirmOpen] = useState(false);
    const [regenSpriteConfirmOpen, setRegenSpriteConfirmOpen] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [tagInput, setTagInput] = useState('');

    // Save state management
    const {saveState, isSaving, setSaving, setSuccess, setError} = useSaveState();

    // Initialize form from media data
    useEffect(() => {
        if (media) {
            syncFromData({
                title: media.title || '',
                description: media.description || '',
                state: media.state || 'draft',
                category_id: media.category_id ?? '',
                tags: media.tags?.join(', ') || '',
                privacy: normalizePrivacy(media.privacy),
                featured: media.featured || false,
                enable_comments: media.enable_comments ?? true,
                allow_download: media.allow_download ?? false,
                listable: media.listable ?? false,
            });
        }
    }, [media, syncFromData]);

    // Fetch stats, tasks, and profiles
    useEffect(() => {
        if (id) {
            adminMediaApi.getStats(id).then(setStats).catch(() => {});
            adminMediaApi.getTasks(id).then((res) => setTasks(extractTasks(res))).catch(() => {});
        }
    }, [id]);

    // Fetch encode profiles for profile name resolution
    useEffect(() => {
        encodingApi.profiles.list().then((res: any) => {
            const profileList: EncodeProfile[] = (Array.isArray(res?.profiles) ? res.profiles : Array.isArray(res) ? res : []);
            const map = new Map<number, EncodeProfile>();
            profileList.forEach(p => map.set(p.id, p));
            setProfiles(map);
        }).catch(() => {});
    }, []);

    // Save handler
    const handleSave = useCallback(async () => {
        if (!id || isSaving) return;
        setSaving();
        try {
            await updateMutation.mutateAsync({
                id,
                data: {
                    title: form.title,
                    description: form.description,
                    state: form.state,
                    category_id: form.category_id !== '' && form.category_id !== undefined ? Number(form.category_id) : undefined,
                    tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
                    privacy: form.privacy,
                    featured: form.featured,
                    enable_comments: form.enable_comments,
                    allow_download: form.allow_download,
                    listable: form.listable,
                } as any,
            });
            resetDirty();
            setSuccess();
            toast.success(t('mediaEdit.saveSuccess', '保存成功'));
        } catch (err: any) {
            setError();
            toast.error(`${t('mediaEdit.saveFailed', '保存失败')}: ${err?.message || t('common.unknown', '未知错误')}`);
            console.error('Failed to save', err);
        }
    }, [id, isSaving, form, updateMutation, setSaving, setSuccess, setError, resetDirty]);

    // Delete handler
    const handleDelete = useCallback(async () => {
        if (!id) return;
        setIsDeleting(true);
        try {
            await deleteMutation.mutateAsync(id);
            setDeleteDialogOpen(false);
            toast.success(t('mediaEdit.mediaDeleted', '媒体已删除'));
            navigate({to: '/admin/media'});
        } catch (err: any) {
            setIsDeleting(false);
            toast.error(`${t('mediaEdit.deleteFailed', '删除失败')}: ${err?.message || t('common.unknown', '未知错误')}`);
            console.error('Failed to delete', err);
        }
    }, [id, deleteMutation, navigate]);

    // Preview handler
    const handlePreview = useCallback(() => {
        if (media?.short_token) {
            window.open(`/watch?v=${media.short_token}`, '_blank', 'noopener,noreferrer');
        }
    }, [media?.short_token]);

    // Back handler
    const handleBack = useCallback(() => {
        navigate({to: '/admin/media'});
    }, [navigate]);

    // Keyboard shortcut: Ctrl+S / Cmd+S
    useKeyboardShortcut('ctrl+s', handleSave, {enabled: !isSaving});

    // Helper: extract tasks list from API response
    const extractTasks = (res: any): EncodingTask[] => {
        const safeRes = res ?? {};
        if (Array.isArray(safeRes?.tasks)) return safeRes.tasks;
        if (Array.isArray(safeRes?.items)) return safeRes.items;
        return [];
    };

    // Retry encoding task
    const handleRetryTask = async (taskId: string) => {
        if (!id) return;
        try {
            await adminMediaApi.retryTask(id, taskId);
            const res = await adminMediaApi.getTasks(id);
            setTasks(extractTasks(res));
        } catch (err) {
            console.error('Failed to retry task', err);
        }
    };

    const handleRegenerateThumbnail = async () => {
        if (!id) return;
        setIsRegenerating(true);
        try {
            await api.post(`/admin/medias/${id}/regenerate-thumbnail`, {});
            toast.success(t('mediaEdit.thumbnailRegenerateScheduled', '缩略图重新生成已调度...'));
            const res = await adminMediaApi.getTasks(id);
            setTasks(extractTasks(res));
        } catch (err: any) {
            const errMsg = err?.message || t('common.unknown', '未知错误');
            toast.error(`${t('mediaEdit.thumbnailRegenerateFailed', '重新生成缩略图失败')}: ${errMsg}`);
            console.error('Failed to regenerate thumbnail', err);
        } finally {
            setIsRegenerating(false);
            setRegenThumbnailConfirmOpen(false);
        }
    };

    const handleRegenerateSprite = async () => {
        if (!id) return;
        setIsRegenerating(true);
        try {
            await api.post(`/admin/medias/${id}/regenerate-sprite`, {});
            toast.success(t('mediaEdit.spriteRegenerateScheduled', '雪碧图重新生成已调度...'));
            const res = await adminMediaApi.getTasks(id);
            setTasks(extractTasks(res));
        } catch (err: any) {
            const errMsg = err?.message || t('common.unknown', '未知错误');
            if (errMsg.includes('already processing') || errMsg.includes('already in progress')) {
                toast.warning(t('mediaEdit.spriteRegenerateScheduled', '雪碧图重新生成已调度...'));
            } else {
                toast.error(`${t('mediaEdit.spriteRegenerateFailed', '重新生成雪碧图失败')}: ${errMsg}`);
            }
            console.error('Failed to regenerate sprite', err);
        } finally {
            setIsRegenerating(false);
            setRegenSpriteConfirmOpen(false);
        }
    };

    // Compute header badges and encoding status from media
    const headerBadges = useMemo(() => media ? mapMediaToHeaderBadges(media, t) : [], [media, t]);
    const encodingConfig = useMemo(() => media ? mapEncodingStatus(media.encoding_status) : undefined, [media]);

    const encodingStatusDot = (status: string | undefined): StatusDotStatus => {
        switch (status) {
            case 'success': return 'success';
            case 'processing': return 'processing';
            case 'pending': return 'pending';
            case 'failed': return 'failed';
            case 'partial': return 'partial';
            default: return 'unknown';
        }
    };

    // Resolve profile_id to a human-readable profile name
    const getProfileName = (profileId: number): string => {
        const profile = profiles.get(profileId);
        if (profile) {
            return profile.name || `${t('mediaEdit.profile', '配置')} #${profileId}`;
        }
        return `${t('mediaEdit.profile', '配置')} #${profileId}`;
    };

    // Get profile resolution info for display
    const getProfileInfo = (profileId: number): string => {
        const profile = profiles.get(profileId);
        if (profile) {
            const parts: string[] = [];
            if (profile.resolution) parts.push(profile.resolution);
            if (profile.extension) parts.push(profile.extension.toUpperCase());
            return parts.length > 0 ? parts.join(' / ') : '';
        }
        return '';
    };

    // Compute task summary counts
    const taskSummary = useMemo(() => {
        const counts = {success: 0, processing: 0, pending: 0, failed: 0, partial: 0, total: tasks.length};
        tasks.forEach(t => {
            if (t.status in counts) {
                counts[t.status as keyof typeof counts]++;
            }
        });
        return counts;
    }, [tasks]);

    // Format task summary text
    const taskSummaryText = useMemo(() => {
        if (tasks.length === 0) return '';
        const parts: string[] = [];
        if (taskSummary.success > 0) parts.push(`${taskSummary.success} ${t('common.status.success', 'Completed')}`);
        if (taskSummary.processing > 0) parts.push(`${taskSummary.processing} ${t('common.status.processing', 'Processing')}`);
        if (taskSummary.pending > 0) parts.push(`${taskSummary.pending} ${t('common.status.pending', 'Queued')}`);
        if (taskSummary.failed > 0) parts.push(`${taskSummary.failed} ${t('common.status.failed', 'Failed')}`);
        if (taskSummary.partial > 0) parts.push(`${taskSummary.partial} ${t('common.status.partial', 'Partial')}`);
        return parts.join(', ');
    }, [taskSummary, tasks.length, t]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner />
            </div>
        );
    }

    if (error || !media) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle className="w-12 h-12 text-destructive"/>
                <p className="text-lg text-muted-foreground">{t('mediaEdit.loadFailed', '无法加载媒体信息')}</p>
                <Button variant="outline" onClick={() => navigate({to: '/admin/media'})}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>{t('common.back', '返回列表')}
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Breadcrumb className="mb-4 px-6 pt-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin/media">{t('admin.breadcrumb.media', '媒体')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.edit', '编辑')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <EditPageHeader
                title={media.title || t('mediaEdit.unnamedMedia', '未命名媒体')}
                isDirty={isDirty}
                isSaving={isSaving}
                saveState={saveState}
                onBack={handleBack}
                onSave={handleSave}
                onPreview={media.short_token ? handlePreview : undefined}
                onDelete={() => setDeleteDialogOpen(true)}
                badges={headerBadges}
                encodingStatus={encodingConfig}
            />

            <div className="max-w-[1440px] mx-auto px-6 py-6">
                <div className="mb-6">
                    <Label htmlFor="media-title" className="text-xs text-muted-foreground block mb-2 uppercase font-bold tracking-wider">{t('mediaEdit.title', '标题')}</Label>
                    <Input id="media-title" value={form.title}
                           onChange={e => setForm({...form, title: e.target.value})}
                           className="text-3xl font-bold h-auto py-1"
                           placeholder={t('mediaEdit.titlePlaceholder', '输入媒体标题...')}/>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN (8/12) */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                        {/* Hero Card */}
                        <Card className="bg-card">
                            <CardContent className="p-6">
                                <div className="relative aspect-video rounded-lg border border-dashed border-border overflow-hidden bg-muted flex items-center justify-center max-w-2xl mx-auto group cursor-pointer hover:border-primary transition-colors">
                                    {media.thumbnail && !thumbnailError ? (
                                        <img src={getFullUrl(media.thumbnail)} alt={media.title}
                                             className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                             onError={() => setThumbnailError(true)}/>
                                    ) : null}
                                    <div className="relative z-10 flex flex-col items-center gap-3 text-foreground">
                                        <Upload className="w-10 h-10"/>
                                        <p className="font-semibold">{t('mediaEdit.dragOrClickThumbnail', '拖拽或点击更换缩略图')}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{t('mediaEdit.thumbnailRecommended', '推荐: 1920x1080 (16:9)')}</p>
                                    </div>
                                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold flex items-center gap-2">
                                        <Edit className="w-4 h-4"/>{t('mediaEdit.change', '更换')}
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <Label htmlFor="description" className="text-xs text-muted-foreground block mb-2 uppercase font-bold tracking-wider">{t('mediaEdit.description', '描述')}</Label>
                                    <textarea id="description"
                                              className="w-full bg-card border border-border rounded-lg p-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none min-h-[80px]"
                                              value={form.description}
                                              onChange={e => setForm({...form, description: e.target.value})}
                                              placeholder={t('mediaEdit.descriptionPlaceholder', '添加关于这个媒体文件的详细描述...')}/>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tabs Navigation */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
                            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto gap-2 flex flex-wrap">
                                {[
                                    {key: 'metadata', label: t('mediaEdit.tabMetadata', '元数据')},
                                    {key: 'publishing', label: t('mediaEdit.tabPublishing', '发布设置')},
                                    {key: 'encoding', label: t('mediaEdit.tabEncoding', '编码任务')},
                                    {key: 'subtitles', label: t('mediaEdit.tabSubtitles', '字幕')},
                                    {key: 'stats', label: t('mediaEdit.tabStats', '统计信息')}
                                ].map(tab => (
                                    <TabsTrigger
                                        key={tab.key}
                                        value={tab.key}
                                        className="px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* Tab Content: Metadata */}
                            <TabsContent value="metadata" className="bg-card rounded-lg border p-6 space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold">语言</Label>
                                            <Select defaultValue="en">
                                                <SelectTrigger>
                                                    <SelectValue placeholder="选择语言"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en">{t('mediaEdit.englishUS', '英语（美国）')}</SelectItem>
                                                    <SelectItem value="zh">{t('mediaEdit.chineseSimplified', '简体中文')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold">内容分级</Label>
                                            <Select defaultValue="general">
                                                <SelectTrigger>
                                                    <SelectValue placeholder="选择内容分级"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="general">G - 普通观众</SelectItem>
                                                    <SelectItem value="pg">PG - 家长指引</SelectItem>
                                                    <SelectItem value="pg13">PG-13</SelectItem>
                                                    <SelectItem value="r">R - 限制级</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold">缩略图时间</Label>
                                            <Input defaultValue="" placeholder="00:00:00.000" className="bg-card"/>
                                        </div>

                                        <div className="space-y-3 pt-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 pb-1">资源链接</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                <button className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg text-xs hover:bg-card/80 group">
                                                    <span className="flex items-center gap-2"><Link2 className="w-4 h-4 text-primary"/>{t('mediaEdit.hlsManifest', 'HLS 播放清单')}</span>
                                                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
                                                </button>
                                                <button className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg text-xs hover:bg-card/80 group">
                                                    <span className="flex items-center gap-2"><Video className="w-4 h-4 text-secondary"/>{t('mediaEdit.spriteMap', '雪碧图')}</span>
                                                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold">标签</Label>
                                            <div className="flex flex-wrap gap-2 p-3 bg-card border border-border rounded-lg min-h-[120px] content-start">
                                                {form.tags.split(',').map((tag, i) => tag.trim() && (
                                                    <Badge key={i} variant="secondary" className="text-xs px-2 py-1 gap-1">
                                                        {tag.trim()}
                                                        <button className="hover:text-destructive ml-0.5"
                                                                onClick={() => {
                                                                    const tags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
                                                                    tags.splice(i, 1);
                                                                    setForm({...form, tags: tags.join(', ')});
                                                                }}>×</button>
                                                    </Badge>
                                                ))}
                                                <input
                                                    value={tagInput}
                                                    onChange={e => setTagInput(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && tagInput.trim()) {
                                                            e.preventDefault();
                                                            const current = form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                            const newTag = tagInput.trim().replace(/,/g, '');
                                                            if (newTag && !current.includes(newTag)) {
                                                                setForm({...form, tags: [...current, newTag].join(', ')});
                                                            }
                                                            setTagInput('');
                                                        }
                                                    }}
                                                    placeholder={t('mediaEdit.tagsPlaceholder', '输入后按回车添加...')}
                                                    className="bg-transparent border-none focus-visible:ring-0 text-xs min-w-[120px] flex-1 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 pb-1">技术规格</h4>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between"><span className="text-muted-foreground">格式</span><span className="font-bold">{media.type?.toUpperCase() || t('mediaEdit.videoType', '视频')}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">分辨率</span><span className="font-bold">{media.width && media.height ? `${media.width}x${media.height}` : t('common.na', '无')}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">时长</span><span className="font-bold">{media.duration ? `${Math.floor(media.duration / 60)}:${String(Math.floor(media.duration % 60)).padStart(2, '0')}` : t('common.na', '无')}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">大小</span><span className="font-bold">{media.size || t('common.na', '无')}</span></div>
                                                <div className="mt-4 bg-muted px-2 py-1.5 rounded border border-border/30 flex items-center justify-between">
                                                    <span className="text-[11px] font-mono text-primary truncate">MD5: {media.md5sum || t('common.na', '无')}</span>
                                                    <Copy className="w-4 h-4 text-muted-foreground hover:text-primary"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Tab Content: Publishing */}
                            <TabsContent value="publishing" className="bg-card rounded-lg border p-6">
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('mediaEdit.privacyLevel', 'Privacy Level')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {[
                                            {value: '1', labelKey: 'mediaEdit.privacyPublic', labelFb: 'Public', icon: 'public', descKey: 'mediaEdit.privacyPublicDesc', descFb: 'Visible to everyone'},
                                            {value: '2', labelKey: 'mediaEdit.privacyPrivate', labelFb: 'Private', icon: 'lock', descKey: 'mediaEdit.privacyPrivateDesc', descFb: 'Only you can view'},
                                            {value: '3', labelKey: 'mediaEdit.privacyUnlisted', labelFb: 'Unlisted', icon: 'visibility_off', descKey: 'mediaEdit.privacyUnlistedDesc', descFb: 'Anyone with the link can view'},
                                            {value: '4', labelKey: 'mediaEdit.privacyPaid', labelFb: 'Paid', icon: 'paid', descKey: 'mediaEdit.privacyPaidDesc', descFb: 'Requires payment to unlock'},
                                            {value: '5', labelKey: 'mediaEdit.privacySubscribers', labelFb: 'Subscribers Only', icon: 'subscribers', descKey: 'mediaEdit.privacySubscribersDesc', descFb: 'Only subscribers can view'},
                                        ].map(option => (
                                            <label key={option.value} className="cursor-pointer group relative">
                                                <input type="radio" name="privacy" checked={String(form.privacy) === option.value}
                                                       onChange={() => setForm({...form, privacy: Number(option.value)})}
                                                       className="peer hidden"/>
                                                <div className="h-full p-4 rounded-lg border border-border bg-card flex flex-col gap-1.5 transition-all peer-checked:border-primary peer-checked:bg-primary/10">
                                                    <div className="flex justify-between items-center">
                                                        <div className="p-2 bg-primary/10 rounded-md">
                                                            {option.icon === 'public' && <Eye className="w-5 h-5 text-primary"/>}
                                                            {option.icon === 'lock' && <ShieldCheck className="w-5 h-5 text-muted-foreground"/>}
                                                            {option.icon === 'visibility_off' && <XCircle className="w-5 h-5 text-muted-foreground"/>}
                                                            {option.icon === 'paid' && <Star className="w-5 h-5 text-amber-500"/>}
                                                            {option.icon === 'subscribers' && <Users className="w-5 h-5 text-indigo-500"/>}
                                                        </div>
                                                        <div className="w-4 h-4 rounded-full border-2 border-border flex items-center justify-center peer-checked:border-primary">
                                                            <div className={`w-2 h-2 rounded-full bg-primary ${String(form.privacy) === option.value ? 'opacity-100' : 'opacity-0'}`}/>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-sm">{t(option.labelKey, option.labelFb)}</p>
                                                    <p className="text-xs text-muted-foreground">{t(option.descKey, option.descFb)}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-border/30">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.configSwitches', 'Configuration Switches')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                            <div><p className="text-sm font-bold">{t('mediaEdit.featuredContent', 'Featured')}</p><p className="text-xs text-muted-foreground">{t('mediaEdit.featuredContentDesc', 'Show in hero slider')}</p></div>
                                            <input type="checkbox" checked={form.featured}
                                                   onChange={e => setForm({...form, featured: e.target.checked})}
                                                   className="w-10 h-5 bg-muted rounded-full border-border text-primary focus-visible:ring-0 cursor-pointer"/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                            <div><p className="text-sm font-bold">{t('mediaEdit.allowComments', 'Allow Comments')}</p><p className="text-xs text-muted-foreground">{t('mediaEdit.allowCommentsDesc', 'Users can post comments')}</p></div>
                                            <input type="checkbox" checked={form.enable_comments}
                                                   onChange={e => setForm({...form, enable_comments: e.target.checked})}
                                                   className="w-10 h-5 bg-muted rounded-full border-border text-primary focus-visible:ring-0 cursor-pointer"/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                            <div><p className="text-sm font-bold">{t('mediaEdit.allowListable', 'List in Directory')}</p><p className="text-xs text-muted-foreground">{t('mediaEdit.allowListableDesc', 'Show in video listings')}</p></div>
                                            <input type="checkbox" checked={form.listable}
                                                   onChange={e => setForm({...form, listable: e.target.checked})}
                                                   className="w-10 h-5 bg-muted rounded-full border-border text-primary focus-visible:ring-0 cursor-pointer"/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                            <div><p className="text-sm font-bold">{t('mediaEdit.allowDownload', 'Allow Download')}</p><p className="text-xs text-muted-foreground">{t('mediaEdit.allowDownloadDesc', 'Enable offline viewing')}</p></div>
                                            <input type="checkbox" checked={form.allow_download}
                                                   onChange={e => setForm({...form, allow_download: e.target.checked})}
                                                   className="w-10 h-5 bg-muted rounded-full border-border text-primary focus-visible:ring-0 cursor-pointer"/>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Tab Content: Encoding */}
                            <TabsContent value="encoding" className="bg-card rounded-lg border p-6">
                                <div className="flex items-center gap-2 mb-6 overflow-x-auto">
                                    <Button variant="default" size="sm" className="rounded-full text-xs font-bold">{t('common.all', 'All')} ({tasks.length})</Button>
                                    {taskSummary.pending > 0 && <Button variant="secondary" size="sm" className="rounded-full text-xs font-bold">{t('common.status.pending', 'Queued')} ({taskSummary.pending})</Button>}
                                    {taskSummary.processing > 0 && <Button variant="secondary" size="sm" className="rounded-full text-xs font-bold text-primary bg-primary/20">{t('common.status.processing', 'Processing')} ({taskSummary.processing})</Button>}
                                    {taskSummary.success > 0 && <Button variant="secondary" size="sm" className="rounded-full text-xs font-bold text-success bg-success/20">{t('common.status.success', 'Completed')} ({taskSummary.success})</Button>}
                                </div>

                                <div className="space-y-4 mb-8">
                                    {tasks.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-8 text-center">{t('mediaEdit.noEncodingTasks', 'No encoding tasks')}</p>
                                    ) : (
                                        tasks.map(task => (
                                            <div key={task.id} className="p-4 bg-muted rounded-lg border border-border relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-3 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <StatusDot status={encodingStatusDot(task.status)} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-sm">{getProfileName(task.profile_id)}</p>
                                                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-mono rounded uppercase">
                                                                    {getProfileInfo(task.profile_id).split(' / ')[1] || t('mediaEdit.codec', 'Codec')}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">{t('mediaEdit.created', 'Created')}: {formatDateTime(task.create_time)}</p>
                                                        </div>
                                                    </div>
                                                    {task.status === 'failed' && (
                                                        <Button variant="outline" size="sm" onClick={() => handleRetryTask(task.id)}>
                                                            <RefreshCw className="w-3 h-3 mr-1"/>{t('common.retry', 'Retry')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="border-t border-border/30 pt-6">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('mediaEdit.mediaVariants', 'Media Variants')}</h3>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="text-muted-foreground border-b border-border/20 uppercase tracking-tighter">
                                                <TableRow>
                                                    <TableHead className="pb-2 font-bold">变体</TableHead>
                                                    <TableHead className="pb-2 font-bold">分辨率</TableHead>
                                                    <TableHead className="pb-2 font-bold">编码</TableHead>
                                                    <TableHead className="pb-2 font-bold">大小</TableHead>
                                                    <TableHead className="pb-2 font-bold">操作</TableHead>
                                                    <TableHead className="pb-2 font-bold">状态</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="divide-y divide-border/10">
                                                {tasks.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                                            暂无转码变体
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    tasks.map((task) => {
                                                        const profile = profiles.get(task.profile_id);
                                                        return (
                                                            <TableRow key={task.id}>
                                                                <TableCell className="py-3 font-mono">{profile?.name || `${t('mediaEdit.profile', '配置')}-${task.profile_id}`}</TableCell>
                                                                <TableCell className="py-3">{profile?.resolution || '-'}</TableCell>
                                                                <TableCell className="py-3">{profile?.video_codec || '-'}</TableCell>
                                                                <TableCell className="py-3">{task.progress}%</TableCell>
                                                                <TableCell className="py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Button variant="ghost" size="icon" className="w-6 h-6"><Eye className="w-4 h-4"/></Button>
                                                                        <Button variant="ghost" size="icon" className="w-6 h-6"><Copy className="w-4 h-4"/></Button>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-3">
                                                                    {task.status === 'success' && <CheckCircle className="w-5 h-5 text-success"/>}
                                                                    {task.status === 'processing' && <Loader2 className="w-5 h-5 text-primary animate-spin"/>}
                                                                    {task.status === 'failed' && <XCircle className="w-5 h-5 text-destructive"/>}
                                                                    {task.status === 'pending' && <Clock className="w-5 h-5 text-muted-foreground"/>}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Regenerate Thumbnail Confirmation */}
                                <DeleteConfirmDialog
                                    open={regenThumbnailConfirmOpen}
                                    onOpenChange={setRegenThumbnailConfirmOpen}
                                    title={t('mediaEdit.regenerateThumbnail')}
                                    isDeleting={isRegenerating}
                                    onConfirm={handleRegenerateThumbnail}
                                    confirmLabel={t('mediaEdit.confirmRegenerate')}
                                    description={t('mediaEdit.confirmRegenerateThumbnailDesc')}
                                />

                                {/* Regenerate Sprite Confirmation */}
                                <DeleteConfirmDialog
                                    open={regenSpriteConfirmOpen}
                                    onOpenChange={setRegenSpriteConfirmOpen}
                                    title={t('mediaEdit.regenerateSprite')}
                                    isDeleting={isRegenerating}
                                    onConfirm={handleRegenerateSprite}
                                    confirmLabel={t('mediaEdit.confirmRegenerate')}
                                    description={t('mediaEdit.confirmRegenerateSpriteDesc')}
                                />
                            </TabsContent>

                            {/* Tab Content: Subtitles */}
                            <TabsContent value="subtitles" className="bg-card rounded-lg border p-6 space-y-8">
                                {/* Add Subtitle Form — top section */}
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">添加字幕</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-bold uppercase">语言</Label>
                                            <Input placeholder="例如 zh-CN"/>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-bold uppercase">标签</Label>
                                            <Input placeholder="简体中文"/>
                                        </div>
                                        <div className="space-y-1 lg:col-span-2">
                                            <Label className="text-[11px] font-bold uppercase">文件 (VTT/SRT)</Label>
                                            <div className="flex gap-2">
                                                <Input type="file" className="flex-1 bg-card border border-border rounded-lg p-2 text-sm text-[11px]"/>
                                                <Button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shrink-0">
                                                    上传
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Current Subtitles Table — bottom section, full width */}
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">当前字幕</h3>
                                    <Table>
                                        <TableHeader className="text-muted-foreground border-b border-border/20 uppercase">
                                            <TableRow>
                                                <TableHead className="pb-2 font-bold">语言</TableHead>
                                                <TableHead className="pb-2 font-bold">标签</TableHead>
                                                <TableHead className="pb-2 font-bold">链接</TableHead>
                                                <TableHead className="pb-2 font-bold w-[80px]">操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-border/10">
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                                    暂无字幕
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* Tab Content: Stats */}
                            <TabsContent value="stats" className="bg-card rounded-lg border p-6">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">{t('mediaEdit.performanceMetrics', '性能指标')}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Eye className="text-primary text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.view_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{t('mediaEdit.views', '播放量')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <ThumbsUp className="text-success text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.like_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{t('mediaEdit.likes', '点赞')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <XCircle className="text-destructive text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.dislike_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{t('mediaEdit.dislikes', '踩')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <MessageSquare className="text-secondary text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.comment_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{t('mediaEdit.comments', '评论')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Star className="text-amber-400 text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.favorite_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{t('mediaEdit.favorites', '收藏')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Share2 className="text-primary-container text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">0</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{t('mediaEdit.shares', '分享')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Download className="text-foreground text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">0</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{t('mediaEdit.downloads', '下载')}</p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* RIGHT COLUMN (4/12) */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                        {/* Card 1: Identity */}
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('mediaEdit.identity', '身份信息')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="pb-3 border-b border-border/10">
                                    <Label className="text-[9px] text-muted-foreground font-bold block uppercase mb-1">{t('mediaEdit.resourceId', '资源ID')}</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-primary flex-1 truncate">{media.id}</code>
                                        <Copy className="w-4 h-4 text-muted-foreground hover:text-primary"/>
                                    </div>
                                </div>
                                <div className="pb-3 border-b border-border/10">
                                    <Label className="text-[9px] text-muted-foreground font-bold block uppercase mb-1">{t('mediaEdit.uuid', 'UUID')}</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-primary flex-1 truncate">{(media as any).uuid || media?.id || t('common.na', '无')}</code>
                                        <Copy className="w-4 h-4 text-muted-foreground hover:text-primary"/>
                                    </div>
                                </div>
                                <div className="pb-3">
                                    <Label className="text-[9px] text-muted-foreground font-bold block uppercase mb-1">{t('mediaEdit.shortToken', '短链Token')}</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-primary flex-1 truncate">{media.short_token || t('common.na', '无')}</code>
                                        <Copy className="w-4 h-4 text-muted-foreground hover:text-primary"/>
                                    </div>
                                </div>
                                <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 mt-2">
                                    <p>{t('mediaEdit.createdAt', '创建')}: <span className="font-mono text-foreground">{formatDateTime(media.create_time)}</span></p>
                                    <p>{t('mediaEdit.updatedAt', '更新')}: <span className="font-mono text-foreground">{formatDateTime(media.update_time)}</span></p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: State & Status */}
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('mediaEdit.stateStatus', 'State & Status')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1 items-center">
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">{t('mediaEdit.state', 'State')}</span>
                                        <StatusDot status={STATE_TO_STATUS_DOT[media.state] || 'unknown'} />
                                    </div>
                                    <div className="flex flex-col gap-1 items-center">
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">{t('mediaEdit.review', 'Review')}</span>
                                        <StatusDot
                                            status={media.review_status === 'approved' ? 'success' : media.review_status === 'rejected' ? 'failed' : 'pending'}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 items-center">
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">{t('mediaEdit.encoding', 'Encoding')}</span>
                                        <StatusDot status={encodingStatusDot(media.encoding_status)} />
                                    </div>
                                    <div className="flex flex-col gap-1 items-center">
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">{t('mediaEdit.sprite', 'Sprite')}</span>
                                        <StatusDot status="draft" label={t('mediaEdit.idle', 'Idle')} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 3: Ownership */}
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('mediaEdit.ownership', '归属信息')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-primary/20 flex items-center justify-center">
                                        <span className="text-primary font-bold text-sm">U</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{t('mediaEdit.user', '用户')}</p>
                                        <p className="text-[10px] text-muted-foreground">{t('mediaEdit.contentCreator', '内容创作者')}</p>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-3 border-t border-border/30">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">{t('mediaEdit.channel', '频道')}</span>
                                        <span className="font-bold">{t('mediaEdit.defaultChannel', '默认')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">{t('mediaEdit.category', '分类')}</span>
                                        <Badge variant="outline" className="text-[10px] font-bold">{media.category_id || t('mediaEdit.general', '通用')}</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 4: Workflow - Review */}
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('mediaEdit.workflow', '工作流')}</CardTitle>
                                    <Badge variant="outline" className="border-secondary text-secondary bg-secondary/10 text-[9px] font-bold uppercase">
                                        {t('mediaEdit.pendingReview', '待审核')}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <textarea className="w-full bg-muted border border-border rounded-lg p-2 text-xs min-h-[50px] resize-none" placeholder={t('mediaEdit.reviewNotes', '审核备注...')}></textarea>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button className="py-2 bg-green-600 text-white rounded-lg font-bold text-[11px] hover:bg-green-700">
                                        {t('mediaEdit.approve', '通过')}
                                    </Button>
                                    <Button className="py-2 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700">
                                        {t('mediaEdit.reject', '拒绝')}
                                    </Button>
                                </div>
                                <Button variant="outline" className="w-full py-1.5 font-bold text-[10px]">
                                    {t('mediaEdit.requestChanges', '请求修改')}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Card 5: Save & Danger */}
                        <Card className="bg-card">
                            <CardContent className="pt-4">
                                <div className="flex flex-col gap-3">
                                    <Button className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                                            onClick={handleSave}
                                            disabled={isSaving}>
                                        {isSaving ? <Spinner size="sm"/> : null}
                                        <span>{isSaving ? t('common.submitting', '提交中...') : t('mediaEdit.saveAllChanges', '保存所有更改')}</span>
                                    </Button>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Button variant="outline" className="w-full py-2 font-bold text-xs"
                                                onClick={() => setRegenThumbnailConfirmOpen(true)}
                                                disabled={isRegenerating}>
                                            {t('mediaEdit.regenerateThumbnail', '重新生成缩略图')}
                                        </Button>
                                        <Button variant="outline" className="w-full py-2 font-bold text-xs"
                                                onClick={() => setRegenSpriteConfirmOpen(true)}
                                                disabled={isRegenerating}>
                                            {t('mediaEdit.regenerateSprite', '重新生成雪碧图')}
                                        </Button>
                                    </div>
                                    <div className="pt-3 border-t border-border/30 mt-2">
                                        <Button variant="destructive" className="w-full py-2 bg-red-600/10 text-red-600 border border-red-600/30 hover:bg-red-600 hover:text-white flex items-center justify-center gap-2"
                                                onClick={() => setDeleteDialogOpen(true)}>
                                            <Delete className="w-4 h-4"/> {t('mediaEdit.deleteMediaAsset', '删除媒体资源')}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={media.title || t('mediaEdit.unnamedMedia', '未命名媒体')}
                isDeleting={isDeleting}
                onConfirm={handleDelete}
            />
        </div>
    );
}
