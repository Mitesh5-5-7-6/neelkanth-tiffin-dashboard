import { z } from 'zod'

export const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'cheque'] as const
export const ENTRY_STATUSES = ['PAID', 'PENDING'] as const

// ─── Update entry payment status ──────────────────────────────────────────────

export const updateEntryStatusSchema = z
    .object({
        morningStatus: z.enum(ENTRY_STATUSES).optional(),
        eveningStatus: z.enum(ENTRY_STATUSES).optional(),
        paymentMethod: z.enum(PAYMENT_METHODS).optional(),
        notes: z.string().max(500, 'Notes too long').trim().optional(),
    })
    .refine((d) => d.morningStatus !== undefined || d.eveningStatus !== undefined, {
        message: 'At least one of morningStatus or eveningStatus must be provided',
    })

// ─── Record payment linked to a tiffin entry ─────────────────────────────────

export const recordTiffinPaymentSchema = z.object({
    customerId: z.string().min(1, 'Customer is required'),
    tiffinEntryId: z.string().min(1, 'Tiffin entry is required'),
    amount: z.number({ message: 'Amount is required' }).min(0, 'Amount cannot be negative'),
    paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Invalid payment method' }),
    paymentFor: z.enum(['MORNING', 'EVENING', 'FULL_DAY'], {
        message: 'paymentFor must be MORNING, EVENING or FULL_DAY',
    }),
    notes: z.string().max(500, 'Notes too long').trim().optional(),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type UpdateEntryStatusInput = z.infer<typeof updateEntryStatusSchema>
export type RecordTiffinPaymentInput = z.infer<typeof recordTiffinPaymentSchema>
