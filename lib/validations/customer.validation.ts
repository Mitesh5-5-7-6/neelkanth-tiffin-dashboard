import { z } from 'zod';

export const createCustomerSchema = z.object({
    full_name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .trim(),
    phone: z
        .string()
        .min(1, 'Phone is required')
        .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    address: z.string().max(200, 'Address too long').trim().optional(),
    default_morning: z.boolean(),
    default_evening: z.boolean(),
    price_morning: z
        .number({ message: 'Morning price is required' })
        .min(0, 'Price cannot be negative')
        .max(10_000, 'Price too high'),
    price_evening: z
        .number({ message: 'Evening price is required' })
        .min(0, 'Price cannot be negative')
        .max(10_000, 'Price too high'),
    notes: z.string().max(500, 'Notes too long').trim().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
