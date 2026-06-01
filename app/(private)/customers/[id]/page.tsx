"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Phone, MapPin, Calendar, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useCustomer } from "@/hooks/useCustomers"
import { useCustomerPaymentSummary } from "@/hooks/usePayments"
import { cn } from "@/lib/utils"

function formatINR(n: number) {
    return `₹${n.toLocaleString("en-IN")}`
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
}

const avatarColors = ["bg-primary", "bg-success", "bg-warning", "bg-purple", "bg-danger"]

function getInitials(name: string) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

function getAvatarColor(name: string) {
    return avatarColors[name.charCodeAt(0) % avatarColors.length]
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted">{label}</span>
            <span className={cn("text-sm font-medium text-foreground", valueClass)}>{value}</span>
        </div>
    )
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { data, isLoading, isError } = useCustomer(id)
    const customer = data?.data
    const { data: summaryData, isLoading: summaryLoading } = useCustomerPaymentSummary(id)
    const summary = summaryData?.data
    const lastPayment = summary?.payments?.[0]

    function goToPayments(opts: { newPayment?: boolean } = {}) {
        const sp = new URLSearchParams({ customer_id: id })
        if (opts.newPayment) sp.set("new", "1")
        router.push(`/payments?${sp.toString()}`)
    }

    if (isLoading) {
        return (
            <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center gap-4 px-6 py-4 border-b border-border">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-40" />
                </header>
                <div className="p-6 space-y-4">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        )
    }

    if (isError || !customer) {
        return (
            <div className="flex flex-col flex-1 items-center justify-center gap-3">
                <p className="text-muted">Customer not found</p>
                <Link href="/customers">
                    <Button variant="outline">Back to Customers</Button>
                </Link>
            </div>
        )
    }

    const joinedDate = new Date(customer.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/customers">
                        <Button variant="ghost" size="icon-sm">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">{customer.full_name}</h1>
                        <p className="text-sm text-muted">Customer Profile</p>
                    </div>
                </div>
                <Button variant="outline" className="gap-1.5">
                    <Pencil className="w-4 h-4" />
                    Edit
                </Button>
            </header>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-3xl mx-auto space-y-5">
                    {/* Profile card */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <div className="flex items-center gap-5">
                            <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl",
                                getAvatarColor(customer.full_name)
                            )}>
                                {getInitials(customer.full_name)}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">{customer.full_name}</h2>
                                <Badge variant={customer.is_active ? "success" : "destructive"} className="mt-1">
                                    {customer.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <Phone className="w-4 h-4" />
                                {customer.phone}
                            </div>
                            {customer.address && (
                                <div className="flex items-center gap-2 text-sm text-muted">
                                    <MapPin className="w-4 h-4" />
                                    {customer.address}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <Calendar className="w-4 h-4" />
                                Joined {joinedDate}
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        {/* Tiffin settings */}
                        <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Tiffin Defaults</p>
                            <InfoRow
                                label="Morning"
                                value={customer.tiffin_defaults.morning
                                    ? `${customer.tiffin_defaults.morning_qty} × ₹${customer.tiffin_defaults.morning_price}`
                                    : "Disabled"}
                                valueClass={customer.tiffin_defaults.morning ? "text-success" : "text-muted"}
                            />
                            <InfoRow
                                label="Evening"
                                value={customer.tiffin_defaults.evening
                                    ? `${customer.tiffin_defaults.evening_qty} × ₹${customer.tiffin_defaults.evening_price}`
                                    : "Disabled"}
                                valueClass={customer.tiffin_defaults.evening ? "text-success" : "text-muted"}
                            />
                            <InfoRow
                                label="Daily Total"
                                value={`₹${
                                    (customer.tiffin_defaults.morning ? customer.tiffin_defaults.morning_qty * customer.tiffin_defaults.morning_price : 0) +
                                    (customer.tiffin_defaults.evening ? customer.tiffin_defaults.evening_qty * customer.tiffin_defaults.evening_price : 0)
                                }`}
                            />
                        </div>

                        {/* Payment summary */}
                        <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Payment Summary</p>
                            {summaryLoading ? (
                                <div className="space-y-2.5 py-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            ) : (
                                <>
                                    <InfoRow
                                        label="Total Paid"
                                        value={formatINR(summary?.total_paid ?? 0)}
                                        valueClass="text-success"
                                    />
                                    <InfoRow
                                        label="Total Pending"
                                        value={formatINR(summary?.outstanding ?? 0)}
                                        valueClass={summary && summary.outstanding > 0 ? "text-danger" : "text-muted"}
                                    />
                                    {summary && summary.advance_balance > 0 && (
                                        <InfoRow
                                            label="Advance Balance"
                                            value={formatINR(summary.advance_balance)}
                                            valueClass="text-primary"
                                        />
                                    )}
                                    <InfoRow
                                        label="Last Payment"
                                        value={
                                            lastPayment
                                                ? `${formatINR(lastPayment.paid_amount)} · ${formatDate(lastPayment.payment_date)}`
                                                : "—"
                                        }
                                    />
                                </>
                            )}
                            <Separator className="my-3" />
                            <Button className="w-full" onClick={() => goToPayments({ newPayment: true })}>
                                Add Payment
                            </Button>
                        </div>
                    </div>

                    {/* Tiffin entries placeholder */}
                    <div className="bg-card rounded-xl border border-border p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Recent Tiffin Entries</p>
                            <Button variant="ghost" size="sm">View All</Button>
                        </div>
                        <p className="text-sm text-muted italic text-center py-6">
                            No tiffin entries yet. Entries will appear here once tracked.
                        </p>
                    </div>

                    {customer.notes && (
                        <div className="bg-card rounded-xl border border-border p-5">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Notes</p>
                            <p className="text-sm text-muted">{customer.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
