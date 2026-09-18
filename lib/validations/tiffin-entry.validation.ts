import { z } from "zod";

export const extraItemSchema = z.object({
  item: z
    .string()
    .trim()
    .min(1, "Item name is required")
    .max(50, "Item name too long"),
  qty: z
    .number({ message: "Quantity is required" })
    .int()
    .min(0, "Quantity cannot be negative")
    .max(100, "Quantity too high"),
  price: z
    .number({ message: "Price is required" })
    .min(0, "Price cannot be negative")
    .max(10_000, "Price too high"),
});

export const bulkEntryInputSchema = z.object({
  customer_id: z.string().min(1, "Customer ID is required"),
  morning_qty: z
    .number({ message: "Morning quantity is required" })
    .int()
    .min(0, "Quantity cannot be negative")
    .max(100, "Quantity too high"),
  morning_price: z
    .number({ message: "Morning price is required" })
    .min(0, "Price cannot be negative")
    .max(10_000, "Price too high"),
  evening_qty: z
    .number({ message: "Evening quantity is required" })
    .int()
    .min(0, "Quantity cannot be negative")
    .max(100, "Quantity too high"),
  evening_price: z
    .number({ message: "Evening price is required" })
    .min(0, "Price cannot be negative")
    .max(10_000, "Price too high"),
  is_manual_price: z.boolean().optional().default(false),
  morning_paid: z.boolean().optional().default(false),
  evening_paid: z.boolean().optional().default(false),
  extras: z.array(extraItemSchema).optional().default([]),
  notes: z.string().max(500, "Notes too long").trim().optional(),
});

export const bulkSaveSchema = z.object({
  entry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "entry_date must be YYYY-MM-DD"),
  entries: z
    .array(bulkEntryInputSchema)
    .min(1, "At least one entry required")
    .max(500, "Too many entries per request"),
});

export type BulkEntryInputSchema = z.infer<typeof bulkEntryInputSchema>;
export type BulkSaveSchema = z.infer<typeof bulkSaveSchema>;
