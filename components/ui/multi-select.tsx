"use client"

import * as React from "react"
import { X, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
    value: string
    label: string
}

interface MultiSelectProps {
    options: MultiSelectOption[]
    value: string[]
    onChange: (values: string[]) => void
    placeholder?: string
    className?: string
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Select…",
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    function toggle(val: string) {
        onChange(
            value.includes(val)
                ? value.filter((v) => v !== val)
                : [...value, val]
        )
    }

    function remove(val: string, e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        onChange(value.filter((v) => v !== val))
    }

    const selected = options.filter((o) => value.includes(o.value))

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs ring-offset-background transition-colors",
                        "hover:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                >
                    {selected.length === 0 ? (
                        <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
                    ) : (
                        <div className="flex flex-1 flex-wrap gap-1">
                            {selected.map((o) => (
                                <Badge key={o.value} variant="secondary" className="gap-0.5 pr-0.5 text-xs">
                                    {o.label}
                                    <span
                                        role="button"
                                        tabIndex={-1}
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                                        onClick={(e) => remove(o.value, e)}
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </span>
                                </Badge>
                            ))}
                        </div>
                    )}
                    <ChevronDown className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="min-w-[var(--radix-popover-trigger-width)] p-1"
                align="start"
            >
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                            onClick={() => toggle(option.value)}
                        >
                            <Checkbox
                                checked={value.includes(option.value)}
                                onCheckedChange={() => toggle(option.value)}
                            />
                            <span className="text-sm">{option.label}</span>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
