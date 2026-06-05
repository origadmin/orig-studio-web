import * as React from "react"
import {cn} from "@/lib/utils"

/**
 * Kbd — keyboard shortcut hint glyph.
 * Renders a small monospaced pill in the design-system muted style.
 */
const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({className, ...props}, ref) => (
        <kbd
            ref={ref}
            className={cn(
                "inline-flex h-5 min-w-[1.25rem] select-none items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-1.5 font-mono text-[0.65rem] font-medium text-slate-600 shadow-sm",
                className,
            )}
            {...props}
        />
    ),
)
Kbd.displayName = "Kbd"

const KbdGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div ref={ref} className={cn("inline-flex items-center gap-1", className)} {...props}/>
    ),
)
KbdGroup.displayName = "KbdGroup"

export {Kbd, KbdGroup}
