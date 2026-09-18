"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useDashboardFilter } from "./use-date-filter"

export interface DashboardRangeState {
  from: string
  to: string
  label: string
  custom?: boolean
}

const DashboardRangeContext = createContext<DashboardRangeState | null>(null)

export function DashboardRangeProvider({
  children,
  value,
}: {
  children: ReactNode
  value: DashboardRangeState
}) {
  return (
    <DashboardRangeContext.Provider value={value}>
      {children}
    </DashboardRangeContext.Provider>
  )
}

export function useDashboardRange(): DashboardRangeState {
  const context = useContext(DashboardRangeContext)
  const fallback = useDashboardFilter()
  return context ?? fallback
}
