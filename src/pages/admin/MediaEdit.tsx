import {Spinner} from "@/components/ui/spinner"
import {useState, useEffect, useMemo, useCallback} from 'react';
import {useParams, useNavigate, Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {useTranslation} from 'react-i18next';
import {useAdminMediaDetail, useUpdateMedia, useDeleteMedia, useCategoryList} from '@/hooks/queries';
import {adminMediaApi, encodingApi, type EncodeProfile} from '@/lib/api/media';
import {api, API_BASE_URL} from '@/lib/request';
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
import {DeleteConfirmDialog} from '@/components/common/DeleteConfirmDialog';
import {useDirtyState, useSaveState, useKeyboardShortcut} from '@/hooks/useEditPage';
import {ArrowLeft, RefreshCw, Play, Eye, ThumbsUp, MessageSquare, Download, AlertTriangle, CheckCircle, Clock, XCircle, Image, Film, Star, Share2, Upload, Copy, Subtitles, Video, Music, BookOpen, ShieldCheck, Edit, Link2, Delete} from 'lucide-react';
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

/**
 * Map Media state to Badge variant
 */
const STATE_BADGE_VARIANT_MAP: Record<string, HeaderBadgeConfig['variant']> = {
    active: 'default',
    draft: 'secondary',
    deleted: 'destructive',
};

/**
 * Map Media to HeaderBadgeConfig[]
 */
const TYPE_LABEL_MAP: Record<string, string> = {
    video: '视频',
    audio: '音频',
    image: '图片',
    document: '文档',
};

const STATE_LABEL_MAP: Record<string, string> = {
    active: '已发布',
    draft: '草稿',
    deleted: '已删除',
    pending: '待审核',
};

function mapMediaToHeaderBadges(media: Media, t: (key: string) => string): HeaderBadgeConfig[] {
    const badges: HeaderBadgeConfig[] = [];

    // Type Badge — only show if type is meaningful
    const typeLabel = TYPE_LABEL_MAP[media.type] || media.type;
    if (typeLabel) {
        badges.push({
            type: 'media-type',
            variant: 'outline',
            label: typeLabel,
            ariaLabel: `媒体类型: ${typeLabel}`,
        });
    }

    // State Badge — only show if state is meaningful
    const stateLabel = STATE_LABEL_MAP[media.state] || media.state;
    if (stateLabel) {
        badges.push({
            type: 'state',
            variant: STATE_BADGE_VARIANT_MAP[media.state] || 'outline' as const,
            label: stateLabel,
            ariaLabel: `状态: ${stateLabel}`,
        });
    }

    // Featured Badge (conditional)
    if (media.featured) {
        badges.push({
            type: 'featured',
            variant: 'outline',
            label: t('mediaEdit.featured'),
            ariaLabel: t('mediaEdit.featuredContent'),
            className: 'text-warning border-amber-300',
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

/**
 * Resolve a potentially relative URL to a full URL.
 * Backend returns relative paths like "uploads/xxx.jpg" for thumbnails/posters.
 * We need to prepend the API base URL to make them loadable.
 */
function resolveMediaUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    // Already absolute URL (http://, https://, data:, blob:)
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    // Relative path: prepend API base URL
    const base = API_BASE_URL || '';
    return `${base}/${url.replace(/^\//, '')}`;
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
            adminMediaApi.getTasks(id).then((res: any) => setTasks((Array.isArray(res?.tasks) ? res.tasks : Array.isArray(res?.items) ? res.items : []))).catch(() => {});
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
            toast.success('保存成功');
        } catch (err: any) {
            setError();
            toast.error(`保存失败: ${err?.message || '未知错误'}`);
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
            toast.success('媒体已删除');
            navigate({to: '/admin/media'});
        } catch (err: any) {
            setIsDeleting(false);
            toast.error(`删除失败: ${err?.message || '未知错误'}`);
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

    // Retry encoding task
    const handleRetryTask = async (taskId: string) => {
        if (!id) return;
        try {
            await adminMediaApi.retryTask(id, taskId);
            const res = await adminMediaApi.getTasks(id);
            setTasks((Array.isArray((res as any)?.tasks) ? (res as any).tasks : Array.isArray((res as any)?.items) ? (res as any).items : []));
        } catch (err) {
            console.error('Failed to retry task', err);
        }
    };

    const handleRegenerateThumbnail = async () => {
        if (!id) return;
        setIsRegenerating(true);
        try {
            await api.post(`/admin/medias/${id}/regenerate-thumbnail`, {});
            toast.success(t('mediaEdit.thumbnailRegenerateScheduled'));
            const res = await adminMediaApi.getTasks(id);
            setTasks((Array.isArray((res as any)?.tasks) ? (res as any).tasks : Array.isArray((res as any)?.items) ? (res as any).items : []));
        } catch (err: any) {
            const errMsg = err?.message || '未知错误';
            toast.error(`${t('mediaEdit.thumbnailRegenerateFailed')}: ${errMsg}`);
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
            toast.success(t('mediaEdit.spriteRegenerateScheduled'));
            const res = await adminMediaApi.getTasks(id);
            setTasks((Array.isArray((res as any)?.tasks) ? (res as any).tasks : Array.isArray((res as any)?.items) ? (res as any).items : []));
        } catch (err: any) {
            const errMsg = err?.message || '未知错误';
            if (errMsg.includes('already processing') || errMsg.includes('already in progress')) {
                toast.warning(t('mediaEdit.spriteRegenerateScheduled'));
            } else {
                toast.error(`${t('mediaEdit.spriteRegenerateFailed')}: ${errMsg}`);
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

    const encodingStatusBadge = (status: string | undefined): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" => {
        switch (status) {
            case 'success': return 'success';
            case 'processing': return 'info';
            case 'pending': return 'warning';
            case 'failed': return 'destructive';
            default: return 'secondary';
        }
    };

    const encodingStatusLabel = (status: string | undefined) => {
        switch (status) {
            case 'success': return '完成';
            case 'processing': return '转码中';
            case 'pending': return '排队中';
            case 'failed': return '失败';
            case 'partial': return '部分完成';
            default: return status || '--';
        }
    };

    // Resolve profile_id to a human-readable profile name
    const getProfileName = (profileId: number): string => {
        const profile = profiles.get(profileId);
        if (profile) {
            return profile.name || `Profile #${profileId}`;
        }
        return `Profile #${profileId}`;
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
        if (taskSummary.success > 0) parts.push(`${taskSummary.success} 完成`);
        if (taskSummary.processing > 0) parts.push(`${taskSummary.processing} 转码中`);
        if (taskSummary.pending > 0) parts.push(`${taskSummary.pending} 排队中`);
        if (taskSummary.failed > 0) parts.push(`${taskSummary.failed} 失败`);
        if (taskSummary.partial > 0) parts.push(`${taskSummary.partial} 部分完成`);
        return parts.join('，');
    }, [taskSummary, tasks.length]);

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
                <p className="text-lg text-muted-foreground">无法加载媒体信息</p>
                <Button variant="outline" onClick={() => navigate({to: '/admin/media'})}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>返回列表
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
                            <Link to="/admin">{t('admin.title', 'Admin')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin/media">{t('admin.mediaManagement', 'Media Library')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.editMedia', 'Edit Media')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <EditPageHeader
                title={media.title || '未命名媒体'}
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
                    <Label htmlFor="media-title" className="text-xs text-muted-foreground block mb-2 uppercase font-bold tracking-wider">标题</Label>
                    <Input id="media-title" value={form.title}
                           onChange={e => setForm({...form, title: e.target.value})}
                           className="text-3xl font-bold h-auto py-1"
                           placeholder="输入媒体标题..."/>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN (8/12) */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                        {/* Hero Card */}
                        <Card className="bg-card">
                            <CardContent className="p-6">
                                <div className="relative aspect-video rounded-lg border border-dashed border-border overflow-hidden bg-muted flex items-center justify-center max-w-2xl mx-auto group cursor-pointer hover:border-primary transition-colors">
                                    {media.thumbnail && !thumbnailError ? (
                                        <img src={resolveMediaUrl(media.thumbnail)} alt={media.title}
                                             className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                             onError={() => setThumbnailError(true)}/>
                                    ) : null}
                                    <div className="relative z-10 flex flex-col items-center gap-3 text-foreground">
                                        <Upload className="w-10 h-10"/>
                                        <p className="font-semibold">拖拽或点击更换缩略图</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest">推荐: 1920x1080 (16:9)</p>
                                    </div>
                                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold flex items-center gap-2">
                                        <Edit className="w-4 h-4"/>更换
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <Label htmlFor="description" className="text-xs text-muted-foreground block mb-2 uppercase font-bold tracking-wider">描述</Label>
                                    <textarea id="description"
                                              className="w-full bg-card border border-border rounded-lg p-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none min-h-[80px]"
                                              value={form.description}
                                              onChange={e => setForm({...form, description: e.target.value})}
                                              placeholder="添加关于这个媒体文件的详细描述..."/>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tabs Navigation */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
                            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto gap-2 flex flex-wrap">
                                {['metadata', 'publishing', 'encoding', 'subtitles', 'stats'].map(tab => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                                    >
                                        {{metadata: '元数据', publishing: '发布设置', encoding: '编码任务', subtitles: '字幕', stats: '统计信息'}[tab]}
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
                                                    <SelectItem value="en">English (United States)</SelectItem>
                                                    <SelectItem value="zh">简体中文</SelectItem>
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
                                            <Input value="00:00:12.500" className="bg-card"/>
                                        </div>

                                        <div className="space-y-3 pt-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 pb-1">资源链接</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                <button className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg text-xs hover:bg-card/80 group">
                                                    <span className="flex items-center gap-2"><Link2 className="w-4 h-4 text-primary"/>HLS Manifest</span>
                                                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
                                                </button>
                                                <button className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg text-xs hover:bg-card/80 group">
                                                    <span className="flex items-center gap-2"><Video className="w-4 h-4 text-secondary"/>Sprite Map</span>
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
                                                    placeholder="输入后按回车添加..."
                                                    className="bg-transparent border-none focus-visible:ring-0 text-xs min-w-[120px] flex-1 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 pb-1">技术规格</h4>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between"><span className="text-muted-foreground">格式</span><span className="font-bold">{media.type?.toUpperCase() || 'VIDEO'}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">分辨率</span><span className="font-bold">{media.width && media.height ? `${media.width}x${media.height}` : 'N/A'}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">时长</span><span className="font-bold">{media.duration ? `${Math.floor(media.duration / 60)}:${String(Math.floor(media.duration % 60)).padStart(2, '0')}` : 'N/A'}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">大小</span><span className="font-bold">{media.size || 'N/A'}</span></div>
                                                <div className="mt-4 bg-muted px-2 py-1.5 rounded border border-border/30 flex items-center justify-between">
                                                    <span className="text-[11px] font-mono text-primary truncate">MD5: {media.md5sum || 'N/A'}</span>
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
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">隐私级别</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {[
                                            {value: '1', label: '公开', icon: 'public', desc: '所有人可见'},
                                            {value: '2', label: '私密', icon: 'lock', desc: '只有你可以查看'},
                                            {value: '3', label: '未列出', icon: 'visibility_off', desc: '任何有链接的人可查看'},
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
                                                        </div>
                                                        <div className="w-4 h-4 rounded-full border-2 border-border flex items-center justify-center peer-checked:border-primary">
                                                            <div className={`w-2 h-2 rounded-full bg-primary ${String(form.privacy) === option.value ? 'opacity-100' : 'opacity-0'}`}/>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-sm">{option.label}</p>
                                                    <p className="text-xs text-muted-foreground">{option.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-border/30">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">配置开关</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                            <div><p className="text-sm font-bold">精选内容</p><p className="text-xs text-muted-foreground">在英雄滑块中展示</p></div>
                                            <input type="checkbox" checked={form.featured}
                                                   onChange={e => setForm({...form, featured: e.target.checked})}
                                                   className="w-10 h-5 bg-muted rounded-full border-border text-primary focus-visible:ring-0 cursor-pointer"/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                            <div><p className="text-sm font-bold">允许评论</p><p className="text-xs text-muted-foreground">用户可以发表评论</p></div>
                                            <input type="checkbox" checked={form.enable_comments}
                                                   onChange={e => setForm({...form, enable_comments: e.target.checked})}
                                                   className="w-10 h-5 bg-muted rounded-full border-border text-primary focus-visible:ring-0 cursor-pointer"/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                            <div><p className="text-sm font-bold">允许列表展示</p><p className="text-xs text-muted-foreground">在视频列表中展示</p></div>
                                            <input type="checkbox" checked={form.listable}
                                                   onChange={e => setForm({...form, listable: e.target.checked})}
                                                   className="w-10 h-5 bg-muted rounded-full border-border text-primary focus-visible:ring-0 cursor-pointer"/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                            <div><p className="text-sm font-bold">允许下载</p><p className="text-xs text-muted-foreground">启用离线查看</p></div>
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
                                    <Button variant="default" size="sm" className="rounded-full text-xs font-bold">全部 ({tasks.length})</Button>
                                    {taskSummary.pending > 0 && <Button variant="secondary" size="sm" className="rounded-full text-xs font-bold">排队中 ({taskSummary.pending})</Button>}
                                    {taskSummary.processing > 0 && <Button variant="secondary" size="sm" className="rounded-full text-xs font-bold text-primary bg-primary/20">转码中 ({taskSummary.processing})</Button>}
                                    {taskSummary.success > 0 && <Button variant="secondary" size="sm" className="rounded-full text-xs font-bold text-success bg-success/20">完成 ({taskSummary.success})</Button>}
                                </div>

                                <div className="space-y-4 mb-8">
                                    {tasks.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-8 text-center">暂无编码任务</p>
                                    ) : (
                                        tasks.map(task => (
                                            <div key={task.id} className="p-4 bg-muted rounded-lg border border-border relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-3 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant={encodingStatusBadge(task.status)} className="text-xs">
                                                            {encodingStatusLabel(task.status)}
                                                        </Badge>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-sm">{getProfileName(task.profile_id)}</p>
                                                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-mono rounded uppercase">
                                                                    {getProfileInfo(task.profile_id).split(' / ')[1] || 'CODEC'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">创建: {formatDateTime(task.create_time)}</p>
                                                        </div>
                                                    </div>
                                                    {task.status === 'failed' && (
                                                        <Button variant="outline" size="sm" onClick={() => handleRetryTask(task.id)}>
                                                            <RefreshCw className="w-3 h-3 mr-1"/>重试
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="border-t border-border/30 pt-6">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">媒体变体</h3>
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
                                                {/* Demo rows */}
                                                <TableRow>
                                                    <TableCell className="py-3 font-mono">MASTER_4K</TableCell>
                                                    <TableCell className="py-3">3840x2160</TableCell>
                                                    <TableCell className="py-3">H.265</TableCell>
                                                    <TableCell className="py-3">{media.size || 'N/A'}</TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="ghost" size="icon" className="w-6 h-6"><Eye className="w-4 h-4"/></Button>
                                                            <Button variant="ghost" size="icon" className="w-6 h-6"><Copy className="w-4 h-4"/></Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <CheckCircle className="w-5 h-5 text-success"/>
                                                    </TableCell>
                                                </TableRow>
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
                                                <TableCell className="py-3">
                                                    <span className="px-2 py-0.5 bg-card border border-border rounded text-[10px] font-bold">
                                                        中文
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-3">简体中文 (强制)</TableCell>
                                                <TableCell className="py-3 font-mono text-primary text-[11px] truncate max-w-[200px]">/sub/zh.vtt</TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-3 text-muted-foreground">
                                                        <Edit className="w-4 h-4 hover:text-primary cursor-pointer"/>
                                                        <XCircle className="w-4 h-4 hover:text-destructive cursor-pointer"/>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* Tab Content: Stats */}
                            <TabsContent value="stats" className="bg-card rounded-lg border p-6">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">性能指标</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Eye className="text-primary text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.view_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">播放量</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <ThumbsUp className="text-success text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.like_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">点赞</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <XCircle className="text-destructive text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.dislike_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">踩</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <MessageSquare className="text-secondary text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.comment_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">评论</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Star className="text-amber-400 text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{(stats?.favorite_count ?? 0).toLocaleString()}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">收藏</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Share2 className="text-primary-container text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">0</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">分享</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Download className="text-foreground text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">0</p>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">下载</p>
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
                                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Identity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="pb-3 border-b border-border/10">
                                    <Label className="text-[9px] text-muted-foreground font-bold block uppercase mb-1">Resource ID</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-primary flex-1 truncate">{media.id}</code>
                                        <Copy className="w-4 h-4 text-muted-foreground hover:text-primary"/>
                                    </div>
                                </div>
                                <div className="pb-3 border-b border-border/10">
                                    <Label className="text-[9px] text-muted-foreground font-bold block uppercase mb-1">UUID</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-primary flex-1 truncate">550e8400-e29b-41d4-a716-446655440000</code>
                                        <Copy className="w-4 h-4 text-muted-foreground hover:text-primary"/>
                                    </div>
                                </div>
                                <div className="pb-3">
                                    <Label className="text-[9px] text-muted-foreground font-bold block uppercase mb-1">Short Token</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-primary flex-1 truncate">{media.short_token || 'N/A'}</code>
                                        <Copy className="w-4 h-4 text-muted-foreground hover:text-primary"/>
                                    </div>
                                </div>
                                <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 mt-2">
                                    <p>Created: <span className="font-mono text-foreground">{formatDateTime(media.create_time)}</span></p>
                                    <p>Updated: <span className="font-mono text-foreground">{formatDateTime(media.update_time)}</span></p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: State & Status */}
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">State & Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Lifecycle</span>
                                        <Badge variant="outline" className="justify-center border-success text-success bg-success/10">
                                            {media.state === 'active' ? 'ACTIVE' : (media.state?.toUpperCase() || 'DRAFT')}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Review</span>
                                        <Badge variant="outline" className="justify-center border-secondary text-secondary bg-secondary/10">
                                            {media.review_status ? media.review_status.toUpperCase() : 'PENDING'}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Encoding</span>
                                        <Badge variant="outline" className="justify-center border-primary text-primary bg-primary/10">
                                            {media.encoding_status ? media.encoding_status.toUpperCase() : 'PROCESSING'}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Sprites</span>
                                        <Badge variant="outline" className="justify-center">
                                            IDLE
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 3: Ownership */}
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ownership</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-primary/20 flex items-center justify-center">
                                        <span className="text-primary font-bold text-sm">U</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">User</p>
                                        <p className="text-[10px] text-muted-foreground">Content Creator</p>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-3 border-t border-border/30">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Channel</span>
                                        <span className="font-bold">Default</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Category</span>
                                        <Badge variant="outline" className="text-[10px] font-bold">{media.category_id || 'General'}</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 4: Workflow - Review */}
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Workflow</CardTitle>
                                    <Badge variant="outline" className="border-secondary text-secondary bg-secondary/10 text-[9px] font-bold uppercase">
                                        Awaiting Review
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <textarea className="w-full bg-muted border border-border rounded-lg p-2 text-xs min-h-[50px] resize-none" placeholder="Review notes..."></textarea>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button className="py-2 bg-green-600 text-white rounded-lg font-bold text-[11px] hover:bg-green-700">
                                        Approve
                                    </Button>
                                    <Button className="py-2 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700">
                                        Reject
                                    </Button>
                                </div>
                                <Button variant="outline" className="w-full py-1.5 font-bold text-[10px]">
                                    Request Changes
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
                                        <span>{isSaving ? '保存中...' : 'Save All Changes'}</span>
                                    </Button>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Button variant="outline" className="w-full py-2 font-bold text-xs"
                                                onClick={() => setRegenThumbnailConfirmOpen(true)}
                                                disabled={isRegenerating}>
                                            Regenerate Thumbnail
                                        </Button>
                                        <Button variant="outline" className="w-full py-2 font-bold text-xs"
                                                onClick={() => setRegenSpriteConfirmOpen(true)}
                                                disabled={isRegenerating}>
                                            Regenerate Sprites
                                        </Button>
                                    </div>
                                    <div className="pt-3 border-t border-border/30 mt-2">
                                        <Button variant="destructive" className="w-full py-2 bg-red-600/10 text-red-600 border border-red-600/30 hover:bg-red-600 hover:text-white flex items-center justify-center gap-2"
                                                onClick={() => setDeleteDialogOpen(true)}>
                                            <Delete className="w-4 h-4"/> Delete Media Asset
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
                title={media.title || '未命名媒体'}
                isDeleting={isDeleting}
                onConfirm={handleDelete}
            />
        </div>
    );
}
