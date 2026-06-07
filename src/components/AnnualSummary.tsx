import { useMemo } from 'react'
import { Coins, Calendar, Tag, Store, TrendingUp } from 'lucide-react'
import { useEffectiveFilter } from '@/store/useDashboardStore'
import { useSharedDataCache } from '@/hooks/useSharedDataCache'
import { fastAggregateByMerchant } from '@/hooks/useDataCache'
import { formatCurrency } from '@/utils/dataAggregation'
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
  const filter = useEffectiveFilter()

  const { cache } = useSharedDataCache()
  const { filtered, totalAmount, monthlyData, categoryData } = cache

  const typeLabel = TRANSACTION_TYPE_FILTER_LABELS[filter.selectedType]

  const stats = useMemo(() => {
    if (filtered.length === 0) {
      return {
        topMonth: '-',
        topMonthAmount: 0,
        topCategory: '-',
        topCategoryAmount: 0,
        topMerchantName: '-',
        topMerchantCount: 0,
        dailyAvg: 0,
      }
    }

    const topMonthItem = monthlyData.length > 0
      ? monthlyData.reduce((a, b) => (Math.abs(b.amount) > Math.abs(a.amount) ? b : a), monthlyData[0])
      : { month: '-', amount: 0 }

    const topCategoryItem = categoryData.length > 0 ? categoryData[0] : { category: '-', amount: 0, count: 0 }

    const topMerchants = fastAggregateByMerchant(filtered, filter.selectedType, 1)
    const topMerchant = topMerchants[0]

    const merchantMap = new Map<string, number>()
    for (let i = 0; i < filtered.length; i++) {
      const t = filtered[i]
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

    let minDate = filtered[0].date
    let maxDate = filtered[0].date
    for (let i = 1; i < filtered.length; i++) {
      const d = filtered[i].date
      if (d < minDate) minDate = d
      if (d > maxDate) maxDate = d
    }
    const firstDate = new Date(minDate)
    const lastDate = new Date(maxDate)
    const daySpan = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86400000) + 1)
    const dailyAvg = totalAmount / daySpan

    return {
      topMonth: topMonthItem.month,
      topMonthAmount: topMonthItem.amount,
      topCategory: topCategoryItem.category,
      topCategoryAmount: topCategoryItem.amount,
      topMerchantName: topMerchant?.merchant ?? topMerchantName,
      topMerchantCount: topMerchant?.count ?? topMerchantCount,
      dailyAvg,
    }
  }, [filtered, filter.selectedType, monthlyData, categoryData, totalAmount])

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-slate-300">年度摘要</h3>
      <div className="grid grid-cols-5 gap-4">
        <SummaryItem
          icon={Coins}
          label={`年度总${typeLabel}`}
          value={`¥${formatCurrency(Math.abs(totalAmount))}${filter.selectedType === 'net' && totalAmount < 0 ? ' (净收入)' : ''}`}
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
