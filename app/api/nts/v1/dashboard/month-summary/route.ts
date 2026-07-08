import "server-only";
import type { NextRequest } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import TiffinEntry from "@/models/tiffin-entry.model";
import Expense from "@/models/expense.model";
import { checkAuth } from "@/lib/checkAuth";
import { success, internalServerError } from "@/lib/apiResponse";
import { pctChange } from "@/lib/dashboard-dates";

function parseMonthYear(request: NextRequest) {
  const url = new URL(request.url);
  const month = Number(url.searchParams.get("month"));
  const year = Number(url.searchParams.get("year"));
  if (
    !Number.isNaN(month) &&
    month >= 1 &&
    month <= 12 &&
    !Number.isNaN(year)
  ) {
    return { month, year };
  }
  return null;
}

/**
 * "This Month at a Glance" — calendar month vs the previous month.
 *
 * Revenue is accrual tiffin billing (sum of TiffinEntry.total_amount), the same
 * definition used by the headline cards and the trend chart. Profit = revenue −
 * expenses. avgPerDay is tiffins per day that actually had entries.
 */
export async function GET(request: NextRequest) {
  const { error } = await checkAuth();
  if (error) return error;

  try {
    await dbConnect();

    const parsed = parseMonthYear(request);
    const now = new Date();
    const useYear = parsed?.year ?? now.getUTCFullYear();
    const useMonthIndex = parsed ? parsed.month - 1 : now.getUTCMonth();

    const thisMonthStart = new Date(Date.UTC(useYear, useMonthIndex, 1));
    const nextMonthStart = new Date(Date.UTC(useYear, useMonthIndex + 1, 1));
    const lastMonthStart = new Date(Date.UTC(useYear, useMonthIndex - 1, 1));

    const tiffinGroup = {
      _id: null,
      total: { $sum: "$total_qty" },
      amount: { $sum: "$total_amount" },
    };

    const [
      thisTiffin,
      lastTiffin,
      thisExpense,
      lastExpense,
      activeCustomers,
      activeDayList,
    ] = await Promise.all([
      TiffinEntry.aggregate([
        {
          $match: { entry_date: { $gte: thisMonthStart, $lt: nextMonthStart } },
        },
        { $group: tiffinGroup },
      ]),
      TiffinEntry.aggregate([
        {
          $match: { entry_date: { $gte: lastMonthStart, $lt: thisMonthStart } },
        },
        { $group: tiffinGroup },
      ]),
      Expense.aggregate([
        {
          $match: {
            expense_date: { $gte: thisMonthStart, $lt: nextMonthStart },
            is_deleted: false,
          },
        },
        { $group: { _id: null, amount: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            expense_date: { $gte: lastMonthStart, $lt: thisMonthStart },
            is_deleted: false,
          },
        },
        { $group: { _id: null, amount: { $sum: "$amount" } } },
      ]),
      TiffinEntry.distinct("customer_id", {
        entry_date: { $gte: thisMonthStart, $lt: nextMonthStart },
      }),
      TiffinEntry.distinct("entry_date", {
        entry_date: { $gte: thisMonthStart, $lt: nextMonthStart },
      }),
    ]);

    const tT = thisTiffin[0] ?? { total: 0, amount: 0 };
    const lT = lastTiffin[0] ?? { total: 0, amount: 0 };
    const tE = thisExpense[0]?.amount ?? 0;
    const lE = lastExpense[0]?.amount ?? 0;
    const activeDays = (activeDayList as Date[]).length;

    const thisProfit = tT.amount - tE;
    const lastProfit = lT.amount - lE;

    return success(
      {
        tiffins: {
          total: tT.total,
          avgPerDay:
            activeDays > 0 ? Math.round((tT.total / activeDays) * 10) / 10 : 0,
          vsLastMonth: pctChange(tT.total, lT.total),
        },
        revenue: {
          amount: tT.amount,
          vsLastMonth: pctChange(tT.amount, lT.amount),
        },
        expense: {
          amount: tE,
          vsLastMonth: pctChange(tE, lE),
        },
        profit: {
          amount: thisProfit,
          vsLastMonth: pctChange(thisProfit, lastProfit),
        },
        activeCustomers: (activeCustomers as unknown[]).length,
        activeDays,
      },
      "Month summary fetched",
    );
  } catch (e) {
    return internalServerError(e);
  }
}
