"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            className={cn(
                "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                className
            )}
            {...props}
        />
    )
}

type SheetContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
    side?: "left" | "right" | "top" | "bottom"
}

function SheetContent({ side = "right", className, children, ...props }: SheetContentProps) {
    return (
        <SheetPortal>
            <SheetOverlay />
            <DialogPrimitive.Content
                className={cn(
                    "fixed z-50 bg-background shadow-xl transition ease-in-out duration-300",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    side === "right" && [
                        "inset-y-0 right-0 h-full w-full max-w-md",
                        "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
                    ],
                    side === "left" && [
                        "inset-y-0 left-0 h-full w-full max-w-md",
                        "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
                    ],
                    side === "top" && [
                        "inset-x-0 top-0 w-full",
                        "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
                    ],
                    side === "bottom" && [
                        "inset-x-0 bottom-0 w-full",
                        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                    ],
                    className
                )}
                {...props}
            >
                {children}
                <SheetClose className="absolute right-4 top-4 rounded-lg p-1 opacity-70 ring-offset-background hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </SheetClose>
            </DialogPrimitive.Content>
        </SheetPortal>
    )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div className={cn("flex flex-col space-y-1 px-6 pt-6 pb-4 border-b border-border", className)} {...props} />
    )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div className={cn("flex justify-end gap-3 px-6 py-4 border-t border-border", className)} {...props} />
    )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            className={cn("text-lg font-semibold text-foreground", className)}
            {...props}
        />
    )
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            className={cn("text-sm text-muted", className)}
            {...props}
        />
    )
}

export {
    Sheet, SheetTrigger, SheetClose, SheetPortal, SheetOverlay,
    SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription,
}
