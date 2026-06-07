import { createContext, useMemo, ReactNode } from 'react'
import type { Transaction, FilterState } from '@/types'
import type { DataCacheResult } from '@/hooks/useDataCache'
import { useDataCache } from '@/hooks/useDataCache'

interface DataCacheContextValue {
  cache: DataCacheResult
}

export const DataCacheContext = createContext<DataCacheContextValue | null>(null)

export function DataCacheProvider({
  children,
  transactions,
  filter,
}: {
  children: ReactNode
  transactions: Transaction[]
  filter: FilterState
}) {
  const cache = useDataCache(transactions, filter)

  const value = useMemo(() => ({ cache }), [cache])

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>
}
