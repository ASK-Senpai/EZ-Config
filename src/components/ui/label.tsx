"use client"

import * as React from "react"
// Removing Radix Label dependency for simplicity unless needed, 
// strictly speaking Shadcn uses Radix Label but I can mock it with a simple label 
// to avoid "module not found" if I forgot to install it.
import { cn } from "@/lib/utils"

const Label = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            className
        )}
        {...props}
    />
))
Label.displayName = "Label"

export { Label }
