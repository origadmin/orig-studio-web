import {cn} from "@/lib/utils";
import {useTranslation} from "react-i18next";

export type StatusDotStatus =
    | "success"
    | "processing"
    | "pending"
    | "failed"
    | "draft"
    | "deleted"
    | "partial"
    | "skipped"
    | "unknown";

export interface StatusDotProps {
    status: StatusDotStatus;
    label?: string;
    className?: string;
}

const STATUS_CONFIG: Record<
    StatusDotStatus,
    {
        dotClass: string;
        pillClass: string;
        animate?: boolean;
        labelKey: string;
        fallback: string;
    }
> = {
    success: {
        dotClass: "bg-success",
        pillClass: "bg-success/10 text-success",
        labelKey: "common.status.success",
        fallback: "Published",
    },
    processing: {
        dotClass: "bg-primary animate-pulse",
        pillClass: "bg-primary/10 text-primary",
        animate: true,
        labelKey: "common.status.processing",
        fallback: "Processing",
    },
    pending: {
        dotClass: "bg-warning",
        pillClass: "bg-warning/10 text-warning",
        labelKey: "common.status.pending",
        fallback: "Queued",
    },
    failed: {
        dotClass: "bg-destructive",
        pillClass: "bg-destructive/10 text-destructive",
        labelKey: "common.status.failed",
        fallback: "Failed",
    },
    draft: {
        dotClass: "bg-muted-foreground",
        pillClass: "bg-muted text-muted-foreground",
        labelKey: "common.status.draft",
        fallback: "Draft",
    },
    deleted: {
        dotClass: "bg-destructive",
        pillClass: "bg-destructive/10 text-destructive",
        labelKey: "common.status.deleted",
        fallback: "Deleted",
    },
    partial: {
        dotClass: "bg-warning",
        pillClass: "bg-warning/10 text-warning",
        labelKey: "common.status.partial",
        fallback: "Partial",
    },
    skipped: {
        dotClass: "bg-muted-foreground",
        pillClass: "bg-muted text-muted-foreground",
        labelKey: "common.status.skipped",
        fallback: "Skipped",
    },
    unknown: {
        dotClass: "bg-muted-foreground",
        pillClass: "bg-muted text-muted-foreground",
        labelKey: "common.unknown",
        fallback: "Unknown",
    },
};

export function StatusDot({status, label, className}: StatusDotProps) {
    const {t} = useTranslation();
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
    const displayLabel = label || t(config.labelKey, config.fallback);

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0",
                config.pillClass,
                className
            )}
            role="status"
        >
            <span
                className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotClass)}
                aria-hidden="true"
            />
            <span>{displayLabel}</span>
        </span>
    );
}
