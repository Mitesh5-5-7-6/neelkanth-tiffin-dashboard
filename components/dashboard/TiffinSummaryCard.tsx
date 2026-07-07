"use client"

import { UtensilsCrossed, Sunrise, Sunset, IndianRupee, TrendingUp, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "@/hooks/useDashboard"
import { formatRupee } from "@/lib/dashboard-format"
import EmptyState from "@/components/dashboard/EmptyState"

function pct(part: number, whole: number): number {
    return whole > 0 ? Math.round((part / whole) * 100) : 0
}

export default function TiffinSummaryCard() {
    const { data, isLoading, isError } = useDashboardStats()

    const total = data?.todayTiffin.total ?? 0
    const morning = data?.todayTiffin.morning ?? 0
    const evening = data?.todayTiffin.evening ?? 0
    const morningPct = pct(morning, morning + evening)
    const eveningPct = 100 - morningPct

    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div>
                <h3 className="text-sm font-semibold text-foreground">Tiffin Summary</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Period delivery overview</p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-3 w-full rounded-full" />
                    <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-14 rounded-xl" />
                        <Skeleton className="h-14 rounded-xl" />
                    </div>
                </div>
            ) : isError ? (
                <EmptyState icon={<AlertCircle className="w-5 h-5" />} title="Could not load summary" description="Failed to fetch tiffin stats." />
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Total */}
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                            <UtensilsCrossed className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total tiffins</p>
                            <p className="text-2xl font-bold text-foreground leading-tight tracking-tight">
                                {total.toLocaleString("en-IN")}
                            </p>
                        </div>
                    </div>

                    {/* Morning / Evening split bar */}
                    <div className="space-y-2">
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/30">
                            <motion.div
                                className="bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${morningPct}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                            <motion.div
                                className="bg-purple"
                                initial={{ width: 0 }}
                                animate={{ width: `${eveningPct}%` }}
                                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Sunrise className="w-3.5 h-3.5 text-primary" />
                                Morning <span className="font-semibold text-foreground">{morning}</span>
                                <span className="text-muted-foreground">({morningPct}%)</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="font-semibold text-foreground">{evening}</span> Evening
                                <span className="text-muted-foreground">({eveningPct}%)</span>
                                <Sunset className="w-3.5 h-3.5 text-purple" />
                            </span>
                        </div>
                    </div>

                    {/* Revenue / Profit */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background">
                            <div className="p-2 rounded-lg bg-success/10 text-success shrink-0">
                                <IndianRupee className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Revenue</p>
                                <p className="text-sm font-bold text-foreground truncate">{formatRupee(data?.todayRevenue.amount ?? 0)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background">
                            <div className="p-2 rounded-lg bg-purple/10 text-purple shrink-0">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Net profit</p>
                                <p className="text-sm font-bold text-foreground truncate">{formatRupee(data?.todayProfit.amount ?? 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
