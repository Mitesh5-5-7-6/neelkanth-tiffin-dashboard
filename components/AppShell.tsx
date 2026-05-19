"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import Sidebar from "@/components/Sidebar"
import { cn } from "@/lib/utils"

// ─── Context ──────────────────────────────────────────────────────────────────

interface SidebarContextValue {
    open: boolean
    toggle: () => void
    close: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
    open: true,
    toggle: () => {},
    close: () => {},
})

export function useSidebar() {
    return useContext(SidebarContext)
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(true)
    const pathname = usePathname()

    // Start closed on mobile
    useEffect(() => {
        if (window.innerWidth < 768) setOpen(false)
    }, [])

    // Auto-close sidebar on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 768) setOpen(false)
    }, [pathname])

    function toggle() { setOpen((v) => !v) }
    function close() { setOpen(false) }

    return (
        <SidebarContext.Provider value={{ open, toggle, close }}>
            <div className="flex h-screen overflow-hidden bg-background">
                {/* Mobile backdrop */}
                {open && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 md:hidden"
                        onClick={close}
                    />
                )}

                {/* Sidebar wrapper */}
                <div
                    className={cn(
                        // Mobile: fixed overlay
                        "fixed inset-y-0 left-0 z-40",
                        // Desktop: part of flex flow
                        "md:relative md:z-auto md:shrink-0",
                        // Transition
                        "transition-transform duration-300 ease-in-out",
                        // Open/close
                        open
                            ? "translate-x-0 md:w-64"
                            : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"
                    )}
                >
                    <Sidebar />
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {children}
                </div>
            </div>
            <Toaster />
        </SidebarContext.Provider>
    )
}
