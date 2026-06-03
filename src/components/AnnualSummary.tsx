import { useMemo } from 'react'
import { Coins, Calendar, Tag, Store, TrendingUp } from 'lucide-react'
import { useTransactions, useFilter } from '@/store/useDashboardStore'
import { aggregateByMonth, aggregateByCategory, formatCurrency, applyFilter } from '@/utils/dataAggregation'
import { TRANSACTION_TYPE_FILTER_LABELS } from '@/types'

function SummaryItem({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm transition-all hover:border-slate-600/50 hover:bg-slate-800/80">
      <div className={`rounded-xl p-3 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
        <p className="mt-0.5 font-mono text-xl font-semibold text-slate-100 truncate">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export default function AnnualSummary() {
  const transactions = useTransactions()
  const filter = useFilter()

  const filtered = useMemo(() => applyFilter(transactions, filter), [transactions, filter])
  const typeLabel = TRANSACTION_TYPE_FILTER_LABELS[filter.selectedType]

  const stats = useMemo(() => {
    if (filtered.length === 0) {
      return {
        totalAmount: 0,
        topMonth: '-',
        topMonthAmount: 0,
        topCategory: '-',
        topCategoryAmount: 0,
        topMerchant: '-',
        topMerchantCount: 0,
        dailyAvg: 0,
      }
    }

    const totalAmount = filtered.reduce((s, t) => {
      if (filter.selectedType === 'net') {
        if (t.type === 'income' || t.type === 'refund') return s - t.amount
        return s + t.amount
      }
      return s + t.amount
    }, 0)

    const monthly = aggregateByMonth(filtered, filter.selectedType)
    const topMonthItem = monthly.reduce((a, b) => (Math.abs(b.amount) > Math.abs(a.amount) ? b : a), monthly[0])

    const category = aggregateByCategory(filtered, filter.selectedType)
    const topCategoryItem = category[0]

    const merchantMap = new Map<string, number>()
    for (const t of filtered) {
      merchantMap.set(t.merchant, (merchantMap.get(t.merchant) ?? 0) + 1)
    }
    let topMerchantName = '-'
    let topMerchantCount = 0
    for (const [name, count] of merchantMap) {
      if (count > topMerchantCount) {
        topMerchantName = name
        topMerchantCount = count
      }
    }

    const dates = filtered.map((t) => t.date).sort()
    const firstDate = new Date(dates[0])
    const lastDate = new Date(dates[dates.length - 1])
    const daySpan = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86400000) + 1)
    const dailyAvg = totalAmount / daySpan

    return {
      totalAmount,
      topMonth: topMonthItem.month,
      topMonthAmount: topMonthItem.amount,
      topCategory: topCategoryItem.category,
      topCategoryAmount: topCategoryItem.amount,
      topMerchantName,
      topMerchantCount,
      dailyAvg,
    }
  }, [filtered, filter.selectedType])

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-slate-300">年度摘要</h3>
      <div className="grid grid-cols-5 gap-4">
        <SummaryItem
          icon={Coins}
          label={`年度总${typeLabel}`}
          value={`¥${formatCurrency(Math.abs(stats.totalAmount))}${filter.selectedType === 'net' && stats.totalAmount < 0 ? ' (净收入)' : ''}`}
          accent="bg-emerald-500/15 text-emerald-400"
        />
        <SummaryItem
          icon={Calendar}
          label={`最高${typeLabel}月份`}
          value={stats.topMonth}
          sub={Math.abs(stats.topMonthAmount) > 0 ? `¥${formatCurrency(Math.abs(stats.topMonthAmount))}` : undefined}
          accent="bg-blue-500/15 text-blue-400"
        />
        <SummaryItem
          icon={Tag}
          label={`最高${typeLabel}分类`}
          value={stats.topCategory}
          sub={Math.abs(stats.topCategoryAmount) > 0 ? `¥${formatCurrency(Math.abs(stats.topCategoryAmount))}` : undefined}
          accent="bg-amber-500/15 text-amber-400"
        />
        <SummaryItem
          icon={Store}
          label="最频繁商户"
          value={stats.topMerchantName}
          sub={stats.topMerchantCount > 0 ? `${stats.topMerchantCount} 次` : undefined}
          accent="bg-pink-500/15 text-pink-400"
        />
        <SummaryItem
          icon={TrendingUp}
          label={`日均${typeLabel}`}
          value={`¥${formatCurrency(Math.abs(stats.dailyAvg))}`}
          accent="bg-cyan-500/15 text-cyan-400"
        />
      </div>
    </div>
  )
}
