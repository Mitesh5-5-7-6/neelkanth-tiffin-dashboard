"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type RecentExpense } from "@/lib/api/dashboard";
import { useDashboardRange } from "./use-dashboard-range";

export function useRecentExpenses() {
  const { from, to } = useDashboardRange();
  return useQuery<RecentExpense[]>({
    queryKey: ["dashboard", "recent-expenses", from, to],
    queryFn: () => dashboardApi.recentExpenses(from, to),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
  });
}
