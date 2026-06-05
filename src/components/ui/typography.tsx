import * as React from "react"
import {cva, type VariantProps} from "class-variance-authority"

import {cn} from "@/lib/utils"

/**
 * Typography — utility wrappers for the design-system text scale.
 * Use these instead of raw `text-*` + `font-*` combinations.
 */
const typographyVariants = cva("", {
    variants: {
        variant: {
            h1: "scroll-m-20 text-3xl font-semibold tracking-tight text-slate-800",
            h2: "scroll-m-20 text-2xl font-semibold tracking-tight text-slate-800",
            h3: "scroll-m-20 text-xl font-semibold tracking-tight text-slate-800",
            h4: "scroll-m-20 text-lg font-semibold tracking-tight text-slate-800",
            p: "leading-7 text-slate-600 [&:not(:first-child)]:mt-4",
            blockquote:
                "mt-6 border-l-2 border-slate-200 pl-6 italic text-slate-600",
            code: "relative rounded bg-muted px-[0.4rem] py-[0.2rem] font-mono text-sm font-semibold",
            lead: "text-xl text-slate-600",
            large: "text-lg font-semibold text-slate-800",
            small: "text-sm font-medium leading-none text-slate-600",
            muted: "text-sm text-slate-500",
        },
    },
    defaultVariants: {variant: "p"},
})

export interface TypographyProps
    extends React.HTMLAttributes<HTMLElement>,
        VariantProps<typeof typographyVariants> {
    as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div" | "blockquote" | "code"
}

export function Typography({
    className,
    variant,
    as,
    ...props
}: TypographyProps) {
    const Comp = (as ?? (variant === "code"
        ? "code"
        : variant === "blockquote"
            ? "blockquote"
            : variant?.startsWith("h")
                ? variant
                : "p")) as React.ElementType
    return <Comp className={cn(typographyVariants({variant, className}))} {...props}/>
}

export {typographyVariants}
