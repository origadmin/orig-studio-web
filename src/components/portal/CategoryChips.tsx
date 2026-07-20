import React from 'react';
import {useTranslation} from 'react-i18next';
import {useCategoryList} from '@/hooks/queries';
import type {Category} from '@/lib/api/category';

interface CategoryChipsProps {
    selectedId?: number | null;
    onSelect?: (id: number | null) => void;
    embedded?: boolean;
}

const CategoryChips: React.FC<CategoryChipsProps> = ({
    selectedId = null,
    onSelect,
    embedded = false,
}) => {
    const {t} = useTranslation();
    const {data} = useCategoryList();
    const items: Category[] = data?.items ?? [];

    if (items.length === 0) return null;

    const handleSelect = (id: number | null) => {
        onSelect?.(id);
    };

    const content = (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
            <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedId === null
                        ? 'bg-foreground text-background'
                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }`}
            >
                {t('categories.all', 'All')}
            </button>
            {items.map((cat) => (
                <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedId === cat.id
                            ? 'bg-foreground text-background'
                            : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                    }`}
                >
                    {cat.name}
                </button>
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
