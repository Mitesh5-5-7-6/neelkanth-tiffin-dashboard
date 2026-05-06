"use client"

import { useState } from "react"
import { Plus, Bell, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import CustomerStats from "./components/CustomerStats"
import CustomerTable from "./components/CustomerTable"
import CustomerForm from "./components/CustomerForm"
import CustomerDetailPanel from "./components/CustomerDetailPanel"
import BulkCopySection from "./components/BulkCopySection"
import {
    useCustomers,
    useCreateCustomer,
    useUpdateCustomer,
    useDeleteCustomer,
} from "@/hooks/useCustomers"
import type { Customer, CustomerQueryParams } from "@/types/customer.type"
import type { CreateCustomerInput } from "@/lib/validations/customer.validation"

export default function CustomersPage() {
    const [params, setParams] = useState<CustomerQueryParams>({ page: 1, limit: 10 })
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [showForm, setShowForm] = useState(false)

    const { data, isLoading } = useCustomers(params)
    const createMutation = useCreateCustomer()
    const updateMutation = useUpdateCustomer()
    const deleteMutation = useDeleteCustomer()

    const customers = data?.data ?? []
    const meta = data?.meta as { page: number; limit: number; total: number; totalPages: number } | undefined

    function handleEdit(customer: Customer) {
        setEditingCustomer(customer)
        setShowForm(true)
    }

    function handleFormClose() {
        setShowForm(false)
        setEditingCustomer(null)
    }

    async function handleFormSubmit(data: CreateCustomerInput) {
        try {
            if (editingCustomer) {
                await updateMutation.mutateAsync({ id: editingCustomer._id, data })
                toast.success("Customer updated successfully")
                if (selectedCustomer?._id === editingCustomer._id) {
                    setSelectedCustomer({ ...selectedCustomer, ...data })
                }
            } else {
                await createMutation.mutateAsync(data)
                toast.success("Customer added successfully")
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
            toast.success("Customer deactivated")
            if (selectedCustomer?._id === id) setSelectedCustomer(null)
        } catch {
            toast.error("Failed to deactivate customer")
        }
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Page Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border shrink-0">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">Customers</h1>
                    <p className="text-sm text-muted mt-0.5">
                        Manage all your customers and their tiffin details
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Global search */}
                    <div className="relative hidden lg:block">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search customers...  ⌘K"
                            className="h-8 pl-8 pr-3 w-52 rounded-lg border border-border bg-background text-sm placeholder:text-muted focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                    </div>

                    {/* Notifications */}
                    <button className="relative p-2 rounded-lg hover:bg-muted/10 transition-colors">
                        <Bell className="w-5 h-5 text-muted" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
                    </button>

                    {/* User */}
                    <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-xs font-bold text-white">A</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-none">Admin</p>
                            <p className="text-xs text-muted">Owner</p>
                        </div>
                    </div>

                    <Button
                        onClick={() => setShowForm(true)}
                        className="gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        Add Customer
                    </Button>
                </div>
            </header>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main content */}
                <div className="flex-1 overflow-auto p-6 space-y-5">
                    <CustomerStats />
                    <BulkCopySection />
                    <CustomerTable
                        customers={customers}
                        isLoading={isLoading}
                        meta={meta}
                        params={params}
                        onParamsChange={setParams}
                        onView={setSelectedCustomer}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        selectedId={selectedCustomer?._id}
                    />
                </div>

                {/* Detail panel */}
                {selectedCustomer && (
                    <CustomerDetailPanel
                        customer={selectedCustomer}
                        onClose={() => setSelectedCustomer(null)}
                        onEdit={() => handleEdit(selectedCustomer)}
                    />
                )}
            </div>

            {/* Add / Edit form */}
            <CustomerForm
                open={showForm}
                customer={editingCustomer}
                onClose={handleFormClose}
                onSubmit={handleFormSubmit}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    )
}
