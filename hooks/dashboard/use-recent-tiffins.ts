"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type RecentTiffinEntry } from "@/lib/api/dashboard";
import { useDashboardRange } from "./use-dashboard-range";

export function useRecentTiffinEntries() {
  const { from, to } = useDashboardRange();
  return useQuery<RecentTiffinEntry[]>({
    queryKey: ["dashboard", "recent-tiffins", from, to],
    queryFn: () => dashboardApi.recentTiffins(from, to),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
  });
}
