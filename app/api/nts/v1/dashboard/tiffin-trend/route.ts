import "server-only"
import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import TiffinEntry from "@/models/tiffin-entry.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"
import { parseRequestRange, DAY_LABELS } from "@/lib/dashboard-dates"

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { start, end } = parseRequestRange(request)

        const rows = await TiffinEntry.aggregate([
            { $match: { entry_date: { $gte: start, $lt: end } } },
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

        // Build a point for every day in the requested range
        const days: unknown[] = []
        for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) {
            const d   = new Date(t)
            const iso = d.toISOString().split("T")[0]
            const row = dataMap.get(iso)
            days.push({
                date: DAY_LABELS[d.getUTCDay()],
                iso,
                morning: row?.morning ?? 0,
                evening: row?.evening ?? 0,
            })
        }

        return success(days, "Tiffin trend fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
