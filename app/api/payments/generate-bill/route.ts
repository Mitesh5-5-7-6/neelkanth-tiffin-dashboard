import { type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongodb'
import TiffinEntry from '@/models/tiffin-entry.model'
import Payment from '@/models/payment.model'
import Customer from '@/models/customer.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, notFound, internalServerError } from '@/lib/apiResponse'
import { generateBillSchema } from '@/lib/validations/payment.validation'

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

        const parsed = generateBillSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const { customer_id, billing_start_date, billing_end_date } = parsed.data

        if (!mongoose.Types.ObjectId.isValid(customer_id)) return notFound('Customer not found')

        const objectId = new mongoose.Types.ObjectId(customer_id)
        const startDate = parseDate(billing_start_date)
        // Include the full end day (up to midnight)
        const endDate = new Date(parseDate(billing_end_date).getTime() + 86_400_000 - 1)

        const [customer, tiffinAgg, prevPaymentsAgg] = await Promise.all([
            Customer.findById(customer_id).lean(),
            TiffinEntry.aggregate([
                {
                    $match: {
                        customer_id: objectId,
                        entry_date: { $gte: startDate, $lte: endDate },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total_amount: { $sum: '$total_amount' },
                        total_entries: { $sum: 1 },
                    },
                },
            ]),
            // All payments for periods that ended before this billing period starts
            // Group first by billing period to avoid double-counting total_bill_amount
            Payment.aggregate([
                {
                    $match: {
                        customer_id: objectId,
                        billing_end_date: { $lt: startDate },
                    },
                },
                {
                    $group: {
                        _id: { start: '$billing_start_date', end: '$billing_end_date' },
                        billed_for_period: { $max: '$total_bill_amount' },
                        paid_for_period: { $sum: '$paid_amount' },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total_billed: { $sum: '$billed_for_period' },
                        total_paid: { $sum: '$paid_for_period' },
                    },
                },
            ]),
        ])

        if (!customer) return notFound('Customer not found')

        const total_amount = (tiffinAgg[0]?.total_amount as number) ?? 0
        const total_entries = (tiffinAgg[0]?.total_entries as number) ?? 0

        const prev_billed = (prevPaymentsAgg[0]?.total_billed as number) ?? 0
        const prev_paid = (prevPaymentsAgg[0]?.total_paid as number) ?? 0
        const prev_balance = prev_billed - prev_paid

        const previous_pending = Math.max(0, prev_balance)
        const advance_deduction = Math.abs(Math.min(0, prev_balance))
        const final_payable = Math.max(0, total_amount + previous_pending - advance_deduction)

        return success(
            {
                customer_id,
                customer_name: customer.full_name,
                billing_start_date,
                billing_end_date,
                total_entries,
                total_amount,
                previous_pending,
                advance_deduction,
                final_payable,
            },
            'Bill calculated successfully'
        )
    } catch (e) {
        return internalServerError(e)
    }
}
