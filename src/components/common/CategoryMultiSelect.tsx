import React, {useState, useMemo} from 'react';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Button} from '@/components/ui/button';
import {Check, ChevronDown, X} from 'lucide-react';
import {buildCategoryTree, type CategoryTreeNode} from '@/lib/utils/categoryTree';
import type {Category} from '@/lib/api/category';
import {useTranslation} from 'react-i18next';

interface CategoryMultiSelectProps {
    /** Flat list of all categories from API. */
    categories: Category[];
    /** Root slug to scope the tree (e.g. 'video'). Tree roots other than this are ignored. */
    rootSlug: string;
    /** Slugs currently selected (controlled). */
    value: Set<string>;
    /** Toggle a slug. */
    onToggle: (slug: string) => void;
    /** Clear all selections. */
    onClear: () => void;
    /** Optional placeholder text. */
    placeholder?: string;
    /** Optional width of the popover panel. */
    panelWidth?: number;
    /** Optional className for the trigger button. */
    triggerClassName?: string;
}

/**
 * BUG-237 3-layer category multi-select popover (方案 C: 树下拉).
 *
 * Renders the category tree under `rootSlug` (with depth-based indentation and
 * checkboxes). Supports multi-select (Set<string>). Tree rendering is fully
 * recursive and supports arbitrary depth.
 */
const CategoryMultiSelect: React.FC<CategoryMultiSelectProps> = ({
    categories, rootSlug, value, onToggle, onClear,
    placeholder, panelWidth = 320, triggerClassName,
}) => {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);

    const fullTree = useMemo(() => buildCategoryTree(categories), [categories]);
    const root = fullTree.find(n => n.slug === rootSlug);
    const displayTree: CategoryTreeNode[] = root?.children ?? [];

    // Selected names for the trigger summary
    const selectedNames = useMemo(() => {
        if (value.size === 0) return [];
        const all = root ? collectAllSlugs(root) : [];
        return [...value].filter(s => all.includes(s))
            .map(s => findNodeBySlug(displayTree, s)?.name)
            .filter(Boolean) as string[];
    }, [value, root, displayTree]);

    // For tree rendering we treat any node as a clickable row (the row is the
    // selection unit, matching the existing chip-based multi-select semantics).
    // Leaves can be selected directly; intermediate (group) nodes can also be
    // selected (server BUG-164 subtree expansion covers descendants).

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`justify-between h-9 ${triggerClassName ?? ''}`}
                    onClick={() => setOpen(o => !o)}
                >
                    <span className="truncate text-left">
                        {value.size === 0
                            ? (placeholder ?? t('categories.selectCategory', '选择分类...'))
                            : selectedNames.length <= 2
                                ? selectedNames.join(' / ')
                                : `${selectedNames.length} 项`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-1" style={{width: panelWidth}} align="start">
                {displayTree.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground text-center">
                        {t('categories.noCategories', '暂无分类')}
                    </div>
                ) : (
                    <div className="max-h-72 overflow-y-auto">
                        {displayTree.map(node => (
                            <TreeRow
                                key={node.id}
                                node={node}
                                depth={0}
                                selected={value}
                                onToggle={onToggle}
                            />
                        ))}
                    </div>
                )}
                {value.size > 0 && (
                    <div className="border-t pt-1 mt-1 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={onClear}>
                            <X className="w-3 h-3 mr-1"/>
                            {t('common.clear', '清空')}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};

const TreeRow: React.FC<{
    node: CategoryTreeNode;
    depth: number;
    selected: Set<string>;
    onToggle: (slug: string) => void;
}> = ({node, depth, selected, onToggle}) => {
    const isSelected = selected.has(node.slug);
    const indent = depth * 16; // px
    return (
        <>
            <button
                type="button"
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-accent ${
                    isSelected ? 'bg-accent/50' : ''
                }`}
                style={{paddingLeft: 8 + indent}}
                onClick={() => onToggle(node.slug)}
            >
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                }`}>
                    {isSelected && <Check className="h-3 w-3"/>}
                </span>
                {node.hasChildren && (
                    <span className="text-xs text-muted-foreground w-3 text-center">▸</span>
                )}
                <span className="flex-1 truncate">{node.name}</span>
                <span className="text-xs text-muted-foreground/60">{node.descendantCount > 0 ? `+${node.descendantCount}` : ''}</span>
            </button>
            {node.hasChildren && node.children.map(child => (
                <TreeRow key={child.id} node={child} depth={depth + 1} selected={selected} onToggle={onToggle}/>
            ))}
        </>
    );
};

function collectAllSlugs(node: CategoryTreeNode): string[] {
    const out: string[] = [node.slug];
    for (const c of node.children ?? []) out.push(...collectAllSlugs(c));
    return out;
}

function findNodeBySlug(nodes: CategoryTreeNode[], slug: string): CategoryTreeNode | undefined {
    for (const n of nodes) {
        if (n.slug === slug) return n;
        const found = findNodeBySlug(n.children ?? [], slug);
        if (found) return found;
    }
    return undefined;
}

export default CategoryMultiSelect;
