import { type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongodb'
import Payment from '@/models/payment.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, notFound, internalServerError } from '@/lib/apiResponse'
import { updatePaymentSchema } from '@/lib/validations/payment.validation'
import type { PaymentStatus } from '@/types/payment.type'

type RouteContext = { params: Promise<{ id: string }> }

function parseDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

function calcStatus(paid: number, total: number): PaymentStatus {
    if (paid <= 0) return 'pending'
    if (paid > total) return 'advance'
    if (paid === total) return 'completed'
    return 'partial'
}

// ─── GET /api/payments/[id] ───────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteContext) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params

        if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Payment not found')

        const [payment] = await Payment.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customer_id',
                    foreignField: '_id',
                    as: 'customer',
                    pipeline: [{ $project: { full_name: 1, phone: 1, address: 1 } }],
                },
            },
            { $unwind: '$customer' },
        ])

        if (!payment) return notFound('Payment not found')
        return success(payment, 'Payment fetched')
    } catch (e) {
        return internalServerError(e)
    }
}

// ─── PATCH /api/payments/[id] ─────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params

        if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Payment not found')

        const body = await request.json()
        const parsed = updatePaymentSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const existing = await Payment.findById(id)
        if (!existing) return notFound('Payment not found')

        const updates: Record<string, unknown> = {}

        if (parsed.data.payment_method !== undefined) updates.payment_method = parsed.data.payment_method
        if (parsed.data.reference_number !== undefined) updates.reference_number = parsed.data.reference_number
        if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes
        if (parsed.data.collected_by !== undefined) updates.collected_by = parsed.data.collected_by
        if (parsed.data.payment_date !== undefined) updates.payment_date = parseDate(parsed.data.payment_date)

        const new_paid = parsed.data.paid_amount ?? existing.paid_amount
        if (parsed.data.paid_amount !== undefined) updates.paid_amount = new_paid
        updates.remaining_amount = existing.total_bill_amount - new_paid
        updates.payment_status = calcStatus(new_paid, existing.total_bill_amount)

        const payment = await Payment.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean()

        return success(payment, 'Payment updated')
    } catch (e) {
        return internalServerError(e)
    }
}

// ─── DELETE /api/payments/[id] ────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params

        if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Payment not found')

        const payment = await Payment.findByIdAndDelete(id)
        if (!payment) return notFound('Payment not found')

        return success(null, 'Payment deleted')
    } catch (e) {
        return internalServerError(e)
    }
}
