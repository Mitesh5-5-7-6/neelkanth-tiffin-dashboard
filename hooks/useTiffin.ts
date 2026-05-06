"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { BulkPreviewRow, BulkSavePayload, TiffinEntry } from "@/types/tiffin.type"
import type { ApiSuccess } from "@/types/common.types"

type PreviewResponse = ApiSuccess<BulkPreviewRow[]>
type BulkSaveResponse = ApiSuccess<{ inserted: number; updated: number; total: number }>
type EntriesResponse = ApiSuccess<TiffinEntry[]>

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    })
    const json = await res.json()
    if (!res.ok) throw json
    return json as T
}

/** Fetch merged preview rows for a given source date */
export function useTiffinPreview(fromDate: string | null) {
    return useQuery<PreviewResponse>({
        queryKey: ["tiffin", "preview", fromDate],
        queryFn: () => apiFetch<PreviewResponse>(`/api/tiffin/preview?fromDate=${fromDate}`),
        enabled: !!fromDate,
        staleTime: 30_000,
    })
}

/** Fetch saved tiffin entries for a specific date */
export function useTiffinEntries(date: string | null) {
    return useQuery<EntriesResponse>({
        queryKey: ["tiffin", "entries", date],
        queryFn: () => apiFetch<EntriesResponse>(`/api/tiffin?date=${date}`),
        enabled: !!date,
    })
}

/** Bulk upsert tiffin entries */
export function useBulkSaveTiffin() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: BulkSavePayload) =>
            apiFetch<BulkSaveResponse>("/api/tiffin/bulk", {
                method: "POST",
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tiffin"] })
        },
    })
}
