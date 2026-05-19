import { z } from 'zod'

export const PAYMENT_METHODS_LIST = ['cash', 'upi', 'bank_transfer', 'cheque'] as const
export const PAYMENT_STATUSES_LIST = ['pending', 'partial', 'completed', 'advance'] as const

// ─── Create ───────────────────────────────────────────────────────────────────

export const createPaymentSchema = z
    .object({
        customer_id: z.string().min(1, 'Customer is required'),
        payment_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'payment_date must be YYYY-MM-DD'),
        billing_start_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'billing_start_date must be YYYY-MM-DD'),
        billing_end_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'billing_end_date must be YYYY-MM-DD'),
        total_bill_amount: z
            .number({ message: 'Total bill amount is required' })
            .min(0, 'Amount cannot be negative'),
        paid_amount: z
            .number({ message: 'Paid amount is required' })
            .min(0, 'Amount cannot be negative'),
        payment_method: z.enum(PAYMENT_METHODS_LIST, { message: 'Invalid payment method' }),
        reference_number: z.string().max(100, 'Reference too long').trim().optional(),
        notes: z.string().max(500, 'Notes too long').trim().optional(),
        collected_by: z.string().max(100, 'Name too long').trim().optional(),
    })
    .refine(
        (d) => new Date(d.billing_end_date) >= new Date(d.billing_start_date),
        {
            message: 'End date must be on or after start date',
            path: ['billing_end_date'],
        }
    )

// ─── Update ───────────────────────────────────────────────────────────────────

export const updatePaymentSchema = z.object({
    paid_amount: z
        .number({ message: 'Paid amount is required' })
        .min(0, 'Amount cannot be negative')
        .optional(),
    payment_method: z
        .enum(PAYMENT_METHODS_LIST, { message: 'Invalid payment method' })
        .optional(),
    payment_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'payment_date must be YYYY-MM-DD')
        .optional(),
    reference_number: z.string().max(100, 'Reference too long').trim().optional(),
    notes: z.string().max(500, 'Notes too long').trim().optional(),
    collected_by: z.string().max(100, 'Name too long').trim().optional(),
})

// ─── Generate Bill ────────────────────────────────────────────────────────────

export const generateBillSchema = z
    .object({
        customer_id: z.string().min(1, 'Customer is required'),
        billing_start_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'billing_start_date must be YYYY-MM-DD'),
        billing_end_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'billing_end_date must be YYYY-MM-DD'),
    })
    .refine(
        (d) => new Date(d.billing_end_date) >= new Date(d.billing_start_date),
        {
            message: 'End date must be on or after start date',
            path: ['billing_end_date'],
        }
    )

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
export type GenerateBillInput = z.infer<typeof generateBillSchema>
