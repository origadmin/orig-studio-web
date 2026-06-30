import * as React from "react"
import {cn} from "@/lib/utils"

/**
 * NativeSelect — a styled wrapper around the platform `<select>`.
 * Use this instead of `Combobox` when search-then-pick is overkill.
 */
const NativeSelect = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement>
>(({className, children, ...props}, ref) => {
    return (
        <select
            ref={ref}
            className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        >
            {children}
        </select>
    )
})
NativeSelect.displayName = "NativeSelect"

const NativeSelectOption = React.forwardRef<
    HTMLOptionElement,
    React.OptionHTMLAttributes<HTMLOptionElement>
>((props, ref) => <option ref={ref} {...props}/>)
NativeSelectOption.displayName = "NativeSelectOption"

const NativeSelectOptGroup = React.forwardRef<
    HTMLOptGroupElement,
    React.OptgroupHTMLAttributes<HTMLOptGroupElement>
>((props, ref) => <optgroup ref={ref} {...props}/>)
NativeSelectOptGroup.displayName = "NativeSelectOptGroup"

export {NativeSelect, NativeSelectOption, NativeSelectOptGroup}
