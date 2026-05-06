"use client"

import { useState } from "react"
import { Eye, Pencil, Trash2, CheckCircle2, Minus, Search, Download, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Customer, CustomerQueryParams } from "@/types/customer.type"
import type { PaginationMeta } from "@/types/common.types"
import { cn } from "@/lib/utils"

interface CustomerTableProps {
    customers: Customer[]
    isLoading: boolean
    meta?: PaginationMeta
    params: CustomerQueryParams
    onParamsChange: (p: CustomerQueryParams) => void
    onView: (c: Customer) => void
    onEdit: (c: Customer) => void
    onDelete: (id: string) => void
    selectedId?: string
}

function getInitials(name: string) {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
}

const avatarColors = [
    "bg-primary", "bg-success", "bg-warning", "bg-purple", "bg-danger",
]

function getAvatarColor(name: string) {
    const idx = name.charCodeAt(0) % avatarColors.length
    return avatarColors[idx]
}

export default function CustomerTable({
    customers,
    isLoading,
    meta,
    params,
    onParamsChange,
    onView,
    onEdit,
    onDelete,
    selectedId,
}: CustomerTableProps) {
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    function handleSearch(value: string) {
        onParamsChange({ ...params, search: value, page: 1 })
    }

    function handleStatusFilter(value: string) {
        onParamsChange({
            ...params,
            is_active: value === "all" ? "" : value,
            page: 1,
        })
    }

    function handlePage(page: number) {
        onParamsChange({ ...params, page })
    }

    function confirmDelete(id: string) {
        if (deleteConfirmId === id) {
            onDelete(id)
            setDeleteConfirmId(null)
        } else {
            setDeleteConfirmId(id)
            setTimeout(() => setDeleteConfirmId(null), 3000)
        }
    }

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        placeholder="Search by name or phone..."
                        className="pl-8"
                        defaultValue={params.search ?? ""}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <Select
                    defaultValue={params.is_active === "" || params.is_active === undefined ? "all" : String(params.is_active)}
                    onValueChange={handleStatusFilter}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                <Select defaultValue="name-asc">
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name-asc">Name (A – Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z – A)</SelectItem>
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="oldest">Oldest first</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Export
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filter
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/10">
                            <th className="text-left px-4 py-3 font-medium text-muted w-10">#</th>
                            <th className="text-left px-4 py-3 font-medium text-muted">Customer</th>
                            <th className="text-left px-4 py-3 font-medium text-muted">Phone</th>
                            <th className="text-left px-4 py-3 font-medium text-muted">Price/Tiffin</th>
                            <th className="text-center px-4 py-3 font-medium text-muted">Morning</th>
                            <th className="text-center px-4 py-3 font-medium text-muted">Evening</th>
                            <th className="text-left px-4 py-3 font-medium text-muted">Status</th>
                            <th className="text-right px-4 py-3 font-medium text-muted">Outstanding</th>
                            <th className="text-center px-4 py-3 font-medium text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? [...Array(6)].map((_, i) => (
                                <tr key={i} className="border-b border-border/50">
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-3.5 w-28" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    </td>
                                    {[...Array(7)].map((_, j) => (
                                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                    ))}
                                </tr>
                            ))
                            : customers.length === 0
                                ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-muted">
                                            No customers found
                                        </td>
                                    </tr>
                                )
                                : customers.map((customer, idx) => {
                                    const rowNum = ((params.page ?? 1) - 1) * (params.limit ?? 10) + idx + 1
                                    const isSelected = customer._id === selectedId
                                    return (
                                        <tr
                                            key={customer._id}
                                            className={cn(
                                                "border-b border-border/50 transition-colors hover:bg-muted/5 cursor-pointer",
                                                isSelected && "bg-primary/5"
                                            )}
                                            onClick={() => onView(customer)}
                                        >
                                            <td className="px-4 py-3 text-muted">{rowNum}</td>

                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold",
                                                        getAvatarColor(customer.full_name)
                                                    )}>
                                                        {getInitials(customer.full_name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{customer.full_name}</p>
                                                        {customer.address && (
                                                            <p className="text-xs text-muted truncate max-w-40">{customer.address}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-foreground">{customer.phone}</td>

                                            <td className="px-4 py-3 text-foreground">
                                                ₹{(customer.price_morning + customer.price_evening) / 2}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {customer.default_morning
                                                    ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                                                    : <Minus className="w-4 h-4 text-muted mx-auto" />
                                                }
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {customer.default_evening
                                                    ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                                                    : <Minus className="w-4 h-4 text-muted mx-auto" />
                                                }
                                            </td>

                                            <td className="px-4 py-3">
                                                <Badge variant={customer.is_active ? "success" : "destructive"}>
                                                    {customer.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </td>

                                            <td className="px-4 py-3 text-right text-danger font-medium">
                                                ₹0
                                            </td>

                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => onView(customer)}
                                                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors"
                                                        title="View details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onEdit(customer)}
                                                        className="p-1.5 rounded-lg hover:bg-warning/10 text-muted hover:text-warning transition-colors"
                                                        title="Edit customer"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(customer._id)}
                                                        className={cn(
                                                            "p-1.5 rounded-lg transition-colors",
                                                            deleteConfirmId === customer._id
                                                                ? "bg-danger/10 text-danger"
                                                                : "hover:bg-danger/10 text-muted hover:text-danger"
                                                        )}
                                                        title={deleteConfirmId === customer._id ? "Click again to confirm" : "Deactivate"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                        }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted">
                    <span>
                        Showing {((meta.page - 1) * meta.limit) + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} customers
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={meta.page <= 1}
                            onClick={() => handlePage(meta.page - 1)}
                        >
                            ‹
                        </Button>
                        {[...Array(Math.min(meta.totalPages, 5))].map((_, i) => {
                            const page = i + 1
                            return (
                                <Button
                                    key={page}
                                    variant={page === meta.page ? "default" : "outline"}
                                    size="icon-sm"
                                    onClick={() => handlePage(page)}
                                >
                                    {page}
                                </Button>
                            )
                        })}
                        <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={meta.page >= meta.totalPages}
                            onClick={() => handlePage(meta.page + 1)}
                        >
                            ›
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
