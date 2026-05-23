import "server-only"
import { dbConnect } from "@/lib/mongodb"
import TiffinEntry from "@/models/tiffin-entry.model"
import Customer from "@/models/customer.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"

// Customer import is required so Mongoose registers the model before populate
void Customer

export async function GET() {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()

        const entries = await TiffinEntry.find()
            .sort({ entry_date: -1, createdAt: -1 })
            .limit(10)
            .populate("customer_id", "full_name")
            .lean()

        const data = entries.map((e) => {
            const customer = e.customer_id as unknown as { _id: unknown; full_name: string } | null
            return {
                id: String(e._id),
                date: (e.entry_date as Date).toISOString().split("T")[0],
                customer: customer?.full_name ?? "—",
                morning: e.morning_qty,
                evening: e.evening_qty,
                total: e.total_qty,
                amount: e.total_amount,
            }
        })

        return success(data, "Recent tiffin entries fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
