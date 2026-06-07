import { useState, useMemo, useRef, useEffect } from 'react'
import { X, Plus, Trash2, Tag, RefreshCw, Check, AlertCircle, Eye, Pencil, Power } from 'lucide-react'
import { useCategoryRuleStore } from '@/store/useCategoryRuleStore'
import { useDashboardStore, useTransactions } from '@/store/useDashboardStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { getCategoryColor } from '@/types'
import type { CategoryRule, RulePreviewResult } from '@/types'
import { previewRuleImpact, applyCategoryRulesWithPreserve } from '@/utils/categoryRuleMatcher'
import { cn } from '@/lib/utils'
import RulePreviewModal from './RulePreviewModal'

type PendingAction =
  | { type: 'add'; keyword: string; category: string }
  | { type: 'update'; id: string; updates: Partial<Omit<CategoryRule, 'id'>> }
  | { type: 'toggle'; id: string }
  | { type: 'reclassify' }
  | null

interface Props {
  open: boolean
  onClose: () => void
}

export default function CategoryRuleModal({ open, onClose }: Props) {
  const rules = useCategoryRuleStore((s) => s.rules)
  const addRule = useCategoryRuleStore((s) => s.addRule)
  const updateRule = useCategoryRuleStore((s) => s.updateRule)
  const removeRule = useCategoryRuleStore((s) => s.removeRule)
  const toggleRule = useCategoryRuleStore((s) => s.toggleRule)

  const transactions = useTransactions()
  const allBills = useDashboardStore((s) => s.bills)
  const applyRulesToCurrentBill = useDashboardStore((s) => s.applyRulesToCurrentBill)
  const applyRulesToAllBills = useDashboardStore((s) => s.applyRulesToAllBills)
  const setCurrentBillTransactions = useDashboardStore((s) => s.setCurrentBillTransactions)

  const categories = useCategoryStore((s) => s.categories)
  const budgets = useBudgetStore((s) => s.budgets)
  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories])

  const [newKeyword, setNewKeyword] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editKeyword, setEditKeyword] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [reclassifyResult, setReclassifyResult] = useState<{ matched: number; unchanged: number } | null>(null)
  const [isReclassifying, setIsReclassifying] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewResult, setPreviewResult] = useState<RulePreviewResult | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)

  const keywordInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const enabledRules = useMemo(() => rules.filter((r) => r.enabled), [rules])

  useEffect(() => {
    if (open) {
      setNewKeyword('')
      setNewCategory(categoryNames[0] ?? '')
      setEditingId(null)
      setReclassifyResult(null)
      setPendingAction(null)
      setPreviewResult(null)
      setApplySuccess(null)
    }
  }, [open, categoryNames])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  const getRulesWithPendingAction = (action: PendingAction): CategoryRule[] => {
    if (!action) return rules

    switch (action.type) {
      case 'add':
        return [
          ...rules,
          {
            id: 'pending_new',
            keyword: action.keyword,
            category: action.category,
            enabled: true,
          },
        ]
      case 'update':
        return rules.map((r) =>
          r.id === action.id ? { ...r, ...action.updates } : r,
        )
      case 'toggle': {
        const targetRule = rules.find((r) => r.id === action.id)
        return rules.map((r) =>
          r.id === action.id ? { ...r, enabled: !r.enabled } : r,
        )
      }
      default:
        return rules
    }
  }

  const generatePreview = async (action: PendingAction) => {
    if (allBills.length === 0) return

    setIsPreviewLoading(true)
    setPendingAction(action)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const previewRules = getRulesWithPendingAction(action)
      const allTransactions = allBills.flatMap((b) => b.transactions)
      const result = previewRuleImpact(allTransactions, previewRules, budgets)
      setPreviewResult(result)
      setPreviewOpen(true)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const executePendingAction = () => {
    if (!pendingAction) return

    switch (pendingAction.type) {
      case 'add':
        addRule(pendingAction.keyword, pendingAction.category)
        setNewKeyword('')
        keywordInputRef.current?.focus()
        break
      case 'update':
        updateRule(pendingAction.id, pendingAction.updates)
        setEditingId(null)
        break
      case 'toggle':
        toggleRule(pendingAction.id)
        break
    }
  }

  const handleApplyPreview = async (scope: 'current' | 'all') => {
    setIsApplying(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))

      executePendingAction()

      let resultMsg = ''
      if (scope === 'current') {
        const result = applyRulesToCurrentBill()
        resultMsg = `已应用到当前账单：${result.matchedCount} 条更新，${result.manualSkippedCount} 条手动分类跳过`
      } else {
        const result = applyRulesToAllBills()
        resultMsg = `已应用到全部账单：${result.totalMatched} 条更新，涉及 ${result.billsAffected} 个账单，${result.totalManualSkipped} 条手动分类跳过`
      }

      setApplySuccess(resultMsg)
      setPreviewOpen(false)
      setPendingAction(null)
      setPreviewResult(null)

      setTimeout(() => setApplySuccess(null), 4000)
    } finally {
      setIsApplying(false)
    }
  }

  const handleAddRule = () => {
    const trimmed = newKeyword.trim()
    if (!trimmed) return

    const exists = rules.some(
      (r) => r.keyword.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) return

    if (transactions.length === 0 && allBills.length === 0) {
      addRule(trimmed, newCategory)
      setNewKeyword('')
      keywordInputRef.current?.focus()
      return
    }

    generatePreview({ type: 'add', keyword: trimmed, category: newCategory })
  }

  const handleStartEdit = (id: string) => {
    const rule = rules.find((r) => r.id === id)
    if (!rule) return
    setEditingId(id)
    setEditKeyword(rule.keyword)
    setEditCategory(rule.category)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const trimmed = editKeyword.trim()
    if (!trimmed) return

    const exists = rules.some(
      (r) => r.id !== editingId && r.keyword.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) return

    if (transactions.length === 0 && allBills.length === 0) {
      updateRule(editingId, { keyword: trimmed, category: editCategory })
      setEditingId(null)
      return
    }

    generatePreview({
      type: 'update',
      id: editingId,
      updates: { keyword: trimmed, category: editCategory },
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleToggleRule = (id: string) => {
    if (transactions.length === 0 && allBills.length === 0) {
      toggleRule(id)
      return
    }

    generatePreview({ type: 'toggle', id })
  }

  const handleReclassify = async () => {
    if (transactions.length === 0) return

    setIsReclassifying(true)
    setReclassifyResult(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const result = applyCategoryRulesWithPreserve(transactions, enabledRules)
      setCurrentBillTransactions(result.transactions)
      setReclassifyResult({
        matched: result.matchedCount,
        unchanged: result.unchangedCount,
      })
    } finally {
      setIsReclassifying(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, type: 'add' | 'edit') => {
    if (e.key === 'Enter') {
      if (type === 'add') {
        handleAddRule()
      } else {
        handleSaveEdit()
      }
    } else if (e.key === 'Escape' && type === 'edit') {
      handleCancelEdit()
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 mx-4 w-full max-w-2xl rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/15 p-2">
                <Tag className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">分类规则管理</h2>
                <p className="mt-0.5 text-xs text-slate-500">配置商户关键词到消费分类的映射规则</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
            <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <p className="text-xs text-blue-300/90">
                新增、修改或停用规则时可先预览影响，确认后再应用。包含关键词的商户会被匹配到对应分类，
                <span className="font-medium text-blue-300">已手动设置分类的记录不会被自动覆盖</span>。
              </p>
            </div>

            {applySuccess && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="text-xs text-emerald-300/90">{applySuccess}</div>
              </div>
            )}

            <div className="mb-4 rounded-xl border border-slate-700/30 bg-slate-800/30 px-4 py-3">
              <div className="mb-2 text-xs font-medium text-slate-400">添加新规则</div>
              <div className="flex items-center gap-2">
                <input
                  ref={keywordInputRef}
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'add')}
                  placeholder="商户关键词，如：滴滴、星巴克..."
                  className="flex-1 rounded-lg border border-slate-600/40 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="rounded-lg border border-slate-600/40 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                >
                  {categoryNames.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddRule}
                  disabled={!newKeyword.trim() || isPreviewLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 px-4 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/25 disabled:opacity-40 disabled:hover:bg-blue-500/15"
                >
                  {isPreviewLoading && pendingAction?.type === 'add' ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      预览中...
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      预览并添加
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                共 {rules.length} 条规则，{enabledRules.length} 条已启用
              </div>
              {transactions.length > 0 && (
                <button
                  onClick={handleReclassify}
                  disabled={isReclassifying || enabledRules.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-40 disabled:hover:bg-emerald-500/15"
                >
                  {isReclassifying ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      重新归类中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      立即重新归类（当前账单）
                    </>
                  )}
                </button>
              )}
            </div>

            {reclassifyResult && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="text-xs text-emerald-300/90">
                  重新归类完成：
                  <span className="font-medium text-emerald-400">{reclassifyResult.matched}</span> 条记录已更新分类，
                  <span className="font-medium text-slate-400">{reclassifyResult.unchanged}</span> 条记录保持不变
                </div>
              </div>
            )}

            {transactions.length === 0 && rules.length > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <div className="text-xs text-amber-300/90">
                  已配置 <span className="font-medium text-amber-400">{rules.length}</span> 条分类规则，
                  导入 CSV 时会自动应用这些规则进行归类
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {rules.length === 0 ? (
                <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-6 py-8 text-center">
                  <Tag className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-500">暂无分类规则</p>
                  <p className="mt-1 text-xs text-slate-600">添加规则后，导入 CSV 时会自动应用</p>
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                      rule.enabled
                        ? 'border-slate-700/30 bg-slate-800/30'
                        : 'border-slate-700/20 bg-slate-800/10 opacity-60',
                    )}
                  >
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      disabled={isPreviewLoading}
                      className={cn(
                        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                        rule.enabled ? 'bg-blue-500' : 'bg-slate-700',
                      )}
                      title={rule.enabled ? '点击停用并预览影响' : '点击启用并预览影响'}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                          rule.enabled ? 'translate-x-4' : 'translate-x-0.5',
                        )}
                      />
                    </button>

                    {editingId === rule.id ? (
                      <>
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editKeyword}
                          onChange={(e) => setEditKeyword(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, 'edit')}
                          className="flex-1 rounded-lg border border-blue-500/40 bg-slate-900/80 px-2 py-1 text-sm text-slate-200 outline-none"
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="rounded-lg border border-blue-500/40 bg-slate-900/80 px-2 py-1 text-sm text-slate-200 outline-none"
                        >
                          {categoryNames.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editKeyword.trim() || isPreviewLoading}
                          className="shrink-0 rounded-md p-1 text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-40"
                          title="保存并预览"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                          title="取消"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300">包含「</span>
                            <span className="text-sm font-medium text-slate-100">{rule.keyword}</span>
                            <span className="text-sm text-slate-300">」</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: getCategoryColor(rule.category, 0) }}
                          />
                          <span className="text-sm font-medium text-slate-300 w-12">{rule.category}</span>
                        </div>
                        <button
                          onClick={() => handleStartEdit(rule.id)}
                          className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                          title="编辑"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeRule(rule.id)}
                          className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-700/40 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-500/15 px-4 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/25"
            >
              完成
            </button>
          </div>
        </div>
      </div>

      <RulePreviewModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false)
          setPendingAction(null)
          setPreviewResult(null)
        }}
        previewResult={previewResult}
        rules={getRulesWithPendingAction(pendingAction)}
        isLoading={isApplying}
        onApply={handleApplyPreview}
      />
    </>
  )
}
