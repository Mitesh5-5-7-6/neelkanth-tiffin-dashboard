"use client"

import { useMemo } from "react"
import { TrendingUp } from "lucide-react"
import { useRevenueChart } from "@/hooks/useDashboard"
import { formatAxisDate, formatFullDate, axisTickInterval, formatCompactRupee, formatRupee } from "@/lib/dashboard-format"
import ChartSkeleton from "@/components/ui/skeletons/ChartSkeleton"
import EmptyState from "@/components/dashboard/EmptyState"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"

export default function RevenueExpenseChart() {
    const { data, isLoading, isError } = useRevenueChart()

    const points = useMemo(() => data ?? [], [data])
    const hasData = points.length > 0 && points.some((d) => d.revenue > 0 || d.expense > 0)

    if (isLoading) return <ChartSkeleton height={220} />

    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Revenue vs Expense</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Daily trend — selected period</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] inline-block" />Revenue
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] inline-block" />Expense
                    </span>
                </div>
            </div>

            {isError ? (
                <EmptyState
                    icon={<TrendingUp className="w-5 h-5" />}
                    title="Could not load chart"
                    description="Failed to fetch revenue data. It will retry automatically."
                    className="h-55"
                />
            ) : !hasData ? (
                <EmptyState
                    icon={<TrendingUp className="w-5 h-5" />}
                    title="No data for this period"
                    description="No revenue or expense entries found."
                    className="h-55"
                />
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fill-revenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#16A34A" stopOpacity={0.18} />
                                <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="fill-expense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#EA580C" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#EA580C" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis
                            dataKey="iso"
                            tickFormatter={(iso: string) => formatAxisDate(iso, points.length)}
                            interval={axisTickInterval(points.length)}
                            tick={{ fontSize: 12, fill: "#64748B" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: "#64748B" }}
                            axisLine={false}
                            tickLine={false}
                            width={52}
                            tickFormatter={formatCompactRupee}
                        />
                        <Tooltip
                            labelFormatter={(iso) => formatFullDate(String(iso))}
                            formatter={(v, name) => [formatRupee(Number(v ?? 0)), name]}
                            contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                            cursor={{ stroke: "#E2E8F0" }}
                        />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#16A34A" strokeWidth={2.5} fill="url(#fill-revenue)" dot={false} activeDot={{ r: 5 }} animationDuration={700} />
                        <Area type="monotone" dataKey="expense" name="Expense" stroke="#EA580C" strokeWidth={2.5} fill="url(#fill-expense)" dot={false} activeDot={{ r: 5 }} animationDuration={700} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
