import {cn} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";
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

const STATUS_DOT_CONFIG: Record<
    StatusDotStatus,
    {
        dotClass: string;
        badgeVariant:
            | "soft-success"
            | "soft-info"
            | "soft-warning"
            | "soft-danger"
            | "soft-neutral";
        labelKey: string;
        ariaLabelKey: string;
    }
> = {
    success: {
        dotClass: "bg-emerald-500",
        badgeVariant: "soft-success",
        labelKey: "common.status.success",
        ariaLabelKey: "common.status.success",
    },
    processing: {
        dotClass: "bg-amber-500 animate-pulse",
        badgeVariant: "soft-warning",
        labelKey: "common.status.processing",
        ariaLabelKey: "common.status.processing",
    },
    pending: {
        dotClass: "bg-sky-400",
        badgeVariant: "soft-info",
        labelKey: "common.status.pending",
        ariaLabelKey: "common.status.pending",
    },
    failed: {
        dotClass: "bg-red-500",
        badgeVariant: "soft-danger",
        labelKey: "common.status.failed",
        ariaLabelKey: "common.status.failed",
    },
    draft: {
        dotClass: "bg-slate-400",
        badgeVariant: "soft-neutral",
        labelKey: "common.status.draft",
        ariaLabelKey: "common.status.draft",
    },
    deleted: {
        dotClass: "bg-red-500",
        badgeVariant: "soft-danger",
        labelKey: "common.status.deleted",
        ariaLabelKey: "common.status.deleted",
    },
    partial: {
        dotClass: "bg-amber-500",
        badgeVariant: "soft-warning",
        labelKey: "common.status.partial",
        ariaLabelKey: "common.status.partial",
    },
    skipped: {
        dotClass: "bg-slate-400",
        badgeVariant: "soft-neutral",
        labelKey: "common.status.skipped",
        ariaLabelKey: "common.status.skipped",
    },
    unknown: {
        dotClass: "bg-slate-400",
        badgeVariant: "soft-neutral",
        labelKey: "common.status.unknown",
        ariaLabelKey: "common.status.unknown",
    },
};

const STATUS_FALLBACKS: Record<StatusDotStatus, {label: string; aria: string}> = {
    success: {label: "Published", aria: "Status: success"},
    processing: {label: "Processing", aria: "Status: processing"},
    pending: {label: "Queued", aria: "Status: pending"},
    failed: {label: "Failed", aria: "Status: failed"},
    draft: {label: "Draft", aria: "Status: draft"},
    deleted: {label: "Deleted", aria: "Status: deleted"},
    partial: {label: "Partial", aria: "Status: partial"},
    skipped: {label: "Skipped", aria: "Status: skipped"},
    unknown: {label: "Unknown", aria: "Status: unknown"},
};

export function StatusDot({status, label, className}: StatusDotProps) {
    const {t} = useTranslation();
    const config = STATUS_DOT_CONFIG[status] || STATUS_DOT_CONFIG.unknown;
    const fallback = STATUS_FALLBACKS[status] || STATUS_FALLBACKS.unknown;
    const displayLabel = label || t(config.labelKey, fallback.label);
    const ariaLabel = t(config.ariaLabelKey, fallback.aria);

    return (
        <Badge
            variant={config.badgeVariant}
            className={cn("gap-1.5", className)}
            role="status"
            aria-label={ariaLabel}
        >
            <span
                className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotClass)}
                aria-hidden="true"
            />
            <span>{displayLabel}</span>
        </Badge>
    );
}
