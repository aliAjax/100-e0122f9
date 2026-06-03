import { useDashboardStore, useFilter } from '@/store/useDashboardStore'
import { TRANSACTION_TYPE_FILTER_LABELS, TRANSACTION_TYPE_COLORS } from '@/types'
import type { TransactionTypeFilter } from '@/types'

const TYPES: TransactionTypeFilter[] = ['expense', 'income', 'refund', 'net']

export default function TransactionTypeToggle() {
  const filter = useFilter()
  const setFilter = useDashboardStore((s) => s.setFilter)

  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-800/60 p-1 backdrop-blur-sm">
      {TYPES.map((type) => {
        const isActive = filter.selectedType === type
        const color = TRANSACTION_TYPE_COLORS[type === 'net' ? 'expense' : type]
        return (
          <button
            key={type}
            onClick={() => setFilter({ selectedType: type })}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? 'bg-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            style={{
              color: isActive ? color : undefined,
            }}
          >
            {TRANSACTION_TYPE_FILTER_LABELS[type]}
          </button>
        )
      })}
    </div>
  )
}
