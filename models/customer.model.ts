import mongoose, { Schema, type HydratedDocument } from 'mongoose';
import type { ICustomer } from '@/types/customer.type';

const CustomerSchema = new Schema<ICustomer>(
    {
        full_name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, unique: true, trim: true },
        address: { type: String, trim: true },
        default_morning: { type: Boolean, default: true },
        default_evening: { type: Boolean, default: true },
        price_morning: { type: Number, required: true, default: 30, min: 0 },
        price_evening: { type: Number, required: true, default: 30, min: 0 },
        is_active: { type: Boolean, default: true },
        notes: { type: String, trim: true },
    },
    { timestamps: true }
);

CustomerSchema.index({ phone: 1 }, { unique: true });
CustomerSchema.index({ full_name: 'text', phone: 'text' });
CustomerSchema.index({ is_active: 1 });
CustomerSchema.index({ createdAt: -1 });

export type CustomerDocument = HydratedDocument<ICustomer>;

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
