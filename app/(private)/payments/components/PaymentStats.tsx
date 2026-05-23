"use client"

import { IndianRupee, Clock, SplitSquareHorizontal, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import StatCard from "@/components/StatCard"
import { usePaymentStats } from "@/hooks/usePayments"

function fmt(n: number) {
    return `₹${n.toLocaleString("en-IN")}`
}

export default function PaymentStats() {
    const { data, isLoading } = usePaymentStats()
    const stats = data?.data

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                icon={<IndianRupee className="w-5 h-5" />}
                heading="Total Collected"
                number={fmt(stats?.total_collected ?? 0)}
                variant="success"
            />
            <StatCard
                icon={<Clock className="w-5 h-5" />}
                heading="Total Pending"
                number={fmt(stats?.total_pending ?? 0)}
                variant="danger"
            />
            <StatCard
                icon={<SplitSquareHorizontal className="w-5 h-5" />}
                heading="Partial Payments"
                number={String(stats?.partial_count ?? 0)}
                variant="warning"
            />
            <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                heading="Advance Balance"
                number={fmt(stats?.advance_balance ?? 0)}
                variant="purple"
            />
        </div>
    )
}
