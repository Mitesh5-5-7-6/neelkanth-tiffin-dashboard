// Re-export all dashboard hooks and types from their canonical locations.
// Components that import from this file continue to work unchanged.

export { useDashboardStats }      from "@/hooks/dashboard/use-dashboard-stats"
export { useTiffinChart }         from "@/hooks/dashboard/use-tiffin-chart"
export { useRevenueChart }        from "@/hooks/dashboard/use-revenue-chart"
export { useExpenseChart }        from "@/hooks/dashboard/use-expense-chart"
export { useRecentTiffinEntries } from "@/hooks/dashboard/use-recent-tiffins"
export { useRecentExpenses }      from "@/hooks/dashboard/use-recent-expenses"
export { usePendingPayments }     from "@/hooks/dashboard/use-pending-payments"
export { useTopCustomers }        from "@/hooks/dashboard/use-top-customers"
export { useMonthSummary }        from "@/hooks/dashboard/use-month-summary"

export type {
    DashboardStats,
    TiffinChartPoint,
    RevenueExpensePoint,
    ExpenseCategoryPoint,
    RecentTiffinEntry,
    RecentExpense,
    PendingPayment,
    TopCustomer,
    MonthSummary,
} from "@/lib/api/dashboard"
