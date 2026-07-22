import React from 'react';
import {Link, useLocation, useSearch} from '@tanstack/react-router';
import {useCategoryList} from '@/hooks/queries';
import {useTranslation} from 'react-i18next';
import type {Category} from '@/lib/api/category';

interface CategoryChipsProps {
    embedded?: boolean;
}

const CategoryChips: React.FC<CategoryChipsProps> = ({embedded = false}) => {
    const {t} = useTranslation();
    const {data} = useCategoryList();
    const location = useLocation();
    const pathname = location.pathname;
    const search = useSearch({strict: false}) as {category_id?: number};
    const currentCategoryId = search.category_id;

    const items: Category[] = data?.items ?? [];

    if (items.length === 0) return null;

    const isActive = (id: number) => currentCategoryId === id;

    const content = (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
            <Link
                to="/"
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    pathname === '/' && !currentCategoryId
                        ? 'bg-foreground text-background'
                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }`}
            >
                {t('home.all', '全部')}
            </Link>
            {items.map((cat) => (
                <Link
                    key={cat.id}
                    to="/categories"
                    search={{category_id: cat.id}}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isActive(cat.id)
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
