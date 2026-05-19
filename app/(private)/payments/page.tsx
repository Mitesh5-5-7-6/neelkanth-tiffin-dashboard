"use client"

import { useState } from "react"
import { Plus, Menu } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/AppShell"
import PaymentStats from "./components/PaymentStats"
import PaymentTable from "./components/PaymentTable"
import PaymentForm from "./components/PaymentForm"
import PaymentDetailPanel from "./components/PaymentDetailPanel"
import {
    usePayments,
    useCreatePayment,
    useUpdatePayment,
    useDeletePayment,
} from "@/hooks/usePayments"
import type { Payment, PaymentQueryParams } from "@/types/payment.type"
import type { CreatePaymentInput, UpdatePaymentInput } from "@/lib/validations/payment.validation"

export default function PaymentsPage() {
    const { toggle } = useSidebar()

    const [params, setParams] = useState<PaymentQueryParams>({ page: 1, limit: 10 })
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
    const [showForm, setShowForm] = useState(false)

    const { data, isLoading } = usePayments(params)
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
                if (selectedPayment?._id === editingPayment._id) {
                    setSelectedPayment(null)
                }
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
            {/* Page Header */}
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
                            Track collections, pending balances and billing
                        </p>
                    </div>
                </div>

                <Button onClick={() => setShowForm(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    Record Payment
                </Button>
            </header>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main content */}
                <div className="flex-1 overflow-auto p-6 space-y-5">
                    <PaymentStats />
                    <PaymentTable
                        payments={payments}
                        isLoading={isLoading}
                        meta={meta}
                        params={params}
                        onParamsChange={setParams}
                        onView={setSelectedPayment}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        selectedId={selectedPayment?._id}
                    />
                </div>

                {/* Detail panel */}
                {selectedPayment && (
                    <PaymentDetailPanel
                        payment={selectedPayment}
                        onClose={() => setSelectedPayment(null)}
                        onEdit={() => handleEdit(selectedPayment)}
                    />
                )}
            </div>

            {/* Add / Edit form */}
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
