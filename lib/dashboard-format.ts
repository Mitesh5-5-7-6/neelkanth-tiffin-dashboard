/**
 * Client-safe formatting helpers for the dashboard charts.
 *
 * The time-series endpoints return an `iso` (YYYY-MM-DD) for every point. The
 * x-axis label should reflect the *date*, not a repeating weekday — so a short
 * range (a week) reads "Mon, Tue…" while a month reads "1, 5, 10…". The right
 * form depends on how many points are shown, which only the client knows.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function parts(iso: string): { y: number; m: number; d: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
    if (!match) return null
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

/** Weekday for an ISO date, computed in UTC to avoid timezone drift. */
function weekday(iso: string): string {
    const p = parts(iso)
    if (!p) return iso
    return WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]
}

/**
 * Adaptive axis tick. Short ranges show the weekday; longer ranges show the
 * day-of-month (with the month appended on the 1st for orientation).
 */
export function formatAxisDate(iso: string, totalPoints: number): string {
    const p = parts(iso)
    if (!p) return iso
    if (totalPoints <= 8) return weekday(iso)
    if (p.d === 1) return `${p.d} ${MONTHS[p.m - 1]}`
    return String(p.d)
}

/** Full, human date for tooltips: "01 Jun 2026". */
export function formatFullDate(iso: string): string {
    const p = parts(iso)
    if (!p) return iso
    return `${String(p.d).padStart(2, "0")} ${MONTHS[p.m - 1]} ${p.y}`
}

/** Spread ~10 ticks across the range so month views don't crowd the axis. */
export function axisTickInterval(totalPoints: number): number {
    if (totalPoints <= 12) return 0
    return Math.ceil(totalPoints / 10) - 1
}

/** Compact rupee label for axes: ₹1.2k, ₹15k, ₹1.1L. */
export function formatCompactRupee(value: number): string {
    if (Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`
    if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`
    return `₹${value}`
}

/** Full rupee, Indian grouping: ₹1,23,456. */
export function formatRupee(value: number): string {
    return `₹${Math.round(value).toLocaleString("en-IN")}`
}
