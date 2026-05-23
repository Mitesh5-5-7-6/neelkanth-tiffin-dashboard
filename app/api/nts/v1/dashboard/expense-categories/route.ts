import "server-only"
import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import Expense from "@/models/expense.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"
import { parseRequestRange } from "@/lib/dashboard-dates"

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { start, end } = parseRequestRange(request)

        const rows = await Expense.aggregate([
            { $match: { expense_date: { $gte: start, $lt: end }, is_deleted: false } },
            // Use the primary (first) category tag to avoid double-counting multi-tagged expenses
            { $project: { primaryCategory: { $arrayElemAt: ["$expense_category", 0] }, amount: 1 } },
            { $group: { _id: "$primaryCategory", amount: { $sum: "$amount" } } },
            { $sort: { amount: -1 } },
        ])

        return success(
            rows.map((r) => ({ category: r._id as string, amount: r.amount as number })),
            "Expense categories fetched"
        )
    } catch (e) {
        return internalServerError(e)
    }
}
