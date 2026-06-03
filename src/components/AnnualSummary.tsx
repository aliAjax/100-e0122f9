import { useMemo } from 'react'
import { Coins, Calendar, Tag, Store, TrendingUp } from 'lucide-react'
import { useTransactions } from '@/store/useDashboardStore'
import { aggregateByMonth, aggregateByCategory, formatCurrency } from '@/utils/dataAggregation'

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

  const stats = useMemo(() => {
    if (transactions.length === 0) {
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

    const totalAmount = transactions.reduce((s, t) => s + t.amount, 0)

    const monthly = aggregateByMonth(transactions)
    const topMonthItem = monthly.reduce((a, b) => (b.amount > a.amount ? b : a), monthly[0])

    const category = aggregateByCategory(transactions)
    const topCategoryItem = category[0]

    const merchantMap = new Map<string, number>()
    for (const t of transactions) {
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

    const dates = transactions.map((t) => t.date).sort()
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
  }, [transactions])

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-slate-300">年度摘要</h3>
      <div className="grid grid-cols-5 gap-4">
        <SummaryItem
          icon={Coins}
          label="年度总支出"
          value={`¥${formatCurrency(stats.totalAmount)}`}
          accent="bg-emerald-500/15 text-emerald-400"
        />
        <SummaryItem
          icon={Calendar}
          label="最高消费月份"
          value={stats.topMonth}
          sub={stats.topMonthAmount > 0 ? `¥${formatCurrency(stats.topMonthAmount)}` : undefined}
          accent="bg-blue-500/15 text-blue-400"
        />
        <SummaryItem
          icon={Tag}
          label="最高消费分类"
          value={stats.topCategory}
          sub={stats.topCategoryAmount > 0 ? `¥${formatCurrency(stats.topCategoryAmount)}` : undefined}
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
          label="日均支出"
          value={`¥${formatCurrency(stats.dailyAvg)}`}
          accent="bg-cyan-500/15 text-cyan-400"
        />
      </div>
    </div>
  )
}
