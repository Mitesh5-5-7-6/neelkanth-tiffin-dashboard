"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    UtensilsCrossed,
    Wallet,
    ShoppingCart,
    BarChart3,
    Settings,
    ChevronDown,
} from "lucide-react"

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/tiffin-entries", label: "Tiffin Entries", icon: UtensilsCrossed },
    { href: "/payments", label: "Payments", icon: Wallet },
    { href: "/expenses", label: "Expenses", icon: ShoppingCart },
    {
        href: "/reports",
        label: "Reports",
        icon: BarChart3,
        hasChildren: true,
    },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="flex flex-col w-64 min-h-screen shrink-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-[var(--sidebar-primary)] flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">TiffinTrack</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map(({ href, label, icon: Icon, hasChildren }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/")
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Icon
                                    className={cn(
                                        "w-4.5 h-4.5 shrink-0 transition-colors",
                                        isActive ? "text-[var(--sidebar-primary)]" : "text-slate-500 group-hover:text-slate-300"
                                    )}
                                />
                                {label}
                            </div>
                            {hasChildren && (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom section */}
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
                <div className="w-8 h-8 rounded-full bg-[var(--sidebar-primary)] flex items-center justify-center shrink-0">
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
