"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type MonthSummary } from "@/lib/api/dashboard";

export function useMonthSummary(month?: number, year?: number) {
  return useQuery<MonthSummary>({
    queryKey: [
      "dashboard",
      "month-summary",
      month ?? "default",
      year ?? "default",
    ],
    queryFn: () => dashboardApi.monthSummary(month, year),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 2,
  });
}
