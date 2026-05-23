"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi, type ExpenseCategoryPoint } from "@/lib/api/dashboard"
import { useDashboardFilter } from "./use-date-filter"

export function useExpenseChart() {
    const { from, to } = useDashboardFilter()
    return useQuery<ExpenseCategoryPoint[]>({
        queryKey:        ["dashboard", "expense-categories", from, to],
        queryFn:         () => dashboardApi.expenseCategories(from, to),
        staleTime:       2 * 60_000,
        refetchInterval: 2 * 60_000,
        retry:           2,
    })
}
