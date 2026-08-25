import React, {useMemo} from 'react';
import {Link, useLocation, useSearch} from '@tanstack/react-router';
import {useCategoryList} from '@/hooks/queries';
import {useTranslation} from 'react-i18next';
import type {Category} from '@/lib/api/category';
import {buildCategoryTree} from '@/lib/utils/categoryTree';
import {kindOf} from '@/lib/utils/categoryKind';

interface CategoryChipsProps {
    embedded?: boolean;
}

/**
 * 主页顶部分类排（数据驱动渲染）。
 *
 * 根级模块导航（视频/文章/音乐）在 Sidebar/Header（NAV_CONFIG），此处只放分类：
 *  - 「全部」回主页
 *  - 视频根下叶子按 kind 拆双区平铺：
 *    · 「形式」(form)：连续剧/电影/综艺/动漫/MV → ?form=slug
 *    · 「题材」(genre)：教程/宣传片/UGC/.../其他 → ?genre=slug
 *
 * 权威设计 = BUG-162「2 层 + kind 标记」（用户 2026-08-25 拍板）。
 * 叶子 URL 契约：form → ?form=slug，genre → ?genre=slug（方案 B 双键）。
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

    const flat: Category[] = data?.items ?? [];
    const tree = useMemo(() => buildCategoryTree(flat), [flat]);

    if (tree.length === 0) return null;

    const videoRoot = tree.find(n => n.slug === 'video');

    // 2 层：video 根下叶子按 kind 分双区（BUG-162 §8.5）
    const formCats = videoRoot?.children?.filter(c => kindOf(c.slug) === 'form') ?? [];
    const genreCats = videoRoot?.children?.filter(c => kindOf(c.slug) === 'genre') ?? [];

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

    const sectionLabel = (text: string) => (
        <span className="flex-shrink-0 text-xs font-medium text-muted-foreground whitespace-nowrap">{text}</span>
    );

    const content = (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
            <Link
                to="/"
                className={chipCls(pathname === '/' && activeSlugs.size === 0)}
            >
                {t('home.all', '全部')}
            </Link>

            {formCats.length > 0 && (
                <>
                    {sectionLabel(t('categories.form', '形式'))}
                    {formCats.map(leafLink)}
                </>
            )}

            {genreCats.length > 0 && (
                <>
                    {sectionLabel(t('categories.genre', '题材'))}
                    {genreCats.map(leafLink)}
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
