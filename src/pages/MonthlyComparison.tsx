import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, GitCompare, TrendingUp, TrendingDown, BarChart3, CalendarDays, ArrowUpRight, ArrowDownRight, Store, Minus } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { aggregateByCategory, aggregateByDay, formatCurrency } from '@/utils/dataAggregation'
import { TRANSACTION_TYPE_COLORS } from '@/types'
import type { Transaction } from '@/types'

interface CategoryChange {
  category: string
  month1Amount: number
  month2Amount: number
  change: number
  changePercent: number
}

interface MerchantChange {
  merchant: string
  month1Amount: number
  month2Amount: number
  change: number
  changePercent: number
}

function getMonthTransactions(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(month) && t.type === 'expense')
}

function aggregateByMerchant(transactions: Transaction[]): Array<{ merchant: string; amount: number; count: number }> {
  const map = new Map<string, { amount: number; count: number }>()
  for (const t of transactions) {
    if (!t.merchant) continue
    const existing = map.get(t.merchant) ?? { amount: 0, count: 0 }
    existing.amount += t.amount
    existing.count += 1
    map.set(t.merchant, existing)
  }
  return Array.from(map.entries())
    .map(([merchant, { amount, count }]) => ({
      merchant,
      amount: Math.round(amount * 100) / 100,
      count,
    }))
    .sort((a, b) => b.amount - a.amount)
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType
  title: string
  description: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60">
          <Icon className="h-8 w-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-200">{title}</h2>
        <div className="mt-2 text-sm text-slate-500">{description}</div>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  )
}

function PageHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-[#0a0f1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/40 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回首页
          </Link>
          <div className="h-5 w-px bg-slate-700/50" />
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/15 p-2">
              <GitCompare className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">月度对比分析</h1>
              <p className="text-[11px] text-slate-500">选择两个月份进行消费对比</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function MonthlyComparison() {
  const bills = useDashboardStore((s) => s.bills)
  const currentBillId = useDashboardStore((s) => s.currentBillId)

  const currentBill = useMemo(() => 
    bills.find((b) => b.id === currentBillId),
    [bills, currentBillId]
  )

  const transactions = useMemo(() => 
    currentBill?.transactions ?? [],
    [currentBill]
  )

  const dataLoaded = transactions.length > 0

  const availableMonths = useMemo(() => {
    const months = new Set(
      transactions
        .filter((t) => t.type === 'expense')
        .map((t) => t.date.slice(0, 7))
    )
    return Array.from(months).sort().reverse()
  }, [transactions])

  const hasEnoughMonths = availableMonths.length >= 2

  const [month1, setMonth1] = useState<string>(hasEnoughMonths ? availableMonths[0] : '')
  const [month2, setMonth2] = useState<string>(hasEnoughMonths ? availableMonths[1] : '')

  const month1Transactions = useMemo(() => 
    dataLoaded && hasEnoughMonths ? getMonthTransactions(transactions, month1) : [],
    [dataLoaded, hasEnoughMonths, transactions, month1]
  )
  const month2Transactions = useMemo(() => 
    dataLoaded && hasEnoughMonths ? getMonthTransactions(transactions, month2) : [],
    [dataLoaded, hasEnoughMonths, transactions, month2]
  )

  const month1Total = useMemo(() => 
    month1Transactions.reduce((s, t) => s + t.amount, 0),
    [month1Transactions]
  )
  const month2Total = useMemo(() => 
    month2Transactions.reduce((s, t) => s + t.amount, 0),
    [month2Transactions]
  )
  const totalChange = month2Total - month1Total
  const totalChangePercent = month1Total > 0 ? (totalChange / month1Total) * 100 : 0

  const month1Categories = useMemo(() => 
    aggregateByCategory(month1Transactions, 'expense'),
    [month1Transactions]
  )
  const month2Categories = useMemo(() => 
    aggregateByCategory(month2Transactions, 'expense'),
    [month2Transactions]
  )

  const categoryChanges = useMemo((): CategoryChange[] => {
    const map = new Map<string, CategoryChange>()
    for (const c of month1Categories) {
      map.set(c.category, {
        category: c.category,
        month1Amount: c.amount,
        month2Amount: 0,
        change: -c.amount,
        changePercent: -100,
      })
    }
    for (const c of month2Categories) {
      const existing = map.get(c.category)
      if (existing) {
        existing.month2Amount = c.amount
        existing.change = c.amount - existing.month1Amount
        existing.changePercent = existing.month1Amount > 0
          ? ((existing.change / existing.month1Amount) * 100)
          : 100
      } else {
        map.set(c.category, {
          category: c.category,
          month1Amount: 0,
          month2Amount: c.amount,
          change: c.amount,
          changePercent: 100,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  }, [month1Categories, month2Categories])

  const topIncreased = categoryChanges.find((c) => c.change > 0) || null
  const topDecreased = categoryChanges.find((c) => c.change < 0) || null

  const month1Merchants = useMemo(() => 
    aggregateByMerchant(month1Transactions),
    [month1Transactions]
  )
  const month2Merchants = useMemo(() => 
    aggregateByMerchant(month2Transactions),
    [month2Transactions]
  )

  const merchantChanges = useMemo((): MerchantChange[] => {
    const map = new Map<string, MerchantChange>()
    for (const m of month1Merchants) {
      map.set(m.merchant, {
        merchant: m.merchant,
        month1Amount: m.amount,
        month2Amount: 0,
        change: -m.amount,
        changePercent: -100,
      })
    }
    for (const m of month2Merchants) {
      const existing = map.get(m.merchant)
      if (existing) {
        existing.month2Amount = m.amount
        existing.change = m.amount - existing.month1Amount
        existing.changePercent = existing.month1Amount > 0
          ? ((existing.change / existing.month1Amount) * 100)
          : 100
      } else {
        map.set(m.merchant, {
          merchant: m.merchant,
          month1Amount: 0,
          month2Amount: m.amount,
          change: m.amount,
          changePercent: 100,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10)
  }, [month1Merchants, month2Merchants])

  const month1Daily = useMemo(() => 
    aggregateByDay(month1Transactions, 'expense'),
    [month1Transactions]
  )
  const month2Daily = useMemo(() => 
    aggregateByDay(month2Transactions, 'expense'),
    [month2Transactions]
  )

  const dailyChartOption = useMemo(() => {
    const allDays = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

    const data1 = allDays.map((day) => {
      const found = month1Daily.find((d) => d.date.slice(8) === day)
      return found ? found.amount : 0
    })
    const data2 = allDays.map((day) => {
      const found = month2Daily.find((d) => d.date.slice(8) === day)
      return found ? found.amount : 0
    })

    return {
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 13 },
        formatter: (params: Array<{ name: string; value: number; seriesName: string }>) => {
          let result = `<b>${params[0]?.name || ''}日</b>`
          params.forEach((p) => {
            if (p.value > 0) {
              result += `<br/>${p.seriesName}：¥${p.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
            }
          })
          return result
        },
      },
      legend: {
        data: [month1, month2],
        top: 0,
        right: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { top: 40, right: 20, bottom: 30, left: 60 },
      xAxis: {
        type: 'category' as const,
        data: allDays,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' as const } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: (v: number) => {
            if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
            return String(v)
          },
        },
      },
      series: [
        {
          name: month1,
          type: 'line' as const,
          data: data1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: TRANSACTION_TYPE_COLORS.expense, width: 2 },
          itemStyle: { color: TRANSACTION_TYPE_COLORS.expense },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${TRANSACTION_TYPE_COLORS.expense}33` },
                { offset: 1, color: `${TRANSACTION_TYPE_COLORS.expense}05` },
              ],
            },
          },
        },
        {
          name: month2,
          type: 'line' as const,
          data: data2,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: '#3B82F6', width: 2 },
          itemStyle: { color: '#3B82F6' },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#3B82F633' },
                { offset: 1, color: '#3B82F605' },
              ],
            },
          },
        },
      ],
    }
  }, [month1, month2, month1Daily, month2Daily])

  const categoryChartOption = useMemo(() => {
    const categories = categoryChanges.slice(0, 8)
    return {
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 13 },
        formatter: (params: Array<{ name: string; value: number; seriesName: string }>) => {
          let result = `<b>${params[0]?.name || ''}</b>`
          params.forEach((p) => {
            result += `<br/>${p.seriesName}：¥${Math.abs(p.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
          })
          return result
        },
      },
      legend: {
        data: [month1, month2],
        top: 0,
        right: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { top: 40, right: 20, bottom: 30, left: 60 },
      xAxis: {
        type: 'category' as const,
        data: categories.map((c) => c.category),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' as const } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: (v: number) => {
            if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
            return String(v)
          },
        },
      },
      series: [
        {
          name: month1,
          type: 'bar' as const,
          data: categories.map((c) => c.month1Amount),
          itemStyle: {
            color: TRANSACTION_TYPE_COLORS.expense,
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '30%',
        },
        {
          name: month2,
          type: 'bar' as const,
          data: categories.map((c) => c.month2Amount),
          itemStyle: {
            color: '#3B82F6',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '30%',
        },
      ],
    }
  }, [month1, month2, categoryChanges])

  const hasData = month1 && month2 && month1Transactions.length > 0 && month2Transactions.length > 0

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0f1a]">
        <PageHeader />
        <main className="mx-auto max-w-[1400px] px-6 py-6">
          <EmptyState
            icon={BarChart3}
            title="暂无账单数据"
            description="请先导入消费账单后再使用月度对比功能"
            action={
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2 text-sm text-emerald-400 transition-colors hover:bg-emerald-500/25"
              >
                <ArrowLeft className="h-4 w-4" />
                去导入账单
              </Link>
            }
          />
        </main>
      </div>
    )
  }

  if (!hasEnoughMonths) {
    return (
      <div className="min-h-screen bg-[#0a0f1a]">
        <PageHeader />
        <main className="mx-auto max-w-[1400px] px-6 py-6">
          <EmptyState
            icon={CalendarDays}
            title="月份数据不足"
            description={
              <>
                <p>当前仅有 {availableMonths.length} 个月的数据，至少需要 2 个月才能进行对比分析</p>
                <p className="mt-1 text-xs text-slate-600">
                  {availableMonths.length > 0
                    ? `已有月份：${availableMonths.join('、')}`
                    : '请导入更多月份的账单数据'}
                </p>
              </>
            }
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <PageHeader />

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400">对比月份</label>
              <select
                value={month1}
                onChange={(e) => setMonth1(e.target.value)}
                className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 text-sm text-slate-200 transition-colors focus:border-cyan-500/50 focus:outline-none"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} disabled={m === month2}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <GitCompare className="h-5 w-5 text-slate-500" />
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400">与</label>
              <select
                value={month2}
                onChange={(e) => setMonth2(e.target.value)}
                className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 text-sm text-slate-200 transition-colors focus:border-cyan-500/50 focus:outline-none"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} disabled={m === month1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!hasData ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/60 p-12 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60">
                  <Minus className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400">所选月份暂无支出数据</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{month1} 总支出</p>
                      <p className="mt-1 font-mono text-2xl font-semibold text-slate-100">
                        ¥{formatCurrency(month1Total)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/15 p-3">
                      <BarChart3 className="h-5 w-5 text-emerald-400" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">共 {month1Transactions.length} 笔支出</p>
                </div>

                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{month2} 总支出</p>
                      <p className="mt-1 font-mono text-2xl font-semibold text-slate-100">
                        ¥{formatCurrency(month2Total)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-500/15 p-3">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">共 {month2Transactions.length} 笔支出</p>
                </div>

                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">变化金额</p>
                      <p className={`mt-1 font-mono text-2xl font-semibold ${totalChange >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {totalChange >= 0 ? '+' : ''}¥{formatCurrency(Math.abs(totalChange))}
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 ${totalChange >= 0 ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
                      {totalChange >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-red-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-emerald-400" />
                      )}
                    </div>
                  </div>
                  <p className={`mt-2 text-xs ${totalChange >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {totalChange >= 0 ? '↑' : '↓'} {Math.abs(totalChangePercent).toFixed(1)}%
                  </p>
                </div>
              </div>

              {(topIncreased || topDecreased) && (
                <div className="grid grid-cols-2 gap-4">
                  {topIncreased && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                        <ArrowUpRight className="h-4 w-4" />
                        增长最多
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-100">{topIncreased.category}</p>
                          <p className="mt-1 font-mono text-sm text-slate-400">
                            ¥{formatCurrency(topIncreased.month1Amount)} → ¥{formatCurrency(topIncreased.month2Amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xl font-semibold text-red-400">
                            +¥{formatCurrency(topIncreased.change)}
                          </p>
                          <p className="text-xs text-red-400">
                            ↑ {topIncreased.changePercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {topDecreased && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                        <ArrowDownRight className="h-4 w-4" />
                        下降最多
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-100">{topDecreased.category}</p>
                          <p className="mt-1 font-mono text-sm text-slate-400">
                            ¥{formatCurrency(topDecreased.month1Amount)} → ¥{formatCurrency(topDecreased.month2Amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xl font-semibold text-emerald-400">
                            -¥{formatCurrency(Math.abs(topDecreased.change))}
                          </p>
                          <p className="text-xs text-emerald-400">
                            ↓ {Math.abs(topDecreased.changePercent).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                <h3 className="mb-4 text-sm font-medium text-slate-300">分类消费对比</h3>
                <ReactECharts option={categoryChartOption} style={{ height: 320 }} />
              </div>

              <div className="grid grid-cols-5 gap-6">
                <div className="col-span-3 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                  <h3 className="mb-4 text-sm font-medium text-slate-300">每日消费走势对比</h3>
                  <ReactECharts option={dailyChartOption} style={{ height: 320 }} />
                </div>

                <div className="col-span-2 rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm">
                  <div className="flex items-center gap-3 border-b border-slate-700/50 px-5 py-4">
                    <div className="rounded-lg bg-violet-500/15 p-2">
                      <Store className="h-4 w-4 text-violet-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-300">商户消费变化</h3>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto px-5 py-3">
                    <div className="flex flex-col gap-1">
                      {merchantChanges.map((m, index) => {
                        const isIncrease = m.change > 0
                        const color = isIncrease ? 'text-red-400' : 'text-emerald-400'
                        return (
                          <div
                            key={m.merchant}
                            className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-slate-700/30"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-700/50 text-[10px] font-medium text-slate-400">
                                {index + 1}
                              </span>
                              <span className="truncate text-xs font-medium text-slate-300">{m.merchant}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-xs font-medium text-slate-200">
                                ¥{formatCurrency(Math.abs(m.month2Amount))}
                              </p>
                              <p className={`flex items-center justify-end gap-1 text-[10px] ${color}`}>
                                {isIncrease ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {isIncrease ? '+' : ''}
                                {formatCurrency(Math.abs(m.change))}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
