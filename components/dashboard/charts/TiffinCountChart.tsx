"use client"

import { useMemo } from "react"
import { BarChart3 } from "lucide-react"
import { useTiffinChart } from "@/hooks/useDashboard"
import { formatAxisDate, formatFullDate, axisTickInterval } from "@/lib/dashboard-format"
import ChartSkeleton from "@/components/ui/skeletons/ChartSkeleton"
import EmptyState from "@/components/dashboard/EmptyState"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"

export default function TiffinCountChart() {
    const { data, isLoading, isError } = useTiffinChart()

    const points = useMemo(() => data ?? [], [data])
    const hasData = points.length > 0 && points.some((d) => d.morning > 0 || d.evening > 0)

    if (isLoading) return <ChartSkeleton height={220} />

    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Tiffin Count</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Morning vs Evening — selected period</p>
                </div>
            </div>

            {isError ? (
                <EmptyState
                    icon={<BarChart3 className="w-5 h-5" />}
                    title="Could not load chart"
                    description="Failed to fetch tiffin data. It will retry automatically."
                    className="h-55"
                />
            ) : !hasData ? (
                <EmptyState
                    icon={<BarChart3 className="w-5 h-5" />}
                    title="No tiffin entries"
                    description="No entries recorded for the selected date range."
                    className="h-55"
                />
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={points} barCategoryGap="28%" barGap={4}>
                        <defs>
                            <linearGradient id="grad-morning" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366F1" />
                                <stop offset="100%" stopColor="#4F46E5" />
                            </linearGradient>
                            <linearGradient id="grad-evening" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#9333EA" />
                                <stop offset="100%" stopColor="#7C3AED" />
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
                        <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                        <Tooltip
                            labelFormatter={(iso) => formatFullDate(String(iso))}
                            contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                            cursor={{ fill: "rgba(79,70,229,0.04)" }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Bar dataKey="morning" name="Morning" fill="url(#grad-morning)" radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={600} />
                        <Bar dataKey="evening" name="Evening" fill="url(#grad-evening)" radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={600} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
