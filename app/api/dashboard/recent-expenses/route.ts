import "server-only"
import { dbConnect } from "@/lib/mongodb"
import Expense from "@/models/expense.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"

const CATEGORY_LABEL: Record<string, string> = {
    RAW_MATERIAL: "Raw Material",
    VEGETABLES: "Vegetables",
    MILK: "Milk",
    GAS: "Gas / LPG",
    SALARY: "Salary",
    DELIVERY: "Delivery",
    TRANSPORT: "Transport",
    RENT: "Rent",
    ELECTRICITY: "Electricity",
    INTERNET: "Internet",
    PACKAGING: "Packaging",
    MARKETING: "Marketing",
    MAINTENANCE: "Maintenance",
    SOFTWARE: "Software",
    MISC: "Miscellaneous",
}

export async function GET() {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()

        const expenses = await Expense.find({ is_deleted: false })
            .sort({ expense_date: -1, createdAt: -1 })
            .limit(10)
            .lean()

        const data = expenses.map((ex) => {
            const rawCategory = (ex.expense_category as string[])[0] ?? "MISC"
            return {
                id: String(ex._id),
                date: (ex.expense_date as Date).toISOString().split("T")[0],
                category: CATEGORY_LABEL[rawCategory] ?? rawCategory,
                description: ex.title,
                amount: ex.amount,
            }
        })

        return success(data, "Recent expenses fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
