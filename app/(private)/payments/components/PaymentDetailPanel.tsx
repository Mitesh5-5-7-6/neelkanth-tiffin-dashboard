"use client"

import { useRef } from "react"
import { format } from "date-fns"
import {
    X, Phone, MapPin, Calendar, IndianRupee, Printer,
    CreditCard, FileText, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Payment, PaymentStatus, PaymentMethod } from "@/types/payment.type"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}` }
function fmtDate(iso: string) {
    return format(new Date(iso), "d MMM yyyy")
}

function getInitials(name: string) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

const AVATAR_COLORS = ["bg-primary", "bg-success", "bg-warning", "bg-purple", "bg-danger"]
function avatarColor(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

// ─── Status & method labels ───────────────────────────────────────────────────

const STATUS_STYLES: Record<PaymentStatus, string> = {
    pending: "bg-warning/15 text-warning border-warning/30",
    partial: "bg-primary/15 text-primary border-primary/30",
    completed: "bg-success/15 text-success border-success/30",
    advance: "bg-purple/15 text-purple border-purple/30",
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: "Pending",
    partial: "Partial",
    completed: "Completed",
    advance: "Advance",
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
}

function DetailRow({
    label,
    value,
    valueClass,
}: {
    label: string
    value: string
    valueClass?: string
}) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted">{label}</span>
            <span className={cn("text-sm font-medium text-foreground", valueClass)}>{value}</span>
        </div>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentDetailPanelProps {
    payment: Payment
    onClose: () => void
    onEdit: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentDetailPanel({ payment, onClose, onEdit }: PaymentDetailPanelProps) {
    const receiptRef = useRef<HTMLDivElement>(null)

    function handlePrint() {
        const content = receiptRef.current?.innerHTML ?? ""
        const win = window.open("", "_blank", "width=400,height=600")
        if (!win) return
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Receipt</title>
                <style>
                    body { font-family: sans-serif; padding: 24px; max-width: 380px; margin: 0 auto; font-size: 13px; }
                    h1 { font-size: 18px; margin-bottom: 4px; }
                    p { margin: 0; color: #555; }
                    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { color: #888; }
                    .value { font-weight: 600; }
                    .total { font-size: 15px; }
                    hr { border: none; border-top: 1px dashed #ccc; margin: 12px 0; }
                    .header { text-align: center; margin-bottom: 16px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>${content}<br><br><p style="text-align:center;color:#aaa;font-size:11px">TiffinTrack — Thank you!</p></body>
            </html>
        `)
        win.document.close()
        win.focus()
        win.print()
        win.close()
    }

    const remaining = payment.remaining_amount
    const customer = payment.customer

    return (
        <div className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Payment Receipt</h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePrint}
                        title="Print receipt"
                        className="p-1.5 rounded-lg hover:bg-muted/20 text-muted hover:text-foreground transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-muted/20 text-muted transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Printable content */}
            <div className="flex-1 overflow-y-auto" ref={receiptRef}>
                {/* Status badge */}
                <div className="px-5 pt-5 pb-2">
                    <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
                        STATUS_STYLES[payment.payment_status]
                    )}>
                        {STATUS_LABELS[payment.payment_status]}
                    </span>
                </div>

                {/* Customer */}
                <div className="px-5 py-3">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Customer</p>
                    <div className="flex items-start gap-3">
                        {customer ? (
                            <>
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm",
                                    avatarColor(customer.full_name)
                                )}>
                                    {getInitials(customer.full_name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground">{customer.full_name}</p>
                                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted">
                                        <Phone className="w-3 h-3" />
                                        {customer.phone}
                                    </div>
                                    {customer.address && (
                                        <div className="flex items-start gap-1.5 mt-1 text-xs text-muted">
                                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{customer.address}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-muted text-sm">
                                <User className="w-4 h-4" />
                                Customer data unavailable
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Billing period */}
                <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Billing Period</p>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span>{fmtDate(payment.billing_start_date)}</span>
                        <span className="text-muted">–</span>
                        <span>{fmtDate(payment.billing_end_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        Payment date: {fmtDate(payment.payment_date)}
                    </div>
                </div>

                <Separator />

                {/* Amounts */}
                <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                        <IndianRupee className="w-3 h-3 inline" /> Amount Summary
                    </p>
                    <DetailRow label="Total Bill" value={fmt(payment.total_bill_amount)} />
                    <DetailRow
                        label="Amount Paid"
                        value={fmt(payment.paid_amount)}
                        valueClass="text-success"
                    />
                    <div className="border-t border-dashed border-border my-1.5" />
                    <DetailRow
                        label={remaining > 0 ? "Remaining" : remaining < 0 ? "Advance Bal." : "Balance"}
                        value={remaining < 0 ? `+${fmt(Math.abs(remaining))}` : fmt(Math.abs(remaining))}
                        valueClass={remaining > 0 ? "text-danger" : remaining < 0 ? "text-purple" : "text-success"}
                    />
                </div>

                <Separator />

                {/* Payment details */}
                <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                        <CreditCard className="w-3 h-3 inline" /> Payment Details
                    </p>
                    <DetailRow
                        label="Method"
                        value={METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                    />
                    {payment.reference_number && (
                        <DetailRow label="Reference" value={payment.reference_number} />
                    )}
                    {payment.collected_by && (
                        <DetailRow label="Collected by" value={payment.collected_by} />
                    )}
                </div>

                {payment.notes && (
                    <>
                        <Separator />
                        <div className="px-5 py-4">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                                <FileText className="w-3 h-3 inline" /> Notes
                            </p>
                            <p className="text-sm text-muted">{payment.notes}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 px-5 py-4 border-t border-border">
                <Button variant="outline" className="flex-1" onClick={onEdit}>
                    Edit
                </Button>
                <Button className="flex-1 gap-1.5" onClick={handlePrint}>
                    <Printer className="w-3.5 h-3.5" />
                    Print
                </Button>
            </div>
        </div>
    )
}
