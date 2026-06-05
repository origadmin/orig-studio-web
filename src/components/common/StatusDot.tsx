import {cn} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";

/**
 * Status dot status type
 */
export type StatusDotStatus = "success" | "processing" | "pending" | "failed";

/**
 * StatusDot component props
 * Used for encoding status and similar state indicators.
 *
 * Renders the design-system status pill pattern: soft-50 background with a
 * colored dot and matching 700-level text (per
 * projects/orig-cms-ee/_docs/stitch_orig_studio_design_system).
 */
export interface StatusDotProps {
    /** Status value */
    status: StatusDotStatus;
    /** Custom display label (overrides default mapping) */
    label?: string;
    /** Additional CSS class name */
    className?: string;
}

const STATUS_DOT_MAP: Record<
    StatusDotStatus,
    {
        dotClass: string;
        badgeVariant:
            | "soft-success"
            | "soft-info"
            | "soft-warning"
            | "soft-danger";
        defaultLabel: string;
        ariaLabel: string;
    }
> = {
    success: {
        dotClass: "bg-emerald-500",
        badgeVariant: "soft-success",
        defaultLabel: "Published",
        ariaLabel: "Status: success",
    },
    processing: {
        dotClass: "bg-sky-500 animate-pulse",
        badgeVariant: "soft-info",
        defaultLabel: "Processing",
        ariaLabel: "Status: processing",
    },
    pending: {
        dotClass: "bg-amber-500",
        badgeVariant: "soft-warning",
        defaultLabel: "Pending",
        ariaLabel: "Status: pending",
    },
    failed: {
        dotClass: "bg-red-500",
        badgeVariant: "soft-danger",
        defaultLabel: "Failed",
        ariaLabel: "Status: failed",
    },
};

export function StatusDot({status, label, className}: StatusDotProps) {
    const config = STATUS_DOT_MAP[status];
    const displayLabel = label || config.defaultLabel;

    return (
        <Badge
            variant={config.badgeVariant}
            className={cn("gap-1.5", className)}
            role="status"
            aria-label={config.ariaLabel}
        >
            <span
                className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotClass)}
                aria-hidden="true"
            />
            <span>{displayLabel}</span>
        </Badge>
    );
}
