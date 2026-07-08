"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2, Menu, PlayCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/AppShell"
import { ExcelUploadCard } from "@/components/import/ExcelUploadCard"
import { ExcelPreviewTable } from "@/components/import/ExcelPreviewTable"
import { ImportSummaryCard } from "@/components/import/ImportSummaryCard"
import { ImportProgressDialog } from "@/components/import/ImportProgressDialog"
import { parseWorkbookFile } from "@/lib/import/excelParser"
import { validateImportRows } from "@/lib/import/validation"
import { buildBulkPayloads } from "@/lib/import/bulkPayloadGenerator"
import type { ImportPreviewRow, ImportProgressEvent, ImportRunReport, ImportSummary } from "@/types/import.type"
import type { BulkSavePayload } from "@/types/tiffin.type"
import { useAllCustomers } from "@/hooks/useCustomers"

async function saveBulkPayload(payload: BulkSavePayload[]) {
    const response = await fetch("/api/tiffin-entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    const json = await response.json()
    if (!response.ok) throw new Error(json?.message ?? "Bulk import failed")
    return json
}

export default function ImportEntriesPage() {
    const { toggle } = useSidebar()
    const router = useRouter()
    const { data: customers = [], isLoading: isCustomersLoading, isError: isCustomersError } = useAllCustomers()
    const [fileName, setFileName] = useState<string | null>(null)
    const [isParsing, setIsParsing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([])
    const [originalPreviewRows, setOriginalPreviewRows] = useState<ImportPreviewRow[]>([])
    const [summary, setSummary] = useState<ImportSummary | null>(null)
    const [issues, setIssues] = useState<string[]>([])
    const [isImporting, setIsImporting] = useState(false)
    const [progress, setProgress] = useState<ImportProgressEvent>({ completed: 0, total: 0, currentDate: "", status: "idle" })
    const [report, setReport] = useState<ImportRunReport | null>(null)
    const now = new Date()
    const defaultMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonthDate.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(defaultMonthDate.getFullYear())
    const [lastFile, setLastFile] = useState<File | null>(null)
    const combinedError = error ?? (isCustomersError ? "Unable to load customer data. Please refresh and try again." : null)

    async function handleFileSelected(file: File) {
        setError(null)
        setIsParsing(true)
        setFileName(file.name)
        setLastFile(file)
        setPreviewRows([])
        setIssues([])
        setReport(null)

        try {
            const workbook = await parseWorkbookFile(file, selectedMonth, selectedYear)
            const validation = validateImportRows(workbook, customers)
            setPreviewRows(validation.previewRows)
            setOriginalPreviewRows(validation.previewRows)
            setIssues([...validation.issues.map((issue) => issue.message), ...workbook.issues.map((issue) => issue.message)])
            setSummary({
                importedCustomers: validation.summary.importedCustomers,
                skipped: validation.summary.skipped,
                unmatched: validation.summary.unmatched,
                duplicateNames: validation.summary.duplicateNames,
                duplicateDates: validation.summary.duplicateDates,
                totalEntries: validation.summary.totalEntries,
                totalDates: validation.summary.totalDates,
            })
            if (validation.previewRows.some((row) => row.status === "unmatched")) {
                toast.error("Some rows are unmatched. Fix the customer names before importing.")
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to parse the workbook."
            setError(message)
            toast.error(message)
        } finally {
            setIsParsing(false)
        }
    }

    useEffect(() => {
        if (!lastFile) return
        let mounted = true
            ; (async () => {
                setIsParsing(true)
                try {
                    const workbook = await parseWorkbookFile(lastFile, selectedMonth, selectedYear)
                    if (!mounted) return
                    const validation = validateImportRows(workbook, customers)
                    setPreviewRows(validation.previewRows)
                    setIssues([...validation.issues.map((issue) => issue.message), ...workbook.issues.map((issue) => issue.message)])
                    setSummary({
                        importedCustomers: validation.summary.importedCustomers,
                        skipped: validation.summary.skipped,
                        unmatched: validation.summary.unmatched,
                        duplicateNames: validation.summary.duplicateNames,
                        duplicateDates: validation.summary.duplicateDates,
                        totalEntries: validation.summary.totalEntries,
                        totalDates: validation.summary.totalDates,
                    })
                } catch (err) {
                    const message = err instanceof Error ? err.message : "Unable to parse the workbook."
                    setError(message)
                } finally {
                    setIsParsing(false)
                }
            })()
        return () => {
            mounted = false
        }
    }, [selectedMonth, selectedYear, lastFile, customers])

    function handleUpdateRow(id: string, morningQty: number, eveningQty: number) {
        setPreviewRows((prev) => prev.map((row) =>
            row.id === id ? { ...row, morningQty, eveningQty } : row,
        ))
    }

    async function handleImport() {
        if (!previewRows.length) return
        const payloads = buildBulkPayloads(previewRows)
        if (!payloads.length) {
            toast.error("No valid matched rows were found to import.")
            return
        }

        setIsImporting(true)
        setProgress({ completed: 0, total: 1, currentDate: "Entire month", status: "importing" })

        const results: ImportRunReport["results"] = []
        const failedDates: string[] = []

        try {
            await saveBulkPayload(payloads)
            for (const payload of payloads) {
                results.push({ date: payload.entry_date, success: true, entryCount: payload.entries.length })
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Bulk import failed"
            for (const payload of payloads) {
                failedDates.push(payload.entry_date)
                results.push({ date: payload.entry_date, success: false, error: message, entryCount: payload.entries.length })
            }
        }

        setProgress({ completed: 1, total: 1, currentDate: "", status: "complete" })
        setIsImporting(false)
        setReport({
            successCount: results.filter((item) => item.success).length,
            failedCount: results.filter((item) => !item.success).length,
            failedDates,
            totalImported: results.filter((item) => item.success).reduce((sum, item) => sum + item.entryCount, 0),
            totalFailed: results.filter((item) => !item.success).reduce((sum, item) => sum + item.entryCount, 0),
            results,
        })
        if (failedDates.length) {
            toast.error(`${failedDates.length} date${failedDates.length > 1 ? "s" : ""} failed to import.`)
        } else {
            toast.success("Monthly import finished successfully.")
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={toggle} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground">
                        <Menu className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Import Monthly Entries</h1>
                        <p className="text-sm text-muted-foreground">Upload an Excel sheet, validate it, and import it in bulk.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/dashboard")} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6">
                <div className="mx-auto flex max-w-7xl flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-muted-foreground">Month</label>
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="rounded border px-2 py-1">
                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
                                    <option key={m} value={idx + 1}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-muted-foreground">Year</label>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="rounded border px-2 py-1">
                                {Array.from({ length: 6 }).map((_, i) => {
                                    const y = now.getFullYear() - i
                                    return <option key={y} value={y}>{y}</option>
                                })}
                            </select>
                        </div>
                    </div>

                    <ExcelUploadCard onFileSelected={handleFileSelected} isLoading={isParsing} error={combinedError} acceptedFileName={fileName} />

                    {isCustomersLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-4 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading customer data for matching…
                        </div>
                    ) : null}

                    {previewRows.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Parsed Preview</h2>
                                    <p className="text-sm text-muted-foreground">Review the parsed rows and fix any unmatched or invalid entries before importing.</p>
                                </div>
                                <Button onClick={handleImport} disabled={isImporting || previewRows.every((row) => row.status !== "matched")} className="gap-2">
                                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                                    Import
                                </Button>
                            </div>

                            {summary ? <ImportSummaryCard summary={summary} /> : null}
                            <ExcelPreviewTable
                                rows={previewRows}
                                originalRows={originalPreviewRows}
                                onUpdateRow={handleUpdateRow}
                            />
                        </div>
                    ) : null}

                    {issues.length > 0 ? (
                        <div className="rounded-xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Validation issues found
                            </div>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {issues.map((issue) => <li key={issue}>{issue}</li>)}
                            </ul>
                        </div>
                    ) : null}

                    {report ? (
                        <div className="rounded-xl border border-border/80 bg-card p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-foreground">Import report</h3>
                                    <p className="text-sm text-muted-foreground">{report.successCount} succeeded · {report.failedCount} failed</p>
                                </div>
                                <Button variant="outline" onClick={() => setReport(null)} className="gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Reset
                                </Button>
                            </div>
                            {report.failedDates.length > 0 ? (
                                <div className="mt-3 text-sm text-danger">
                                    Failed dates: {report.failedDates.join(", ")}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </main>

            <ImportProgressDialog open={isImporting} progress={progress} />
        </div>
    )
}
