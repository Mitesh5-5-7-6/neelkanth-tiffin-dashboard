import "server-only"
import { dbConnect } from "@/lib/mongodb"
import TiffinEntry from "@/models/tiffin-entry.model"
import Expense from "@/models/expense.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export async function GET() {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const now = new Date()
        const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6))
        const tomorrow    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))

        const [revenueRows, expenseRows] = await Promise.all([
            TiffinEntry.aggregate([
                { $match: { entry_date: { $gte: sevenDaysAgo, $lt: tomorrow } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$entry_date" } },
                        revenue: { $sum: "$total_amount" },
                    },
                },
            ]),
            Expense.aggregate([
                { $match: { expense_date: { $gte: sevenDaysAgo, $lt: tomorrow }, is_deleted: false } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$expense_date" } },
                        expense: { $sum: "$amount" },
                    },
                },
            ]),
        ])

        const revenueMap = new Map(revenueRows.map((r) => [r._id as string, r.revenue as number]))
        const expenseMap = new Map(expenseRows.map((r) => [r._id as string, r.expense as number]))

        const data = Array.from({ length: 7 }, (_, i) => {
            const d   = new Date(sevenDaysAgo.getTime() + i * 86_400_000)
            const iso = d.toISOString().split("T")[0]
            return {
                date: DAY_LABELS[d.getUTCDay()],
                revenue: revenueMap.get(iso) ?? 0,
                expense: expenseMap.get(iso) ?? 0,
            }
        })

        return success(data, "Revenue vs expense fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
