import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import TiffinEntry from '@/models/tiffin-entry.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, internalServerError } from '@/lib/apiResponse'
import { bulkSaveSchema } from '@/lib/validations/tiffin-entry.validation'

function parseDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

export async function POST(request: NextRequest) {
    const { session, error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const body = await request.json()

        const parsed = bulkSaveSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const { entry_date, entries } = parsed.data
        const dateObj = parseDate(entry_date)
        const created_by = session?.user?.email ?? undefined

        const ops = entries.map((entry) => {
            const total_qty = entry.morning_qty + entry.evening_qty
            const total_amount = (entry.morning_qty > 0 ? entry.morning_price : 0) + (entry.evening_qty > 0 ? entry.evening_price : 0)

            return {
                updateOne: {
                    filter: { customer_id: entry.customer_id, entry_date: dateObj },
                    update: {
                        $set: {
                            morning_qty: entry.morning_qty,
                            morning_price: entry.morning_price,
                            morning_paid: entry.morning_paid ?? false,
                            evening_qty: entry.evening_qty,
                            evening_price: entry.evening_price,
                            evening_paid: entry.evening_paid ?? false,
                            total_qty,
                            total_amount,
                            is_manual_price: entry.is_manual_price ?? false,
                            notes: entry.notes,
                            created_by,
                        },
                    },
                    upsert: true,
                },
            }
        })

        const result = await TiffinEntry.bulkWrite(ops, { ordered: false })

        return success(
            {
                inserted: result.upsertedCount,
                updated: result.modifiedCount,
                total: entries.length,
            },
            `Saved ${entries.length} tiffin entries for ${entry_date}`
        )
    } catch (e) {
        return internalServerError(e)
    }
}
