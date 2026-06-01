import { type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongodb'
import Payment from '@/models/payment.model'
import TiffinEntry from '@/models/tiffin-entry.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, internalServerError } from '@/lib/apiResponse'

const MAX_IDS = 200

/**
 * GET /api/payments/customers-summary?ids=<csv of customer ids>
 *
 * Batched version of /api/payments/customer-summary/[id]. Returns one row
 * per requested id with billed / paid / outstanding / advance totals so the
 * customers table can render an "Outstanding" column without N+1 fetches.
 */
export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    const raw = request.nextUrl.searchParams.get('ids')
    if (!raw) return badRequest('ids query param required (comma-separated customer ids)')

    const ids = Array.from(new Set(raw.split(',').map((s) => s.trim()).filter(Boolean)))
    if (ids.length > MAX_IDS) return badRequest(`ids must contain at most ${MAX_IDS} entries`)

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id))
    if (validIds.length === 0) return success([], 'No valid ids supplied')

    try {
        await dbConnect()

        const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id))

        const [tiffinAggs, paymentAggs] = await Promise.all([
            TiffinEntry.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
                { $match: { customer_id: { $in: objectIds } } },
                { $group: { _id: '$customer_id', total: { $sum: '$total_amount' } } },
            ]),
            Payment.aggregate<{
                _id: mongoose.Types.ObjectId
                total_paid: number
                advance_balance: number
            }>([
                { $match: { customer_id: { $in: objectIds } } },
                {
                    $group: {
                        _id: '$customer_id',
                        total_paid: { $sum: '$paid_amount' },
                        advance_balance: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$payment_status', 'advance'] },
                                    { $abs: '$remaining_amount' },
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
        ])

        const tiffinMap = new Map(tiffinAggs.map((a) => [String(a._id), a.total]))
        const payMap = new Map(paymentAggs.map((a) => [String(a._id), a]))

        const result = validIds.map((id) => {
            const total_bill = tiffinMap.get(id) ?? 0
            const pay = payMap.get(id)
            const total_paid = pay?.total_paid ?? 0
            const advance_balance = pay?.advance_balance ?? 0
            const outstanding = Math.max(0, total_bill - total_paid)
            return { customer_id: id, total_bill, total_paid, outstanding, advance_balance }
        })

        return success(result, 'Customer summaries fetched', { count: result.length })
    } catch (e) {
        return internalServerError(e)
    }
}
