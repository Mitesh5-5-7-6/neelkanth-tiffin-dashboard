import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import Payment from '@/models/payment.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, internalServerError } from '@/lib/apiResponse'

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const sp = request.nextUrl.searchParams

        const now = new Date()
        const year = parseInt(sp.get('year') ?? String(now.getFullYear()))
        const month = parseInt(sp.get('month') ?? String(now.getMonth() + 1))

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return badRequest('Valid year and month (1-12) are required')
        }

        const start = new Date(Date.UTC(year, month - 1, 1))
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

        const [summary, topCustomers] = await Promise.all([
            Payment.aggregate([
                { $match: { payment_date: { $gte: start, $lte: end } } },
                {
                    $group: {
                        _id: null,
                        total_collected: { $sum: '$paid_amount' },
                        total_pending: {
                            $sum: { $cond: [{ $eq: ['$payment_status', 'pending'] }, '$total_bill_amount', 0] },
                        },
                        total_partial: {
                            $sum: { $cond: [{ $eq: ['$payment_status', 'partial'] }, 1, 0] },
                        },
                        advance_count: {
                            $sum: { $cond: [{ $eq: ['$payment_status', 'advance'] }, 1, 0] },
                        },
                        payment_count: { $sum: 1 },
                        unique_customers: { $addToSet: '$customer_id' },
                    },
                },
            ]),
            Payment.aggregate([
                { $match: { payment_date: { $gte: start, $lte: end } } },
                { $group: { _id: '$customer_id', paid: { $sum: '$paid_amount' } } },
                { $sort: { paid: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'customers',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'customer',
                        pipeline: [{ $project: { full_name: 1 } }],
                    },
                },
                { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        customer_id: { $toString: '$_id' },
                        full_name: '$customer.full_name',
                        paid: 1,
                    },
                },
            ]),
        ])

        const s = summary[0] ?? {}
        return success(
            {
                year,
                month,
                total_collected: (s.total_collected as number) ?? 0,
                total_pending: (s.total_pending as number) ?? 0,
                total_partial: (s.total_partial as number) ?? 0,
                advance_count: (s.advance_count as number) ?? 0,
                payment_count: (s.payment_count as number) ?? 0,
                customer_count: Array.isArray(s.unique_customers) ? s.unique_customers.length : 0,
                top_customers: topCustomers,
            },
            'Monthly report fetched'
        )
    } catch (e) {
        return internalServerError(e)
    }
}
