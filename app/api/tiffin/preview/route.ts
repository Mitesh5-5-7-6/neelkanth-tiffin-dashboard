import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import Customer from '@/models/customer.model'
import TiffinEntry from '@/models/tiffin.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, internalServerError } from '@/lib/apiResponse'
import type { BulkPreviewRow } from '@/types/tiffin.type'

/** Parses a YYYY-MM-DD string into a midnight-UTC Date */
function parseDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    const fromDate = request.nextUrl.searchParams.get('fromDate')
    if (!fromDate || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
        return badRequest('fromDate query param is required (format: YYYY-MM-DD)')
    }

    try {
        await dbConnect()

        const dateObj = parseDate(fromDate)
        const nextDay = new Date(dateObj.getTime() + 86_400_000)

        const [customers, entries] = await Promise.all([
            Customer.find({ is_active: true }).lean(),
            TiffinEntry.find({ date: { $gte: dateObj, $lt: nextDay } }).lean(),
        ])

        // Build a fast lookup map: customerId → existing entry
        const entryMap = new Map(entries.map((e) => [String(e.customerId), e]))

        const rows: BulkPreviewRow[] = customers.map((c) => {
            const entry = entryMap.get(String(c._id))
            return {
                customerId: String(c._id),
                name: c.full_name,
                address: c.address,
                morning: entry ? entry.morning_qty > 0 : c.default_morning,
                evening: entry ? entry.evening_qty > 0 : c.default_evening,
                price: entry ? entry.price_per_tiffin : c.price_morning,
            }
        })

        return success(rows, 'Preview ready', { fromDate, count: rows.length })
    } catch (e) {
        return internalServerError(e)
    }
}
