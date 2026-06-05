import {Button} from "@/components/ui/button";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {PAGINATION_CONFIG} from "@/config/pagination";
import {cn} from "@/lib/utils";

/**
 * TablePagination — pagination footer for tabular lists.
 *
 * Wraps a shadcn Pagination primitive when one is available; falls back to a
 * simple two-button control set so the file compiles before the
 * `pagination` shadcn component is added (see `_docs/must.txt`).
 */
interface TablePaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
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

    return (
        <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <span className="tabular-nums">
                    Page {page} of {totalPages} · {total} total
                </span>
                {onPageSizeChange && (
                    <select
                        className={cn(
                            "h-7 rounded-md border border-input bg-background px-2 text-xs",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        )}
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    >
                        {PAGINATION_CONFIG.PAGE_SIZE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt} / page
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4 mr-1"/>
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Next page"
                >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1"/>
                </Button>
            </div>
        </div>
    );
}
