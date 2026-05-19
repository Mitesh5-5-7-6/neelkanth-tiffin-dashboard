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
import {
    Pencil, Trash2, Search, Download, RefreshCw,
    ArrowUpDown, ArrowUp, ArrowDown, RepeatIcon,
} from "lucide-react"
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
import {
    CATEGORY_META, EXPENSE_CATEGORY, EXPENSE_STATUS, EXPENSE_PAYMENT_METHOD,
} from "@/types/expense.type"
import type { Expense, ExpenseQueryParams } from "@/types/expense.type"
import type { PaginationMeta } from "@/types/common.types"

// ─── Props ─────────────────────────────────────────────────────────────────

interface ExpenseTableProps {
    expenses: Expense[]
    isLoading: boolean
    meta?: PaginationMeta
    params: ExpenseQueryParams
    onParamsChange: (p: ExpenseQueryParams) => void
    onEdit: (e: Expense) => void
    onDelete: (id: string) => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    PAID:      "bg-success/10 text-success",
    PENDING:   "bg-warning/10 text-warning",
    PARTIAL:   "bg-primary/10 text-primary",
    CANCELLED: "bg-muted/20 text-muted",
}

const PAYMENT_METHOD_STYLES: Record<string, string> = {
    cash:          "bg-success/10 text-success",
    upi:           "bg-primary/10 text-primary",
    bank_transfer: "bg-purple/10 text-purple",
    cheque:        "bg-warning/10 text-warning",
    credit:        "bg-danger/10 text-danger",
}

const PAYMENT_LABELS: Record<string, string> = {
    cash:          "Cash",
    upi:           "UPI",
    bank_transfer: "Bank",
    cheque:        "Cheque",
    credit:        "Credit",
}

function exportToCSV(expenses: Expense[]) {
    const headers = ["Date", "Category", "Sub Category", "Title", "Amount", "Payment Method", "Status", "Vendor", "Notes"]
    const rows = expenses.map((e) => [
        format(new Date(e.expense_date), "yyyy-MM-dd"),
        ([] as string[]).concat(e.expense_category as string | string[]).map((c) => CATEGORY_META[c as keyof typeof CATEGORY_META]?.label ?? c).join(" | "),
        ([] as string[]).concat((e.expense_subcategory ?? []) as string | string[]).join(" | "),
        e.title,
        e.amount,
        e.payment_method,
        e.expense_status,
        e.vendor_name ?? "",
        e.notes ?? "",
    ])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

const colHelper = createColumnHelper<Expense>()

// ─── Component ─────────────────────────────────────────────────────────────

export default function ExpenseTable({
    expenses,
    isLoading,
    meta,
    params,
    onParamsChange,
    onEdit,
    onDelete,
}: ExpenseTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
    const [sorting, setSorting]           = useState<SortingState>([])

    function handleSearch(value: string) {
        onParamsChange({ ...params, search: value, page: 1 })
    }

    function handlePage(page: number) {
        onParamsChange({ ...params, page })
    }

    function handleReset() {
        const today     = new Date().toISOString().split("T")[0]
        const firstDay  = `${today.slice(0, 7)}-01`
        onParamsChange({ page: 1, limit: 15, start_date: firstDay, end_date: today })
    }

    function handleDeleteConfirm() {
        if (deleteTarget) {
            onDelete(deleteTarget._id)
            setDeleteTarget(null)
        }
    }

    const columns = useMemo(() => [
        colHelper.display({
            id: "index",
            header: "#",
            cell: ({ row }) => (
                <span className="text-muted text-xs">
                    {((params.page ?? 1) - 1) * (params.limit ?? 15) + row.index + 1}
                </span>
            ),
        }),
        colHelper.accessor("expense_date", {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={column.getToggleSortingHandler()}
                >
                    Date
                    {column.getIsSorted() === "asc"  ? <ArrowUp className="w-3 h-3" />
                   : column.getIsSorted() === "desc" ? <ArrowDown className="w-3 h-3" />
                   : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </button>
            ),
            cell: ({ row }) => (
                <div className="text-xs">
                    <p className="font-medium text-foreground">
                        {format(new Date(row.original.expense_date), "dd MMM yyyy")}
                    </p>
                    <p className="text-muted">
                        {format(new Date(row.original.createdAt), "hh:mm a")}
                    </p>
                </div>
            ),
        }),
        colHelper.accessor("expense_category", {
            header: "Category",
            cell: ({ row }) => (
                <div className="flex flex-wrap items-center gap-1">
                    {([] as typeof row.original.expense_category).concat(row.original.expense_category).map((cat) => {
                        const meta = CATEGORY_META[cat]
                        return (
                            <span
                                key={cat}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{ backgroundColor: meta?.bgColor ?? '#f3f4f6', color: meta?.color ?? '#9ca3af' }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta?.color ?? '#9ca3af' }} />
                                {meta?.label ?? cat}
                            </span>
                        )
                    })}
                    {row.original.is_recurring && (
                        <RepeatIcon className="w-3 h-3 text-primary shrink-0" title="Recurring" />
                    )}
                </div>
            ),
        }),
        colHelper.accessor("expense_subcategory", {
            header: "Sub Category",
            cell: (info) => {
                const raw = info.getValue()
                const subs = raw ? ([] as string[]).concat(raw as string | string[]) : []
                if (!subs.length) return <span className="text-xs text-muted">—</span>
                return (
                    <div className="flex flex-wrap gap-1">
                        {subs.map((s) => (
                            <span key={s} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                                {s}
                            </span>
                        ))}
                    </div>
                )
            },
        }),
        colHelper.accessor("title", {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={column.getToggleSortingHandler()}
                >
                    Description
                    {column.getIsSorted() === "asc"  ? <ArrowUp className="w-3 h-3" />
                   : column.getIsSorted() === "desc" ? <ArrowDown className="w-3 h-3" />
                   : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </button>
            ),
            cell: ({ row }) => (
                <div>
                    <p className="text-xs font-medium text-foreground truncate max-w-36">{row.original.title}</p>
                    {row.original.vendor_name && (
                        <p className="text-xs text-muted truncate max-w-36">{row.original.vendor_name}</p>
                    )}
                </div>
            ),
        }),
        colHelper.accessor("amount", {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={column.getToggleSortingHandler()}
                >
                    Amount (₹)
                    {column.getIsSorted() === "asc"  ? <ArrowUp className="w-3 h-3" />
                   : column.getIsSorted() === "desc" ? <ArrowDown className="w-3 h-3" />
                   : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </button>
            ),
            cell: (info) => (
                <span className="text-sm font-semibold text-danger">
                    ₹{info.getValue().toLocaleString("en-IN")}
                </span>
            ),
        }),
        colHelper.accessor("payment_method", {
            header: "Payment Method",
            cell: (info) => {
                const method = info.getValue()
                return (
                    <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        PAYMENT_METHOD_STYLES[method] ?? "bg-muted/20 text-muted"
                    )}>
                        {PAYMENT_LABELS[method] ?? method}
                    </span>
                )
            },
        }),
        colHelper.accessor("expense_status", {
            header: "Status",
            cell: (info) => (
                <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    STATUS_STYLES[info.getValue()] ?? "bg-muted/20 text-muted"
                )}>
                    {info.getValue()}
                </span>
            ),
        }),
        colHelper.accessor("notes", {
            header: "Note",
            cell: (info) => (
                <span className="text-xs text-muted truncate max-w-28 block">
                    {info.getValue() ?? "—"}
                </span>
            ),
        }),
        colHelper.display({
            id: "actions",
            header: () => <span className="flex justify-center">Actions</span>,
            cell: ({ row }) => {
                const e = row.original
                return (
                    <div
                        className="flex items-center justify-center gap-1"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <button
                            onClick={() => onEdit(e)}
                            className="p-1.5 rounded-lg hover:bg-warning/10 text-muted hover:text-warning transition-colors"
                            title="Edit expense"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setDeleteTarget(e)}
                            className="p-1.5 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                            title="Delete expense"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )
            },
        }),
    ], [params, onEdit])

    const table = useReactTable({
        data: expenses,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
        onSortingChange: setSorting,
        manualPagination: true,
        pageCount: meta?.totalPages ?? -1,
    })

    const rightAlignCols = new Set(["amount"])
    const centerCols     = new Set(["actions"])

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">

            {/* ── Toolbar ────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-border">
                {/* Date range */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted">Start Date</span>
                        <input
                            type="date"
                            value={params.start_date ?? ""}
                            onChange={(e) => onParamsChange({ ...params, start_date: e.target.value, page: 1 })}
                            className="text-xs h-8 px-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted">End Date</span>
                        <input
                            type="date"
                            value={params.end_date ?? ""}
                            onChange={(e) => onParamsChange({ ...params, end_date: e.target.value, page: 1 })}
                            className="text-xs h-8 px-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Category filter */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Category</span>
                    <Select
                        value={params.category || "all"}
                        onValueChange={(v) => onParamsChange({
                            ...params,
                            category: (v === "all" ? "" : v) as ExpenseQueryParams["category"],
                            page: 1,
                        })}
                    >
                        <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {Object.values(EXPENSE_CATEGORY).map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {CATEGORY_META[cat]?.label ?? cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Payment method filter */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Payment Method</span>
                    <Select
                        value={params.payment_method || "all"}
                        onValueChange={(v) => onParamsChange({
                            ...params,
                            payment_method: (v === "all" ? "" : v) as ExpenseQueryParams["payment_method"],
                            page: 1,
                        })}
                    >
                        <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Methods</SelectItem>
                            {Object.values(EXPENSE_PAYMENT_METHOD).map((m) => (
                                <SelectItem key={m} value={m}>
                                    {PAYMENT_LABELS[m] ?? m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Status filter */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Status</span>
                    <Select
                        value={params.status || "all"}
                        onValueChange={(v) => onParamsChange({
                            ...params,
                            status: (v === "all" ? "" : v) as ExpenseQueryParams["status"],
                            page: 1,
                        })}
                    >
                        <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            {Object.values(EXPENSE_STATUS).map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Search */}
                <div className="flex-1 flex flex-col gap-1 min-w-36">
                    <span className="text-xs text-muted">Search</span>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                        <Input
                            placeholder="Search expenses..."
                            className="pl-8 h-8 text-xs"
                            defaultValue={params.search ?? ""}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 h-8">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToCSV(expenses)}
                        className="gap-1.5 h-8"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </Button>
                </div>
            </div>

            {/* ── Table ──────────────────────────────────────────────── */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id} className="border-b border-border bg-muted/10">
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={cn(
                                            "px-3 py-2.5 font-medium text-muted text-xs text-left",
                                            centerCols.has(header.id)     && "text-center",
                                            rightAlignCols.has(header.id) && "text-right"
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
                            [...Array(8)].map((_, i) => (
                                <tr key={i} className="border-b border-border/50">
                                    {[...Array(10)].map((_, j) => (
                                        <td key={j} className="px-3 py-3">
                                            <Skeleton className="h-4 w-full" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-12 text-muted text-sm">
                                    No expenses found for the selected filters
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-border/50 hover:bg-muted/5 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className={cn(
                                                "px-3 py-2.5",
                                                centerCols.has(cell.column.id)     && "text-center",
                                                rightAlignCols.has(cell.column.id) && "text-right"
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted">
                <span>
                    {meta
                        ? `Showing ${Math.min(((meta.page - 1) * meta.limit) + 1, meta.total)} to ${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total} expenses`
                        : "Loading…"
                    }
                </span>

                {meta && meta.totalPages > 1 && (
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
                )}
            </div>

            {/* ── Delete Confirmation ─────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Expense</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-medium text-foreground">{deleteTarget?.title}</span>?
                            The record will be soft-deleted and preserved for audit.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
