// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  todayTiffin: {
    total: number;
    morning: number;
    evening: number;
    vsYesterday: number;
  };
  todayRevenue: { amount: number; vsYesterday: number };
  todayExpense: { amount: number; vsYesterday: number };
  todayProfit: { amount: number; vsYesterday: number };
  pendingPayments: { amount: number; customerCount: number };
}

export interface TiffinChartPoint {
  date: string;
  morning: number;
  evening: number;
}

export interface RevenueExpensePoint {
  date: string;
  revenue: number;
  expense: number;
}

export interface ExpenseCategoryPoint {
  category: string; // human-readable display label
  amount: number;
  color: string;
}

export interface RecentTiffinEntry {
  id: string;
  date: string;
  customer: string;
  morning: number;
  evening: number;
  total: number;
  amount: number;
}

export interface RecentExpense {
  id: string;
  date: string;
  category: string; // human-readable display label
  description: string;
  amount: number;
}

export interface PendingPayment {
  id: string;
  customer: string;
  avatar: string;
  pendingAmount: number;
  lastPayment: string;
  daysOverdue: number;
}

export interface TopCustomer {
  rank: number;
  name: string;
  avatar: string;
  totalTiffins: number;
  totalAmount: number;
}

export interface MonthSummary {
  tiffins: { total: number; avgPerDay: number; vsLastMonth: number };
  revenue: { amount: number; vsLastMonth: number };
  expense: { amount: number; vsLastMonth: number };
  profit: { amount: number; vsLastMonth: number };
  activeCustomers: number;
  activeDays: number;
}

// ─── Category display metadata ────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  VEGETABLES: { label: "Vegetables", color: "#16A34A" },
  RAW_MATERIAL: { label: "Raw Material", color: "#2563EB" },
  MILK: { label: "Milk", color: "#0891B2" },
  GAS: { label: "Gas / LPG", color: "#EA580C" },
  SALARY: { label: "Salary", color: "#7C3AED" },
  DELIVERY: { label: "Delivery", color: "#DC2626" },
  TRANSPORT: { label: "Transport", color: "#B45309" },
  RENT: { label: "Rent", color: "#0F172A" },
  ELECTRICITY: { label: "Electricity", color: "#D97706" },
  INTERNET: { label: "Internet", color: "#06B6D4" },
  PACKAGING: { label: "Packaging", color: "#8B5CF6" },
  MARKETING: { label: "Marketing", color: "#EC4899" },
  MAINTENANCE: { label: "Maintenance", color: "#6366F1" },
  SOFTWARE: { label: "Software", color: "#14B8A6" },
  MISC: { label: "Miscellaneous", color: "#64748B" },
};

/** Returns the Tailwind-friendly inline-style color for a display label */
export function getCategoryColor(displayLabel: string): string {
  const entry = Object.values(CATEGORY_META).find(
    (m) => m.label === displayLabel,
  );
  return entry?.color ?? "#64748B";
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

const BASE = "/api/nts/v1/dashboard";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 401) throw new Error("Unauthorized — please log in again");
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Dashboard API error");
  return json.data as T;
}

function dateParams(from: string, to: string): string {
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

// ─── API functions ────────────────────────────────────────────────────────────

interface RawCategoryPoint {
  category: string;
  amount: number;
}

export const dashboardApi = {
  stats: (from: string, to: string) =>
    get<DashboardStats>(`stats?${dateParams(from, to)}`),

  tiffinTrend: (from: string, to: string) =>
    get<TiffinChartPoint[]>(`tiffin-trend?${dateParams(from, to)}`),

  revenueExpense: (from: string, to: string) =>
    get<RevenueExpensePoint[]>(`revenue-expense?${dateParams(from, to)}`),

  expenseCategories: async (
    from: string,
    to: string,
  ): Promise<ExpenseCategoryPoint[]> => {
    const raw = await get<RawCategoryPoint[]>(
      `expense-categories?${dateParams(from, to)}`,
    );
    return raw.map((r) => {
      const meta = CATEGORY_META[r.category];
      return {
        category: meta?.label ?? r.category,
        amount: r.amount,
        color: meta?.color ?? "#64748B",
      };
    });
  },

  recentTiffins: (from: string, to: string) =>
    get<RecentTiffinEntry[]>(`recent-tiffins?${dateParams(from, to)}`),

  recentExpenses: (from: string, to: string) =>
    get<RecentExpense[]>(`recent-expenses?${dateParams(from, to)}`),

  pendingPayments: () => get<PendingPayment[]>("pending-payments"),

  topCustomers: (from: string, to: string) =>
    get<TopCustomer[]>(`top-customers?${dateParams(from, to)}`),

  monthSummary: (month?: number, year?: number) => {
    const qs = month && year ? `?month=${month}&year=${year}` : "";
    return get<MonthSummary>(`month-summary${qs}`);
  },
};
