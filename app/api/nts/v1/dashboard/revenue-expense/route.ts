import "server-only"
import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import TiffinEntry from "@/models/tiffin-entry.model"
import Expense from "@/models/expense.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"
import { parseRequestRange, DAY_LABELS } from "@/lib/dashboard-dates"

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { start, end } = parseRequestRange(request)

        // Revenue = generated tiffin value (accrual) — better for trend charts
        const [revenueRows, expenseRows] = await Promise.all([
            TiffinEntry.aggregate([
                { $match: { entry_date: { $gte: start, $lt: end } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$entry_date" } },
                        revenue: { $sum: "$total_amount" },
                    },
                },
            ]),
            Expense.aggregate([
                { $match: { expense_date: { $gte: start, $lt: end }, is_deleted: false } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$expense_date" } },
                        expense: { $sum: "$amount" },
                    },
                },
            ]),
        ])

        const revMap  = new Map(revenueRows.map((r) => [r._id  as string, r.revenue  as number]))
        const expMap  = new Map(expenseRows.map((r) => [r._id  as string, r.expense  as number]))

        const days: unknown[] = []
        for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) {
            const d   = new Date(t)
            const iso = d.toISOString().split("T")[0]
            days.push({
                date: DAY_LABELS[d.getUTCDay()],
                iso,
                revenue: revMap.get(iso) ?? 0,
                expense: expMap.get(iso) ?? 0,
            })
        }

        return success(days, "Revenue vs expense fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
