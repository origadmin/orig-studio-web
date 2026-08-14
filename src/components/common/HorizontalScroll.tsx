import React, {useState, useRef, useCallback, useEffect} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {cn} from '@/lib/utils';

interface HorizontalScrollProps {
    children: React.ReactNode;
    className?: string;
    buttonOffset?: number;
    scrollAmount?: number;
    /**
     * BUG-191(v2)：翻页步进像素。设置后点击左右按钮按该像素精确滑动
     * （通常传入 卡宽+间距），保证每次滑动后仍对齐、不切半截。
     * 不设置时回退到 scrollAmount 比例模式。
     */
    scrollStep?: number;
    /**
     * BUG-226：整页翻页模式。开启后：
     * - 左右按钮（及圆点）按「一整屏可见宽度」步进，而非单张卡片；
     * - 底部展示页码圆点（或 当前/总数 文本），点击圆点跳到对应整页；
     * - 不开启时维持原「单卡自由滑动」行为，兼容 StyleGuide 等其它调用方。
     */
    pageMode?: boolean;
    /**
     * BUG-226(精确页数)：整页翻页时每页的卡片数（可见列数）。
     * 传入后页数 = ceil(卡片数/pageSize)，与 scrollWidth 推算无关，精确且不"伸缩"；
     * 不传时回退到 (scrollWidth+gap)/(clientWidth+gap) 推算。
     */
    pageSize?: number;
}

const HorizontalScroll: React.FC<HorizontalScrollProps> = ({
    children,
    className,
    buttonOffset = 0,
    scrollAmount = 0.85,
    scrollStep,
    pageMode = false,
    pageSize,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [showButtons, setShowButtons] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // BUG-226(精确页数)：读取 flex 行实际 gap（容器 gap-4=16px，但以 DOM 实测为准），
    // 页数/步进计算必须把 gap 算进去，否则会多算一页并留下"幻影滚动余量"。
    const getGap = useCallback((el: HTMLElement) => {
        if (el.children.length > 1) {
            const a = el.children[0] as HTMLElement;
            const b = el.children[1] as HTMLElement;
            return b.offsetLeft - a.offsetLeft - a.offsetWidth;
        }
        return 16;
    }, []);

    const updateScrollState = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const left = el.scrollLeft > 4;
        const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
        setCanScrollLeft(left);
        setCanScrollRight(right);
        setShowButtons(left || right);

        if (pageMode && el.clientWidth > 0) {
            const gap = getGap(el);
            const pageStep = el.clientWidth + gap;
            // 精确页数：有 pageSize 时 = ceil(卡片数/pageSize)（与 scrollWidth 无关，不"伸缩"）；
            // 否则回退 (scrollWidth+gap)/(clientWidth+gap)（gap 补偿，避免多算一页）。
            const n = el.children.length;
            const tp = pageSize && pageSize > 0
                ? Math.max(1, Math.ceil(n / pageSize))
                : Math.max(1, Math.ceil((el.scrollWidth + gap) / pageStep));
            const pg = Math.min(tp, Math.max(1, Math.floor(el.scrollLeft / pageStep) + 1));
            setTotalPages((prev) => (prev === tp ? prev : tp));
            setPage((prev) => (prev === pg ? prev : pg));
        }
    }, [pageMode, getGap, pageSize]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener('scroll', updateScrollState, {passive: true});
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        const mo = new MutationObserver(updateScrollState);
        mo.observe(el, {childList: true, subtree: true});
        return () => {
            el.removeEventListener('scroll', updateScrollState);
            ro.disconnect();
            mo.disconnect();
        };
    }, [updateScrollState, children]);

    // 单步像素：pageMode 下整页 = 可见宽 + gap（一次恰好推进整页，不产生错位余量），
    // 否则原逻辑（单卡或比例）。
    const stepPixels = useCallback((el: HTMLDivElement) => {
        if (pageMode) return el.clientWidth + getGap(el);
        return scrollStep ?? el.clientWidth * scrollAmount;
    }, [pageMode, scrollAmount, scrollStep, getGap]);

    const scrollByAmount = useCallback((direction: 'left' | 'right') => {
        const el = containerRef.current;
        if (!el) return;
        const amount = stepPixels(el);
        el.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth',
        });
    }, [stepPixels]);

    const scrollToPage = useCallback((target: number) => {
        const el = containerRef.current;
        if (!el) return;
        const idx = Math.min(Math.max(1, target), totalPages);
        el.scrollTo({left: (idx - 1) * (el.clientWidth + getGap(el)), behavior: 'smooth'});
    }, [totalPages, getGap]);

    const buttonTop = buttonOffset > 0 ? buttonOffset : '38%';

    return (
        <div ref={wrapperRef} className={cn('relative group/scroll', className)}>
            <div
                ref={containerRef}
                data-hscroll="true"
                className={cn(
                    'flex gap-4 pb-2 scroll-smooth',
                    // BUG-226：pageMode 下禁用自由横滑（overflow-x-hidden），彻底杜绝
                    // 触控板/滚轮/拖拽「一张张滑」；只能靠按钮/圆点整屏翻页。
                    pageMode ? 'overflow-x-hidden' : 'overflow-x-auto',
                )}
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <style>{`
                    [data-hscroll="true"]::-webkit-scrollbar { display: none; }
                    [data-hscroll="true"] > * { flex-shrink: 0; }
                `}</style>
                {children}
            </div>
            {showButtons && (
                <>
                    <button
                        onClick={() => scrollByAmount('left')}
                        className={cn(
                            'absolute z-30',
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            'bg-white dark:bg-neutral-800 shadow-lg shadow-black/15 dark:shadow-black/40',
                            'text-neutral-700 dark:text-neutral-200',
                            'hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:scale-110',
                            'active:scale-95',
                            'transition-all duration-200 ease-out',
                            // BUG-226(点击穿透修复)：非悬停时按钮透明且不拦截点击（pointer-events-none），
                            // 只在悬停时可见可点（group-hover:opacity-100 + pointer-events-auto），
                            // 避免透明热区吞掉卡片点击、或悬停时点击穿透到卡片。
                            'opacity-0 pointer-events-none group-hover/scroll:opacity-100 group-hover/scroll:pointer-events-auto',
                            'left-0 -translate-x-1/2',
                            // BUG-226(边界态)：已到第 1 页时按钮**可见但置灰禁用**——不隐藏！
                            // 隐藏会在用户连点/惯性点击时让点击落到卡片（100% 误触）。
                            // 保持可见并吸收点击（pointer-events-auto），点了只是无操作。
                            !canScrollLeft && '!opacity-40 cursor-not-allowed',
                        )}
                        style={{top: buttonTop}}
                        aria-label="Previous"
                    >
                        <ChevronLeft className="h-5 w-5"/>
                    </button>
                    <button
                        onClick={() => scrollByAmount('right')}
                        className={cn(
                            'absolute z-30',
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            'bg-white dark:bg-neutral-800 shadow-lg shadow-black/15 dark:shadow-black/40',
                            'text-neutral-700 dark:text-neutral-200',
                            'hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:scale-110',
                            'active:scale-95',
                            'transition-all duration-200 ease-out',
                            'opacity-0 pointer-events-none group-hover/scroll:opacity-100 group-hover/scroll:pointer-events-auto',
                            'right-0 translate-x-1/2',
                            !canScrollRight && '!opacity-40 cursor-not-allowed',
                        )}
                        style={{top: buttonTop}}
                        aria-label="Next"
                    >
                        <ChevronRight className="h-5 w-5"/>
                    </button>
                    <div
                        className={cn(
                            'absolute top-0 bottom-0 w-12 z-20 pointer-events-none transition-opacity duration-300',
                            'bg-gradient-to-r from-background to-transparent left-0',
                            'opacity-0 group-hover/scroll:opacity-100',
                            !canScrollLeft && 'opacity-0',
                        )}
                    />
                    <div
                        className={cn(
                            'absolute top-0 bottom-0 w-12 z-20 pointer-events-none transition-opacity duration-300',
                            'bg-gradient-to-l from-background to-transparent right-0',
                            'opacity-0 group-hover/scroll:opacity-100',
                            !canScrollRight && 'opacity-0',
                        )}
                    />
                </>
            )}
            {pageMode && totalPages > 1 && (
                <div className="flex items-center justify-center pt-3">
                    {totalPages <= 12 ? (
                        <div className="flex items-center gap-1.5">
                            {Array.from({length: totalPages}).map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => scrollToPage(i + 1)}
                                    aria-label={`Page ${i + 1}`}
                                    className={cn(
                                        'h-2 rounded-full transition-all duration-200',
                                        page === i + 1
                                            ? 'w-5 bg-primary'
                                            : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                                    )}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <button
                                type="button"
                                onClick={() => scrollByAmount('left')}
                                disabled={page <= 1}
                                className="disabled:opacity-40 hover:text-foreground transition-colors"
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="h-4 w-4"/>
                            </button>
                            <span className="tabular-nums">{page} / {totalPages}</span>
                            <button
                                type="button"
                                onClick={() => scrollByAmount('right')}
                                disabled={page >= totalPages}
                                className="disabled:opacity-40 hover:text-foreground transition-colors"
                                aria-label="Next page"
                            >
                                <ChevronRight className="h-4 w-4"/>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HorizontalScroll;
