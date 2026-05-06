// ─── Primitive enums (as const — smaller bundle, flexible) ───────────────────

export const Month = {
    JAN: 'Jan', FEB: 'Feb', MAR: 'Mar', APR: 'Apr',
    MAY: 'May', JUN: 'Jun', JUL: 'Jul', AUG: 'Aug',
    SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dec',
} as const
export type MonthType = typeof Month[keyof typeof Month]

export const PaymentMethod = {
    CASH: 'Cash',
    UPI: 'Upi',
    CHEQUE: 'Cheque',
} as const
export type PaymentMethodType = typeof PaymentMethod[keyof typeof PaymentMethod]

export const PaymentStatus = {
    PENDING: 'PENDING',
    COMPLETE: 'COMPLETE',
    PARTIAL: 'PARTIAL',
} as const
export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus]

export const TiffinShift = {
    MORNING: 'morning',
    EVENING: 'evening',
    BOTH: 'both',
} as const
export type TiffinShiftType = typeof TiffinShift[keyof typeof TiffinShift]

// ─── API response types ───────────────────────────────────────────────────────

export type ApiSuccess<T> = {
    success: true
    message: string
    data: T
    meta?: Record<string, unknown>
    error: null
}

export type ApiError = {
    success: false
    message: string
    data: null
    error: {
        code: string
        details?: unknown
    }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type PaginationMeta = {
    page: number
    limit: number
    total: number
    totalPages: number
}
