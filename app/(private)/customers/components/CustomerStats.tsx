"use client"

import { Users, UserCheck, UserX, IndianRupee } from "lucide-react"
import StatCard from "@/components/StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useCustomerStats } from "@/hooks/useCustomers"

export default function CustomerStats() {
    const { data, isLoading } = useCustomerStats()

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
            </div>
        )
    }

    const stats = data?.data
    const activePercent = stats?.total
        ? ((stats.active / stats.total) * 100).toFixed(1)
        : "0"
    const inactivePercent = stats?.total
        ? ((stats.inactive / stats.total) * 100).toFixed(1)
        : "0"

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                icon={<Users className="w-5 h-5" />}
                heading="Total Customers"
                number={String(stats?.total ?? 0)}
                variant="primary"
                description="All registered"
            />
            <StatCard
                icon={<UserCheck className="w-5 h-5" />}
                heading="Active Customers"
                number={String(stats?.active ?? 0)}
                variant="success"
                description={`${activePercent}% of total`}
            />
            <StatCard
                icon={<UserX className="w-5 h-5" />}
                heading="Inactive Customers"
                number={String(stats?.inactive ?? 0)}
                variant="warning"
                description={`${inactivePercent}% of total`}
            />
            <StatCard
                icon={<IndianRupee className="w-5 h-5" />}
                heading="Total Outstanding"
                number={`₹${stats?.outstanding?.toLocaleString("en-IN") ?? 0}`}
                variant="danger"
                description="Pending payments"
            />
        </div>
    )
}
