import React, {useState, useRef, useCallback, useEffect} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {cn} from '@/lib/utils';

interface HorizontalScrollProps {
    children: React.ReactNode;
    className?: string;
}

const HorizontalScroll: React.FC<HorizontalScrollProps> = ({children, className}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener('scroll', updateScrollState, {passive: true});
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', updateScrollState);
            ro.disconnect();
        };
    }, [updateScrollState, children]);

    const scrollByAmount = useCallback((direction: 'left' | 'right') => {
        const el = containerRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.85;
        el.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth',
        });
    }, []);

    const showButtons = canScrollLeft || canScrollRight;

    return (
        <div className={cn('relative group', className)}>
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
                `}</style>
                {children}
            </div>
            {showButtons && (
                <>
                    <button
                        onClick={() => scrollByAmount('left')}
                        className={cn(
                            'absolute top-[calc(50%-2.5rem)] -left-3 -translate-y-1/2 z-20',
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            'bg-background/90 dark:bg-black/70 backdrop-blur-md shadow-lg border border-border/40',
                            'text-foreground hover:bg-background dark:hover:bg-black/90 transition-all duration-200',
                            'opacity-0 group-hover:opacity-100',
                            !canScrollLeft && 'pointer-events-none opacity-0',
                        )}
                        aria-label="Previous"
                    >
                        <ChevronLeft className="h-5 w-5"/>
                    </button>
                    <button
                        onClick={() => scrollByAmount('right')}
                        className={cn(
                            'absolute top-[calc(50%-2.5rem)] -right-3 -translate-y-1/2 z-20',
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            'bg-background/90 dark:bg-black/70 backdrop-blur-md shadow-lg border border-border/40',
                            'text-foreground hover:bg-background dark:hover:bg-black/90 transition-all duration-200',
                            'opacity-0 group-hover:opacity-100',
                            !canScrollRight && 'pointer-events-none opacity-0',
                        )}
                        aria-label="Next"
                    >
                        <ChevronRight className="h-5 w-5"/>
                    </button>
                </>
            )}
        </div>
    );
};

export default HorizontalScroll;
