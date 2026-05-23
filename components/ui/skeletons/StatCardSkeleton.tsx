import { Skeleton } from "@/components/ui/skeleton"

export default function StatCardSkeleton() {
    return (
        <div className="rounded-2xl border border-border p-5 flex flex-col gap-3 bg-card">
            <div className="flex items-start justify-between">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <Skeleton className="w-14 h-5 rounded-full" />
            </div>
            <div className="space-y-1.5">
                <Skeleton className="w-24 h-3 rounded" />
                <Skeleton className="w-32 h-7 rounded" />
                <Skeleton className="w-20 h-3 rounded" />
            </div>
        </div>
    )
}
