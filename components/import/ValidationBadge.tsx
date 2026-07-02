"use client"

import { AlertCircle, CheckCircle2 } from "lucide-react"

interface ValidationBadgeProps {
    issues: string[]
}

export function ValidationBadge({ issues }: ValidationBadgeProps) {
    if (!issues.length) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Valid
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
            <AlertCircle className="h-3.5 w-3.5" />
            {issues[0]}
        </span>
    )
}
