import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { applyFilter, formatCurrency } from '@/utils/dataAggregation'
import { getCategoryColor } from '@/types'

const PAGE_SIZE = 20

export default function TransactionTable() {
  const transactions = useDashboardStore((s) => s.transactions)
  const filter = useDashboardStore((s) => s.filter)
  const setFilter = useDashboardStore((s) => s.setFilter)

  const filtered = useMemo(() => applyFilter(transactions, filter), [transactions, filter])
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered])

  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleCategoryClick = (cat: string) => {
    const next = filter.selectedCategory === cat ? null : cat
    setFilter({ selectedCategory: next })
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-4">
        <h3 className="text-sm font-medium text-slate-300">交易明细</h3>
        <span className="text-xs text-slate-500">共 {filtered.length} 条</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/30 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">日期</th>
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
                  <button
                    onClick={() => handleCategoryClick(t.category)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs transition-colors hover:opacity-80"
                    style={{ backgroundColor: `${getCategoryColor(t.category, 0)}20`, color: getCategoryColor(t.category, 0) }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(t.category, 0) }} />
                    {t.category}
                  </button>
                </td>
                <td className="max-w-[200px] truncate px-5 py-3 text-slate-400">{t.merchant || '-'}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-200">¥{formatCurrency(t.amount)}</td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
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
            第 {page + 1} / {totalPages} 页
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
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
