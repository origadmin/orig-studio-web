import {Button} from "@/components/ui/button";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {PAGINATION_CONFIG} from "@/config/pagination";
import {cn} from "@/lib/utils";

interface TablePaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
        return pages;
    }

    let start = Math.max(2, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 3);

    if (end - start + 1 < maxVisible - 2) {
        start = Math.max(2, end - maxVisible + 3);
    }

    pages.push(1);

    if (start > 2) {
        pages.push('...');
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (end < totalPages - 1) {
        pages.push('...');
    }

    pages.push(totalPages);

    return pages;
}

export function TablePagination({
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
}: TablePaginationProps) {
    const totalPages = Math.ceil(total / pageSize);

    if (total <= pageSize) {
        return null;
    }

    const pageNumbers = getPageNumbers(page, totalPages);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
                Showing {startItem} to {endItem} of {total} items
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon-sm"
                    className="text-muted-foreground"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="w-4 h-4"/>
                </Button>
                {pageNumbers.map((p) => (
                    p === '...' ? (
                        <span key="ellipsis" className="text-slate-300 mx-1">...</span>
                    ) : (
                        <Button
                            key={p}
                            size="sm"
                            variant={p === page ? 'default' : 'outline'}
                            className={p === page ? 'shadow-sm' : ''}
                            onClick={() => onPageChange(p as number)}
                        >
                            {p}
                        </Button>
                    )
                ))}
                <Button
                    variant="outline"
                    size="icon-sm"
                    className="text-muted-foreground"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                >
                    <ChevronRight className="w-4 h-4"/>
                </Button>
            </div>
        </div>
    );
}
