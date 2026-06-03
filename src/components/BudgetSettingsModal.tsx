import { useState, useMemo, useRef, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useTransactions } from '@/store/useDashboardStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { getCategoryColor } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

export default function BudgetSettingsModal({ open, onClose }: Props) {
  const transactions = useTransactions()
  const budgets = useBudgetStore((s) => s.budgets)
  const setBudget = useBudgetStore((s) => s.setBudget)
  const removeBudget = useBudgetStore((s) => s.removeBudget)

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [autoFocusCategory, setAutoFocusCategory] = useState<string | null>(null)

  const existingCategories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category))
    return Array.from(set).sort()
  }, [transactions])

  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [newCategory, setNewCategory] = useState('')

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
    }
  }, [open])

  if (!open) return null

  const handleSave = (category: string) => {
    const raw = drafts[category] ?? (budgets[category]?.toString() ?? '')
    const amount = parseFloat(raw)
    if (!isNaN(amount) && amount > 0) {
      setBudget(category, amount)
    }
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
  }

  const handleSaveAll = () => {
    for (const category of Object.keys(drafts)) {
      const raw = drafts[category]
      const amount = parseFloat(raw)
      if (!isNaN(amount) && amount > 0) {
        setBudget(category, amount)
      }
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

  const handleAddCategory = () => {
    const trimmed = newCategory.trim()
    if (trimmed && !allCategories.includes(trimmed)) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">预算设置</h2>
            <p className="mt-0.5 text-xs text-slate-500">为每个分类设置月预算额度，关闭时自动保存</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-3">
            {allCategories.map((category) => {
              const currentBudget = budgets[category]
              const draftValue = drafts[category]
              const displayValue = draftValue !== undefined ? draftValue : (currentBudget?.toString() ?? '')
              const hasChange = draftValue !== undefined && draftValue !== (currentBudget?.toString() ?? '')
              const isDraftOnly = currentBudget === undefined && draftValue !== undefined
              const hasBudget = currentBudget !== undefined || (draftValue !== undefined && draftValue !== '')

              return (
                <div key={category} className="flex items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-800/50 px-4 py-3">
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
                      min="0"
                      step="100"
                      placeholder="未设置"
                      value={displayValue}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                      onKeyDown={(e) => handleKeyDown(e, category)}
                      onBlur={() => handleSave(category)}
                      className="w-full rounded-lg border border-slate-600/40 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                  {hasChange && (
                    <span className="text-[10px] text-amber-400">未保存</span>
                  )}
                  {hasBudget && (
                    <button
                      onClick={() => handleRemove(category)}
                      className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="删除预算"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isDraftOnly && draftValue === '' && (
                    <button
                      onClick={() => handleRemoveDraft(category)}
                      className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                      title="取消添加"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-2">
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
    </div>
  )
}
