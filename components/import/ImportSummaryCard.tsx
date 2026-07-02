"use client"

import { BarChart3, CircleAlert, Users, CalendarRange, FileCheck2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ImportSummary } from "@/types/import.type"

interface ImportSummaryCardProps {
    summary: ImportSummary
}

export function ImportSummaryCard({ summary }: ImportSummaryCardProps) {
    const items = [
        { label: "Imported Customers", value: summary.importedCustomers, icon: Users },
        { label: "Skipped", value: summary.skipped, icon: CircleAlert },
        { label: "Unmatched", value: summary.unmatched, icon: BarChart3 },
        { label: "Duplicate Names", value: summary.duplicateNames, icon: FileCheck2 },
        { label: "Duplicate Dates", value: summary.duplicateDates, icon: CalendarRange },
        { label: "Total Entries", value: summary.totalEntries, icon: FileCheck2 },
    ]

    return (
        <Card className="border-border/80 shadow-sm">
            <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Validation and matching results from the uploaded workbook.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-xl border border-border/70 bg-background/70 p-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Icon className="h-4 w-4" />
                                {label}
                            </div>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
