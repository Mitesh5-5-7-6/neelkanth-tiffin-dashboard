"use client"

import { useState } from "react"
import { Plus, Menu } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/AppShell"
import ExpenseStats from "./components/ExpenseStats"
import ExpenseTable from "./components/ExpenseTable"
import ExpenseForm from "./components/ExpenseForm"
import ExpenseSummaryPanel from "./components/ExpenseSummaryPanel"
import {
    useExpenses,
    useExpenseStats,
    useCreateExpense,
    useUpdateExpense,
    useDeleteExpense,
} from "@/hooks/useExpenses"
import type { Expense, ExpenseQueryParams } from "@/types/expense.type"
import type { CreateExpenseInput } from "@/lib/validations/expense.validation"

function defaultParams(): ExpenseQueryParams {
    const now      = new Date()
    const end_date = now.toISOString().split("T")[0]
    const start_date = `${end_date.slice(0, 7)}-01` // first day of current month
    return { page: 1, limit: 15, start_date, end_date }
}

export default function ExpensesPage() {
    const { toggle } = useSidebar()
    const [params, setParams]           = useState<ExpenseQueryParams>(defaultParams)
    const [editingExpense, setEditing]  = useState<Expense | null>(null)
    const [showForm, setShowForm]       = useState(false)

    const { data, isLoading }             = useExpenses(params)
    const { data: statsData, isLoading: statsLoading } = useExpenseStats({
        start_date: params.start_date,
        end_date:   params.end_date,
    })

    const createMutation = useCreateExpense()
    const updateMutation = useUpdateExpense()
    const deleteMutation = useDeleteExpense()

    const expenses = data?.data ?? []
    const meta     = data?.meta as { page: number; limit: number; total: number; totalPages: number } | undefined
    const stats    = statsData?.data

    function handleEdit(expense: Expense) {
        setEditing(expense)
        setShowForm(true)
    }

    function handleFormClose() {
        setShowForm(false)
        setEditing(null)
    }

    async function handleFormSubmit(formData: CreateExpenseInput) {
        try {
            if (editingExpense) {
                await updateMutation.mutateAsync({ id: editingExpense._id, data: formData })
                toast.success("Expense updated successfully")
            } else {
                await createMutation.mutateAsync(formData)
                toast.success("Expense recorded successfully")
            }
            handleFormClose()
        } catch (err: unknown) {
            const message = err && typeof err === "object" && "message" in err
                ? String((err as { message: string }).message)
                : "Something went wrong"
            toast.error(message)
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteMutation.mutateAsync(id)
            toast.success("Expense deleted")
        } catch {
            toast.error("Failed to delete expense")
        }
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden">

            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-4 py-4 bg-background border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggle}
                        title="Toggle sidebar"
                        className="p-1.5 rounded-lg hover:bg-muted/10 text-muted hover:text-foreground transition-colors shrink-0"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Expenses</h1>
                        <p className="text-sm text-muted mt-0.5">
                            Track and manage all your expenses
                        </p>
                    </div>
                </div>

                <Button onClick={() => setShowForm(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    Add Expense
                </Button>
            </header>

            {/* ── Content ────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Main area */}
                <div className="flex-1 overflow-auto p-6 space-y-5">
                    <ExpenseStats stats={stats} isLoading={statsLoading} />
                    <ExpenseTable
                        expenses={expenses}
                        isLoading={isLoading}
                        meta={meta}
                        params={params}
                        onParamsChange={setParams}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>

                {/* Summary panel (always visible) */}
                <ExpenseSummaryPanel stats={stats} isLoading={statsLoading} />
            </div>

            {/* ── Add / Edit form ─────────────────────────────────────── */}
            <ExpenseForm
                open={showForm}
                expense={editingExpense}
                onClose={handleFormClose}
                onSubmit={handleFormSubmit}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    )
}
