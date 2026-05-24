import { type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongodb'
import TiffinEntry from '@/models/tiffin-entry.model'
import Payment from '@/models/payment.model'
import Customer from '@/models/customer.model'
import { checkAuth } from '@/lib/checkAuth'
import { created, badRequest, notFound, internalServerError } from '@/lib/apiResponse'
import { recordTiffinPaymentSchema } from '@/lib/validations/grouped-payment.validation'
import type { PaymentStatus } from '@/types/payment.type'

function calcStatus(paid: number, total: number): PaymentStatus {
    if (paid <= 0) return 'pending'
    if (paid > total) return 'advance'
    if (paid === total) return 'completed'
    return 'partial'
}

// ─── POST /api/nts/v1/payments ────────────────────────────────────────────────
// Records a payment for a specific tiffin entry and syncs the entry flags.

export async function POST(request: NextRequest) {
    const { session, error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const body = await request.json()

        const parsed = recordTiffinPaymentSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const { customerId, tiffinEntryId, amount, paymentMethod, paymentFor, notes } = parsed.data

        if (!mongoose.Types.ObjectId.isValid(customerId)) return badRequest('Invalid customer ID')
        if (!mongoose.Types.ObjectId.isValid(tiffinEntryId)) return badRequest('Invalid tiffin entry ID')

        const [customer, entry] = await Promise.all([
            Customer.findById(customerId).lean(),
            TiffinEntry.findById(tiffinEntryId).lean(),
        ])

        if (!customer) return notFound('Customer not found')
        if (!entry) return notFound('Tiffin entry not found')
        if (String(entry.customer_id) !== customerId) {
            return badRequest('Tiffin entry does not belong to this customer')
        }

        // ── Sync morning/evening paid flags on the tiffin entry ────────────────
        const entryUpdate: Record<string, boolean> = {}
        if (paymentFor === 'MORNING' || paymentFor === 'FULL_DAY') {
            entryUpdate.morning_paid = true
        }
        if (paymentFor === 'EVENING' || paymentFor === 'FULL_DAY') {
            entryUpdate.evening_paid = true
        }
        if (Object.keys(entryUpdate).length > 0) {
            await TiffinEntry.findByIdAndUpdate(tiffinEntryId, { $set: entryUpdate })
        }

        // ── Write to payment transaction log (reuses existing payments collection) ──
        const entryDate = entry.entry_date as Date
        const payment = await Payment.create({
            customer_id: new mongoose.Types.ObjectId(customerId),
            payment_date: new Date(),
            billing_start_date: entryDate,
            billing_end_date: entryDate,
            total_bill_amount: entry.total_amount,
            paid_amount: amount,
            remaining_amount: entry.total_amount - amount,
            payment_method: paymentMethod,
            payment_status: calcStatus(amount, entry.total_amount),
            notes,
            collected_by: session?.user?.email ?? undefined,
        })

        return created(
            { paymentId: String(payment._id), entryId: tiffinEntryId, syncedFlags: entryUpdate },
            'Payment recorded and tiffin entry synced'
        )
    } catch (e) {
        return internalServerError(e)
    }
}
