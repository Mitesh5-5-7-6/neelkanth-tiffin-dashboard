"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ImportPreviewRow } from "@/types/import.type"

interface ExcelPreviewTableProps {
    rows: ImportPreviewRow[]
}

function cellDisplay(row: ImportPreviewRow) {
    if (row.morningQty > 0 && row.eveningQty > 0) return `${row.morningQty}+${row.eveningQty}`
    if (row.morningQty > 0) return String(row.morningQty)
    if (row.eveningQty > 0) return String(row.eveningQty)
    return ""
}

export function ExcelPreviewTable({ rows, onUpdateRow }: ExcelPreviewTableProps & { onUpdateRow?: (id: string, morning: number, evening: number) => void }) {
    const visibleRows = useMemo(() => rows.slice(0, 1000), [rows])

    // Derive customer column order from first occurrence
    const customerOrder = useMemo(() => {
        const seen = new Set<string>()
        const order: string[] = []
        for (const r of visibleRows) {
            if (!seen.has(r.customerName)) {
                seen.add(r.customerName)
                order.push(r.customerName)
            }
        }
        return order
    }, [visibleRows])

    // Dates in order of appearance (unique)
    const dates = useMemo(() => {
        const seen = new Set<string>()
        const list: string[] = []
        for (const r of visibleRows) {
            const d = r.date || r.dateLabel || ""
            if (!d) continue
            if (!seen.has(d)) {
                seen.add(d)
                list.push(d)
            }
        }
        return list
    }, [visibleRows])

    // Map date -> customerName -> row
    const matrix = useMemo(() => {
        const m = new Map<string, Map<string, ImportPreviewRow>>()
        for (const r of visibleRows) {
            const d = r.date || r.dateLabel || ""
            if (!d) continue
            if (!m.has(d)) m.set(d, new Map())
            m.get(d)!.set(r.customerName, r)
        }
        return m
    }, [visibleRows])

    // Per-customer totals and pricing
    const customerTotals = useMemo(() => {
        const totals = new Map<string, { morning: number; evening: number; morningPrice: number; eveningPrice: number }>()
        for (const cname of customerOrder) {
            totals.set(cname, { morning: 0, evening: 0, morningPrice: 0, eveningPrice: 0 })
        }
        for (const r of visibleRows) {
            const t = totals.get(r.customerName)
            if (!t) continue
            t.morning += r.morningQty
            t.evening += r.eveningQty
            if (!t.morningPrice && r.morningPrice) t.morningPrice = r.morningPrice
            if (!t.eveningPrice && r.eveningPrice) t.eveningPrice = r.eveningPrice
        }
        return totals
    }, [visibleRows, customerOrder])

    return (
        <Card className="border-border/80 shadow-sm">
            <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Showing parsed rows in a pivoted preview. Review matches and totals before importing.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                {customerOrder.map((c) => (
                                    <TableHead key={c} className="whitespace-nowrap">
                                        {c}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dates.map((d) => (
                                <TableRow key={d}>
                                    <TableCell className="font-medium">{d}</TableCell>
                                    {customerOrder.map((c) => {
                                        const row = matrix.get(d)?.get(c)
                                        if (!row) return <TableCell key={c} />
                                        return (
                                            <TableCell key={c}>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        className="w-12 rounded border px-2 py-1 text-sm"
                                                        type="number"
                                                        min={0}
                                                        value={row.morningQty}
                                                        onChange={(e) => onUpdateRow?.(row.id, Number(e.target.value || 0), row.eveningQty)}
                                                    />
                                                    <span className="text-sm text-muted-foreground">+</span>
                                                    <input
                                                        className="w-12 rounded border px-2 py-1 text-sm"
                                                        type="number"
                                                        min={0}
                                                        value={row.eveningQty}
                                                        onChange={(e) => onUpdateRow?.(row.id, row.morningQty, Number(e.target.value || 0))}
                                                    />
                                                </div>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}

                            {/* Totals row: quantities */}
                            <TableRow>
                                <TableCell className="font-medium">Total Qty (M / E)</TableCell>
                                {customerOrder.map((c) => {
                                    const t = customerTotals.get(c)!
                                    return (
                                        <TableCell key={c}>
                                            {t.morning} / {t.evening}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>

                            {/* Totals row: revenue breakdown */}
                            <TableRow>
                                <TableCell className="font-medium">Revenue (M)</TableCell>
                                {customerOrder.map((c) => {
                                    const t = customerTotals.get(c)!
                                    const rev = t.morning * (t.morningPrice ?? 0)
                                    return (
                                        <TableCell key={c}>
                                            {t.morning} × {t.morningPrice ?? 0}: {rev}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>

                            <TableRow>
                                <TableCell className="font-medium">Revenue (E)</TableCell>
                                {customerOrder.map((c) => {
                                    const t = customerTotals.get(c)!
                                    const rev = t.evening * (t.eveningPrice ?? 0)
                                    return (
                                        <TableCell key={c}>
                                            {t.evening} × {t.eveningPrice ?? 0}: {rev}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>

                            <TableRow>
                                <TableCell className="font-medium">Total Revenue</TableCell>
                                {customerOrder.map((c) => {
                                    const t = customerTotals.get(c)!
                                    const total = t.morning * (t.morningPrice ?? 0) + t.evening * (t.eveningPrice ?? 0)
                                    return <TableCell key={c}>{total}</TableCell>
                                })}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
