import "server-only"
import { dbConnect } from "@/lib/mongodb"
import TiffinEntry from "@/models/tiffin-entry.model"
import Expense from "@/models/expense.model"
import Payment from "@/models/payment.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"

function utcDayRange(offsetDays: number) {
    const d = new Date()
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDays))
    const end = new Date(start.getTime() + 86_400_000)
    return { start, end }
}

function pct(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 1000) / 10
}

export async function GET() {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const today = utcDayRange(0)
        const yesterday = utcDayRange(-1)

        const [
            todayTiffin,
            yestTiffin,
            todayRevenue,
            yestRevenue,
            todayExpense,
            yestExpense,
            pendingResult,
        ] = await Promise.all([
            TiffinEntry.aggregate([
                { $match: { entry_date: { $gte: today.start, $lt: today.end } } },
                { $group: { _id: null, morning: { $sum: "$morning_qty" }, evening: { $sum: "$evening_qty" }, total: { $sum: "$total_qty" } } },
            ]),
            TiffinEntry.aggregate([
                { $match: { entry_date: { $gte: yesterday.start, $lt: yesterday.end } } },
                { $group: { _id: null, morning: { $sum: "$morning_qty" }, evening: { $sum: "$evening_qty" }, total: { $sum: "$total_qty" } } },
            ]),
            TiffinEntry.aggregate([
                { $match: { entry_date: { $gte: today.start, $lt: today.end } } },
                { $group: { _id: null, amount: { $sum: "$total_amount" } } },
            ]),
            TiffinEntry.aggregate([
                { $match: { entry_date: { $gte: yesterday.start, $lt: yesterday.end } } },
                { $group: { _id: null, amount: { $sum: "$total_amount" } } },
            ]),
            Expense.aggregate([
                { $match: { expense_date: { $gte: today.start, $lt: today.end }, is_deleted: false } },
                { $group: { _id: null, amount: { $sum: "$amount" } } },
            ]),
            Expense.aggregate([
                { $match: { expense_date: { $gte: yesterday.start, $lt: yesterday.end }, is_deleted: false } },
                { $group: { _id: null, amount: { $sum: "$amount" } } },
            ]),
            Payment.aggregate([
                { $match: { remaining_amount: { $gt: 0 } } },
                {
                    $group: {
                        _id: null,
                        amount: { $sum: "$remaining_amount" },
                        customers: { $addToSet: "$customer_id" },
                    },
                },
                { $project: { _id: 0, amount: 1, customerCount: { $size: "$customers" } } },
            ]),
        ])

        const tT = todayTiffin[0]  ?? { morning: 0, evening: 0, total: 0 }
        const yT = yestTiffin[0]   ?? { morning: 0, evening: 0, total: 0 }
        const tR = todayRevenue[0]?.amount  ?? 0
        const yR = yestRevenue[0]?.amount   ?? 0
        const tE = todayExpense[0]?.amount  ?? 0
        const yE = yestExpense[0]?.amount   ?? 0
        const pd = pendingResult[0] ?? { amount: 0, customerCount: 0 }

        return success({
            todayTiffin: {
                total: tT.total,
                morning: tT.morning,
                evening: tT.evening,
                vsYesterday: pct(tT.total, yT.total),
            },
            todayRevenue: {
                amount: tR,
                vsYesterday: pct(tR, yR),
            },
            todayExpense: {
                amount: tE,
                vsYesterday: pct(tE, yE),
            },
            todayProfit: {
                amount: tR - tE,
                vsYesterday: pct(tR - tE, yR - yE),
            },
            pendingPayments: {
                amount: pd.amount,
                customerCount: pd.customerCount,
            },
        }, "Dashboard stats fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
