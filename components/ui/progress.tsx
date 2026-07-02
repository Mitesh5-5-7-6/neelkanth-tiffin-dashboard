"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number
    max?: number
}

export function Progress({ className, value = 0, max = 100, ...props }: ProgressProps) {
    const safeValue = Math.min(Math.max(value, 0), max)
    const percentage = max > 0 ? (safeValue / max) * 100 : 0

    return (
        <div
            className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
            role="progressbar"
            aria-valuemax={max}
            aria-valuemin={0}
            aria-valuenow={safeValue}
            {...props}
        >
            <div className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: `translateX(-${100 - percentage}%)` }} />
        </div>
    )
}
