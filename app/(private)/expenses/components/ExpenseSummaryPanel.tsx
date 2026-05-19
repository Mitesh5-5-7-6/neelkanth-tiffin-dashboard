"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { CATEGORY_META } from "@/types/expense.type"
import type { ExpenseStats, CategoryBreakdown, PaymentMethodBreakdown } from "@/types/expense.type"
import { format } from "date-fns"

interface ExpenseSummaryPanelProps {
    stats?: ExpenseStats
    isLoading: boolean
}

// ─── SVG Donut chart ─────────────────────────────────────────────────────────

interface DonutSegment {
    color: string
    value: number
}

function DonutChart({
    segments,
    centerLabel,
    centerValue,
    size = 140,
}: {
    segments: DonutSegment[]
    centerLabel: string
    centerValue: string
    size?: number
}) {
    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.34
    const strokeWidth = size * 0.16
    const circumference = 2 * Math.PI * radius

    const total = segments.reduce((s, d) => s + d.value, 0)

    let cumulativeArc = 0

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background ring */}
            <circle
                cx={cx} cy={cy} r={radius}
                fill="none" stroke="#e5e7eb"
                strokeWidth={strokeWidth}
            />
            {total > 0 && segments.map((seg, i) => {
                const arc    = (seg.value / total) * circumference
                const offset = -(cumulativeArc)
                cumulativeArc += arc

                return (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${arc} ${circumference}`}
                        strokeDashoffset={offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        strokeLinecap="butt"
                    />
                )
            })}
            {/* Center text */}
            <text
                x={cx} y={cy - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
                fontFamily="inherit"
            >
                {centerLabel}
            </text>
            <text
                x={cx} y={cy + 8}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#111827"
                fontFamily="inherit"
            >
                {centerValue}
            </text>
        </svg>
    )
}

// ─── Payment method labels ────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
    cash:          'Cash',
    upi:           'UPI',
    bank_transfer: 'Bank Transfer',
    cheque:        'Cheque',
    credit:        'Credit',
}

const PAYMENT_COLORS: Record<string, string> = {
    cash:          '#22c55e',
    upi:           '#3b82f6',
    bank_transfer: '#8b5cf6',
    cheque:        '#f59e0b',
    credit:        '#ef4444',
}

function formatInr(v: number) {
    return `₹${v.toLocaleString("en-IN")}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpenseSummaryPanel({ stats, isLoading }: ExpenseSummaryPanelProps) {
    const totalExpense = stats?.total_expense ?? 0

    const categorySegments = (stats?.category_breakdown ?? []).map((c: CategoryBreakdown) => ({
        color: CATEGORY_META[c.category]?.color ?? '#9ca3af',
        value: c.amount,
    }))

    const paymentSegments = (stats?.payment_method_breakdown ?? []).map((p: PaymentMethodBreakdown) => ({
        color: PAYMENT_COLORS[p.method] ?? '#9ca3af',
        value: p.amount,
    }))

    return (
        <aside className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col gap-0">

            {/* ── Expense Summary ──────────────────────────────────────── */}
            <section className="p-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground mb-3">Expense Summary</p>

                {isLoading ? (
                    <Skeleton className="h-36 w-full rounded-xl" />
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <DonutChart
                            segments={categorySegments}
                            centerLabel="Total"
                            centerValue={formatInr(totalExpense)}
                        />
                        {/* Legend */}
                        <div className="w-full space-y-1">
                            {(stats?.category_breakdown ?? []).slice(0, 6).map((c) => {
                                const meta = CATEGORY_META[c.category]
                                return (
                                    <div key={c.category} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: meta?.color ?? '#9ca3af' }}
                                            />
                                            <span className="text-muted truncate">{meta?.label ?? c.category}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            <span className="font-medium text-foreground">{formatInr(c.amount)}</span>
                                            <span className="text-muted w-10 text-right">({c.percentage}%)</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </section>

            {/* ── Category Breakdown ───────────────────────────────────── */}
            <section className="p-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground mb-3">Category Breakdown</p>

                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-muted border-b border-border/50">
                                <th className="text-left pb-1.5 font-medium">Category</th>
                                <th className="text-right pb-1.5 font-medium">Amount</th>
                                <th className="text-right pb-1.5 font-medium">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats?.category_breakdown ?? []).map((c) => (
                                <tr key={c.category} className="border-b border-border/30">
                                    <td className="py-1.5 text-foreground">
                                        {CATEGORY_META[c.category]?.label ?? c.category}
                                    </td>
                                    <td className="py-1.5 text-right font-medium text-foreground">
                                        {formatInr(c.amount)}
                                    </td>
                                    <td className="py-1.5 text-right text-muted">
                                        {c.percentage}%
                                    </td>
                                </tr>
                            ))}
                            {(stats?.category_breakdown ?? []).length > 0 && (
                                <tr className="font-semibold">
                                    <td className="pt-2 text-foreground">Total</td>
                                    <td className="pt-2 text-right text-foreground">{formatInr(totalExpense)}</td>
                                    <td className="pt-2 text-right text-foreground">100%</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </section>

            {/* ── Recent Expenses ──────────────────────────────────────── */}
            <section className="p-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground mb-3">Recent Expenses</p>

                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                ) : (stats?.recent_expenses ?? []).length === 0 ? (
                    <p className="text-xs text-muted text-center py-4">No recent expenses</p>
                ) : (
                    <div className="space-y-2.5">
                        {(stats?.recent_expenses ?? []).map((e) => (
                            <div key={e._id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">{e.title}</p>
                                    <p className="text-xs text-muted">
                                        {format(new Date(e.expense_date), "dd MMM yyyy")}
                                        {" · "}
                                        {([] as string[]).concat(e.expense_category as string | string[]).map((c) => CATEGORY_META[c as keyof typeof CATEGORY_META]?.label ?? c).join(", ")}
                                    </p>
                                </div>
                                <span className="text-xs font-semibold text-danger shrink-0">
                                    {formatInr(e.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Payment Method Summary ───────────────────────────────── */}
            <section className="p-4">
                <p className="text-sm font-semibold text-foreground mb-3">Payment Method Summary</p>

                {isLoading ? (
                    <Skeleton className="h-32 w-full rounded-xl" />
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <DonutChart
                            segments={paymentSegments}
                            centerLabel="Total"
                            centerValue={formatInr(totalExpense)}
                            size={120}
                        />
                        <div className="w-full space-y-1">
                            {(stats?.payment_method_breakdown ?? []).map((p) => (
                                <div key={p.method} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: PAYMENT_COLORS[p.method] ?? '#9ca3af' }}
                                        />
                                        <span className="text-muted">
                                            {PAYMENT_LABELS[p.method] ?? p.method}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">{formatInr(p.amount)}</span>
                                        <span className="text-muted">({p.percentage}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </aside>
    )
}
