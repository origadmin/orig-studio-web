"use client"

import {Toaster as Sonner} from "sonner"

import {cn} from "@/lib/utils"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({className, ...props}: ToasterProps) => {
    return (
        <Sonner
            className={cn("toaster group", className)}
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    success:
                        "group-[.toast]:bg-success/10 group-[.toast]:text-success group-[.toast]:border-success/30",
                    error:
                        "group-[.toast]:bg-destructive/10 group-[.toast]:text-destructive group-[.toast]:border-destructive/30",
                    warning:
                        "group-[.toast]:bg-warning/10 group-[.toast]:text-warning group-[.toast]:border-warning/30",
                    info: "group-[.toast]:bg-info/10 group-[.toast]:text-info group-[.toast]:border-info/30",
                },
            }}
            {...props}
        />
    )
}

export {Toaster}
