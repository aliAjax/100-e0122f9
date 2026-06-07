import { useMemo, useState } from 'react'
import { AlertTriangle, Info, TrendingDown, TrendingUp, Target, Calendar, BarChart3 } from 'lucide-react'
import { useMergeMode, useEffectiveTransactions, useEffectiveFilter } from '@/store/useDashboardStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { applyFilter, aggregateByCategory, formatCurrency } from '@/utils/dataAggregation'
import { getCategoryColor, getEffectiveMonthlyBudget, getEffectiveYearlyBudget, getTotalMonthlyAdjustment, type TransactionTypeFilter } from '@/types'

type BudgetViewMode = 'monthly' | 'yearly'

function getProgressColor(ratio: number): string {
  if (ratio >= 1) return '#EF4444'
  if (ratio >= 0.9) return '#F97316'
  if (ratio >= 0.8) return '#F59E0B'
  return '#10B981'
}

function getProgressBg(ratio: number): string {
  if (ratio >= 1) return 'bg-red-500/15'
  if (ratio >= 0.9) return 'bg-orange-500/15'
  if (ratio >= 0.8) return 'bg-amber-500/15'
  return 'bg-emerald-500/15'
}

function getProgressText(ratio: number): string {
  if (ratio >= 1) return 'text-red-400'
  if (ratio >= 0.9) return 'text-orange-400'
  if (ratio >= 0.8) return 'text-amber-400'
  return 'text-emerald-400'
}

function getLatestMonth(transactions: { date: string }[]): string | null {
  if (transactions.length === 0) return null
  const months = new Set(transactions.map((t) => t.date.slice(0, 7)))
  const sorted = Array.from(months).sort()
  return sorted.length > 0 ? sorted[sorted.length - 1] : null
}

function getDaysInMonth(monthStr: string): number {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function getCurrentDayOfMonth(monthStr: string): number {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  if (todayStr === monthStr) {
    return today.getDate()
  }
  return getDaysInMonth(monthStr)
}

function getCurrentMonthOfYear(yearStr: string): number {
  const today = new Date()
  const currentYear = today.getFullYear().toString()
  if (yearStr === currentYear) {
    return today.getMonth() + 1
  }
  return 12
}

export default function BudgetProgress() {
  const mergeMode = useMergeMode()
  const transactions = useEffectiveTransactions()
  const filter = useEffectiveFilter()
  const budgets = useBudgetStore((s) => s.budgets)

  const [viewMode, setViewMode] = useState<BudgetViewMode>('monthly')

  const budgetCategories = useMemo(() => Object.keys(budgets), [budgets])
  const latestMonth = useMemo(() => getLatestMonth(transactions), [transactions])

  const effectiveMonth = filter.selectedMonth ?? latestMonth
  const effectiveYear = effectiveMonth ? effectiveMonth.slice(0, 4) : null
  const effectiveType: TransactionTypeFilter = filter.selectedType ?? 'expense'

  const monthlyFiltered = useMemo(() => {
    if (!effectiveMonth) return []
    return applyFilter(transactions, {
      selectedCategory: null,
      selectedMonth: effectiveMonth,
      selectedDate: null,
      selectedMerchant: null,
      selectedType: effectiveType,
      searchText: '',
      amountMin: null,
      amountMax: null,
    })
  }, [transactions, effectiveMonth, effectiveType])

  const yearlyFiltered = useMemo(() => {
    if (!effectiveYear) return []
    return applyFilter(transactions, {
      selectedCategory: null,
      selectedMonth: effectiveYear,
      selectedDate: null,
      selectedMerchant: null,
      selectedType: effectiveType,
      searchText: '',
      amountMin: null,
      amountMax: null,
    })
  }, [transactions, effectiveYear, effectiveType])

  const monthlyCategoryData = useMemo(() => aggregateByCategory(monthlyFiltered, effectiveType), [monthlyFiltered, effectiveType])
  const yearlyCategoryData = useMemo(() => aggregateByCategory(yearlyFiltered, effectiveType), [yearlyFiltered, effectiveType])

  const monthlyCategoryMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of monthlyCategoryData) {
      map.set(d.category, d.amount)
    }
    return map
  }, [monthlyCategoryData])

  const yearlyCategoryMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of yearlyCategoryData) {
      map.set(d.category, d.amount)
    }
    return map
  }, [yearlyCategoryData])

  const monthlyItems = useMemo(() => {
    return budgetCategories
      .map((category) => {
        const spent = monthlyCategoryMap.get(category) ?? 0
        const budget = getEffectiveMonthlyBudget(budgets[category], effectiveMonth ?? '')
        const adjustment = getTotalMonthlyAdjustment(budgets[category], effectiveMonth ?? '')
        const ratio = budget > 0 ? spent / budget : 0
        const remaining = budget > 0 ? budget - spent : 0
        const hasAdjustment = adjustment !== 0

        let dailyRate = 0
        let projectedSpend = 0
        if (effectiveMonth && budget > 0) {
          const daysInMonth = getDaysInMonth(effectiveMonth)
          const currentDay = getCurrentDayOfMonth(effectiveMonth)
          dailyRate = currentDay > 0 ? spent / currentDay : 0
          projectedSpend = dailyRate * daysInMonth
        }

        return {
          category,
          spent,
          budget,
          adjustment,
          hasAdjustment,
          ratio,
          remaining,
          dailyRate,
          projectedSpend,
        }
      })
      .sort((a, b) => b.ratio - a.ratio)
  }, [budgetCategories, monthlyCategoryMap, budgets, effectiveMonth])

  const yearlyItems = useMemo(() => {
    return budgetCategories
      .map((category) => {
        const spent = yearlyCategoryMap.get(category) ?? 0
        const budget = getEffectiveYearlyBudget(budgets[category], effectiveYear ?? '')
        const ratio = budget > 0 ? spent / budget : 0
        const remaining = budget > 0 ? budget - spent : 0

        let monthlyRate = 0
        let projectedSpend = 0
        if (effectiveYear && budget > 0) {
          const currentMonth = getCurrentMonthOfYear(effectiveYear)
          monthlyRate = currentMonth > 0 ? spent / currentMonth : 0
          projectedSpend = monthlyRate * 12
        }

        return {
          category,
          spent,
          budget,
          ratio,
          remaining,
          monthlyRate,
          projectedSpend,
        }
      })
      .sort((a, b) => b.ratio - a.ratio)
  }, [budgetCategories, yearlyCategoryMap, budgets, effectiveYear])

  const displayItems = viewMode === 'monthly' ? monthlyItems : yearlyItems
  const hasAnyYearlyBudget = useMemo(() => {
    return Object.values(budgets).some(
      (c) => (c.defaultYearly !== undefined && c.defaultYearly > 0) || Object.keys(c.yearlyOverrides ?? {}).length > 0
    )
  }, [budgets])

  const overspendItems = useMemo(() => displayItems.filter((i) => i.ratio >= 1), [displayItems])
  const dangerItems = useMemo(() => displayItems.filter((i) => i.ratio >= 0.9 && i.ratio < 1), [displayItems])
  const warningItems = useMemo(() => displayItems.filter((i) => i.ratio >= 0.8 && i.ratio < 0.9), [displayItems])

  const totalBudget = useMemo(() => displayItems.reduce((sum, i) => sum + i.budget, 0), [displayItems])
  const totalSpent = useMemo(() => displayItems.reduce((sum, i) => sum + i.spent, 0), [displayItems])
  const totalRemaining = useMemo(() => Math.max(0, totalBudget - totalSpent), [totalBudget, totalSpent])
  const totalRatio = useMemo(() => (totalBudget > 0 ? totalSpent / totalBudget : 0), [totalBudget, totalSpent])

  const periodLabel = viewMode === 'monthly' ? effectiveMonth : effectiveYear
  const monthLabel = periodLabel ?? '暂无数据'
  const typeLabel = useMemo(() => {
    const labels: Record<TransactionTypeFilter, string> = {
      expense: '支出',
      income: '收入',
      refund: '退款',
      net: '净支出',
    }
    return labels[effectiveType]
  }, [effectiveType])

  if (mergeMode) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">预算使用情况</h3>
          <span className="text-[11px] text-slate-500">{monthLabel}</span>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
          <p className="text-xs text-purple-400">
            合并模式下，预算统计基于合并后的交易数据。如需调整预算，请先退出合并模式。
          </p>
        </div>
        {monthlyItems.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {monthlyItems.map((item) => {
              const pct = Math.min(item.ratio * 100, 100)
              const barColor = getProgressColor(item.ratio)

              return (
                <div key={item.category} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: getCategoryColor(item.category, 0) }}
                      />
                      <span className="text-xs text-slate-300">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`font-mono ${getProgressText(item.ratio)}`}>
                        ¥{formatCurrency(item.spent)}
                      </span>
                      <span className="text-slate-600">/</span>
                      <span className="font-mono text-slate-500">¥{formatCurrency(item.budget)}</span>
                      <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${getProgressBg(item.ratio)} ${getProgressText(item.ratio)}`}>
                        {Math.round(item.ratio * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: barColor,
                        boxShadow: item.ratio >= 1 ? `0 0 8px ${barColor}40` : undefined,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (displayItems.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-300">预算使用情况</h3>
          <span className="rounded bg-slate-700/40 px-1.5 py-0.5 text-[10px] text-slate-400">
            {typeLabel}口径
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasAnyYearlyBudget && (
            <div className="flex rounded-lg bg-slate-700/30 p-0.5">
              <button
                onClick={() => setViewMode('monthly')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Calendar className="h-3 w-3" />
                月
              </button>
              <button
                onClick={() => setViewMode('yearly')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  viewMode === 'yearly'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <BarChart3 className="h-3 w-3" />
                年
              </button>
            </div>
          )}
          <span className="text-[11px] text-slate-500">{monthLabel}</span>
        </div>
      </div>

      {totalBudget > 0 && (
        <div className="mb-4 rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500">总{viewMode === 'monthly' ? '月' : '年'}预算</span>
            </div>
            <span className="font-mono text-slate-300">¥{formatCurrency(totalBudget)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500">已使用</span>
            </div>
            <span className={`font-mono ${getProgressText(totalRatio)}`}>
              ¥{formatCurrency(totalSpent)} ({Math.round(totalRatio * 100)}%)
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500">剩余额度</span>
            </div>
            <span className={`font-mono ${totalRemaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalRemaining > 0 ? '¥' : '-¥'}{formatCurrency(Math.abs(totalRemaining))}
            </span>
          </div>
        </div>
      )}

      {overspendItems.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-red-400">
              ⚠️ {overspendItems.length} 个分类已超支
            </p>
            {overspendItems.map((item) => (
              <div key={item.category} className="flex flex-col gap-0.5">
                <p className="text-xs text-red-400">
                  <span className="font-medium">{item.category}</span> 超支
                  <span className="font-mono font-medium"> ¥{formatCurrency(item.spent - item.budget)}</span>
                </p>
                <p className="text-[11px] text-red-400/60">
                  预算 ¥{formatCurrency(item.budget)}，实际 ¥{formatCurrency(item.spent)}，已达 {Math.round(item.ratio * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {dangerItems.length > 0 && overspendItems.length === 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-orange-400">
              🔴 {dangerItems.length} 个分类即将超支
            </p>
            {dangerItems.map((item) => (
              <div key={item.category} className="flex flex-col gap-0.5">
                <p className="text-xs text-orange-400">
                  <span className="font-medium">{item.category}</span> 已达预算的
                  <span className="font-mono font-medium"> {Math.round(item.ratio * 100)}%</span>
                </p>
                <p className="text-[11px] text-orange-400/60">
                  剩余 ¥{formatCurrency(item.remaining)}
                  {'projectedSpend' in item && item.projectedSpend > item.budget && (
                    <>，按当前速度预计超支 ¥{formatCurrency(Math.max(0, item.projectedSpend - item.budget))}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {warningItems.length > 0 && overspendItems.length === 0 && dangerItems.length === 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-amber-400">
              🟡 {warningItems.length} 个分类需注意
            </p>
            {warningItems.map((item) => (
              <p key={item.category} className="text-xs text-amber-400">
                <span className="font-medium">{item.category}</span> 已达预算的
                <span className="font-mono font-medium"> {Math.round(item.ratio * 100)}%</span>，
                剩余 ¥{formatCurrency(item.remaining)}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {displayItems.map((item) => {
          const pct = Math.min(item.ratio * 100, 100)
          const barColor = getProgressColor(item.ratio)
          const willOverspend = item.budget > 0 && item.ratio < 1 &&
            'projectedSpend' in item && item.projectedSpend > item.budget

          return (
            <div key={item.category} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getCategoryColor(item.category, 0) }}
                  />
                  <span className="text-xs text-slate-300">{item.category}</span>
                  {'hasAdjustment' in item && item.hasAdjustment && (
                    <span className={`rounded px-1 py-0.5 text-[9px] ${item.adjustment > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {item.adjustment > 0 ? '+' : ''}{item.adjustment}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className={`font-mono ${getProgressText(item.ratio)}`}>
                    ¥{formatCurrency(item.spent)}
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className="font-mono text-slate-500">¥{formatCurrency(item.budget)}</span>
                  <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${getProgressBg(item.ratio)} ${getProgressText(item.ratio)}`}>
                    {Math.round(item.ratio * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    boxShadow: item.ratio >= 1 ? `0 0 8px ${barColor}40` : undefined,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">
                  剩余: <span className={item.remaining > 0 ? 'text-emerald-400' : 'text-red-400'}>¥{formatCurrency(item.remaining)}</span>
                </span>
                {willOverspend && 'projectedSpend' in item && (
                  <span className="text-orange-400">
                    预计超支: ¥{formatCurrency(item.projectedSpend - item.budget)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
