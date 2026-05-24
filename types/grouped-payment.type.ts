// ─── Entry-level (per tiffin entry day) ──────────────────────────────────────

export type EntryPaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING'

export interface GroupedEntryRow {
    entryId: string
    date: string
    morningQty: number
    morningPrice: number
    morningPaid: boolean
    eveningQty: number
    eveningPrice: number
    eveningPaid: boolean
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    status: EntryPaymentStatus
}

// ─── Customer-level (grouped) ─────────────────────────────────────────────────

export interface GroupedCustomerRow {
    customerId: string
    customerName: string
    phone: string
    address?: string
    totalAmount: number
    totalPaid: number
    totalPending: number
    entryCount: number
    status: EntryPaymentStatus
    entries: GroupedEntryRow[]
}

// ─── Summary across all customers ─────────────────────────────────────────────

export interface GroupedPaymentSummary {
    totalCustomers: number
    totalAmount: number
    totalPaid: number
    totalPending: number
}

// ─── API response ─────────────────────────────────────────────────────────────

export interface GroupedPaymentData {
    customers: GroupedCustomerRow[]
    summary: GroupedPaymentSummary
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface GroupedPaymentQueryParams {
    startDate?: string
    endDate?: string
    customerId?: string
    status?: EntryPaymentStatus | ''
    search?: string
    page?: number
    limit?: number
}

// ─── Status update ────────────────────────────────────────────────────────────

export interface UpdateEntryStatusPayload {
    morningStatus?: 'PAID' | 'PENDING'
    eveningStatus?: 'PAID' | 'PENDING'
    paymentMethod?: 'cash' | 'upi' | 'bank_transfer' | 'cheque'
    notes?: string
}

// ─── Record payment linked to entry ──────────────────────────────────────────

export interface RecordTiffinPaymentPayload {
    customerId: string
    tiffinEntryId: string
    amount: number
    paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque'
    paymentFor: 'MORNING' | 'EVENING' | 'FULL_DAY'
    notes?: string
}
