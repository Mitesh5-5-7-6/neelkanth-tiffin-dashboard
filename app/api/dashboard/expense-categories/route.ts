import "server-only"
import { dbConnect } from "@/lib/mongodb"
import Expense from "@/models/expense.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"

export async function GET() {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const now = new Date()
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

        const rows = await Expense.aggregate([
            { $match: { expense_date: { $gte: monthStart }, is_deleted: false } },
            // Use first tag to avoid double-counting multi-category expenses
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
