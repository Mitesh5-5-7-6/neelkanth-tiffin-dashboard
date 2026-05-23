import "server-only"
import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import TiffinEntry from "@/models/tiffin-entry.model"
import Customer from "@/models/customer.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"
import { parseRequestRange } from "@/lib/dashboard-dates"

void Customer   // register model for populate

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { start, end } = parseRequestRange(request)
        const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get("limit") ?? "10"))

        const entries = await TiffinEntry.find({ entry_date: { $gte: start, $lt: end } })
            .sort({ entry_date: -1, createdAt: -1 })
            .limit(limit)
            .populate("customer_id", "full_name")
            .lean()

        const data = entries.map((e) => {
            const customer = e.customer_id as unknown as { full_name: string } | null
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
