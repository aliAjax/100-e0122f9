import { useContext } from 'react'
import { DataCacheContext } from '@/contexts/DataCacheContext'
import type { DataCacheResult } from '@/hooks/useDataCache'

export function useSharedDataCache(): DataCacheResult {
  const context = useContext(DataCacheContext)
  if (!context) {
    throw new Error('useSharedDataCache must be used within a DataCacheProvider')
  }
  return context.cache
}
