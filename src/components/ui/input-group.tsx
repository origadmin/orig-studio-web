import * as React from "react"
import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"

/**
 * InputGroup — append/prepend slot pattern for inputs.
 * Use `<InputGroup>` to compose buttons, icons, or text labels
 * at either end of an input.
 */
const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div
            ref={ref}
            className={cn(
                "group/input-group relative flex w-full items-center rounded-md border border-input bg-background shadow-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
                className,
            )}
            {...props}
        />
    ),
)
InputGroup.displayName = "InputGroup"

const InputGroupInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({className, type, ...props}, ref) => (
        <Input
            ref={ref}
            type={type}
            className={cn(
                "flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                className,
            )}
            {...props}
        />
    ),
)
InputGroupInput.displayName = "InputGroupInput"

const InputGroupTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({className, ...props}, ref) => (
    <Textarea
        ref={ref}
        className={cn(
            "flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
            className,
        )}
        {...props}
    />
))
InputGroupTextarea.displayName = "InputGroupTextarea"

const InputGroupAddon = ({
    align = "inline-start",
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {align?: "inline-start" | "inline-end" | "block-start" | "block-end"}) => {
    const sideClasses =
        align === "inline-start" || align === "inline-end" ? "flex-row" : "flex-col"
    const paddingClasses =
        align === "inline-start"
            ? "pl-2.5"
            : align === "inline-end"
                ? "pr-2.5"
                : align === "block-start"
                    ? "pt-2.5"
                    : "pb-2.5"

    return (
        <div
            className={cn("flex items-center text-muted-foreground", sideClasses, paddingClasses, className)}
            {...props}
        />
    )
}
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupButton = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<typeof Button> & {size?: "sm" | "default" | "lg" | "icon"}
>(({className, type = "button", variant = "ghost", size = "sm", ...props}, ref) => (
    <Button
        ref={ref}
        type={type}
        variant={variant}
        size={size}
        className={cn("rounded-md", className)}
        {...props}
    />
))
InputGroupButton.displayName = "InputGroupButton"

const InputGroupText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({className, ...props}, ref) => (
        <span ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props}/>
    ),
)
InputGroupText.displayName = "InputGroupText"

export {
    InputGroup,
    InputGroupInput,
    InputGroupTextarea,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
}
