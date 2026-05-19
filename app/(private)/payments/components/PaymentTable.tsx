"use client"

import { useState, useMemo } from "react"
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from "@tanstack/react-table"
import { Eye, Pencil, Trash2, Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogFooter,
    DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Payment, PaymentStatus, PaymentQueryParams } from "@/types/payment.type"
import type { PaginationMeta } from "@/types/common.types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return `₹${n.toLocaleString("en-IN")}`
}

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

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PaymentStatus, string> = {
    pending: "bg-warning/15 text-warning",
    partial: "bg-primary/15 text-primary",
    completed: "bg-success/15 text-success",
    advance: "bg-purple/15 text-purple",
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: "Pending",
    partial: "Partial",
    completed: "Completed",
    advance: "Advance",
}

function StatusBadge({ status }: { status: PaymentStatus }) {
    return (
        <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            STATUS_STYLES[status]
        )}>
            {STATUS_LABELS[status]}
        </span>
    )
}

// ─── Method badge ─────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank",
    cheque: "Cheque",
}

function MethodBadge({ method }: { method: string }) {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted/20 text-foreground">
            {METHOD_LABELS[method] ?? method}
        </span>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentTableProps {
    payments: Payment[]
    isLoading: boolean
    meta?: PaginationMeta
    params: PaymentQueryParams
    onParamsChange: (p: PaymentQueryParams) => void
    onView: (p: Payment) => void
    onEdit: (p: Payment) => void
    onDelete: (id: string) => void
    selectedId?: string
}

const colHelper = createColumnHelper<Payment>()

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentTable({
    payments,
    isLoading,
    meta,
    params,
    onParamsChange,
    onView,
    onEdit,
    onDelete,
    selectedId,
}: PaymentTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null)
    const [sorting, setSorting] = useState<SortingState>([{ id: "payment_date", desc: true }])

    function handleSearch(value: string) {
        onParamsChange({ ...params, search: value, page: 1 })
    }

    function handleStatusFilter(value: string) {
        onParamsChange({ ...params, status: value === "all" ? "" : value as PaymentStatus, page: 1 })
    }

    function handlePage(page: number) {
        onParamsChange({ ...params, page })
    }

    const columns = useMemo(() => [
        colHelper.display({
            id: "index",
            header: "#",
            cell: ({ row }) => (
                <span className="text-muted text-xs">
                    {((params.page ?? 1) - 1) * (params.limit ?? 10) + row.index + 1}
                </span>
            ),
        }),
        colHelper.display({
            id: "customer",
            header: "Customer",
            cell: ({ row }) => {
                const c = row.original.customer
                if (!c) return <span className="text-muted text-xs">—</span>
                return (
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold",
                            avatarColor(c.full_name)
                        )}>
                            {getInitials(c.full_name)}
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{c.full_name}</p>
                            <p className="text-xs text-muted">{c.phone}</p>
                        </div>
                    </div>
                )
            },
        }),
        colHelper.accessor("payment_date", {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={column.getToggleSortingHandler()}
                >
                    Payment Date
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="w-3 h-3" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                </button>
            ),
            cell: (info) => (
                <span className="text-sm text-foreground">{fmtDate(info.getValue())}</span>
            ),
        }),
        colHelper.display({
            id: "billing_period",
            header: "Billing Period",
            cell: ({ row }) => {
                const p = row.original
                return (
                    <span className="text-xs text-muted whitespace-nowrap">
                        {fmtDate(p.billing_start_date)} – {fmtDate(p.billing_end_date)}
                    </span>
                )
            },
        }),
        colHelper.accessor("total_bill_amount", {
            header: () => <span className="flex justify-end">Total Bill</span>,
            cell: (info) => (
                <span className="flex justify-end text-sm font-medium text-foreground">
                    {fmt(info.getValue())}
                </span>
            ),
        }),
        colHelper.accessor("paid_amount", {
            header: () => <span className="flex justify-end">Paid</span>,
            cell: (info) => (
                <span className="flex justify-end text-sm font-semibold text-success">
                    {fmt(info.getValue())}
                </span>
            ),
        }),
        colHelper.accessor("remaining_amount", {
            header: () => <span className="flex justify-end">Remaining</span>,
            cell: (info) => {
                const val = info.getValue()
                return (
                    <span className={cn(
                        "flex justify-end text-sm font-semibold",
                        val > 0 ? "text-danger" : val < 0 ? "text-purple" : "text-muted"
                    )}>
                        {val < 0 ? `+${fmt(Math.abs(val))}` : fmt(val)}
                    </span>
                )
            },
        }),
        colHelper.accessor("payment_status", {
            header: "Status",
            cell: (info) => <StatusBadge status={info.getValue()} />,
        }),
        colHelper.accessor("payment_method", {
            header: "Method",
            cell: (info) => <MethodBadge method={info.getValue()} />,
        }),
        colHelper.display({
            id: "actions",
            header: () => <span className="flex justify-center">Actions</span>,
            cell: ({ row }) => {
                const p = row.original
                return (
                    <div
                        className="flex items-center justify-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => onView(p)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors"
                            title="View receipt"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-warning/10 text-muted hover:text-warning transition-colors"
                            title="Edit payment"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                            title="Delete payment"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )
            },
        }),
    ], [params, onView, onEdit])

    const table = useReactTable({
        data: payments,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
        onSortingChange: setSorting,
        manualPagination: true,
        pageCount: meta?.totalPages ?? -1,
    })

    const rightAlignCols = new Set(["total_bill_amount", "paid_amount", "remaining_amount"])
    const centerCols = new Set(["actions"])

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        placeholder="Search by customer name or phone..."
                        className="pl-8"
                        defaultValue={params.search ?? ""}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <Select
                    value={params.status || "all"}
                    onValueChange={handleStatusFilter}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="advance">Advance</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        className="w-36 text-sm"
                        value={params.start_date ?? ""}
                        onChange={(e) => onParamsChange({ ...params, start_date: e.target.value, page: 1 })}
                        placeholder="From date"
                    />
                    <span className="text-muted text-xs">–</span>
                    <Input
                        type="date"
                        className="w-36 text-sm"
                        value={params.end_date ?? ""}
                        onChange={(e) => onParamsChange({ ...params, end_date: e.target.value, page: 1 })}
                        placeholder="To date"
                    />
                </div>

                {(params.search || params.status || params.start_date || params.end_date) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onParamsChange({ page: 1, limit: params.limit })}
                        className="gap-1.5"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Clear
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id} className="border-b border-border bg-muted/10">
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={cn(
                                            "px-4 py-3 font-medium text-muted text-left whitespace-nowrap",
                                            rightAlignCols.has(header.id) && "text-right",
                                            centerCols.has(header.id) && "text-center"
                                        )}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i} className="border-b border-border/50">
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-3.5 w-28" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    </td>
                                    {[...Array(8)].map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <Skeleton className="h-4 w-16" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-16 text-muted">
                                    No payment records found
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => {
                                const isSelected = row.original._id === selectedId
                                return (
                                    <tr
                                        key={row.id}
                                        className={cn(
                                            "border-b border-border/50 transition-colors hover:bg-muted/5 cursor-pointer",
                                            isSelected && "bg-primary/5"
                                        )}
                                        onClick={() => onView(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className={cn(
                                                    "px-4 py-3",
                                                    rightAlignCols.has(cell.column.id) && "text-right",
                                                    centerCols.has(cell.column.id) && "text-center"
                                                )}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Delete confirmation */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Payment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this payment record for{" "}
                            <span className="font-medium text-foreground">
                                {deleteTarget?.customer?.full_name}
                            </span>
                            ? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deleteTarget) {
                                    onDelete(deleteTarget._id)
                                    setDeleteTarget(null)
                                }
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted">
                    <span>
                        Showing {((meta.page - 1) * meta.limit) + 1} to{" "}
                        {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} payments
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={meta.page <= 1}
                            onClick={() => handlePage(meta.page - 1)}
                        >
                            ‹
                        </Button>
                        {[...Array(Math.min(meta.totalPages, 5))].map((_, i) => {
                            const page = i + 1
                            return (
                                <Button
                                    key={page}
                                    variant={page === meta.page ? "default" : "outline"}
                                    size="icon-sm"
                                    onClick={() => handlePage(page)}
                                >
                                    {page}
                                </Button>
                            )
                        })}
                        <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={meta.page >= meta.totalPages}
                            onClick={() => handlePage(meta.page + 1)}
                        >
                            ›
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
