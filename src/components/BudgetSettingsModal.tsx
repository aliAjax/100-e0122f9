import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, Calculator, Calendar, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { useTransactions } from '@/store/useDashboardStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { getCategoryColor, getEffectiveMonthlyBudget } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

type TabType = 'monthly' | 'yearly' | 'adjustments'

export default function BudgetSettingsModal({ open, onClose }: Props) {
  const transactions = useTransactions()
  const budgets = useBudgetStore((s) => s.budgets)
  const setDefaultMonthlyBudget = useBudgetStore((s) => s.setDefaultMonthlyBudget)
  const setDefaultYearlyBudget = useBudgetStore((s) => s.setDefaultYearlyBudget)
  const setMonthlyOverride = useBudgetStore((s) => s.setMonthlyOverride)
  const setYearlyOverride = useBudgetStore((s) => s.setYearlyOverride)
  const setAdjustment = useBudgetStore((s) => s.setAdjustment)
  const removeBudget = useBudgetStore((s) => s.removeBudget)
  const addCategoryToStore = useCategoryStore((s) => s.addCategory)

  const [activeTab, setActiveTab] = useState<TabType>('monthly')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [newCategory, setNewCategory] = useState('')
  const [showAutoBudget, setShowAutoBudget] = useState(false)
  const [autoBudgetRange, setAutoBudgetRange] = useState<3 | 6 | 'all'>('all')

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [autoFocusCategory, setAutoFocusCategory] = useState<string | null>(null)

  const existingCategories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category))
    return Array.from(set).sort()
  }, [transactions])

  const availableMonths = useMemo(() => {
    const months = new Set(
      transactions
        .filter((t) => t.type === 'expense')
        .map((t) => t.date.slice(0, 7))
    )
    return Array.from(months).sort().reverse()
  }, [transactions])

  const availableYears = useMemo(() => {
    const years = new Set(
      transactions
        .filter((t) => t.type === 'expense')
        .map((t) => t.date.slice(0, 4))
    )
    return Array.from(years).sort().reverse()
  }, [transactions])

  useEffect(() => {
    if (open && availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0])
    }
    if (open && availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0])
    }
  }, [open, availableMonths, availableYears, selectedMonth, selectedYear])

  const monthsToUse = useMemo(() => {
    if (autoBudgetRange === 'all') return availableMonths
    return availableMonths.slice(0, autoBudgetRange)
  }, [availableMonths, autoBudgetRange])

  const suggestedBudgets = useMemo(() => {
    if (monthsToUse.length === 0) return {}
    const categoryTotals = new Map<string, number>()
    for (const month of monthsToUse) {
      const monthTx = transactions.filter(
        (t) => t.date.startsWith(month) && t.type === 'expense'
      )
      for (const t of monthTx) {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) ?? 0) + t.amount)
      }
    }
    const result: Record<string, number> = {}
    for (const [cat, total] of categoryTotals) {
      const avg = total / monthsToUse.length
      if (avg > 0) {
        result[cat] = Math.round(avg)
      }
    }
    return result
  }, [transactions, monthsToUse])

  const handleApplyAutoBudget = useCallback(() => {
    for (const [cat, amount] of Object.entries(suggestedBudgets)) {
      setDefaultMonthlyBudget(cat, amount)
    }
    setShowAutoBudget(false)
  }, [suggestedBudgets, setDefaultMonthlyBudget])

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    existingCategories.forEach((c) => set.add(c))
    Object.keys(budgets).forEach((c) => set.add(c))
    Object.keys(drafts).forEach((c) => set.add(c))
    return Array.from(set).sort()
  }, [existingCategories, budgets, drafts])

  useEffect(() => {
    if (autoFocusCategory && inputRefs.current[autoFocusCategory]) {
      inputRefs.current[autoFocusCategory]?.focus()
      setAutoFocusCategory(null)
    }
  }, [autoFocusCategory, allCategories])

  useEffect(() => {
    if (open) {
      setDrafts({})
      setNewCategory('')
      setShowAutoBudget(false)
      setActiveTab('monthly')
      setExpandedCategories(new Set())
    }
  }, [open])

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const getDisplayValue = (category: string): string => {
    const draftValue = drafts[category]
    if (draftValue !== undefined) return draftValue

    const config = budgets[category]
    if (!config) return ''

    if (activeTab === 'monthly') {
      if (selectedMonth && config.monthlyOverrides?.[selectedMonth]) {
        return config.monthlyOverrides[selectedMonth].toString()
      }
      return config.defaultMonthly?.toString() ?? ''
    } else if (activeTab === 'yearly') {
      if (selectedYear && config.yearlyOverrides?.[selectedYear]) {
        return config.yearlyOverrides[selectedYear].toString()
      }
      return config.defaultYearly?.toString() ?? ''
    } else if (activeTab === 'adjustments') {
      if (selectedMonth && config.adjustments?.[selectedMonth]) {
        return config.adjustments[selectedMonth].toString()
      }
      return ''
    }
    return ''
  }

  const hasOverride = (category: string): boolean => {
    const config = budgets[category]
    if (!config) return false
    if (activeTab === 'monthly' && selectedMonth) {
      return config.monthlyOverrides?.[selectedMonth] !== undefined
    }
    if (activeTab === 'yearly' && selectedYear) {
      return config.yearlyOverrides?.[selectedYear] !== undefined
    }
    if (activeTab === 'adjustments' && selectedMonth) {
      return config.adjustments?.[selectedMonth] !== undefined
    }
    return false
  }

  const handleSave = (category: string) => {
    const raw = drafts[category] ?? getDisplayValue(category)
    const amount = parseFloat(raw)

    if (activeTab === 'monthly') {
      if (selectedMonth) {
        if (!isNaN(amount) && amount > 0) {
          setMonthlyOverride(category, selectedMonth, amount)
        } else {
          setMonthlyOverride(category, selectedMonth, undefined)
        }
      } else {
        if (!isNaN(amount) && amount > 0) {
          setDefaultMonthlyBudget(category, amount)
        } else {
          setDefaultMonthlyBudget(category, undefined)
        }
      }
    } else if (activeTab === 'yearly') {
      if (selectedYear) {
        if (!isNaN(amount) && amount > 0) {
          setYearlyOverride(category, selectedYear, amount)
        } else {
          setYearlyOverride(category, selectedYear, undefined)
        }
      } else {
        if (!isNaN(amount) && amount > 0) {
          setDefaultYearlyBudget(category, amount)
        } else {
          setDefaultYearlyBudget(category, undefined)
        }
      }
    } else if (activeTab === 'adjustments') {
      if (selectedMonth) {
        if (!isNaN(amount)) {
          setAdjustment(category, selectedMonth, amount)
        } else {
          setAdjustment(category, selectedMonth, undefined)
        }
      }
    }

    setDrafts((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
  }

  const handleSaveAll = () => {
    for (const category of Object.keys(drafts)) {
      handleSave(category)
    }
    setDrafts({})
  }

  const handleRemove = (category: string) => {
    removeBudget(category)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
  }

  const handleRemoveDraft = (category: string) => {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
  }

  const handleClearOverride = (category: string) => {
    if (activeTab === 'monthly' && selectedMonth) {
      setMonthlyOverride(category, selectedMonth, undefined)
    } else if (activeTab === 'yearly' && selectedYear) {
      setYearlyOverride(category, selectedYear, undefined)
    } else if (activeTab === 'adjustments' && selectedMonth) {
      setAdjustment(category, selectedMonth, undefined)
    }
  }

  const handleAddCategory = () => {
    const trimmed = newCategory.trim()
    if (trimmed && !allCategories.includes(trimmed)) {
      addCategoryToStore(trimmed)
      setNewCategory('')
      setDrafts((prev) => ({ ...prev, [trimmed]: '' }))
      setAutoFocusCategory(trimmed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, category: string) => {
    if (e.key === 'Enter') {
      handleSave(category)
    }
  }

  const handleClose = () => {
    handleSaveAll()
    onClose()
  }

  const hasAnyBudget = (category: string): boolean => {
    const config = budgets[category]
    if (!config) return drafts[category] !== undefined && drafts[category] !== ''
    return (
      (config.defaultMonthly !== undefined && config.defaultMonthly > 0) ||
      (config.defaultYearly !== undefined && config.defaultYearly > 0) ||
      Object.keys(config.monthlyOverrides ?? {}).length > 0 ||
      Object.keys(config.yearlyOverrides ?? {}).length > 0 ||
      drafts[category] !== undefined
    )
  }

  const isExpanded = (category: string) => expandedCategories.has(category)

  const getTabLabel = () => {
    switch (activeTab) {
      case 'monthly':
        return selectedMonth ? `${selectedMonth} 月预算` : '默认月预算'
      case 'yearly':
        return selectedYear ? `${selectedYear} 年预算` : '默认年预算'
      case 'adjustments':
        return selectedMonth ? `${selectedMonth} 临时调整` : '临时调整'
    }
  }

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'monthly':
        return selectedMonth ? '覆盖默认' : '未设置'
      case 'yearly':
        return selectedYear ? '覆盖默认' : '未设置'
      case 'adjustments':
        return '正数增加，负数减少'
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 mx-4 w-full max-w-xl rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">预算设置</h2>
            <p className="mt-0.5 text-xs text-slate-500">支持按月份、年份设置预算及临时调整</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-700/40 px-6">
          {([
            { key: 'monthly' as const, label: '月预算', icon: Calendar },
            { key: 'yearly' as const, label: '年预算', icon: Settings },
            { key: 'adjustments' as const, label: '临时调整', icon: Plus },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-6 py-3">
          {(activeTab === 'monthly' || activeTab === 'adjustments') && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">月份:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-2.5 py-1.5 text-xs text-slate-300 outline-none transition-colors focus:border-emerald-500/50"
              >
                <option value="">默认</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'yearly' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">年份:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-2.5 py-1.5 text-xs text-slate-300 outline-none transition-colors focus:border-emerald-500/50"
              >
                <option value="">默认</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
          <span className="text-[11px] text-slate-600">
            {getTabLabel()}
          </span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-6 py-2">
          {activeTab === 'monthly' && !selectedMonth && availableMonths.length > 0 && (
            <button
              onClick={() => setShowAutoBudget(true)}
              className="mb-3 flex w-full items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-2.5 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/10"
            >
              <Calculator className="h-4 w-4" />
              按历史月均生成预算
            </button>
          )}

          <div className="flex flex-col gap-2">
            {allCategories.map((category) => {
              const displayValue = getDisplayValue(category)
              const hasChange = drafts[category] !== undefined && drafts[category] !== displayValue
              const isDraftOnly = !budgets[category] && drafts[category] !== undefined
              const hasBudget = hasAnyBudget(category)
              const expanded = isExpanded(category)
              const config = budgets[category]
              const hasOverrideForSelection = hasOverride(category)

              return (
                <div key={category} className="rounded-xl border border-slate-700/30 bg-slate-800/50 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                    >
                      {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: getCategoryColor(category, 0) }}
                    />
                    <span className="w-16 shrink-0 text-sm text-slate-300">{category}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-xs text-slate-500">¥</span>
                      <input
                        ref={(el) => { inputRefs.current[category] = el }}
                        type="number"
                        step="100"
                        placeholder={getPlaceholder()}
                        value={displayValue}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                        onKeyDown={(e) => handleKeyDown(e, category)}
                        onBlur={() => handleSave(category)}
                        className="w-full rounded-lg border border-slate-600/40 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                    {hasChange && (
                      <span className="text-[10px] text-amber-400 whitespace-nowrap">未保存</span>
                    )}
                    {hasOverrideForSelection && (
                      <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-400 whitespace-nowrap">
                        自定义
                      </span>
                    )}
                    {hasBudget && (
                      <button
                        onClick={() => handleRemove(category)}
                        className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="删除该分类所有预算"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isDraftOnly && drafts[category] === '' && (
                      <button
                        onClick={() => handleRemoveDraft(category)}
                        className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                        title="取消添加"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {expanded && config && (
                    <div className="border-t border-slate-700/30 bg-slate-900/30 px-4 py-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {config.defaultMonthly !== undefined && config.defaultMonthly > 0 && (
                          <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                            <span className="text-slate-500">默认月预算</span>
                            <span className="font-mono text-slate-300">¥{config.defaultMonthly}</span>
                          </div>
                        )}
                        {config.defaultYearly !== undefined && config.defaultYearly > 0 && (
                          <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                            <span className="text-slate-500">默认年预算</span>
                            <span className="font-mono text-slate-300">¥{config.defaultYearly}</span>
                          </div>
                        )}
                        {selectedMonth && hasOverrideForSelection && activeTab === 'monthly' && (
                          <div className="flex items-center justify-between rounded-lg bg-violet-500/10 px-3 py-2">
                            <span className="text-violet-400">{selectedMonth} 覆盖</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-violet-300">¥{config.monthlyOverrides?.[selectedMonth]}</span>
                              <button
                                onClick={() => handleClearOverride(category)}
                                className="text-[10px] text-violet-400 hover:text-violet-300"
                              >
                                清除
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedMonth && hasOverrideForSelection && activeTab === 'adjustments' && (
                          <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
                            <span className="text-amber-400">{selectedMonth} 调整</span>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono ${(config.adjustments?.[selectedMonth] ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {(config.adjustments?.[selectedMonth] ?? 0) >= 0 ? '+' : ''}¥{config.adjustments?.[selectedMonth]}
                              </span>
                              <button
                                onClick={() => handleClearOverride(category)}
                                className="text-[10px] text-amber-400 hover:text-amber-300"
                              >
                                清除
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedYear && hasOverrideForSelection && activeTab === 'yearly' && (
                          <div className="flex items-center justify-between rounded-lg bg-violet-500/10 px-3 py-2">
                            <span className="text-violet-400">{selectedYear} 覆盖</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-violet-300">¥{config.yearlyOverrides?.[selectedYear]}</span>
                              <button
                                onClick={() => handleClearOverride(category)}
                                className="text-[10px] text-violet-400 hover:text-violet-300"
                              >
                                清除
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="添加新分类..."
              className="flex-1 rounded-lg border border-slate-600/40 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategory.trim() || allCategories.includes(newCategory.trim())}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-40 disabled:hover:bg-emerald-500/15"
            >
              <Plus className="h-3.5 w-3.5" />
              添加
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-700/40 px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
          >
            完成
          </button>
        </div>
      </div>

      {showAutoBudget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAutoBudget(false)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">按历史月均生成预算</h2>
                <p className="mt-0.5 text-xs text-slate-500">选择参考时间范围，一键填充建议预算</p>
              </div>
              <button onClick={() => setShowAutoBudget(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="mb-3 text-xs text-slate-400">参考时间范围</p>
              <div className="flex gap-2">
                {([
                  { value: 3 as const, key: '3', label: '最近3个月', disabled: availableMonths.length < 3 },
                  { value: 6 as const, key: '6', label: '最近6个月', disabled: availableMonths.length < 6 },
                  { value: 'all' as const, key: 'all', label: `全部月份（${availableMonths.length}个月）`, disabled: availableMonths.length === 0 },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => !opt.disabled && setAutoBudgetRange(opt.value)}
                    disabled={opt.disabled}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      autoBudgetRange === opt.value
                        ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400'
                        : opt.disabled
                          ? 'border-slate-700/30 bg-slate-800/30 text-slate-600'
                          : 'border-slate-700/30 bg-slate-800/50 text-slate-300 hover:border-slate-600/50 hover:bg-slate-700/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {monthsToUse.length > 0 && (
                <>
                  <p className="mb-2 mt-4 text-xs text-slate-400">
                    预览（基于 {monthsToUse.length} 个月数据）
                  </p>
                  <div className="max-h-[40vh] overflow-y-auto">
                    <div className="flex flex-col gap-2">
                      {Object.entries(suggestedBudgets)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([cat, amount]) => {
                          const currentBudget = getEffectiveMonthlyBudget(budgets[cat], '')
                          const willChange = currentBudget > 0 && currentBudget !== amount
                          const isNew = currentBudget === 0
                          return (
                            <div key={cat} className="flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-800/50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: getCategoryColor(cat, 0) }}
                                />
                                <span className="text-sm text-slate-300">{cat}</span>
                                {isNew && (
                                  <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-400">新增</span>
                                )}
                                {willChange && (
                                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">更新</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {willChange && (
                                  <span className="text-[11px] text-slate-500 line-through">¥{currentBudget}</span>
                                )}
                                <span className="font-mono text-sm text-slate-200">¥{amount}</span>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </>
              )}

              {monthsToUse.length === 0 && (
                <p className="mt-3 text-center text-xs text-slate-500">所选时间范围内无支出数据</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-700/40 px-6 py-4">
              <button
                onClick={() => setShowAutoBudget(false)}
                className="rounded-lg bg-slate-700/40 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/60"
              >
                取消
              </button>
              <button
                onClick={handleApplyAutoBudget}
                disabled={Object.keys(suggestedBudgets).length === 0}
                className="rounded-lg bg-cyan-500/15 px-4 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-500/25 disabled:opacity-40 disabled:hover:bg-cyan-500/15"
              >
                填入预算
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
