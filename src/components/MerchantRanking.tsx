import { useMemo } from 'react'
import { Store } from 'lucide-react'
import { useDashboardStore, useMergeMode, useEffectiveFilter } from '@/store/useDashboardStore'
import { useSharedDataCache } from '@/hooks/useSharedDataCache'
import { fastAggregateByMerchant } from '@/hooks/useDataCache'
import { formatCurrency } from '@/utils/dataAggregation'

export default function MerchantRanking() {
  const mergeMode = useMergeMode()
  const filter = useEffectiveFilter()
  const setFilter = useDashboardStore((s) => s.setFilter)
  const setMergeFilter = useDashboardStore((s) => s.setMergeFilter)

  const effectiveSetFilter = mergeMode ? setMergeFilter : setFilter

  const { cacheNoMerchantNoSearch } = useSharedDataCache()
  const { filtered } = cacheNoMerchantNoSearch

  const topMerchants = useMemo(() => {
    return fastAggregateByMerchant(filtered, filter.selectedType, 10)
  }, [filtered, filter.selectedType])

  const maxAmount = useMemo(() => Math.max(...topMerchants.map((m) => Math.abs(m.amount)), 0), [topMerchants])

  if (topMerchants.length === 0) return null

  const handleClick = (merchant: string) => {
    const next = filter.selectedMerchant === merchant ? null : merchant
    effectiveSetFilter({ selectedMerchant: next })
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-slate-700/50 px-5 py-4">
        <div className="rounded-lg bg-violet-500/15 p-2">
          <Store className="h-4 w-4 text-violet-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-300">商户排行</h3>
        <span className="text-xs text-slate-500">Top {topMerchants.length}</span>
      </div>
      <div className="px-5 py-3">
        <div className="flex flex-col gap-1">
          {topMerchants.map((m) => {
            const pct = maxAmount > 0 ? (Math.abs(m.amount) / maxAmount) * 100 : 0
            const isActive = filter.selectedMerchant === m.merchant
            const isNetIncome = filter.selectedType === 'net' && m.amount < 0
            return (
              <button
                key={m.merchant}
                onClick={() => handleClick(m.merchant)}
                className={`group flex items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-violet-500/10 ring-1 ring-violet-500/30' : 'hover:bg-slate-700/30'}`}
              >
                <div className="relative h-8 w-full min-w-0 flex-1">
                  <div className="absolute inset-0 flex items-center">
                    <div
                      className={`h-full rounded-md transition-all ${isActive ? 'bg-violet-500/25' : 'bg-slate-600/30 group-hover:bg-slate-600/40'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="relative flex items-center justify-between">
                    <span className={`truncate text-xs font-medium ${isActive ? 'text-violet-300' : 'text-slate-300'}`}>
                      {m.merchant}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className={`font-mono text-xs font-medium ${isActive ? 'text-violet-300' : 'text-slate-200'}`}>
                      {isNetIncome ? '+' : ''}¥{formatCurrency(Math.abs(m.amount))}
                      {isNetIncome ? ' (净收入)' : ''}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {m.count}笔 · 均¥{formatCurrency(Math.abs(m.avg))}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
