"use client"

import { Trophy, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useTopCustomers } from "@/hooks/useDashboard"
import EmptyState from "@/components/dashboard/EmptyState"

const RANK_LABELS = ["🥇", "🥈", "🥉"]

export default function TopCustomersCard() {
    const { data = [], isLoading, isError } = useTopCustomers()

    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div>
                <h3 className="text-sm font-semibold text-foreground">Top Customers</h3>
                <p className="text-xs text-muted-foreground mt-0.5">By total tiffins — selected period</p>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <Skeleton className="flex-1 h-4 rounded" />
                            <Skeleton className="w-16 h-4 rounded" />
                        </div>
                    ))}
                </div>
            ) : isError ? (
                <EmptyState
                    icon={<AlertCircle className="w-5 h-5" />}
                    title="Could not load rankings"
                    description="Failed to fetch customer data. It will retry automatically."
                />
            ) : data.length === 0 ? (
                <EmptyState
                    icon={<Trophy className="w-5 h-5" />}
                    title="No data for this period"
                    description="No tiffin entries found to rank customers."
                />
            ) : (
                <div className="space-y-3">
                    {data.map((customer) => (
                        <div
                            key={customer.rank}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/10 transition-colors"
                        >
                            <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">{customer.avatar}</span>
                                </div>
                                {customer.rank <= 3 && (
                                    <span className="absolute -top-1 -right-1 text-[10px]">
                                        {RANK_LABELS[customer.rank - 1]}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.totalTiffins} tiffins</p>
                            </div>

                            <p className="text-sm font-semibold text-foreground shrink-0">
                                ₹{(customer.totalAmount / 1000).toFixed(1)}k
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
