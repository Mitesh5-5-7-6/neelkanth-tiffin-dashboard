import "server-only"
import type { NextRequest } from "next/server"
import { dbConnect } from "@/lib/mongodb"
import TiffinEntry from "@/models/tiffin-entry.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"
import { parseRequestRange } from "@/lib/dashboard-dates"

function initials(name: string): string {
    return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { start, end } = parseRequestRange(request)

        const rows = await TiffinEntry.aggregate([
            { $match: { entry_date: { $gte: start, $lt: end } } },
            { $group: { _id: "$customer_id", totalTiffins: { $sum: "$total_qty" }, totalAmount: { $sum: "$total_amount" } } },
            // Rank by tiffin count (matches the card's "By total tiffins"),
            // breaking ties by billed amount.
            { $sort: { totalTiffins: -1, totalAmount: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "customers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: "$customer" },
            { $project: { _id: 0, name: "$customer.full_name", totalTiffins: 1, totalAmount: 1 } },
        ])

        const data = rows.map((r, i) => ({
            rank:         i + 1,
            name:         r.name as string,
            avatar:       initials(r.name as string),
            totalTiffins: r.totalTiffins as number,
            totalAmount:  r.totalAmount  as number,
        }))

        return success(data, "Top customers fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
