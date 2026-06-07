import { createContext } from 'react'
import type { DataCacheResult } from '@/hooks/useDataCache'

type PartialCacheResult = Pick<DataCacheResult, 'filtered' | 'monthlyData' | 'categoryData' | 'dailyData'>

interface DataCacheContextValue {
  cache: DataCacheResult
  cacheNoCategory: PartialCacheResult
  cacheNoCategoryNoSearch: PartialCacheResult
  cacheNoMerchantNoSearch: PartialCacheResult
  cacheFull: PartialCacheResult
}

export const DataCacheContext = createContext<DataCacheContextValue | null>(null)
