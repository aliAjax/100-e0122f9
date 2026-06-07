import { useMemo, ReactNode } from 'react'
import type { Transaction, FilterState } from '@/types'
import { DataCacheContext } from './DataCacheContext'
import { useDataCache, usePartialDataCache } from '@/hooks/useDataCache'

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
  const cacheNoCategory = usePartialDataCache(transactions, filter, {
    excludeCategory: true,
  })
  const cacheNoCategoryNoSearch = usePartialDataCache(transactions, filter, {
    excludeCategory: true,
    excludeSearch: true,
  })
  const cacheNoMerchantNoSearch = usePartialDataCache(transactions, filter, {
    excludeMerchant: true,
    excludeSearch: true,
  })
  const cacheFull = usePartialDataCache(transactions, filter, {
    excludeCategory: true,
    excludeMerchant: true,
    excludeSearch: true,
  })

  const value = useMemo(
    () => ({ cache, cacheNoCategory, cacheNoCategoryNoSearch, cacheNoMerchantNoSearch, cacheFull }),
    [cache, cacheNoCategory, cacheNoCategoryNoSearch, cacheNoMerchantNoSearch, cacheFull],
  )

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>
}
