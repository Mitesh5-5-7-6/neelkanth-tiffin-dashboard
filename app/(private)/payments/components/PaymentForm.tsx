"use client"

import { useEffect, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { Loader2, Calculator, CalendarDays, IndianRupee } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { createPaymentSchema, type CreatePaymentInput } from "@/lib/validations/payment.validation"
import { zodField } from "@/lib/validations/utils"
import { useCustomers } from "@/hooks/useCustomers"
import { useGenerateBill } from "@/hooks/usePayments"
import type { Payment } from "@/types/payment.type"
import { cn } from "@/lib/utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIso(d: Date) { return format(d, "yyyy-MM-dd") }

const EMPTY_DEFAULTS: CreatePaymentInput = {
    customer_id: "",
    payment_date: toIso(new Date()),
    billing_start_date: toIso(startOfMonth(new Date())),
    billing_end_date: toIso(endOfMonth(new Date())),
    total_bill_amount: 0,
    paid_amount: 0,
    payment_method: "cash",
    reference_number: "",
    notes: "",
    collected_by: "",
}

function toFormValues(p: Payment): CreatePaymentInput {
    return {
        customer_id: p.customer_id,
        payment_date: toIso(new Date(p.payment_date)),
        billing_start_date: toIso(new Date(p.billing_start_date)),
        billing_end_date: toIso(new Date(p.billing_end_date)),
        total_bill_amount: p.total_bill_amount,
        paid_amount: p.paid_amount,
        payment_method: p.payment_method,
        reference_number: p.reference_number ?? "",
        notes: p.notes ?? "",
        collected_by: p.collected_by ?? "",
    }
}

function FieldError({ errors, show }: { errors: unknown[]; show: boolean }) {
    if (!show) return null
    const msg = errors.find((e): e is string => typeof e === "string" && e.length > 0)
    if (!msg) return null
    return <p className="text-xs text-danger">{msg}</p>
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentFormProps {
    open: boolean
    payment?: Payment | null
    onClose: () => void
    onSubmit: (data: CreatePaymentInput) => Promise<void>
    isLoading: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentForm({ open, payment, onClose, onSubmit, isLoading }: PaymentFormProps) {
    const isEdit = !!payment
    const [submitted, setSubmitted] = useState(false)
    const [billInfo, setBillInfo] = useState<{
        total_entries: number
        total_amount: number
        previous_pending: number
        advance_deduction: number
        final_payable: number
    } | null>(null)

    const { data: customersData } = useCustomers({ page: 1, limit: 200 })
    const customers = customersData?.data ?? []
    const generateBillMutation = useGenerateBill()

    const form = useForm({
        defaultValues: EMPTY_DEFAULTS,
        onSubmit: async ({ value }) => {
            const result = createPaymentSchema.safeParse(value)
            if (result.success) {
                await onSubmit(result.data)
            }
        },
    })

    useEffect(() => {
        if (open) {
            setSubmitted(false)
            setBillInfo(null)
            form.reset(payment ? toFormValues(payment) : EMPTY_DEFAULTS)
        }
    }, [open, payment])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitted(true)
        form.handleSubmit()
    }

    async function handleGenerateBill() {
        const customerId = form.getFieldValue("customer_id")
        const startDate = form.getFieldValue("billing_start_date")
        const endDate = form.getFieldValue("billing_end_date")

        if (!customerId || !startDate || !endDate) return

        try {
            const result = await generateBillMutation.mutateAsync({
                customer_id: customerId,
                billing_start_date: startDate,
                billing_end_date: endDate,
            })
            const d = result.data
            setBillInfo(d)
            form.setFieldValue("total_bill_amount", d.final_payable)
            form.setFieldValue("paid_amount", d.final_payable)
        } catch {
            // error handled by toast in parent
        }
    }

    // Derived: remaining = total - paid
    function getRemaining() {
        const total = form.getFieldValue("total_bill_amount") ?? 0
        const paid = form.getFieldValue("paid_amount") ?? 0
        return total - paid
    }

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent side="right" className="w-full max-w-lg flex flex-col overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{isEdit ? "Edit Payment" : "Record Payment"}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? "Update the payment details below."
                            : "Fill in the details to record a customer payment."}
                    </SheetDescription>
                </SheetHeader>

                <form
                    id="payment-form"
                    onSubmit={handleSubmit}
                    className="flex-1 px-6 py-4 space-y-5"
                >
                    {/* Customer */}
                    <form.Field
                        name="customer_id"
                        validators={{ onChange: zodField(createPaymentSchema.shape.customer_id) }}
                    >
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="customer_id">Customer *</Label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(v) => {
                                        field.handleChange(v)
                                        setBillInfo(null)
                                    }}
                                    disabled={isEdit}
                                >
                                    <SelectTrigger
                                        id="customer_id"
                                        className={cn(
                                            (field.state.meta.isTouched || submitted) &&
                                            field.state.meta.errors.length && "border-danger"
                                        )}
                                    >
                                        <SelectValue placeholder="Select customer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c._id} value={c._id}>
                                                {c.full_name} — {c.phone}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                            </div>
                        )}
                    </form.Field>

                    {/* Payment Date */}
                    <form.Field
                        name="payment_date"
                        validators={{ onChange: zodField(createPaymentSchema.shape.payment_date) }}
                    >
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_date">
                                    <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                                    Payment Date *
                                </Label>
                                <Input
                                    id="payment_date"
                                    type="date"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                />
                                <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                            </div>
                        )}
                    </form.Field>

                    {/* Billing Period */}
                    <div className="rounded-xl border border-border p-4 space-y-3">
                        <p className="text-sm font-semibold text-foreground">Billing Period</p>
                        <div className="grid grid-cols-2 gap-3">
                            <form.Field
                                name="billing_start_date"
                                validators={{ onChange: zodField(createPaymentSchema.shape.billing_start_date) }}
                            >
                                {(field) => (
                                    <div className="space-y-1">
                                        <Label htmlFor="billing_start_date" className="text-xs text-muted">From</Label>
                                        <Input
                                            id="billing_start_date"
                                            type="date"
                                            value={field.state.value}
                                            onChange={(e) => { field.handleChange(e.target.value); setBillInfo(null) }}
                                            onBlur={field.handleBlur}
                                            className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                        />
                                        <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                    </div>
                                )}
                            </form.Field>
                            <form.Field
                                name="billing_end_date"
                                validators={{ onChange: zodField(createPaymentSchema.shape.billing_end_date) }}
                            >
                                {(field) => (
                                    <div className="space-y-1">
                                        <Label htmlFor="billing_end_date" className="text-xs text-muted">To</Label>
                                        <Input
                                            id="billing_end_date"
                                            type="date"
                                            value={field.state.value}
                                            onChange={(e) => { field.handleChange(e.target.value); setBillInfo(null) }}
                                            onBlur={field.handleBlur}
                                            className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                        />
                                        <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                    </div>
                                )}
                            </form.Field>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={handleGenerateBill}
                            disabled={
                                generateBillMutation.isPending ||
                                !form.getFieldValue("customer_id")
                            }
                        >
                            {generateBillMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Calculator className="w-3.5 h-3.5" />
                            )}
                            Calculate Bill from Tiffin Entries
                        </Button>

                        {/* Bill breakdown */}
                        {billInfo && (
                            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted">Tiffin entries ({billInfo.total_entries} days)</span>
                                    <span className="font-medium text-foreground">₹{billInfo.total_amount.toLocaleString("en-IN")}</span>
                                </div>
                                {billInfo.previous_pending > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted">Previous pending</span>
                                        <span className="font-medium text-danger">+₹{billInfo.previous_pending.toLocaleString("en-IN")}</span>
                                    </div>
                                )}
                                {billInfo.advance_deduction > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted">Advance deduction</span>
                                        <span className="font-medium text-success">−₹{billInfo.advance_deduction.toLocaleString("en-IN")}</span>
                                    </div>
                                )}
                                <Separator className="my-1" />
                                <div className="flex justify-between font-semibold">
                                    <span className="text-foreground">Final Payable</span>
                                    <span className="text-primary">₹{billInfo.final_payable.toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-2 gap-3">
                        <form.Field
                            name="total_bill_amount"
                            validators={{ onChange: zodField(createPaymentSchema.shape.total_bill_amount) }}
                        >
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label htmlFor="total_bill_amount">
                                        <IndianRupee className="w-3.5 h-3.5 inline mr-0.5" />
                                        Total Bill *
                                    </Label>
                                    <Input
                                        id="total_bill_amount"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                                        onBlur={field.handleBlur}
                                        className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                    />
                                    <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                </div>
                            )}
                        </form.Field>
                        <form.Field
                            name="paid_amount"
                            validators={{ onChange: zodField(createPaymentSchema.shape.paid_amount) }}
                        >
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label htmlFor="paid_amount">
                                        <IndianRupee className="w-3.5 h-3.5 inline mr-0.5" />
                                        Paid Amount *
                                    </Label>
                                    <Input
                                        id="paid_amount"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                                        onBlur={field.handleBlur}
                                        className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                    />
                                    <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                </div>
                            )}
                        </form.Field>
                    </div>

                    {/* Live remaining display */}
                    <form.Subscribe selector={(s) => [s.values.total_bill_amount, s.values.paid_amount]}>
                        {([total, paid]) => {
                            const rem = (total ?? 0) - (paid ?? 0)
                            return (
                                <div className={cn(
                                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm border",
                                    rem > 0
                                        ? "bg-warning/5 border-warning/20 text-warning"
                                        : rem < 0
                                            ? "bg-purple/5 border-purple/20 text-purple"
                                            : "bg-success/5 border-success/20 text-success"
                                )}>
                                    <span className="font-medium">
                                        {rem > 0 ? "Remaining" : rem < 0 ? "Advance" : "Fully Paid"}
                                    </span>
                                    <span className="font-semibold">
                                        ₹{Math.abs(rem).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            )
                        }}
                    </form.Subscribe>

                    {/* Payment Method */}
                    <form.Field
                        name="payment_method"
                        validators={{ onChange: zodField(createPaymentSchema.shape.payment_method) }}
                    >
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_method">Payment Method *</Label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(v) => field.handleChange(v as CreatePaymentInput["payment_method"])}
                                >
                                    <SelectTrigger
                                        id="payment_method"
                                        className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                    >
                                        <SelectValue placeholder="Select method..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="upi">UPI</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                            </div>
                        )}
                    </form.Field>

                    {/* Reference Number */}
                    <form.Field name="reference_number">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="reference_number">Reference / Transaction ID</Label>
                                <Input
                                    id="reference_number"
                                    placeholder="UPI ref, cheque no., etc."
                                    value={field.state.value ?? ""}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Notes */}
                    <form.Field name="notes">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    rows={2}
                                    placeholder="Any additional notes..."
                                    value={field.state.value ?? ""}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    className="resize-none"
                                />
                            </div>
                        )}
                    </form.Field>
                </form>

                <SheetFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button form="payment-form" type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEdit ? "Save Changes" : "Record Payment"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
