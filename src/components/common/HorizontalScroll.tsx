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
}

const HorizontalScroll: React.FC<HorizontalScrollProps> = ({
    children,
    className,
    buttonOffset = 0,
    scrollAmount = 0.85,
    scrollStep,
    pageMode = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [showButtons, setShowButtons] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const updateScrollState = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const left = el.scrollLeft > 4;
        const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
        setCanScrollLeft(left);
        setCanScrollRight(right);
        setShowButtons(left || right);

        if (pageMode && el.clientWidth > 0) {
            const tp = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
            const pg = Math.min(tp, Math.max(1, Math.floor(el.scrollLeft / el.clientWidth) + 1));
            setTotalPages((prev) => (prev === tp ? prev : tp));
            setPage((prev) => (prev === pg ? prev : pg));
        }
    }, [pageMode]);

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

    // 单步像素：pageMode 下一整屏（一次跳满当前可见列），否则原逻辑（单卡或比例）。
    const stepPixels = useCallback((el: HTMLDivElement) => {
        if (pageMode) return el.clientWidth;
        return scrollStep ?? el.clientWidth * scrollAmount;
    }, [pageMode, scrollAmount, scrollStep]);

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
        el.scrollTo({left: (idx - 1) * el.clientWidth, behavior: 'smooth'});
    }, [totalPages]);

    const buttonTop = buttonOffset > 0 ? buttonOffset : '38%';

    return (
        <div ref={wrapperRef} className={cn('relative group/scroll', className)}>
            <div
                ref={containerRef}
                data-hscroll="true"
                className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
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
                            'opacity-0 group-hover/scroll:opacity-100',
                            'left-0 -translate-x-1/2',
                            !canScrollLeft && 'pointer-events-none opacity-0 !scale-90',
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
                            'opacity-0 group-hover/scroll:opacity-100',
                            'right-0 translate-x-1/2',
                            !canScrollRight && 'pointer-events-none opacity-0 !scale-90',
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
