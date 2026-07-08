import "server-only";
import type { NextRequest } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import TiffinEntry from "@/models/tiffin-entry.model";
import Expense from "@/models/expense.model";
import Payment from "@/models/payment.model";
import { checkAuth } from "@/lib/checkAuth";
import { success, internalServerError } from "@/lib/apiResponse";
import { parseRequestRange, pctChange } from "@/lib/dashboard-dates";

/**
 * Headline stats for the selected period.
 *
 * Revenue is the *billed value of tiffins served* in the period (accrual:
 * sum of TiffinEntry.total_amount), matching the Revenue-vs-Expense chart and
 * the month summary. Profit = revenue − expenses. Cash actually collected is a
 * separate concept surfaced through "Pending Payments", so it is not mixed in
 * here (mixing collections into revenue is what made these cards read wrong).
 */
export async function GET(request: NextRequest) {
  const { error } = await checkAuth();
  if (error) return error;

  try {
    await dbConnect();
    const { start, end, prevStart, prevEnd } = parseRequestRange(request);

    const [
      currTiffin,
      prevTiffin,
      currRevenue,
      prevRevenue,
      currExpense,
      prevExpense,
      pendingResult,
    ] = await Promise.all([
      TiffinEntry.aggregate([
        { $match: { entry_date: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: null,
            morning: { $sum: "$morning_qty" },
            evening: { $sum: "$evening_qty" },
            total: { $sum: "$total_qty" },
          },
        },
      ]),
      TiffinEntry.aggregate([
        { $match: { entry_date: { $gte: prevStart, $lt: prevEnd } } },
        {
          $group: {
            _id: null,
            morning: { $sum: "$morning_qty" },
            evening: { $sum: "$evening_qty" },
            total: { $sum: "$total_qty" },
          },
        },
      ]),
      TiffinEntry.aggregate([
        { $match: { entry_date: { $gte: start, $lt: end } } },
        {
          $project: {
            _id: 1,
            morning_qty: 1,
            morning_price: 1,
            evening_qty: 1,
            evening_price: 1,
            extras: 1,
          },
        },
      ]),
      TiffinEntry.aggregate([
        { $match: { entry_date: { $gte: prevStart, $lt: prevEnd } } },
        {
          $project: {
            _id: 1,
            morning_qty: 1,
            morning_price: 1,
            evening_qty: 1,
            evening_price: 1,
            extras: 1,
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            expense_date: { $gte: start, $lt: end },
            is_deleted: false,
          },
        },
        { $group: { _id: null, amount: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            expense_date: { $gte: prevStart, $lt: prevEnd },
            is_deleted: false,
          },
        },
        { $group: { _id: null, amount: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { remaining_amount: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            amount: { $sum: "$remaining_amount" },
            customers: { $addToSet: "$customer_id" },
          },
        },
        {
          $project: {
            _id: 0,
            amount: 1,
            customerCount: { $size: "$customers" },
          },
        },
      ]),
    ]);

    const cT = currTiffin[0] ?? { morning: 0, evening: 0, total: 0 };
    const pT = prevTiffin[0] ?? { morning: 0, evening: 0, total: 0 };
    const cR = (
      currRevenue as Array<{
        morning_qty?: number;
        morning_price?: number;
        evening_qty?: number;
        evening_price?: number;
        extras?: Array<{ qty?: number; price?: number }>;
      }>
    ).reduce((sum, entry) => {
      const morning =
        (entry.morning_qty ?? 0) > 0
          ? (entry.morning_qty ?? 0) * (entry.morning_price ?? 0)
          : 0;
      const evening =
        (entry.evening_qty ?? 0) > 0
          ? (entry.evening_qty ?? 0) * (entry.evening_price ?? 0)
          : 0;
      const extras = (entry.extras ?? []).reduce(
        (extraSum, item) =>
          extraSum +
          ((item.qty ?? 0) > 0 ? (item.price ?? 0) * (item.qty ?? 0) : 0),
        0,
      );
      return sum + morning + evening + extras;
    }, 0);
    const pR = (
      prevRevenue as Array<{
        morning_qty?: number;
        morning_price?: number;
        evening_qty?: number;
        evening_price?: number;
        extras?: Array<{ qty?: number; price?: number }>;
      }>
    ).reduce((sum, entry) => {
      const morning =
        (entry.morning_qty ?? 0) > 0
          ? (entry.morning_qty ?? 0) * (entry.morning_price ?? 0)
          : 0;
      const evening =
        (entry.evening_qty ?? 0) > 0
          ? (entry.evening_qty ?? 0) * (entry.evening_price ?? 0)
          : 0;
      const extras = (entry.extras ?? []).reduce(
        (extraSum, item) =>
          extraSum +
          ((item.qty ?? 0) > 0 ? (item.price ?? 0) * (item.qty ?? 0) : 0),
        0,
      );
      return sum + morning + evening + extras;
    }, 0);
    const cE = currExpense[0]?.amount ?? 0;
    const pE = prevExpense[0]?.amount ?? 0;
    const pd = pendingResult[0] ?? { amount: 0, customerCount: 0 };

    return success(
      {
        todayTiffin: {
          total: cT.total,
          morning: cT.morning,
          evening: cT.evening,
          vsYesterday: pctChange(cT.total, pT.total),
        },
        todayRevenue: {
          amount: cR,
          vsYesterday: pctChange(cR, pR),
        },
        todayExpense: {
          amount: cE,
          vsYesterday: pctChange(cE, pE),
        },
        todayProfit: {
          amount: cR - cE,
          vsYesterday: pctChange(cR - cE, pR - pE),
        },
        pendingPayments: {
          amount: pd.amount,
          customerCount: pd.customerCount,
        },
      },
      "Dashboard stats fetched",
    );
  } catch (e) {
    return internalServerError(e);
  }
}
