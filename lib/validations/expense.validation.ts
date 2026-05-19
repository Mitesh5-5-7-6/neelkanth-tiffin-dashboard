import { z } from 'zod'

export const EXPENSE_CATEGORIES_LIST = [
    'RAW_MATERIAL', 'VEGETABLES', 'MILK', 'GAS', 'SALARY', 'DELIVERY',
    'TRANSPORT', 'RENT', 'ELECTRICITY', 'INTERNET', 'PACKAGING',
    'MARKETING', 'MAINTENANCE', 'SOFTWARE', 'MISC',
] as const

export const EXPENSE_STATUSES_LIST = ['PENDING', 'PAID', 'PARTIAL', 'CANCELLED'] as const

export const EXPENSE_PAYMENT_METHODS_LIST = ['cash', 'upi', 'bank_transfer', 'cheque', 'credit'] as const

export const RECURRING_TYPES_LIST = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const

export const createExpenseSchema = z.object({
    title: z
        .string({ message: 'Title is required' })
        .min(2, 'Title must be at least 2 characters')
        .max(100, 'Title too long')
        .trim(),
    description: z.string().max(500, 'Description too long').trim().optional(),
    expense_category: z
        .array(z.enum(EXPENSE_CATEGORIES_LIST))
        .min(1, 'At least one category is required'),
    expense_subcategory: z.array(z.string().max(100).trim()).optional(),
    expense_date: z
        .string({ message: 'Date is required' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    amount: z
        .number({ message: 'Amount is required' })
        .positive('Amount must be greater than 0'),
    payment_method: z.enum(EXPENSE_PAYMENT_METHODS_LIST, { message: 'Payment method is required' }),
    vendor_id: z.string().optional(),
    vendor_name: z.string().max(100, 'Vendor name too long').trim().optional(),
    invoice_number: z.string().max(100, 'Invoice number too long').trim().optional(),
    receipt_url: z.string().url('Invalid URL').optional().or(z.literal('')),
    is_recurring: z.boolean().default(false),
    recurring_type: z.enum(RECURRING_TYPES_LIST).optional(),
    expense_status: z
        .enum(EXPENSE_STATUSES_LIST, { message: 'Status is required' })
        .default('PAID'),
    paid_by: z.string().max(100, 'Name too long').trim().optional(),
    notes: z.string().max(500, 'Notes too long').trim().optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial()

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
