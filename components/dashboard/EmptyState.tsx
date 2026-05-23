import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon: React.ReactNode
    title: string
    description?: string
    action?: React.ReactNode
    className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-10 px-4 text-center gap-3", className)}>
            <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground">
                {icon}
            </div>
            <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {description && (
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-48">{description}</p>
                )}
            </div>
            {action}
        </div>
    )
}
