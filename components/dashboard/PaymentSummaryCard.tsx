"use client"

import { AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "@/hooks/useDashboard"
import EmptyState from "@/components/dashboard/EmptyState"
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from "recharts"

export default function PaymentSummaryCard() {
    const { data, isLoading, isError } = useDashboardStats()

    const received = data?.todayRevenue.amount ?? 0
    const pending = data?.pendingPayments.amount ?? 0
    const total = received + pending

    const pieData = [
        { name: "Received", value: received, color: "#16A34A" },
        { name: "Pending", value: pending, color: "#DC2626" },
    ]

    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div>
                <h3 className="text-sm font-semibold text-foreground">Payment Summary</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Collection status</p>
            </div>

            {isLoading ? (
                <Skeleton className="w-full h-40 rounded-xl" />
            ) : isError ? (
                <EmptyState
                    icon={<AlertCircle className="w-5 h-5" />}
                    title="Could not load summary"
                    description="Failed to fetch payment data."
                    className="h-40"
                />
            ) : (
                <div className="flex items-center gap-4">
                    <div className="shrink-0 w-32 h-32">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={38}
                                    outerRadius={56}
                                    strokeWidth={2}
                                    stroke="#fff"
                                >
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v) => [`₹${Number(v || 0).toLocaleString("en-IN")}`, ""]}
                                    contentStyle={{
                                        background: "#fff",
                                        border: "1px solid #E2E8F0",
                                        borderRadius: "10px",
                                        fontSize: 12,
                                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                                    }}
                                />
                                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                    <tspan x="50%" dy="-7" fontSize={9} fill="#64748B">Total</tspan>
                                    <tspan x="50%" dy="16" fontSize={13} fontWeight={700} fill="#0F172A">
                                        ₹{(total / 1000).toFixed(1)}k
                                    </tspan>
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                                <span className="text-xs text-muted-foreground">Received</span>
                            </div>
                            <p className="text-base font-bold text-success">
                                ₹{received.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {total > 0 ? Math.round((received / total) * 100) : 0}% of total
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
                                <span className="text-xs text-muted-foreground">Pending</span>
                            </div>
                            <p className="text-base font-bold text-danger">
                                ₹{pending.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {data?.pendingPayments.customerCount ?? 0} customers
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
