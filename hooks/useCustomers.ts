"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Customer, CustomerFormData, CustomerQueryParams, CustomerStats } from "@/types/customer.type"
import type { ApiSuccess } from "@/types/common.types"
import type { PaginationMeta } from "@/types/common.types"

type CustomerListResponse = ApiSuccess<Customer[]> & { meta: PaginationMeta }
type CustomerResponse = ApiSuccess<Customer>
type StatsResponse = ApiSuccess<CustomerStats>

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    })
    const json = await res.json()
    if (!res.ok) throw json
    return json as T
}

function buildCustomerUrl(params: CustomerQueryParams): string {
    const sp = new URLSearchParams()
    if (params.page) sp.set("page", String(params.page))
    if (params.limit) sp.set("limit", String(params.limit))
    if (params.search?.trim()) sp.set("search", params.search.trim())
    if (params.is_active !== undefined && params.is_active !== "") {
        sp.set("is_active", String(params.is_active))
    }
    return `/api/customers?${sp.toString()}`
}

export function useCustomers(params: CustomerQueryParams) {
    return useQuery<CustomerListResponse>({
        queryKey: ["customers", "list", params],
        queryFn: () => apiFetch<CustomerListResponse>(buildCustomerUrl(params)),
    })
}

export function useCustomer(id: string) {
    return useQuery<CustomerResponse>({
        queryKey: ["customers", "detail", id],
        queryFn: () => apiFetch<CustomerResponse>(`/api/customers/${id}`),
        enabled: !!id,
    })
}

export function useCustomerStats() {
    return useQuery<StatsResponse>({
        queryKey: ["customers", "stats"],
        queryFn: () => apiFetch<StatsResponse>("/api/customers/stats"),
    })
}

export function useCreateCustomer() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CustomerFormData) =>
            apiFetch<CustomerResponse>("/api/customers", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["customers"] })
        },
    })
}

export function useUpdateCustomer() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CustomerFormData> }) =>
            apiFetch<CustomerResponse>(`/api/customers/${id}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            }),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: ["customers"] })
            qc.invalidateQueries({ queryKey: ["customers", "detail", id] })
        },
    })
}

export function useDeleteCustomer() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) =>
            apiFetch<CustomerResponse>(`/api/customers/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["customers"] })
        },
    })
}
