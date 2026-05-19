import mongoose, { Schema, type HydratedDocument } from 'mongoose'
import type { IPayment } from '@/types/payment.type'

const PaymentSchema = new Schema<IPayment>(
    {
        customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        payment_date: { type: Date, required: true },
        billing_start_date: { type: Date, required: true },
        billing_end_date: { type: Date, required: true },
        total_bill_amount: { type: Number, required: true, min: 0 },
        paid_amount: { type: Number, required: true, min: 0 },
        remaining_amount: { type: Number, required: true },
        payment_method: {
            type: String,
            required: true,
            enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
        },
        payment_status: {
            type: String,
            required: true,
            enum: ['pending', 'partial', 'completed', 'advance'],
        },
        reference_number: { type: String, trim: true },
        notes: { type: String, trim: true },
        collected_by: { type: String, trim: true },
    },
    { timestamps: true }
)

// Compound index for per-customer payment history queries
PaymentSchema.index({ customer_id: 1, payment_date: -1 })
PaymentSchema.index({ payment_date: -1 })
PaymentSchema.index({ payment_status: 1 })
PaymentSchema.index({ billing_start_date: 1, billing_end_date: 1 })

export type PaymentDocument = HydratedDocument<IPayment>

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)
