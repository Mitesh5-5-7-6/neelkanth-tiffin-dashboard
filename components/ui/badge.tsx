import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-white",
                secondary: "border-transparent bg-secondary text-secondary-foreground",
                destructive: "border-transparent bg-danger-light text-danger",
                outline: "border-border text-foreground",
                success: "border-transparent bg-success-light text-success",
                warning: "border-transparent bg-warning-light text-warning",
            },
        },
        defaultVariants: { variant: "default" },
    }
)

function Badge({
    className,
    variant,
    ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
