"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/AppShell"
import {
    LayoutDashboard,
    Users,
    UtensilsCrossed,
    Wallet,
    ShoppingCart,
    BarChart3,
    Settings,
    ChevronDown,
    ChevronRight,
    PanelLeftClose,
    CalendarDays,
} from "lucide-react"

interface NavChild {
    href: string
    label: string
    icon: React.ElementType
}

interface NavItem {
    href?: string
    label: string
    icon: React.ElementType
    children?: NavChild[]
}

const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customers", label: "Customers", icon: Users },
    {
        label: "Tiffin Entries",
        icon: UtensilsCrossed,
        children: [
            { href: "/tiffin-entries", label: "Daily Entries", icon: CalendarDays },
        ],
    },
    { href: "/payments", label: "Payments", icon: Wallet },
    { href: "/expenses", label: "Expenses", icon: ShoppingCart },
    { href: "/reports", label: "Reports", icon: BarChart3 },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { toggle } = useSidebar()

    const tiffinGroupActive = pathname.startsWith("/customers") || pathname.startsWith("/tiffin-entries")
    const [tiffinOpen, setTiffinOpen] = useState(tiffinGroupActive)

    return (
        <aside className="flex flex-col w-64 h-full shrink-0 bg-sidebar text-sidebar-foreground">
            {/* Logo + toggle */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white flex-1">TiffinTrack</span>
                <button
                    onClick={toggle}
                    title="Toggle sidebar"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
                >
                    <PanelLeftClose className="w-4.5 h-4.5" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map(({ href, label, icon: Icon, children }, navIdx) => {
                    // ── Group with children ──────────────────────────────────
                    if (children) {
                        const isGroupActive = tiffinGroupActive
                        return (
                            <div key={navIdx}>
                                <button
                                    onClick={() => setTiffinOpen((v) => !v)}
                                    className={cn(
                                        "w-full group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                                        isGroupActive
                                            ? "bg-white/10 text-white"
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={cn(
                                            "w-4.5 h-4.5 shrink-0 transition-colors",
                                            isGroupActive ? "text-sidebar-primary" : "text-slate-500 group-hover:text-slate-300"
                                        )} />
                                        {label}
                                    </div>
                                    {tiffinOpen
                                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    }
                                </button>

                                {tiffinOpen && (
                                    <div className="mt-0.5 ml-3 pl-4 border-l border-white/10 space-y-0.5">
                                        {children.map(({ href: childHref, label: childLabel, icon: ChildIcon }) => {
                                            const isChildActive = pathname === childHref ||
                                                (childHref === "/tiffin-entries" && pathname.startsWith("/tiffin-entries"))
                                            return (
                                                <Link
                                                    key={childHref + childLabel}
                                                    href={childHref}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                                                        isChildActive
                                                            ? "bg-white/10 text-white font-medium"
                                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <ChildIcon className={cn(
                                                        "w-4 h-4 shrink-0",
                                                        isChildActive ? "text-sidebar-primary" : "text-slate-500"
                                                    )} />
                                                    {childLabel}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    // ── Simple link ──────────────────────────────────────────
                    const isActive = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href!}
                            className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon className={cn(
                                "w-4.5 h-4.5 shrink-0 transition-colors",
                                isActive ? "text-sidebar-primary" : "text-slate-500 group-hover:text-slate-300"
                            )} />
                            {label}
                        </Link>
                    )
                })}
            </nav>

            {/* Settings */}
            <div className="px-3 pb-2 border-t border-white/10 pt-2">
                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                        pathname === "/settings"
                            ? "bg-white/10 text-white"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Settings className="w-4.5 h-4.5 shrink-0 text-slate-500" />
                    Settings
                </Link>
            </div>

            {/* User profile */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
                <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">A</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Admin</p>
                    <p className="text-xs text-slate-400 truncate">Owner</p>
                </div>
            </div>
        </aside>
    )
}
