import type { Document, Types } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORY = {
    RAW_MATERIAL: 'RAW_MATERIAL',
    VEGETABLES: 'VEGETABLES',
    MILK: 'MILK',
    GAS: 'GAS',
    SALARY: 'SALARY',
    DELIVERY: 'DELIVERY',
    TRANSPORT: 'TRANSPORT',
    RENT: 'RENT',
    ELECTRICITY: 'ELECTRICITY',
    INTERNET: 'INTERNET',
    PACKAGING: 'PACKAGING',
    MARKETING: 'MARKETING',
    MAINTENANCE: 'MAINTENANCE',
    SOFTWARE: 'SOFTWARE',
    MISC: 'MISC',
} as const
export type ExpenseCategory = typeof EXPENSE_CATEGORY[keyof typeof EXPENSE_CATEGORY]

export const EXPENSE_STATUS = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    PARTIAL: 'PARTIAL',
    CANCELLED: 'CANCELLED',
} as const
export type ExpenseStatus = typeof EXPENSE_STATUS[keyof typeof EXPENSE_STATUS]

export const EXPENSE_PAYMENT_METHOD = {
    CASH: 'cash',
    UPI: 'upi',
    BANK_TRANSFER: 'bank_transfer',
    CHEQUE: 'cheque',
    CREDIT: 'credit',
} as const
export type ExpensePaymentMethod = typeof EXPENSE_PAYMENT_METHOD[keyof typeof EXPENSE_PAYMENT_METHOD]

export const RECURRING_TYPE = {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
} as const
export type RecurringType = typeof RECURRING_TYPE[keyof typeof RECURRING_TYPE]

export const LEDGER_ENTRY_TYPE = {
    EXPENSE_CREATED: 'EXPENSE_CREATED',
    EXPENSE_UPDATED: 'EXPENSE_UPDATED',
    EXPENSE_PAID: 'EXPENSE_PAID',
    EXPENSE_CANCELLED: 'EXPENSE_CANCELLED',
    EXPENSE_RECURRING_GENERATED: 'EXPENSE_RECURRING_GENERATED',
} as const
export type LedgerEntryType = typeof LEDGER_ENTRY_TYPE[keyof typeof LEDGER_ENTRY_TYPE]

// ─── Display metadata ─────────────────────────────────────────────────────────

export const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; bgColor: string }> = {
    RAW_MATERIAL: { label: 'Raw Material', color: '#3b82f6', bgColor: '#dbeafe' },
    VEGETABLES:   { label: 'Vegetables',   color: '#22c55e', bgColor: '#dcfce7' },
    MILK:         { label: 'Milk / Dairy', color: '#f59e0b', bgColor: '#fef3c7' },
    GAS:          { label: 'Gas / Cylinder', color: '#ef4444', bgColor: '#fee2e2' },
    SALARY:       { label: 'Salary',       color: '#8b5cf6', bgColor: '#ede9fe' },
    DELIVERY:     { label: 'Delivery',     color: '#06b6d4', bgColor: '#cffafe' },
    TRANSPORT:    { label: 'Transport',    color: '#f97316', bgColor: '#ffedd5' },
    RENT:         { label: 'Rent',         color: '#ec4899', bgColor: '#fce7f3' },
    ELECTRICITY:  { label: 'Electricity',  color: '#eab308', bgColor: '#fef9c3' },
    INTERNET:     { label: 'Internet',     color: '#14b8a6', bgColor: '#ccfbf1' },
    PACKAGING:    { label: 'Packaging',    color: '#6366f1', bgColor: '#e0e7ff' },
    MARKETING:    { label: 'Marketing',    color: '#84cc16', bgColor: '#f7fee7' },
    MAINTENANCE:  { label: 'Maintenance',  color: '#78716c', bgColor: '#f5f5f4' },
    SOFTWARE:     { label: 'Software',     color: '#64748b', bgColor: '#f1f5f9' },
    MISC:         { label: 'Miscellaneous', color: '#9ca3af', bgColor: '#f3f4f6' },
}

export const SUBCATEGORY_MAP: Record<ExpenseCategory, string[]> = {
    RAW_MATERIAL: ['Rice', 'Dal', 'Flour', 'Oil', 'Spices', 'Sugar', 'Salt', 'Tea', 'Other'],
    VEGETABLES:   ['Onion', 'Potato', 'Tomato', 'Cabbage', 'Capsicum', 'Beans', 'Peas', 'Other'],
    MILK:         ['Milk', 'Paneer', 'Curd', 'Ghee', 'Butter', 'Other'],
    GAS:          ['LPG Cylinder', 'PNG Bill', 'Gas Equipment', 'Other'],
    SALARY:       ['Cook', 'Helper', 'Delivery Boy', 'Manager', 'Cleaner', 'Other Staff'],
    DELIVERY:     ['Petrol', 'Vehicle Repair', 'Vehicle Service', 'Toll', 'Parking', 'Other'],
    TRANSPORT:    ['Auto', 'Truck', 'Van', 'Cab', 'Other'],
    RENT:         ['Kitchen Rent', 'Office Rent', 'Storage Rent', 'Other'],
    ELECTRICITY:  ['Monthly Bill', 'Equipment', 'Wiring', 'Other'],
    INTERNET:     ['Monthly Bill', 'Setup', 'Equipment', 'Other'],
    PACKAGING:    ['Boxes', 'Bags', 'Containers', 'Tape', 'Labels', 'Other'],
    MARKETING:    ['Pamphlets', 'Online Ads', 'Banner', 'Branding', 'Other'],
    MAINTENANCE:  ['Kitchen Equipment', 'Vehicle', 'Plumbing', 'Electrical', 'Other'],
    SOFTWARE:     ['Subscription', 'License', 'Setup', 'Training', 'Other'],
    MISC:         ['Other'],
}

// ─── Mongoose document interfaces ─────────────────────────────────────────────

export interface IExpense extends Document {
    expense_code: string
    title: string
    description?: string
    expense_category: ExpenseCategory[]
    expense_subcategory?: string[]
    expense_date: Date
    amount: number
    payment_method: ExpensePaymentMethod
    vendor_id?: Types.ObjectId
    vendor_name?: string
    invoice_number?: string
    receipt_url?: string
    is_recurring: boolean
    recurring_type?: RecurringType
    expense_status: ExpenseStatus
    paid_by?: string
    notes?: string
    created_by?: string
    is_deleted: boolean
    deleted_at?: Date
    deleted_by?: string
    createdAt: Date
    updatedAt: Date
}

export interface IExpenseLedger extends Document {
    expense_id: Types.ObjectId
    entry_type: LedgerEntryType
    amount: number
    previous_status?: ExpenseStatus
    new_status?: ExpenseStatus
    changed_by?: string
    notes?: string
    createdAt: Date
    updatedAt: Date
}

// ─── Client-side shapes (ObjectIds serialised to strings) ─────────────────────

export interface Expense {
    _id: string
    expense_code: string
    title: string
    description?: string
    expense_category: ExpenseCategory[]
    expense_subcategory?: string[]
    expense_date: string
    amount: number
    payment_method: ExpensePaymentMethod
    vendor_id?: string
    vendor_name?: string
    invoice_number?: string
    receipt_url?: string
    is_recurring: boolean
    recurring_type?: RecurringType
    expense_status: ExpenseStatus
    paid_by?: string
    notes?: string
    created_by?: string
    createdAt: string
    updatedAt: string
}

// ─── Query / filter params ────────────────────────────────────────────────────

export interface ExpenseQueryParams {
    page?: number
    limit?: number
    search?: string
    category?: ExpenseCategory | ''
    status?: ExpenseStatus | ''
    payment_method?: ExpensePaymentMethod | ''
    start_date?: string
    end_date?: string
    vendor_id?: string
    is_recurring?: boolean
}

// ─── Stats / aggregation shapes ───────────────────────────────────────────────

export interface CategoryBreakdown {
    category: ExpenseCategory
    amount: number
    percentage: number
}

export interface PaymentMethodBreakdown {
    method: ExpensePaymentMethod
    amount: number
    percentage: number
}

export interface ExpenseStats {
    total_expense: number
    daily_average: number
    total_transactions: number
    top_category: CategoryBreakdown | null
    prev_total_expense: number
    prev_total_transactions: number
    today_expense: number
    monthly_expense: number
    pending_vendor_payments: number
    category_breakdown: CategoryBreakdown[]
    payment_method_breakdown: PaymentMethodBreakdown[]
    recent_expenses: Expense[]
    start_date: string
    end_date: string
    days_in_period: number
}
