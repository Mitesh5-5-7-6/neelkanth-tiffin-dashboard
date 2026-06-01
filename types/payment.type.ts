import type { Document, Types } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PAYMENT_STATUS = {
    PENDING: 'pending',
    PARTIAL: 'partial',
    COMPLETED: 'completed',
    ADVANCE: 'advance',
} as const
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

export const PAYMENT_METHOD = {
    CASH: 'cash',
    UPI: 'upi',
    BANK_TRANSFER: 'bank_transfer',
    CHEQUE: 'cheque',
} as const
export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD]

// ─── Mongoose document interface ──────────────────────────────────────────────

export interface IPayment extends Document {
    customer_id: Types.ObjectId
    payment_date: Date
    billing_start_date: Date
    billing_end_date: Date
    total_bill_amount: number
    paid_amount: number
    remaining_amount: number
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    reference_number?: string
    notes?: string
    collected_by?: string
    createdAt: Date
    updatedAt: Date
}

// ─── Client-side shape (ObjectIds serialised to strings) ─────────────────────

export interface Payment {
    _id: string
    customer_id: string
    payment_date: string
    billing_start_date: string
    billing_end_date: string
    total_bill_amount: number
    paid_amount: number
    remaining_amount: number
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    reference_number?: string
    notes?: string
    collected_by?: string
    createdAt: string
    updatedAt: string
    customer?: {
        _id: string
        full_name: string
        phone: string
        address?: string
    }
}

// ─── Query / filter params ────────────────────────────────────────────────────

export interface PaymentQueryParams {
    page?: number
    limit?: number
    search?: string
    status?: PaymentStatus | ''
    start_date?: string
    end_date?: string
    customer_id?: string
}

// ─── Aggregation result shapes ────────────────────────────────────────────────

export interface PaymentStats {
    total_collected: number
    total_pending: number
    partial_count: number
    advance_balance: number
}

export interface CustomerPaymentSummary {
    customer_id: string
    full_name: string
    phone: string
    address?: string
    total_bill: number
    total_paid: number
    outstanding: number
    advance_balance: number
    payments: Payment[]
}

export interface CustomerPaymentSummaryLite {
    customer_id: string
    total_bill: number
    total_paid: number
    outstanding: number
    advance_balance: number
}

export interface GenerateBillResult {
    customer_id: string
    customer_name: string
    billing_start_date: string
    billing_end_date: string
    total_entries: number
    total_amount: number
    previous_pending: number
    advance_deduction: number
    final_payable: number
}

export interface MonthlyReport {
    year: number
    month: number
    total_collected: number
    total_pending: number
    total_partial: number
    advance_count: number
    payment_count: number
    customer_count: number
    top_customers: { customer_id: string; full_name: string; paid: number }[]
}
