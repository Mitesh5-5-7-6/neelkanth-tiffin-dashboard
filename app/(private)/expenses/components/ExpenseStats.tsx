"use client"

import { ShoppingCart, TrendingUp, Tag, Hash } from "lucide-react"
import StatCard from "@/components/StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import { CATEGORY_META } from "@/types/expense.type"
import type { ExpenseStats } from "@/types/expense.type"

interface ExpenseStatsProps {
    stats?: ExpenseStats
    isLoading: boolean
}

function formatInr(value: number): string {
    return `₹${value.toLocaleString("en-IN")}`
}

function trendDescription(current: number, prev: number, label = "vs prev. period"): string {
    if (prev === 0) return label
    const pct = ((current - prev) / prev) * 100
    const dir = pct >= 0 ? "↑" : "↓"
    return `${dir} ${Math.abs(pct).toFixed(1)}% ${label}`
}

export default function ExpenseStats({ stats, isLoading }: ExpenseStatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
            </div>
        )
    }

    const topCategoryLabel = stats?.top_category
        ? CATEGORY_META[stats.top_category.category]?.label ?? stats.top_category.category
        : "—"

    const topCategoryDesc = stats?.top_category
        ? `${formatInr(stats.top_category.amount)} (${stats.top_category.percentage}%)`
        : "No data"

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                icon={<ShoppingCart className="w-5 h-5" />}
                heading="Total Expense"
                number={formatInr(stats?.total_expense ?? 0)}
                variant="danger"
                description={trendDescription(stats?.total_expense ?? 0, stats?.prev_total_expense ?? 0)}
            />
            <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                heading="Daily Average"
                number={formatInr(stats?.daily_average ?? 0)}
                variant="primary"
                description={`Per day · ${stats?.days_in_period ?? 0} days`}
            />
            <StatCard
                icon={<Tag className="w-5 h-5" />}
                heading="Top Category"
                number={topCategoryLabel}
                variant="warning"
                description={topCategoryDesc}
            />
            <StatCard
                icon={<Hash className="w-5 h-5" />}
                heading="Total Transactions"
                number={String(stats?.total_transactions ?? 0)}
                variant="purple"
                description={trendDescription(
                    stats?.total_transactions ?? 0,
                    stats?.prev_total_transactions ?? 0
                )}
            />
        </div>
    )
}
