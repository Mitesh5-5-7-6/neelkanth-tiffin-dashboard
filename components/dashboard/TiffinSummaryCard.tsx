"use client"

import { UtensilsCrossed, Sunrise, Sunset, IndianRupee, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "@/hooks/useDashboard"
import EmptyState from "@/components/dashboard/EmptyState"

interface MiniMetricProps {
    icon: React.ReactNode
    label: string
    value: string | number
    iconBg: string
    iconColor: string
}

function MiniMetric({ icon, label, value, iconBg, iconColor }: MiniMetricProps) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/10 transition-colors">
            <div className={`p-2 rounded-lg ${iconBg} shrink-0`}>
                <div className={iconColor}>{icon}</div>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
            </div>
        </div>
    )
}

export default function TiffinSummaryCard() {
    const { data, isLoading, isError } = useDashboardStats()

    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div>
                <h3 className="text-sm font-semibold text-foreground">Tiffin Summary</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Period delivery overview</p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-15 rounded-xl" />
                    ))}
                </div>
            ) : isError ? (
                <EmptyState
                    icon={<AlertCircle className="w-5 h-5" />}
                    title="Could not load summary"
                    description="Failed to fetch tiffin stats."
                />
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <MiniMetric
                        icon={<UtensilsCrossed className="w-4 h-4" />}
                        label="Total Tiffin"
                        value={data?.todayTiffin.total ?? 0}
                        iconBg="bg-primary/10"
                        iconColor="text-primary"
                    />
                    <MiniMetric
                        icon={<Sunrise className="w-4 h-4" />}
                        label="Morning"
                        value={data?.todayTiffin.morning ?? 0}
                        iconBg="bg-warning/10"
                        iconColor="text-warning"
                    />
                    <MiniMetric
                        icon={<Sunset className="w-4 h-4" />}
                        label="Evening"
                        value={data?.todayTiffin.evening ?? 0}
                        iconBg="bg-purple/10"
                        iconColor="text-purple"
                    />
                    <MiniMetric
                        icon={<IndianRupee className="w-4 h-4" />}
                        label="Net Profit"
                        value={`₹${(data?.todayProfit.amount ?? 0).toLocaleString("en-IN")}`}
                        iconBg="bg-success/10"
                        iconColor="text-success"
                    />
                </div>
            )}
        </div>
    )
}
