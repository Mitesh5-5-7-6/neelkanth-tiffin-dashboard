"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi, type PendingPayment } from "@/lib/api/dashboard"

export function usePendingPayments() {
    return useQuery<PendingPayment[]>({
        queryKey:        ["dashboard", "pending-payments"],
        queryFn:         dashboardApi.pendingPayments,
        staleTime:       30_000,
        refetchInterval: 30_000,
        retry:           2,
    })
}
