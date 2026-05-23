"use client"

import { BarChart3 } from "lucide-react"
import { useTiffinChart } from "@/hooks/useDashboard"
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

    if (isLoading) return <ChartSkeleton height={220} />

    const hasData = data && data.length > 0 && data.some((d) => d.morning > 0 || d.evening > 0)

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
                    <BarChart data={data} barSize={14} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} width={32} />
                        <Tooltip
                            contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                            cursor={{ fill: "rgba(79,70,229,0.04)" }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Bar dataKey="morning" name="Morning" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="evening" name="Evening" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
