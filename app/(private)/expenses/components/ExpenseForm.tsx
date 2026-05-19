"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import {
    createExpenseSchema,
    EXPENSE_CATEGORIES_LIST,
    EXPENSE_STATUSES_LIST,
    EXPENSE_PAYMENT_METHODS_LIST,
    RECURRING_TYPES_LIST,
    type CreateExpenseInput,
} from "@/lib/validations/expense.validation"
import { zodField } from "@/lib/validations/utils"
import { CATEGORY_META, SUBCATEGORY_MAP } from "@/types/expense.type"
import type { Expense, ExpenseCategory } from "@/types/expense.type"

interface ExpenseFormProps {
    open: boolean
    expense?: Expense | null
    onClose: () => void
    onSubmit: (data: CreateExpenseInput) => Promise<void>
    isLoading: boolean
}

const today = new Date().toISOString().split("T")[0]

const EMPTY_DEFAULTS: CreateExpenseInput = {
    title: "",
    description: "",
    expense_category: ["MISC"],
    expense_subcategory: [],
    expense_date: today,
    amount: 0,
    payment_method: "cash",
    vendor_name: "",
    invoice_number: "",
    receipt_url: "",
    is_recurring: false,
    recurring_type: undefined,
    expense_status: "PAID",
    paid_by: "",
    notes: "",
}

function toFormValues(expense: Expense): CreateExpenseInput {
    return {
        title: expense.title,
        description: expense.description ?? "",
        expense_category: ([] as ExpenseCategory[]).concat(expense.expense_category as ExpenseCategory | ExpenseCategory[]),
        expense_subcategory: ([] as string[]).concat((expense.expense_subcategory ?? []) as string | string[]),
        expense_date: expense.expense_date.slice(0, 10),
        amount: expense.amount,
        payment_method: expense.payment_method,
        vendor_name: expense.vendor_name ?? "",
        invoice_number: expense.invoice_number ?? "",
        receipt_url: expense.receipt_url ?? "",
        is_recurring: expense.is_recurring,
        recurring_type: expense.recurring_type,
        expense_status: expense.expense_status,
        paid_by: expense.paid_by ?? "",
        notes: expense.notes ?? "",
    }
}

function FieldError({ errors, show }: { errors: unknown[]; show: boolean }) {
    if (!show) return null
    const msg = errors.find((e): e is string => typeof e === "string" && e.length > 0)
    if (!msg) return null
    return <p className="text-xs text-danger">{msg}</p>
}

const PAYMENT_LABELS: Record<string, string> = {
    cash: "Cash", upi: "UPI", bank_transfer: "Bank Transfer",
    cheque: "Cheque", credit: "Credit",
}

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES_LIST.map((cat) => ({
    value: cat,
    label: CATEGORY_META[cat]?.label ?? cat,
}))

export default function ExpenseForm({ open, expense, onClose, onSubmit, isLoading }: ExpenseFormProps) {
    const isEdit = !!expense
    const [submitted, setSubmitted] = useState(false)
    const [currentCategories, setCurrentCategories] = useState<ExpenseCategory[]>(["MISC"])
    const [isRecurring, setIsRecurring] = useState(false)

    const subcategoryOptions = useMemo(() => {
        const seen = new Set<string>()
        const result: string[] = []
        for (const cat of currentCategories) {
            for (const sub of SUBCATEGORY_MAP[cat] ?? []) {
                if (!seen.has(sub)) {
                    seen.add(sub)
                    result.push(sub)
                }
            }
        }
        return result
    }, [currentCategories])

    const form = useForm({
        defaultValues: EMPTY_DEFAULTS,
        onSubmit: async ({ value }) => {
            const result = createExpenseSchema.safeParse({
                ...value,
                amount: Number(value.amount),
                description: value.description || undefined,
                expense_subcategory: value.expense_subcategory?.length ? value.expense_subcategory : undefined,
                vendor_name: value.vendor_name || undefined,
                invoice_number: value.invoice_number || undefined,
                receipt_url: value.receipt_url || undefined,
                paid_by: value.paid_by || undefined,
                notes: value.notes || undefined,
                recurring_type: value.recurring_type || undefined,
            })
            if (result.success) {
                await onSubmit(result.data)
            }
        },
    })

    useEffect(() => {
        if (open) {
            setSubmitted(false)
            const defaults = expense ? toFormValues(expense) : EMPTY_DEFAULTS
            form.reset(defaults)
            setCurrentCategories(defaults.expense_category)
            setIsRecurring(defaults.is_recurring)
        }
    }, [open, expense])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitted(true)
        form.handleSubmit()
    }

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent side="right" className="w-full max-w-md flex flex-col overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{isEdit ? "Edit Expense" : "Add Expense"}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? "Update expense details below."
                            : "Record a new expense transaction."}
                    </SheetDescription>
                </SheetHeader>

                <form
                    id="expense-form"
                    onSubmit={handleSubmit}
                    className="flex-1 px-6 py-4 space-y-4 overflow-y-auto"
                >
                    {/* Title */}
                    <form.Field
                        name="title"
                        validators={{ onChange: zodField(createExpenseSchema.shape.title) }}
                    >
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor={field.name}>Title *</Label>
                                <Input
                                    id={field.name}
                                    placeholder="e.g. Tomato Onion Potato"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                />
                                <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                            </div>
                        )}
                    </form.Field>

                    {/* Category */}
                    <form.Field
                        name="expense_category"
                        validators={{ onChange: zodField(createExpenseSchema.shape.expense_category) }}
                    >
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label>Category *</Label>
                                <MultiSelect
                                    options={CATEGORY_OPTIONS}
                                    value={field.state.value}
                                    placeholder="Select categories"
                                    className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                    onChange={(cats) => {
                                        const typed = cats as ExpenseCategory[]
                                        field.handleChange(typed)
                                        setCurrentCategories(typed)
                                        // drop subcategories that are no longer valid
                                        const validSubs = new Set(
                                            typed.flatMap((c) => SUBCATEGORY_MAP[c] ?? [])
                                        )
                                        const current = form.getFieldValue("expense_subcategory") ?? []
                                        const filtered = current.filter((s) => validSubs.has(s))
                                        form.setFieldValue("expense_subcategory", filtered)
                                    }}
                                />
                                <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                            </div>
                        )}
                    </form.Field>

                    {/* Subcategory */}
                    {subcategoryOptions.length > 0 && (
                        <form.Field name="expense_subcategory">
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label>Sub Category</Label>
                                    <MultiSelect
                                        options={subcategoryOptions.map((s) => ({ value: s, label: s }))}
                                        value={field.state.value ?? []}
                                        placeholder="Select sub categories"
                                        onChange={field.handleChange}
                                    />
                                </div>
                            )}
                        </form.Field>
                    )}

                    {/* Date + Amount row */}
                    <div className="grid grid-cols-2 gap-3">
                        <form.Field
                            name="expense_date"
                            validators={{ onChange: zodField(createExpenseSchema.shape.expense_date) }}
                        >
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label htmlFor={field.name}>Date *</Label>
                                    <Input
                                        id={field.name}
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

                        <form.Field
                            name="amount"
                            validators={{ onChange: zodField(createExpenseSchema.shape.amount) }}
                        >
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label htmlFor={field.name}>Amount (₹) *</Label>
                                    <Input
                                        id={field.name}
                                        type="number"
                                        min={0.01}
                                        step={0.01}
                                        placeholder="0.00"
                                        value={field.state.value || ""}
                                        onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                                        onBlur={field.handleBlur}
                                        className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                    />
                                    <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                </div>
                            )}
                        </form.Field>
                    </div>

                    {/* Payment method + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <form.Field
                            name="payment_method"
                            validators={{ onChange: zodField(createExpenseSchema.shape.payment_method) }}
                        >
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label>Payment Method *</Label>
                                    <Select value={field.state.value} onValueChange={field.handleChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXPENSE_PAYMENT_METHODS_LIST.map((m) => (
                                                <SelectItem key={m} value={m}>
                                                    {PAYMENT_LABELS[m] ?? m}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="expense_status">
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label>Status</Label>
                                    <Select value={field.state.value} onValueChange={field.handleChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXPENSE_STATUSES_LIST.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </form.Field>
                    </div>

                    {/* Vendor name */}
                    <form.Field name="vendor_name">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor={field.name}>Vendor / Supplier</Label>
                                <Input
                                    id={field.name}
                                    placeholder="e.g. Ramu Vegetable Shop"
                                    value={field.state.value ?? ""}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Invoice number */}
                    <form.Field name="invoice_number">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor={field.name}>Invoice / Bill Number</Label>
                                <Input
                                    id={field.name}
                                    placeholder="INV-001"
                                    value={field.state.value ?? ""}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Recurring toggle */}
                    <div className="rounded-xl border border-border p-4 space-y-3">
                        <form.Field name="is_recurring">
                            {(field) => (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="cursor-pointer">Recurring Expense</Label>
                                        <p className="text-xs text-muted mt-0.5">
                                            Auto-track repeated expenses like rent, salary
                                        </p>
                                    </div>
                                    <Switch
                                        checked={field.state.value}
                                        onCheckedChange={(v) => {
                                            field.handleChange(v)
                                            setIsRecurring(v)
                                        }}
                                    />
                                </div>
                            )}
                        </form.Field>

                        {isRecurring && (
                            <form.Field name="recurring_type">
                                {(field) => (
                                    <div className="space-y-1.5">
                                        <Label>Recurring Frequency</Label>
                                        <Select
                                            value={field.state.value ?? ""}
                                            onValueChange={field.handleChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select frequency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {RECURRING_TYPES_LIST.map((r) => (
                                                    <SelectItem key={r} value={r}>
                                                        {r.charAt(0) + r.slice(1).toLowerCase()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </form.Field>
                        )}
                    </div>

                    {/* Paid by */}
                    <form.Field name="paid_by">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor={field.name}>Paid By</Label>
                                <Input
                                    id={field.name}
                                    placeholder="Admin / Staff name"
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
                                <Label htmlFor={field.name}>Notes</Label>
                                <Textarea
                                    id={field.name}
                                    rows={3}
                                    placeholder="Any additional details..."
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
                    <Button form="expense-form" type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEdit ? "Save Changes" : "Add Expense"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
