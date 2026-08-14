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
     * - 左右按钮按「一整屏可见宽度」步进（整页翻，绝不逐卡）；
     * - 设计重审(2026-08-15)：**不再展示页数指示器**——列数随宽度自适应，
     *   页数永远无法稳定统计，指示器本质是错的，故彻底移除（用户裁定）；
     * - **按钮常显常可点、永不隐藏、永不穿透**——隐藏/悬停切换是快速点击
     *   误触的根源；边界（首/末页）仅置灰但仍在原位吸收点击；
     * - 不开启时维持原「单卡自由滑动 + 悬停显隐按钮」行为，兼容 StyleGuide 等。
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

    // BUG-226：读取 flex 行实际 gap（容器 gap-4=16px，但以 DOM 实测为准），
    // 整页步进必须把 gap 算进去，否则推进一整屏会错位、留幻影余量。
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
        // pageMode：内容溢出（可翻页）即显示常驻按钮；非 pageMode：有可滑方向才显示。
        setShowButtons(pageMode
            ? el.scrollWidth > el.clientWidth + 4
            : left || right);
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

    // 单步像素：pageMode 下整页 = 可见宽 + gap（一次恰好推进整页），否则原逻辑（单卡或比例）。
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

    const buttonTop = buttonOffset > 0 ? buttonOffset : '38%';

    // BUG-226(设计重审)：pageMode 下按钮**常显常可点**——不做悬停显隐、永不隐藏、永不穿透。
    // 边界（首/末页）仅置灰（opacity-40）但仍 pointer-events-auto 吸收点击，快速点击绝不落卡片。
    // 非 pageMode 维持原悬停显隐行为（StyleGuide 等其它调用方）。
    const arrowVis = (can: boolean) => pageMode
        ? cn('opacity-100 pointer-events-auto', !can && 'opacity-40')
        : cn(
            'opacity-0 pointer-events-none group-hover/scroll:opacity-100 group-hover/scroll:pointer-events-auto',
            !can && 'pointer-events-none opacity-0 !scale-90',
        );

    return (
        <div ref={wrapperRef} className={cn('relative group/scroll', className)}>
            <div
                ref={containerRef}
                data-hscroll="true"
                className={cn(
                    'flex gap-4 pb-2 scroll-smooth',
                    // BUG-226：pageMode 下禁用自由横滑（overflow-x-hidden），只能靠按钮整屏翻页。
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
                        type="button"
                        onClick={() => scrollByAmount('left')}
                        className={cn(
                            'absolute z-30',
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            'bg-white dark:bg-neutral-800 shadow-lg shadow-black/15 dark:shadow-black/40',
                            'text-neutral-700 dark:text-neutral-200',
                            'hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:scale-110',
                            'active:scale-95',
                            'transition-all duration-200 ease-out',
                            'left-0 -translate-x-1/2',
                            arrowVis(canScrollLeft),
                        )}
                        style={{top: buttonTop}}
                        aria-label="Previous"
                    >
                        <ChevronLeft className="h-5 w-5"/>
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollByAmount('right')}
                        className={cn(
                            'absolute z-30',
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            'bg-white dark:bg-neutral-800 shadow-lg shadow-black/15 dark:shadow-black/40',
                            'text-neutral-700 dark:text-neutral-200',
                            'hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:scale-110',
                            'active:scale-95',
                            'transition-all duration-200 ease-out',
                            'right-0 translate-x-1/2',
                            arrowVis(canScrollRight),
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
                            pageMode ? 'opacity-100' : 'opacity-0 group-hover/scroll:opacity-100',
                            !canScrollLeft && 'opacity-0',
                        )}
                    />
                    <div
                        className={cn(
                            'absolute top-0 bottom-0 w-12 z-20 pointer-events-none transition-opacity duration-300',
                            'bg-gradient-to-l from-background to-transparent right-0',
                            pageMode ? 'opacity-100' : 'opacity-0 group-hover/scroll:opacity-100',
                            !canScrollRight && 'opacity-0',
                        )}
                    />
                </>
            )}
        </div>
    );
};

export default HorizontalScroll;
