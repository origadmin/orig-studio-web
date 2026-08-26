import React, {useMemo} from 'react';
import {Link, useLocation, useSearch} from '@tanstack/react-router';
import {useCategoryList} from '@/hooks/queries';
import {useTranslation} from 'react-i18next';
import {buildCategoryTree, type CategoryTreeNode} from '@/lib/utils/categoryTree';

interface CategoryChipsProps {
    embedded?: boolean;
}

/**
 * 主页顶部分类横条（BUG-162 最终方案，2026-08-26）：
 *   - 只放 L1 类型（video/music/article）+ 「全部分类 ›」入口，恒定 3 个模块 chip，
 *     结构上不可能横向溢出（核心问题 = 主页摆不下 15 个 L2 分类）。
 *   - 全量 3 级分类树（15 L2 × 50 L3）放在 /browse 分类页（layout 不受长度约束）。
 *   - 形式/题材 双轴抽象已废弃：类型才是真正的"类型"，分类是真实内容类别，
 *     二者都不该作为 UI 轴标签（用户 2026-08-26 拍板）。
 */
const CategoryChips: React.FC<CategoryChipsProps> = ({embedded = false}) => {
    const {t} = useTranslation();
    const {data} = useCategoryList();
    const location = useLocation();
    const search = useSearch({strict: false}) as {v?: string};
    const activeModule = search.v ?? '';

    const flat = data?.items ?? [];
    const tree = useMemo(() => buildCategoryTree(flat), [flat]);
    if (tree.length === 0) return null;

    const chip = (active: boolean) =>
        `flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active ? 'bg-foreground text-background' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
        }`;

    const content = (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
            {tree.map((root: CategoryTreeNode) => (
                <Link
                    key={root.slug}
                    to="/browse"
                    search={{v: root.slug}}
                    className={chip(activeModule === root.slug)}
                >
                    {root.name}
                </Link>
            ))}
            <span className="w-px h-4 bg-border/60 flex-shrink-0"/>
            <Link
                to="/browse"
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
                {t('categories.all', '全部分类')} ›
            </Link>
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
