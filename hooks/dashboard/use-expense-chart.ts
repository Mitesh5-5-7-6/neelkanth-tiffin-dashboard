"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type ExpenseCategoryPoint } from "@/lib/api/dashboard";
import { useDashboardRange } from "./use-dashboard-range";

export function useExpenseChart() {
  const { from, to } = useDashboardRange();
  return useQuery<ExpenseCategoryPoint[]>({
    queryKey: ["dashboard", "expense-categories", from, to],
    queryFn: () => dashboardApi.expenseCategories(from, to),
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
    retry: 2,
  });
}
