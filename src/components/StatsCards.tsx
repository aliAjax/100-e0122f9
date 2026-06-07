import { useMemo } from 'react'
import { Wallet, TrendingUp, ArrowUpRight, CalendarDays, TrendingDown, ArrowDownRight } from 'lucide-react'
import { useEffectiveTransactions, useEffectiveFilter } from '@/store/useDashboardStore'
import { useDataCache, getTypeAmount } from '@/hooks/useDataCache'
import { formatCurrency } from '@/utils/dataAggregation'
import { TRANSACTION_TYPE_FILTER_LABELS, TRANSACTION_TYPE_COLORS } from '@/types'

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm transition-all hover:border-slate-600/50 hover:bg-slate-800/80">
      <div className={`rounded-xl p-3 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
        <p className="mt-0.5 font-mono text-xl font-semibold text-slate-100">{value}</p>
      </div>
    </div>
  )
}

export default function StatsCards() {
  const transactions = useEffectiveTransactions()
  const filter = useEffectiveFilter()

  const { filtered, totalAmount } = useDataCache(transactions, filter)

  const stats = useMemo(() => {
    const months = new Set<string>()
    const dates = new Set<string>()
    let maxSingle = 0

    for (let i = 0; i < filtered.length; i++) {
      const t = filtered[i]
      months.add(t.date.slice(0, 7))
      dates.add(t.date)
      if (t.amount > maxSingle) maxSingle = t.amount
    }

    const monthAvg = months.size > 0 ? totalAmount / months.size : 0

    return {
      monthAvg,
      maxSingle,
      spendingDays: dates.size,
    }
  }, [filtered, totalAmount])

  const typeLabel = TRANSACTION_TYPE_FILTER_LABELS[filter.selectedType]
  const isIncome = filter.selectedType === 'income'
  const isNet = filter.selectedType === 'net'

  const accentColor = TRANSACTION_TYPE_COLORS[filter.selectedType === 'net' ? 'expense' : filter.selectedType]
  const totalAccent = `bg-[${accentColor}]/15 text-[${accentColor}]`

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        icon={isIncome ? TrendingDown : Wallet}
        label={`总${typeLabel}`}
        value={`¥${formatCurrency(Math.abs(totalAmount))}${isNet && totalAmount < 0 ? ' (净收入)' : ''}`}
        accent={totalAccent}
      />
      <StatCard
        icon={TrendingUp}
        label={`月均${typeLabel}`}
        value={`¥${formatCurrency(Math.abs(stats.monthAvg))}`}
        accent="bg-blue-500/15 text-blue-400"
      />
      <StatCard
        icon={isIncome ? ArrowDownRight : ArrowUpRight}
        label="最大单笔"
        value={`¥${formatCurrency(stats.maxSingle)}`}
        accent="bg-amber-500/15 text-amber-400"
      />
      <StatCard
        icon={CalendarDays}
        label={`${typeLabel}天数`}
        value={`${stats.spendingDays} 天`}
        accent="bg-purple-500/15 text-purple-400"
      />
    </div>
  )
}
