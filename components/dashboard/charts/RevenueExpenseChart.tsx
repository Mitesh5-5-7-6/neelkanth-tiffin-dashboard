"use client"

import { TrendingUp } from "lucide-react"
import { useRevenueChart } from "@/hooks/useDashboard"
import ChartSkeleton from "@/components/ui/skeletons/ChartSkeleton"
import EmptyState from "@/components/dashboard/EmptyState"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"

export default function RevenueExpenseChart() {
    const { data, isLoading, isError } = useRevenueChart()

    if (isLoading) return <ChartSkeleton height={220} />

    const hasData = data && data.length > 0 && data.some((d) => d.revenue > 0 || d.expense > 0)

    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Revenue vs Expense</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Daily trend</p>
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
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`} />
                        <Tooltip
                            formatter={(v) => [`₹${Number(v || 0).toLocaleString("en-IN")}`, ""]}
                            contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                            cursor={{ stroke: "#E2E8F0" }}
                        />
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 4, fill: "#16A34A", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="expense" name="Expense" stroke="#EA580C" strokeWidth={2.5} dot={{ r: 4, fill: "#EA580C", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
