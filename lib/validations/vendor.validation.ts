import { z } from 'zod'

export const VENDOR_TYPES_LIST = [
    'Vegetable Supplier', 'Milk Supplier', 'Gas Agency', 'Packaging Vendor',
    'Internet Provider', 'Electrician', 'Delivery Partner', 'Software Vendor', 'Miscellaneous',
] as const

const optionalPhone = z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number')
    .optional()
    .or(z.literal(''))

export const createVendorSchema = z.object({
    name: z
        .string({ message: 'Name is required' })
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .trim(),
    phone: optionalPhone,
    alternate_phone: optionalPhone,
    address: z.string().max(300, 'Address too long').trim().optional(),
    vendor_type: z.enum(VENDOR_TYPES_LIST, { message: 'Vendor type is required' }),
    payment_terms: z.string().max(200, 'Payment terms too long').trim().optional(),
    notes: z.string().max(500, 'Notes too long').trim().optional(),
})

export const updateVendorSchema = createVendorSchema.partial()

export type CreateVendorInput = z.infer<typeof createVendorSchema>
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>
