/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Tags page - display all tags with media counts
 */

import React, {useState} from 'react';
import {Link} from '@tanstack/react-router';
import {Tag, Hash, Search} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {colorFromName} from '@/lib/utils/tag-color';

interface TagInfo {
    title: string;
    count: number;
    color?: string;
}

const mockTags: TagInfo[] = [
    {title: 'Go', count: 128}, {title: 'React', count: 256}, {title: 'Docker', count: 89},
    {title: 'Kubernetes', count: 67}, {title: 'TypeScript', count: 198}, {title: 'Python', count: 312},
    {title: 'AWS', count: 145}, {title: 'Vue', count: 134}, {title: 'Redis', count: 56},
    {title: 'GraphQL', count: 78}, {title: 'MongoDB', count: 45}, {title: 'Linux', count: 203},
    {title: 'Node.js', count: 167}, {title: 'Rust', count: 34}, {title: 'C++', count: 92},
    {title: 'Java', count: 187}, {title: 'Swift', count: 41}, {title: 'Flutter', count: 63},
    {title: 'DevOps', count: 112}, {title: '机器学习', count: 89}, {title: '深度学习', count: 56},
    {title: '数据科学', count: 73}, {title: '区块链', count: 28}, {title: '网络安全', count: 47},
    {title: '算法', count: 156}, {title: '系统设计', count: 98}, {title: '前端', count: 221},
    {title: '后端', count: 178}, {title: '全栈', count: 134}, {title: '微服务', count: 76},
];

const getTagColor = (tag: TagInfo): string => {
    return tag.color || colorFromName(tag.title);
};

const TagsPage = () => {
    const {t} = useTranslation();
    const [filter, setFilter] = useState('');
    const filteredTags = mockTags.filter(t =>
        t.title.toLowerCase().includes(filter.toLowerCase())
    );

    const sortedTags = filter
        ? [...filteredTags].sort((a, b) => a.title.localeCompare(b.title))
        : [...filteredTags].sort((a, b) => b.count - a.count);

    return (
        <div className="space-y-6">
            {/* Title */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Tag size={24} className="text-muted-foreground"/>
                    <h1 className="text-2xl font-bold text-foreground">{t('tags.title')}</h1>
                </div>
                <span className="text-sm text-gray-500">{t('tags.tagCount', {count: mockTags.length})}</span>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={t('tags.searchPlaceholder')}
                    className="w-full bg-card border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
            </div>

            {/* Tag grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sortedTags.map((tag) => {
                    const tagColor = getTagColor(tag);
                    return (
                        <Link
                            key={tag.title}
                            to="/search"
                            search={{q: tag.title}}
                            className="group flex items-center gap-2 p-3 bg-card border border-border rounded-card hover:shadow-md transition-all"
                            style={{'--tag-color': tagColor} as React.CSSProperties}
                        >
                            <Hash size={16} className="shrink-0" style={{color: tagColor}}/>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate transition-colors" style={{color: tagColor}}>
                                    {tag.title}
                                </p>
                                <p className="text-xs text-muted-foreground">{t('tags.videosCount', {count: tag.count})}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {filteredTags.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <Tag size={48} className="mx-auto mb-3 opacity-30"/>
                    <p>{t('tags.noMatch')}</p>
                </div>
            )}
        </div>
    );
};

export default TagsPage;
