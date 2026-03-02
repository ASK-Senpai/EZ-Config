"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
    activeValues: string[];
    toggleValue: (val: string) => void;
    type: "single" | "multiple";
    collapsible: boolean;
}>({ activeValues: [], toggleValue: () => { }, type: "single", collapsible: false })

export function Accordion({ type = "single", collapsible = false, children, className }: any) {
    const [activeValues, setActiveValues] = React.useState<string[]>([])
    const toggleValue = (val: string) => {
        setActiveValues((prev) => {
            if (prev.includes(val)) {
                return type === "single" ? (collapsible ? [] : prev) : prev.filter((v) => v !== val)
            }
            return type === "single" ? [val] : [...prev, val]
        })
    }

    return (
        <AccordionContext.Provider value={{ activeValues, toggleValue, type, collapsible }}>
            <div className={cn("w-full", className)}>{children}</div>
        </AccordionContext.Provider>
    )
}

const ItemContext = React.createContext<{ value: string }>({ value: "" })

export function AccordionItem({ value, children, className }: any) {
    return (
        <ItemContext.Provider value={{ value }}>
            <div className={cn("border-b", className)}>{children}</div>
        </ItemContext.Provider>
    )
}

export function AccordionTrigger({ children, className }: any) {
    const { activeValues, toggleValue } = React.useContext(AccordionContext)
    const { value } = React.useContext(ItemContext)
    const isOpen = activeValues.includes(value)

    return (
        <button
            className={cn(
                "flex flex-1 w-full items-center justify-between py-4 font-medium transition-all hover:underline focus:outline-none text-left",
                className
            )}
            onClick={() => toggleValue(value)}
        >
            {children}
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
    )
}

export function AccordionContent({ children, className }: any) {
    const { activeValues } = React.useContext(AccordionContext)
    const { value } = React.useContext(ItemContext)
    const isOpen = activeValues.includes(value)

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                    <div className={cn("pb-4 pt-0", className)}>{children}</div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
