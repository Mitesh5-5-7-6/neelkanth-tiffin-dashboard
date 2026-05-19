"use client"

import Link from "next/link"
import { CalendarDays, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCustomerStats } from "@/hooks/useCustomers"

export default function BulkCopySection() {
    const { data: statsData } = useCustomerStats()
    const activeCount = statsData?.data?.active ?? 0

    return (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Daily Tiffin Entries</h3>
                    <p className="text-sm text-muted mt-0.5">
                        Record today&apos;s deliveries for {activeCount} active customer{activeCount !== 1 ? "s" : ""}.
                        Copy from yesterday or use defaults.
                    </p>
                </div>
            </div>
            <Link href="/tiffin-entries">
                <Button className="gap-2 shrink-0">
                    Open Daily Entries
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </Link>
        </div>
    )
}
