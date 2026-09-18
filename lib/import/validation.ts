import type { Customer } from '@/types/customer.type'
import type { ImportPreviewRow, ParsedWorkbookData, ImportSummary, ImportValidationIssue } from '@/types/import.type'
import { matchCustomersToWorkbook } from '@/lib/import/customerMatcher'

export function validateImportRows(
    workbook: ParsedWorkbookData,
    customers: Customer[]
): { previewRows: ImportPreviewRow[]; summary: ImportSummary; issues: ImportValidationIssue[] } {
    const { previewRows: matchedRows, issues: customerIssues, duplicateNames } = matchCustomersToWorkbook(workbook, customers)
    const issues: ImportValidationIssue[] = [...workbook.issues, ...customerIssues]

    const normalizedRows = matchedRows.map((row) => ({ ...row }))
    const dateCounts = new Map<string, number>()

    for (const workbookRow of workbook.rows) {
        if (!workbookRow.date) continue
        dateCounts.set(workbookRow.date, (dateCounts.get(workbookRow.date) ?? 0) + 1)
    }

    const duplicateDates = new Set(
        Array.from(dateCounts.entries())
            .filter(([, count]) => count > 1)
            .map(([date]) => date),
    )

    const validatedRows: ImportPreviewRow[] = normalizedRows.map((row) => {
        const customer = customers.find((entry) => entry._id === row.customerId)
        const isDuplicateDate = duplicateDates.has(row.date)
        const nextErrors = [...row.errors]

        if (!row.customerId) {
            return { ...row, status: 'unmatched', errors: nextErrors }
        }

        if (!row.date) {
            return { ...row, status: 'validation-error', errors: [...nextErrors, 'Date is invalid.'] }
        }

        if (isDuplicateDate) {
            return {
                ...row,
                status: 'duplicate',
                errors: [...nextErrors, 'Date appears more than once in the workbook.'],
            }
        }

        if (customer) {
            const defaults = customer.tiffin_defaults
            const morningEnabled = defaults?.morning ?? true
            const eveningEnabled = defaults?.evening ?? false
            let morningQty = row.morningQty > 0 ? row.morningQty : 0
            let eveningQty = row.eveningQty > 0 ? row.eveningQty : 0

            if (morningQty > 0 && eveningQty === 0) {
                if (!morningEnabled && eveningEnabled) {
                    eveningQty = morningQty
                    morningQty = 0
                }
            }

            const morningPrice = morningQty > 0 ? defaults?.morning_price ?? 0 : 0
            const eveningPrice = eveningQty > 0 ? defaults?.evening_price ?? 0 : 0

            const baseRow = {
                ...row,
                morningQty: morningEnabled ? morningQty : 0,
                eveningQty: eveningEnabled ? eveningQty : 0,
                morningPrice: morningEnabled ? morningPrice : 0,
                eveningPrice: eveningEnabled ? eveningPrice : 0,
                morningPaid: false,
                eveningPaid: false,
            }

            if (baseRow.status === 'matched' && nextErrors.length === 0) {
                return { ...baseRow, status: 'matched' }
            }

            return { ...baseRow, status: 'validation-error' }
        }

        return { ...row, status: 'validation-error', errors: [...nextErrors, 'Customer details are unavailable.'] }
    })

    const previewRows = validatedRows.filter((row) => Boolean(row.customerName))

    const summary: ImportSummary = {
        importedCustomers: new Set(previewRows.filter((row) => row.status === 'matched').map((row) => row.customerId)).size,
        skipped: previewRows.filter((row) => row.status === 'skipped').length,
        unmatched: previewRows.filter((row) => row.status === 'unmatched').length,
        duplicateNames,
        duplicateDates: duplicateDates.size,
        totalEntries: previewRows.filter((row) => row.status === 'matched').length,
        totalDates: new Set(previewRows.filter((row) => row.status === 'matched').map((row) => row.date)).size,
    }

    return { previewRows, summary, issues }
}
