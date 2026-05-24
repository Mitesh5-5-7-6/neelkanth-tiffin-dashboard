"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
    GroupedPaymentData,
    GroupedPaymentQueryParams,
    UpdateEntryStatusPayload,
    RecordTiffinPaymentPayload,
} from "@/types/grouped-payment.type"
import type { ApiSuccess, PaginationMeta } from "@/types/common.types"

// ─── Response shapes ──────────────────────────────────────────────────────────

type GroupedResponse = ApiSuccess<GroupedPaymentData> & { meta: PaginationMeta }

// ─── Helper ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    })
    const json = await res.json()
    if (!res.ok) throw json
    return json as T
}

function buildGroupedUrl(params: GroupedPaymentQueryParams): string {
    const sp = new URLSearchParams()
    if (params.startDate) sp.set("startDate", params.startDate)
    if (params.endDate) sp.set("endDate", params.endDate)
    if (params.customerId) sp.set("customerId", params.customerId)
    if (params.status) sp.set("status", params.status)
    if (params.search?.trim()) sp.set("search", params.search.trim())
    if (params.page) sp.set("page", String(params.page))
    if (params.limit) sp.set("limit", String(params.limit))
    return `/api/nts/v1/payments/grouped?${sp.toString()}`
}

// ─── Query: grouped customer-entry view ──────────────────────────────────────

export function useGroupedPayments(params: GroupedPaymentQueryParams) {
    return useQuery<GroupedResponse>({
        queryKey: ["payments", "grouped", params],
        queryFn: () => apiFetch<GroupedResponse>(buildGroupedUrl(params)),
    })
}

// ─── Mutation: update morning/evening paid status on a tiffin entry ──────────
// Writing back to tiffin entry is the source-of-truth for payment status.
// After success we invalidate BOTH payment grouped cache AND tiffin entries
// cache so both modules refresh instantly (bi-directional sync).

export function useUpdateEntryStatus() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ entryId, data }: { entryId: string; data: UpdateEntryStatusPayload }) =>
            apiFetch<ApiSuccess<unknown>>(`/api/nts/v1/payments/${entryId}/status`, {
                method: "PATCH",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            // Invalidate all grouped payment views
            qc.invalidateQueries({ queryKey: ["payments", "grouped"] })
            // Invalidate tiffin entries so the tiffin module reflects the change too
            qc.invalidateQueries({ queryKey: ["tiffin-entries"] })
            // Invalidate dashboard stats that aggregate pending amounts
            qc.invalidateQueries({ queryKey: ["dashboard"] })
            // Invalidate existing payment stats
            qc.invalidateQueries({ queryKey: ["payments", "stats"] })
        },
    })
}

// ─── Mutation: record a payment transaction linked to a tiffin entry ─────────

export function useRecordTiffinPayment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: RecordTiffinPaymentPayload) =>
            apiFetch<ApiSuccess<unknown>>("/api/nts/v1/payments", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["payments", "grouped"] })
            qc.invalidateQueries({ queryKey: ["tiffin-entries"] })
            qc.invalidateQueries({ queryKey: ["dashboard"] })
            qc.invalidateQueries({ queryKey: ["payments", "stats"] })
            qc.invalidateQueries({ queryKey: ["payments", "list"] })
        },
    })
}
