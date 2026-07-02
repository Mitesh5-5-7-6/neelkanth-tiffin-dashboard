"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type DashboardStats } from "@/lib/api/dashboard";
import { useDashboardRange } from "./use-dashboard-range";

export function useDashboardStats() {
  const { from, to } = useDashboardRange();
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats", from, to],
    queryFn: () => dashboardApi.stats(from, to),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}
