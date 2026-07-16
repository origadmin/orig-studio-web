import React, {useState, useRef, useCallback, useEffect} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {cn} from '@/lib/utils';

interface HorizontalScrollProps {
    children: React.ReactNode;
    className?: string;
    buttonOffset?: number;
    scrollAmount?: number;
}

const HorizontalScroll: React.FC<HorizontalScrollProps> = ({
    children,
    className,
    buttonOffset = 0,
    scrollAmount = 0.85,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [showButtons, setShowButtons] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const left = el.scrollLeft > 4;
        const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
        setCanScrollLeft(left);
        setCanScrollRight(right);
        setShowButtons(left || right);
    }, []);

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

    const scrollByAmount = useCallback((direction: 'left' | 'right') => {
        const el = containerRef.current;
        if (!el) return;
        const amount = el.clientWidth * scrollAmount;
        el.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth',
        });
    }, [scrollAmount]);

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
                    scrollPaddingLeft: '4px',
                    scrollPaddingRight: '4px',
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
        </div>
    );
};

export default HorizontalScroll;
