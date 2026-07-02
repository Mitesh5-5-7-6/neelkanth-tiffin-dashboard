"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { format } from "date-fns"
import {
    CalendarDays, Save, Copy, RotateCcw, Menu, Loader2,
    Users, CheckCircle2, UtensilsCrossed, IndianRupee, Info,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import StatCard from "@/components/StatCard"
import { useSidebar } from "@/components/AppShell"
import { useTiffinPreview, useBulkSaveTiffinEntries } from "@/hooks/useTiffinEntries"
import type { TiffinPreviewRow, BulkEntryInput } from "@/types/tiffin.type"
import { cn } from "@/lib/utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date) { return format(d, "yyyy-MM-dd") }
function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return toISO(d) }
function parseISO(iso: string) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d) }

function calcTotal(mActive: boolean, mPrice: number, eActive: boolean, ePrice: number) {
    return (mActive ? mPrice : 0) + (eActive ? ePrice : 0)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntryRow extends TiffinPreviewRow { changed: boolean }

function buildRows(preview: TiffinPreviewRow[]): EntryRow[] {
    return preview.map((r) => ({ ...r, changed: false }))
}

const AVATAR_COLORS = ["bg-primary", "bg-success", "bg-warning", "bg-purple", "bg-danger"]
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }
function initials(name: string) { return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() }

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TiffinEntriesPage() {
    const { toggle } = useSidebar()
    const today = toISO(new Date())

    const [date, setDate] = useState(today)
    const [calOpen, setCalOpen] = useState(false)
    const [fromDate, setFromDate] = useState<string | null>(null)
    const [copyMode, setCopyMode] = useState(false)
    const [rows, setRows] = useState<EntryRow[]>([])
    const [originalRows, setOriginalRows] = useState<EntryRow[]>([])

    const { data: previewData, isLoading, isFetching } = useTiffinPreview(date, fromDate)
    const saveMutation = useBulkSaveTiffinEntries()

    useEffect(() => {
        if (!previewData?.data) return

        const built = buildRows(previewData.data)
        const timer = setTimeout(() => {
            setRows(built)
            setOriginalRows(built)
        }, 0)

        return () => clearTimeout(timer)
    }, [previewData])

    // ── Row mutations ──────────────────────────────────────────────────────────

    const updateRow = useCallback((idx: number, patch: Partial<EntryRow>) => {
        setRows((prev) => {
            const next = [...prev]
            const orig = originalRows[idx]
            const updated = { ...next[idx], ...patch }
            const changed =
                updated.morning !== orig?.morning ||
                updated.morning_qty !== orig?.morning_qty ||
                updated.morning_price !== orig?.morning_price ||
                updated.morning_paid !== orig?.morning_paid ||
                updated.evening !== orig?.evening ||
                updated.evening_qty !== orig?.evening_qty ||
                updated.evening_price !== orig?.evening_price ||
                updated.evening_paid !== orig?.evening_paid
            next[idx] = { ...updated, changed }
            return next
        })
    }, [originalRows])

    function toggleMorning(idx: number, val: boolean) {
        updateRow(idx, { morning: val, morning_qty: val ? Math.max(1, rows[idx].morning_qty) : 0 })
    }
    function toggleEvening(idx: number, val: boolean) {
        updateRow(idx, { evening: val, evening_qty: val ? Math.max(1, rows[idx].evening_qty) : 0 })
    }

    // ── Date change ────────────────────────────────────────────────────────────

    function handleDateChange(d: Date | undefined) {
        if (!d) return
        setDate(toISO(d))
        setFromDate(null)
        setCopyMode(false)
        setCalOpen(false)
    }

    // ── Copy yesterday ─────────────────────────────────────────────────────────

    function handleCopyYesterday() {
        const prev = yesterday()
        if (date === prev) { toast.error("Cannot copy from the same date"); return }
        setFromDate(prev); setCopyMode(true)
        toast.info("Loading entries from yesterday…")
    }
    function handleResetToDefaults() { setFromDate(null); setCopyMode(false) }

    // ── Save ───────────────────────────────────────────────────────────────────

    async function handleSave() {
        const entries: BulkEntryInput[] = rows.map((r) => ({
            customer_id: r.customer_id,
            morning_qty: r.morning ? r.morning_qty : 0,
            morning_price: r.morning_price,
            morning_paid: r.morning_paid,
            evening_qty: r.evening ? r.evening_qty : 0,
            evening_price: r.evening_price,
            evening_paid: r.evening_paid,
        }))
        try {
            const result = await saveMutation.mutateAsync({ entry_date: date, entries })
            toast.success(result.message ?? "Entries saved successfully")
            const cleared = rows.map((r) => ({ ...r, changed: false }))
            setOriginalRows(cleared); setRows(cleared)
        } catch (err: unknown) {
            toast.error(err && typeof err === "object" && "message" in err
                ? String((err as { message: string }).message) : "Failed to save entries")
        }
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const active = rows.filter((r) => r.morning || r.evening).length
        const totalQty = rows.reduce((s, r) =>
            s + (r.morning ? r.morning_qty : 0) + (r.evening ? r.evening_qty : 0), 0)
        const totalAmount = rows.reduce((s, r) =>
            s + calcTotal(r.morning, r.morning_price, r.evening, r.evening_price), 0)
        return { active, totalQty, totalAmount }
    }, [rows])

    const isDateLoading = isLoading || isFetching

    const formattedDate = format(parseISO(date), "d MMM yyyy")
    const footerDate = format(parseISO(date), "EEE, d MMM yyyy")

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-background">

            {/* Header */}
            <header className="shrink-0 flex items-center justify-between px-6 py-4 bg-background border-b border-border gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <button onClick={toggle} title="Toggle sidebar"
                        className="p-1.5 rounded-lg hover:bg-muted/10 text-muted hover:text-foreground transition-colors shrink-0">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Daily Tiffin Entries</h1>
                        <p className="text-sm text-muted">Record daily tiffin deliveries for all customers</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Date picker */}
                    <Popover open={calOpen} onOpenChange={setCalOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2 font-normal min-w-36">
                                <CalendarDays className="w-4 h-4 text-muted" />
                                {formattedDate}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={parseISO(date)}
                                onSelect={handleDateChange}
                                disabled={(d) => d > new Date()}
                            />
                        </PopoverContent>
                    </Popover>

                    {copyMode ? (
                        <Button variant="outline" onClick={handleResetToDefaults} className="gap-2">
                            <RotateCcw className="w-4 h-4" />
                            Use Defaults
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleCopyYesterday} className="gap-2">
                            <Copy className="w-4 h-4" />
                            Copy Yesterday
                        </Button>
                    )}

                    <Button onClick={handleSave} disabled={saveMutation.isPending || rows.length === 0} className="gap-2">
                        {saveMutation.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Save className="w-4 h-4" />}
                        Save All
                    </Button>
                </div>
            </header>

            {/* Scrollable content */}
            <div className="flex-1 overflow-auto">
                <div className="p-6 space-y-5">

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {isDateLoading ? (
                            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                        ) : (
                            <>
                                <StatCard
                                    icon={<Users className="w-5 h-5" />}
                                    heading="Total Customers"
                                    number={String(rows.length)}
                                    variant="primary"
                                />
                                <StatCard
                                    icon={<CheckCircle2 className="w-5 h-5" />}
                                    heading="Active Today"
                                    number={String(stats.active)}
                                    variant="success"
                                />
                                <StatCard
                                    icon={<UtensilsCrossed className="w-5 h-5" />}
                                    heading="Tiffins"
                                    number={String(stats.totalQty)}
                                    variant="warning"
                                />
                                <StatCard
                                    icon={<IndianRupee className="w-5 h-5" />}
                                    heading="Total Amount"
                                    number={`₹${stats.totalAmount.toLocaleString("en-IN")}`}
                                    variant="purple"
                                />
                            </>
                        )}
                    </div>

                    {/* Copy mode banner */}
                    {copyMode && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/15 rounded-xl text-sm text-primary">
                            <Copy className="w-4 h-4 shrink-0" />
                            Loaded from yesterday — review and edit before saving
                        </div>
                    )}

                    {/* Table card */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/10">
                                        <th className="px-4 py-3 text-left font-medium text-muted w-10">#</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Customer</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted">
                                            <HeaderWithInfo label="Morning" tip="Toggle morning delivery, set quantity and price" />
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted w-20">M. Qty</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted w-28">M. Price (₹)</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted w-24">M. Paid</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted">
                                            <HeaderWithInfo label="Evening" tip="Toggle evening delivery, set quantity and price" />
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted w-20">E. Qty</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted w-28">E. Price (₹)</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted w-24">E. Paid</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted w-28">Total (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isDateLoading ? (
                                        [...Array(8)].map((_, i) => (
                                            <tr key={i} className="border-b border-border/50">
                                                <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                                                        <div className="space-y-1.5">
                                                            <Skeleton className="h-3.5 w-28" />
                                                            <Skeleton className="h-3 w-20" />
                                                        </div>
                                                    </div>
                                                </td>
                                                {[...Array(9)].map((_, j) => (
                                                    <td key={j} className="px-4 py-3">
                                                        <Skeleton className="h-8 rounded-lg" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="text-center py-16 text-muted">
                                                <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                No active customers found
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, i) => {
                                            const globalIdx = i
                                            const rowTotal = calcTotal(
                                                row.morning, row.morning_price,
                                                row.evening, row.evening_price
                                            )
                                            return (
                                                <tr
                                                    key={row.customer_id}
                                                    className={cn(
                                                        "border-b border-border/50 transition-colors hover:bg-muted/5",
                                                        row.changed && "bg-warning/5"
                                                    )}
                                                >
                                                    {/* # */}
                                                    <td className="px-4 py-3 text-muted text-xs">{globalIdx + 1}</td>

                                                    {/* Customer */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold",
                                                                avatarColor(row.name)
                                                            )}>{initials(row.name)}</div>
                                                            <div>
                                                                <p className="font-medium text-foreground">{row.name}</p>
                                                                {row.address && (
                                                                    <p className="text-xs text-muted truncate max-w-40">{row.address}</p>
                                                                )}
                                                            </div>
                                                            {row.has_existing_entry && (
                                                                <span className="text-xs text-success font-medium bg-success/10 px-1.5 py-0.5 rounded-full shrink-0">✓ saved</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Morning toggle */}
                                                    <td className="px-4 py-3 text-center">
                                                        <Switch checked={row.morning}
                                                            onCheckedChange={(v) => toggleMorning(globalIdx, v)}
                                                            className="mx-auto" />
                                                    </td>

                                                    {/* Morning qty */}
                                                    <td className="px-3 py-3 text-center">
                                                        <Input type="number" min={1} max={10}
                                                            disabled={!row.morning}
                                                            value={row.morning ? row.morning_qty : 0}
                                                            onChange={(e) => {
                                                                const q = Math.max(1, parseInt(e.target.value) || 1)
                                                                const u = row.morning_qty > 0 ? row.morning_price / row.morning_qty : row.morning_price
                                                                updateRow(globalIdx, { morning_qty: q, morning_price: Math.max(1, Math.round(q * u)) })
                                                            }}
                                                            className="w-16 text-center mx-auto px-1 h-9 disabled:opacity-40" />
                                                    </td>

                                                    {/* Morning price */}
                                                    <td className="px-3 py-3 text-center">
                                                        <Input type="number" min={1}
                                                            disabled={!row.morning}
                                                            value={row.morning_price}
                                                            onChange={(e) => updateRow(globalIdx, { morning_price: Math.max(1, parseFloat(e.target.value) || 1) })}
                                                            className="w-20 text-center mx-auto px-1 h-9 disabled:opacity-40" />
                                                    </td>

                                                    {/* Morning paid */}
                                                    <td className="px-3 py-3 text-center">
                                                        {row.morning && row.morning_qty > 0 ? (
                                                            <PayBadge
                                                                paid={row.morning_paid}
                                                                onToggle={() => updateRow(globalIdx, { morning_paid: !row.morning_paid })}
                                                            />
                                                        ) : (
                                                            <span className="text-muted text-xs">—</span>
                                                        )}
                                                    </td>

                                                    {/* Evening toggle */}
                                                    <td className="px-4 py-3 text-center">
                                                        <Switch checked={row.evening}
                                                            onCheckedChange={(v) => toggleEvening(globalIdx, v)}
                                                            className="mx-auto" />
                                                    </td>

                                                    {/* Evening qty */}
                                                    <td className="px-3 py-3 text-center">
                                                        <Input type="number" min={1} max={10}
                                                            disabled={!row.evening}
                                                            value={row.evening ? row.evening_qty : 0}
                                                            onChange={(e) => {
                                                                const q = Math.max(1, parseInt(e.target.value) || 1)
                                                                const u = row.evening_qty > 0 ? row.evening_price / row.evening_qty : row.evening_price
                                                                updateRow(globalIdx, { evening_qty: q, evening_price: Math.max(1, Math.round(q * u)) })
                                                            }}
                                                            className="w-16 text-center mx-auto px-1 h-9 disabled:opacity-40" />
                                                    </td>

                                                    {/* Evening price */}
                                                    <td className="px-3 py-3 text-center">
                                                        <Input type="number" min={1}
                                                            disabled={!row.evening}
                                                            value={row.evening_price}
                                                            onChange={(e) => updateRow(globalIdx, { evening_price: Math.max(1, parseFloat(e.target.value) || 1) })}
                                                            className="w-20 text-center mx-auto px-1 h-9 disabled:opacity-40" />
                                                    </td>

                                                    {/* Evening paid */}
                                                    <td className="px-3 py-3 text-center">
                                                        {row.evening && row.evening_qty > 0 ? (
                                                            <PayBadge
                                                                paid={row.evening_paid}
                                                                onToggle={() => updateRow(globalIdx, { evening_paid: !row.evening_paid })}
                                                            />
                                                        ) : (
                                                            <span className="text-muted text-xs">—</span>
                                                        )}
                                                    </td>

                                                    {/* Total */}
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={cn(
                                                            "font-semibold",
                                                            rowTotal > 0 ? "text-foreground" : "text-muted"
                                                        )}>
                                                            {rowTotal > 0 ? `₹${rowTotal}` : "—"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            </div>

            {/* Footer */}
            {rows.length > 0 && !isDateLoading && (
                <div className="shrink-0 border-t border-border bg-card px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted">
                        <CalendarDays className="w-4 h-4" />
                        {footerDate}
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                        <span className="text-muted">
                            Total tiffins: <span className="font-semibold text-foreground">{stats.totalQty}</span>
                        </span>
                        <span className="text-muted">
                            Total amount: <span className="font-semibold text-primary">₹{stats.totalAmount.toLocaleString("en-IN")}</span>
                        </span>
                        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                            {saveMutation.isPending
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Save className="w-4 h-4" />}
                            Save All
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Header cell with info tooltip ───────────────────────────────────────────

function HeaderWithInfo({ label, tip }: { label: string; tip: string }) {
    return (
        <div className="flex items-center justify-center gap-1">
            {label}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top">{tip}</TooltipContent>
            </Tooltip>
        </div>
    )
}

// ─── Payment status badge ─────────────────────────────────────────────────────

function PayBadge({ paid, onToggle }: { paid: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer select-none",
                paid
                    ? "bg-success/15 text-success hover:bg-success/25"
                    : "bg-warning/15 text-warning hover:bg-warning/25"
            )}
        >
            {paid ? "Paid" : "Pending"}
        </button>
    )
}
