"use client"

import { type DateRangePreset, useDashboardFilter } from "@/hooks/dashboard/use-date-filter"
import { cn } from "@/lib/utils"

const PRESETS: { label: string; value: DateRangePreset }[] = [
    { label: "Today",      value: "today" },
    { label: "Yesterday",  value: "yesterday" },
    { label: "This Week",  value: "week" },
    { label: "This Month", value: "month" },
]

export default function DashboardFilter() {
    const { range, setRange } = useDashboardFilter()

    return (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/20 border border-border">
            {PRESETS.map((preset) => (
                <button
                    key={preset.value}
                    onClick={() => setRange(preset.value)}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap",
                        range === preset.value
                            ? "bg-card text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                    )}
                >
                    {preset.label}
                </button>
            ))}
        </div>
    )
}
