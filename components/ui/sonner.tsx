"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
    return (
        <Sonner
            position="bottom-right"
            toastOptions={{
                classNames: {
                    toast: "bg-background border border-border text-foreground rounded-xl shadow-lg",
                    description: "text-muted text-sm",
                    actionButton: "bg-primary text-white",
                    cancelButton: "bg-muted/20 text-muted",
                    error: "bg-danger-light text-danger border-danger/20",
                    success: "bg-success-light text-success border-success/20",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
