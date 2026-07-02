import type { Customer } from "@/types/customer.type";
import type {
  ParsedWorkbookData,
  ImportPreviewRow,
  ImportValidationIssue,
} from "@/types/import.type";

export function normalizeCustomerName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(.)\1+/g, "$1");
}

export function matchCustomersToWorkbook(
  workbook: ParsedWorkbookData,
  customers: Customer[],
): {
  previewRows: ImportPreviewRow[];
  issues: ImportValidationIssue[];
  duplicateNames: number;
} {
  const normalizedLookup = new Map<string, Customer>();

  for (const customer of customers) {
    const normalized = normalizeCustomerName(customer.full_name);
    if (!normalizedLookup.has(normalized)) {
      normalizedLookup.set(normalized, customer);
    }
  }

  const duplicateNames = workbook.header
    .slice(1)
    .map((name) => normalizeCustomerName(name))
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) !== index).length;

  const previewRows: ImportPreviewRow[] = [];
  const issues: ImportValidationIssue[] = [];

  if (duplicateNames > 0) {
    issues.push({
      code: "duplicate-customer-columns",
      message: `${duplicateNames} duplicate customer column${duplicateNames > 1 ? "s" : ""} detected in the workbook.`,
    });
  }

  for (const row of workbook.rows) {
    for (const cell of row.cells) {
      const normalizedName = normalizeCustomerName(cell.customerName);
      const matchedCustomer = normalizedName
        ? normalizedLookup.get(normalizedName)
        : undefined;

      if (!cell.customerName.trim()) {
        previewRows.push({
          id: `${row.rowNumber}-${cell.customerName}-${previewRows.length}`,
          date: row.date ?? "",
          dateLabel: row.dateLabel,
          customerName: cell.customerName,
          morningQty: 0,
          eveningQty: 0,
          morningPrice: 0,
          eveningPrice: 0,
          morningPaid: false,
          eveningPaid: false,
          status: "skipped",
          errors: ["Customer column is empty."],
        });
        continue;
      }

      if (!matchedCustomer) {
        previewRows.push({
          id: `${row.rowNumber}-${cell.customerName}-${previewRows.length}`,
          date: row.date ?? "",
          dateLabel: row.dateLabel,
          customerName: cell.customerName,
          morningQty: 0,
          eveningQty: 0,
          morningPrice: 0,
          eveningPrice: 0,
          morningPaid: false,
          eveningPaid: false,
          status: "unmatched",
          errors: ["No active customer matched this column name."],
        });
        continue;
      }

      const nextPreviewRow: ImportPreviewRow = {
        id: `${row.rowNumber}-${cell.customerName}-${previewRows.length}`,
        date: row.date ?? "",
        dateLabel: row.dateLabel,
        customerName: cell.customerName,
        customerId: matchedCustomer._id,
        morningQty: cell.parsedValue.morningQty,
        eveningQty: cell.parsedValue.eveningQty,
        morningPrice: 0,
        eveningPrice: 0,
        morningPaid: false,
        eveningPaid: false,
        status: "matched",
        errors: cell.parsedValue.errors,
      };

      previewRows.push(nextPreviewRow);
    }
  }

  return { previewRows, issues, duplicateNames };
}
