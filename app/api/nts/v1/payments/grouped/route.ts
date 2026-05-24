import { type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongodb'
import TiffinEntry from '@/models/tiffin-entry.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, internalServerError } from '@/lib/apiResponse'

function parseDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

function getDefaultDateRange() {
    const now = new Date()
    const y = now.getUTCFullYear()
    const mo = now.getUTCMonth()
    const d = now.getUTCDate()
    return {
        startDate: new Date(Date.UTC(y, mo, 1)),
        endDate: new Date(Date.UTC(y, mo, d, 23, 59, 59, 999)),
    }
}

// ─── GET /api/nts/v1/payments/grouped ─────────────────────────────────────────

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const sp = request.nextUrl.searchParams

        const { startDate: defStart, endDate: defEnd } = getDefaultDateRange()
        const startDate = sp.get('startDate') ? parseDate(sp.get('startDate')!) : defStart
        // endDate covers the full day
        const endDateRaw = sp.get('endDate')
        const endDate = endDateRaw
            ? new Date(parseDate(endDateRaw).getTime() + 86399999)
            : defEnd

        const customerId = sp.get('customerId') ?? ''
        const status = sp.get('status') ?? ''
        const search = sp.get('search')?.trim() ?? ''
        const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
        const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20')))

        // ── Initial match ───────────────────────────────────────────────────────
        const initialMatch: Record<string, unknown> = {
            entry_date: { $gte: startDate, $lte: endDate },
        }
        if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
            initialMatch.customer_id = new mongoose.Types.ObjectId(customerId)
        }

        const basePipeline: mongoose.PipelineStage[] = [
            { $match: initialMatch },
            // Sort descending so $push builds date-desc entries within each group
            { $sort: { entry_date: -1 } },
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
            // Optional search by name/phone after join
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
            // Calculate per-entry paid/pending amounts from boolean flags
            {
                $addFields: {
                    _morning_amt: { $cond: [{ $gt: ['$morning_qty', 0] }, '$morning_price', 0] },
                    _evening_amt: { $cond: [{ $gt: ['$evening_qty', 0] }, '$evening_price', 0] },
                },
            },
            {
                $addFields: {
                    _paid_amt: {
                        $add: [
                            {
                                $cond: [
                                    { $and: [{ $gt: ['$morning_qty', 0] }, { $eq: ['$morning_paid', true] }] },
                                    '$morning_price',
                                    0,
                                ],
                            },
                            {
                                $cond: [
                                    { $and: [{ $gt: ['$evening_qty', 0] }, { $eq: ['$evening_paid', true] }] },
                                    '$evening_price',
                                    0,
                                ],
                            },
                        ],
                    },
                    _pending_amt: {
                        $add: [
                            {
                                $cond: [
                                    { $and: [{ $gt: ['$morning_qty', 0] }, { $ne: ['$morning_paid', true] }] },
                                    '$morning_price',
                                    0,
                                ],
                            },
                            {
                                $cond: [
                                    { $and: [{ $gt: ['$evening_qty', 0] }, { $ne: ['$evening_paid', true] }] },
                                    '$evening_price',
                                    0,
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    _entry_status: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $and: [
                                            { $gt: ['$total_amount', 0] },
                                            { $eq: ['$_paid_amt', '$total_amount'] },
                                        ],
                                    },
                                    then: 'PAID',
                                },
                                { case: { $gt: ['$_paid_amt', 0] }, then: 'PARTIAL' },
                            ],
                            default: 'PENDING',
                        },
                    },
                },
            },
            // Group entries by customer
            {
                $group: {
                    _id: '$customer_id',
                    customerName: { $first: '$customer.full_name' },
                    phone: { $first: '$customer.phone' },
                    address: { $first: '$customer.address' },
                    totalAmount: { $sum: '$total_amount' },
                    totalPaid: { $sum: '$_paid_amt' },
                    totalPending: { $sum: '$_pending_amt' },
                    entryCount: { $sum: 1 },
                    entries: {
                        $push: {
                            entryId: { $toString: '$_id' },
                            date: '$entry_date',
                            morningQty: '$morning_qty',
                            morningPrice: '$morning_price',
                            morningPaid: '$morning_paid',
                            eveningQty: '$evening_qty',
                            eveningPrice: '$evening_price',
                            eveningPaid: '$evening_paid',
                            totalAmount: '$total_amount',
                            paidAmount: '$_paid_amt',
                            pendingAmount: '$_pending_amt',
                            status: '$_entry_status',
                        },
                    },
                },
            },
            // Customer-level status + serialise _id
            {
                $addFields: {
                    customerId: { $toString: '$_id' },
                    status: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $and: [
                                            { $gt: ['$totalAmount', 0] },
                                            { $eq: ['$totalPaid', '$totalAmount'] },
                                        ],
                                    },
                                    then: 'PAID',
                                },
                                { case: { $gt: ['$totalPaid', 0] }, then: 'PARTIAL' },
                            ],
                            default: 'PENDING',
                        },
                    },
                },
            },
            // Optional status filter
            ...(status ? [{ $match: { status } } as mongoose.PipelineStage] : []),
        ]

        // Single round-trip using $facet
        const [facetResult] = await TiffinEntry.aggregate([
            ...basePipeline,
            {
                $facet: {
                    data: [
                        { $sort: { customerName: 1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        { $project: { _id: 0 } },
                    ],
                    totalCount: [{ $count: 'total' }],
                    summary: [
                        {
                            $group: {
                                _id: null,
                                totalCustomers: { $sum: 1 },
                                totalAmount: { $sum: '$totalAmount' },
                                totalPaid: { $sum: '$totalPaid' },
                                totalPending: { $sum: '$totalPending' },
                            },
                        },
                    ],
                },
            },
        ])

        const customers = facetResult?.data ?? []
        const total: number = facetResult?.totalCount?.[0]?.total ?? 0
        const summaryRaw = facetResult?.summary?.[0]
        const summary = {
            totalCustomers: summaryRaw?.totalCustomers ?? 0,
            totalAmount: summaryRaw?.totalAmount ?? 0,
            totalPaid: summaryRaw?.totalPaid ?? 0,
            totalPending: summaryRaw?.totalPending ?? 0,
        }

        return success(
            { customers, summary },
            'Grouped payments fetched',
            { page, limit, total, totalPages: Math.ceil(total / limit) }
        )
    } catch (e) {
        return internalServerError(e)
    }
}
