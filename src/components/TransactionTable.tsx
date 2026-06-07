import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Edit3, Check, X, PenTool } from 'lucide-react'
import { useDashboardStore, useTransactions, useFilter } from '@/store/useDashboardStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { applyFilter, formatCurrency } from '@/utils/dataAggregation'
import { getCategoryColor, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '@/types'
import type { TransactionType } from '@/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

function getTypeColor(type: TransactionType): string {
  return TRANSACTION_TYPE_COLORS[type]
}

function parseAmountInput(value: string): number | null {
  if (value === '') return null
  const n = Number(value)
  return isNaN(n) || n < 0 ? null : n
}

export default function TransactionTable() {
  const transactions = useTransactions()
  const filter = useFilter()
  const setFilter = useDashboardStore((s) => s.setFilter)
  const updateTransactionCategory = useDashboardStore((s) => s.updateTransactionCategory)
  const categories = useCategoryStore((s) => s.categories)
  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories])

  const filtered = useMemo(() => applyFilter(transactions, filter), [transactions, filter])
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered])

  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const pageData = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')

  const [localSearch, setLocalSearch] = useState(filter.searchText)
  const [localMin, setLocalMin] = useState(filter.amountMin !== null ? String(filter.amountMin) : '')
  const [localMax, setLocalMax] = useState(filter.amountMax !== null ? String(filter.amountMax) : '')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>()
  const minDebounceRef = useRef<ReturnType<typeof setTimeout>>()
  const maxDebounceRef = useRef<ReturnType<typeof setTimeout>>()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const minInputRef = useRef<HTMLInputElement>(null)
  const maxInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPage(0)
  }, [filter.selectedCategory, filter.selectedMonth, filter.selectedDate, filter.selectedMerchant, filter.selectedType, filter.searchText, filter.amountMin, filter.amountMax])

  useEffect(() => {
    const focused = document.activeElement
    if (focused !== searchInputRef.current) {
      setLocalSearch(filter.searchText)
    }
    if (focused !== minInputRef.current) {
      setLocalMin(filter.amountMin !== null ? String(filter.amountMin) : '')
    }
    if (focused !== maxInputRef.current) {
      setLocalMax(filter.amountMax !== null ? String(filter.amountMax) : '')
    }
  }, [filter.searchText, filter.amountMin, filter.amountMax])

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setFilter({ searchText: value })
    }, 300)
  }

  const handleMinChange = (value: string) => {
    setLocalMin(value)
    clearTimeout(minDebounceRef.current)
    minDebounceRef.current = setTimeout(() => {
      setFilter({ amountMin: parseAmountInput(value) })
    }, 300)
  }

  const handleMaxChange = (value: string) => {
    setLocalMax(value)
    clearTimeout(maxDebounceRef.current)
    maxDebounceRef.current = setTimeout(() => {
      setFilter({ amountMax: parseAmountInput(value) })
    }, 300)
  }

  const handleCategoryClick = (cat: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const next = filter.selectedCategory === cat ? null : cat
    setFilter({ selectedCategory: next })
  }

  const handleMerchantClick = (merchant: string) => {
    const next = filter.selectedMerchant === merchant ? null : merchant
    setFilter({ selectedMerchant: next })
  }

  const handleStartEditCategory = (txId: string, currentCategory: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTxId(txId)
    setEditCategory(currentCategory)
  }

  const handleSaveEditCategory = (txId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!editCategory.trim()) return
    updateTransactionCategory(txId, editCategory.trim(), true)
    setEditingTxId(null)
    setEditCategory('')
  }

  const handleCancelEditCategory = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTxId(null)
    setEditCategory('')
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-4">
        <h3 className="text-sm font-medium text-slate-300">交易明细</h3>
        <span className="text-xs text-slate-500">共 {filtered.length} 条</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-700/30 px-5 py-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="搜索商户、分类或日期…"
            className="w-full rounded-lg border border-slate-700/50 bg-slate-900/50 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-600 transition-colors focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>金额</span>
          <input
            ref={minInputRef}
            type="number"
            min="0"
            step="0.01"
            value={localMin}
            onChange={(e) => handleMinChange(e.target.value)}
            placeholder="最低"
            className="w-20 rounded-lg border border-slate-700/50 bg-slate-900/50 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 transition-colors focus:border-cyan-500/50 focus:outline-none"
          />
          <span className="text-slate-600">~</span>
          <input
            ref={maxInputRef}
            type="number"
            min="0"
            step="0.01"
            value={localMax}
            onChange={(e) => handleMaxChange(e.target.value)}
            placeholder="最高"
            className="w-20 rounded-lg border border-slate-700/50 bg-slate-900/50 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 transition-colors focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/30 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">日期</th>
              <th className="px-5 py-3 font-medium">类型</th>
              <th className="px-5 py-3 font-medium">分类</th>
              <th className="px-5 py-3 font-medium">商户</th>
              <th className="px-5 py-3 text-right font-medium">金额</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((t) => (
              <tr key={t.id} className="border-b border-slate-700/20 transition-colors hover:bg-slate-700/20">
                <td className="px-5 py-3 text-slate-300">{t.date}</td>
                <td className="px-5 py-3">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs"
                    style={{ backgroundColor: `${getTypeColor(t.type)}20`, color: getTypeColor(t.type) }}
                  >
                    {TRANSACTION_TYPE_LABELS[t.type]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {editingTxId === t.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="rounded-md border border-slate-600/40 bg-slate-900/80 px-2 py-1 text-xs text-slate-200 outline-none"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      >
                        {categoryNames.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        onClick={(e) => handleSaveEditCategory(t.id, e)}
                        className="rounded-md p-1 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                        title="保存"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleCancelEditCategory}
                        className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                        title="取消"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleCategoryClick(t.category, e)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs transition-colors hover:opacity-80',
                          t.isManualCategory && 'ring-1 ring-amber-500/40',
                        )}
                        style={{ backgroundColor: `${getCategoryColor(t.category, 0)}20`, color: getCategoryColor(t.category, 0) }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(t.category, 0) }} />
                        {t.category}
                        {t.isManualCategory && (
                          <PenTool className="h-3 w-3 text-amber-400" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleStartEditCategory(t.id, t.category, e)}
                        className="rounded-md p-1 text-slate-600 transition-colors hover:bg-slate-700/50 hover:text-slate-400"
                        title="编辑分类"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="max-w-[200px] px-5 py-3">
                  <button
                    onClick={() => handleMerchantClick(t.merchant)}
                    className={`truncate text-xs transition-colors hover:text-violet-300 ${filter.selectedMerchant === t.merchant ? 'text-violet-400' : 'text-slate-400'}`}
                  >
                    {t.merchant || '-'}
                  </button>
                </td>
                <td className="px-5 py-3 text-right font-mono" style={{ color: getTypeColor(t.type) }}>
                  {t.type === 'income' || t.type === 'refund' ? '+' : '-'}¥{formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-700/50 px-5 py-3">
          <span className="text-xs text-slate-500">
            第 {safePage + 1} / {totalPages} 页
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
