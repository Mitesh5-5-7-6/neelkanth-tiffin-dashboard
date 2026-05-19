import React from "react";
import { cn } from "@/lib/utils";

type StatCardProps = {
    icon: React.ReactNode;
    heading: string;
    number: string;
    description?: string;
    trend?: {
        value: string;
        type: "up" | "down";
    };
    variant?: "primary" | "success" | "warning" | "purple" | "danger";
    children?: React.ReactNode;
};

const variantStyles = {
    primary: {
        bg: "bg-primary-light",
        iconBg: "bg-primary",
        text: "text-primary",
        border: "border-primary-light",
    },
    success: {
        bg: "bg-success-light",
        iconBg: "bg-success",
        text: "text-success",
        border: "border-success-light",
    },
    warning: {
        bg: "bg-warning-light",
        iconBg: "bg-warning",
        text: "text-warning",
        border: "border-warning-light",
    },
    purple: {
        bg: "bg-purple-light",
        iconBg: "bg-purple",
        text: "text-purple",
        border: "border-purple-light",
    },
    danger: {
        bg: "bg-danger-light",
        iconBg: "bg-danger",
        text: "text-danger",
        border: "border-danger-border",
    },
};

const StatCard = ({
    icon,
    heading,
    number,
    description,
    trend,
    variant = "primary",
    children,
}: StatCardProps) => {
    const styles = variantStyles[variant];

    return (
        <div className={cn(
            "border border-border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition",
            styles.bg, styles.border
        )}>

            {/* Top */}
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        "p-3 rounded-lg text-white flex items-center justify-center",
                        styles.iconBg
                    )}
                >
                    {icon}
                </div>

                <div>
                    <p className="text-sm text-muted">{heading}</p>
                    <h2 className={cn("text-2xl font-semibold", styles.text)}>{number}</h2>
                    {description && <p className="text-sm text-muted">{description}</p>}
                </div>
            </div>

            {/* Trend */}
            {trend && (
                <div className="text-sm flex items-center gap-2">
                    <span className="text-muted">vs Yesterday</span>
                    <span
                        className={cn(
                            "font-medium",
                            trend.type === "up" ? "text-success" : "text-danger"
                        )}
                    >
                        {trend.type === "up" ? "↑" : "↓"} {trend.value}
                    </span>
                </div>
            )}

            {/* Extra Content */}
            {children}
        </div>
    );
};

export default StatCard;