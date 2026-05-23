import { Skeleton } from "@/components/ui/skeleton"

export default function ChartSkeleton({ height = 220 }: { height?: number }) {
    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                    <Skeleton className="w-32 h-4 rounded" />
                    <Skeleton className="w-48 h-3 rounded" />
                </div>
                <Skeleton className="w-20 h-5 rounded-full" />
            </div>
            <Skeleton className="w-full rounded-xl" style={{ height }} />
        </div>
    )
}
