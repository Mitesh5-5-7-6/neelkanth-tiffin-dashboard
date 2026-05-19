"use client"

import { X, Phone, MapPin, Calendar, IndianRupee, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Customer } from "@/types/customer.type"
import { cn } from "@/lib/utils"

interface CustomerDetailPanelProps {
    customer: Customer
    onClose: () => void
    onEdit: () => void
}

function getInitials(name: string) {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
}

const avatarColors = ["bg-primary", "bg-success", "bg-warning", "bg-purple", "bg-danger"]

function getAvatarColor(name: string) {
    return avatarColors[name.charCodeAt(0) % avatarColors.length]
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted">{label}</span>
            <span className={cn("text-sm font-medium text-foreground", valueClass)}>{value}</span>
        </div>
    )
}

export default function CustomerDetailPanel({ customer, onClose, onEdit }: CustomerDetailPanelProps) {
    const joinedDate = new Date(customer.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })

    return (
        <div className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Customer Details</h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-muted/20 text-muted transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Profile */}
                <div className="px-5 py-5">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-base",
                            getAvatarColor(customer.full_name)
                        )}>
                            {getInitials(customer.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{customer.full_name}</h4>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{customer.phone}</span>
                        </div>
                        {customer.address && (
                            <div className="flex items-start gap-2 text-sm text-muted">
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{customer.address}</span>
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Tiffin Details */}
                <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Tiffin Details</p>
                    <DetailRow
                        label="Morning"
                        value={customer.tiffin_defaults?.morning
                            ? `${customer.tiffin_defaults.morning_qty} × ₹${customer.tiffin_defaults.morning_price}`
                            : "Off"}
                        valueClass={customer.tiffin_defaults?.morning ? "text-foreground" : "text-muted"}
                    />
                    <DetailRow
                        label="Evening"
                        value={customer.tiffin_defaults?.evening
                            ? `${customer.tiffin_defaults.evening_qty} × ₹${customer.tiffin_defaults.evening_price}`
                            : "Off"}
                        valueClass={customer.tiffin_defaults?.evening ? "text-foreground" : "text-muted"}
                    />
                    <div className="flex items-center gap-2 py-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted" />
                        <span className="text-sm text-muted">Joined</span>
                        <span className="text-sm font-medium text-foreground ml-auto">{joinedDate}</span>
                    </div>
                </div>

                <Separator />

                {/* Payment Summary */}
                <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Payment Summary</p>
                    <DetailRow label="Total Paid" value="₹0" valueClass="text-success" />
                    <DetailRow label="Total Pending" value="₹0" valueClass="text-danger" />
                    <DetailRow label="Last Payment" value="—" />
                    <button className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <IndianRupee className="w-3.5 h-3.5" />
                        View Payment History
                    </button>
                </div>

                <Separator />

                {/* Recent Tiffin Entries */}
                <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Recent Entries</p>
                        <button className="text-xs text-primary hover:underline flex items-center gap-1">
                            <History className="w-3 h-3" />
                            View All
                        </button>
                    </div>
                    <p className="text-sm text-muted italic">No entries yet</p>
                </div>

                {customer.notes && (
                    <>
                        <Separator />
                        <div className="px-5 py-4">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Notes</p>
                            <p className="text-sm text-muted">{customer.notes}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 px-5 py-4 border-t border-border">
                <Button variant="outline" className="flex-1" onClick={onEdit}>
                    Edit Customer
                </Button>
                <Button className="flex-1">
                    Add Payment
                </Button>
            </div>
        </div>
    )
}
