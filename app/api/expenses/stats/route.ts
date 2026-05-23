import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import Expense from '@/models/expense.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, internalServerError } from '@/lib/apiResponse'
import type {
    ExpenseStats, CategoryBreakdown, PaymentMethodBreakdown,
    ExpenseCategory, ExpensePaymentMethod,
} from '@/types/expense.type'

function startOfDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}

function endOfDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
}

function startOfMonth(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { searchParams } = new URL(request.url)

        const now = new Date()

        const startDate = searchParams.get('start_date')
            ? startOfDay(new Date(searchParams.get('start_date')!))
            : startOfMonth(now)

        const endDate = searchParams.get('end_date')
            ? endOfDay(new Date(searchParams.get('end_date')!))
            : endOfDay(now)

        const daysDiff = Math.max(
            1,
            Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        )

        // Previous period: same number of days immediately before
        const prevEndDate   = new Date(startDate.getTime() - 1000)
        const prevStartDate = new Date(prevEndDate.getTime() - daysDiff * 24 * 60 * 60 * 1000)

        const todayStart = startOfDay(now)
        const todayEnd   = endOfDay(now)
        const monthStart = startOfMonth(now)

        const baseFilter = { is_deleted: false }

        const [
            currentFacet,
            prevFacet,
            todayResult,
            monthResult,
            pendingResult,
            recentExpenses,
        ] = await Promise.all([
            // ── Current period: total + category + payment method ──────────────
            Expense.aggregate([
                { $match: { ...baseFilter, expense_date: { $gte: startDate, $lte: endDate } } },
                {
                    $facet: {
                        totals: [
                            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
                        ],
                        by_category: [
                            { $unwind: '$expense_category' },
                            { $group: { _id: '$expense_category', amount: { $sum: '$amount' } } },
                            { $sort: { amount: -1 } },
                        ],
                        by_payment_method: [
                            { $group: { _id: '$payment_method', amount: { $sum: '$amount' } } },
                            { $sort: { amount: -1 } },
                        ],
                    },
                },
            ]),

            // ── Previous period totals ─────────────────────────────────────────
            Expense.aggregate([
                { $match: { ...baseFilter, expense_date: { $gte: prevStartDate, $lte: prevEndDate } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]),

            // ── Today ──────────────────────────────────────────────────────────
            Expense.aggregate([
                { $match: { ...baseFilter, expense_date: { $gte: todayStart, $lte: todayEnd } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),

            // ── Current month ──────────────────────────────────────────────────
            Expense.aggregate([
                { $match: { ...baseFilter, expense_date: { $gte: monthStart, $lte: endOfDay(now) } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),

            // ── Pending vendor payments ────────────────────────────────────────
            Expense.aggregate([
                { $match: { ...baseFilter, expense_status: 'PENDING' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),

            // ── Recent 5 expenses ──────────────────────────────────────────────
            Expense.find(baseFilter)
                .sort({ expense_date: -1, createdAt: -1 })
                .limit(5)
                .lean(),
        ])

        const facet         = currentFacet[0] as {
            totals:            Array<{ total: number; count: number }>
            by_category:       Array<{ _id: string; amount: number }>
            by_payment_method: Array<{ _id: string; amount: number }>
        }
        const totalExpense      = facet.totals[0]?.total ?? 0
        const totalTransactions = facet.totals[0]?.count ?? 0
        const prevTotal         = prevFacet[0]?.total ?? 0
        const prevCount         = prevFacet[0]?.count ?? 0

        const categoryBreakdown: CategoryBreakdown[] = facet.by_category.map((c) => ({
            category:   c._id as ExpenseCategory,
            amount:     c.amount,
            percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 1000) / 10 : 0,
        }))

        const paymentBreakdown: PaymentMethodBreakdown[] = facet.by_payment_method.map((p) => ({
            method:     p._id as ExpensePaymentMethod,
            amount:     p.amount,
            percentage: totalExpense > 0 ? Math.round((p.amount / totalExpense) * 1000) / 10 : 0,
        }))

        const stats: ExpenseStats = {
            total_expense:           totalExpense,
            daily_average:           totalExpense > 0 ? Math.round(totalExpense / daysDiff) : 0,
            total_transactions:      totalTransactions,
            top_category:            categoryBreakdown[0] ?? null,
            prev_total_expense:      prevTotal,
            prev_total_transactions: prevCount,
            today_expense:           todayResult[0]?.total ?? 0,
            monthly_expense:         monthResult[0]?.total ?? 0,
            pending_vendor_payments: pendingResult[0]?.total ?? 0,
            category_breakdown:      categoryBreakdown,
            payment_method_breakdown: paymentBreakdown,
            recent_expenses:         recentExpenses as unknown as ExpenseStats['recent_expenses'],
            start_date:              startDate.toISOString().split('T')[0],
            end_date:                endDate.toISOString().split('T')[0],
            days_in_period:          daysDiff,
        }

        return success(stats, 'Expense stats fetched successfully')
    } catch (e) {
        return internalServerError(e)
    }
}
