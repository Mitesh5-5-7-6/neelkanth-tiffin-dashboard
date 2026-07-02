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
    Eye, Pencil, Trash2, CheckCircle2, Minus,
    Search, Download, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Printer,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogFooter,
    DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { useCustomersPaymentSummary } from "@/hooks/usePayments"
import type { Customer, CustomerQueryParams } from "@/types/customer.type"
import type { PaginationMeta } from "@/types/common.types"
import { cn } from "@/lib/utils"

interface CustomerTableProps {
    customers: Customer[]
    isLoading: boolean
    meta?: PaginationMeta
    params: CustomerQueryParams
    onParamsChange: (p: CustomerQueryParams) => void
    onView: (c: Customer) => void
    onEdit: (c: Customer) => void
    onDelete: (id: string) => void
    selectedId?: string
}

function getInitials(name: string) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

const AVATAR_COLORS = ["bg-primary", "bg-success", "bg-warning", "bg-purple", "bg-danger"]

function getAvatarColor(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

const colHelper = createColumnHelper<Customer>()

export default function CustomerTable({
    customers,
    isLoading,
    meta,
    params,
    onParamsChange,
    onView,
    onEdit,
    onDelete,
    selectedId,
}: CustomerTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
    const [downloadingFor, setDownloadingFor] = useState<string | null>(null)
    const [sorting, setSorting] = useState<SortingState>([{ id: "full_name", desc: false }])

    const customerIds = useMemo(() => customers.map((c) => c._id), [customers])
    const { data: summaryData } = useCustomersPaymentSummary(customerIds)
    const outstandingMap = useMemo(() => {
        const map = new Map<string, number>()
        summaryData?.data?.forEach((s) => map.set(s.customer_id, s.outstanding))
        return map
    }, [summaryData])

    function handleSearch(value: string) {
        onParamsChange({ ...params, search: value, page: 1 })
    }

    function handlePage(page: number) {
        onParamsChange({ ...params, page })
    }

    function handleSort(value: string) {
        const map: Record<string, SortingState> = {
            "name-asc": [{ id: "full_name", desc: false }],
            "name-desc": [{ id: "full_name", desc: true }],
            "newest": [{ id: "createdAt", desc: true }],
            "oldest": [{ id: "createdAt", desc: false }],
        }
        setSorting(map[value] ?? [])
    }

    function handleDeleteConfirm() {
        if (deleteTarget) {
            onDelete(deleteTarget._id)
            setDeleteTarget(null)
        }
    }

    async function handleDownloadPdf(customer: Customer) {
        const customerId = customer._id
        const qs = new URLSearchParams({
            customerId,
            name: customer.full_name ?? "",
        })

        try {
            setDownloadingFor(customerId)
            const res = await fetch(`/api/invoice/generate?${qs.toString()}`)
            if (!res.ok) throw new Error("Failed to generate PDF")

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `invoice-${customerId}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error(err)
            alert("Failed to download invoice PDF")
        } finally {
            setDownloadingFor(null)
        }
    }

    const columns = useMemo(() => [
        colHelper.display({
            id: "index",
            header: "#",
            cell: ({ row }) => (
                <span className="text-muted">
                    {((params.page ?? 1) - 1) * (params.limit ?? 10) + row.index + 1}
                </span>
            ),
        }),
        colHelper.accessor("full_name", {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={column.getToggleSortingHandler()}
                >
                    Customer
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="w-3 h-3" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                </button>
            ),
            cell: ({ row }) => {
                const c = row.original
                return (
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold",
                            getAvatarColor(c.full_name)
                        )}>
                            {getInitials(c.full_name)}
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{c.full_name}</p>
                            {c.address && (
                                <p className="text-xs text-muted truncate max-w-40">{c.address}</p>
                            )}
                        </div>
                    </div>
                )
            },
        }),
        colHelper.accessor("phone", {
            header: "Phone",
            cell: (info) => <span className="text-foreground">{info.getValue()}</span>,
        }),
        colHelper.display({
            id: "tiffin_defaults",
            header: "Default Tiffin",
            cell: ({ row }) => {
                const td = row.original.tiffin_defaults
                if (!td) return <span className="text-muted text-xs">—</span>
                const parts = []
                if (td.morning) parts.push(`M×${td.morning_qty} ₹${td.morning_price}`)
                if (td.evening) parts.push(`E×${td.evening_qty} ₹${td.evening_price}`)
                return (
                    <span className="text-foreground text-xs">
                        {parts.length ? parts.join(" · ") : <span className="text-muted">—</span>}
                    </span>
                )
            },
        }),
        colHelper.display({
            id: "morning",
            header: "Morning",
            cell: ({ row }) => row.original.tiffin_defaults?.morning
                ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                : <Minus className="w-4 h-4 text-muted mx-auto" />,
        }),
        colHelper.display({
            id: "evening",
            header: "Evening",
            cell: ({ row }) => row.original.tiffin_defaults?.evening
                ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                : <Minus className="w-4 h-4 text-muted mx-auto" />,
        }),
        colHelper.display({
            id: "outstanding",
            header: () => <span className="flex justify-end">Outstanding</span>,
            cell: ({ row }) => {
                const out = outstandingMap.get(row.original._id)
                if (out === undefined) {
                    return (
                        <span className="flex justify-end">
                            <Skeleton className="h-4 w-12" />
                        </span>
                    )
                }
                return (
                    <span
                        className={cn(
                            "font-medium flex justify-end tabular-nums",
                            out > 0 ? "text-danger" : "text-muted"
                        )}
                    >
                        ₹{out.toLocaleString("en-IN")}
                    </span>
                )
            },
        }),
        colHelper.display({
            id: "actions",
            header: () => <span className="flex justify-center">Actions</span>,
            cell: ({ row }) => {
                const c = row.original
                return (
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => onView(c)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors"
                            title="View details"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-warning/10 text-muted hover:text-warning transition-colors"
                            title="Edit customer"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDownloadPdf(c)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors"
                            title="Download invoice PDF"
                            disabled={!!downloadingFor}
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                            title="Delete customer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )
            },
        }),
    ], [params, onView, onEdit, setDeleteTarget, downloadingFor])

    const table = useReactTable({
        data: customers,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
        onSortingChange: setSorting,
        manualPagination: true,
        pageCount: meta?.totalPages ?? -1,
    })

    const centerCols = new Set(["morning", "evening", "actions"])

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        placeholder="Search by name or phone..."
                        className="pl-8"
                        defaultValue={params.search ?? ""}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <Select defaultValue="name-asc" onValueChange={handleSort}>
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name-asc">Name (A – Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z – A)</SelectItem>
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="oldest">Oldest first</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Export
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filter
                </Button>
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
                                            "px-4 py-3 font-medium text-muted text-left",
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
                                    {[...Array(6)].map((_, j) => (
                                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-12 text-muted">
                                    No customers found
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

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Customer</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-medium text-foreground">{deleteTarget?.full_name}</span>?
                            This action cannot be undone.
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

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted">
                    <span>
                        Showing {((meta.page - 1) * meta.limit) + 1} to{" "}
                        {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} customers
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
