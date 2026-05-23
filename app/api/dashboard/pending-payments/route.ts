import "server-only"
import { dbConnect } from "@/lib/mongodb"
import Payment from "@/models/payment.model"
import Customer from "@/models/customer.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"

// Customer import required so Mongoose registers the model before populate
void Customer

function initials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
}

function daysDiff(from: Date): number {
    const ms = Date.now() - from.getTime()
    return Math.max(0, Math.floor(ms / 86_400_000))
}

export async function GET() {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()

        const payments = await Payment.find({ remaining_amount: { $gt: 0 } })
            .sort({ remaining_amount: -1 })
            .populate("customer_id", "full_name")
            .lean()

        const data = payments.map((p) => {
            const customer = p.customer_id as unknown as { _id: unknown; full_name: string } | null
            const name = customer?.full_name ?? "Unknown"
            return {
                id: String(p._id),
                customer: name,
                avatar: initials(name),
                pendingAmount: p.remaining_amount,
                lastPayment: (p.payment_date as Date).toISOString().split("T")[0],
                daysOverdue: daysDiff(p.payment_date as Date),
            }
        })

        return success(data, "Pending payments fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
