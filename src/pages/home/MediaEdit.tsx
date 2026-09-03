import {useState, useEffect, useMemo, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import type {TFunction} from 'i18next';
import {useParams, useNavigate} from '@tanstack/react-router';
import {usePublicMediaDetail, useUpdatePublicMedia, useDeleteMedia, useCategoryList, useMyChannels} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';
import {EditPageHeader, type HeaderBadgeConfig, type EncodingStatusConfig} from '@/components/common/EditPageHeader';
import {DeleteConfirmDialog} from '@/components/common/DeleteConfirmDialog';
import {MediaEditForm, type MediaEditFormState} from '@/components/common/MediaEditForm';
import ThumbnailSelectDialog from '@/components/common/ThumbnailSelectDialog';
import {useDirtyState, useSaveState, useKeyboardShortcut} from '@/hooks/useEditPage';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {AlertTriangle, ArrowLeft, Play, Pencil, Upload} from 'lucide-react';
import {toast} from 'sonner';
import {getFullUrl, withCacheBust} from '@/lib/utils';
import {buildCategoryTree, VIDEO_ROOT_SLUG} from '@/lib/utils/categoryTree';
import {serializeTags, parseTagsInput} from '@/lib/utils/hashtag';
import {useQueryClient} from '@tanstack/react-query';
import {settingsApi} from '@/lib/api/system';

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
        const num = Number(value);
        if (!isNaN(num) && num >= 0) return num;
        const mapped = PRIVACY_NAME_TO_VALUE[value];
        if (mapped !== undefined) return mapped;
    }
    return 1;
}

const STATE_BADGE_MAP: Record<string, { variant: HeaderBadgeConfig['variant'] }> = {
    active: {variant: 'default'},
    draft: {variant: 'secondary'},
    deleted: {variant: 'destructive'},
};

function mapMediaToHeaderBadges(media: any, isAdmin: boolean, t: TFunction): HeaderBadgeConfig[] {
    const badges: HeaderBadgeConfig[] = [];

    badges.push({
        type: 'media-type',
        variant: 'outline',
        label: media.type,
        ariaLabel: `${t('mediaEdit.mediaTypeAria', 'Media type')}: ${media.type}`,
    });

    // BUG-233: review status is carried by `review_status` (not `state`, which
    // only holds the lifecycle). A media pending review shows "Pending Review"
    // regardless of its lifecycle draft state.
    const reviewPending = media.review_status === 'pending_review';
    const stateLabel = reviewPending ? t('mediaEdit.pendingReview', 'Pending Review')
        : media.state === 'active' ? t('admin.publishedStatus', 'Published')
        : media.state === 'draft' ? t('admin.draftStatus', 'Draft')
        : media.state === 'deleted' ? t('admin.deletedStatus', 'Deleted')
        : media.state;
    const stateConfig = reviewPending ? {variant: 'secondary' as const} : (STATE_BADGE_MAP[media.state] || {variant: 'outline' as const});
    badges.push({
        type: 'state',
        variant: stateConfig.variant,
        label: stateLabel,
        ariaLabel: `${t('mediaEdit.stateAria', 'Status')}: ${stateLabel}`,
    });

    if (isAdmin && media.featured) {
        badges.push({
            type: 'featured',
            variant: 'outline',
            label: t('mediaEdit.featured', 'Featured'),
            ariaLabel: t('mediaEdit.featuredContent', 'Featured content'),
            className: 'text-warning border-amber-300',
        });
    }

    return badges;
}

function mapEncodingStatus(status: string | undefined): EncodingStatusConfig | undefined {
    const validStatuses = ['success', 'processing', 'pending', 'failed'];
    if (!status || !validStatuses.includes(status)) return undefined;
    return {status: status as EncodingStatusConfig['status']};
}

export default function MediaEditPage() {
    const {shortToken} = useParams({strict: false}) as { shortToken: string };
    const navigate = useNavigate();
    const {user, isAdmin} = useAuth();
    const {t} = useTranslation();
    const {data: media, isLoading, error} = usePublicMediaDetail(shortToken);
    const updateMutation = useUpdatePublicMedia();
    const deleteMutation = useDeleteMedia();
    const {data: categoriesData} = useCategoryList();
    const {data: channelsData} = useMyChannels(true);
    const channels = Array.isArray(channelsData) ? channelsData : (channelsData as any)?.items || [];

    const {form, setForm, isDirty, resetDirty, syncFromData} = useDirtyState<MediaEditFormState>({
        title: '',
        description: '',
        category_id: '' as string | number,
        channel_id: '' as string | number,
        tags: '',
        privacy: 1,
        state: 'draft',
        enable_comments: true,
        allow_download: false,
        featured: false,
        listable: false,
    });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [thumbnailDialogOpen, setThumbnailDialogOpen] = useState(false);
    const [thumbnailVersion, setThumbnailVersion] = useState(Date.now());
    const [isDeleting, setIsDeleting] = useState(false);
    const {saveState, isSaving, setSaving, setSuccess, setError} = useSaveState();
    const queryClient = useQueryClient();

    // BUG-139: platform feature modes (comments/downloads) control per-media toggle
    // visibility. `disabled` → MediaEditForm disables the toggle (override 强制关停).
    const [featureModes, setFeatureModes] = useState<{comments_mode?: string; downloads_mode?: string}>({});
    useEffect(() => {
        let cancelled = false;
        settingsApi.get()
            .then((res) => {
                if (cancelled) return;
                const s = (res as any)?.settings || {};
                setFeatureModes({comments_mode: s.comments_mode, downloads_mode: s.downloads_mode});
            })
            .catch(() => {/* settings unavailable — toggles stay enabled */});
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (media) {
            setForm({
                title: media.title || '',
                description: media.description || '',
                category_id: media.category_id ?? '',
                channel_id: media.channel_id ?? '',
                tags: serializeTags(media.tags || []),
                privacy: normalizePrivacy(media.privacy),
                state: media.state || 'draft',
                enable_comments: media.enable_comments ?? true,
                allow_download: media.allow_download ?? false,
                featured: media.featured || false,
                listable: media.listable ?? false,
            });
        }
    }, [media, setForm]);

    const handleSave = useCallback(async () => {
        if (!shortToken || isSaving) return;
        setSaving();
        try {
            // BUG-134: an unselected category resolves to the `video` module root
            // ("视频类") so empty media are anchored to the video class.
            const categoriesList = (categoriesData as any)?.items ?? [];
            const videoRootId = buildCategoryTree(categoriesList).find(n => n.slug === VIDEO_ROOT_SLUG)?.id;
            const resolvedCategoryId = form.category_id !== '' && form.category_id !== undefined
                ? Number(form.category_id)
                : (videoRootId ?? undefined);
            await updateMutation.mutateAsync({
                shortToken,
                data: {
                    title: form.title,
                    description: form.description,
                    category_id: resolvedCategoryId,
                    // BUG-105: '' (from the _none_ option) must reach the backend as
                    // an empty string so the update_mask can clear the assignment.
                    channel_id: form.channel_id !== '' && form.channel_id !== undefined ? Number(form.channel_id) : '',
                    tags: parseTagsInput(form.tags),
                    privacy: form.privacy,
                    state: isAdmin ? form.state : undefined,
                    enable_comments: form.enable_comments,
                    allow_download: form.allow_download,
                    featured: isAdmin ? form.featured : undefined,
                    listable: isAdmin ? form.listable : undefined,
                },
                // BUG-105 AIP-134: full-field mask (camelCase paths, protobuf
                // FieldMask JSON) so empty values (channelId "") actually clear
                // the field on the backend.
                update_mask: [
                    'title', 'description', 'categoryId', 'channelId', 'tags', 'privacy',
                    'enableComments', 'allowDownload',
                    ...(isAdmin ? ['state', 'featured', 'listable'] : []),
                ],
            });
            // Keep local form in sync with the persisted value (BUG-134 default).
            if (form.category_id !== resolvedCategoryId) {
                syncFromData({...form, category_id: resolvedCategoryId});
            } else {
                resetDirty();
            }
            setSuccess();
            toast.success(t('mediaEdit.saveSuccess', 'Saved successfully'));
        } catch (err: any) {
            setError();
            toast.error(`${t('mediaEdit.saveFailed', 'Save failed')}: ${err?.message || t('common.unknownError', 'Unknown error')}`);
        }
    }, [shortToken, isSaving, form, isAdmin, updateMutation, setSaving, setSuccess, setError, resetDirty, syncFromData, categoriesData]);

    // BUG-138: dedicated publish action for normal users. Submits the draft for
    // review (draft -> pending_review). The backend enforces the encoding guard and
    // review flow in MediaService.UpdateMedia -> PublishMedia.
    const handlePublish = useCallback(async () => {
        if (!shortToken || isSaving) return;
        setSaving();
        try {
            const categoriesList = (categoriesData as any)?.items ?? [];
            const videoRootId = buildCategoryTree(categoriesList).find(n => n.slug === VIDEO_ROOT_SLUG)?.id;
            const resolvedCategoryId = form.category_id !== '' && form.category_id !== undefined
                ? Number(form.category_id)
                : (videoRootId ?? undefined);
            await updateMutation.mutateAsync({
                shortToken,
                data: {
                    title: form.title,
                    description: form.description,
                    category_id: resolvedCategoryId,
                    channel_id: form.channel_id !== '' && form.channel_id !== undefined ? Number(form.channel_id) : '',
                    tags: parseTagsInput(form.tags),
                    privacy: form.privacy,
                    state: 'pending_review',
                    enable_comments: form.enable_comments,
                    allow_download: form.allow_download,
                },
                // AIP-134 mask: include 'state' so the backend treats this as a publish transition.
                update_mask: ['title', 'description', 'categoryId', 'channelId', 'tags', 'privacy', 'state', 'enableComments', 'allowDownload'],
            });
            setSuccess();
            toast.success(t('mediaEdit.submittedForReview', 'Submitted for review'));
        } catch (err: any) {
            setError();
            toast.error(`${t('mediaEdit.publishFailed', 'Publish failed')}: ${err?.message || t('common.unknownError', 'Unknown error')}`);
        }
    }, [shortToken, isSaving, form, updateMutation, setSaving, setSuccess, setError, categoriesData]);

    const handleDelete = useCallback(async () => {
        if (!media?.id) return;
        setIsDeleting(true);
        try {
            await deleteMutation.mutateAsync(media.id);
            setDeleteDialogOpen(false);
            toast.success('Media deleted');
            navigate({to: '/'});
        } catch (err: any) {
            setIsDeleting(false);
            toast.error(`${t('mediaEdit.deleteFailed', 'Delete failed')}: ${err?.message || t('common.unknownError', 'Unknown error')}`);
        }
    }, [media?.id, deleteMutation, navigate]);

    const handlePreview = useCallback(() => {
        if (shortToken) {
            window.open(`/watch?v=${shortToken}`, '_blank', 'noopener,noreferrer');
        }
    }, [shortToken]);

    const handleBack = useCallback(() => {
        navigate({to: '/watch', search: {v: shortToken}});
    }, [navigate, shortToken]);

    const handleThumbnailSuccess = useCallback((newThumbnail?: string) => {
        setThumbnailVersion(Date.now());
        if (newThumbnail && media) {
            const cleanToken = String(shortToken).replace(/["']/g, '').trim();
            queryClient.setQueryData(['publicMedia', 'detail', cleanToken], {
                ...media,
                thumbnail: newThumbnail,
            });
        }
        const cleanToken = String(shortToken).replace(/["']/g, '').trim();
        queryClient.invalidateQueries({queryKey: ['publicMedia', 'detail', cleanToken]});
        queryClient.invalidateQueries({queryKey: ['public-media-list']});
    }, [queryClient, shortToken, media]);

    useKeyboardShortcut('ctrl+s', handleSave, {enabled: !isSaving});

    const headerBadges = useMemo(() => media ? mapMediaToHeaderBadges(media, isAdmin, t) : [], [media, isAdmin, t]);
    const encodingConfig = useMemo(() => media ? mapEncodingStatus(media.encoding_status) : undefined, [media]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner/>
            </div>
        );
    }

    if (error || !media) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle className="w-12 h-12 text-destructive"/>
                <p className="text-lg text-muted-foreground">{t('mediaEdit.loadFailed', 'Unable to load media info')}</p>
                <Button variant="outline" onClick={() => navigate({to: '/'})}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>{t('mediaEdit.backToHome', 'Back to Home')}
                </Button>
            </div>
        );
    }

    const isOwner = user && String(user.id) === String(media.user_id);
    if (!isOwner && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle className="w-12 h-12 text-destructive"/>
                <p className="text-lg text-muted-foreground">{t('mediaEdit.permissionDenied', 'You do not have permission to edit this media')}</p>
                <Button variant="outline" onClick={() => navigate({to: '/watch', search: {v: shortToken}})}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>{t('mediaEdit.backToVideo', 'Back to Video')}
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
                <EditPageHeader
                    title={form.title || 'Untitled Media'}
                    editableTitle={form.title}
                    onTitleChange={(v) => setForm({...form, title: v})}
                    isDirty={isDirty}
                    isSaving={isSaving}
                    saveState={saveState}
                    onBack={handleBack}
                    onSave={handleSave}
                    onPreview={handlePreview}
                    onDelete={() => setDeleteDialogOpen(true)}
                    badges={headerBadges}
                    encodingStatus={encodingConfig}
                />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="bg-card rounded-lg border p-6">
                            <MediaEditForm
                                form={form}
                                setForm={setForm}
                                media={media}
                                categories={categoriesData}
                                channels={channels}
                                isAdmin={isAdmin}
                                showAdminOnlyFields={false}
                                featureModes={featureModes}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        {!isAdmin && isOwner && media.review_status === 'pending_review' && (
                            // BUG-233: pending 媒体 state 仍为 draft，须按 review_status 判断——
                            // 待审核时不再显示「Submit for Review」提交按钮，避免重复提交。
                            <div className="bg-card rounded-lg border p-4 space-y-2">
                                <h3 className="font-medium">{t('mediaEdit.pendingReview', 'Pending Review')}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {t('mediaEdit.pendingReviewHint', 'Your submission is awaiting admin approval. It goes live once approved.')}
                                </p>
                                <Badge variant="soft-warning">{t('mediaEdit.pendingReview', 'Pending Review')}</Badge>
                            </div>
                        )}
                        {!isAdmin && isOwner && media.state === 'draft' && media.review_status !== 'pending_review' && (
                            <div className="bg-card rounded-lg border p-4 space-y-3">
                                <h3 className="font-medium">{t('mediaEdit.publish', 'Publish')}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {media.encoding_status === 'success'
                                        ? (media.review_status === 'rejected'
                                            ? t('mediaEdit.rejectedHint', 'Your submission was rejected. Review the feedback and resubmit.')
                                            : t('mediaEdit.publishHint', 'Submit this video for review. It goes live after admin approval.'))
                                        : t('mediaEdit.publishEncoding', 'Publishing is available once transcoding finishes.')}
                                </p>
                                <Button
                                    className="w-full"
                                    disabled={media.encoding_status !== 'success' || isSaving}
                                    onClick={handlePublish}
                                >
                                    <Upload className="w-4 h-4 mr-2"/>
                                    {t('mediaEdit.submitForReview', 'Submit for Review')}
                                </Button>
                            </div>
                        )}
                        <div className="bg-card rounded-lg border p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium">{t('mediaEdit.preview', 'Preview')}</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setThumbnailDialogOpen(true)}
                                    className="h-7 px-2 text-xs gap-1"
                                >
                                    <Pencil className="w-3 h-3"/>
                                    {t('mediaEdit.changeThumbnail', 'Change thumbnail')}
                                </Button>
                            </div>
                            <div
                                className="relative group cursor-pointer rounded-md overflow-hidden"
                                onClick={() => setThumbnailDialogOpen(true)}
                            >
                                {media.thumbnail ? (
                                    <img
                                        src={withCacheBust(getFullUrl(media.thumbnail), thumbnailVersion)}
                                        alt={media.title}
                                        className="w-full aspect-video object-cover transition-opacity group-hover:opacity-80"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full aspect-video bg-muted flex items-center justify-center">
                                        <Play className="w-8 h-8 text-muted-foreground"/>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-sm font-medium">
                                        <Pencil className="w-4 h-4"/>
                                        {t('mediaEdit.clickToChangeThumbnail', 'Click to change thumbnail')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BUG-137 方案 A + BUG-233：右侧 Info → Status 卡片。
                            Duration/Resolution 移入左侧 Technical Info（唯一展示），
                            此处保留 Encoding 速览并新增审核状态 + 生命周期。 */}
                        <div className="bg-card rounded-lg border p-4 space-y-3">
                            <h3 className="font-medium">{t('mediaEdit.status', 'Status')}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">{t('mediaEdit.review', 'Review')}</span>
                                    {media.review_status === 'pending_review' ? (
                                        <Badge variant="soft-warning">{t('mediaEdit.pendingReview', 'Pending Review')}</Badge>
                                    ) : media.review_status === 'reviewed' ? (
                                        <Badge variant="soft-success">{t('mediaEdit.approved', 'Approved')}</Badge>
                                    ) : media.review_status === 'rejected' ? (
                                        <Badge variant="soft-danger">{t('mediaEdit.rejected', 'Rejected')}</Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">{t('mediaEdit.notSubmitted', 'Not submitted')}</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">{t('mediaEdit.state', 'State')}</span>
                                    <span className="text-xs">
                                        {media.state === 'active' ? t('admin.publishedStatus', 'Published')
                                            : media.state === 'draft' ? t('admin.draftStatus', 'Draft')
                                            : media.state === 'deleted' ? t('admin.deletedStatus', 'Deleted')
                                            : media.state || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">{t('mediaEdit.encoding', 'Encoding')}</span>
                                    <span className="text-xs">{media.encoding_status || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={media.title || 'Untitled Media'}
                isDeleting={isDeleting}
                onConfirm={handleDelete}
            />

            <ThumbnailSelectDialog
                open={thumbnailDialogOpen}
                onOpenChange={setThumbnailDialogOpen}
                media={media}
                onSuccess={handleThumbnailSuccess}
            />
        </div>
    );
}
