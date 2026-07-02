"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type RevenueExpensePoint } from "@/lib/api/dashboard";
import { useDashboardRange } from "./use-dashboard-range";

export function useRevenueChart() {
  const { from, to } = useDashboardRange();
  return useQuery<RevenueExpensePoint[]>({
    queryKey: ["dashboard", "revenue-expense", from, to],
    queryFn: () => dashboardApi.revenueExpense(from, to),
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
    retry: 2,
  });
}
