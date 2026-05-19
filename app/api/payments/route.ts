import { type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongodb'
import Payment from '@/models/payment.model'
import Customer from '@/models/customer.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, created, badRequest, internalServerError } from '@/lib/apiResponse'
import { createPaymentSchema } from '@/lib/validations/payment.validation'
import type { PaymentStatus } from '@/types/payment.type'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── GET /api/payments ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const sp = request.nextUrl.searchParams

        const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
        const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '10')))
        const search = sp.get('search')?.trim() ?? ''
        const status = sp.get('status') ?? ''
        const start_date = sp.get('start_date') ?? ''
        const end_date = sp.get('end_date') ?? ''
        const customer_id = sp.get('customer_id') ?? ''

        // Pre-filter on the Payment collection before the $lookup
        const matchStage: Record<string, unknown> = {}
        if (status) matchStage.payment_status = status
        if (customer_id && mongoose.Types.ObjectId.isValid(customer_id)) {
            matchStage.customer_id = new mongoose.Types.ObjectId(customer_id)
        }
        if (start_date || end_date) {
            const dateFilter: Record<string, Date> = {}
            if (start_date) dateFilter.$gte = parseDate(start_date)
            if (end_date) dateFilter.$lte = parseDate(end_date)
            matchStage.payment_date = dateFilter
        }

        // Aggregate with customer join (needed for search by name/phone)
        const basePipeline: mongoose.PipelineStage[] = [
            { $match: matchStage },
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
            ...(search
                ? [
                    {
                        $match: {
                            $or: [
                                { 'customer.full_name': { $regex: search, $options: 'i' } },
                                { 'customer.phone': { $regex: search, $options: 'i' } },
                            ],
                        },
                    } as mongoose.PipelineStage,
                ]
                : []),
        ]

        const [countResult, payments] = await Promise.all([
            Payment.aggregate([...basePipeline, { $count: 'total' }]),
            Payment.aggregate([
                ...basePipeline,
                { $sort: { payment_date: -1, createdAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
            ]),
        ])

        const total = (countResult[0]?.total as number) ?? 0

        return success(payments, 'Payments fetched', {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        })
    } catch (e) {
        return internalServerError(e)
    }
}

// ─── POST /api/payments ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    const { session, error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const body = await request.json()

        const parsed = createPaymentSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const d = parsed.data

        const customer = await Customer.findById(d.customer_id).lean()
        if (!customer) return badRequest('Customer not found')

        const remaining_amount = d.total_bill_amount - d.paid_amount
        const payment_status = calcStatus(d.paid_amount, d.total_bill_amount)

        const payment = await Payment.create({
            customer_id: d.customer_id,
            payment_date: parseDate(d.payment_date),
            billing_start_date: parseDate(d.billing_start_date),
            billing_end_date: parseDate(d.billing_end_date),
            total_bill_amount: d.total_bill_amount,
            paid_amount: d.paid_amount,
            remaining_amount,
            payment_method: d.payment_method,
            payment_status,
            reference_number: d.reference_number,
            notes: d.notes,
            collected_by: d.collected_by ?? session?.user?.email ?? undefined,
        })

        return created(payment, 'Payment recorded successfully')
    } catch (e) {
        return internalServerError(e)
    }
}
