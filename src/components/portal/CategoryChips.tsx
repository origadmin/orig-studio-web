import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Link} from '@tanstack/react-router';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {createPortal} from 'react-dom';
import {useCategoryList} from '@/hooks/queries';
import {cn} from '@/lib/utils';
import {buildCategoryTree, type CategoryTreeNode} from '@/lib/utils/categoryTree';

interface CategoryChipsProps {
    embedded?: boolean;
}

/**
 * 主页顶部分类条（BUG-162 修复，v2）：
 * - 只展示 video 根下的 L2 chips，横滚；
 * - 带子类的 L2 → 其正下方百叶窗下拉 L3；
 * - 叶子 L2 / L3 → 跳 /browse?v=video&cats={slug}；
 * - 空 L2（无子类且 media_count=0）隐藏；
 * - 数据层已完成：生活/科技/教程 → reparent 到「知识类」；影视/宣传片/用户UGC → INACTIVE。
 */
const CategoryChips: React.FC<CategoryChipsProps> = ({embedded = false}) => {
    const {data} = useCategoryList();
    const flat = useMemo(() => (data?.items ?? []).filter((c) => c.status === 1), [data]);
    const tree = useMemo(() => buildCategoryTree(flat), [flat]);
    const videoRoot = useMemo(() => tree.find((n) => n.slug === 'video'), [tree]);
    // 同源范式：无 L3 且 media_count=0 的空 L2 隐藏
    const l2Nodes: CategoryTreeNode[] = useMemo(
        () =>
            (videoRoot?.children ?? []).filter(
                (l2) => !(l2.children.length === 0 && (l2.media_count ?? 0) === 0)
            ),
        [videoRoot]
    );

    const trackRef = useRef<HTMLDivElement>(null);
    const chipRefs = useRef<Map<string, HTMLButtonElement | HTMLAnchorElement>>(new Map());
    const [openSlug, setOpenSlug] = useState<string | null>(null);
    const [blind, setBlind] = useState<{left: number; top: number; l3: CategoryTreeNode[]} | null>(null);

    const closeBlind = useCallback(() => {
        setOpenSlug(null);
        setBlind(null);
    }, []);

    const openBlind = useCallback((l2: CategoryTreeNode) => {
        const el = chipRefs.current.get(l2.slug);
        if (!el) return;
        const r = el.getBoundingClientRect();
        setBlind({left: r.left, top: r.bottom + 8, l3: l2.children});
        setOpenSlug(l2.slug);
    }, []);

    const toggle = useCallback(
        (l2: CategoryTreeNode) => {
            if (openSlug === l2.slug) {
                closeBlind();
            } else {
                openBlind(l2);
            }
        },
        [openSlug, closeBlind, openBlind]
    );

    // 外部点击 / 横滚 / 页面滚动 / resize → 关闭下拉
    useEffect(() => {
        if (!blind) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            const blindEl = document.getElementById('top-cat-blind');
            if (blindEl && blindEl.contains(t)) return;
            if (trackRef.current && trackRef.current.contains(t)) return;
            closeBlind();
        };
        document.addEventListener('mousedown', onDown);
        const close = () => closeBlind();
        const tr = trackRef.current;
        tr?.addEventListener('scroll', close, {passive: true});
        window.addEventListener('scroll', close, {passive: true});
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('mousedown', onDown);
            tr?.removeEventListener('scroll', close);
            window.removeEventListener('scroll', close);
            window.removeEventListener('resize', close);
        };
    }, [blind, closeBlind]);

    // 浮层视口夹取
    useLayoutEffect(() => {
        if (!blind) return;
        const el = document.getElementById('top-cat-blind');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const margin = 8;
        let left = blind.left;
        let top = blind.top;
        if (rect.right > window.innerWidth - margin) {
            left = Math.max(margin, window.innerWidth - rect.width - margin);
        }
        if (rect.bottom > window.innerHeight - margin) {
            const chip = openSlug ? chipRefs.current.get(openSlug) : null;
            if (chip) top = chip.getBoundingClientRect().top - rect.height - margin;
            if (top < margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
        }
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    }, [blind, openSlug]);

    // 横滚箭头可用态
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);
    const updateArrows = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);
    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        updateArrows();
        el.addEventListener('scroll', updateArrows, {passive: true});
        const ro = new ResizeObserver(updateArrows);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', updateArrows);
            ro.disconnect();
        };
    }, [updateArrows]);

    const scrollByDir = useCallback((dir: 1 | -1) => {
        const el = trackRef.current;
        if (!el) return;
        el.scrollBy({left: dir * (el.clientWidth * 0.8), behavior: 'smooth'});
    }, []);

    if (!l2Nodes.length) return null;

    const arrowBase =
        'shrink-0 w-7 h-7 rounded-full flex items-center justify-center border border-border bg-white dark:bg-neutral-800 text-foreground shadow-sm transition-all hover:bg-neutral-100 dark:hover:bg-neutral-700 active:scale-95';
    const activeCls = 'bg-[#171717] text-[#fafafa] dark:bg-[#fafafa] dark:text-[#171717]';

    const content = (
        <div className="bg-background">
            <div className="relative flex items-center gap-1 px-4 py-2">
                <button
                    type="button"
                    aria-label="向左"
                    onClick={() => scrollByDir(-1)}
                    className={cn(arrowBase, !canLeft && 'opacity-40 cursor-default hover:bg-background')}
                    disabled={!canLeft}
                >
                    <ChevronLeft className="h-4 w-4"/>
                </button>

                <div
                    ref={trackRef}
                    className="flex flex-1 gap-2 overflow-x-auto scroll-smooth"
                    style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
                >
                    <style>{`[data-top-cat-track]::-webkit-scrollbar{display:none}`}</style>
                    <div data-top-cat-track className="flex gap-2">
                        {l2Nodes.map((l2) => {
                            const isGroup = l2.children.length > 0;
                            const active = openSlug === l2.slug;
                            const baseCls =
                                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap';
                            const cls = isGroup
                                ? active
                                    ? activeCls
                                    : 'bg-foreground/10 text-foreground hover:bg-foreground/15'
                                : active
                                    ? activeCls
                                    : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border';
                            return isGroup ? (
                                <button
                                    key={l2.slug}
                                    ref={(el) => {
                                        if (el) chipRefs.current.set(l2.slug, el);
                                        else chipRefs.current.delete(l2.slug);
                                    }}
                                    type="button"
                                    onClick={() => toggle(l2)}
                                    className={cn(baseCls, cls)}
                                >
                                    {l2.name}
                                </button>
                            ) : (
                                <Link
                                    key={l2.slug}
                                    ref={(el) => {
                                        if (el) chipRefs.current.set(l2.slug, el);
                                        else chipRefs.current.delete(l2.slug);
                                    }}
                                    to="/browse"
                                    search={{v: 'video', cats: l2.slug}}
                                    onClick={closeBlind}
                                    className={cn(baseCls, cls)}
                                >
                                    {l2.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="button"
                    aria-label="向右"
                    onClick={() => scrollByDir(1)}
                    className={cn(arrowBase, !canRight && 'opacity-40 cursor-default hover:bg-background')}
                    disabled={!canRight}
                >
                    <ChevronRight className="h-4 w-4"/>
                </button>
            </div>

            {blind &&
                createPortal(
                    <div
                        id="top-cat-blind"
                        className="fixed z-50 flex flex-col gap-1.5 rounded-xl border border-border bg-white dark:bg-neutral-800 p-2 shadow-2xl"
                        style={{left: blind.left, top: blind.top, animation: 'topCatBlindDrop .22s ease both'}}
                    >
                        <style>{`@keyframes topCatBlindDrop{from{opacity:0;clip-path:inset(0 0 100% 0)}to{opacity:1;clip-path:inset(0 0 0% 0)}}`}</style>
                        {blind.l3.map((l3, i) => (
                            <Link
                                key={l3.slug}
                                to="/browse"
                                search={{v: 'video', cats: l3.slug}}
                                onClick={closeBlind}
                                className="w-full text-left px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-foreground border border-neutral-200 dark:border-neutral-600 whitespace-nowrap"
                                style={{animation: 'topCatBlindDrop .22s ease both', animationDelay: `${i * 45}ms`}}
                            >
                                {l3.name}
                            </Link>
                        ))}
                    </div>,
                    document.body
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
