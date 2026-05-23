"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi, type TopCustomer } from "@/lib/api/dashboard"
import { useDashboardFilter } from "./use-date-filter"

export function useTopCustomers() {
    const { from, to } = useDashboardFilter()
    return useQuery<TopCustomer[]>({
        queryKey:        ["dashboard", "top-customers", from, to],
        queryFn:         () => dashboardApi.topCustomers(from, to),
        staleTime:       5 * 60_000,
        refetchInterval: 5 * 60_000,
        retry:           2,
    })
}
