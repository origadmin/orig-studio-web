import * as React from "react"
import {Slot} from "@radix-ui/react-slot"
import {cva, type VariantProps} from "class-variance-authority"
import {cn} from "@/lib/utils"

/**
 * Item — Stitch-aligned list row primitive.
 * Wraps content with a leading icon/avatar slot, title/description block,
 * and a trailing actions slot. Used in list cards, table rows, and so on.
 */
const itemVariants = cva(
    "flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground transition-colors hover:bg-accent",
    {
        variants: {
            variant: {
                default: "border-border",
                outline: "border-dashed",
                ghost: "border-transparent bg-transparent shadow-none",
            },
            size: {
                sm: "p-2",
                default: "p-3",
                lg: "p-4",
            },
        },
        defaultVariants: {variant: "default", size: "default"},
    },
)

export interface ItemProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof itemVariants> {
    asChild?: boolean
}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
    ({className, variant, size, asChild, ...props}, ref) => {
        const Comp = asChild ? Slot : "div"
        return <Comp ref={ref} className={cn(itemVariants({variant, size, className}))} {...props}/>
    },
)
Item.displayName = "Item"

const ItemMedia = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div
            ref={ref}
            className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
                className,
            )}
            {...props}
        />
    ),
)
ItemMedia.displayName = "ItemMedia"

const ItemContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div ref={ref} className={cn("flex-1 min-w-0 flex flex-col gap-0.5", className)} {...props}/>
    ),
)
ItemContent.displayName = "ItemContent"

const ItemTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({className, ...props}, ref) => (
        <h4 ref={ref} className={cn("text-sm font-medium leading-tight text-foreground", className)} {...props}/>
    ),
)
ItemTitle.displayName = "ItemTitle"

const ItemDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({className, ...props}, ref) => (
        <p ref={ref} className={cn("text-xs text-muted-foreground line-clamp-2", className)} {...props}/>
    ),
)
ItemDescription.displayName = "ItemDescription"

const ItemActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div ref={ref} className={cn("flex items-center gap-1", className)} {...props}/>
    ),
)
ItemActions.displayName = "ItemActions"

const ItemSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div ref={ref} className={cn("h-px w-full bg-border", className)} {...props}/>
    ),
)
ItemSeparator.displayName = "ItemSeparator"

const ItemHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div ref={ref} className={cn("flex w-full items-center justify-between gap-2 pb-1", className)} {...props}/>
    ),
)
ItemHeader.displayName = "ItemHeader"

const ItemFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div ref={ref} className={cn("flex w-full items-center justify-between gap-2 pt-1", className)} {...props}/>
    ),
)
ItemFooter.displayName = "ItemFooter"

export {
    Item,
    ItemMedia,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemActions,
    ItemSeparator,
    ItemHeader,
    ItemFooter,
}