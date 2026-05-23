"use client"

import { PieChart as PieIcon } from "lucide-react"
import { useExpenseChart } from "@/hooks/useDashboard"
import ChartSkeleton from "@/components/ui/skeletons/ChartSkeleton"
import EmptyState from "@/components/dashboard/EmptyState"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

export default function ExpenseCategoryChart() {
    const { data, isLoading, isError } = useExpenseChart()
    const total = data?.reduce((s, d) => s + d.amount, 0) ?? 0

    if (isLoading) return <ChartSkeleton height={220} />

    const hasData = data && data.length > 0

    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div>
                <h3 className="text-sm font-semibold text-foreground">Expense by Category</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Current period breakdown</p>
            </div>

            {isError ? (
                <EmptyState
                    icon={<PieIcon className="w-5 h-5" />}
                    title="Could not load chart"
                    description="Failed to fetch expense data."
                    className="h-55"
                />
            ) : !hasData ? (
                <EmptyState
                    icon={<PieIcon className="w-5 h-5" />}
                    title="No expenses"
                    description="No expense entries found for this period."
                    className="h-55"
                />
            ) : (
                <div className="flex items-center gap-4">
                    <div className="shrink-0 w-35 h-35">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={42} outerRadius={62} strokeWidth={2} stroke="#fff">
                                    {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip
                                    formatter={(v) => [`₹${Number(v || 0).toLocaleString("en-IN")}`, ""]}
                                    contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                                />
                                {total > 0 && (
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                        <tspan x="50%" dy="-8" fontSize={10} fill="#64748B">Total</tspan>
                                        <tspan x="50%" dy="18" fontSize={14} fontWeight={700} fill="#0F172A">₹{(total / 1000).toFixed(1)}k</tspan>
                                    </text>
                                )}
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2.5">
                        {data.map((item, i) => {
                            const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0
                            return (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                                    <span className="text-xs text-muted-foreground flex-1 truncate">{item.category}</span>
                                    <span className="text-xs font-semibold text-foreground">{pct}%</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
