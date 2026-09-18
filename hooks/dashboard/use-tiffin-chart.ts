"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type TiffinChartPoint } from "@/lib/api/dashboard";
import { useDashboardRange } from "./use-dashboard-range";

export function useTiffinChart() {
  const { from, to } = useDashboardRange();
  return useQuery<TiffinChartPoint[]>({
    queryKey: ["dashboard", "tiffin-trend", from, to],
    queryFn: () => dashboardApi.tiffinTrend(from, to),
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
    retry: 2,
  });
}
