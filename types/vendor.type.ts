import type { Document } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const VENDOR_TYPE = {
    VEGETABLE_SUPPLIER: 'Vegetable Supplier',
    MILK_SUPPLIER:      'Milk Supplier',
    GAS_AGENCY:         'Gas Agency',
    PACKAGING_VENDOR:   'Packaging Vendor',
    INTERNET_PROVIDER:  'Internet Provider',
    ELECTRICIAN:        'Electrician',
    DELIVERY_PARTNER:   'Delivery Partner',
    SOFTWARE_VENDOR:    'Software Vendor',
    MISCELLANEOUS:      'Miscellaneous',
} as const
export type VendorType = typeof VENDOR_TYPE[keyof typeof VENDOR_TYPE]

// ─── Mongoose document interface ──────────────────────────────────────────────

export interface IVendor extends Document {
    vendor_code: string
    name: string
    phone?: string
    alternate_phone?: string
    address?: string
    vendor_type: VendorType
    payment_terms?: string
    is_active: boolean
    notes?: string
    createdAt: Date
    updatedAt: Date
}

// ─── Client-side shape (ObjectIds serialised to strings) ─────────────────────

export interface Vendor {
    _id: string
    vendor_code: string
    name: string
    phone?: string
    alternate_phone?: string
    address?: string
    vendor_type: VendorType
    payment_terms?: string
    is_active: boolean
    notes?: string
    createdAt: string
    updatedAt: string
}

// ─── Query / filter params ────────────────────────────────────────────────────

export interface VendorQueryParams {
    page?: number
    limit?: number
    search?: string
    vendor_type?: VendorType | ''
    is_active?: boolean
}
