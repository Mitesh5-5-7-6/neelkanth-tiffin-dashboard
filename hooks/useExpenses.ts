"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Expense, ExpenseQueryParams, ExpenseStats } from "@/types/expense.type"
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/validations/expense.validation"
import type { ApiSuccess, PaginationMeta } from "@/types/common.types"

type ExpenseListResponse = ApiSuccess<Expense[]> & { meta: PaginationMeta }
type ExpenseResponse = ApiSuccess<Expense>
type StatsResponse = ApiSuccess<ExpenseStats>

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    })
    const json = await res.json()
    if (!res.ok) throw json
    return json as T
}

function buildExpenseUrl(params: ExpenseQueryParams): string {
    const sp = new URLSearchParams()
    if (params.page)           sp.set("page", String(params.page))
    if (params.limit)          sp.set("limit", String(params.limit))
    if (params.search?.trim()) sp.set("search", params.search.trim())
    if (params.category)       sp.set("category", params.category)
    if (params.status)         sp.set("status", params.status)
    if (params.payment_method) sp.set("payment_method", params.payment_method)
    if (params.start_date)     sp.set("start_date", params.start_date)
    if (params.end_date)       sp.set("end_date", params.end_date)
    if (params.vendor_id)      sp.set("vendor_id", params.vendor_id)
    if (params.is_recurring !== undefined) sp.set("is_recurring", String(params.is_recurring))
    return `/api/expenses?${sp.toString()}`
}

function buildStatsUrl(params: Pick<ExpenseQueryParams, "start_date" | "end_date">): string {
    const sp = new URLSearchParams()
    if (params.start_date) sp.set("start_date", params.start_date)
    if (params.end_date)   sp.set("end_date", params.end_date)
    return `/api/expenses/stats?${sp.toString()}`
}

export function useExpenses(params: ExpenseQueryParams) {
    return useQuery<ExpenseListResponse>({
        queryKey: ["expenses", "list", params],
        queryFn: () => apiFetch<ExpenseListResponse>(buildExpenseUrl(params)),
    })
}

export function useExpense(id: string) {
    return useQuery<ExpenseResponse>({
        queryKey: ["expenses", "detail", id],
        queryFn: () => apiFetch<ExpenseResponse>(`/api/expenses/${id}`),
        enabled: !!id,
    })
}

export function useExpenseStats(params: Pick<ExpenseQueryParams, "start_date" | "end_date">) {
    return useQuery<StatsResponse>({
        queryKey: ["expenses", "stats", params],
        queryFn: () => apiFetch<StatsResponse>(buildStatsUrl(params)),
    })
}

export function useCreateExpense() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CreateExpenseInput) =>
            apiFetch<ExpenseResponse>("/api/expenses", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expenses"] })
        },
    })
}

export function useUpdateExpense() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateExpenseInput }) =>
            apiFetch<ExpenseResponse>(`/api/expenses/${id}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            }),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: ["expenses"] })
            qc.invalidateQueries({ queryKey: ["expenses", "detail", id] })
        },
    })
}

export function useDeleteExpense() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) =>
            apiFetch<ExpenseResponse>(`/api/expenses/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expenses"] })
        },
    })
}
