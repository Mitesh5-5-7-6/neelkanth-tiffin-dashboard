"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi, type MonthSummary } from "@/lib/api/dashboard"

export function useMonthSummary() {
    return useQuery<MonthSummary>({
        queryKey:        ["dashboard", "month-summary"],
        queryFn:         dashboardApi.monthSummary,
        staleTime:       5 * 60_000,
        refetchInterval: 5 * 60_000,
        retry:           2,
    })
}
