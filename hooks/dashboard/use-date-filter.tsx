"use client"

import {
    createContext,
    useContext,
    useMemo,
    useCallback,
    type ReactNode,
} from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

export type DateRangePreset = "today" | "yesterday" | "week" | "month" | "custom"

export interface DateFilterState {
    range: DateRangePreset
    from: string    // YYYY-MM-DD (UTC)
    to: string      // YYYY-MM-DD (UTC)
    label: string
    setRange: (preset: DateRangePreset, customFrom?: string, customTo?: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function utcISODate(offsetDays = 0): string {
    const d = new Date()
    const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDays))
    return shifted.toISOString().split("T")[0]
}

function computeRange(
    preset: DateRangePreset,
    customFrom: string,
    customTo: string
): { from: string; to: string; label: string } {
    const today = utcISODate(0)
    switch (preset) {
        case "yesterday":
            return { from: utcISODate(-1), to: utcISODate(-1), label: "Yesterday" }
        case "week":
            return { from: utcISODate(-6), to: today, label: "This Week" }
        case "month": {
            const d = new Date()
            const iso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
                .toISOString()
                .split("T")[0]
            return { from: iso, to: today, label: "This Month" }
        }
        case "custom":
            return customFrom && customTo
                ? { from: customFrom, to: customTo, label: `${customFrom} – ${customTo}` }
                : { from: today, to: today, label: "Today" }
        default:
            return { from: today, to: today, label: "Today" }
    }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DashboardFilterContext = createContext<DateFilterState>({
    range: "today",
    from: utcISODate(0),
    to: utcISODate(0),
    label: "Today",
    setRange: () => {},
})

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams()
    const router       = useRouter()
    const pathname     = usePathname()

    const range      = (searchParams.get("range") ?? "today") as DateRangePreset
    const customFrom = searchParams.get("from") ?? ""
    const customTo   = searchParams.get("to")   ?? ""

    const { from, to, label } = useMemo(
        () => computeRange(range, customFrom, customTo),
        [range, customFrom, customTo]
    )

    const setRange = useCallback(
        (preset: DateRangePreset, cf?: string, ct?: string) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set("range", preset)
            if (preset === "custom" && cf && ct) {
                params.set("from", cf)
                params.set("to", ct)
            } else {
                params.delete("from")
                params.delete("to")
            }
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        },
        [pathname, router, searchParams]
    )

    const value = useMemo(
        () => ({ range, from, to, label, setRange }),
        [range, from, to, label, setRange]
    )

    return (
        <DashboardFilterContext.Provider value={value}>
            {children}
        </DashboardFilterContext.Provider>
    )
}

export function useDashboardFilter(): DateFilterState {
    return useContext(DashboardFilterContext)
}
