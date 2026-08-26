import React, {useMemo, useState} from 'react';
import {Link, useLocation, useSearch, useNavigate} from '@tanstack/react-router';
import {useCategoryList} from '@/hooks/queries';
import {useTranslation} from 'react-i18next';
import type {Category} from '@/lib/api/category';
import {buildCategoryTree, type CategoryTreeNode} from '@/lib/utils/categoryTree';
import {kindOf} from '@/lib/utils/categoryKind';

interface CategoryChipsProps {
    embedded?: boolean;
}

/**
 * 主页顶部分类排（数据驱动渲染，BUG-162 §六 3 级分层，2026-08-26 定稿）。
 *
 * 视觉语言：本组件是全站分类 UI 的唯一权威样式（rounded-full chip + 弱化轴标签），
 * /browse 筛选条的「分类」行复用同一套样式，禁止另起一套分组盒/粗体轴标题
 * （2026-08-26 用户反馈：与主横条不匹配、轴标题突兀）。
 *
 * 根级模块导航（视频/文章/音乐）在 Sidebar/Header（NAV_CONFIG），此处只放分类。
 * 3 级分层（root → L2 轴 → L3 展开，"2 展开 3"）：
 *   - 「全部」回主页/清空筛选
 *   - 视频根下 L2 轴按 kind 拆双区：形式(form) / 题材(genre)，轴以弱化小标签分隔
 *   - L2 轴为可点 chip：点一下就地展开其 L3 叶子（同一条内，横向滚动），不另起面板
 *   - 叶子 URL 契约：form → ?form=slug，genre → ?genre=slug（方案 B 双键）
 */
const CategoryChips: React.FC<CategoryChipsProps> = ({embedded = false}) => {
    const {t} = useTranslation();
    const {data} = useCategoryList();
    const location = useLocation();
    const pathname = location.pathname;
    const navigate = useNavigate();
    const search = useSearch({strict: false}) as {form?: string; genre?: string};
    const activeSlugs = useMemo(() => new Set([
        ...(search.form ?? '').split(',').filter(Boolean),
        ...(search.genre ?? '').split(',').filter(Boolean),
    ]), [search.form, search.genre]);

    // 行内展开状态（L2 轴 → L3 叶子）。选中叶子时其父轴也视为展开。
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const toggleExpand = (slug: string) =>
        setExpanded(p => ({...p, [slug]: !p[slug]}));

    const flat: Category[] = data?.items ?? [];
    const tree = useMemo(() => buildCategoryTree(flat), [flat]);

    if (tree.length === 0) return null;

    const videoRoot = tree.find(n => n.slug === 'video');

    // 3 级：video 根下 L2 轴按 kind 分双区
    const formAxes = videoRoot?.children?.filter(c => kindOf(c.slug) === 'form') ?? [];
    const genreAxes = videoRoot?.children?.filter(c => kindOf(c.slug) === 'genre') ?? [];

    const chipCls = (active: boolean) =>
        `flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active ? 'bg-foreground text-background' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
        }`;

    const updateSearch = (patch: {form?: string; genre?: string}) => {
        navigate({to: '.', search: (prev: any) => {
            const next: any = {...prev, ...patch};
            if (next.form == null || next.form === '') delete next.form;
            if (next.genre == null || next.genre === '') delete next.genre;
            return next;
        }});
    };

    const sectionLabel = (text: string) => (
        <span className="flex-shrink-0 text-xs font-medium text-muted-foreground whitespace-nowrap">{text}</span>
    );

    const divider = <span className="w-px h-4 bg-border/60 flex-shrink-0"/>;

    // L2 轴：可点 chip，点一下就地展开 L3 叶子（同一条内）；激活 = 自身或任一叶子被选中。
    const axisGroup = (axis: CategoryTreeNode) => {
        const kindKey = kindOf(axis.slug) === 'form' ? 'form' : 'genre';
        const hasActiveLeaf = axis.children?.some(c => activeSlugs.has(c.slug)) ?? false;
        const expandedNow = !!expanded[axis.slug] || hasActiveLeaf || activeSlugs.has(axis.slug);
        const active = activeSlugs.has(axis.slug) || hasActiveLeaf;
        return (
            <span key={axis.slug} className="flex items-center gap-1.5 flex-shrink-0">
                <Link
                    to="."
                    search={(prev: any) => {
                        const next: any = {...prev};
                        if (expandedNow) {
                            delete next[kindKey];
                        } else {
                            next[kindKey] = axis.slug;
                        }
                        return next;
                    }}
                    onClick={() => toggleExpand(axis.slug)}
                    className={chipCls(active)}
                >
                    {axis.name}
                </Link>
                {expandedNow && axis.children?.map(leaf => (
                    <Link
                        key={leaf.id}
                        to="."
                        search={(prev: any) => ({...prev, [kindKey]: leaf.slug})}
                        className={chipCls(activeSlugs.has(leaf.slug))}
                    >
                        {leaf.name}
                    </Link>
                ))}
            </span>
        );
    };

    const content = (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
            <Link
                to="."
                search={(prev: any) => {
                    const next: any = {...prev};
                    delete next.form;
                    delete next.genre;
                    return next;
                }}
                className={chipCls(pathname === '/' && activeSlugs.size === 0)}
            >
                {t('home.all', '全部')}
            </Link>

            {formAxes.length > 0 && (
                <>
                    {divider}
                    {sectionLabel(t('categories.form', '形式'))}
                    {formAxes.map(axisGroup)}
                </>
            )}

            {genreAxes.length > 0 && (
                <>
                    {divider}
                    {sectionLabel(t('categories.genre', '题材'))}
                    {genreAxes.map(axisGroup)}
                </>
            )}
        </div>
    );

    if (embedded) return content;

    return (
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
            {content}
        </div>
    );
};

export default CategoryChips;
