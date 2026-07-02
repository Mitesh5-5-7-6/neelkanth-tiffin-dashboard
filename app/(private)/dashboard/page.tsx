"use client"

import { Suspense, useState } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import {
    Utensils,
    IndianRupee,
    ShoppingCart,
    TrendingUp,
    Wallet,
    Bell,
    Search,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
    CalendarDays,
    AlertCircle,
    Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSidebar } from "@/components/AppShell"
import { useDashboardStats, useMonthSummary } from "@/hooks/useDashboard"
import { DashboardFilterProvider, useDashboardFilter } from "@/hooks/dashboard/use-date-filter"
import DashboardFilter from "@/components/dashboard/DashboardFilter"
import StatCardSkeleton from "@/components/ui/skeletons/StatCardSkeleton"
import EmptyState from "@/components/dashboard/EmptyState"
import RecentTiffinTable from "@/components/dashboard/tables/RecentTiffinTable"
import RecentExpenseTable from "@/components/dashboard/tables/RecentExpenseTable"
import PendingPaymentsTable from "@/components/dashboard/tables/PendingPaymentsTable"
import TopCustomersCard from "@/components/dashboard/TopCustomersCard"
import TiffinSummaryCard from "@/components/dashboard/TiffinSummaryCard"
import PaymentSummaryCard from "@/components/dashboard/PaymentSummaryCard"
import { cn } from "@/lib/utils"

const TiffinCountChart = dynamic(
    () => import("@/components/dashboard/charts/TiffinCountChart"),
    { ssr: false, loading: () => <Skeleton className="h-75 w-full rounded-2xl" /> }
)
const RevenueExpenseChart = dynamic(
    () => import("@/components/dashboard/charts/RevenueExpenseChart"),
    { ssr: false, loading: () => <Skeleton className="h-75 w-full rounded-2xl" /> }
)
const ExpenseCategoryChart = dynamic(
    () => import("@/components/dashboard/charts/ExpenseCategoryChart"),
    { ssr: false, loading: () => <Skeleton className="h-75 w-full rounded-2xl" /> }
)

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
    }),
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode
    label: string
    value: string
    sub?: string
    trend?: { value: string; up: boolean }
    iconBg: string
    cardBg: string
    cardBorder: string
    valueColor: string
    index: number
    action?: React.ReactNode
}

function StatCard({
    icon, label, value, sub, trend,
    iconBg, cardBg, cardBorder, valueColor, index, action,
}: StatCardProps) {
    return (
        <motion.div
            custom={index}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className={cn(
                "rounded-2xl border p-5 flex flex-col gap-3 shadow-sm",
                "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
                cardBg, cardBorder
            )}
        >
            <div className="flex items-start justify-between">
                <div className={cn("p-2.5 rounded-xl text-white shrink-0", iconBg)}>
                    {icon}
                </div>
                {trend && (
                    <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                        trend.up ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    )}>
                        {trend.up
                            ? <ArrowUpRight className="w-3 h-3" />
                            : <ArrowDownRight className="w-3 h-3" />}
                        {trend.value}
                    </span>
                )}
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("text-2xl font-bold mt-0.5 tracking-tight", valueColor)}>{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
            {action}
        </motion.div>
    )
}

// ─── Month stat cell ──────────────────────────────────────────────────────────

function MonthStat({ label, value, vs }: { label: string; value: string | number; vs?: number }) {
    return (
        <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-base font-bold text-foreground">{value}</p>
            {vs !== undefined && (
                <span className={cn(
                    "text-[11px] font-medium flex items-center gap-0.5",
                    vs >= 0 ? "text-success" : "text-danger"
                )}>
                    {vs >= 0
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(vs)}% vs last month
                </span>
            )}
        </div>
    )
}

// ─── Page skeleton (Suspense fallback) ────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="h-16 bg-card border-b border-border shrink-0" />
            <div className="flex-1 p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
                </div>
            </div>
        </div>
    )
}

// ─── Main content (needs filter context) ──────────────────────────────────────

function DashboardContent() {
    const { toggle } = useSidebar()
    const { data: stats, isLoading, isError } = useDashboardStats()
    const now = new Date()
    const defaultMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonthDate.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(defaultMonthDate.getFullYear())

    const { data: month, isLoading: monthLoading, isError: monthError } = useMonthSummary(selectedMonth, selectedYear)
    const { label: periodLabel } = useDashboardFilter()

    const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

    const today = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    })

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-4 bg-card border-b border-border shrink-0 gap-4">
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={toggle}
                        title="Toggle sidebar"
                        className="p-1.5 rounded-lg hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
                        <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>{today}</p>
                    </div>
                </div>

                <DashboardFilter />

                <div className="flex items-center gap-3 shrink-0">
                    <div className="relative hidden lg:block">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search…  ⌘K"
                            className="h-8 pl-8 pr-3 w-44 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                        />
                    </div>

                    <button className="relative p-2 rounded-lg hover:bg-muted/10 transition-colors">
                        <Bell className="w-4.5 h-4.5 text-muted-foreground" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-danger rounded-full" />
                    </button>

                    <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">A</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-foreground leading-tight">Admin</p>
                            <p className="text-[10px] text-muted-foreground">Owner</p>
                        </div>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
                    ) : isError ? (
                        <div className="lg:col-span-5 sm:col-span-2">
                            <EmptyState
                                icon={<AlertCircle className="w-5 h-5" />}
                                title="Could not load stats"
                                description="Failed to fetch dashboard statistics. Retrying automatically."
                                className="bg-card rounded-2xl border border-border"
                            />
                        </div>
                    ) : (
                        <>
                            <StatCard
                                index={0}
                                icon={<Utensils className="w-4.5 h-4.5" />}
                                label={`Tiffins · ${periodLabel}`}
                                value={String(stats?.todayTiffin.total ?? 0)}
                                sub={`Morning: ${stats?.todayTiffin.morning} · Evening: ${stats?.todayTiffin.evening}`}
                                trend={{ value: `${Math.abs(stats?.todayTiffin.vsYesterday ?? 0)}%`, up: (stats?.todayTiffin.vsYesterday ?? 0) >= 0 }}
                                iconBg="bg-primary"
                                cardBg="bg-primary/5"
                                cardBorder="border-primary/20"
                                valueColor="text-primary"
                            />
                            <StatCard
                                index={1}
                                icon={<IndianRupee className="w-4.5 h-4.5" />}
                                label={`Revenue · ${periodLabel}`}
                                value={fmt(stats?.todayRevenue.amount ?? 0)}
                                trend={{ value: `${Math.abs(stats?.todayRevenue.vsYesterday ?? 0)}%`, up: (stats?.todayRevenue.vsYesterday ?? 0) >= 0 }}
                                iconBg="bg-success"
                                cardBg="bg-success/5"
                                cardBorder="border-success/20"
                                valueColor="text-success"
                            />
                            <StatCard
                                index={2}
                                icon={<ShoppingCart className="w-4.5 h-4.5" />}
                                label={`Expense · ${periodLabel}`}
                                value={fmt(stats?.todayExpense.amount ?? 0)}
                                trend={{ value: `${Math.abs(stats?.todayExpense.vsYesterday ?? 0)}%`, up: (stats?.todayExpense.vsYesterday ?? 0) <= 0 }}
                                iconBg="bg-warning"
                                cardBg="bg-warning/5"
                                cardBorder="border-warning/20"
                                valueColor="text-warning"
                            />
                            <StatCard
                                index={3}
                                icon={<TrendingUp className="w-4.5 h-4.5" />}
                                label={`Profit · ${periodLabel}`}
                                value={fmt(stats?.todayProfit.amount ?? 0)}
                                trend={{ value: `${Math.abs(stats?.todayProfit.vsYesterday ?? 0)}%`, up: (stats?.todayProfit.vsYesterday ?? 0) >= 0 }}
                                iconBg="bg-purple"
                                cardBg="bg-purple/5"
                                cardBorder="border-purple/20"
                                valueColor="text-purple"
                            />
                            <StatCard
                                index={4}
                                icon={<Wallet className="w-4.5 h-4.5" />}
                                label="Pending Payments"
                                value={fmt(stats?.pendingPayments.amount ?? 0)}
                                sub={`From ${stats?.pendingPayments.customerCount} customers`}
                                iconBg="bg-danger"
                                cardBg="bg-danger/5"
                                cardBorder="border-danger/20"
                                valueColor="text-danger"
                                action={
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-danger hover:text-danger hover:bg-danger/10 -mx-1 -mb-1 self-start"
                                    >
                                        View Details →
                                    </Button>
                                }
                            />
                        </>
                    )}
                </div>

                {/* ── Month Summary ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.35 }}
                    className="bg-card rounded-2xl border border-border p-5"
                >
                    <div className="flex items-center justify-between gap-2 mb-5">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">This Month at a Glance</h3>
                                <p className="text-xs text-muted-foreground">Selected month vs previous month</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground">Month</label>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="rounded border px-2 py-1">
                                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
                                        <option key={m} value={idx + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground">Year</label>
                                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="rounded border px-2 py-1">
                                    {Array.from({ length: 6 }).map((_, i) => {
                                        const y = now.getFullYear() - i
                                        return <option key={y} value={y}>{y}</option>
                                    })}
                                </select>
                            </div>
                        </div>
                    </div>

                    {monthLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="space-y-1.5">
                                    <Skeleton className="h-3 w-20 rounded" />
                                    <Skeleton className="h-6 w-16 rounded" />
                                    <Skeleton className="h-3 w-24 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : monthError ? (
                        <EmptyState
                            icon={<AlertCircle className="w-5 h-5" />}
                            title="Could not load month summary"
                            description="Failed to fetch month data. It will retry automatically."
                            className="py-6"
                        />
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            <MonthStat
                                label="Total Tiffins"
                                value={(month?.tiffins.total ?? 0).toLocaleString("en-IN")}
                                vs={month?.tiffins.vsLastMonth}
                            />
                            <MonthStat
                                label="Avg / Day"
                                value={(month?.tiffins.avgPerDay ?? 0).toFixed(1)}
                            />
                            <MonthStat
                                label="Revenue"
                                value={`₹${((month?.revenue.amount ?? 0) / 1000).toFixed(1)}k`}
                                vs={month?.revenue.vsLastMonth}
                            />
                            <MonthStat
                                label="Expenses"
                                value={`₹${((month?.expense.amount ?? 0) / 1000).toFixed(1)}k`}
                                vs={month?.expense.vsLastMonth}
                            />
                            <MonthStat
                                label="Net Profit"
                                value={`₹${((month?.profit.amount ?? 0) / 1000).toFixed(1)}k`}
                                vs={month?.profit.vsLastMonth}
                            />
                            <MonthStat
                                label="Active Customers"
                                value={month?.activeCustomers ?? 0}
                            />
                        </div>
                    )}
                </motion.div>

                {/* ── Charts ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.35 }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                    <TiffinCountChart />
                    <RevenueExpenseChart />
                    <ExpenseCategoryChart />
                </motion.div>

                {/* ── Data Tables ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.35 }}
                    className="grid grid-cols-1 xl:grid-cols-2 gap-4"
                >
                    <RecentTiffinTable />
                    <RecentExpenseTable />
                </motion.div>

                {/* ── Bottom Section ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.35 }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                    <TopCustomersCard />
                    <TiffinSummaryCard />
                    <PaymentSummaryCard />
                </motion.div>

                {/* ── Pending Payments Table ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.35 }}
                >
                    <PendingPaymentsTable />
                </motion.div>

            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <DashboardFilterProvider>
                <DashboardContent />
            </DashboardFilterProvider>
        </Suspense>
    )
}
