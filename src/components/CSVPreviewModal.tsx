import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  FileSpreadsheet,
  ChevronDown,
  Copy,
  Plus,
  Merge,
  SkipForward,
  Check,
  Tag,
  Sparkles,
  Layers,
  AlertCircle,
  Edit3,
  Trash2,
} from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { useCategoryRuleStore } from '@/store/useCategoryRuleStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { cn } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS, CATEGORY_LIST } from '@/types'
import {
  parseRows,
  detectDuplicates,
  type MappedColumns,
  type ImportReconciliationItem,
  type CategoryImportSummary,
} from '@/utils/csvParser'
import { applyCategoryRulesWithDetails } from '@/utils/categoryRuleMatcher'

type ImportMode = 'create' | 'merge'
type TabType = 'overview' | 'duplicates' | 'invalid' | 'categories'

const FIELD_LABELS: Record<string, string> = {
  date: '日期',
  category: '分类',
  merchant: '商户',
  amount: '金额',
  type: '类型',
}

const FIELD_FIELDS = ['date', 'amount', 'type', 'category', 'merchant'] as const
const ALL_CATEGORIES = CATEGORY_LIST

export default function CSVPreviewModal() {
  const previewResult = useDashboardStore((s) => s.previewResult)
  const pendingBillName = useDashboardStore((s) => s.pendingBillName)
  const setPreviewResult = useDashboardStore((s) => s.setPreviewResult)
  const setPendingBillName = useDashboardStore((s) => s.setPendingBillName)
  const confirmPreview = useDashboardStore((s) => s.confirmPreview)
  const confirmPreviewMerge = useDashboardStore((s) => s.confirmPreviewMerge)
  const confirmReconciliation = useDashboardStore((s) => s.confirmReconciliation)
  const bills = useDashboardStore((s) => s.bills)
  const currentBillId = useDashboardStore((s) => s.currentBillId)
  const categoryRules = useCategoryRuleStore((s) => s.rules)
  const customCategories = useCategoryStore((s) => s.categories)

  const currentBill = useMemo(
    () => bills.find((b) => b.id === currentBillId),
    [bills, currentBillId],
  )

  const existingCategories = useMemo(() => {
    const cats = new Set([...ALL_CATEGORIES, ...customCategories])
    if (currentBill) {
      currentBill.transactions.forEach((t) => cats.add(t.category))
    }
    return Array.from(cats)
  }, [currentBill, customCategories])

  const hasCurrentBill = !!currentBill

  const [importMode, setImportMode] = useState<ImportMode>('create')
  const [billName, setBillName] = useState(pendingBillName || `账单 ${bills.length + 1}`)
  const [userMappings, setUserMappings] = useState<MappedColumns>(() =>
    previewResult
      ? { ...previewResult.mappedColumns }
      : { date: null, category: null, merchant: null, amount: null, type: null }
  )
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [reconciliationItems, setReconciliationItems] = useState<ImportReconciliationItem[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  useEffect(() => {
    if (previewResult) {
      setUserMappings({ ...previewResult.mappedColumns })
      setBillName(pendingBillName || `账单 ${bills.length + 1}`)
      setImportMode('create')
      setActiveTab('overview')
      setEditingItemId(null)
    }
  }, [previewResult, pendingBillName, bills.length])

  const parsedResult = useMemo(() => {
    if (!previewResult) {
      return {
        validCount: 0,
        invalidCount: 0,
        invalidReasons: [],
        previewRows: [],
        allTransactions: [],
        invalidRows: [],
      }
    }
    const { date, category, merchant, amount, type } = userMappings
    if (!date || !amount) {
      return {
        validCount: 0,
        invalidCount: previewResult.rawRows.length,
        invalidReasons: ['请选择日期和金额对应的列'],
        previewRows: [],
        allTransactions: [],
        invalidRows: previewResult.invalidRows || [],
      }
    }
    const { transactions, invalidCount, invalidReasons, invalidRows } = parseRows(
      previewResult.rawRows,
      date,
      category,
      merchant,
      amount,
      type,
    )
    return {
      validCount: transactions.length,
      invalidCount,
      invalidReasons,
      previewRows: transactions.slice(0, 20),
      allTransactions: transactions,
      invalidRows: invalidRows || [],
    }
  }, [userMappings, previewResult])

  const duplicateInfo = useMemo(() => {
    if (importMode !== 'merge' || !currentBill) {
      return { duplicateCount: 0, duplicateIds: new Set<string>() }
    }
    return detectDuplicates(parsedResult.allTransactions, currentBill.transactions)
  }, [importMode, currentBill, parsedResult.allTransactions])

  useEffect(() => {
    if (!previewResult || parsedResult.allTransactions.length === 0) {
      setReconciliationItems([])
      return
    }

    const { transactions: categorizedTxs, matchedCount, newCategories } = applyCategoryRulesWithDetails(
      parsedResult.allTransactions,
      categoryRules,
      existingCategories,
      true,
    )

    const items: ImportReconciliationItem[] = categorizedTxs.map((tx) => {
      const isDuplicate = importMode === 'merge' && duplicateInfo.duplicateIds.has(tx.id)
      return {
        transaction: {
          id: tx.id,
          date: tx.date,
          category: tx.category,
          merchant: tx.merchant,
          amount: tx.amount,
          type: tx.type,
        },
        status: isDuplicate ? 'duplicate' : 'valid',
        action: isDuplicate ? 'skip' : 'keep',
        originalCategory: tx.category,
        matchedRuleKeyword: tx.matchedRuleKeyword,
        isNewCategory: tx.isNewCategory,
      }
    })

    parsedResult.invalidRows.forEach((inv, idx) => {
      items.push({
        transaction: {
          id: `invalid_${idx}`,
          date: inv.row[userMappings.date || ''] || '',
          category: '',
          merchant: inv.row[userMappings.merchant || ''] || '',
          amount: 0,
          type: 'expense',
        },
        status: 'invalid',
        action: 'skip',
        originalCategory: '',
        isNewCategory: false,
        invalidReason: inv.reason,
        rawRow: inv.row,
      })
    })

    setReconciliationItems(items)
  }, [parsedResult.allTransactions, parsedResult.invalidRows, importMode, duplicateInfo.duplicateIds, categoryRules, existingCategories, userMappings, previewResult])

  const categorySummaries = useMemo((): CategoryImportSummary[] => {
    const keepItems = reconciliationItems.filter((item) => item.action === 'keep' && item.status !== 'invalid')
    const summaryMap = new Map<string, { count: number; amount: number; isNew: boolean }>()

    for (const item of keepItems) {
      const cat = item.transaction.category
      const existing = summaryMap.get(cat) || { count: 0, amount: 0, isNew: false }
      existing.count += 1
      existing.amount += item.transaction.amount
      existing.isNew = existing.isNew || item.isNewCategory
      summaryMap.set(cat, existing)
    }

    return Array.from(summaryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
  }, [reconciliationItems])

  const stats = useMemo(() => {
    const validItems = reconciliationItems.filter((i) => i.status !== 'invalid')
    const duplicateItems = reconciliationItems.filter((i) => i.status === 'duplicate')
    const invalidItems = reconciliationItems.filter((i) => i.status === 'invalid')
    const keepItems = reconciliationItems.filter((i) => i.action === 'keep' && i.status !== 'invalid')
    const skipItems = reconciliationItems.filter((i) => i.action === 'skip' && i.status !== 'invalid')
    const matchedItems = reconciliationItems.filter((i) => i.matchedRuleKeyword)
    const newCategoryItems = reconciliationItems.filter((i) => i.isNewCategory && i.action === 'keep')
    const newCategories = Array.from(new Set(newCategoryItems.map((i) => i.transaction.category)))

    return {
      total: reconciliationItems.length,
      valid: validItems.length,
      duplicate: duplicateItems.length,
      invalid: invalidItems.length,
      keep: keepItems.length,
      skip: skipItems.length,
      matched: matchedItems.length,
      newCategoryCount: newCategories.length,
      newCategories,
    }
  }, [reconciliationItems])

  if (!previewResult) return null

  const hasRequired = userMappings.date !== null && userMappings.amount !== null
  const canConfirm =
    importMode === 'create'
      ? billName.trim() !== '' && hasRequired && stats.keep > 0
      : hasRequired && stats.keep > 0

  const handleMappingChange = (field: keyof MappedColumns, value: string) => {
    setUserMappings((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }))
  }

  const handleItemAction = useCallback((itemId: string, action: 'keep' | 'skip') => {
    setReconciliationItems((prev) =>
      prev.map((item) =>
        item.transaction.id === itemId ? { ...item, action } : item
      )
    )
  }, [])

  const handleItemCategoryChange = useCallback((itemId: string, newCategory: string) => {
    setReconciliationItems((prev) =>
      prev.map((item) => {
        if (item.transaction.id === itemId) {
          const isNew = !existingCategories.includes(newCategory) && newCategory !== '其他'
          return {
            ...item,
            transaction: { ...item.transaction, category: newCategory },
            isNewCategory: isNew,
          }
        }
        return item
      })
    )
    setEditingItemId(null)
  }, [existingCategories])

  const handleBulkAction = (status: ImportReconciliationItem['status'], action: 'keep' | 'skip') => {
    setReconciliationItems((prev) =>
      prev.map((item) =>
        item.status === status ? { ...item, action } : item
      )
    )
  }

  const handleClose = () => {
    setPreviewResult(null)
    setPendingBillName(null)
    setReconciliationItems([])
    setEditingItemId(null)
  }

  const handleConfirm = () => {
    const keepTransactions = reconciliationItems
      .filter((item) => item.action === 'keep' && item.status !== 'invalid')
      .map((item) => item.transaction)

    if (importMode === 'create') {
      confirmReconciliation(billName, keepTransactions, 'create')
    } else {
      confirmReconciliation('', keepTransactions, 'merge')
    }

    setPendingBillName(null)
    setReconciliationItems([])
    setEditingItemId(null)
  }

  const renderTabs = () => (
    <div className="flex gap-1 border-b border-slate-700/40 mb-5">
      {[
        { key: 'overview' as TabType, label: '概览', icon: Layers },
        { key: 'duplicates' as TabType, label: `重复记录 (${stats.duplicate})`, icon: Copy },
        { key: 'invalid' as TabType, label: `无效行 (${stats.invalid})`, icon: AlertCircle },
        { key: 'categories' as TabType, label: '分类汇总', icon: Tag },
      ].map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
            activeTab === key
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
          <p className="mt-0.5 text-xs text-slate-500">总行数</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.keep}</p>
          <p className="mt-0.5 text-xs text-slate-500">将导入</p>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-orange-400">{stats.skip}</p>
          <p className="mt-0.5 text-xs text-slate-500">将跳过</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.matched}</p>
          <p className="mt-0.5 text-xs text-slate-500">规则命中</p>
        </div>
      </div>

      {stats.newCategoryCount > 0 && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-violet-400" />
            <span className="text-sm font-medium text-violet-400">
              检测到 {stats.newCategoryCount} 个新分类
            </span>
          </div>
          <p className="mt-1.5 text-xs text-violet-400/80">
            新分类：{stats.newCategories.join('、')}
          </p>
        </div>
      )}

      {reconciliationItems.filter((i) => i.status !== 'invalid').length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-medium text-slate-300">交易明细</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('valid', 'keep')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                全部保留有效
              </button>
              <button
                onClick={() => handleBulkAction('duplicate', 'skip')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 transition-colors"
              >
                全部跳过重
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-700/40 max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0d1420]">
                <tr className="border-b border-slate-700/40">
                  <th className="px-3 py-2 font-medium text-slate-400">#</th>
                  <th className="px-3 py-2 font-medium text-slate-400">日期</th>
                  <th className="px-3 py-2 font-medium text-slate-400">类型</th>
                  <th className="px-3 py-2 font-medium text-slate-400">分类</th>
                  <th className="px-3 py-2 font-medium text-slate-400">商户</th>
                  <th className="px-3 py-2 font-medium text-slate-400">金额</th>
                  <th className="px-3 py-2 font-medium text-slate-400">状态</th>
                  <th className="px-3 py-2 font-medium text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationItems
                  .filter((i) => i.status !== 'invalid')
                  .slice(0, 50)
                  .map((item, i) => (
                    <tr
                      key={item.transaction.id}
                      className={cn(
                        'border-b border-slate-700/20 last:border-0',
                        item.action === 'skip' && 'opacity-50',
                        item.status === 'duplicate' && 'bg-orange-500/5'
                      )}
                    >
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 text-slate-300">{item.transaction.date}</td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: `${TRANSACTION_TYPE_COLORS[item.transaction.type]}20`,
                            color: TRANSACTION_TYPE_COLORS[item.transaction.type],
                          }}
                        >
                          {TRANSACTION_TYPE_LABELS[item.transaction.type]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {editingItemId === item.transaction.id ? (
                          <select
                            value={item.transaction.category}
                            onChange={(e) => handleItemCategoryChange(item.transaction.id, e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                            autoFocus
                          >
                            {existingCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              item.isNewCategory ? 'text-violet-400' : 'text-slate-300'
                            )}>
                              {item.transaction.category}
                            </span>
                            {item.isNewCategory && (
                              <Sparkles className="h-3 w-3 text-violet-400" />
                            )}
                            {item.matchedRuleKeyword && (
                              <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1 rounded">
                                规则: {item.matchedRuleKeyword}
                              </span>
                            )}
                            <button
                              onClick={() => setEditingItemId(item.transaction.id)}
                              className="ml-1 text-slate-500 hover:text-slate-300"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{item.transaction.merchant || '—'}</td>
                      <td
                        className="px-3 py-2 font-mono"
                        style={{ color: TRANSACTION_TYPE_COLORS[item.transaction.type] }}
                      >
                        {item.transaction.type === 'income' || item.transaction.type === 'refund' ? '+' : '-'}¥{item.transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        {item.status === 'duplicate' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
                            <Copy className="h-3 w-3" />
                            重复
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            有效
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleItemAction(item.transaction.id, 'keep')}
                            className={cn(
                              'p-1 rounded transition-colors',
                              item.action === 'keep'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                            )}
                            title="保留"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleItemAction(item.transaction.id, 'skip')}
                            className={cn(
                              'p-1 rounded transition-colors',
                              item.action === 'skip'
                                ? 'bg-slate-700/60 text-slate-400'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/40'
                            )}
                            title="跳过"
                          >
                            <SkipForward className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderDuplicates = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Copy className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium text-slate-300">
            共 {stats.duplicate} 条疑似重复记录
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleBulkAction('duplicate', 'keep')}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            全部保留
          </button>
          <button
            onClick={() => handleBulkAction('duplicate', 'skip')}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 transition-colors"
          >
            全部跳过
          </button>
        </div>
      </div>

      {reconciliationItems.filter((i) => i.status === 'duplicate').length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          没有检测到重复记录
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/40 max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0d1420]">
              <tr className="border-b border-slate-700/40">
                <th className="px-3 py-2 font-medium text-slate-400">#</th>
                <th className="px-3 py-2 font-medium text-slate-400">日期</th>
                <th className="px-3 py-2 font-medium text-slate-400">分类</th>
                <th className="px-3 py-2 font-medium text-slate-400">商户</th>
                <th className="px-3 py-2 font-medium text-slate-400">金额</th>
                <th className="px-3 py-2 font-medium text-slate-400">当前选择</th>
                <th className="px-3 py-2 font-medium text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {reconciliationItems
                .filter((i) => i.status === 'duplicate')
                .map((item, i) => (
                  <tr
                    key={item.transaction.id}
                    className={cn(
                      'border-b border-slate-700/20 last:border-0',
                      item.action === 'skip' && 'opacity-50'
                    )}
                  >
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2 text-slate-300">{item.transaction.date}</td>
                    <td className="px-3 py-2 text-slate-300">{item.transaction.category}</td>
                    <td className="px-3 py-2 text-slate-300">{item.transaction.merchant || '—'}</td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      ¥{item.transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                        item.action === 'keep'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-700/50 text-slate-400'
                      )}>
                        {item.action === 'keep' ? '保留' : '跳过'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleItemAction(item.transaction.id, 'keep')}
                          className={cn(
                            'p-1 rounded transition-colors',
                            item.action === 'keep'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                          )}
                          title="保留"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleItemAction(item.transaction.id, 'skip')}
                          className={cn(
                            'p-1 rounded transition-colors',
                            item.action === 'skip'
                              ? 'bg-slate-700/60 text-slate-400'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/40'
                          )}
                          title="跳过"
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderInvalid = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-medium text-slate-300">
          共 {stats.invalid} 条无效记录（将自动跳过）
        </span>
      </div>

      {reconciliationItems.filter((i) => i.status === 'invalid').length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          没有无效记录
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/40 max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0d1420]">
              <tr className="border-b border-slate-700/40">
                <th className="px-3 py-2 font-medium text-slate-400">#</th>
                <th className="px-3 py-2 font-medium text-slate-400">原始数据</th>
                <th className="px-3 py-2 font-medium text-slate-400">无效原因</th>
              </tr>
            </thead>
            <tbody>
              {reconciliationItems
                .filter((i) => i.status === 'invalid')
                .map((item, i) => (
                  <tr
                    key={item.transaction.id}
                    className="border-b border-slate-700/20 last:border-0 bg-red-500/5"
                  >
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2 text-slate-400 font-mono text-[10px] max-w-md truncate">
                      {item.rawRow ? JSON.stringify(item.rawRow) : '未知'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                        <XCircle className="h-3 w-3" />
                        {item.invalidReason}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderCategories = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium text-slate-300">
          分类汇总（共 {categorySummaries.length} 个分类）
        </span>
      </div>

      {categorySummaries.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          暂无分类数据
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categorySummaries.map((summary) => (
            <div
              key={summary.category}
              className={cn(
                'rounded-xl border px-4 py-3',
                summary.isNew
                  ? 'border-violet-500/30 bg-violet-500/5'
                  : 'border-slate-700/40 bg-slate-800/30'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    summary.isNew ? 'text-violet-400' : 'text-slate-300'
                  )}>
                    {summary.category}
                  </span>
                  {summary.isNew && (
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  )}
                </div>
                <span className="font-mono text-sm text-slate-200">
                  ¥{summary.amount.toFixed(2)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {summary.count} 笔交易
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-4xl rounded-2xl border border-slate-700/50 bg-[#0d1420] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">导入对账工作台</h2>
              <p className="text-xs text-slate-500">逐项确认后再写入账单</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="mb-5">
            <h3 className="mb-2.5 text-sm font-medium text-slate-300">列名映射</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {FIELD_FIELDS.map((field) => {
                const colName = userMappings[field]
                const isRequired = field === 'date' || field === 'amount'
                return (
                  <div key={field}>
                    <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      {FIELD_LABELS[field]}
                      {isRequired && <span className="ml-1 text-red-400">*</span>}
                    </label>
                    <div className="relative">
                      <select
                        value={colName ?? ''}
                        onChange={(e) => handleMappingChange(field, e.target.value)}
                        className={cn(
                          'w-full appearance-none rounded-lg border px-3 py-2 text-sm font-medium outline-none transition-colors',
                          colName
                            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                            : isRequired
                              ? 'border-red-500/30 bg-red-500/5 text-red-400'
                              : 'border-slate-700/40 bg-slate-800/30 text-slate-400',
                        )}
                      >
                        <option value="" className="bg-[#0d1420] text-slate-500">
                          不使用
                        </option>
                        {previewResult.headers.map((header) => (
                          <option key={header} value={header} className="bg-[#0d1420] text-slate-200">
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {hasCurrentBill && (
            <div className="mb-5">
              <h3 className="mb-2.5 text-sm font-medium text-slate-300">导入方式</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode('create')}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                    importMode === 'create'
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600/50',
                  )}
                >
                  <div className={cn(
                    'mt-0.5 rounded-lg p-1.5',
                    importMode === 'create' ? 'bg-emerald-500/15' : 'bg-slate-700/50',
                  )}>
                    <Plus className={cn('h-4 w-4', importMode === 'create' ? 'text-emerald-400' : 'text-slate-400')} />
                  </div>
                  <div>
                    <p className={cn('text-sm font-medium', importMode === 'create' ? 'text-emerald-400' : 'text-slate-300')}>
                      创建新账单
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      导入为一份独立的账单，与现有数据互不影响
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                    importMode === 'merge'
                      ? 'border-blue-500/50 bg-blue-500/5'
                      : 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600/50',
                  )}
                >
                  <div className={cn(
                    'mt-0.5 rounded-lg p-1.5',
                    importMode === 'merge' ? 'bg-blue-500/15' : 'bg-slate-700/50',
                  )}>
                    <Merge className={cn('h-4 w-4', importMode === 'merge' ? 'text-blue-400' : 'text-slate-400')} />
                  </div>
                  <div>
                    <p className={cn('text-sm font-medium', importMode === 'merge' ? 'text-blue-400' : 'text-slate-300')}>
                      合并到当前账单
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      追加到「{currentBill?.name}」，可手动选择保留或跳过
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {hasRequired && reconciliationItems.length > 0 && renderTabs()}

          {hasRequired && reconciliationItems.length > 0 && (
            <div>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'duplicates' && renderDuplicates()}
              {activeTab === 'invalid' && renderInvalid()}
              {activeTab === 'categories' && renderCategories()}
            </div>
          )}

          {!hasRequired && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-400 mb-3" />
              <p className="text-sm text-slate-400">请先选择日期和金额对应的列</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-700/40 px-6 py-4">
          {importMode === 'create' && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">账单名称</label>
              <input
                type="text"
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
                placeholder="请输入账单名称"
                maxLength={50}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-emerald-500/50 focus:bg-slate-800/80"
              />
            </div>
          )}
          {importMode === 'merge' && (
            <div className="mb-4">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <p className="text-xs text-blue-400">
                  将追加 {stats.keep} 条记录到「{currentBill?.name}」，现有 {currentBill?.transactions.length ?? 0} 条记录保留不变
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              className="rounded-xl bg-slate-700/40 px-5 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/60"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all',
                !canConfirm
                  ? 'cursor-not-allowed bg-slate-700/30 text-slate-600'
                  : importMode === 'create'
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
              )}
            >
              {importMode === 'create' ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Merge className="h-4 w-4" />
              )}
              {importMode === 'create'
                ? `创建账单（${stats.keep} 条）`
                : `确认导入（${stats.keep} 条）`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
