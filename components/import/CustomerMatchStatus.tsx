"use client"

import { BadgeCheck, CircleSlash, TriangleAlert } from "lucide-react"
import type { ImportPreviewRow } from "@/types/import.type"

interface CustomerMatchStatusProps {
    row: ImportPreviewRow
}

export function CustomerMatchStatus({ row }: CustomerMatchStatusProps) {
    if (row.status === "matched") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                <BadgeCheck className="h-3.5 w-3.5" />
                Matched
            </span>
        )
    }

    if (row.status === "unmatched") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                <TriangleAlert className="h-3.5 w-3.5" />
                Unmatched
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/10 px-2 py-1 text-xs font-medium text-muted-foreground">
            <CircleSlash className="h-3.5 w-3.5" />
            {row.status}
        </span>
    )
}
