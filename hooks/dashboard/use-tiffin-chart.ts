"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi, type TiffinChartPoint } from "@/lib/api/dashboard"
import { useDashboardFilter } from "./use-date-filter"

export function useTiffinChart() {
    const { from, to } = useDashboardFilter()
    return useQuery<TiffinChartPoint[]>({
        queryKey:        ["dashboard", "tiffin-trend", from, to],
        queryFn:         () => dashboardApi.tiffinTrend(from, to),
        staleTime:       2 * 60_000,
        refetchInterval: 2 * 60_000,
        retry:           2,
    })
}
