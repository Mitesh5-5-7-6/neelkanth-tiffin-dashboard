import mongoose, { Schema, type HydratedDocument } from 'mongoose'
import type { IExpense } from '@/types/expense.type'

const ExpenseSchema = new Schema<IExpense>(
    {
        expense_code:       { type: String, required: true, unique: true, trim: true },
        title:              { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
        description:        { type: String, trim: true, maxlength: 500 },
        expense_category:   {
            type: [String],
            required: true,
            enum: ['RAW_MATERIAL', 'VEGETABLES', 'MILK', 'GAS', 'SALARY', 'DELIVERY',
                   'TRANSPORT', 'RENT', 'ELECTRICITY', 'INTERNET', 'PACKAGING',
                   'MARKETING', 'MAINTENANCE', 'SOFTWARE', 'MISC'],
        },
        expense_subcategory: { type: [String] },
        expense_date:       { type: Date, required: true },
        amount:             { type: Number, required: true, min: 0.01 },
        payment_method:     {
            type: String,
            required: true,
            enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'credit'],
        },
        vendor_id:          { type: Schema.Types.ObjectId, ref: 'Vendor' },
        vendor_name:        { type: String, trim: true, maxlength: 100 },
        invoice_number:     { type: String, trim: true, maxlength: 100 },
        receipt_url:        { type: String, trim: true },
        is_recurring:       { type: Boolean, default: false },
        recurring_type:     { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
        expense_status:     {
            type: String,
            required: true,
            enum: ['PENDING', 'PAID', 'PARTIAL', 'CANCELLED'],
            default: 'PAID',
        },
        paid_by:            { type: String, trim: true, maxlength: 100 },
        notes:              { type: String, trim: true, maxlength: 500 },
        created_by:         { type: String, trim: true },
        is_deleted:         { type: Boolean, default: false, index: true },
        deleted_at:         { type: Date },
        deleted_by:         { type: String, trim: true },
    },
    { timestamps: true }
)

ExpenseSchema.index({ expense_date: -1 })
ExpenseSchema.index({ expense_category: 1 })
ExpenseSchema.index({ vendor_id: 1 })
ExpenseSchema.index({ expense_status: 1 })
ExpenseSchema.index({ createdAt: -1 })
ExpenseSchema.index({ expense_category: 1, expense_date: -1 })
ExpenseSchema.index({ vendor_id: 1, expense_date: -1 })
ExpenseSchema.index({ is_deleted: 1, expense_date: -1 })

export type ExpenseDocument = HydratedDocument<IExpense>

// Delete cached model so schema changes (e.g. String → [String]) take effect on reload
delete (mongoose.models as Record<string, unknown>).Expense
export default mongoose.model<IExpense>('Expense', ExpenseSchema)
