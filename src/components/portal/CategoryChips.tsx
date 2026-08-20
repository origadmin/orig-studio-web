import React, {useMemo, useState} from 'react';
import {Link, useLocation, useSearch} from '@tanstack/react-router';
import {useCategoryList} from '@/hooks/queries';
import {useTranslation} from 'react-i18next';
import type {Category} from '@/lib/api/category';
import {buildCategoryTree} from '@/lib/utils/categoryTree';
import {kindOf} from '@/lib/utils/categoryKind';
import {ChevronRight} from 'lucide-react';

interface CategoryChipsProps {
    embedded?: boolean;
}

/**
 * 主页顶部分类排（BUG-237 3 层改造，方案 A：中间层展开）。
 *
 * 根级模块导航（视频/文章/音乐）在 Sidebar/Header（NAV_CONFIG），此处只放分类：
 *  - 「全部」回主页
 *  - 视频根下的中间层组（影视 / 兴趣 / 内容类型）——可点击展开其叶子 chip
 *  - 叶子（三级）点击跳 /browse?form=|genre=slug（URL 契约不变，BUG-162）
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

    const content = (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
            <Link
                to="/"
                className={chipCls(pathname === '/' && activeSlugs.size === 0)}
            >
                {t('home.all', '全部')}
            </Link>

            {/* 视频根下的中间层组（3 层：视频 → 中间层 → 叶子） */}
            {videoRoot?.children?.map(group => (
                <React.Fragment key={group.id}>
                    <button
                        type="button"
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                            activeSlugs.has(group.slug)
                                ? 'bg-foreground text-background'
                                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                        }`}
                        onClick={() => setOpenGroups(prev => {
                            const next = new Set(prev);
                            next.has(group.slug) ? next.delete(group.slug) : next.add(group.slug);
                            return next;
                        })}
                    >
                        <ChevronRight size={12} className={`transition-transform ${openGroups.has(group.slug) ? 'rotate-90' : ''}`}/>
                        {group.name}
                    </button>
                    {openGroups.has(group.slug) && group.children?.map(leafLink)}
                </React.Fragment>
            ))}
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
