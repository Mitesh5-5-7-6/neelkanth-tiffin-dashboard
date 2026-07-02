"use client"

import { useEffect, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    createCustomerSchema,
    tiffinDefaultsSchema,
    type CreateCustomerInput,
} from "@/lib/validations/customer.validation"
import { zodField } from "@/lib/validations/utils"
import type { Customer } from "@/types/customer.type"

interface CustomerFormProps {
    open: boolean
    customer?: Customer | null
    onClose: () => void
    onSubmit: (data: CreateCustomerInput) => Promise<void>
    isLoading: boolean
}

const EMPTY_DEFAULTS: CreateCustomerInput = {
    full_name: "",
    phone: "",
    address: "",
    notes: "",
    tiffin_defaults: {
        morning: true,
        morning_qty: 1,
        morning_price: 30,
        evening: true,
        evening_qty: 1,
        evening_price: 30,
    },
}

function toFormValues(customer: Customer): CreateCustomerInput {
    return {
        full_name: customer.full_name,
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        notes: customer.notes ?? "",
        tiffin_defaults: {
            morning: customer.tiffin_defaults.morning,
            morning_qty: customer.tiffin_defaults.morning_qty,
            morning_price: customer.tiffin_defaults.morning_price,
            evening: customer.tiffin_defaults.evening,
            evening_qty: customer.tiffin_defaults.evening_qty,
            evening_price: customer.tiffin_defaults.evening_price,
        },
    }
}

function FieldError({ errors, show }: { errors: unknown[]; show: boolean }) {
    if (!show) return null
    const msg = errors.find((e): e is string => typeof e === "string" && e.length > 0)
    if (!msg) return null
    return <p className="text-xs text-danger">{msg}</p>
}

export default function CustomerForm({ open, customer, onClose, onSubmit, isLoading }: CustomerFormProps) {
    const isEdit = !!customer
    const [submitted, setSubmitted] = useState(false)

    const form = useForm({
        defaultValues: EMPTY_DEFAULTS,
        onSubmit: async ({ value }) => {
            const result = createCustomerSchema.safeParse(value)
            if (result.success) {
                await onSubmit(result.data)
            }
        },
    })

    useEffect(() => {
        if (!open) return
        const t = window.setTimeout(() => setSubmitted(false), 0)
        form.reset(customer ? toFormValues(customer) : EMPTY_DEFAULTS)
        return () => window.clearTimeout(t)
    }, [open, customer])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitted(true)
        form.handleSubmit()
    }

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent side="right" className="w-full max-w-md flex flex-col overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{isEdit ? "Edit Customer" : "Add New Customer"}</SheetTitle>
                    <SheetDescription>
                        {isEdit ? "Update customer details below." : "Fill in the details to register a new customer."}
                    </SheetDescription>
                </SheetHeader>

                <form
                    id="customer-form"
                    onSubmit={handleSubmit}
                    className="flex-1 px-6 py-4 space-y-5"
                >
                    {/* Full Name */}
                    <form.Field
                        name="full_name"
                        validators={{ onChange: zodField(createCustomerSchema.shape.full_name) }}
                    >
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor={field.name}>Full Name *</Label>
                                <Input
                                    id={field.name}
                                    placeholder="Rajesh Kumar"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                />
                                <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                            </div>
                        )}
                    </form.Field>

                    {/* Phone */}
                    <form.Field
                        name="phone"
                        validators={{ onChange: zodField(createCustomerSchema.shape.phone) }}
                    >
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor={field.name}>Phone Number</Label>
                                <Input
                                    id={field.name}
                                    placeholder="9876543210"
                                    type="tel"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                />
                                <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                            </div>
                        )}
                    </form.Field>

                    {/* Address */}
                    <form.Field name="address">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor={field.name}>Address</Label>
                                <Input
                                    id={field.name}
                                    placeholder="123, Green Park, Delhi"
                                    value={field.state.value ?? ""}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Tiffin Defaults */}
                    <div className="rounded-xl border border-border p-4 space-y-4">
                        <p className="text-sm font-semibold text-foreground">Tiffin Defaults</p>

                        {/* Morning */}
                        <div className="space-y-2">
                            <form.Field name="tiffin_defaults.morning">
                                {(field) => (
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="td_morning" className="cursor-pointer">Morning Tiffin</Label>
                                        <Switch
                                            id="td_morning"
                                            checked={field.state.value}
                                            onCheckedChange={field.handleChange}
                                        />
                                    </div>
                                )}
                            </form.Field>
                            <div className="grid grid-cols-2 gap-3">
                                <form.Field
                                    name="tiffin_defaults.morning_qty"
                                    validators={{ onChange: zodField(tiffinDefaultsSchema.shape.morning_qty) }}
                                >
                                    {(field) => (
                                        <div className="space-y-1">
                                            <Label htmlFor={field.name} className="text-xs text-muted">Qty / Day</Label>
                                            <Input
                                                id={field.name}
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={field.state.value}
                                                onChange={(e) => {
                                                    const newQty = Math.max(1, parseInt(e.target.value) || 1)
                                                    const oldQty = form.getFieldValue("tiffin_defaults.morning_qty")
                                                    const oldPrice = form.getFieldValue("tiffin_defaults.morning_price")
                                                    const unitPrice = oldQty > 0 ? oldPrice / oldQty : oldPrice
                                                    field.handleChange(newQty)
                                                    form.setFieldValue("tiffin_defaults.morning_price", Math.max(1, Math.round(newQty * unitPrice)))
                                                }}
                                                onBlur={field.handleBlur}
                                            />
                                            <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                        </div>
                                    )}
                                </form.Field>
                                <form.Field
                                    name="tiffin_defaults.morning_price"
                                    validators={{ onChange: zodField(tiffinDefaultsSchema.shape.morning_price) }}
                                >
                                    {(field) => (
                                        <div className="space-y-1">
                                            <Label htmlFor={field.name} className="text-xs text-muted">Price (₹)</Label>
                                            <Input
                                                id={field.name}
                                                type="number"
                                                min={1}
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(Math.max(1, parseFloat(e.target.value) || 1))}
                                                onBlur={field.handleBlur}
                                                className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                            />
                                            <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                        </div>
                                    )}
                                </form.Field>
                            </div>
                        </div>

                        <div className="border-t border-border/50" />

                        {/* Evening */}
                        <div className="space-y-2">
                            <form.Field name="tiffin_defaults.evening">
                                {(field) => (
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="td_evening" className="cursor-pointer">Evening Tiffin</Label>
                                        <Switch
                                            id="td_evening"
                                            checked={field.state.value}
                                            onCheckedChange={field.handleChange}
                                        />
                                    </div>
                                )}
                            </form.Field>
                            <div className="grid grid-cols-2 gap-3">
                                <form.Field
                                    name="tiffin_defaults.evening_qty"
                                    validators={{ onChange: zodField(tiffinDefaultsSchema.shape.evening_qty) }}
                                >
                                    {(field) => (
                                        <div className="space-y-1">
                                            <Label htmlFor={field.name} className="text-xs text-muted">Qty / Day</Label>
                                            <Input
                                                id={field.name}
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={field.state.value}
                                                onChange={(e) => {
                                                    const newQty = Math.max(1, parseInt(e.target.value) || 1)
                                                    const oldQty = form.getFieldValue("tiffin_defaults.evening_qty")
                                                    const oldPrice = form.getFieldValue("tiffin_defaults.evening_price")
                                                    const unitPrice = oldQty > 0 ? oldPrice / oldQty : oldPrice
                                                    field.handleChange(newQty)
                                                    form.setFieldValue("tiffin_defaults.evening_price", Math.max(1, Math.round(newQty * unitPrice)))
                                                }}
                                                onBlur={field.handleBlur}
                                            />
                                            <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                        </div>
                                    )}
                                </form.Field>
                                <form.Field
                                    name="tiffin_defaults.evening_price"
                                    validators={{ onChange: zodField(tiffinDefaultsSchema.shape.evening_price) }}
                                >
                                    {(field) => (
                                        <div className="space-y-1">
                                            <Label htmlFor={field.name} className="text-xs text-muted">Price (₹)</Label>
                                            <Input
                                                id={field.name}
                                                type="number"
                                                min={1}
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(Math.max(1, parseFloat(e.target.value) || 1))}
                                                onBlur={field.handleBlur}
                                                className={(field.state.meta.isTouched || submitted) && field.state.meta.errors.length ? "border-danger" : ""}
                                            />
                                            <FieldError errors={field.state.meta.errors} show={field.state.meta.isTouched || submitted} />
                                        </div>
                                    )}
                                </form.Field>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <form.Field name="notes">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor={field.name}>Notes</Label>
                                <Textarea
                                    id={field.name}
                                    rows={3}
                                    placeholder="Any special instructions..."
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
                    <Button form="customer-form" type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEdit ? "Save Changes" : "Add Customer"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
