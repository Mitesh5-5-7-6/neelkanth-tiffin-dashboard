"use client"

import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2, Eye, Receipt, AlertCircle } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecentTiffinEntries, type RecentTiffinEntry } from "@/hooks/useDashboard"
import EmptyState from "@/components/dashboard/EmptyState"

const col = createColumnHelper<RecentTiffinEntry>()

const columns = [
    col.accessor("date", {
        header: "Date",
        cell: (info) => <span className="text-xs text-muted-foreground whitespace-nowrap">{info.getValue()}</span>,
    }),
    col.accessor("customer", {
        header: "Customer",
        cell: (info) => (
            <span className="text-sm font-medium text-foreground">{info.getValue()}</span>
        ),
    }),
    col.accessor("morning", {
        header: "Morning",
        cell: (info) => (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                {info.getValue()}
            </span>
        ),
    }),
    col.accessor("evening", {
        header: "Evening",
        cell: (info) => (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple/10 text-purple text-xs font-semibold">
                {info.getValue()}
            </span>
        ),
    }),
    col.accessor("total", {
        header: "Total",
        cell: (info) => (
            <span className="text-sm font-semibold text-foreground">{info.getValue()}</span>
        ),
    }),
    col.accessor("amount", {
        header: "Amount",
        cell: (info) => (
            <span className="text-sm font-semibold text-success">₹{info.getValue()}</span>
        ),
    }),
    col.display({
        id: "actions",
        header: "",
        cell: () => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-muted/20 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
                        <Eye className="w-3.5 h-3.5" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs text-danger cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
    }),
]

export default function RecentTiffinTable() {
    const { data = [], isLoading, isError } = useRecentTiffinEntries()

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Recent Tiffin Entries</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 7 days entries</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id} className="border-b border-border bg-muted/20">
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-border last:border-0">
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <Skeleton className="h-4 w-full rounded" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : isError ? (
                            <tr>
                                <td colSpan={7}>
                                    <EmptyState
                                        icon={<AlertCircle className="w-5 h-5" />}
                                        title="Could not load entries"
                                        description="Failed to fetch tiffin data. It will retry automatically."
                                    />
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <EmptyState
                                        icon={<Receipt className="w-5 h-5" />}
                                        title="No tiffin entries"
                                        description="No entries found for the selected period."
                                    />
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-4 py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
