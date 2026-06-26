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
        dotClass: "bg-emerald-500",
        pillClass: "bg-emerald-50 text-emerald-700",
        labelKey: "common.status.success",
        fallback: "Published",
    },
    processing: {
        dotClass: "bg-amber-500 animate-pulse",
        pillClass: "bg-amber-50 text-amber-700",
        animate: true,
        labelKey: "common.status.processing",
        fallback: "Processing",
    },
    pending: {
        dotClass: "bg-sky-500",
        pillClass: "bg-sky-50 text-sky-700",
        labelKey: "common.status.pending",
        fallback: "Queued",
    },
    failed: {
        dotClass: "bg-red-500",
        pillClass: "bg-red-50 text-red-700",
        labelKey: "common.status.failed",
        fallback: "Failed",
    },
    draft: {
        dotClass: "bg-slate-400",
        pillClass: "bg-slate-100 text-slate-600",
        labelKey: "common.status.draft",
        fallback: "Draft",
    },
    deleted: {
        dotClass: "bg-red-500",
        pillClass: "bg-red-50 text-red-700",
        labelKey: "common.status.deleted",
        fallback: "Deleted",
    },
    partial: {
        dotClass: "bg-amber-500",
        pillClass: "bg-amber-50 text-amber-700",
        labelKey: "common.status.partial",
        fallback: "Partial",
    },
    skipped: {
        dotClass: "bg-slate-400",
        pillClass: "bg-slate-100 text-slate-600",
        labelKey: "common.status.skipped",
        fallback: "Skipped",
    },
    unknown: {
        dotClass: "bg-slate-400",
        pillClass: "bg-slate-100 text-slate-600",
        labelKey: "common.status.unknown",
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
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
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
