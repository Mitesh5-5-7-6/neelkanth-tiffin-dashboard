"use client"

import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from "@tanstack/react-table"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { usePendingPayments, type PendingPayment } from "@/hooks/useDashboard"
import { cn } from "@/lib/utils"
import EmptyState from "@/components/dashboard/EmptyState"

const col = createColumnHelper<PendingPayment>()

const columns = [
    col.accessor("customer", {
        header: "Customer",
        cell: (info) => {
            const avatar = info.row.original.avatar
            return (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{avatar}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{info.getValue()}</span>
                </div>
            )
        },
    }),
    col.accessor("pendingAmount", {
        header: "Pending",
        cell: (info) => (
            <span className="text-sm font-bold text-danger">₹{info.getValue().toLocaleString("en-IN")}</span>
        ),
    }),
    col.accessor("lastPayment", {
        header: "Last Payment",
        cell: (info) => (
            <span className="text-xs text-muted-foreground">{info.getValue()}</span>
        ),
    }),
    col.accessor("daysOverdue", {
        header: "Overdue",
        cell: (info) => {
            const days = info.getValue()
            const cls =
                days > 14 ? "bg-danger/10 text-danger" :
                days > 7  ? "bg-warning/10 text-warning" :
                             "bg-muted/20 text-muted-foreground"
            return (
                <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-semibold", cls)}>
                    {days}d
                </span>
            )
        },
    }),
]

export default function PendingPaymentsTable() {
    const { data = [], isLoading, isError } = usePendingPayments()

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Pending Payments</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Customers with outstanding balance</p>
                </div>
                {!isLoading && data.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-danger/10 text-danger text-xs font-semibold">
                        {data.length} pending
                    </span>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id} className="border-b border-border bg-muted/20">
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} className="border-b border-border last:border-0">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <Skeleton className="h-4 w-full rounded" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : isError ? (
                            <tr>
                                <td colSpan={4}>
                                    <EmptyState
                                        icon={<AlertCircle className="w-5 h-5" />}
                                        title="Could not load payments"
                                        description="Failed to fetch payment data. It will retry automatically."
                                    />
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={4}>
                                    <EmptyState
                                        icon={<CheckCircle2 className="w-5 h-5 text-success" />}
                                        title="All caught up!"
                                        description="No pending payments — all customers are settled."
                                    />
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-4 py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
