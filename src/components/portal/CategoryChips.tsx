import React from 'react';
import {Link, useLocation} from '@tanstack/react-router';
import {useCategoryList} from '@/hooks/queries';

const CategoryChips: React.FC = () => {
    const {data: categories} = useCategoryList();
    const location = useLocation();
    const pathname = location.pathname;

    const items = categories ?? [];

    if (items.length === 0) return null;

    const isActive = (slug: string) => pathname === `/c/${slug}` || pathname === `/categories`;

    return (
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto yt-scrollbar">
                <Link
                    to="/"
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        pathname === '/'
                            ? 'bg-foreground text-background'
                            : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                    }`}
                >
                    All
                </Link>
                {items.map((cat: any) => (
                    <Link
                        key={cat.id}
                        to="/c/$id"
                        params={{id: String(cat.id)}}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            isActive(cat.slug)
                                ? 'bg-foreground text-background'
                                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                        }`}
                    >
                        {cat.name}
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default CategoryChips;
