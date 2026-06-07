import { useMemo } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { useMergeMode, useEffectiveTransactions, useEffectiveFilter } from '@/store/useDashboardStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { applyFilter, aggregateByCategory, formatCurrency } from '@/utils/dataAggregation'
import { getCategoryColor } from '@/types'

function getProgressColor(ratio: number): string {
  if (ratio >= 1) return '#EF4444'
  if (ratio >= 0.8) return '#F59E0B'
  return '#10B981'
}

function getProgressBg(ratio: number): string {
  if (ratio >= 1) return 'bg-red-500/15'
  if (ratio >= 0.8) return 'bg-amber-500/15'
  return 'bg-emerald-500/15'
}

function getProgressText(ratio: number): string {
  if (ratio >= 1) return 'text-red-400'
  if (ratio >= 0.8) return 'text-amber-400'
  return 'text-emerald-400'
}

function getLatestMonth(transactions: { date: string }[]): string | null {
  if (transactions.length === 0) return null
  const months = new Set(transactions.map((t) => t.date.slice(0, 7)))
  const sorted = Array.from(months).sort()
  return sorted.length > 0 ? sorted[sorted.length - 1] : null
}

export default function BudgetProgress() {
  const mergeMode = useMergeMode()
  const transactions = useEffectiveTransactions()
  const filter = useEffectiveFilter()
  const budgets = useBudgetStore((s) => s.budgets)

  const budgetCategories = useMemo(() => Object.keys(budgets), [budgets])
  const latestMonth = useMemo(() => getLatestMonth(transactions), [transactions])

  const effectiveMonth = filter.selectedMonth ?? latestMonth

  const filtered = useMemo(
    () => applyFilter(transactions, { selectedCategory: null, selectedMonth: effectiveMonth, selectedDate: null, selectedMerchant: null, selectedType: 'expense', searchText: '', amountMin: null, amountMax: null }),
    [transactions, effectiveMonth],
  )

  const categoryData = useMemo(() => aggregateByCategory(filtered, 'expense'), [filtered])

  const categoryAmountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of categoryData) {
      map.set(d.category, d.amount)
    }
    return map
  }, [categoryData])

  const items = useMemo(() => {
    return budgetCategories
      .map((category) => {
        const spent = categoryAmountMap.get(category) ?? 0
        const budget = budgets[category]
        const ratio = budget > 0 ? spent / budget : 0
        return { category, spent, budget, ratio }
      })
      .sort((a, b) => b.ratio - a.ratio)
  }, [budgetCategories, categoryAmountMap, budgets])

  const overspendItems = useMemo(() => items.filter((i) => i.ratio >= 1), [items])
  const warningItems = useMemo(() => items.filter((i) => i.ratio >= 0.8 && i.ratio < 1), [items])

  const monthLabel = effectiveMonth ?? '暂无数据'

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
        {items.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {items.map((item) => {
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

  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">预算使用情况</h3>
        <span className="text-[11px] text-slate-500">{monthLabel}</span>
      </div>

      {overspendItems.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="flex flex-col gap-1">
            {overspendItems.map((item) => (
              <p key={item.category} className="text-xs text-red-400">
                {item.category}超支 <span className="font-mono font-medium">¥{formatCurrency(item.spent - item.budget)}</span>
                <span className="text-red-400/60">（预算 ¥{formatCurrency(item.budget)}，实际 ¥{formatCurrency(item.spent)}）</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {warningItems.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="flex flex-col gap-1">
            {warningItems.map((item) => (
              <p key={item.category} className="text-xs text-amber-400">
                {item.category}已达预算的 <span className="font-mono font-medium">{Math.round(item.ratio * 100)}%</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => {
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
    </div>
  )
}
