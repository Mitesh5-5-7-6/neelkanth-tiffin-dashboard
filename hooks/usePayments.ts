"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
    Payment,
    PaymentStats,
    PaymentQueryParams,
    CustomerPaymentSummary,
    CustomerPaymentSummaryLite,
    GenerateBillResult,
    MonthlyReport,
} from "@/types/payment.type"
import type { CreatePaymentInput, UpdatePaymentInput, GenerateBillInput } from "@/lib/validations/payment.validation"
import type { ApiSuccess, PaginationMeta } from "@/types/common.types"

// ─── API fetch helper ─────────────────────────────────────────────────────────

type PaymentListResponse = ApiSuccess<Payment[]> & { meta: PaginationMeta }
type PaymentResponse = ApiSuccess<Payment>
type StatsResponse = ApiSuccess<PaymentStats>
type SummaryResponse = ApiSuccess<CustomerPaymentSummary>
type BatchSummaryResponse = ApiSuccess<CustomerPaymentSummaryLite[]>
type BillResponse = ApiSuccess<GenerateBillResult>
type ReportResponse = ApiSuccess<MonthlyReport>

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    })
    const json = await res.json()
    if (!res.ok) throw json
    return json as T
}

function buildPaymentsUrl(params: PaymentQueryParams): string {
    const sp = new URLSearchParams()
    if (params.page) sp.set("page", String(params.page))
    if (params.limit) sp.set("limit", String(params.limit))
    if (params.search?.trim()) sp.set("search", params.search.trim())
    if (params.status) sp.set("status", params.status)
    if (params.start_date) sp.set("start_date", params.start_date)
    if (params.end_date) sp.set("end_date", params.end_date)
    if (params.customer_id) sp.set("customer_id", params.customer_id)
    return `/api/payments?${sp.toString()}`
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePayments(params: PaymentQueryParams) {
    return useQuery<PaymentListResponse>({
        queryKey: ["payments", "list", params],
        queryFn: () => apiFetch<PaymentListResponse>(buildPaymentsUrl(params)),
    })
}

export function usePayment(id: string) {
    return useQuery<PaymentResponse>({
        queryKey: ["payments", "detail", id],
        queryFn: () => apiFetch<PaymentResponse>(`/api/payments/${id}`),
        enabled: !!id,
    })
}

export function usePaymentStats() {
    return useQuery<StatsResponse>({
        queryKey: ["payments", "stats"],
        queryFn: () => apiFetch<StatsResponse>("/api/payments/stats"),
    })
}

export function useCustomerPaymentSummary(customerId: string) {
    return useQuery<SummaryResponse>({
        queryKey: ["payments", "customer-summary", customerId],
        queryFn: () => apiFetch<SummaryResponse>(`/api/payments/customer-summary/${customerId}`),
        enabled: !!customerId,
    })
}

export function useCustomersPaymentSummary(customerIds: string[]) {
    const sortedKey = [...customerIds].sort().join(",")
    return useQuery<BatchSummaryResponse>({
        queryKey: ["payments", "customers-summary", sortedKey],
        queryFn: () =>
            apiFetch<BatchSummaryResponse>(
                `/api/payments/customers-summary?ids=${encodeURIComponent(customerIds.join(","))}`
            ),
        enabled: customerIds.length > 0,
        staleTime: 30_000,
    })
}

export function useMonthlyReport(year: number, month: number) {
    return useQuery<ReportResponse>({
        queryKey: ["payments", "monthly-report", year, month],
        queryFn: () => apiFetch<ReportResponse>(`/api/payments/monthly-report?year=${year}&month=${month}`),
    })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePayment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CreatePaymentInput) =>
            apiFetch<PaymentResponse>("/api/payments", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["payments"] })
        },
    })
}

export function useUpdatePayment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePaymentInput }) =>
            apiFetch<PaymentResponse>(`/api/payments/${id}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            }),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: ["payments"] })
            qc.invalidateQueries({ queryKey: ["payments", "detail", id] })
        },
    })
}

export function useDeletePayment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) =>
            apiFetch<ApiSuccess<null>>(`/api/payments/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["payments"] })
        },
    })
}

export function useGenerateBill() {
    return useMutation({
        mutationFn: (data: GenerateBillInput) =>
            apiFetch<BillResponse>("/api/payments/generate-bill", {
                method: "POST",
                body: JSON.stringify(data),
            }),
    })
}
