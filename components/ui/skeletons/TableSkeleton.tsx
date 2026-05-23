import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
    rows?: number
    cols?: number
    title?: string
}

export default function TableSkeleton({ rows = 5, cols = 5, title }: TableSkeletonProps) {
    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
                {title
                    ? <p className="text-sm font-semibold text-foreground">{title}</p>
                    : <Skeleton className="w-40 h-4 rounded" />
                }
                <Skeleton className="w-28 h-3 rounded mt-1.5" />
            </div>
            <div className="p-4 space-y-3">
                {/* header row */}
                <div className="flex gap-3">
                    {Array.from({ length: cols }).map((_, i) => (
                        <Skeleton key={i} className="flex-1 h-3 rounded" />
                    ))}
                </div>
                {/* data rows */}
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                        {Array.from({ length: cols }).map((_, j) => (
                            <Skeleton
                                key={j}
                                className="flex-1 h-8 rounded"
                                style={{ opacity: 1 - i * 0.1 }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
