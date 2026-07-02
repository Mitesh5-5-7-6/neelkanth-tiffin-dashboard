export type ImportStatus = "matched" | "unmatched" | "duplicate" | "skipped" | "validation-error"

export interface ImportValidationIssue {
    code:
    | "empty-workbook"
    | "invalid-date"
    | "invalid-quantity"
    | "invalid-symbol"
    | "missing-customer"
    | "unknown-customer"
    | "duplicate-customer-columns"
    | "duplicate-dates"
    message: string
    row?: number
    column?: string
}

export interface ParsedCellValue {
    rawValue: string
    kind: "blank" | "skip" | "none" | "pending" | "single" | "split" | "invalid"
    morningQty: number
    eveningQty: number
    errors: string[]
}

export interface ParsedWorkbookRow {
    rowNumber: number
    dateLabel: string
    dateValue: string
    date: string | null
    cells: ParsedWorkbookCell[]
}

export interface ParsedWorkbookCell {
    customerName: string
    rawValue: string
    parsedValue: ParsedCellValue
    matchedCustomerId?: string
    matchStatus: ImportStatus
    errors: string[]
}

export interface ParsedWorkbookData {
    header: string[]
    rows: ParsedWorkbookRow[]
    issues: ImportValidationIssue[]
}

export interface ImportPreviewRow {
    id: string
    date: string
    dateLabel: string
    customerName: string
    customerId?: string
    morningQty: number
    eveningQty: number
    morningPrice: number
    eveningPrice: number
    morningPaid: boolean
    eveningPaid: boolean
    status: ImportStatus
    errors: string[]
}

export interface ImportSummary {
    importedCustomers: number
    skipped: number
    unmatched: number
    duplicateNames: number
    duplicateDates: number
    totalEntries: number
    totalDates: number
}

export interface ImportProgressEvent {
    completed: number
    total: number
    currentDate: string
    status: "idle" | "uploading" | "importing" | "complete" | "error"
}

export interface ImportResult {
    date: string
    success: boolean
    message?: string
    error?: string
    entryCount: number
}

export interface ImportRunReport {
    successCount: number
    failedCount: number
    failedDates: string[]
    totalImported: number
    totalFailed: number
    results: ImportResult[]
}
