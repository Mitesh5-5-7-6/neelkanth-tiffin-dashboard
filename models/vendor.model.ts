import mongoose, { Schema, type HydratedDocument } from 'mongoose'
import type { IVendor } from '@/types/vendor.type'

const VendorSchema = new Schema<IVendor>(
    {
        vendor_code:    { type: String, required: true, unique: true, trim: true },
        name:           { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
        phone:          { type: String, trim: true },
        alternate_phone: { type: String, trim: true },
        address:        { type: String, trim: true, maxlength: 300 },
        vendor_type:    {
            type: String,
            required: true,
            enum: ['Vegetable Supplier', 'Milk Supplier', 'Gas Agency', 'Packaging Vendor',
                   'Internet Provider', 'Electrician', 'Delivery Partner', 'Software Vendor', 'Miscellaneous'],
        },
        payment_terms:  { type: String, trim: true, maxlength: 200 },
        is_active:      { type: Boolean, default: true },
        notes:          { type: String, trim: true, maxlength: 500 },
    },
    { timestamps: true }
)

VendorSchema.index({ name: 1 })
VendorSchema.index({ vendor_type: 1 })
VendorSchema.index({ is_active: 1 })

export type VendorDocument = HydratedDocument<IVendor>

export default mongoose.models.Vendor || mongoose.model<IVendor>('Vendor', VendorSchema)
