import React, {useState, useRef, useCallback} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ScrollArea, ScrollBar} from '@/components/ui/scroll-area';
import {cn} from '@/lib/utils';

interface HorizontalScrollProps {
    children: React.ReactNode;
    className?: string;
    itemsPerPage?: number;
}

const HorizontalScroll: React.FC<HorizontalScrollProps> = ({children, className, itemsPerPage = 4}) => {
    const [currentPage, setCurrentPage] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const childrenArray = React.Children.toArray(children);
    const totalPages = Math.ceil(childrenArray.length / itemsPerPage);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(page);
        if (containerRef.current) {
            containerRef.current.scrollTo({
                left: page * containerRef.current.clientWidth,
                behavior: 'smooth',
            });
        }
    }, []);

    const nextPage = useCallback(() => {
        if (currentPage < totalPages - 1) {
            goToPage(currentPage + 1);
        }
    }, [currentPage, totalPages, goToPage]);

    const prevPage = useCallback(() => {
        if (currentPage > 0) {
            goToPage(currentPage - 1);
        }
    }, [currentPage, goToPage]);

    return (
        <div className={cn('relative', className)}>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
                <div className="flex w-max gap-4" ref={containerRef}>
                    {children}
                </div>
                <ScrollBar orientation="horizontal"/>
            </ScrollArea>
            {totalPages > 1 && (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm shadow-md z-10',
                            currentPage === 0 && 'opacity-50 cursor-not-allowed',
                        )}
                        onClick={prevPage}
                        disabled={currentPage === 0}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-5 w-5"/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'absolute right-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm shadow-md z-10',
                            currentPage === totalPages - 1 && 'opacity-50 cursor-not-allowed',
                        )}
                        onClick={nextPage}
                        disabled={currentPage === totalPages - 1}
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-5 w-5"/>
                    </Button>
                </>
            )}
        </div>
    );
};

export default HorizontalScroll;
