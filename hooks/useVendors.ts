"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Vendor, VendorQueryParams } from "@/types/vendor.type"
import type { CreateVendorInput, UpdateVendorInput } from "@/lib/validations/vendor.validation"
import type { ApiSuccess, PaginationMeta } from "@/types/common.types"

type VendorListResponse = ApiSuccess<Vendor[]> & { meta: PaginationMeta }
type VendorResponse = ApiSuccess<Vendor>

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    })
    const json = await res.json()
    if (!res.ok) throw json
    return json as T
}

function buildVendorUrl(params: VendorQueryParams): string {
    const sp = new URLSearchParams()
    if (params.page)        sp.set("page", String(params.page))
    if (params.limit)       sp.set("limit", String(params.limit))
    if (params.search?.trim()) sp.set("search", params.search.trim())
    if (params.vendor_type) sp.set("vendor_type", params.vendor_type)
    if (params.is_active !== undefined) sp.set("is_active", String(params.is_active))
    return `/api/vendors?${sp.toString()}`
}

export function useVendors(params: VendorQueryParams = {}) {
    return useQuery<VendorListResponse>({
        queryKey: ["vendors", "list", params],
        queryFn: () => apiFetch<VendorListResponse>(buildVendorUrl(params)),
    })
}

export function useVendor(id: string) {
    return useQuery<VendorResponse>({
        queryKey: ["vendors", "detail", id],
        queryFn: () => apiFetch<VendorResponse>(`/api/vendors/${id}`),
        enabled: !!id,
    })
}

export function useCreateVendor() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CreateVendorInput) =>
            apiFetch<VendorResponse>("/api/vendors", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["vendors"] })
        },
    })
}

export function useUpdateVendor() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateVendorInput }) =>
            apiFetch<VendorResponse>(`/api/vendors/${id}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            }),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: ["vendors"] })
            qc.invalidateQueries({ queryKey: ["vendors", "detail", id] })
        },
    })
}

export function useDeactivateVendor() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) =>
            apiFetch<VendorResponse>(`/api/vendors/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["vendors"] })
        },
    })
}
