"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Customer, CustomerQueryParams, CustomerStats } from "@/types/customer.type"
import type { CreateCustomerInput, UpdateCustomerInput } from "@/lib/validations/customer.validation"
import type { ApiSuccess, PaginationMeta } from "@/types/common.types"

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

export function useAllCustomers() {
    return useQuery<Customer[]>({
        queryKey: ["customers", "all"],
        queryFn: async () => {
            let page = 1
            const collected: Customer[] = []

            while (true) {
                const response = await fetch(buildCustomerUrl({ page, limit: 100 }))
                const json = await response.json()
                if (!response.ok) throw json

                const payload = json as CustomerListResponse
                collected.push(...(payload.data ?? []))

                const meta = payload.meta
                if (!meta || page >= meta.totalPages) break
                page += 1
            }

            return collected
        },
        staleTime: 60_000,
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
        mutationFn: (data: CreateCustomerInput) =>
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
        mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) =>
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
