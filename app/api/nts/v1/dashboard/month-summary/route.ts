import "server-only";
import type { NextRequest } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import TiffinEntry from "@/models/tiffin-entry.model";
import Expense from "@/models/expense.model";
import Payment from "@/models/payment.model";
import Customer from "@/models/customer.model";
import { checkAuth } from "@/lib/checkAuth";
import { success, internalServerError } from "@/lib/apiResponse";
import { pctChange } from "@/lib/dashboard-dates";

void Customer;

function parseMonthYear(request: NextRequest) {
  const url = new URL(request.url);
  const m = url.searchParams.get("month");
  const y = url.searchParams.get("year");
  if (m && y) {
    const month = Number(m); // 1-based
    const year = Number(y);
    if (!Number.isNaN(month) && !Number.isNaN(year)) return { month, year };
  }
  return null;
}

export async function GET(request?: NextRequest) {
  const { error } = await checkAuth();
  if (error) return error;

  try {
    await dbConnect();

    const parsed = request ? parseMonthYear(request) : null;
    const now = new Date();
    // Default to previous month if not provided
    const useYear = parsed?.year ?? now.getUTCFullYear();
    const useMonthIndex = parsed ? parsed.month - 1 : now.getUTCMonth() - 1;

    const thisMonthStart = new Date(Date.UTC(useYear, useMonthIndex, 1));
    const nextMonthStart = new Date(Date.UTC(useYear, useMonthIndex + 1, 1));
    const lastMonthStart = new Date(Date.UTC(useYear, useMonthIndex - 1, 1));

    const [
      thisTiffin,
      lastTiffin,
      thisRevenue,
      lastRevenue,
      thisExpense,
      lastExpense,
      activeCustomers,
      daysInMonth,
    ] = await Promise.all([
      TiffinEntry.aggregate([
        {
          $match: { entry_date: { $gte: thisMonthStart, $lt: nextMonthStart } },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total_qty" },
            amount: { $sum: "$total_amount" },
          },
        },
      ]),
      TiffinEntry.aggregate([
        {
          $match: { entry_date: { $gte: lastMonthStart, $lt: thisMonthStart } },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total_qty" },
            amount: { $sum: "$total_amount" },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            payment_date: { $gte: thisMonthStart, $lt: nextMonthStart },
          },
        },
        { $group: { _id: null, amount: { $sum: "$paid_amount" } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            payment_date: { $gte: lastMonthStart, $lt: thisMonthStart },
          },
        },
        { $group: { _id: null, amount: { $sum: "$paid_amount" } } },
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
      // Count distinct days that have at least one entry this month
      TiffinEntry.distinct("entry_date", {
        entry_date: { $gte: thisMonthStart, $lt: nextMonthStart },
      }),
    ]);

    const tT = thisTiffin[0] ?? { total: 0, amount: 0 };
    const lT = lastTiffin[0] ?? { total: 0, amount: 0 };
    const tR = thisRevenue[0]?.amount ?? 0;
    const lR = lastRevenue[0]?.amount ?? 0;
    const tE = thisExpense[0]?.amount ?? 0;
    const lE = lastExpense[0]?.amount ?? 0;
    const activeDays = (daysInMonth as Date[]).length;

    return success(
      {
        tiffins: {
          total: tT.total,
          avgPerDay: activeDays > 0 ? Math.round(tT.total / activeDays) : 0,
          vsLastMonth: pctChange(tT.total, lT.total),
        },
        revenue: {
          amount: tR,
          vsLastMonth: pctChange(tR, lR),
        },
        expense: {
          amount: tE,
          vsLastMonth: pctChange(tE, lE),
        },
        profit: {
          amount: tR - tE,
          vsLastMonth: pctChange(tR - tE, lR - lE),
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
