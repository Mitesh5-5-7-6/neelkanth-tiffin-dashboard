"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { TiffinEntry, TiffinPreviewRow, BulkSavePayload } from "@/types/tiffin.type"
import type { ApiSuccess } from "@/types/common.types"

type PreviewResponse = ApiSuccess<TiffinPreviewRow[]>
type EntriesResponse = ApiSuccess<TiffinEntry[]>
type BulkSaveResponse = ApiSuccess<{ inserted: number; updated: number; total: number }>

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    })
    const json = await res.json()
    if (!res.ok) throw json
    return json as T
}

/** Fetch tiffin entries for a specific date */
export function useTiffinEntries(date: string | null) {
    return useQuery<EntriesResponse>({
        queryKey: ["tiffin-entries", "list", date],
        queryFn: () => apiFetch<EntriesResponse>(`/api/tiffin-entries?date=${date}`),
        enabled: !!date,
    })
}

/**
 * Fetch preview rows for a date, optionally copying defaults from another date.
 * @param date - The target date (YYYY-MM-DD) to get/fill entries for
 * @param fromDate - Optional source date to copy from (YYYY-MM-DD)
 */
export function useTiffinPreview(date: string | null, fromDate?: string | null) {
    const params = new URLSearchParams()
    if (date) params.set("date", date)
    if (fromDate) params.set("fromDate", fromDate)

    return useQuery<PreviewResponse>({
        queryKey: ["tiffin-entries", "preview", date, fromDate ?? null],
        queryFn: () => apiFetch<PreviewResponse>(`/api/tiffin-entries/preview?${params}`),
        enabled: !!date,
        staleTime: 30_000,
    })
}

/** Bulk upsert tiffin entries */
export function useBulkSaveTiffinEntries() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: BulkSavePayload) =>
            apiFetch<BulkSaveResponse>("/api/tiffin-entries/bulk", {
                method: "POST",
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tiffin-entries"] })
        },
    })
}
