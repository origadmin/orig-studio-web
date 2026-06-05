import * as React from "react"
import {Slot} from "@radix-ui/react-slot"
import {cva, type VariantProps} from "class-variance-authority"

import {cn} from "@/lib/utils"

/**
 * ButtonGroup — visually groups adjacent buttons.
 * Renders the shadcn-stitched group with a single border radius on the ends
 * and connected inner borders (per Stitch design system).
 */
const buttonGroupVariants = cva(
    "inline-flex items-center justify-center [&>*]:rounded-none [&>*]:shadow-none first:[&>*]:rounded-l-lg last:[&>*]:rounded-r-lg [&>[data-orientation=icon]]:first:ml-0",
    {
        variants: {
            orientation: {
                horizontal: "flex-row",
                vertical: "flex-col [&>*]:rounded-none first:[&>*]:rounded-t-lg first:[&>*]:rounded-l-none last:[&>*]:rounded-b-lg last:[&>*]:rounded-r-none",
            },
        },
        defaultVariants: {orientation: "horizontal"},
    },
)

const ButtonGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> &
        VariantProps<typeof buttonGroupVariants>
>(({className, orientation, ...props}, ref) => {
    return (
        <div
            ref={ref}
            role="group"
            className={cn(buttonGroupVariants({orientation}), className)}
            {...props}
        />
    )
})
ButtonGroup.displayName = "ButtonGroup"

export {ButtonGroup, buttonGroupVariants}
