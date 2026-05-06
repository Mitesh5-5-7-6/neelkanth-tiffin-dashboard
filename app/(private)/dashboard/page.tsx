import { Utensils, IndianRupee, ShoppingCart, TrendingUp, Wallet, Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import StatCard from "@/components/StatCard"

export default function Dashboard() {
    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Page Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border shrink-0">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted mt-0.5">Welcome back, Admin</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden lg:block">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search...  ⌘K"
                            className="h-8 pl-8 pr-3 w-48 rounded-lg border border-border bg-background text-sm placeholder:text-muted focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                    </div>
                    <button className="relative p-2 rounded-lg hover:bg-muted/10 transition-colors">
                        <Bell className="w-5 h-5 text-muted" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
                    </button>
                    <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-xs font-bold text-white">A</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-none">Admin</p>
                            <p className="text-xs text-muted">Owner</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard
                        icon={<Utensils className="w-5 h-5" />}
                        heading="Today's Tiffin"
                        number="132"
                        variant="primary"
                    >
                        <div className="text-sm text-muted">
                            <p>Morning: 78</p>
                            <p>Evening: 54</p>
                        </div>
                    </StatCard>

                    <StatCard
                        icon={<IndianRupee className="w-5 h-5" />}
                        heading="Today's Revenue"
                        number="₹3,960"
                        variant="success"
                        trend={{ value: "12.5%", type: "up" }}
                    />

                    <StatCard
                        icon={<ShoppingCart className="w-5 h-5" />}
                        heading="Today's Expense"
                        number="₹1,250"
                        variant="warning"
                        trend={{ value: "5.3%", type: "down" }}
                    />

                    <StatCard
                        icon={<TrendingUp className="w-5 h-5" />}
                        heading="Today's Profit"
                        number="₹2,710"
                        variant="purple"
                        trend={{ value: "25.4%", type: "up" }}
                    />

                    <StatCard
                        icon={<Wallet className="w-5 h-5" />}
                        heading="Pending Payments"
                        number="₹2,450"
                        variant="danger"
                        description="From 6 Customers"
                    >
                        <Button variant="ghost" className="hover:bg-transparent flex justify-start" size="sm">
                            View Details
                        </Button>
                    </StatCard>
                </div>
            </div>
        </div>
    )
}
