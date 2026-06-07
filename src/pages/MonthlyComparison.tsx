import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, GitCompare, TrendingUp, TrendingDown, BarChart3, CalendarDays, ArrowUpRight, ArrowDownRight, Store, Minus, FileText } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { getTypeAmount } from '@/hooks/useDataCache'
import { formatCurrency } from '@/utils/dataAggregation'
import { TRANSACTION_TYPE_COLORS, TRANSACTION_TYPE_FILTER_LABELS } from '@/types'
import type { Transaction, TransactionTypeFilter, Bill, CategoryData, DailyData } from '@/types'

const TYPE_FILTER_OPTIONS: TransactionTypeFilter[] = ['expense', 'income', 'refund', 'net']

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

interface MerchantStat {
  merchant: string
  amount: number
  count: number
  avg: number
}

interface MonthSnapshot {
  total: number
  count: number
  categories: CategoryData[]
  merchants: MerchantStat[]
  daily: DailyData[]
}

function createEmptyMonthSnapshot(): MonthSnapshot {
  return {
    total: 0,
    count: 0,
    categories: [],
    merchants: [],
    daily: [],
  }
}

function aggregateMonthSnapshot(transactions: Transaction[], month: string, typeFilter: TransactionTypeFilter): MonthSnapshot {
  const categoryMap = new Map<string, { amount: number; count: number }>()
  const merchantMap = new Map<string, { amount: number; count: number }>()
  const dailyMap = new Map<string, number>()
  let total = 0
  let count = 0

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    if (!t.date.startsWith(month)) continue
    const amount = getTypeAmount(t, typeFilter)
    if (amount === 0 && typeFilter !== 'net') continue

    total += amount
    count += 1
    dailyMap.set(t.date, (dailyMap.get(t.date) ?? 0) + amount)

    const category = categoryMap.get(t.category) ?? { amount: 0, count: 0 }
    category.amount += amount
    category.count += 1
    categoryMap.set(t.category, category)

    if (t.merchant) {
      const merchant = merchantMap.get(t.merchant) ?? { amount: 0, count: 0 }
      merchant.amount += amount
      merchant.count += 1
      merchantMap.set(t.merchant, merchant)
    }
  }

  const categories = Array.from(categoryMap.entries())
    .map(([category, { amount, count: categoryCount }]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      count: categoryCount,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

  const merchants = Array.from(merchantMap.entries())
    .map(([merchant, { amount, count: merchantCount }]) => ({
      merchant,
      amount: Math.round(amount * 100) / 100,
      count: merchantCount,
      avg: Math.round((amount / merchantCount) * 100) / 100,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

  const daily = Array.from(dailyMap.entries())
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    total: Math.round(total * 100) / 100,
    count,
    categories,
    merchants,
    daily,
  }
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
              <p className="text-[11px] text-slate-500">选择账单、月份与口径进行灵活对比</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function BillSelect({ bills, value, onChange, label }: {
  bills: Bill[]
  value: string
  onChange: (id: string) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="shrink-0 text-xs text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[160px] truncate rounded-lg border border-slate-700/50 bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-200 transition-colors focus:border-cyan-500/50 focus:outline-none"
      >
        {bills.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  )
}

function MonthSelect({ months, value, onChange, label }: {
  months: string[]
  value: string
  onChange: (m: string) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="shrink-0 text-xs text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-200 transition-colors focus:border-cyan-500/50 focus:outline-none"
      >
        {months.length === 0 ? (
          <option value="">无数据</option>
        ) : (
          months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))
        )}
      </select>
    </div>
  )
}

export default function MonthlyComparison() {
  const bills = useDashboardStore((s) => s.bills)

  const [billId1, setBillId1] = useState<string>(() => bills[0]?.id ?? '')
  const [billId2, setBillId2] = useState<string>(() => bills.length > 1 ? bills[1].id : (bills[0]?.id ?? ''))
  const [month1, setMonth1] = useState('')
  const [month2, setMonth2] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('expense')

  const bill1 = useMemo(() => bills.find((b) => b.id === billId1), [bills, billId1])
  const bill2 = useMemo(() => bills.find((b) => b.id === billId2), [bills, billId2])

  const transactions1 = useMemo(() => bill1?.transactions ?? [], [bill1])
  const transactions2 = useMemo(() => bill2?.transactions ?? [], [bill2])

  const dataLoaded = transactions1.length > 0 || transactions2.length > 0

  const availableMonths1 = useMemo(() => {
    const months = new Set<string>()
    for (let i = 0; i < transactions1.length; i++) {
      const t = transactions1[i]
      if (typeFilter !== 'net' && t.type !== typeFilter) continue
      months.add(t.date.slice(0, 7))
    }
    return Array.from(months).sort().reverse()
  }, [transactions1, typeFilter])

  const availableMonths2 = useMemo(() => {
    const months = new Set<string>()
    for (let i = 0; i < transactions2.length; i++) {
      const t = transactions2[i]
      if (typeFilter !== 'net' && t.type !== typeFilter) continue
      months.add(t.date.slice(0, 7))
    }
    return Array.from(months).sort().reverse()
  }, [transactions2, typeFilter])

  const hasEnoughMonths = availableMonths1.length >= 1 && availableMonths2.length >= 1

  const effectiveMonth1 = availableMonths1.includes(month1) ? month1 : (availableMonths1[0] ?? '')
  const effectiveMonth2 = availableMonths2.includes(month2) ? month2 : (availableMonths2[0] ?? '')

  const month1Snapshot = useMemo(() =>
    dataLoaded && effectiveMonth1 ? aggregateMonthSnapshot(transactions1, effectiveMonth1, typeFilter) : createEmptyMonthSnapshot(),
    [dataLoaded, transactions1, effectiveMonth1, typeFilter]
  )
  const month2Snapshot = useMemo(() =>
    dataLoaded && effectiveMonth2 ? aggregateMonthSnapshot(transactions2, effectiveMonth2, typeFilter) : createEmptyMonthSnapshot(),
    [dataLoaded, transactions2, effectiveMonth2, typeFilter]
  )

  const month1Total = month1Snapshot.total
  const month2Total = month2Snapshot.total
  const totalChange = month2Total - month1Total
  const totalChangePercent = Math.abs(month1Total) > 0.01 ? (totalChange / month1Total) * 100 : 0

  const categoryChanges = useMemo((): CategoryChange[] => {
    const map = new Map<string, CategoryChange>()
    for (const c of month1Snapshot.categories) {
      map.set(c.category, {
        category: c.category,
        month1Amount: c.amount,
        month2Amount: 0,
        change: -c.amount,
        changePercent: -100,
      })
    }
    for (const c of month2Snapshot.categories) {
      const existing = map.get(c.category)
      if (existing) {
        existing.month2Amount = c.amount
        existing.change = c.amount - existing.month1Amount
        existing.changePercent = Math.abs(existing.month1Amount) > 0.01
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
  }, [month1Snapshot.categories, month2Snapshot.categories])

  const topIncreased = categoryChanges.find((c) => c.change > 0) || null
  const topDecreased = categoryChanges.find((c) => c.change < 0) || null

  const merchantChanges = useMemo((): MerchantChange[] => {
    const map = new Map<string, MerchantChange>()
    for (const m of month1Snapshot.merchants) {
      map.set(m.merchant, {
        merchant: m.merchant,
        month1Amount: m.amount,
        month2Amount: 0,
        change: -m.amount,
        changePercent: -100,
      })
    }
    for (const m of month2Snapshot.merchants) {
      const existing = map.get(m.merchant)
      if (existing) {
        existing.month2Amount = m.amount
        existing.change = m.amount - existing.month1Amount
        existing.changePercent = Math.abs(existing.month1Amount) > 0.01
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
  }, [month1Snapshot.merchants, month2Snapshot.merchants])

  const chartColor1 = useMemo(() => {
    if (typeFilter === 'net') return '#10B981'
    return TRANSACTION_TYPE_COLORS[typeFilter]
  }, [typeFilter])
  const chartColor2 = '#3B82F6'

  const label1 = useMemo(() => {
    const billName = bill1?.name ?? ''
    return effectiveMonth1 ? `${effectiveMonth1}${bill1 && billId1 !== billId2 ? ` (${billName})` : ''}` : ''
  }, [effectiveMonth1, bill1, billId1, billId2])

  const label2 = useMemo(() => {
    const billName = bill2?.name ?? ''
    return effectiveMonth2 ? `${effectiveMonth2}${bill2 && billId1 !== billId2 ? ` (${billName})` : ''}` : ''
  }, [effectiveMonth2, bill2, billId1, billId2])

  const typeLabel = TRANSACTION_TYPE_FILTER_LABELS[typeFilter]

  const dailyChartOption = useMemo(() => {
    const allDays = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

    const data1 = allDays.map((day) => {
      const found = month1Snapshot.daily.find((d) => d.date.slice(8) === day)
      return found ? found.amount : 0
    })
    const data2 = allDays.map((day) => {
      const found = month2Snapshot.daily.find((d) => d.date.slice(8) === day)
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
            if (p.value !== 0) {
              const sign = p.value > 0 ? '' : '-'
              result += `<br/>${p.seriesName}：${sign}¥${Math.abs(p.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
            }
          })
          return result
        },
      },
      legend: {
        data: [label1, label2],
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
            if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`
            return String(v)
          },
        },
      },
      series: [
        {
          name: label1,
          type: 'line' as const,
          data: data1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: chartColor1, width: 2 },
          itemStyle: { color: chartColor1 },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${chartColor1}33` },
                { offset: 1, color: `${chartColor1}05` },
              ],
            },
          },
        },
        {
          name: label2,
          type: 'line' as const,
          data: data2,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: chartColor2, width: 2 },
          itemStyle: { color: chartColor2 },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${chartColor2}33` },
                { offset: 1, color: `${chartColor2}05` },
              ],
            },
          },
        },
      ],
    }
  }, [label1, label2, month1Snapshot.daily, month2Snapshot.daily, chartColor1, chartColor2])

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
            const sign = p.value >= 0 ? '' : '-'
            result += `<br/>${p.seriesName}：${sign}¥${Math.abs(p.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
          })
          return result
        },
      },
      legend: {
        data: [label1, label2],
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
            if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`
            return String(v)
          },
        },
      },
      series: [
        {
          name: label1,
          type: 'bar' as const,
          data: categories.map((c) => ({
            value: c.month1Amount,
            itemStyle: {
              color: chartColor1,
              borderRadius: c.month1Amount >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
          barWidth: '30%',
        },
        {
          name: label2,
          type: 'bar' as const,
          data: categories.map((c) => ({
            value: c.month2Amount,
            itemStyle: {
              color: chartColor2,
              borderRadius: c.month2Amount >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
          barWidth: '30%',
        },
      ],
    }
  }, [label1, label2, categoryChanges, chartColor1, chartColor2])

  const hasData = effectiveMonth1 && effectiveMonth2 && (month1Snapshot.count > 0 || month2Snapshot.count > 0)

  if (bills.length === 0) {
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

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <PageHeader />

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/15 p-1.5">
                <GitCompare className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-sm font-medium text-slate-300">对比设置</span>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">对比端 A</span>
                </div>
                <div className="flex items-center gap-2">
                  <BillSelect bills={bills} value={billId1} onChange={(id) => { setBillId1(id); setMonth1('') }} label="账单" />
                  <MonthSelect months={availableMonths1} value={effectiveMonth1} onChange={setMonth1} label="月份" />
                </div>
              </div>

              <div className="flex items-center pb-2">
                <GitCompare className="h-5 w-5 text-slate-500" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">对比端 B</span>
                </div>
                <div className="flex items-center gap-2">
                  <BillSelect bills={bills} value={billId2} onChange={(id) => { setBillId2(id); setMonth2('') }} label="账单" />
                  <MonthSelect months={availableMonths2} value={effectiveMonth2} onChange={setMonth2} label="月份" />
                </div>
              </div>

              <div className="ml-auto flex flex-col gap-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">口径</span>
                <div className="flex items-center gap-1 rounded-xl bg-slate-900/60 p-1">
                  {TYPE_FILTER_OPTIONS.map((type) => {
                    const isActive = typeFilter === type
                    const color = TRANSACTION_TYPE_COLORS[type === 'net' ? 'expense' : type]
                    return (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                          isActive
                            ? 'bg-slate-700/80 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                        }`}
                        style={{ color: isActive ? color : undefined }}
                      >
                        {TRANSACTION_TYPE_FILTER_LABELS[type]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {!hasEnoughMonths ? (
            <EmptyState
              icon={CalendarDays}
              title="月份数据不足"
              description={
                <div className="space-y-1">
                  <p>所选账单中至少各需 1 个月的数据才能进行对比</p>
                  <p className="text-xs text-slate-600">
                    A 端 {availableMonths1.length} 个月 · B 端 {availableMonths2.length} 个月
                  </p>
                </div>
              }
            />
          ) : !hasData ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/60 p-12 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60">
                  <Minus className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400">所选月份暂无{typeLabel}数据</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label1} {typeLabel}</p>
                      <p className="mt-1 font-mono text-2xl font-semibold text-slate-100">
                        {month1Total >= 0 ? '' : '-'}¥{formatCurrency(Math.abs(month1Total))}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/15 p-3">
                      <BarChart3 className="h-5 w-5 text-emerald-400" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">共 {month1Snapshot.count} 笔交易</p>
                </div>

                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label2} {typeLabel}</p>
                      <p className="mt-1 font-mono text-2xl font-semibold text-slate-100">
                        {month2Total >= 0 ? '' : '-'}¥{formatCurrency(Math.abs(month2Total))}
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-500/15 p-3">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">共 {month2Snapshot.count} 笔交易</p>
                </div>

                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{typeLabel}变化</p>
                      <p className={`mt-1 font-mono text-2xl font-semibold ${totalChange >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {totalChange >= 0 ? '+' : '-'}¥{formatCurrency(Math.abs(totalChange))}
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
                        {typeLabel}增长最多
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-100">{topIncreased.category}</p>
                          <p className="mt-1 font-mono text-sm text-slate-400">
                            {topIncreased.month1Amount >= 0 ? '' : '-'}¥{formatCurrency(Math.abs(topIncreased.month1Amount))} → {topIncreased.month2Amount >= 0 ? '' : '-'}¥{formatCurrency(Math.abs(topIncreased.month2Amount))}
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
                        {typeLabel}下降最多
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-100">{topDecreased.category}</p>
                          <p className="mt-1 font-mono text-sm text-slate-400">
                            {topDecreased.month1Amount >= 0 ? '' : '-'}¥{formatCurrency(Math.abs(topDecreased.month1Amount))} → {topDecreased.month2Amount >= 0 ? '' : '-'}¥{formatCurrency(Math.abs(topDecreased.month2Amount))}
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
                <h3 className="mb-4 text-sm font-medium text-slate-300">分类{typeLabel}对比</h3>
                <ReactECharts option={categoryChartOption} style={{ height: 320 }} />
              </div>

              <div className="grid grid-cols-5 gap-6">
                <div className="col-span-3 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
                  <h3 className="mb-4 text-sm font-medium text-slate-300">每日{typeLabel}走势对比</h3>
                  <ReactECharts option={dailyChartOption} style={{ height: 320 }} />
                </div>

                <div className="col-span-2 rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm">
                  <div className="flex items-center gap-3 border-b border-slate-700/50 px-5 py-4">
                    <div className="rounded-lg bg-violet-500/15 p-2">
                      <Store className="h-4 w-4 text-violet-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-300">商户{typeLabel}变化</h3>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto px-5 py-3">
                    <div className="flex flex-col gap-1">
                      {merchantChanges.map((m, index) => {
                        const isNeutral = Math.abs(m.change) < 0.005
                        const isIncrease = m.change > 0
                        const color = isNeutral ? 'text-slate-500' : isIncrease ? 'text-red-400' : 'text-emerald-400'
                        const changePrefix = isNeutral ? '' : isIncrease ? '+' : '-'
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
                                {m.month2Amount >= 0 ? '' : '-'}¥{formatCurrency(Math.abs(m.month2Amount))}
                              </p>
                              <p className={`flex items-center justify-end gap-1 text-[10px] ${color}`}>
                                {isNeutral ? <Minus className="h-3 w-3" /> : isIncrease ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {changePrefix}
                                {formatCurrency(isNeutral ? 0 : Math.abs(m.change))}
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
