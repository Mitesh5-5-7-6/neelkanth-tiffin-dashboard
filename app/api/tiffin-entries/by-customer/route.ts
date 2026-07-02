import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import TiffinEntry from '@/models/tiffin-entry.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, internalServerError } from '@/lib/apiResponse'

function parseDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const sp = request.nextUrl.searchParams

        const customerId = sp.get('customer_id')
        const from = sp.get('from')
        const to = sp.get('to')

        if (!customerId) {
            return badRequest('customer_id query param is required')
        }

        if (!from || !to) {
            return badRequest('from and to query params are required (format: YYYY-MM-DD)')
        }

        const fromDate = parseDate(from)
        const toDate = new Date(parseDate(to).getTime() + 86_400_000) // Include entire end date

        const entries = await TiffinEntry.find({
            customer_id: customerId,
            entry_date: { $gte: fromDate, $lt: toDate },
        })
            .select('entry_date morning_qty morning_price evening_qty evening_price')
            .lean()

        // Transform to match invoice format
        const records = entries.map((e: any) => ({
            date: e.entry_date.toISOString().split('T')[0],
            morningQty: e.morning_qty || 0,
            morningRate: e.morning_price || 0,
            eveningQty: e.evening_qty || 0,
            eveningRate: e.evening_price || 0,
        }))

        return success(records, 'Tiffin records fetched', { from, to, count: records.length })
    } catch (e) {
        return internalServerError(e)
    }
}
