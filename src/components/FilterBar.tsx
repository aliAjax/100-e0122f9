import { X, Filter } from 'lucide-react'
import { useDashboardStore, useFilter } from '@/store/useDashboardStore'
import { getCategoryColor, TRANSACTION_TYPE_FILTER_LABELS, TRANSACTION_TYPE_COLORS } from '@/types'

export default function FilterBar() {
  const filter = useFilter()
  const setFilter = useDashboardStore((s) => s.setFilter)
  const clearFilter = useDashboardStore((s) => s.clearFilter)

  const hasFilter =
    filter.selectedCategory ||
    filter.selectedMonth ||
    filter.selectedDate ||
    filter.selectedMerchant ||
    filter.selectedType !== 'expense' ||
    filter.searchText ||
    filter.amountMin !== null ||
    filter.amountMax !== null
  if (!hasFilter) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
      <Filter className="h-4 w-4 text-emerald-400" />
      <span className="text-xs text-slate-400">当前筛选：</span>
      <div className="flex flex-wrap items-center gap-2">
        {filter.selectedType !== 'expense' && (
          <button
            onClick={() => setFilter({ selectedType: 'expense' })}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors hover:opacity-80"
            style={{
              backgroundColor: `${TRANSACTION_TYPE_COLORS[filter.selectedType === 'net' ? 'expense' : filter.selectedType]}20`,
              color: TRANSACTION_TYPE_COLORS[filter.selectedType === 'net' ? 'expense' : filter.selectedType],
            }}
          >
            {TRANSACTION_TYPE_FILTER_LABELS[filter.selectedType]}
            <X className="h-3 w-3" />
          </button>
        )}
        {filter.selectedCategory && (
          <button
            onClick={() => setFilter({ selectedCategory: null })}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: `${getCategoryColor(filter.selectedCategory, 0)}20`, color: getCategoryColor(filter.selectedCategory, 0) }}
          >
            {filter.selectedCategory}
            <X className="h-3 w-3" />
          </button>
        )}
        {filter.selectedMonth && (
          <button
            onClick={() => setFilter({ selectedMonth: null, selectedDate: null })}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2.5 py-1 text-xs text-blue-400 transition-colors hover:opacity-80"
          >
            {filter.selectedMonth}
            <X className="h-3 w-3" />
          </button>
        )}
        {filter.selectedDate && (
          <button
            onClick={() => setFilter({ selectedDate: null })}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1 text-xs text-amber-400 transition-colors hover:opacity-80"
          >
            {filter.selectedDate}
            <X className="h-3 w-3" />
          </button>
        )}
        {filter.selectedMerchant && (
          <button
            onClick={() => setFilter({ selectedMerchant: null })}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 px-2.5 py-1 text-xs text-violet-400 transition-colors hover:opacity-80"
          >
            {filter.selectedMerchant}
            <X className="h-3 w-3" />
          </button>
        )}
        {filter.searchText && (
          <button
            onClick={() => setFilter({ searchText: '' })}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/15 px-2.5 py-1 text-xs text-cyan-400 transition-colors hover:opacity-80"
          >
            搜索：{filter.searchText}
            <X className="h-3 w-3" />
          </button>
        )}
        {(filter.amountMin !== null || filter.amountMax !== null) && (
          <button
            onClick={() => setFilter({ amountMin: null, amountMax: null })}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1 text-xs text-amber-400 transition-colors hover:opacity-80"
          >
            金额：¥{filter.amountMin ?? 0} ~ ¥{filter.amountMax ?? '∞'}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <button
        onClick={clearFilter}
        className="ml-auto text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        清除全部
      </button>
    </div>
  )
}
