import { cn } from "@/lib/utils";
import React from "react";

interface SectionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    padded?: boolean;
}

export function SectionContainer({
    children,
    className,
    padded = false,
    ...props
}: SectionContainerProps) {
    return (
        <div
            className={cn(
                "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full",
                padded && "py-12 md:py-16 lg:py-24",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
