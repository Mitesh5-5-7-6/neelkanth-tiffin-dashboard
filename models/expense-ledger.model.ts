import mongoose, { Schema, type HydratedDocument } from 'mongoose'
import type { IExpenseLedger } from '@/types/expense.type'

const ExpenseLedgerSchema = new Schema<IExpenseLedger>(
    {
        expense_id:      { type: Schema.Types.ObjectId, ref: 'Expense', required: true },
        entry_type:      {
            type: String,
            required: true,
            enum: ['EXPENSE_CREATED', 'EXPENSE_UPDATED', 'EXPENSE_PAID',
                   'EXPENSE_CANCELLED', 'EXPENSE_RECURRING_GENERATED'],
        },
        amount:          { type: Number, required: true },
        previous_status: { type: String },
        new_status:      { type: String },
        changed_by:      { type: String, trim: true },
        notes:           { type: String, trim: true, maxlength: 500 },
    },
    { timestamps: true }
)

ExpenseLedgerSchema.index({ expense_id: 1 })
ExpenseLedgerSchema.index({ createdAt: -1 })

export type ExpenseLedgerDocument = HydratedDocument<IExpenseLedger>

export default mongoose.models.ExpenseLedger ||
    mongoose.model<IExpenseLedger>('ExpenseLedger', ExpenseLedgerSchema)
