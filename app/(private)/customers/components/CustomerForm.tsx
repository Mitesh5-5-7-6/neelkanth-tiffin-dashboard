"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCustomerSchema, type CreateCustomerInput } from "@/lib/validations/customer.validation"
import type { Customer } from "@/types/customer.type"
import { cn } from "@/lib/utils"

interface CustomerFormProps {
    open: boolean
    customer?: Customer | null
    onClose: () => void
    onSubmit: (data: CreateCustomerInput) => Promise<void>
    isLoading: boolean
}

function ToggleField({
    label,
    checked,
    onChange,
}: {
    label: string
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    checked ? "bg-primary" : "bg-muted/30"
                )}
            >
                <span
                    className={cn(
                        "pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow-lg ring-0 transition duration-200",
                        checked ? "translate-x-4" : "translate-x-0"
                    )}
                />
            </button>
        </div>
    )
}

export default function CustomerForm({ open, customer, onClose, onSubmit, isLoading }: CustomerFormProps) {
    const isEdit = !!customer

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<CreateCustomerInput>({
        resolver: zodResolver(createCustomerSchema),
        defaultValues: {
            full_name: "",
            phone: "",
            address: "",
            default_morning: true,
            default_evening: true,
            price_morning: 30,
            price_evening: 30,
            notes: "",
        },
    })

    useEffect(() => {
        if (open) {
            reset(
                customer
                    ? {
                        full_name: customer.full_name,
                        phone: customer.phone,
                        address: customer.address ?? "",
                        default_morning: customer.default_morning,
                        default_evening: customer.default_evening,
                        price_morning: customer.price_morning,
                        price_evening: customer.price_evening,
                        notes: customer.notes ?? "",
                    }
                    : {
                        full_name: "",
                        phone: "",
                        address: "",
                        default_morning: true,
                        default_evening: true,
                        price_morning: 30,
                        price_evening: 30,
                        notes: "",
                    }
            )
        }
    }, [open, customer, reset])

    async function handleFormSubmit(data: CreateCustomerInput) {
        await onSubmit(data)
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
                    onSubmit={handleSubmit(handleFormSubmit)}
                    className="flex-1 px-6 py-4 space-y-5"
                >
                    {/* Basic Info */}
                    <div className="space-y-1.5">
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                            id="full_name"
                            placeholder="Rajesh Kumar"
                            {...register("full_name")}
                            className={errors.full_name ? "border-danger" : ""}
                        />
                        {errors.full_name && (
                            <p className="text-xs text-danger">{errors.full_name.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                            id="phone"
                            placeholder="9876543210"
                            type="tel"
                            {...register("phone")}
                            className={errors.phone ? "border-danger" : ""}
                        />
                        {errors.phone && (
                            <p className="text-xs text-danger">{errors.phone.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            placeholder="123, Green Park, Delhi"
                            {...register("address")}
                        />
                    </div>

                    {/* Tiffin Defaults */}
                    <div className="rounded-xl border border-border p-4 space-y-3">
                        <p className="text-sm font-semibold text-foreground">Tiffin Defaults</p>

                        <Controller
                            control={control}
                            name="default_morning"
                            render={({ field }) => (
                                <ToggleField
                                    label="Morning Tiffin"
                                    checked={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="default_evening"
                            render={({ field }) => (
                                <ToggleField
                                    label="Evening Tiffin"
                                    checked={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="price_morning">Morning Price (₹) *</Label>
                            <Input
                                id="price_morning"
                                type="number"
                                min={0}
                                {...register("price_morning", { valueAsNumber: true })}
                                className={errors.price_morning ? "border-danger" : ""}
                            />
                            {errors.price_morning && (
                                <p className="text-xs text-danger">{errors.price_morning.message}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="price_evening">Evening Price (₹) *</Label>
                            <Input
                                id="price_evening"
                                type="number"
                                min={0}
                                {...register("price_evening", { valueAsNumber: true })}
                                className={errors.price_evening ? "border-danger" : ""}
                            />
                            {errors.price_evening && (
                                <p className="text-xs text-danger">{errors.price_evening.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label htmlFor="notes">Notes</Label>
                        <textarea
                            id="notes"
                            rows={3}
                            placeholder="Any special instructions..."
                            {...register("notes")}
                            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm resize-none focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 placeholder:text-muted"
                        />
                    </div>
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
