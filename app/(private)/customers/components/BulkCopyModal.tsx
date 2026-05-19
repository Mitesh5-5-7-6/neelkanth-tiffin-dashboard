"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { X, Loader2, RotateCcw, Info } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { useTiffinPreview, useBulkSaveTiffin } from "@/hooks/useTiffin"
import type { BulkPreviewRow } from "@/types/tiffin.type"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkRow extends BulkPreviewRow {
    total: number
    changed: boolean
}

interface BulkCopyModalProps {
    open: boolean
    fromDate: string   // YYYY-MM-DD
    toDate: string     // YYYY-MM-DD
    onClose: () => void
}

// ─── Keyboard navigation ──────────────────────────────────────────────────────

const COLS = ["morning", "evening", "price"] as const
type EditableCol = (typeof COLS)[number]

function cellId(rowIdx: number, col: EditableCol) {
    return `bk-${rowIdx}-${col}`
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function displayDate(iso: string): string {
    if (!iso) return ""
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
    })
}

function toISO(d: Date) { return d.toISOString().split("T")[0] }
function isYesterday(iso: string) { const d = new Date(); d.setDate(d.getDate() - 1); return iso === toISO(d) }
function isTomorrow(iso: string) { const d = new Date(); d.setDate(d.getDate() + 1); return iso === toISO(d) }
function isToday(iso: string) { return iso === toISO(new Date()) }
function dateLabel(iso: string) {
    if (isYesterday(iso)) return "Yesterday"
    if (isToday(iso)) return "Today"
    if (isTomorrow(iso)) return "Tomorrow"
    return displayDate(iso)
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

function calcTotal(row: Pick<BulkRow, "morning" | "evening" | "price">) {
    return ((row.morning ? 1 : 0) + (row.evening ? 1 : 0)) * row.price
}

function buildRows(previewRows: BulkPreviewRow[]): BulkRow[] {
    return previewRows.map((r) => ({ ...r, total: calcTotal(r), changed: false }))
}

const AVATAR_COLORS = ["bg-primary", "bg-success", "bg-warning", "bg-purple", "bg-danger"]
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }
function initials(name: string) { return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() }

// ─── Main component ───────────────────────────────────────────────────────────

export default function BulkCopyModal({ open, fromDate, toDate, onClose }: BulkCopyModalProps) {
    const [rows, setRows] = useState<BulkRow[]>([])
    const [originalRows, setOriginalRows] = useState<BulkRow[]>([])
    const [hideZero, setHideZero] = useState(false)

    const tableScrollRef = useRef<HTMLDivElement>(null)

    const { data: previewData, isLoading: previewLoading } = useTiffinPreview(open ? fromDate : null)
    const saveMutation = useBulkSaveTiffin()

    useEffect(() => {
        if (previewData?.data) {
            const built = buildRows(previewData.data)
            setRows(built)
            setOriginalRows(built)
        }
    }, [previewData])

    useEffect(() => {
        if (!open) {
            setRows([])
            setOriginalRows([])
            setHideZero(false)
        }
    }, [open])

    const updateRow = useCallback(
        (realIdx: number, field: "morning" | "evening" | "price", value: boolean | number) => {
            setRows((prev) => {
                const next = [...prev]
                const row = { ...next[realIdx], [field]: value }
                row.total = calcTotal(row)
                row.changed = true
                next[realIdx] = row
                return next
            })
        },
        []
    )

    const visibleRows = hideZero ? rows.filter((r) => r.total > 0) : rows
    const grandTotal = rows.reduce((s, r) => s + r.total, 0)
    const changedCount = rows.filter((r) => r.changed).length

    function realIndex(row: BulkRow): number {
        return rows.findIndex((r) => r.customer_id === row.customer_id)
    }

    // ── Virtualizer ────────────────────────────────────────────────────────────

    const virtualizer = useVirtualizer({
        count: visibleRows.length,
        getScrollElement: () => tableScrollRef.current,
        estimateSize: () => 57,
        overscan: 8,
    })

    // ── Keyboard navigation with virtual scroll ────────────────────────────────

    function focusCell(rowIdx: number, col: EditableCol, maxRow: number) {
        if (rowIdx < 0 || rowIdx >= maxRow) return
        virtualizer.scrollToIndex(rowIdx, { align: "auto" })
        // give React a frame to render the newly visible row before focusing
        setTimeout(() => {
            const el = document.getElementById(cellId(rowIdx, col))
            if (!el) return
            el.focus()
            if (el instanceof HTMLInputElement) el.select()
        }, 30)
    }

    function handleKeyNav(e: React.KeyboardEvent, rowIdx: number, col: EditableCol) {
        const ci = COLS.indexOf(col)
        const maxRow = visibleRows.length
        switch (e.key) {
            case "Tab": {
                e.preventDefault()
                const next = e.shiftKey ? ci - 1 : ci + 1
                if (next >= 0 && next < COLS.length) focusCell(rowIdx, COLS[next], maxRow)
                else if (next >= COLS.length) focusCell(rowIdx + 1, COLS[0], maxRow)
                else focusCell(rowIdx - 1, COLS[COLS.length - 1], maxRow)
                break
            }
            case "ArrowRight":
                e.preventDefault(); focusCell(rowIdx, COLS[(ci + 1) % COLS.length], maxRow); break
            case "ArrowLeft":
                e.preventDefault(); focusCell(rowIdx, COLS[(ci - 1 + COLS.length) % COLS.length], maxRow); break
            case "Enter":
            case "ArrowDown":
                e.preventDefault(); focusCell(rowIdx + 1, col, maxRow); break
            case "ArrowUp":
                e.preventDefault(); focusCell(rowIdx - 1, col, maxRow); break
        }
    }

    // ── Save / Reset ───────────────────────────────────────────────────────────

    async function handleSave() {
        try {
            await saveMutation.mutateAsync({
                entry_date: toDate,
                entries: rows.map((r) => ({
                    customer_id: r.customer_id,
                    morning_qty: r.morning ? (r.morning_qty || 1) : 0,
                    morning_price: r.price,
                    morning_paid: r.morning_paid,
                    evening_qty: r.evening ? (r.evening_qty || 1) : 0,
                    evening_price: r.price,
                    evening_paid: r.evening_paid,
                })),
            })
            toast.success(`Saved tiffin data for ${rows.length} customers on ${displayDate(toDate)}`)
            onClose()
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "message" in err
                ? String((err as { message: string }).message) : "Failed to save"
            toast.error(msg)
        }
    }

    function handleReset() {
        setRows(originalRows.map((r) => ({ ...r, changed: false })))
    }

    if (!open) return null

    const virtualItems = virtualizer.getVirtualItems()
    const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0
    const paddingBottom = virtualItems.length > 0
        ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
        : 0

    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative w-full max-w-3xl h-full bg-background shadow-2xl flex flex-col">

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Bulk Copy Tiffin Data</h2>
                        <p className="text-sm text-muted mt-0.5">Copy yesterday's tiffin data to tomorrow</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted bg-muted/10 border border-border rounded-full px-3 py-1">
                            <kbd className="font-mono">Tab</kbd>
                            <span>/</span>
                            <kbd className="font-mono">Arrows</kbd>
                            <span>to navigate</span>
                            <span>•</span>
                            <kbd className="font-mono">Enter</kbd>
                            <span>to move down</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-muted/20 text-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Date row + toggles ── */}
                <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-background shrink-0">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-xs text-muted">Copy From ({dateLabel(fromDate)})</p>
                            <p className="text-sm font-semibold text-foreground mt-0.5">{displayDate(fromDate)}</p>
                        </div>
                        <span className="text-muted">→</span>
                        <div>
                            <p className="text-xs text-muted">Copy To ({dateLabel(toDate)})</p>
                            <p className="text-sm font-semibold text-foreground mt-0.5">{displayDate(toDate)}</p>
                        </div>
                        {isTomorrow(toDate) && (
                            <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 font-medium">
                                Auto (Tomorrow)
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted">Hide zero entries</span>
                            <Switch
                                checked={hideZero}
                                onCheckedChange={setHideZero}
                                aria-label="Hide zero entries"
                            />
                        </div>
                        <span className="text-sm text-muted">
                            Total Customers:{" "}
                            <strong className="text-foreground">{rows.length}</strong>
                        </span>
                    </div>
                </div>

                {/* ── Table (virtualized) ── */}
                <div ref={tableScrollRef} className="flex-1 overflow-auto">
                    {previewLoading ? (
                        <div className="p-6 space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-12 rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-background border-b border-border">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-muted w-10">#</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted">Customer Name</th>
                                    <th className="text-center px-4 py-3 font-medium text-muted w-24">
                                        <div className="flex items-center justify-center gap-1">
                                            Morning <Info className="w-3 h-3 text-muted/60" />
                                        </div>
                                    </th>
                                    <th className="text-center px-4 py-3 font-medium text-muted w-24">
                                        <div className="flex items-center justify-center gap-1">
                                            Evening <Info className="w-3 h-3 text-muted/60" />
                                        </div>
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium text-muted w-36">
                                        <div className="flex items-center justify-end gap-1">
                                            Price / Tiffin (₹) <Info className="w-3 h-3 text-muted/60" />
                                        </div>
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium text-muted w-28">
                                        <div className="flex items-center justify-end gap-1">
                                            Total (₹) <Info className="w-3 h-3 text-muted/60" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                                {paddingTop > 0 && (
                                    <tr><td style={{ height: paddingTop }} /></tr>
                                )}
                                {virtualItems.map((virtualItem) => {
                                    const row = visibleRows[virtualItem.index]!
                                    const ri = realIndex(row)
                                    const visIdx = virtualItem.index
                                    return (
                                        <tr
                                            key={row.customer_id}
                                            data-index={virtualItem.index}
                                            className={cn(
                                                "border-b border-border/40 transition-colors",
                                                row.changed
                                                    ? "bg-primary/5 hover:bg-primary/8"
                                                    : "hover:bg-muted/5"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-muted text-center">{visIdx + 1}</td>

                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                                                        avatarColor(row.name)
                                                    )}>
                                                        {initials(row.name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{row.name}</p>
                                                        {row.address && (
                                                            <p className="text-xs text-muted truncate max-w-48">{row.address}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                <Checkbox
                                                    id={cellId(ri, "morning")}
                                                    checked={row.morning}
                                                    onCheckedChange={(v) => updateRow(ri, "morning", !!v)}
                                                    onKeyDown={(e) => handleKeyNav(e, visIdx, "morning")}
                                                    className="w-5 h-5 mx-auto"
                                                />
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                <Checkbox
                                                    id={cellId(ri, "evening")}
                                                    checked={row.evening}
                                                    onCheckedChange={(v) => updateRow(ri, "evening", !!v)}
                                                    onKeyDown={(e) => handleKeyNav(e, visIdx, "evening")}
                                                    className="w-5 h-5 mx-auto"
                                                />
                                            </td>

                                            <td className="px-4 py-3">
                                                <input
                                                    id={cellId(ri, "price")}
                                                    type="number"
                                                    min={0}
                                                    max={10000}
                                                    value={row.price}
                                                    onChange={(e) => {
                                                        const v = parseFloat(e.target.value)
                                                        if (!isNaN(v) && v >= 0) updateRow(ri, "price", v)
                                                    }}
                                                    onKeyDown={(e) => handleKeyNav(e, visIdx, "price")}
                                                    className="h-8 w-24 rounded-lg border border-input bg-background text-right px-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ml-auto block"
                                                />
                                            </td>

                                            <td className={cn(
                                                "px-4 py-3 text-right font-semibold tabular-nums",
                                                row.total === 0 ? "text-warning" : "text-success"
                                            )}>
                                                {row.total}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {paddingBottom > 0 && (
                                    <tr><td style={{ height: paddingBottom }} /></tr>
                                )}

                                {visibleRows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-muted">
                                            {rows.length === 0
                                                ? "No active customers found"
                                                : "All entries have zero total — toggle 'Hide zero entries' off to see them"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="border-t border-border px-6 py-4 shrink-0 bg-background">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {changedCount > 0 && (
                                <div className="flex items-center gap-1.5 text-sm text-primary">
                                    <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                                    Rows highlighted in blue have unsaved changes
                                </div>
                            )}
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                            Grand Total{" "}
                            <span className="text-success tabular-nums ml-2">
                                {grandTotal.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-3">
                        <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            disabled={saveMutation.isPending || changedCount === 0}
                            className="gap-1.5"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset Changes
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saveMutation.isPending || rows.length === 0}
                            className="gap-2"
                        >
                            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save All ({rows.length} Customers)
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
