"use client"

import { useMemo } from "react"
import { AlertTriangle, CheckCircle2, CircleSlash, CopySlash, BadgeAlert } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ImportPreviewRow } from "@/types/import.type"

interface ExcelPreviewTableProps {
    rows: ImportPreviewRow[]
}

const statusStyles: Record<ImportPreviewRow["status"], string> = {
    matched: "bg-success/10 text-success",
    unmatched: "bg-warning/10 text-warning",
    duplicate: "bg-purple/10 text-purple",
    skipped: "bg-muted/10 text-muted-foreground",
    "validation-error": "bg-danger/10 text-danger",
}

const statusIcons: Record<ImportPreviewRow["status"], React.ReactNode> = {
    matched: <CheckCircle2 className="h-3.5 w-3.5" />,
    unmatched: <AlertTriangle className="h-3.5 w-3.5" />,
    duplicate: <CopySlash className="h-3.5 w-3.5" />,
    skipped: <CircleSlash className="h-3.5 w-3.5" />,
    "validation-error": <BadgeAlert className="h-3.5 w-3.5" />,
}

export function ExcelPreviewTable({ rows }: ExcelPreviewTableProps) {
    const visibleRows = useMemo(() => rows.slice(0, 120), [rows])

    return (
        <Card className="border-border/80 shadow-sm">
            <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Showing the first 120 parsed rows. Review matches and validation issues before importing.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Customer ID</TableHead>
                                <TableHead>Morning Qty</TableHead>
                                <TableHead>Evening Qty</TableHead>
                                <TableHead>Morning Price</TableHead>
                                <TableHead>Evening Price</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleRows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.dateLabel || row.date}</TableCell>
                                    <TableCell>{row.customerName}</TableCell>
                                    <TableCell className="font-mono text-xs">{row.customerId ?? "—"}</TableCell>
                                    <TableCell>{row.morningQty}</TableCell>
                                    <TableCell>{row.eveningQty}</TableCell>
                                    <TableCell>{row.morningPrice}</TableCell>
                                    <TableCell>{row.eveningPrice}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusStyles[row.status]}`}>
                                            {statusIcons[row.status]}
                                            {row.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
