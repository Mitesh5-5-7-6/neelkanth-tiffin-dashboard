import "server-only"
import { dbConnect } from "@/lib/mongodb"
import TiffinEntry from "@/models/tiffin-entry.model"
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

        const rows = await TiffinEntry.aggregate([
            { $match: { entry_date: { $gte: sevenDaysAgo, $lt: tomorrow } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$entry_date" } },
                    morning: { $sum: "$morning_qty" },
                    evening: { $sum: "$evening_qty" },
                },
            },
            { $sort: { _id: 1 } },
        ])

        const dataMap = new Map(rows.map((r) => [r._id as string, r]))

        const data = Array.from({ length: 7 }, (_, i) => {
            const d   = new Date(sevenDaysAgo.getTime() + i * 86_400_000)
            const iso = d.toISOString().split("T")[0]
            const row = dataMap.get(iso)
            return {
                date: DAY_LABELS[d.getUTCDay()],
                morning: row?.morning ?? 0,
                evening: row?.evening ?? 0,
            }
        })

        return success(data, "Tiffin trend fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
