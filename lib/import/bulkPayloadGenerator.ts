import type { BulkSavePayload, BulkEntryInput } from '@/types/tiffin.type'
import type { ImportPreviewRow } from '@/types/import.type'

export function buildBulkPayloads(rows: ImportPreviewRow[]): BulkSavePayload[] {
    const grouped = new Map<string, BulkEntryInput[]>()

    for (const row of rows) {
        if (row.status !== 'matched' || !row.customerId || !row.date) continue

        const entry: BulkEntryInput = {
            customer_id: row.customerId,
            morning_qty: row.morningQty,
            morning_price: row.morningPrice,
            morning_paid: row.morningPaid,
            evening_qty: row.eveningQty,
            evening_price: row.eveningPrice,
            evening_paid: row.eveningPaid,
        }

        const current = grouped.get(row.date) ?? []
        current.push(entry)
        grouped.set(row.date, current)
    }

    return Array.from(grouped.entries()).map(([entry_date, entries]) => ({ entry_date, entries }))
}
