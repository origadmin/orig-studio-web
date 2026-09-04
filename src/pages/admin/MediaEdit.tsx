import {Spinner} from "@/components/ui/spinner"
import {useState, useEffect, useMemo, useCallback} from 'react';
import {useParams, useNavigate, Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {useTranslation} from 'react-i18next';
import type {TFunction} from 'i18next';
import {cn} from '@/lib/utils';
import {useAdminMediaDetail, useUpdateMedia, useDeleteMedia, useCategoryList} from '@/hooks/queries';
import {adminMediaApi, encodingApi, type EncodeProfile} from '@/lib/api/media';
import {adminApi, type Channel as AdminChannel} from '@/lib/api/admin';
import {reviewApi} from '@/lib/api/review';
import {SubtitleManager} from '@/components/common/SubtitleManager';
import {api} from '@/lib/request';
import {getFullUrl, withCacheBust} from '@/lib/utils';
import {getVideoGenreOptions} from '@/lib/utils/categoryTree';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {Alert, AlertTitle, AlertDescription} from '@/components/ui/alert';
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose} from '@/components/ui/dialog';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Switch} from '@/components/ui/switch';
import {StatusDot, type StatusDotStatus} from '@/components/common/StatusDot';
import type {HeaderBadgeConfig} from '@/components/common/EditPageHeader';
import {DeleteConfirmDialog} from '@/components/common/DeleteConfirmDialog';
import ThumbnailSelectDialog from '@/components/common/ThumbnailSelectDialog';
import {useDirtyState, useSaveState, useKeyboardShortcut} from '@/hooks/useEditPage';
import {ArrowLeft, RefreshCw, Play, Eye, ThumbsUp, MessageSquareText, Download, AlertTriangle, CheckCircle, Clock, XCircle, Image, Film, Star, Share2, Upload, Copy, Subtitles, Video, Music, BookOpen, ShieldCheck, Edit, Link2, Delete, Loader2, Users, Save, User as UserIcon, Wrench, Settings2, Plus, Trash2, ExternalLink, AlertCircle} from 'lucide-react';
import {formatDateTime, formatDuration, formatFileSize} from '@/lib/format';
import {serializeTags, parseTagsInput} from '@/lib/utils/hashtag';
import {toast} from 'sonner';
import {useQueryClient} from '@tanstack/react-query';
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
    share_count?: number;
    download_count?: number;
    encoding_status: string;
}

const TYPE_I18N_KEYS: Record<string, string> = {
    video: 'admin.video',
    audio: 'admin.audio',
    image: 'admin.image',
    document: 'admin.document',
};

function getComprehensiveStatus(media: Media): StatusDotStatus {
    const enc = media.encoding_status;
    const st = media.state;
    if (enc === 'failed') return 'failed';
    if (enc === 'processing') return 'processing';
    if (enc === 'pending') return 'pending';
    if (enc === 'partial') return 'partial';
    if (enc === 'success' || st === 'active') return 'success';
    if (st === 'draft') return 'draft';
    if (st === 'deleted') return 'deleted';
    return 'unknown';
}

function getStatusLabel(media: Media, t: TFunction): string {
    const status = getComprehensiveStatus(media);
    switch (status) {
        case 'success': return t('common.status.success', 'Published');
        case 'processing': return t('common.status.processing', 'Processing');
        case 'pending': return t('common.status.pending', 'Queued');
        case 'failed': return t('common.status.failed', 'Failed');
        case 'partial': return t('common.status.partial', 'Partial');
        case 'draft': return t('common.status.draft', 'Draft');
        case 'deleted': return t('common.status.deleted', 'Deleted');
        default: return t('common.unknown', 'Unknown');
    }
}

interface StatusPillConfig {
    bg: string;
    text: string;
    border: string;
    labelKey: string;
    fallback: string;
}

function getLifecyclePill(state?: string): StatusPillConfig {
    switch (state) {
        case 'active':
        case 'published':
            return {bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', labelKey: 'mediaEdit.lifecycleActive', fallback: 'ACTIVE'};
        case 'draft':
            return {bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', labelKey: 'mediaEdit.lifecycleDraft', fallback: 'DRAFT'};
        case 'deleted':
            return {bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30', labelKey: 'mediaEdit.lifecycleDeleted', fallback: 'DELETED'};
        default:
            return {bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', labelKey: 'common.unknown', fallback: 'UNKNOWN'};
    }
}

function getReviewPill(status?: string): StatusPillConfig {
    switch (status) {
        // BUG-236: 后端 ReviewMedia 状态机实际值为 pending_review / reviewed / rejected
        // （提交 approved 会被后端转存为 reviewed；兼容旧值 approved/pending）。
        case 'reviewed':
        case 'approved':
            return {bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', labelKey: 'mediaEdit.reviewApproved', fallback: 'APPROVED'};
        case 'rejected':
            return {bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30', labelKey: 'mediaEdit.reviewRejected', fallback: 'REJECTED'};
        case 'pending_review':
        case 'pending':
        default:
            return {bg: 'bg-info/10', text: 'text-info', border: 'border-info/30', labelKey: 'mediaEdit.reviewPending', fallback: 'PENDING'};
    }
}

function getEncodingPill(status?: string): StatusPillConfig {
    switch (status) {
        case 'success':
            return {bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', labelKey: 'mediaEdit.encodingSuccess', fallback: 'SUCCESS'};
        case 'processing':
            return {bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', labelKey: 'mediaEdit.encodingProcessing', fallback: 'PROCESSING'};
        case 'failed':
            return {bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30', labelKey: 'mediaEdit.encodingFailed', fallback: 'FAILED'};
        case 'partial':
            return {bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', labelKey: 'mediaEdit.encodingPartial', fallback: 'PARTIAL'};
        case 'pending':
            return {bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', labelKey: 'mediaEdit.encodingPending', fallback: 'QUEUED'};
        default:
            return {bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', labelKey: 'common.unknown', fallback: 'IDLE'};
    }
}

const IDLE_PILL: StatusPillConfig = {
    bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', labelKey: 'mediaEdit.spritesIdle', fallback: 'IDLE',
};

function getSpritePill(status?: string): StatusPillConfig {
    switch (status) {
        case 'success':
            return {bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', labelKey: 'mediaEdit.spriteReady', fallback: 'READY'};
        case 'processing':
            return {bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', labelKey: 'mediaEdit.encodingProcessing', fallback: 'PROCESSING'};
        case 'failed':
            return {bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30', labelKey: 'mediaEdit.spriteFailed', fallback: 'FAILED'};
        case 'pending':
            return {bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', labelKey: 'mediaEdit.encodingPending', fallback: 'QUEUED'};
        default:
            return IDLE_PILL;
    }
}

// BUG-087 后续: 完整性状态 pill(第 5 个 pill)
function getIntegrityPill(status?: string): StatusPillConfig {
    switch (status) {
        case 'success':
            return {bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', labelKey: 'mediaEdit.integritySuccess', fallback: 'COMPLETE'};
        case 'failed':
            return {bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30', labelKey: 'mediaEdit.integrityFailed', fallback: 'BROKEN'};
        case 'partial':
            return {bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', labelKey: 'mediaEdit.integrityPartial', fallback: 'PARTIAL'};
        case 'processing':
            return {bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', labelKey: 'mediaEdit.integrityProcessing', fallback: 'CHECKING'};
        default:
            return {bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', labelKey: 'mediaEdit.integrityUnknown', fallback: 'UNCHECKED'};
    }
}

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

    const statusDot = getComprehensiveStatus(media);
    const stateLabel = getStatusLabel(media, t);
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

export default function MediaEditPage() {
    const {id} = useParams({strict: false}) as {id: string};
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {data: media, isLoading, error} = useAdminMediaDetail(id);
    const updateMutation = useUpdateMedia();
    const deleteMutation = useDeleteMedia();
    const {data: categoriesData} = useCategoryList();
    // BUG-145: only genres under the `video` root are valid for a video.
    // The module roots (视频/音乐/文章) anchor modules and are not selectable.
    const genreOptions = useMemo(
        () => getVideoGenreOptions(categoriesData?.items ?? []),
        [categoriesData]
    );

    // Form state with dirty tracking
    const {form, setForm, isDirty, resetDirty, syncFromData} = useDirtyState({
        title: '',
        description: '',
        state: 'draft',
        category_id: '' as string | number,
        channel_id: '' as string | number,
        tags: '',
        privacy: 1,
        featured: false,
        enable_comments: true,
        allow_download: false,
        listable: false,
        language: 'en',
        rating: 'general',
    });

    const [channels, setChannels] = useState<AdminChannel[]>([]);

    const [stats, setStats] = useState<MediaStats | null>(null);
    const [tasks, setTasks] = useState<EncodingTask[]>([]);
    const [profiles, setProfiles] = useState<Map<number, EncodeProfile>>(new Map());
    const [activeTab, setActiveTab] = useState<string>('metadata');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [thumbnailDialogOpen, setThumbnailDialogOpen] = useState(false);
    const [thumbnailVersion, setThumbnailVersion] = useState(Date.now());
    const queryClient = useQueryClient();
    const [isDeleting, setIsDeleting] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(false);
    const [regenThumbnailConfirmOpen, setRegenThumbnailConfirmOpen] = useState(false);
    const [regenSpriteConfirmOpen, setRegenSpriteConfirmOpen] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    // BUG-087 后续: 完整性校验/修复状态
    const [integrityChecking, setIntegrityChecking] = useState(false);
    const [repairConfirmOpen, setRepairConfirmOpen] = useState(false);
    const [repairing, setRepairing] = useState(false);
    const [tagInput, setTagInput] = useState('');

    // BUG-236: workflow card — real review actions (approve/reject) + notes.
    const [reviewNote, setReviewNote] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState('');


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
                channel_id: media.channel_id ?? '',
                tags: serializeTags(media.tags || []),
                privacy: normalizePrivacy(media.privacy),
                featured: media.featured || false,
                enable_comments: media.enable_comments ?? true,
                allow_download: media.allow_download ?? false,
                listable: media.listable ?? false,
                language: (media as any).language || 'en',
                rating: (media as any).rating || 'general',
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

    // BUG-105: load all channels for the channel-assignment selector.
    useEffect(() => {
        adminApi.getChannels({page: 1, page_size: 100}).then((res: any) => {
            const list = Array.isArray(res?.items) ? res.items : [];
            setChannels(list);
        }).catch(() => {});
    }, []);

    // SSE: 转码事件流实时更新
    useEffect(() => {
        if (!id) return;
        const sseUrl = encodingApi.getSSEUrl(id);
        let es: EventSource | null = null;
        try {
            es = new EventSource(sseUrl);
            es.addEventListener('task_update', (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data);
                    setTasks(prev => prev.map(t =>
                        t.id === data.task_id ? {...t, status: data.status, progress: data.progress ?? t.progress} : t
                    ));
                } catch {}
            });
            es.addEventListener('task_complete', (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data);
                    setTasks(prev => prev.map(t =>
                        t.id === data.task_id ? {...t, status: data.status, progress: 100} : t
                    ));
                    // 转码完成,刷新 media 详情和 stats
                    queryClient.invalidateQueries({queryKey: ['adminMedia', 'detail', String(id)]});
                    adminMediaApi.getStats(id).then(setStats).catch(() => {});
                    adminMediaApi.getTasks(id).then((res) => setTasks(extractTasks(res))).catch(() => {});
                } catch {}
            });
            es.onerror = () => {
                // SSE 连接异常时静默处理(不影响用户操作)
            };
        } catch {
            // EventSource 创建失败时静默降级(用户仍可手动刷新)
        }
        return () => {
            if (es) {
                es.close();
                es = null;
            }
        };
    }, [id, queryClient]);

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
                    // BUG-105: '' (from the "无频道" option) clears the assignment.
                    channel_id: form.channel_id !== '' && form.channel_id !== undefined ? String(form.channel_id) : '',
                    tags: parseTagsInput(form.tags),
                    privacy: form.privacy,
                    featured: form.featured,
                    enable_comments: form.enable_comments,
                    allow_download: form.allow_download,
                    listable: form.listable,
                    language: form.language,
                    rating: form.rating,
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

    // BUG-236: workflow card — approve/reject review (owner+admin page).
    // Backend maps status 'approved' -> review_status 'reviewed' (biz/media.go:1005).
    const handleReview = useCallback(async (action: 'approve' | 'reject') => {
        if (!media?.id || reviewSubmitting) return;
        setReviewSubmitting(true);
        setReviewError('');
        try {
            await reviewApi.review(media.id, {action, comment: reviewNote});
            toast.success(action === 'approve'
                ? t('review.approveSuccess', '审核已通过')
                : t('review.rejectSuccess', '已拒绝'));
            setReviewNote('');
            await queryClient.invalidateQueries({queryKey: ['adminMedia', 'detail', media.id]});
        } catch (err: any) {
            const msg = err?.message || t('review.reviewFailed', '审核操作失败');
            setReviewError(msg);
            toast.error(msg);
            console.error('Review failed', err);
        } finally {
            setReviewSubmitting(false);
        }
    }, [media?.id, reviewNote, reviewSubmitting, queryClient, t]);

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
            await api.post(`/admin/medias/${id}/regen-thumbnail`, {});
            // Force the preview to refresh: the regenerated file lives at the
            // same storage path, so we must bump the cache-buster and refetch
            // the media detail to pick up the new cover bytes.
            setThumbnailVersion(Date.now());
            queryClient.invalidateQueries({queryKey: ['adminMedia', 'detail', String(id)]});
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

    // TODO(BUG-087后续): 后端 API 尚未实现,调用会返回 404
    // 设计文档: docs/ee/modules/media/integrity/00-INDEX.md
    // 待实现: 后端注册 POST /admin/medias/:id/integrity-check 路由
    const handleCheckIntegrity = async () => {
        if (!id) return;
        setIntegrityChecking(true);
        try {
            await adminMediaApi.checkIntegrity(id);
            await queryClient.invalidateQueries({queryKey: ['adminMedia', 'detail', String(id)]});
            toast.success(t('mediaEdit.integrityCheckScheduled', '完整性校验已启动'));
        } catch (err: any) {
            const status = err?.response?.status || err?.status;
            if (status === 404 || String(err?.message || '').includes('404')) {
                toast.info(t('mediaEdit.integrityNotAvailable', '完整性校验功能尚未上线'), {
                    description: t('mediaEdit.integrityNotAvailableDesc', '后端 API 尚未实现,预计后续版本支持。'),
                });
            } else {
                const errMsg = err?.message || t('common.unknown', '未知错误');
                toast.error(`${t('mediaEdit.integrityCheckFailed', '完整性校验失败')}: ${errMsg}`);
            }
            console.error('Failed to check integrity', err);
        } finally {
            setIntegrityChecking(false);
        }
    };

    // TODO(BUG-087后续): 后端 API 尚未实现,调用会返回 404
    // 设计文档: docs/ee/modules/media/integrity/00-INDEX.md
    // 待实现: 后端注册 POST /admin/medias/:id/repair 路由
    const handleRepairMedia = async () => {
        if (!id) return;
        setRepairing(true);
        try {
            await adminMediaApi.repairMedia(id);
            await queryClient.invalidateQueries({queryKey: ['adminMedia', 'detail', String(id)]});
            toast.success(t('mediaEdit.repairScheduled', '内容修复已调度,缺失分段将重新转码'));
        } catch (err: any) {
            const status = err?.response?.status || err?.status;
            if (status === 404 || String(err?.message || '').includes('404')) {
                toast.info(t('mediaEdit.repairNotAvailable', '内容修复功能尚未上线'), {
                    description: t('mediaEdit.repairNotAvailableDesc', '后端 API 尚未实现,预计后续版本支持。'),
                });
            } else {
                const errMsg = err?.message || t('common.unknown', '未知错误');
                toast.error(`${t('mediaEdit.repairFailed', '内容修复失败')}: ${errMsg}`);
            }
            console.error('Failed to repair media', err);
        } finally {
            setRepairing(false);
            setRepairConfirmOpen(false);
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

    const handleThumbnailSuccess = useCallback((newThumbnail?: string) => {
        setThumbnailError(false);
        setThumbnailVersion(Date.now());
        if (newThumbnail && media) {
            queryClient.setQueryData(['adminMedia', 'detail', String(id)], {
                ...media,
                thumbnail: newThumbnail,
            });
        }
        queryClient.invalidateQueries({queryKey: ['adminMedia', 'detail', String(id)]});
        queryClient.invalidateQueries({queryKey: ['admin-media-list']});
        queryClient.invalidateQueries({queryKey: ['publicMedia', 'detail']});
    }, [queryClient, id, media]);

    // Compute header badges from media
    const headerBadges = useMemo(() => media ? mapMediaToHeaderBadges(media, t) : [], [media, t]);

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

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t('common.copied', '已复制到剪贴板'));
        } catch {
            toast.error(t('common.copyFailed', '复制失败'));
        }
    };

    const typeBadgeStyle = (type?: string) => {
        switch (type) {
            case 'video': return 'bg-primary/10 text-primary';
            case 'image': return 'bg-success/10 text-success';
            case 'audio': return 'bg-info/10 text-info';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getCategoryName = () => {
        if (media.category?.name) return media.category.name;
        const catId = media.category_id;
        if (catId && categoriesData?.items) {
            const cat = categoriesData.items.find((c: any) => c.id === catId);
            if (cat?.name) return cat.name;
        }
        return t('mediaEdit.general', '通用');
    };

    const getUserName = () => {
        if (media.user?.nickname) return media.user.nickname;
        if (media.user?.username) return media.user.username;
        return t('common.unknown', '未知');
    };

    const getUserInitial = () => {
        const name = getUserName();
        return name === t('common.unknown', '未知') ? '?' : name.charAt(0).toUpperCase();
    };

    const getChannelName = () => {
        if (media.channel?.name) return media.channel.name;
        if (media.edges?.channels?.[0]?.name) return media.edges.channels[0].name;
        return '-';
    };

    const sidebarCards = (
        <div className="col-span-12 lg:col-span-4 space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">{t('mediaEdit.identity', '身份信息')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="pb-3 border-b border-border">
                        <Label className="text-xs text-muted-foreground font-bold block uppercase tracking-wider mb-1">{t('mediaEdit.resourceId', '资源ID')}</Label>
                        <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-primary flex-1 truncate">{media.id}</code>
                            <button onClick={() => copyToClipboard(media.id)}>
                                <Copy className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer"/>
                            </button>
                        </div>
                    </div>
                    <div className="pb-3 border-b border-border">
                        <Label className="text-xs text-muted-foreground font-bold block uppercase tracking-wider mb-1">{t('mediaEdit.shortToken', '短链Token')}</Label>
                        <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-primary flex-1 truncate">{media.short_token || t('common.na', '无')}</code>
                            {media.short_token && (
                                <button onClick={() => copyToClipboard(media.short_token!)}>
                                    <Copy className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer"/>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border mt-2">
                        <p>{t('mediaEdit.createdAt', '创建')}: <span className="font-mono text-foreground">{formatDateTime(media.create_time)}</span></p>
                        <p>{t('mediaEdit.updatedAt', '更新')}: <span className="font-mono text-foreground">{formatDateTime(media.update_time)}</span></p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">{t('mediaEdit.stateStatus', 'State & Status')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {(() => {
                            const lc = getLifecyclePill(media.state);
                            const rv = getReviewPill(media.review_status);
                            const enc = getEncodingPill(media.encoding_status);
                            const sp = getSpritePill(media.sprite_status);
                            const ig = getIntegrityPill(media.integrity_status);
                            return (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.lifecycle', 'Lifecycle')}</span>
                                        <span className={cn("px-2 py-1 rounded-full text-center text-xs font-medium border", lc.bg, lc.text, lc.border)}>
                                            {t(lc.labelKey, lc.fallback)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.review', 'Review')}</span>
                                        <span className={cn("px-2 py-1 rounded-full text-center text-xs font-medium border", rv.bg, rv.text, rv.border)}>
                                            {t(rv.labelKey, rv.fallback)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.encoding', 'Encoding')}</span>
                                        <span className={cn("px-2 py-1 rounded-full text-center text-xs font-medium border", enc.bg, enc.text, enc.border)}>
                                            {t(enc.labelKey, enc.fallback)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.sprites', 'Sprites')}</span>
                                        <span className={cn("px-2 py-1 rounded-full text-center text-xs font-medium border", sp.bg, sp.text, sp.border)}>
                                            {t(sp.labelKey, sp.fallback)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.integrity', 'Integrity')}</span>
                                        <span className={cn("px-2 py-1 rounded-full text-center text-xs font-medium border", ig.bg, ig.text, ig.border)}>
                                            {t(ig.labelKey, ig.fallback)}
                                        </span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">{t('mediaEdit.ownership', '归属信息')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                        {media.user?.avatar ? (
                            <img src={getFullUrl(media.user.avatar) || undefined} alt={getUserName()} className="w-10 h-10 rounded-full object-cover border border-border"/>
                        ) : (
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-primary/10 flex items-center justify-center">
                                {media.user ? (
                                    <span className="text-primary font-bold text-sm">{getUserInitial()}</span>
                                ) : (
                                    <UserIcon className="w-5 h-5 text-muted-foreground"/>
                                )}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{getUserName()}</p>
                            <p className="text-xs text-muted-foreground">{media.user?.id ? `ID: ${media.user.id}` : t('mediaEdit.contentCreator', '内容创作者')}</p>
                        </div>
                    </div>
                    <div className="space-y-3 pt-3 border-t border-border">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">{t('mediaEdit.channel', '频道')}</span>
                            <Select
                                value={form.channel_id !== '' && form.channel_id !== undefined ? String(form.channel_id) : '_none_'}
                                onValueChange={(val) => setForm({...form, channel_id: val === '_none_' ? '' : val})}
                            >
                                <SelectTrigger className="h-7 w-auto min-w-[130px] gap-1 border-none bg-muted hover:bg-accent px-2 text-sm">
                                    <SelectValue placeholder={t('mediaEdit.selectChannel', '选择频道')}/>
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4}>
                                    <SelectItem value="_none_">{t('mediaEdit.noChannel', '无频道（未归类）')}</SelectItem>
                                    {channels.map((ch) => (
                                        <SelectItem key={ch.id} value={String(ch.id)}>
                                            {ch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">{t('mediaEdit.category', '分类')}</span>
                            <span className="font-semibold">{getCategoryName()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card data-testid="workflow-card">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-semibold text-foreground">{t('mediaEdit.workflow', '工作流')}</CardTitle>
                        {(() => {
                            const rv = getReviewPill(media?.review_status);
                            return (
                                <Badge data-testid="workflow-review-badge" data-review-status={media?.review_status || ''} variant="outline" className={`${rv.bg} ${rv.text} ${rv.border} text-xs font-semibold uppercase`}>
                                    {t(rv.labelKey, rv.fallback)}
                                </Badge>
                            );
                        })()}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Textarea
                        className="min-h-[50px] resize-none bg-muted"
                        placeholder={t('mediaEdit.reviewNotes', '审核备注...')}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        disabled={reviewSubmitting || media?.review_status === 'reviewed' || media?.review_status === 'approved'}
                    />
                    {reviewError && <p className="text-xs text-destructive">{reviewError}</p>}
                    {media?.review_status === 'reviewed' || media?.review_status === 'approved' ? (
                        <p data-testid="review-approved-notice" className="text-xs text-success font-medium">{t('mediaEdit.alreadyReviewed', '该媒体已通过审核，无需重复操作')}</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <Button data-testid="review-approve"
                                className="py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700"
                                disabled={reviewSubmitting}
                                onClick={() => handleReview('approve')}
                            >
                                {t('mediaEdit.approve', '通过')}
                            </Button>
                            <Button data-testid="review-reject"
                                className="py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700"
                                disabled={reviewSubmitting}
                                onClick={() => handleReview('reject')}
                            >
                                {t('mediaEdit.reject', '拒绝')}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">{t('mediaEdit.actions', '操作')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full"
                            onClick={() => setRegenThumbnailConfirmOpen(true)}
                            disabled={isRegenerating}>
                        <Image className="w-4 h-4 mr-2"/>
                        {t('mediaEdit.regenerateThumbnail', '重新生成缩略图')}
                    </Button>
                    <Button variant="outline" className="w-full"
                            onClick={() => setRegenSpriteConfirmOpen(true)}
                            disabled={isRegenerating}>
                        <Film className="w-4 h-4 mr-2"/>
                        {t('mediaEdit.regenerateSprite', '重新生成雪碧图')}
                    </Button>
                    <div className="pt-2 border-t border-border mt-2">
                        <Button variant="destructive" className="w-full"
                                onClick={() => setDeleteDialogOpen(true)}>
                            <Delete className="w-4 h-4 mr-2"/> {t('mediaEdit.deleteMediaAsset', '删除媒体资源')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="space-y-6 p-6">
            <Breadcrumb className="mb-4">
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
            <div className="flex justify-between items-end gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <span className="h-8 w-8 shrink-0 flex items-center justify-center text-sky-600">
                            <Film className="h-8 w-8"/>
                        </span>
                        <Input
                            value={form.title}
                            onChange={e => setForm({...form, title: e.target.value})}
                            placeholder={t('mediaEdit.unnamedMedia', '未命名媒体')}
                            className="text-3xl font-bold tracking-tight border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring px-0 h-auto py-0 bg-transparent placeholder:text-muted-foreground/50 flex-1 min-w-0"
                        />
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 min-w-0">
                        <span className="inline-flex items-center gap-1.5 shrink-0">
                            {(() => {
                                const typeKey = TYPE_I18N_KEYS[media.type];
                                const typeLabel = typeKey ? t(typeKey, media.type) : media.type;
                                return typeLabel ? (
                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0", typeBadgeStyle(media.type))}>
                                        {typeLabel}
                                    </span>
                                ) : null;
                            })()}
                            <StatusDot status={getComprehensiveStatus(media)} label={getStatusLabel(media, t)}/>
                            {media.featured && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30 whitespace-nowrap shrink-0">
                                    {t('mediaEdit.featured', '推荐')}
                                </span>
                            )}
                        </span>
                        <span className="h-4 w-px bg-border shrink-0 hidden sm:block"/>
                        <p className="text-sm text-muted-foreground min-w-0 flex-1">{t('mediaEdit.mediaDescription', '管理媒体文件的元数据、发布设置和转码任务')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="w-4 h-4 mr-2"/>
                        {t('common.back', '返回')}
                    </Button>
                    {media.short_token && (
                        <Button variant="outline" onClick={handlePreview}>
                            <Eye className="w-4 h-4 mr-2"/>
                            {t('common.preview', '预览')}
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                        {t('common.save', '保存')}
                    </Button>
                </div>
            </div>

            {/* 转码状态横幅 */}
            {media.encoding_status === 'processing' && (
                <Alert variant="info">
                    <Loader2 className="w-4 h-4 animate-spin"/>
                    <AlertTitle>{t('mediaEdit.encodingInProgress', '转码进行中')}</AlertTitle>
                    <AlertDescription>
                        {t('mediaEdit.encodingInProgressDesc', '视频正在转码处理中,完成后将自动刷新。请勿关闭页面。')}
                        {taskSummary.processing > 0 && (
                            <span className="ml-2 font-mono text-xs">
                                {taskSummary.processing}/{taskSummary.total} {t('common.status.processing', '处理中')}
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}
            {media.encoding_status === 'pending' && (
                <Alert variant="warning">
                    <Clock className="w-4 h-4"/>
                    <AlertTitle>{t('mediaEdit.encodingQueued', '等待转码')}</AlertTitle>
                    <AlertDescription>
                        {t('mediaEdit.encodingQueuedDesc', '视频已加入转码队列,等待处理。')}
                        {taskSummary.pending > 0 && (
                            <span className="ml-2 font-mono text-xs">
                                {taskSummary.pending} {t('common.status.pending', '排队中')}
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}
            {media.encoding_status === 'failed' && (
                <Alert variant="destructive">
                    <XCircle className="w-4 h-4"/>
                    <AlertTitle>{t('mediaEdit.encodingFailedTitle', '转码失败')}</AlertTitle>
                    <AlertDescription>
                        {t('mediaEdit.encodingFailedDesc', '视频转码失败,请在编码任务 Tab 中查看详情或重试。')}
                        {taskSummary.failed > 0 && (
                            <span className="ml-2 font-mono text-xs">
                                {taskSummary.failed} {t('common.status.failed', '失败')}
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}
            {media.encoding_status === 'partial' && (
                <Alert variant="warning">
                    <AlertTriangle className="w-4 h-4"/>
                    <AlertTitle>{t('mediaEdit.encodingPartialTitle', '部分转码完成')}</AlertTitle>
                    <AlertDescription>
                        {t('mediaEdit.encodingPartialDesc', '部分清晰度转码成功,部分失败。请在编码任务 Tab 中查看详情。')}
                    </AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start rounded-t-xl rounded-b-none border-b bg-card p-0 h-auto">
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
                            className="px-6 py-3.5 text-sm data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none font-medium text-muted-foreground border-b-2 border-transparent hover:text-card-foreground hover:border-border transition-colors"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="space-y-6 mt-6">
                    <TabsContent value="metadata">
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 lg:col-span-8 space-y-6">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-6">
                                            <div className={cn(
                                                "relative aspect-video rounded-lg overflow-hidden cursor-pointer group transition-all",
                                                media.thumbnail && !thumbnailError
                                                    ? "border border-border hover:border-primary"
                                                    : "border border-dashed border-border bg-muted flex items-center justify-center hover:border-primary"
                                            )} onClick={() => setThumbnailDialogOpen(true)}>
                                                {media.thumbnail && !thumbnailError ? (
                                                    <>
                                                        <img src={withCacheBust(getFullUrl(media.thumbnail), thumbnailVersion)} alt={media.title}
                                                             className="absolute inset-0 w-full h-full object-cover transition-all duration-200 group-hover:brightness-50"
                                                             onError={() => setThumbnailError(true)}/>
                                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <Upload className="w-8 h-8"/>
                                                            <p className="text-sm font-medium">{t('mediaEdit.dragOrClickThumbnail', '拖拽或点击更换缩略图')}</p>
                                                        </div>
                                                        <div className="absolute bottom-3 right-3 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-medium flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <Edit className="w-3.5 h-3.5"/>{t('mediaEdit.change', '更换')}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="relative z-10 flex flex-col items-center gap-3 text-foreground">
                                                            <Upload className="w-10 h-10"/>
                                                            <p className="font-semibold">{t('mediaEdit.dragOrClickThumbnail', '拖拽或点击更换缩略图')}</p>
                                                            <p className="text-xs text-muted-foreground uppercase tracking-widest">{t('mediaEdit.thumbnailRecommended', '推荐: 1920x1080 (16:9)')}</p>
                                                        </div>
                                                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold flex items-center gap-2">
                                                            <Edit className="w-4 h-4"/>{t('mediaEdit.change', '更换')}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="description" className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">{t('mediaEdit.description', '描述')}</Label>
                                                <Textarea id="description"
                                                          className="min-h-[80px] resize-none"
                                                          value={form.description}
                                                          onChange={e => setForm({...form, description: e.target.value})}
                                                          placeholder={t('mediaEdit.descriptionPlaceholder', '添加关于这个媒体文件的详细描述...')}/>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t">
                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">{t('mediaEdit.language', '语言')}</Label>
                                                        <Select value={form.language} onValueChange={(v: string) => setForm({...form, language: v})}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder={t('mediaEdit.selectLanguage', '选择语言')}/>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="en">{t('mediaEdit.englishUS', '英语（美国）')}</SelectItem>
                                                                <SelectItem value="zh">{t('mediaEdit.chineseSimplified', '简体中文')}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">{t('mediaEdit.contentRating', '内容分级')}</Label>
                                                        <Select value={form.rating} onValueChange={(v: string) => setForm({...form, rating: v})}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder={t('mediaEdit.selectRating', '选择内容分级')}/>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="general">{t('mediaEdit.ratingG', 'G - 普通观众')}</SelectItem>
                                                                <SelectItem value="pg">{t('mediaEdit.ratingPG', 'PG - 家长指引')}</SelectItem>
                                                                <SelectItem value="pg13">PG-13</SelectItem>
                                                                <SelectItem value="r">{t('mediaEdit.ratingR', 'R - 限制级')}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">{t('mediaEdit.category', '分类')}</Label>
                                                        <Select value={String(form.category_id || '0')} onValueChange={val => setForm({...form, category_id: val !== '0' ? Number(val) : ''})}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder={t('mediaEdit.selectCategory', '选择分类')}/>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="0">{t('mediaEdit.general', '通用')}</SelectItem>
                                                                {genreOptions.map(cat => (
                                                                    <SelectItem key={cat.id} value={String(cat.id)} disabled={cat.isDisabled}>
                                                                        {cat.depth > 0 ? `${'\u00A0'.repeat(cat.depth * 4)}${cat.name}` : cat.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">{t('mediaEdit.tags', '标签')}</Label>
                                                        <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[120px] content-start">
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
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t">
                                                <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('mediaEdit.resourceLinks', '资源链接')}</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {media.hls_file ? (
                                                        <button onClick={() => {
                                                            const url = getFullUrl(media.hls_file!);
                                                            if (url) copyToClipboard(url);
                                                        }} className="flex items-center justify-between px-3 py-2 border rounded-lg text-xs hover:bg-accent group">
                                                            <span className="flex items-center gap-2"><Link2 className="w-4 h-4 text-primary"/>{t('mediaEdit.hlsManifest', 'HLS 播放清单')}</span>
                                                            <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
                                                        </button>
                                                    ) : null}
                                                    {media.sprite_path ? (
                                                        <button onClick={() => {
                                                            const url = getFullUrl(media.sprite_path!);
                                                            if (url) copyToClipboard(url);
                                                        }} className="flex items-center justify-between px-3 py-2 border rounded-lg text-xs hover:bg-accent group">
                                                            <span className="flex items-center gap-2"><Video className="w-4 h-4 text-teal-500"/>{t('mediaEdit.spriteMap', '雪碧图')}</span>
                                                            <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
                                                        </button>
                                                    ) : null}
                                                    {media.vtt_path ? (
                                                        <button onClick={() => {
                                                            const url = getFullUrl(media.vtt_path!);
                                                            if (url) copyToClipboard(url);
                                                        }} className="flex items-center justify-between px-3 py-2 border rounded-lg text-xs hover:bg-accent group">
                                                            <span className="flex items-center gap-2"><Subtitles className="w-4 h-4 text-info"/>{t('mediaEdit.spriteVtt', '雪碧图VTT')}</span>
                                                            <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
                                                        </button>
                                                    ) : null}
                                                    {media.preview_file_path ? (
                                                        <button onClick={() => {
                                                            const url = getFullUrl(media.preview_file_path!);
                                                            if (url) copyToClipboard(url);
                                                        }} className="flex items-center justify-between px-3 py-2 border rounded-lg text-xs hover:bg-accent group">
                                                            <span className="flex items-center gap-2"><Film className="w-4 h-4 text-amber-500"/>{t('mediaEdit.previewGif', '预览GIF')}</span>
                                                            <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
                                                        </button>
                                                    ) : null}
                                                    {media.thumbnail ? (
                                                        <button onClick={() => {
                                                            const url = getFullUrl(media.thumbnail!);
                                                            if (url) copyToClipboard(url);
                                                        }} className="flex items-center justify-between px-3 py-2 border rounded-lg text-xs hover:bg-accent group">
                                                            <span className="flex items-center gap-2"><Image className="w-4 h-4 text-success"/>{t('mediaEdit.thumbnailFile', '缩略图')}</span>
                                                            <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-4 border-t">
                                                <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('mediaEdit.techSpecs', '技术规格')}</h4>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div className="flex justify-between"><span className="text-muted-foreground">{t('mediaEdit.mediaType', '媒体类型')}</span><span className="font-medium">{media.type ? t(TYPE_I18N_KEYS[media.type] || 'common.unknown', media.type) : t('common.na', '无')}</span></div>
                                                    <div className="flex justify-between"><span className="text-muted-foreground">{t('mediaEdit.mimeType', 'MIME类型')}</span><span className="font-medium font-mono text-xs">{media.mime_type || t('common.na', '无')}</span></div>
                                                    <div className="flex justify-between"><span className="text-muted-foreground">{t('mediaEdit.extension', '扩展名')}</span><span className="font-medium font-mono">{media.extension || t('common.na', '无')}</span></div>
                                                    <div className="flex justify-between"><span className="text-muted-foreground">{t('mediaEdit.resolution', '分辨率')}</span><span className="font-medium">{media.width && media.height ? `${media.width}×${media.height}` : t('common.na', '无')}</span></div>
                                                    <div className="flex justify-between"><span className="text-muted-foreground">{t('mediaEdit.duration', '时长')}</span><span className="font-medium">{media.duration ? formatDuration(Math.round(media.duration)) : t('common.na', '无')}</span></div>
                                                    <div className="flex justify-between"><span className="text-muted-foreground">{t('mediaEdit.fileSize', '大小')}</span><span className="font-medium">{media.size ? formatFileSize(Number(media.size)) : t('common.na', '无')}</span></div>
                                                </div>
                                                <div className="mt-2 bg-muted px-3 py-2 rounded border flex items-center justify-between">
                                                    <span className="text-xs font-mono text-primary truncate">SHA256: {media.sha256 || t('common.na', '无')}</span>
                                                    {media.sha256 && (
                                                        <button onClick={() => copyToClipboard(media.sha256!)} className="shrink-0 ml-2">
                                                            <Copy className="w-4 h-4 text-muted-foreground hover:text-primary"/>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            {sidebarCards}
                        </div>
                    </TabsContent>

                    <TabsContent value="publishing">
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 lg:col-span-8 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold">{t('mediaEdit.publishingSettings', '发布设置')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
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

                                <div className="space-y-4 pt-6 border-t border-border">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.configSwitches', '配置选项')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium cursor-pointer" htmlFor="switch-featured">{t('mediaEdit.featuredContent', '精选推荐')}</Label>
                                                <p className="text-xs text-muted-foreground">{t('mediaEdit.featuredContentDesc', '在首页推荐位展示')}</p>
                                            </div>
                                            <Switch id="switch-featured" checked={form.featured}
                                                    onCheckedChange={checked => setForm({...form, featured: checked})}/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium cursor-pointer" htmlFor="switch-comments">{t('mediaEdit.allowComments', '允许评论')}</Label>
                                                <p className="text-xs text-muted-foreground">{t('mediaEdit.allowCommentsDesc', '用户可以发表评论')}</p>
                                            </div>
                                            <Switch id="switch-comments" checked={form.enable_comments}
                                                    onCheckedChange={checked => setForm({...form, enable_comments: checked})}/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium cursor-pointer" htmlFor="switch-listable">{t('mediaEdit.allowListable', '目录列表可见')}</Label>
                                                <p className="text-xs text-muted-foreground">{t('mediaEdit.allowListableDesc', '在视频列表中展示')}</p>
                                            </div>
                                            <Switch id="switch-listable" checked={form.listable}
                                                    onCheckedChange={checked => setForm({...form, listable: checked})}/>
                                        </div>

                                        <div className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium cursor-pointer" htmlFor="switch-download">{t('mediaEdit.allowDownload', '允许下载')}</Label>
                                                <p className="text-xs text-muted-foreground">{t('mediaEdit.allowDownloadDesc', '允许离线缓存')}</p>
                                            </div>
                                            <Switch id="switch-download" checked={form.allow_download}
                                                    onCheckedChange={checked => setForm({...form, allow_download: checked})}/>
                                        </div>
                                    </div>
                                </div>
                                    </CardContent>
                                </Card>
                            </div>
                            {sidebarCards}
                        </div>
                    </TabsContent>

                    <TabsContent value="encoding">
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 lg:col-span-8 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold">{t('mediaEdit.encodingTasks', '编码任务')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
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
                                                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-mono rounded uppercase">
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

                                <div className="border-t border-border pt-6">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('mediaEdit.mediaVariants', 'Media Variants')}</h3>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="text-muted-foreground border-b border-border uppercase tracking-tighter">
                                                <TableRow>
                                                    <TableHead className="pb-2 font-bold">{t('mediaEdit.variant')}</TableHead>
                                                    <TableHead className="pb-2 font-bold">{t('mediaEdit.resolution')}</TableHead>
                                                    <TableHead className="pb-2 font-bold">{t('mediaEdit.codec')}</TableHead>
                                                    <TableHead className="pb-2 font-bold">{t('mediaEdit.size')}</TableHead>
                                                    <TableHead className="pb-2 font-bold">{t('mediaEdit.actions')}</TableHead>
                                                    <TableHead className="pb-2 font-bold">{t('mediaEdit.status')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="divide-y divide-border/10">
                                                {tasks.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                                            {t('mediaEdit.noVariants')}
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

                                    </CardContent>
                                </Card>
                            </div>
                            {sidebarCards}
                        </div>
                    </TabsContent>

                    <TabsContent value="subtitles">
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 lg:col-span-8">
                                <SubtitleManager shortToken={media.short_token || ''} showLangManager />
                            </div>
                            {sidebarCards}
                        </div>
                    </TabsContent>

                    <TabsContent value="stats">
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 lg:col-span-8 space-y-6">
                                {/* TODO(BUG-087后续): 完整性校验后端 API 尚未实现,点击按钮会 404
                                    设计文档: docs/ee/modules/media/integrity/00-INDEX.md
                                    待实现: 后端 entity 加 integrity_status 字段 + 注册 API 路由 */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-semibold">{t('mediaEdit.integrityCheck', '内容完整性校验')}</CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCheckIntegrity}
                                                    disabled={integrityChecking}
                                                >
                                                    {integrityChecking ? (
                                                        <><Loader2 className="w-3 h-3 mr-1 animate-spin"/>{t('common.checking', '校验中')}</>
                                                    ) : media.integrity_detail ? (
                                                        <><RefreshCw className="w-3 h-3 mr-1"/>{t('mediaEdit.recheckIntegrity', '重新校验')}</>
                                                    ) : (
                                                        <><ShieldCheck className="w-3 h-3 mr-1"/>{t('mediaEdit.checkIntegrity', '校验完整性')}</>
                                                    )}
                                                </Button>
                                                {media.integrity_detail && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => setRepairConfirmOpen(true)}
                                                        disabled={repairing || media.integrity_status === 'success'}
                                                    >
                                                        {repairing ? (
                                                            <><Loader2 className="w-3 h-3 mr-1 animate-spin"/>{t('common.repairing', '修复中')}</>
                                                        ) : (
                                                            <><Wrench className="w-3 h-3 mr-1"/>{t('common.repair', '修复')}</>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {media.integrity_detail ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.integrityTotalFragments', '总分段数')}</span>
                                                    <span className="font-mono font-semibold">{media.integrity_detail.total_fragments}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.integrityLoadedFragments', '已加载分段')}</span>
                                                    <span className="font-mono font-semibold">{media.integrity_detail.loaded_fragments}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.integrityEndlist', 'ENDLIST')}</span>
                                                    <span className={media.integrity_detail.has_endlist ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                                                        {media.integrity_detail.has_endlist ? '✓ ' + t('common.present', '存在') : '✗ ' + t('common.missing', '缺失')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.integrityCoverage', '覆盖率')}</span>
                                                    <span className="font-mono font-semibold">
                                                        {(media.integrity_detail.coverage * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.integrityLastChecked', '上次校验')}</span>
                                                    <span className="text-xs font-medium">
                                                        {media.integrity_detail.last_checked_at
                                                            ? formatDateTime(media.integrity_detail.last_checked_at)
                                                            : t('common.never', '从未')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('mediaEdit.integrityMissing', '缺失分段')}</span>
                                                    {media.integrity_detail.missing_segments?.length ? (
                                                        <span className="text-destructive font-mono text-xs">
                                                            {media.integrity_detail.missing_segments.slice(0, 5).join(', ')}
                                                            {media.integrity_detail.missing_segments.length > 5
                                                                ? ` +${media.integrity_detail.missing_segments.length - 5}`
                                                                : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-success font-semibold">{t('common.none', '无')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground py-2">
                                                {t('mediaEdit.integrityCheckHint', '此为按需诊断工具。当用户反馈视频内容异常时,点击"校验完整性"检查分段是否完整。不会自动运行,不影响系统性能。')}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold">{t('mediaEdit.performanceMetrics', '性能指标')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Eye className="text-primary text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{Number(stats?.view_count ?? media?.view_count ?? 0).toLocaleString()}</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.views', '播放量')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <ThumbsUp className="text-success text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{Number(stats?.like_count ?? media?.like_count ?? 0).toLocaleString()}</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.likes', '点赞')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <XCircle className="text-destructive text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{Number(stats?.dislike_count ?? media?.dislike_count ?? 0).toLocaleString()}</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.dislikes', '踩')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <MessageSquareText className="text-sky-500 text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{Number(stats?.comment_count ?? media?.comment_count ?? 0).toLocaleString()}</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.comments', '评论')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Star className="text-amber-400 text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{Number(stats?.favorite_count ?? media?.favorite_count ?? 0).toLocaleString()}</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.favorites', '收藏')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Share2 className="text-violet-500 text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{Number(media?.share_count ?? stats?.share_count ?? 0).toLocaleString()}</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.shares', '分享')}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-center">
                                        <Download className="text-indigo-500 text-2xl mb-2"/>
                                        <p className="text-2xl font-bold">{Number(media?.download_count ?? stats?.download_count ?? 0).toLocaleString()}</p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('mediaEdit.downloads', '下载')}</p>
                                    </div>
                                </div>
                                    </CardContent>
                                </Card>
                            </div>
                            {sidebarCards}
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            <DeleteConfirmDialog
                open={regenThumbnailConfirmOpen}
                onOpenChange={setRegenThumbnailConfirmOpen}
                title={t('mediaEdit.regenerateThumbnail', '重新生成缩略图')}
                isDeleting={isRegenerating}
                onConfirm={handleRegenerateThumbnail}
                confirmLabel={t('mediaEdit.confirmRegenerate', '确认重新生成')}
                description={t('mediaEdit.confirmRegenerateThumbnailDesc', '这将重新生成媒体文件的缩略图，此操作可能需要一些时间。')}
            />

            <DeleteConfirmDialog
                open={regenSpriteConfirmOpen}
                onOpenChange={setRegenSpriteConfirmOpen}
                title={t('mediaEdit.regenerateSprite', '重新生成雪碧图')}
                isDeleting={isRegenerating}
                onConfirm={handleRegenerateSprite}
                confirmLabel={t('mediaEdit.confirmRegenerate', '确认重新生成')}
                description={t('mediaEdit.confirmRegenerateSpriteDesc', '这将重新生成媒体文件的雪碧图，此操作可能需要一些时间。')}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={media.title || t('mediaEdit.unnamedMedia', '未命名媒体')}
                isDeleting={isDeleting}
                onConfirm={handleDelete}
            />

            {/* BUG-186 G5: 语言清单管理（可配置） */}

            {/* BUG-087 后续: 内容修复确认 Dialog */}
            <DeleteConfirmDialog
                open={repairConfirmOpen}
                onOpenChange={setRepairConfirmOpen}
                title={t('mediaEdit.repairMedia', '修复内容')}
                isDeleting={repairing}
                onConfirm={handleRepairMedia}
                confirmLabel={t('common.confirmRepair', '确认修复')}
                description={t(
                    'mediaEdit.confirmRepairDesc',
                    '检测到视频内容不完整。修复将重新转码缺失分段,预计耗时较长。修复期间视频保持当前状态可播放。'
                )}
            />

            <ThumbnailSelectDialog
                open={thumbnailDialogOpen}
                onOpenChange={setThumbnailDialogOpen}
                media={media}
                mode="admin"
                onSuccess={handleThumbnailSuccess}
            />
        </div>
    );
}
