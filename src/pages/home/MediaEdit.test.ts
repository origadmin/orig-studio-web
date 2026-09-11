import {mapMediaToHeaderBadges} from './MediaEdit';

describe('mapMediaToHeaderBadges', () => {
    const t = (key: string, fallback?: string) => {
        const map: Record<string, string> = {
            'admin.video': '视频',
            'admin.audio': '音频',
            'admin.image': '图片',
            'admin.document': '文档',
            'mediaEdit.pendingReview': '审核中',
            'admin.publishedStatus': '已发布',
            'admin.draftStatus': '草稿',
            'admin.deletedStatus': '已删除',
            'common.status.success': '已发布',
            'common.status.processing': '处理中',
            'common.status.pending': '排队中',
            'common.status.failed': '失败',
            'common.status.draft': '草稿',
            'common.status.deleted': '已删除',
            'common.unknown': '未知',
            'mediaEdit.mediaTypeAria': '媒体类型',
            'mediaEdit.stateAria': '状态',
            'mediaEdit.featured': '精选',
            'mediaEdit.featuredContent': '精选内容',
        };
        return map[key] ?? fallback ?? key;
    };

    it('translates video type to 视频 (not raw "video")', () => {
        const media = {
            type: 'video',
            state: 'active',
            review_status: 'reviewed',
            encoding_status: 'success',
            featured: false,
        };
        const badges = mapMediaToHeaderBadges(media, false, t);
        const labels = badges.map(b => b.label);
        expect(labels).toContain('视频');
        expect(labels).not.toContain('video');
    });

    it('renders exactly one "已发布" for active + encoded media (no duplicate status)', () => {
        const media = {
            type: 'video',
            state: 'active',
            review_status: 'reviewed',
            encoding_status: 'success',
            featured: false,
        };
        const badges = mapMediaToHeaderBadges(media, false, t);
        const labels = badges.map(b => b.label);
        const publishedCount = labels.filter(l => l === '已发布').length;
        expect(publishedCount).toBe(1);
        expect(labels).toEqual(['视频', '已发布']);
    });

    it('shows "审核中" for pending review regardless of draft state', () => {
        const media = {
            type: 'video',
            state: 'draft',
            review_status: 'pending_review',
            encoding_status: 'success',
            featured: false,
        };
        const badges = mapMediaToHeaderBadges(media, false, t);
        const labels = badges.map(b => b.label);
        expect(labels).toContain('审核中');
        expect(labels).not.toContain('草稿');
    });

    it('reflects encoding failure even when state is active', () => {
        const media = {
            type: 'video',
            state: 'active',
            review_status: 'reviewed',
            encoding_status: 'failed',
            featured: false,
        };
        const badges = mapMediaToHeaderBadges(media, false, t);
        const stateBadge = badges.find(b => b.type === 'state');
        expect(stateBadge?.statusDot).toBe('failed');
    });
});
