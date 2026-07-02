import * as XLSX from "xlsx";
import type {
  ParsedCellValue,
  ParsedWorkbookCell,
  ParsedWorkbookData,
  ParsedWorkbookRow,
  ImportValidationIssue,
} from "@/types/import.type";

function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseDateValue(
  value: unknown,
  defaultMonth?: number,
  defaultYear?: number,
): {
  date: string | null;
  label: string;
  issue?: ImportValidationIssue;
} {
  const text = toDisplayString(value).trim();
  if (!text) {
    return {
      date: null,
      label: "",
      issue: { code: "invalid-date", message: "Date is missing." },
    };
  }

  const normalized = text.replace(/\//g, "-").replace(/\s+/g, " ");
  const directMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (directMatch) {
    const [, y, m, d] = directMatch;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    if (
      parsed.getFullYear() === Number(y) &&
      parsed.getMonth() === Number(m) - 1 &&
      parsed.getDate() === Number(d)
    ) {
      return {
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        label: normalized,
      };
    }
  }

  const dayMonthYear = normalized.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayMonthYear) {
    const [, d, m, y] = dayMonthYear;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    if (
      parsed.getFullYear() === Number(y) &&
      parsed.getMonth() === Number(m) - 1 &&
      parsed.getDate() === Number(d)
    ) {
      return {
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        label: normalized,
      };
    }
  }

  const dayOnly = normalized.match(/^(\d{1,2})$/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    if (day >= 1 && day <= 31) {
      const now = new Date();
      const year =
        typeof defaultYear === "number" ? defaultYear : now.getFullYear();
      const monthIndex =
        typeof defaultMonth === "number" ? defaultMonth - 1 : now.getMonth();
      const parsed = new Date(year, monthIndex, day);
      if (parsed.getDate() === day) {
        return {
          date: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          label: normalized,
        };
      }
    }
  }

  return {
    date: null,
    label: normalized,
    issue: { code: "invalid-date", message: `Invalid date value: ${text}` },
  };
}

function parseCellValue(rawValue: unknown): ParsedCellValue {
  const rawText = toDisplayString(rawValue).trim();

  if (!rawText) {
    return {
      rawValue: "",
      kind: "blank",
      morningQty: 0,
      eveningQty: 0,
      errors: [],
    };
  }

  const normalized = rawText.toLowerCase();
  if (normalized === "-") {
    return {
      rawValue: rawText,
      kind: "none",
      morningQty: 0,
      eveningQty: 0,
      errors: [],
    };
  }

  if (normalized === "p") {
    return {
      rawValue: rawText,
      kind: "pending",
      morningQty: 0,
      eveningQty: 0,
      errors: [],
    };
  }

  if (normalized === "x" || normalized === "na" || normalized === "n/a") {
    return {
      rawValue: rawText,
      kind: "skip",
      morningQty: 0,
      eveningQty: 0,
      errors: [],
    };
  }

  const splitMatch = rawText.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (splitMatch) {
    return {
      rawValue: rawText,
      kind: "split",
      morningQty: Number(splitMatch[1]),
      eveningQty: Number(splitMatch[2]),
      errors: [],
    };
  }

  const splitTextMatch = rawText.match(/(\d+)\s*\+\s*(\d+)/);
  if (splitTextMatch) {
    return {
      rawValue: rawText,
      kind: "split",
      morningQty: Number(splitTextMatch[1]),
      eveningQty: Number(splitTextMatch[2]),
      errors: [],
    };
  }

  const numberMatch = rawText.match(/^\d+(?:\.\d+)?$/);
  if (numberMatch) {
    return {
      rawValue: rawText,
      kind: "single",
      morningQty: Number(rawText),
      eveningQty: 0,
      errors: [],
    };
  }

  const numberTextMatch = rawText.match(/(\d+)(?:\.\d+)?/);
  if (numberTextMatch) {
    return {
      rawValue: rawText,
      kind: "single",
      morningQty: Number(numberTextMatch[1]),
      eveningQty: 0,
      errors: [],
    };
  }

  return {
    rawValue: rawText,
    kind: "invalid",
    morningQty: 0,
    eveningQty: 0,
    errors: ["Unsupported symbol or format."],
  };
}

export async function parseWorkbookFile(
  file: File,
  defaultMonth?: number,
  defaultYear?: number,
): Promise<ParsedWorkbookData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error("The workbook is empty or missing a worksheet.");
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  if (!rows.length) {
    throw new Error("The workbook is empty.");
  }

  const header = rows[0].map((value) => toDisplayString(value));
  const customerColumns = header
    .slice(1)
    .filter((value) => value.trim() !== "");
  const parsedRows: ParsedWorkbookRow[] = [];
  const issues: ImportValidationIssue[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const parsedDate = parseDateValue(row[0], defaultMonth, defaultYear);
    const cells: ParsedWorkbookCell[] = customerColumns.map(
      (customerName, columnIndex) => {
        const parsedValue = parseCellValue(row[columnIndex + 1]);
        return {
          customerName,
          rawValue: parsedValue.rawValue,
          parsedValue,
          matchStatus: "matched",
          errors: parsedValue.errors,
        };
      },
    );

    if (parsedDate.issue) {
      issues.push({ ...parsedDate.issue, row: index + 2 });
    }

    parsedRows.push({
      rowNumber: index + 2,
      dateLabel: parsedDate.label,
      dateValue: parsedDate.date ?? "",
      date: parsedDate.date,
      cells,
    });
  }

  if (!customerColumns.length) {
    issues.push({
      code: "missing-customer",
      message: "No customer columns were found in the uploaded sheet.",
    });
  }

  return { header, rows: parsedRows, issues };
}
