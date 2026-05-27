import * as React from "react"
import {cva, type VariantProps} from "class-variance-authority"

import {cn} from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center whitespace-nowrap rounded-badge border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                success:
                    "border-transparent bg-success text-success-foreground hover:bg-success/80",
                warning:
                    "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
                info:
                    "border-transparent bg-info text-info-foreground hover:bg-info/80",
                outline: "text-foreground",
                "soft-success": "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
                "soft-warning": "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                "soft-danger": "border-transparent bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
                "soft-info": "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400",
                "soft-neutral": "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {
}

function Badge({className, variant, ...props}: BadgeProps) {
    return (
        <div className={cn(badgeVariants({variant}), className)} {...props} />
    )
}

export {Badge, badgeVariants}
