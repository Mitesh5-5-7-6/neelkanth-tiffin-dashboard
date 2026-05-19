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

    const date = request.nextUrl.searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return badRequest('date query param is required (format: YYYY-MM-DD)')
    }

    try {
        await dbConnect()

        const dateObj = parseDate(date)
        const nextDay = new Date(dateObj.getTime() + 86_400_000)

        const entries = await TiffinEntry.find({
            entry_date: { $gte: dateObj, $lt: nextDay },
        })
            .populate('customer_id', 'full_name phone address')
            .lean()

        return success(entries, 'Tiffin entries fetched', { date, count: entries.length })
    } catch (e) {
        return internalServerError(e)
    }
}
