import mongoose, { Schema, type HydratedDocument } from 'mongoose'
import type { ITiffinEntry } from '@/types/tiffin.type'

const TiffinEntrySchema = new Schema<ITiffinEntry>(
    {
        customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        entry_date: { type: Date, required: true },
        morning_qty: { type: Number, required: true, default: 0, min: 0, max: 10 },
        evening_qty: { type: Number, required: true, default: 0, min: 0, max: 10 },
        morning_price: { type: Number, required: true, default: 30, min: 0 },
        evening_price: { type: Number, required: true, default: 30, min: 0 },
        total_qty: { type: Number, required: true, default: 0, min: 0 },
        total_amount: { type: Number, required: true, default: 0, min: 0 },
        is_manual_price: { type: Boolean, default: false },
        morning_paid: { type: Boolean, default: false },
        evening_paid: { type: Boolean, default: false },
        notes: { type: String, trim: true },
        created_by: { type: String, trim: true },
    },
    { timestamps: true }
)

TiffinEntrySchema.index({ customer_id: 1, entry_date: 1 }, { unique: true })
TiffinEntrySchema.index({ entry_date: -1 })
TiffinEntrySchema.index({ customer_id: 1 })

export type TiffinEntryDocument = HydratedDocument<ITiffinEntry>

export default mongoose.models.TiffinEntry ||
    mongoose.model<ITiffinEntry>('TiffinEntry', TiffinEntrySchema)
