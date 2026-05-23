import type { NextRequest } from "next/server"

export interface ParsedRange {
    start: Date
    end: Date
    prevStart: Date
    prevEnd: Date
}

function parseISO(iso: string): Date {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

/**
 * Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD from an API request.
 * Defaults to UTC-today when params are absent.
 * prevStart/prevEnd represent the previous equal-length window for comparisons.
 */
export function parseRequestRange(request: NextRequest): ParsedRange {
    const fromStr = request.nextUrl.searchParams.get("from")
    const toStr   = request.nextUrl.searchParams.get("to")

    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000)

    const start = fromStr ? parseISO(fromStr) : todayStart
    // end is exclusive: the day after `to`
    const end   = toStr   ? new Date(parseISO(toStr).getTime() + 86_400_000) : todayEnd

    const duration = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - duration)
    const prevEnd   = start   // exclusive boundary

    return { start, end, prevStart, prevEnd }
}

/** Percentage change helper — returns 0 when both are zero */
export function pctChange(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 1000) / 10
}

/** Day-of-week label array (Sun=0) */
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
