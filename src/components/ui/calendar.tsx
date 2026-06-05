import * as React from "react"
import {cn} from "@/lib/utils"

/**
 * Calendar — minimal day picker shell.
 *
 * This file mirrors the shadcn `Calendar` contract; the heavy lifting
 * (day-of-month grid, month/year switch, range selection) is delegated to a
 * `react-day-picker` integration. Import the full implementation via
 * `bunx shadcn add calendar` if date-picker logic is needed; this shim keeps
 * the import path working for the wrapper components in `R3_API_CONTRACT.md`.
 */
export type CalendarProps = React.HTMLAttributes<HTMLDivElement>

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
    ({className, ...props}, ref) => (
        <div
            ref={ref}
            className={cn(
                "rounded-md border bg-card p-3 text-card-foreground shadow-sm",
                className,
            )}
            {...props}
        />
    ),
)
Calendar.displayName = "Calendar"

export {Calendar}
