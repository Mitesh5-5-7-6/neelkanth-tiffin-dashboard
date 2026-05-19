import { type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongodb'
import Payment from '@/models/payment.model'
import TiffinEntry from '@/models/tiffin-entry.model'
import Customer from '@/models/customer.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, notFound, internalServerError } from '@/lib/apiResponse'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params

        if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Customer not found')

        const objectId = new mongoose.Types.ObjectId(id)

        const [customer, tiffinAgg, paymentAgg, payments] = await Promise.all([
            Customer.findById(id).lean(),
            TiffinEntry.aggregate([
                { $match: { customer_id: objectId } },
                { $group: { _id: null, total: { $sum: '$total_amount' } } },
            ]),
            Payment.aggregate([
                { $match: { customer_id: objectId } },
                {
                    $group: {
                        _id: null,
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
            Payment.find({ customer_id: objectId }).sort({ payment_date: -1 }).lean(),
        ])

        if (!customer) return notFound('Customer not found')

        const total_bill = (tiffinAgg[0]?.total as number) ?? 0
        const total_paid = (paymentAgg[0]?.total_paid as number) ?? 0
        const advance_balance = (paymentAgg[0]?.advance_balance as number) ?? 0
        const outstanding = Math.max(0, total_bill - total_paid)

        return success(
            {
                customer_id: id,
                full_name: customer.full_name,
                phone: customer.phone,
                address: customer.address,
                total_bill,
                total_paid,
                outstanding,
                advance_balance,
                payments,
            },
            'Customer payment summary fetched'
        )
    } catch (e) {
        return internalServerError(e)
    }
}
