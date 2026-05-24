"use client"

import { useState, useRef, useEffect } from "react"
import { format } from "date-fns"
import {
    ChevronDown, ChevronRight, Search, SlidersHorizontal,
    CheckCircle2, XCircle, Clock, IndianRupee, Users,
    Sun, Moon, Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useGroupedPayments, useUpdateEntryStatus } from "@/hooks/useGroupedPayments"
import type {
    GroupedCustomerRow,
    GroupedEntryRow,
    GroupedPaymentQueryParams,
    EntryPaymentStatus,
} from "@/types/grouped-payment.type"
import type { PaginationMeta } from "@/types/common.types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return `₹${n.toLocaleString("en-IN")}`
}

function fmtDate(dateVal: string | Date) {
    return format(new Date(dateVal), "d MMM yyyy")
}

function getInitials(name: string) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

const AVATAR_COLORS = ["bg-primary", "bg-success", "bg-warning", "bg-purple", "bg-danger"]
function avatarColor(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<EntryPaymentStatus, string> = {
    PAID: "bg-success/15 text-success",
    PARTIAL: "bg-warning/15 text-warning",
    PENDING: "bg-danger/15 text-danger",
}

const STATUS_ICONS: Record<EntryPaymentStatus, React.ReactNode> = {
    PAID: <CheckCircle2 className="w-3 h-3" />,
    PARTIAL: <Clock className="w-3 h-3" />,
    PENDING: <XCircle className="w-3 h-3" />,
}

function StatusBadge({ status }: { status: EntryPaymentStatus }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            STATUS_STYLES[status]
        )}>
            {STATUS_ICONS[status]}
            {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
    )
}

// ─── Quick toggle button for morning/evening ──────────────────────────────────

interface ShiftToggleProps {
    label: string
    paid: boolean
    qty: number
    price: number
    icon: React.ReactNode
    isPending: boolean
    onToggle: () => void
}

function ShiftToggle({ label, paid, qty, price, icon, isPending, onToggle }: ShiftToggleProps) {
    if (qty === 0) return null
    return (
        <button
            onClick={onToggle}
            disabled={isPending}
            title={`Mark ${label} as ${paid ? "Pending" : "Paid"}`}
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-all",
                paid
                    ? "bg-success/10 text-success border-success/30 hover:bg-success/20"
                    : "bg-muted/10 text-muted border-border hover:border-warning/50 hover:text-warning",
                isPending && "opacity-50 cursor-not-allowed"
            )}
        >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
            {label} {fmt(price)}
            {paid ? " ✓" : " ✕"}
        </button>
    )
}

// ─── Expanded entry rows ───────────────────────────────────────────────────────

interface EntryRowsProps {
    entries: GroupedEntryRow[]
    pendingEntryId: string | null
    onToggleMorning: (entry: GroupedEntryRow) => void
    onToggleEvening: (entry: GroupedEntryRow) => void
}

function EntryRows({ entries, pendingEntryId, onToggleMorning, onToggleEvening }: EntryRowsProps) {
    return (
        <>
            {entries.map((entry) => {
                const isPending = pendingEntryId === entry.entryId
                return (
                    <tr
                        key={entry.entryId}
                        className="border-b border-border/30 bg-muted/5 hover:bg-muted/10 transition-colors"
                    >
                        {/* Indent spacer */}
                        <td className="pl-14 pr-2 py-2.5 w-8">
                            <div className="w-px h-full" />
                        </td>
                        {/* Date */}
                        <td className="px-3 py-2.5">
                            <span className="text-xs text-foreground font-medium whitespace-nowrap">
                                {fmtDate(entry.date)}
                            </span>
                        </td>
                        {/* Shift toggles */}
                        <td className="px-3 py-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <ShiftToggle
                                    label="AM"
                                    paid={entry.morningPaid}
                                    qty={entry.morningQty}
                                    price={entry.morningPrice}
                                    icon={<Sun className="w-3 h-3" />}
                                    isPending={isPending}
                                    onToggle={() => onToggleMorning(entry)}
                                />
                                <ShiftToggle
                                    label="PM"
                                    paid={entry.eveningPaid}
                                    qty={entry.eveningQty}
                                    price={entry.eveningPrice}
                                    icon={<Moon className="w-3 h-3" />}
                                    isPending={isPending}
                                    onToggle={() => onToggleEvening(entry)}
                                />
                            </div>
                        </td>
                        {/* Total */}
                        <td className="px-3 py-2.5 text-right">
                            <span className="text-xs text-foreground">{fmt(entry.totalAmount)}</span>
                        </td>
                        {/* Paid */}
                        <td className="px-3 py-2.5 text-right">
                            <span className="text-xs font-medium text-success">{fmt(entry.paidAmount)}</span>
                        </td>
                        {/* Pending */}
                        <td className="px-3 py-2.5 text-right">
                            <span className={cn(
                                "text-xs font-medium",
                                entry.pendingAmount > 0 ? "text-danger" : "text-muted"
                            )}>
                                {fmt(entry.pendingAmount)}
                            </span>
                        </td>
                        {/* Status */}
                        <td className="px-3 py-2.5">
                            <StatusBadge status={entry.status} />
                        </td>
                    </tr>
                )
            })}
        </>
    )
}

// ─── Customer row (expandable) ────────────────────────────────────────────────

interface CustomerRowProps {
    customer: GroupedCustomerRow
    isExpanded: boolean
    pendingEntryId: string | null
    onToggle: () => void
    onToggleMorning: (entry: GroupedEntryRow) => void
    onToggleEvening: (entry: GroupedEntryRow) => void
}

function CustomerRow({
    customer,
    isExpanded,
    pendingEntryId,
    onToggle,
    onToggleMorning,
    onToggleEvening,
}: CustomerRowProps) {
    return (
        <>
            <tr
                className={cn(
                    "border-b border-border transition-colors cursor-pointer group",
                    isExpanded ? "bg-primary/5" : "hover:bg-muted/5"
                )}
                onClick={onToggle}
            >
                {/* Expand icon */}
                <td className="pl-4 pr-2 py-3 w-8">
                    <span className="text-muted group-hover:text-foreground transition-colors">
                        {isExpanded
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />}
                    </span>
                </td>
                {/* Customer info */}
                <td className="px-3 py-3" colSpan={2}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold",
                            avatarColor(customer.customerName)
                        )}>
                            {getInitials(customer.customerName)}
                        </div>
                        <div>
                            <p className="font-medium text-foreground text-sm">{customer.customerName}</p>
                            <p className="text-xs text-muted">{customer.phone}</p>
                        </div>
                        <span className="ml-2 text-xs text-muted/70 hidden sm:block">
                            {customer.entryCount} {customer.entryCount === 1 ? "entry" : "entries"}
                        </span>
                    </div>
                </td>
                {/* Total */}
                <td className="px-3 py-3 text-right">
                    <span className="text-sm text-foreground font-medium">{fmt(customer.totalAmount)}</span>
                </td>
                {/* Paid */}
                <td className="px-3 py-3 text-right">
                    <span className="text-sm font-semibold text-success">{fmt(customer.totalPaid)}</span>
                </td>
                {/* Pending */}
                <td className="px-3 py-3 text-right">
                    <span className={cn(
                        "text-sm font-semibold",
                        customer.totalPending > 0 ? "text-danger" : "text-muted"
                    )}>
                        {fmt(customer.totalPending)}
                    </span>
                </td>
                {/* Status */}
                <td className="px-3 py-3">
                    <StatusBadge status={customer.status} />
                </td>
            </tr>
            {/* Nested entry rows (expand/collapse via conditional render) */}
            {isExpanded && (
                <EntryRows
                    entries={customer.entries}
                    pendingEntryId={pendingEntryId}
                    onToggleMorning={onToggleMorning}
                    onToggleEvening={onToggleEvening}
                />
            )}
        </>
    )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
    return (
        <>
            {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                    <td className="pl-4 pr-2 py-3"><Skeleton className="w-4 h-4 rounded" /></td>
                    <td className="px-3 py-3" colSpan={2}>
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-9 h-9 rounded-full" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3.5 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    </td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                </tr>
            ))}
        </>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GroupedPaymentTableProps {
    params: GroupedPaymentQueryParams
    onParamsChange: (p: GroupedPaymentQueryParams) => void
}

export default function GroupedPaymentTable({ params, onParamsChange }: GroupedPaymentTableProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [pendingEntryId, setPendingEntryId] = useState<string | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    const { data, isLoading, isFetching } = useGroupedPayments(params)
    const updateStatus = useUpdateEntryStatus()

    const customers: GroupedCustomerRow[] = data?.data?.customers ?? []
    const summary = data?.data?.summary
    const meta = data?.meta as PaginationMeta | undefined

    // Auto-expand the first customer when first data loads
    const didAutoExpand = useRef(false)
    useEffect(() => {
        if (!didAutoExpand.current && customers.length > 0) {
            setExpandedIds(new Set([customers[0].customerId]))
            didAutoExpand.current = true
        }
    }, [customers])

    function toggleExpand(id: string) {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function expandAll() {
        setExpandedIds(new Set(customers.map((c) => c.customerId)))
    }

    function collapseAll() {
        setExpandedIds(new Set())
    }

    async function handleToggleShift(
        entry: GroupedEntryRow,
        shift: "morning" | "evening"
    ) {
        if (pendingEntryId) return
        setPendingEntryId(entry.entryId)
        try {
            const currentPaid = shift === "morning" ? entry.morningPaid : entry.eveningPaid
            await updateStatus.mutateAsync({
                entryId: entry.entryId,
                data: {
                    ...(shift === "morning" && { morningStatus: currentPaid ? "PENDING" : "PAID" }),
                    ...(shift === "evening" && { eveningStatus: currentPaid ? "PENDING" : "PAID" }),
                },
            })
            toast.success(`${shift === "morning" ? "Morning" : "Evening"} marked as ${currentPaid ? "Pending" : "Paid"}`)
        } catch {
            toast.error("Failed to update payment status")
        } finally {
            setPendingEntryId(null)
        }
    }

    function handleSearch(value: string) {
        onParamsChange({ ...params, search: value, page: 1 })
        didAutoExpand.current = false
    }

    function handleStatusFilter(value: string) {
        onParamsChange({
            ...params,
            status: value === "all" ? "" : (value as EntryPaymentStatus),
            page: 1,
        })
        didAutoExpand.current = false
    }

    function handlePage(page: number) {
        onParamsChange({ ...params, page })
        setExpandedIds(new Set())
        didAutoExpand.current = false
    }

    const hasFilters = !!(params.search || params.status)

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            {/* ── Toolbar ──────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
                {/* Search */}
                <div className="relative flex-1 min-w-44">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        ref={searchRef}
                        placeholder="Search customer..."
                        className="pl-8"
                        defaultValue={params.search ?? ""}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                {/* Date range */}
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        className="w-36 text-sm"
                        value={params.startDate ?? ""}
                        onChange={(e) => {
                            onParamsChange({ ...params, startDate: e.target.value, page: 1 })
                            didAutoExpand.current = false
                        }}
                    />
                    <span className="text-muted text-xs shrink-0">–</span>
                    <Input
                        type="date"
                        className="w-36 text-sm"
                        value={params.endDate ?? ""}
                        onChange={(e) => {
                            onParamsChange({ ...params, endDate: e.target.value, page: 1 })
                            didAutoExpand.current = false
                        }}
                    />
                </div>

                {/* Status filter */}
                <Select
                    value={params.status || "all"}
                    onValueChange={handleStatusFilter}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PARTIAL">Partial</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                    </SelectContent>
                </Select>

                {/* Clear filters */}
                {hasFilters && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            onParamsChange({ ...params, search: "", status: "", page: 1 })
                            if (searchRef.current) searchRef.current.value = ""
                            didAutoExpand.current = false
                        }}
                        className="gap-1.5"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Clear
                    </Button>
                )}

                {/* Expand/Collapse */}
                {customers.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto">
                        {isFetching && !isLoading && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted" />
                        )}
                        <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
                            Expand All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
                            Collapse
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Table ────────────────────────────────────────────────────────── */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/10">
                            <th className="pl-4 pr-2 py-3 w-8" />
                            <th className="px-3 py-3 text-left font-medium text-muted whitespace-nowrap" colSpan={2}>
                                Customer / Date
                            </th>
                            <th className="px-3 py-3 text-right font-medium text-muted whitespace-nowrap">
                                Total
                            </th>
                            <th className="px-3 py-3 text-right font-medium text-muted whitespace-nowrap">
                                Paid
                            </th>
                            <th className="px-3 py-3 text-right font-medium text-muted whitespace-nowrap">
                                Pending
                            </th>
                            <th className="px-3 py-3 text-left font-medium text-muted whitespace-nowrap">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <TableSkeleton />
                        ) : customers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-2 text-muted">
                                        <IndianRupee className="w-8 h-8 opacity-30" />
                                        <p className="text-sm">No tiffin entries for this period</p>
                                        <p className="text-xs opacity-70">
                                            Daily entries with pending/paid status will appear here
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            customers.map((customer) => (
                                <CustomerRow
                                    key={customer.customerId}
                                    customer={customer}
                                    isExpanded={expandedIds.has(customer.customerId)}
                                    pendingEntryId={pendingEntryId}
                                    onToggle={() => toggleExpand(customer.customerId)}
                                    onToggleMorning={(entry) => handleToggleShift(entry, "morning")}
                                    onToggleEvening={(entry) => handleToggleShift(entry, "evening")}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ────────────────────────────────────────────────────── */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted">
                    <span>
                        Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{" "}
                        {meta.total} customers
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
                            const pg = i + 1
                            return (
                                <Button
                                    key={pg}
                                    variant={pg === meta.page ? "default" : "outline"}
                                    size="icon-sm"
                                    onClick={() => handlePage(pg)}
                                >
                                    {pg}
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

            {/* ── Sticky summary footer ─────────────────────────────────────────── */}
            {summary && !isLoading && (
                <div className="border-t border-border bg-muted/5 px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted">
                        <Users className="w-4 h-4" />
                        <span>{summary.totalCustomers} customers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted">Total:</span>
                        <span className="font-semibold text-foreground">{fmt(summary.totalAmount)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="font-semibold text-success">{fmt(summary.totalPaid)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-danger" />
                        <span className={cn(
                            "font-semibold",
                            summary.totalPending > 0 ? "text-danger" : "text-muted"
                        )}>
                            {fmt(summary.totalPending)}
                        </span>
                    </div>
                    {summary.totalAmount > 0 && (
                        <div className="ml-auto text-xs text-muted">
                            {Math.round((summary.totalPaid / summary.totalAmount) * 100)}% collected
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
