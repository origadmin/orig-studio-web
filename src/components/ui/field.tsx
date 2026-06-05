import * as React from "react"
import {cva, type VariantProps} from "class-variance-authority"

import {Label} from "@/components/ui/label"
import {Separator} from "@/components/ui/separator"
import {cn} from "@/lib/utils"

/**
 * Field — a form-field wrapper that bundles a label, control slot,
 * description, and error message. Mirrors the shadcn `Field` pattern.
 */
const fieldVariants = cva(
    "flex w-full gap-3 [&>[data-slot=field-label]]:flex-none",
    {
        variants: {
            orientation: {
                vertical: "flex-col [&>[data-slot=field-label]]:pb-1",
                horizontal:
                    "items-center [&>[data-slot=field-label]]:min-w-40 [&>[data-slot=field-label]]:pb-0",
                responsive:
                    "flex-col md:flex-row md:items-center md:[&>[data-slot=field-label]]:min-w-40 md:[&>[data-slot=field-label]]:pb-0",
            },
        },
        defaultVariants: {orientation: "vertical"},
    },
)

export interface FieldProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof fieldVariants> {
    label?: React.ReactNode
    description?: React.ReactNode
    error?: React.ReactNode
    required?: boolean
    htmlFor?: string
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
    ({className, orientation, label, description, error, required, htmlFor, children, ...props}, ref) => {
        return (
            <div ref={ref} className={cn(fieldVariants({orientation}), className)} {...props}>
                {label && (
                    <Label
                        data-slot="field-label"
                        htmlFor={htmlFor}
                        className="text-sm font-medium text-foreground"
                    >
                        {label}
                        {required && <span className="ml-0.5 text-destructive">*</span>}
                    </Label>
                )}
                <div className="flex flex-col gap-1.5 w-full">
                    {children}
                    {description && !error && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                    {error && <p className="text-xs font-medium text-destructive">{error}</p>}
                </div>
            </div>
        )
    },
)
Field.displayName = "Field"

const FieldGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div ref={ref} className={cn("flex flex-col gap-4", className)} {...props}/>
    ),
)
FieldGroup.displayName = "FieldGroup"

const FieldSeparator = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {label?: string}
>(({className, label, ...props}, ref) => (
    <div
        ref={ref}
        className={cn("relative my-2 flex items-center text-xs uppercase tracking-wider text-muted-foreground", className)}
        {...props}
    >
        <Separator className="flex-1"/>
        {label && <span className="px-2">{label}</span>}
        <Separator className="flex-1"/>
    </div>
))
FieldSeparator.displayName = "FieldSeparator"

export {Field, FieldGroup, FieldSeparator}
