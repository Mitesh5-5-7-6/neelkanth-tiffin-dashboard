import mongoose, { Schema, type HydratedDocument } from 'mongoose'
import type { ITiffinEntry } from '@/types/tiffin.type'

const TiffinEntrySchema = new Schema<ITiffinEntry>(
    {
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        date: { type: Date, required: true },
        morning_qty: { type: Number, default: 0, min: 0 },
        evening_qty: { type: Number, default: 0, min: 0 },
        price_per_tiffin: { type: Number, required: true, min: 0 },
    },
    { timestamps: true }
)

// Prevent duplicate entries for the same customer on the same date
TiffinEntrySchema.index({ customerId: 1, date: 1 }, { unique: true })
TiffinEntrySchema.index({ date: -1 })

export type TiffinEntryDocument = HydratedDocument<ITiffinEntry>

export default mongoose.models.TiffinEntry ||
    mongoose.model<ITiffinEntry>('TiffinEntry', TiffinEntrySchema)
