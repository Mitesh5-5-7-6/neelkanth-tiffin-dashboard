import { type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongodb'
import TiffinEntry from '@/models/tiffin-entry.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, notFound, internalServerError } from '@/lib/apiResponse'
import { updateEntryStatusSchema } from '@/lib/validations/grouped-payment.validation'

type RouteContext = { params: Promise<{ entryId: string }> }

// ─── PATCH /api/nts/v1/payments/:entryId/status ───────────────────────────────
// Bi-directional sync: updating payment status here writes back to tiffin entry.
// The grouped payments view re-aggregates from tiffin entries, so both modules
// reflect the change automatically.

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { entryId } = await params

        if (!mongoose.Types.ObjectId.isValid(entryId)) {
            return badRequest('Invalid entry ID')
        }

        const body = await request.json()
        const parsed = updateEntryStatusSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const { morningStatus, eveningStatus } = parsed.data
        const update: Record<string, unknown> = {}
        if (morningStatus !== undefined) update.morning_paid = morningStatus === 'PAID'
        if (eveningStatus !== undefined) update.evening_paid = eveningStatus === 'PAID'

        const entry = await TiffinEntry.findByIdAndUpdate(
            entryId,
            { $set: update },
            { new: true }
        ).lean()

        if (!entry) return notFound('Tiffin entry not found')

        // Recalculate summary fields inline (no separate storage needed — aggregation
        // computes these on-the-fly in the grouped endpoint)
        const morningAmt = entry.morning_qty > 0 ? entry.morning_price : 0
        const eveningAmt = entry.evening_qty > 0 ? entry.evening_price : 0
        const paidAmount =
            (entry.morning_qty > 0 && entry.morning_paid ? entry.morning_price : 0) +
            (entry.evening_qty > 0 && entry.evening_paid ? entry.evening_price : 0)
        const pendingAmount = morningAmt + eveningAmt - paidAmount

        return success(
            {
                entryId,
                morning_paid: entry.morning_paid,
                evening_paid: entry.evening_paid,
                totalAmount: entry.total_amount,
                paidAmount,
                pendingAmount,
                status:
                    paidAmount === entry.total_amount && entry.total_amount > 0
                        ? 'PAID'
                        : paidAmount > 0
                            ? 'PARTIAL'
                            : 'PENDING',
            },
            'Payment status updated'
        )
    } catch (e) {
        return internalServerError(e)
    }
}
