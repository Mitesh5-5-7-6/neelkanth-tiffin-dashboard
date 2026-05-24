"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Plus, Menu, LayoutList, Table2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/AppShell"
import PaymentStats from "./components/PaymentStats"
import PaymentTable from "./components/PaymentTable"
import PaymentForm from "./components/PaymentForm"
import PaymentDetailPanel from "./components/PaymentDetailPanel"
import GroupedPaymentTable from "./components/GroupedPaymentTable"
import {
    usePayments,
    useCreatePayment,
    useUpdatePayment,
    useDeletePayment,
} from "@/hooks/usePayments"
import type { Payment, PaymentQueryParams } from "@/types/payment.type"
import type { GroupedPaymentQueryParams } from "@/types/grouped-payment.type"
import type { CreatePaymentInput, UpdatePaymentInput } from "@/lib/validations/payment.validation"

// ─── Default date range: 1st of current month → today ────────────────────────

function getDefaultDateRange() {
    const now = new Date()
    const startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd")
    const endDate = format(now, "yyyy-MM-dd")
    return { startDate, endDate }
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

type ViewMode = "grouped" | "flat"

export default function PaymentsPage() {
    const { toggle } = useSidebar()
    const { startDate, endDate } = getDefaultDateRange()

    // ── View mode (grouped = default, flat = legacy table) ────────────────────
    const [viewMode, setViewMode] = useState<ViewMode>("grouped")

    // ── Grouped view state ────────────────────────────────────────────────────
    const [groupedParams, setGroupedParams] = useState<GroupedPaymentQueryParams>({
        startDate,
        endDate,
        page: 1,
        limit: 20,
    })

    // ── Flat view state (existing) ────────────────────────────────────────────
    const [flatParams, setFlatParams] = useState<PaymentQueryParams>({
        page: 1,
        limit: 10,
        start_date: startDate,
        end_date: endDate,
    })
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
    const [showForm, setShowForm] = useState(false)

    const { data, isLoading } = usePayments(flatParams)
    const createMutation = useCreatePayment()
    const updateMutation = useUpdatePayment()
    const deleteMutation = useDeletePayment()

    const payments = data?.data ?? []
    const meta = data?.meta as { page: number; limit: number; total: number; totalPages: number } | undefined

    function handleEdit(payment: Payment) {
        setEditingPayment(payment)
        setShowForm(true)
    }

    function handleFormClose() {
        setShowForm(false)
        setEditingPayment(null)
    }

    async function handleFormSubmit(formData: CreatePaymentInput) {
        try {
            if (editingPayment) {
                const updateData: UpdatePaymentInput = {
                    paid_amount: formData.paid_amount,
                    payment_method: formData.payment_method,
                    payment_date: formData.payment_date,
                    reference_number: formData.reference_number,
                    notes: formData.notes,
                    collected_by: formData.collected_by,
                }
                await updateMutation.mutateAsync({ id: editingPayment._id, data: updateData })
                toast.success("Payment updated successfully")
                if (selectedPayment?._id === editingPayment._id) setSelectedPayment(null)
            } else {
                await createMutation.mutateAsync(formData)
                toast.success("Payment recorded successfully")
            }
            handleFormClose()
        } catch (err: unknown) {
            const message =
                err && typeof err === "object" && "message" in err
                    ? String((err as { message: string }).message)
                    : "Something went wrong"
            toast.error(message)
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteMutation.mutateAsync(id)
            toast.success("Payment deleted")
            if (selectedPayment?._id === id) setSelectedPayment(null)
        } catch {
            toast.error("Failed to delete payment")
        }
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* ── Page Header ──────────────────────────────────────────────────── */}
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
                        <h1 className="text-xl font-semibold text-foreground">Payments</h1>
                        <p className="text-sm text-muted mt-0.5">
                            Live collection status synced with daily tiffin entries
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex items-center rounded-lg border border-border overflow-hidden">
                        <button
                            onClick={() => setViewMode("grouped")}
                            title="Grouped by customer"
                            className={`p-2 transition-colors ${
                                viewMode === "grouped"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted hover:bg-muted/10"
                            }`}
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("flat")}
                            title="All payments list"
                            className={`p-2 transition-colors ${
                                viewMode === "flat"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted hover:bg-muted/10"
                            }`}
                        >
                            <Table2 className="w-4 h-4" />
                        </button>
                    </div>

                    <Button onClick={() => setShowForm(true)} className="gap-1.5">
                        <Plus className="w-4 h-4" />
                        Record Payment
                    </Button>
                </div>
            </header>

            {/* ── Content ──────────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-auto p-6 space-y-5">
                    {/* Stats always visible */}
                    <PaymentStats />

                    {/* Grouped view (default) */}
                    {viewMode === "grouped" && (
                        <GroupedPaymentTable
                            params={groupedParams}
                            onParamsChange={setGroupedParams}
                        />
                    )}

                    {/* Flat payment list (legacy) */}
                    {viewMode === "flat" && (
                        <PaymentTable
                            payments={payments}
                            isLoading={isLoading}
                            meta={meta}
                            params={flatParams}
                            onParamsChange={setFlatParams}
                            onView={setSelectedPayment}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            selectedId={selectedPayment?._id}
                        />
                    )}
                </div>

                {/* Detail panel (flat view only) */}
                {viewMode === "flat" && selectedPayment && (
                    <PaymentDetailPanel
                        payment={selectedPayment}
                        onClose={() => setSelectedPayment(null)}
                        onEdit={() => handleEdit(selectedPayment)}
                    />
                )}
            </div>

            {/* Record / Edit payment form */}
            <PaymentForm
                open={showForm}
                payment={editingPayment}
                onClose={handleFormClose}
                onSubmit={handleFormSubmit}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    )
}
