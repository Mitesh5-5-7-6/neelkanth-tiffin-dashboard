import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import Payment from '@/models/payment.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, internalServerError } from '@/lib/apiResponse'

export async function GET(_request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()

        const [result] = await Payment.aggregate([
            {
                $group: {
                    _id: null,
                    total_collected: { $sum: '$paid_amount' },
                    total_pending: {
                        $sum: {
                            $cond: [{ $gt: ['$remaining_amount', 0] }, '$remaining_amount', 0],
                        },
                    },
                    partial_count: {
                        $sum: { $cond: [{ $eq: ['$payment_status', 'partial'] }, 1, 0] },
                    },
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
            {
                $project: {
                    _id: 0,
                    total_collected: 1,
                    total_pending: 1,
                    partial_count: 1,
                    advance_balance: 1,
                },
            },
        ])

        return success(
            result ?? {
                total_collected: 0,
                total_pending: 0,
                partial_count: 0,
                advance_balance: 0,
            },
            'Payment stats fetched'
        )
    } catch (e) {
        return internalServerError(e)
    }
}
