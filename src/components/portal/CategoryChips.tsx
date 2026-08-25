import React, {useMemo, useState} from 'react';
import {Link, useLocation, useSearch} from '@tanstack/react-router';
import {useCategoryList} from '@/hooks/queries';
import {useTranslation} from 'react-i18next';
import type {Category} from '@/lib/api/category';
import {buildCategoryTree, type CategoryTreeNode} from '@/lib/utils/categoryTree';
import {kindOf} from '@/lib/utils/categoryKind';
import {ChevronRight} from 'lucide-react';

interface CategoryChipsProps {
    embedded?: boolean;
}

/**
 * 主页顶部分类排（数据驱动渲染）。
 *
 * 根级模块导航（视频/文章/音乐）在 Sidebar/Header（NAV_CONFIG），此处只放分类：
 *  - 「全部」回主页
 *  - 视频根下节点递归渲染：叶子 → 跳 /browse 的 chip；有子节点 → 可展开组。
 *  - 叶子 URL 契约（BUG-162）：按 kind 拆到 ?form=|genre=slug。
 *
 * 当前 taxonomy 为 2 层（video → form/genre 叶子同层兄弟，见
 * portal-filter-url-seed-redesign.md §4.1），故全部渲染为叶子 chip；
 * 将来若引入中间层组（3 层），自动变为可展开组，无需改代码。
 */
const CategoryChips: React.FC<CategoryChipsProps> = ({embedded = false}) => {
    const {t} = useTranslation();
    const {data} = useCategoryList();
    const location = useLocation();
    const pathname = location.pathname;
    const search = useSearch({strict: false}) as {form?: string; genre?: string};
    const activeSlugs = useMemo(() => new Set([
        ...(search.form ?? '').split(',').filter(Boolean),
        ...(search.genre ?? '').split(',').filter(Boolean),
    ]), [search.form, search.genre]);

    // 中间层组展开状态（默认展开，主页一眼可见分类全貌）
    const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

    const flat: Category[] = data?.items ?? [];
    const tree = useMemo(() => buildCategoryTree(flat), [flat]);

    if (tree.length === 0) return null;

    const videoRoot = tree.find(n => n.slug === 'video');

    const chipCls = (active: boolean) =>
        `flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active ? 'bg-foreground text-background' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
        }`;

    // 叶子链接（跳 /browse?form=|genre=slug）
    const leafLink = (cat: Category) => (
        <Link
            key={cat.id}
            to="/browse"
            search={kindOf(cat.slug) === 'form' ? {form: cat.slug} : {genre: cat.slug}}
            className={chipCls(activeSlugs.has(cat.slug))}
        >
            {cat.name}
        </Link>
    );

    // 数据驱动递归渲染：有子节点 → 可展开组按钮 + 递归子节点；叶子 → 链接 chip。
    const renderNode = (node: CategoryTreeNode) => {
        if (node.hasChildren) {
            return (
                <React.Fragment key={node.id}>
                    <button
                        type="button"
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                            activeSlugs.has(node.slug)
                                ? 'bg-foreground text-background'
                                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                        }`}
                        onClick={() => setOpenGroups(prev => {
                            const next = new Set(prev);
                            if (next.has(node.slug)) {
                                next.delete(node.slug);
                            } else {
                                next.add(node.slug);
                            }
                            return next;
                        })}
                    >
                        <ChevronRight size={12} className={`transition-transform ${openGroups.has(node.slug) ? 'rotate-90' : ''}`}/>
                        {node.name}
                    </button>
                    {openGroups.has(node.slug) && node.children.map(renderNode)}
                </React.Fragment>
            );
        }
        return leafLink(node);
    };

    const content = (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
            <Link
                to="/"
                className={chipCls(pathname === '/' && activeSlugs.size === 0)}
            >
                {t('home.all', '全部')}
            </Link>

            {/* 视频根下节点数据驱动渲染：有子节点 → 可展开组；叶子 → 跳 /browse 的 chip */}
            {videoRoot?.children?.map(renderNode)}
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
