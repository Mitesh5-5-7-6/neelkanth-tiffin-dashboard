"use client"

import { useState } from "react"
import { Calendar, Copy, Info, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCustomerStats } from "@/hooks/useCustomers"
import BulkCopyModal from "./BulkCopyModal"

function toISO(d: Date): string {
    return d.toISOString().split("T")[0]
}

function yesterday(): Date {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
}

function today(): Date {
    return new Date()
}

function formatDisplay(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function BulkCopySection() {
    const [fromDate, setFromDate] = useState(toISO(yesterday()))
    const [toDate, setToDate] = useState(toISO(today()))
    const [modalOpen, setModalOpen] = useState(false)

    const { data: statsData } = useCustomerStats()
    const activeCount = statsData?.data?.active ?? 0

    return (
        <>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h3 className="font-semibold text-foreground">Bulk Copy Tiffin Data</h3>
                        <p className="text-sm text-muted mt-0.5">
                            Copy tiffin data from a previous day to save time on data entry
                        </p>
                    </div>
                </div>

                {/* Date fields + action */}
                <div className="flex flex-wrap items-end gap-4 mt-4">
                    {/* From date */}
                    <div className="space-y-1.5 flex-1 min-w-40">
                        <label className="text-xs font-medium text-muted uppercase tracking-wide">
                            Copy from date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                value={fromDate}
                                max={toISO(today())}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="h-9 w-full rounded-lg border border-input bg-transparent pl-3 pr-9 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                            />
                            <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="pb-1.5 text-muted font-medium">→</div>

                    {/* To date */}
                    <div className="space-y-1.5 flex-1 min-w-40">
                        <label className="text-xs font-medium text-muted uppercase tracking-wide">
                            Copy to date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="h-9 w-full rounded-lg border border-input bg-transparent pl-3 pr-9 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                            />
                            <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Customer filter */}
                    <div className="space-y-1.5 flex-1 min-w-48">
                        <label className="text-xs font-medium text-muted uppercase tracking-wide">
                            Copy for customers
                        </label>
                        <div className="relative">
                            <select className="h-9 w-full appearance-none rounded-lg border border-input bg-transparent pl-3 pr-9 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20">
                                <option value="all_active">
                                    All Active Customers ({activeCount})
                                </option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* CTA */}
                    <Button
                        onClick={() => setModalOpen(true)}
                        disabled={!fromDate || !toDate}
                        className="gap-2 h-9 shrink-0"
                    >
                        <Copy className="w-4 h-4" />
                        Preview &amp; Copy
                    </Button>
                </div>

                {/* Info banner */}
                {fromDate && toDate && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5 text-sm text-primary">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            This will copy morning, evening tiffin data and status from{" "}
                            <strong>{formatDisplay(fromDate)}</strong> to{" "}
                            <strong>{formatDisplay(toDate)}</strong> for{" "}
                            <strong>{activeCount} customers</strong>.
                        </span>
                    </div>
                )}
            </div>

            <BulkCopyModal
                open={modalOpen}
                fromDate={fromDate}
                toDate={toDate}
                onClose={() => setModalOpen(false)}
            />
        </>
    )
}
