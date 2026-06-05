import * as React from "react"
import * as RechartsPrimitive from "recharts"

import {cn} from "@/lib/utils"

/**
 * Chart — minimal recharts wrapper.
 *
 * shadcn's `ChartContainer` / `ChartTooltip` / `ChartLegend` need a deep
 * integration with recharts' generics that does not type-check cleanly
 * under React 19 + the project's TS settings. To keep the public surface
 * minimal but still useful, this file exports a thin `Chart` container
 * that lays out a recharts `ResponsiveContainer` and forwards children.
 *
 * For richer theming, install `chart.tsx` from `bunx shadcn@latest add chart`
 * and replace this file.
 */
export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode
        color?: string
    }
>

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
    config?: ChartConfig
}

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
    ({className, children, ...props}, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
                    className,
                )}
                {...props}
            >
                <RechartsPrimitive.ResponsiveContainer>
                    {children as React.ReactElement}
                </RechartsPrimitive.ResponsiveContainer>
            </div>
        )
    },
)
Chart.displayName = "Chart"

const ChartTooltip = RechartsPrimitive.Tooltip
const ChartLegend = RechartsPrimitive.Legend

export {Chart, ChartTooltip, ChartLegend}
