import type { Document, Types } from 'mongoose'

export interface ITiffinEntry extends Document {
    customerId: Types.ObjectId
    date: Date
    morning_qty: number
    evening_qty: number
    price_per_tiffin: number
    createdAt: Date
    updatedAt: Date
}

export interface TiffinEntry {
    _id: string
    customerId: string
    date: string
    morning_qty: number
    evening_qty: number
    price_per_tiffin: number
    createdAt: string
    updatedAt: string
}

/** One row in the bulk-copy preview grid */
export interface BulkPreviewRow {
    customerId: string
    name: string
    address?: string
    morning: boolean
    evening: boolean
    price: number
}

/** Payload for the bulk-save endpoint */
export interface BulkSavePayload {
    date: string                   // YYYY-MM-DD
    entries: BulkEntryInput[]
}

export interface BulkEntryInput {
    customerId: string
    morning: boolean
    evening: boolean
    price: number
}
