import { useContext } from 'react'
import { DataCacheContext } from '@/contexts/DataCacheContext'
import type { DataCacheResult } from '@/hooks/useDataCache'

type PartialCacheResult = Pick<DataCacheResult, 'filtered' | 'monthlyData' | 'categoryData' | 'dailyData'>

interface SharedDataCacheResult {
  cache: DataCacheResult
  cacheNoCategory: PartialCacheResult
  cacheNoCategoryNoSearch: PartialCacheResult
  cacheNoMerchantNoSearch: PartialCacheResult
  cacheFull: PartialCacheResult
}

export function useSharedDataCache(): SharedDataCacheResult {
  const context = useContext(DataCacheContext)
  if (!context) {
    throw new Error('useSharedDataCache must be used within a DataCacheProvider')
  }
  return context
}
