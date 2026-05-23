import "server-only"
import { dbConnect } from "@/lib/mongodb"
import Payment from "@/models/payment.model"
import Customer from "@/models/customer.model"
import { checkAuth } from "@/lib/checkAuth"
import { success, internalServerError } from "@/lib/apiResponse"

void Customer   // register model for populate

function initials(name: string): string {
    return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

function daysSince(date: Date): number {
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
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
            const customer = p.customer_id as unknown as { full_name: string } | null
            const name = customer?.full_name ?? "Unknown"
            return {
                id:            String(p._id),
                customer:      name,
                avatar:        initials(name),
                pendingAmount: p.remaining_amount,
                lastPayment:   (p.payment_date as Date).toISOString().split("T")[0],
                daysOverdue:   daysSince(p.payment_date as Date),
            }
        })

        return success(data, "Pending payments fetched")
    } catch (e) {
        return internalServerError(e)
    }
}
