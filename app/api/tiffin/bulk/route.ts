import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import TiffinEntry from '@/models/tiffin.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, internalServerError } from '@/lib/apiResponse'
import { z } from 'zod'

const bulkSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    entries: z
        .array(
            z.object({
                customerId: z.string().min(1),
                morning: z.boolean(),
                evening: z.boolean(),
                price: z.number().min(0).max(10_000),
            })
        )
        .min(1, 'At least one entry required')
        .max(500, 'Too many entries per request'),
})

function parseDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

export async function POST(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const body = await request.json()

        const parsed = bulkSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const { date, entries } = parsed.data
        const dateObj = parseDate(date)

        // Use bulkWrite with upsert to prevent duplicates
        const ops = entries.map((entry) => ({
            updateOne: {
                filter: { customerId: entry.customerId, date: dateObj },
                update: {
                    $set: {
                        morning_qty: entry.morning ? 1 : 0,
                        evening_qty: entry.evening ? 1 : 0,
                        price_per_tiffin: entry.price,
                    },
                },
                upsert: true,
            },
        }))

        const result = await TiffinEntry.bulkWrite(ops, { ordered: false })

        return success(
            {
                inserted: result.upsertedCount,
                updated: result.modifiedCount,
                total: entries.length,
            },
            `Saved ${entries.length} tiffin entries for ${date}`
        )
    } catch (e) {
        return internalServerError(e)
    }
}
