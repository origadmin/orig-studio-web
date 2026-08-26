import React, {useState, useEffect, useMemo, useRef} from 'react';
import {Link, useSearch, useNavigate} from '@tanstack/react-router';
import {Play, Eye, Folder, Search} from 'lucide-react';
import {Spinner} from '@/components/ui/spinner';
import {formatDuration, formatViews} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {categoryApi, type Category} from '@/lib/api/category';
import {useInfiniteMediaList} from '@/hooks/queries';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {buildCategoryTree, type CategoryTreeNode} from '@/lib/utils/categoryTree';
import {kindOf} from '@/lib/utils/categoryKind';

const VideoCard: React.FC<{media: any}> = ({media}) => (
    <Link to="/watch" search={{v: media.short_token}} className="group w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] xl:w-[calc(20%-13px)] 3xl:w-[calc(16.666%-14px)]">
        <div className="bg-card rounded-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <div className="relative aspect-video overflow-hidden">
                <img
                    src={getImageUrl(media.thumbnail, 'thumbnail')}
                    alt={media.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-1 rounded">
                    {formatDuration(media.duration)}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                    </div>
                </div>
            </div>
            <div className="p-3">
                <h3 className="font-medium text-foreground text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                    {media.title}
                </h3>
                <div className="flex items-center gap-2 mb-1">
                <img
                    src={getImageUrl(media.edges?.user?.[0]?.avatar, 'avatar')}
                    alt={media.edges?.user?.[0]?.username}
                    onError={(e) => handleImageError(e, 'avatar')}
                    loading="lazy"
                    className="w-5 h-5 rounded-full object-cover"
                />
                    <span className="text-xs text-muted-foreground">
                        {media.edges?.user?.[0]?.username || 'Unknown'}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Eye size={12}/>
                        {formatViews(media.view_count)}
                    </span>
                </div>
            </div>
        </div>
    </Link>
);

const Chip: React.FC<{active: boolean; onClick: () => void; children: React.ReactNode}> = ({active, onClick, children}) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active
                ? 'bg-foreground text-background'
                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
        }`}
    >
        {children}
    </button>
);

// ── Dynamic filter rows (BUG-162 final): every row is a plain filter row —
//    no special "row 0" treatment, no dividers. Rows are data-driven so the
//    panel grows 3/5/7+ rows as dimensions are added. ──

// Sort options → API order_by (media-table fields, no join needed).
// Direction (ASC/DESC) is a separate row (倒序/正序).
const SORT_OPTIONS = [
    {slug: 'latest', name: '最新', orderBy: 'create_time'},
    {slug: 'views', name: '访问量', orderBy: 'view_count'},
    {slug: 'likes', name: '点赞', orderBy: 'like_count'},
    {slug: 'comments', name: '评论', orderBy: 'comment_count'},
] as const;

const DIR_OPTIONS = [
    {slug: 'desc', name: '倒序'},
    {slug: 'asc', name: '正序'},
] as const;

// Time-range options → created_after (ISO) sent to the API.
const TIME_OPTIONS: {slug: string; name: string; createdAfter: () => string | undefined}[] = [
    {slug: 'all', name: '全部', createdAfter: () => undefined},
    {slug: 'today', name: '今天', createdAfter: () => dayStart(0)},
    {slug: 'week', name: '本周', createdAfter: () => dayStart(-(new Date().getDay() || 7) + 1)},
    {slug: 'month', name: '本月', createdAfter: () => {
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    }},
    {slug: 'year', name: '今年', createdAfter: () => new Date(new Date().getFullYear(), 0, 1).toISOString()},
];

function dayStart(daysAgoOffsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAgoOffsetDays);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

const CategoriesPage = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const search = useSearch({strict: false}) as Record<string, unknown>;
    const formQ = (search.form as string | undefined) ?? '';
    const genreQ = (search.genre as string | undefined) ?? '';
    const vQ = (search.v as string | undefined) ?? '';
    const sortQ = (search.sort as string | undefined) ?? 'latest';
    const dirQ = (search.dir as string | undefined) ?? 'desc';
    const timeQ = (search.time as string | undefined) ?? 'all';

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Local draft state per row; 「查询分类」commits all rows to the URL.
    const [draftModule, setDraftModule] = useState('video');
    const [draftCats, setDraftCats] = useState<Set<string>>(new Set());
    const [draftSort, setDraftSort] = useState('latest');
    const [draftDir, setDraftDir] = useState('desc');
    const [draftTime, setDraftTime] = useState('all');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await categoryApi.getAll();
                setCategories(response?.items || []);
            } catch (err) {
                setError(t('common.error', 'Error'));
                console.error('Failed to fetch categories:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, [t]);

    const fullTree = useMemo(() => {
        const enabled = categories.filter(c => c.status === 1);
        return buildCategoryTree(enabled);
    }, [categories]);

    // URL → draft state (all rows).
    useEffect(() => {
        if (!categories.length) return;
        const parseCSV = (raw: string): string[] => raw.split(',').map(s => s.trim()).filter(Boolean);
        // 3 级分层（BUG-162 §六）：可选单元是 L3 叶子。若旧 URL 选的是 L2 轴 slug，
        // 展开为其全部 L3 叶子，避免静默空结果（轴→叶子映射由 taxonomy 树决定，可追溯）。
        const catSet = new Set<string>();
        for (const raw of [...parseCSV(formQ), ...parseCSV(genreQ)]) {
            if (!raw) continue;
            const node = findNodeBySlug(fullTree, raw);
            if (node && node.children.length > 0) {
                for (const leaf of expandToLeaves(node)) catSet.add(leaf);
            } else {
                catSet.add(raw);
            }
        }

        let module = vQ && ['video', 'music', 'article'].includes(vQ) ? vQ : 'video';
        if (!module && vQ) {
            const node = findNodeBySlug(fullTree, vQ);
            if (node) module = rootSlugOf(fullTree, node) ?? 'video';
        }
        // D8: legacy ?v={childSlug} without form/genre → category draft
        if (catSet.size === 0 && vQ && !['video', 'music', 'article'].includes(vQ)) {
            catSet.add(vQ);
        }
        setDraftModule(module);
        setDraftCats(catSet);
        setDraftSort(SORT_OPTIONS.some(s => s.slug === sortQ) ? sortQ : 'latest');
        setDraftDir(DIR_OPTIONS.some(d => d.slug === dirQ) ? dirQ : 'desc');
        setDraftTime(TIME_OPTIONS.some(o => o.slug === timeQ) ? timeQ : 'all');
    }, [categories, formQ, genreQ, vQ, sortQ, dirQ, timeQ]);

    const activeRoot = useMemo(
        () => fullTree.find(n => n.slug === draftModule) ?? null,
        [fullTree, draftModule]
    );
    const displayTree = activeRoot?.children ?? [];

    // Commit all rows → URL (every row writes its own key; no special row).
    const commitQuery = () => {
        const searchOut: Record<string, unknown> = {v: draftModule};
        if (draftCats.size > 0) {
            const form: string[] = [];
            const genre: string[] = [];
            for (const slug of draftCats) (kindOf(slug) === 'form' ? form : genre).push(slug);
            if (form.length > 0) searchOut.form = form.join(',');
            if (genre.length > 0) searchOut.genre = genre.join(',');
        }
        if (draftSort !== 'latest') searchOut.sort = draftSort;
        if (draftDir !== 'desc') searchOut.dir = draftDir;
        if (draftTime !== 'all') searchOut.time = draftTime;
        navigate({to: '/browse', search: searchOut});
    };

    const toggleCat = (slug: string) => {
        const next = new Set(draftCats);
        next.has(slug) ? next.delete(slug) : next.add(slug);
        setDraftCats(next);
    };

    const handleModule = (slug: string) => {
        setDraftModule(slug);
        setDraftCats(new Set()); // module switch clears category row (chips follow the row)
    };

    // Applied state derived from the URL (used by the query).
    const appliedCats = useMemo(() => new Set([...formQ.split(',').filter(Boolean), ...genreQ.split(',').filter(Boolean)]), [formQ, genreQ]);
    const sort = SORT_OPTIONS.find(s => s.slug === (sortQ || 'latest')) ?? SORT_OPTIONS[0];
    const dirDesc = (dirQ || 'desc') === 'desc';
    const time = TIME_OPTIONS.find(o => o.slug === (timeQ || 'all')) ?? TIME_OPTIONS[0];
    const appliedModule = vQ && ['video', 'music', 'article'].includes(vQ) ? vQ : 'video';
    const appliedModuleRoot = useMemo(() => fullTree.find(n => n.slug === appliedModule), [fullTree, appliedModule]);

    // Applied categories → ids (server-side tree expansion tracked in BUG-164).
    const categoryIdsForFilter = useMemo((): number[] | undefined => {
        if (appliedCats.size === 0) {
            if (appliedModule === 'video') return undefined;
            const root = fullTree.find(n => n.slug === appliedModule);
            return root ? [root.id] : undefined;
        }
        const ids = new Set<number>();
        for (const slug of appliedCats) {
            const node = findNodeBySlug(fullTree, slug);
            if (node) ids.add(node.id);
        }
        // BUG-237/2026-08-20: 不要额外加 module root.id。2 层下 root 无直属媒体，
        // 加上不影响结果；但若 admin 后续给 root 挂子树，加 root.id 会把整个
        // root 子树（全部视频）拉出来 → 过滤失效。只传叶子 id 即可。
        return [...ids];
    }, [fullTree, appliedCats, appliedModule]);

    const {
        data: mediaPages,
        isLoading: mediaLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteMediaList({
        page_size: 12,
        status: 'active',
        category_ids: categoryIdsForFilter,
        order_by: sort.orderBy,
        descending: dirDesc,
        created_after: time.createdAfter(),
    });

    const items = useMemo(
        () => mediaPages?.pages.flatMap(p => p.items || []) || [],
        [mediaPages]
    );

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
            },
            {rootMargin: '300px'}
        );
        io.observe(el);
        return () => io.disconnect();
        // items.length: after a query commit the list re-renders and the sentinel
        // element is replaced; rebinding here keeps auto-load working (BUG-166).
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

    const filterSummary = useMemo(() => {
        // 2 层双区：appliedCats 是叶子 slug，经树递归找叶子名（树可能含
        // admin 后续添加的任意层级，故用递归而非一层 filter）。
        const names: string[] = [];
        for (const slug of appliedCats) {
            const node = findNodeBySlug(fullTree, slug);
            if (node) names.push(node.name);
        }
        const sortName = SORT_OPTIONS.find(s => s.slug === sortQ)?.name;
        const dirName = DIR_OPTIONS.find(d => d.slug === dirQ)?.name;
        const timeName = TIME_OPTIONS.find(o => o.slug === timeQ)?.name;
        return [...names, sortName && sortName !== '最新' ? sortName : '', dirName && dirName !== '倒序' ? dirName : '', timeName && timeName !== '全部' ? timeName : ''].filter(Boolean);
    }, [appliedCats, fullTree, sortQ, dirQ, timeQ]);

    // Draft vs applied: chips are a local draft until 「查询分类」 commits them.
    const hasDraft = draftCats.size > 0 || draftSort !== 'latest' || draftDir !== 'desc' || draftTime !== 'all' || draftModule !== 'video';
    const hasApplied = appliedCats.size > 0 || sortQ !== 'latest' || dirQ !== 'desc' || timeQ !== 'all' || vQ !== '';

    // Reset: clears the local draft; if a filter was already applied via the
    // URL, it also navigates back to the plain state (query + reset are peers).
    const resetAll = () => {
        setDraftModule('video');
        setDraftCats(new Set());
        setDraftSort('latest');
        setDraftDir('desc');
        setDraftTime('all');
        if (hasApplied) navigate({to: '/browse', search: {v: 'video'}});
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <Folder size={48} className="mx-auto mb-3 opacity-30"/>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <Folder size={24} className="text-emerald-600"/>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('categories.title', '浏览')}
                </h1>
            </div>

            {/* Dynamic filter rows — no dividers, no special "row 0"; each row has a
                leading indicator label (模块/分类/排序/时间) */}
            <div className="space-y-3">
                {/* Row 1: module */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{t('categories.module', '模块')}</span>
                    {(['video', 'music', 'article'] as const).map(rootSlug => {
                        const root = fullTree.find(n => n.slug === rootSlug);
                        return (
                            <Chip key={rootSlug} active={draftModule === rootSlug} onClick={() => handleModule(rootSlug)}>
                                {root?.name ?? rootSlug}
                            </Chip>
                        );
                    })}
                </div>

                {/* Row 2: category multi-select (BUG-162 §六 3 级分层：root → L2轴 → L3展开 "2 展开 3") */}
                {displayTree.length > 0 && (
                    <div className="space-y-3">
                        {/* 形式轴 (form)：每个 L2 轴展开为一组 L3 叶子 chips */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{t('categories.category', '分类')}</span>
                            <span className="text-xs font-medium text-muted-foreground">{t('categories.form', '形式')}</span>
                            {displayTree.filter(c => kindOf(c.slug) === 'form').map(axis => (
                                <span key={axis.slug} className="flex flex-wrap items-center gap-1.5 rounded-full bg-secondary/50 px-2 py-1">
                                    <span className="text-xs font-semibold text-foreground">{axis.name}</span>
                                    {(axis.children?.length ? axis.children : [axis]).map(leaf => (
                                        <Chip key={leaf.slug} active={draftCats.has(leaf.slug)} onClick={() => toggleCat(leaf.slug)}>
                                            {leaf.name}
                                        </Chip>
                                    ))}
                                </span>
                            ))}
                        </div>
                        {/* 题材轴 (genre) */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">{t('categories.genre', '题材')}</span>
                            {displayTree.filter(c => kindOf(c.slug) === 'genre').map(axis => (
                                <span key={axis.slug} className="flex flex-wrap items-center gap-1.5 rounded-full bg-secondary/50 px-2 py-1">
                                    <span className="text-xs font-semibold text-foreground">{axis.name}</span>
                                    {(axis.children?.length ? axis.children : [axis]).map(leaf => (
                                        <Chip key={leaf.slug} active={draftCats.has(leaf.slug)} onClick={() => toggleCat(leaf.slug)}>
                                            {leaf.name}
                                        </Chip>
                                    ))}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Row 3: sort (single-select) */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{t('categories.sort', '排序')}</span>
                    {SORT_OPTIONS.map(s => (
                        <Chip key={s.slug} active={draftSort === s.slug} onClick={() => setDraftSort(s.slug)}>
                            {s.name}
                        </Chip>
                    ))}
                </div>

                {/* Row 4: direction (single-select, 倒序/正序) */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{t('categories.dir', '方向')}</span>
                    {DIR_OPTIONS.map(d => (
                        <Chip key={d.slug} active={draftDir === d.slug} onClick={() => setDraftDir(d.slug)}>
                            {d.name}
                        </Chip>
                    ))}
                </div>

                {/* Row 5: time range (single-select) */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{t('categories.time', '时间')}</span>
                    {TIME_OPTIONS.map(o => (
                        <Chip key={o.slug} active={draftTime === o.slug} onClick={() => setDraftTime(o.slug)}>
                            {o.name}
                        </Chip>
                    ))}
                </div>
            </div>

            {/* Action bar — right-aligned (submit-type actions follow the Fitts/forms
                convention: primary CTA rightmost). Reset is a peer of Query, shown
                whenever there is a draft or an applied filter (BUG-162 UX). */}
            <div className="flex flex-wrap items-center justify-end gap-3">
                {filterSummary.length > 0 && (
                    <span className="text-sm text-gray-400 mr-auto">{filterSummary.join(' ∩ ')}</span>
                )}
                {(hasDraft || hasApplied) && (
                    <button
                        onClick={resetAll}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-600 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors"
                    >
                        {t('categories.reset', '重置')}
                    </button>
                )}
                <button
                    onClick={commitQuery}
                    disabled={!hasDraft}
                    title={hasDraft ? t('categories.query', '查询分类') : t('categories.noFilter', '无筛选条件，当前显示全部')}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                >
                    <Search size={14}/>
                    {t('categories.query', '查询分类')}
                </button>
            </div>


            {mediaLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Spinner/>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Folder size={48} className="mx-auto mb-3 opacity-30"/>
                    <p>{t('categories.noVideos', 'No videos found')}</p>
                </div>
            ) : (
                <div className="flex flex-wrap gap-4">
                    {items.map((media: any) => (
                        <VideoCard key={media.id} media={media}/>
                    ))}
                </div>
            )}

            {items.length > 0 && (
                <div ref={sentinelRef} className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    {isFetchingNextPage ? <Spinner/> : hasNextPage ? '' : t('categories.end', '已加载全部')}
                </div>
            )}
        </div>
    );
};

function findNodeById(nodes: CategoryTreeNode[], id: number): CategoryTreeNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNodeById(node.children, id);
        if (found) return found;
    }
    return null;
}

function findNodeBySlug(nodes: CategoryTreeNode[], slug: string): CategoryTreeNode | null {
    for (const node of nodes) {
        if (node.slug === slug) return node;
        const found = findNodeBySlug(node.children, slug);
        if (found) return found;
    }
    return null;
}

function rootSlugOf(nodes: CategoryTreeNode[], node: CategoryTreeNode): string | null {
    if (node.parent_id == null || node.parent_id === 0) return node.slug;
    const parent = findNodeById(nodes, node.parent_id);
    if (!parent) return node.slug;
    return rootSlugOf(nodes, parent);
}

/**
 * 3 级分层（BUG-162 §六）：收集一个节点下的全部叶子 slug。若节点本身无子节点，
 * 返回自身 slug（兼容 L2 轴同时也是可选单元的边缘情况）。用于把旧 URL 的 L2 轴
 * 选择展开为 L3 叶子，避免静默空结果。
 */
function expandToLeaves(node: CategoryTreeNode): string[] {
    if (!node.children || node.children.length === 0) return [node.slug];
    const out: string[] = [];
    for (const child of node.children) out.push(...expandToLeaves(child));
    return out;
}

export default CategoriesPage;