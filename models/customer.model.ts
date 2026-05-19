import mongoose, { Schema, type HydratedDocument } from 'mongoose';
import type { ICustomer } from '@/types/customer.type';

const TiffinDefaultsSchema = new Schema(
    {
        morning: { type: Boolean, default: true },
        morning_qty: { type: Number, required: true, default: 1, min: 1, max: 10 },
        morning_price: { type: Number, required: true, default: 30, min: 1 },
        evening: { type: Boolean, default: true },
        evening_qty: { type: Number, required: true, default: 1, min: 1, max: 10 },
        evening_price: { type: Number, required: true, default: 30, min: 1 },
    },
    { _id: false }
);

const CustomerSchema = new Schema<ICustomer>(
    {
        full_name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, unique: true, trim: true },
        address: { type: String, trim: true },
        notes: { type: String, trim: true },
        is_active: { type: Boolean, default: true },
        tiffin_defaults: { type: TiffinDefaultsSchema, required: true, default: () => ({}) },
    },
    { timestamps: true }
);

CustomerSchema.index({ phone: 1 }, { unique: true });
CustomerSchema.index({ full_name: 'text', phone: 'text' });
CustomerSchema.index({ is_active: 1 });
CustomerSchema.index({ createdAt: -1 });

export type CustomerDocument = HydratedDocument<ICustomer>;

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
