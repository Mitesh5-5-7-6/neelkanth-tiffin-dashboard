import "server-only"
import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import Expense from "@/models/expense.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"
import { parseRequestRange } from "@/lib/dashboard-dates"

const CATEGORY_LABEL: Record<string, string> = {
    RAW_MATERIAL: "Raw Material",
    VEGETABLES:   "Vegetables",
    MILK:         "Milk",
    GAS:          "Gas / LPG",
    SALARY:       "Salary",
    DELIVERY:     "Delivery",
    TRANSPORT:    "Transport",
    RENT:         "Rent",
    ELECTRICITY:  "Electricity",
    INTERNET:     "Internet",
    PACKAGING:    "Packaging",
    MARKETING:    "Marketing",
    MAINTENANCE:  "Maintenance",
    SOFTWARE:     "Software",
    MISC:         "Miscellaneous",
}

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { start, end } = parseRequestRange(request)
        const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get("limit") ?? "10"))

        const expenses = await Expense.find({ expense_date: { $gte: start, $lt: end }, is_deleted: false })
            .sort({ expense_date: -1, createdAt: -1 })
            .limit(limit)
            .lean()

        const data = expenses.map((ex) => {
            const raw = (ex.expense_category as string[])[0] ?? "MISC"
            return {
                id:          String(ex._id),
                date:        (ex.expense_date as Date).toISOString().split("T")[0],
                category:    CATEGORY_LABEL[raw] ?? raw,
                description: ex.title,
                amount:      ex.amount,
            }
        })

        return success(data, "Recent expenses fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
