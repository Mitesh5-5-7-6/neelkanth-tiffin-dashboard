/**
 * scripts/repair-tiffin-totals.ts
 * ------------------------------------------------------------------------
 * Fixes tiffin entries whose `total_amount` was saved WITHOUT multiplying by
 * the number of tiffins (the bulk-import bug). Recomputes each entry's charge
 * from the customer's per-tiffin rate:
 *
 *     rate         = tiffin_defaults.<meal>_price / <meal>_qty   // price of ONE tiffin
 *     charge(meal) = round(rate * entry.<meal>_qty)              // charge for that slot
 *     total_amount = morning_charge + evening_charge
 *
 * Safe on both imported AND hand-entered rows: the value is always derived
 * from the authoritative per-tiffin rate, so it can never double-count.
 * Entries flagged `is_manual_price` are LEFT UNTOUCHED (price set by hand,
 * can't be re-derived) and reported so you can check them yourself.
 *
 * DRY RUN by default — prints before/after and writes nothing. Add --apply.
 *
 * Run from the repo root:
 *   npx tsx --env-file=.env.local scripts/repair-tiffin-totals.ts
 *   npx tsx --env-file=.env.local scripts/repair-tiffin-totals.ts --apply
 *
 * Optional date window (defaults to ALL entries):
 *   ... scripts/repair-tiffin-totals.ts --from=2026-06-01 --to=2026-06-30
 */

import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import TiffinEntry from "@/models/tiffin-entry.model";
import Customer from "@/models/customer.model";

const APPLY = process.argv.includes("--apply");

const argVal = (key: string): string | null => {
  const a = process.argv.find((x) => x.startsWith(`--${key}=`));
  return a ? a.split("=")[1] : null;
};
const fromStr = argVal("from");
const toStr = argVal("to");
const toUTC = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const inr = (n: number): string => "₹" + Math.round(n).toLocaleString("en-IN");

interface Rate {
  m: number;
  e: number;
}

async function main(): Promise<void> {
  await dbConnect();

  // Build customerId -> per-tiffin rate map
  const customers = await Customer.find({}, { tiffin_defaults: 1 }).lean();
  const rate = new Map<string, Rate>();
  for (const c of customers as Array<{
    _id: unknown;
    tiffin_defaults?: Record<string, number>;
  }>) {
    const td = c.tiffin_defaults ?? {};
    const mQty = Math.max(1, td.morning_qty || 1);
    const eQty = Math.max(1, td.evening_qty || 1);
    rate.set(String(c._id), {
      m: (td.morning_price || 0) / mQty,
      e: (td.evening_price || 0) / eQty,
    });
  }

  const filter: Record<string, unknown> = {};
  if (fromStr || toStr) {
    const range: Record<string, Date> = {};
    if (fromStr) range.$gte = toUTC(fromStr);
    if (toStr) range.$lt = new Date(toUTC(toStr).getTime() + 86_400_000);
    filter.entry_date = range;
  }

  let scanned = 0;
  let willFix = 0;
  let alreadyOk = 0;
  let manualSkipped = 0;
  let noRate = 0;
  let revBefore = 0;
  let revAfter = 0;
  const ops: Array<{
    updateOne: {
      filter: Record<string, unknown>;
      update: Record<string, unknown>;
    };
  }> = [];

  const cursor = TiffinEntry.find(filter).lean().cursor();

  for await (const e of cursor) {
    scanned++;
    const entry = e as unknown as {
      _id: unknown;
      customer_id: unknown;
      morning_qty: number;
      evening_qty: number;
      morning_price: number;
      evening_price: number;
      total_amount: number;
      is_manual_price?: boolean;
    };
    revBefore += entry.total_amount || 0;

    if (entry.is_manual_price) {
      manualSkipped++;
      revAfter += entry.total_amount || 0;
      continue;
    }

    const rt = rate.get(String(entry.customer_id));
    if (!rt) {
      noRate++;
      revAfter += entry.total_amount || 0;
      continue;
    }

    const mCharge =
      entry.morning_qty > 0 ? Math.round(rt.m * entry.morning_qty) : 0;
    const eCharge =
      entry.evening_qty > 0 ? Math.round(rt.e * entry.evening_qty) : 0;
    const total = mCharge + eCharge;
    revAfter += total;

    const changed =
      (entry.morning_qty > 0 && entry.morning_price !== mCharge) ||
      (entry.evening_qty > 0 && entry.evening_price !== eCharge) ||
      entry.total_amount !== total;

    if (!changed) {
      alreadyOk++;
      continue;
    }

    willFix++;
    const set: Record<string, number> = { total_amount: total };
    if (entry.morning_qty > 0) set.morning_price = mCharge;
    if (entry.evening_qty > 0) set.evening_price = eCharge;
    ops.push({
      updateOne: { filter: { _id: entry._id }, update: { $set: set } },
    });
  }

  const line = "─".repeat(56);
  console.log(line);
  console.log(`Scanned entries        : ${scanned}`);
  console.log(`Already correct        : ${alreadyOk}`);
  console.log(`Will be fixed          : ${willFix}`);
  console.log(
    `Manual price (skipped) : ${manualSkipped}${manualSkipped ? "   (review by hand)" : ""}`,
  );
  console.log(
    `No customer rate found : ${noRate}${noRate ? "   (customer deleted? review)" : ""}`,
  );
  console.log(line);
  console.log(`Revenue BEFORE : ${inr(revBefore)}`);
  console.log(`Revenue AFTER  : ${inr(revAfter)}`);
  console.log(line);

  if (!APPLY) {
    console.log(
      "DRY RUN — nothing written. If AFTER looks right, re-run with  --apply",
    );
  } else if (ops.length) {
    const res = await TiffinEntry.bulkWrite(ops, { ordered: false });
    console.log(`Applied. Modified ${res.modifiedCount} entries.`);
  } else {
    console.log("Nothing to write.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
