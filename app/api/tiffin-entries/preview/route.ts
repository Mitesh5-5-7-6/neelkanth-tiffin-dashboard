import { type NextRequest } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Customer from "@/models/customer.model";
import TiffinEntry from "@/models/tiffin-entry.model";
import { checkAuth } from "@/lib/checkAuth";
import { success, badRequest, internalServerError } from "@/lib/apiResponse";
import type { TiffinPreviewRow } from "@/types/tiffin.type";

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * GET /api/tiffin-entries/preview?date=YYYY-MM-DD[&fromDate=YYYY-MM-DD]
 *
 * Returns one row per active customer, merging:
 * - If fromDate is provided: copy that date's existing entries as defaults
 * - Otherwise (or where no prior entry exists): use the customer's tiffin_defaults
 * - Any saved entry for `date` overrides both
 */
export async function GET(request: NextRequest) {
  const { error } = await checkAuth();
  if (error) return error;

  const date = request.nextUrl.searchParams.get("date");
  const fromDate = request.nextUrl.searchParams.get("fromDate");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return badRequest("date query param is required (format: YYYY-MM-DD)");
  }
  if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    return badRequest("fromDate must be in YYYY-MM-DD format");
  }

  try {
    await dbConnect();

    const targetDate = parseDate(date);
    const targetNext = new Date(targetDate.getTime() + 86_400_000);

    const [customers, targetEntries, sourceEntries] = await Promise.all([
      Customer.find({ is_active: true }).lean(),
      TiffinEntry.find({
        entry_date: { $gte: targetDate, $lt: targetNext },
      }).lean(),
      fromDate
        ? TiffinEntry.find({
            entry_date: {
              $gte: parseDate(fromDate),
              $lt: new Date(parseDate(fromDate).getTime() + 86_400_000),
            },
          }).lean()
        : Promise.resolve([]),
    ]);

    const targetMap = new Map(
      targetEntries.map((e) => [String(e.customer_id), e]),
    );
    const sourceMap = new Map(
      sourceEntries.map((e) => [String(e.customer_id), e]),
    );

    const rows: TiffinPreviewRow[] = customers.map((c) => {
      const customerId = String(c._id);
      const existing = targetMap.get(customerId);
      const source = sourceMap.get(customerId);

      if (existing) {
        return {
          customer_id: customerId,
          name: c.full_name,
          address: c.address,
          morning: existing.morning_qty > 0,
          morning_qty: existing.morning_qty,
          morning_price: existing.morning_price,
          morning_paid: existing.morning_paid ?? false,
          evening: existing.evening_qty > 0,
          evening_qty: existing.evening_qty,
          evening_price: existing.evening_price,
          evening_paid: existing.evening_paid ?? false,
          extras: Array.isArray(existing.extras) ? existing.extras : [],
          has_existing_entry: true,
        };
      }

      if (source) {
        return {
          customer_id: customerId,
          name: c.full_name,
          address: c.address,
          morning: source.morning_qty > 0,
          morning_qty: source.morning_qty,
          morning_price: source.morning_price,
          morning_paid: false,
          evening: source.evening_qty > 0,
          evening_qty: source.evening_qty,
          evening_price: source.evening_price,
          evening_paid: false,
          extras: Array.isArray(source.extras) ? source.extras : [],
          has_existing_entry: false,
        };
      }

      // Fall back to safe defaults for legacy documents without tiffin_defaults
      const td = c.tiffin_defaults ?? {
        morning: true,
        morning_qty: 1,
        morning_price: 30,
        evening: true,
        evening_qty: 1,
        evening_price: 30,
      };
      return {
        customer_id: customerId,
        name: c.full_name,
        address: c.address,
        morning: td.morning,
        morning_qty: td.morning_qty,
        morning_price: td.morning_price,
        morning_paid: false,
        evening: td.evening,
        evening_qty: td.evening_qty,
        evening_price: td.evening_price,
        evening_paid: false,
        extras: [],
        has_existing_entry: false,
      };
    });

    return success(rows, "Preview ready", {
      date,
      fromDate,
      count: rows.length,
    });
  } catch (e) {
    return internalServerError(e);
  }
}
