import { z } from 'zod';

export const tiffinDefaultsSchema = z.object({
    morning: z.boolean(),
    morning_qty: z
        .number({ message: 'Morning quantity is required' })
        .int('Quantity must be a whole number')
        .min(1, 'Minimum quantity is 1')
        .max(50, 'Quantity too high'),
    morning_price: z
        .number({ message: 'Morning price is required' })
        .min(1, 'Price must be at least ₹1')
        .max(10_000, 'Price too high'),
    evening: z.boolean(),
    evening_qty: z
        .number({ message: 'Evening quantity is required' })
        .int('Quantity must be a whole number')
        .min(1, 'Minimum quantity is 1')
        .max(50, 'Quantity too high'),
    evening_price: z
        .number({ message: 'Evening price is required' })
        .min(1, 'Price must be at least ₹1')
        .max(10_000, 'Price too high'),
});

export const createCustomerSchema = z.object({
    full_name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .trim(),
    phone: z.preprocess(
        (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
        z.string().max(15, 'Phone number too long').trim().optional()
    ),
    address: z.string().max(200, 'Address too long').trim().optional(),
    notes: z.string().max(500, 'Notes too long').trim().optional(),
    tiffin_defaults: tiffinDefaultsSchema,
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
