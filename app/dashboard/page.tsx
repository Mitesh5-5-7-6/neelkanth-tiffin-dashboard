import { Utensils, IndianRupee, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "../../components/StatCard";

export default function Dashboard() {
    return (
        <div className="p-6 bg-bg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

            <StatCard
                icon={<Utensils className="w-5 h-5" />}
                heading="Today's Tiffin"
                number="132"
                variant="primary"
            >
                <div className=" text-sm text-muted">
                    <p>Morning: 78</p>
                    <p>Evening: 54</p>
                </div>
                <p className="text-sm text-muted">

                </p>
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
    );
}