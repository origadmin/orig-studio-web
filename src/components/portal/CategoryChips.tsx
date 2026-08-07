import React from 'react';
import {Link, useLocation, useSearch} from '@tanstack/react-router';
import {useCategoryList} from '@/hooks/queries';
import {useTranslation} from 'react-i18next';
import type {Category} from '@/lib/api/category';
import {kindOf} from '@/lib/utils/categoryKind';

interface CategoryChipsProps {
    embedded?: boolean;
}

const CategoryChips: React.FC<CategoryChipsProps> = ({embedded = false}) => {
    const {t} = useTranslation();
    const {data} = useCategoryList();
    const location = useLocation();
    const pathname = location.pathname;
    // /browse 的 URL 契约（BUG-162）：分类筛选按 kind 拆到 ?form= / ?genre=（slug）。
    // 旧的 ?category_id=（数字 id）在 /browse 不生效——点击必须带 form/genre slug。
    const search = useSearch({strict: false}) as {form?: string; genre?: string};
    const activeSlugs = new Set([
        ...(search.form ?? '').split(',').filter(Boolean),
        ...(search.genre ?? '').split(',').filter(Boolean),
    ]);

    const items: Category[] = data?.items ?? [];

    if (items.length === 0) return null;

    const content = (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
            <Link
                to="/"
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    pathname === '/' && activeSlugs.size === 0
                        ? 'bg-foreground text-background'
                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }`}
            >
                {t('home.all', '全部')}
            </Link>
            {items.map((cat) => (
                <Link
                    key={cat.id}
                    to="/browse"
                    search={kindOf(cat.slug) === 'form' ? {form: cat.slug} : {genre: cat.slug}}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeSlugs.has(cat.slug)
                            ? 'bg-foreground text-background'
                            : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                    }`}
                >
                    {cat.name}
                </Link>
            ))}
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
            {content}
        </div>
    );
};

export default CategoryChips;
