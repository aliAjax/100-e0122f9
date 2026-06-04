import { useState, useMemo, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '@/types'
import { parseRows, type MappedColumns } from '@/utils/csvParser'

const FIELD_LABELS: Record<string, string> = {
  date: '日期',
  category: '分类',
  merchant: '商户',
  amount: '金额',
  type: '类型',
}

const FIELD_FIELDS = ['date', 'amount', 'type', 'category', 'merchant'] as const

export default function CSVPreviewModal() {
  const previewResult = useDashboardStore((s) => s.previewResult)
  const pendingBillName = useDashboardStore((s) => s.pendingBillName)
  const setPreviewResult = useDashboardStore((s) => s.setPreviewResult)
  const setPendingBillName = useDashboardStore((s) => s.setPendingBillName)
  const confirmPreview = useDashboardStore((s) => s.confirmPreview)
  const bills = useDashboardStore((s) => s.bills)

  const [billName, setBillName] = useState(pendingBillName || `账单 ${bills.length + 1}`)
  const [userMappings, setUserMappings] = useState<MappedColumns>(() =>
    previewResult ? { ...previewResult.mappedColumns } : { date: null, category: null, merchant: null, amount: null, type: null }
  )

  useEffect(() => {
    if (previewResult) {
      setUserMappings({ ...previewResult.mappedColumns })
      setBillName(pendingBillName || `账单 ${bills.length + 1}`)
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
      }
    }
    const { transactions, invalidCount, invalidReasons } = parseRows(
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
      previewRows: transactions.slice(0, 10),
      allTransactions: transactions,
    }
  }, [userMappings, previewResult])

  if (!previewResult) return null

  const hasError = parsedResult.validCount === 0 && parsedResult.invalidReasons.length > 0
  const hasRequired = userMappings.date !== null && userMappings.amount !== null

  const handleMappingChange = (field: keyof MappedColumns, value: string) => {
    setUserMappings((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-3xl rounded-2xl border border-slate-700/50 bg-[#0d1420] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">CSV 导入预览</h2>
              <p className="text-xs text-slate-500">确认数据后再导入仪表盘</p>
            </div>
          </div>
          <button
            onClick={() => setPreviewResult(null)}
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
            <p className="mt-3 text-xs text-slate-500">
              全部可用列：{previewResult.headers.length > 0 ? previewResult.headers.join('、') : '（无）'}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-slate-100">{previewResult.totalRows}</p>
              <p className="mt-0.5 text-xs text-slate-500">总行数</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{parsedResult.validCount}</p>
              <p className="mt-0.5 text-xs text-slate-500">有效记录</p>
            </div>
            <div className={cn(
              'rounded-xl border px-4 py-3 text-center',
              parsedResult.invalidCount > 0
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-slate-700/40 bg-slate-800/30',
            )}>
              <p className={cn('text-2xl font-bold', parsedResult.invalidCount > 0 ? 'text-amber-400' : 'text-slate-100')}>
                {parsedResult.invalidCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">无效行</p>
            </div>
          </div>

          {parsedResult.invalidReasons.length > 0 && (
            <div className={cn(
              'mb-5 rounded-xl border px-4 py-3',
              hasError
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-amber-500/30 bg-amber-500/5',
            )}>
              <div className="flex items-center gap-2">
                {hasError ? (
                  <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                )}
                <span className={cn('text-sm font-medium', hasError ? 'text-red-400' : 'text-amber-400')}>
                  {hasError ? '解析失败' : '部分行已跳过'}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {parsedResult.invalidReasons.map((reason, i) => (
                  <li key={i} className={cn('text-xs', hasError ? 'text-red-400/80' : 'text-amber-400/80')}>
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsedResult.previewRows.length > 0 && (
            <div>
              <h3 className="mb-2.5 text-sm font-medium text-slate-300">
                数据预览
                <span className="ml-2 text-xs font-normal text-slate-500">
                  前 {parsedResult.previewRows.length} 条
                </span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-700/40">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/40 bg-slate-800/50">
                      <th className="px-3 py-2 font-medium text-slate-400">#</th>
                      <th className="px-3 py-2 font-medium text-slate-400">日期</th>
                      <th className="px-3 py-2 font-medium text-slate-400">类型</th>
                      <th className="px-3 py-2 font-medium text-slate-400">分类</th>
                      <th className="px-3 py-2 font-medium text-slate-400">商户</th>
                      <th className="px-3 py-2 font-medium text-slate-400">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResult.previewRows.map((tx, i) => (
                      <tr key={tx.id} className="border-b border-slate-700/20 last:border-0">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-300">{tx.date}</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px]"
                            style={{
                              backgroundColor: `${TRANSACTION_TYPE_COLORS[tx.type]}20`,
                              color: TRANSACTION_TYPE_COLORS[tx.type],
                            }}
                          >
                            {TRANSACTION_TYPE_LABELS[tx.type]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-300">{tx.category}</td>
                        <td className="px-3 py-2 text-slate-300">{tx.merchant || '—'}</td>
                        <td
                          className="px-3 py-2 font-mono"
                          style={{ color: TRANSACTION_TYPE_COLORS[tx.type] }}
                        >
                          {tx.type === 'income' || tx.type === 'refund' ? '+' : '-'}¥{tx.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-700/40 px-6 py-4">
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
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setPreviewResult(null)
                setPendingBillName(null)
              }}
              className="rounded-xl bg-slate-700/40 px-5 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/60"
            >
              取消
            </button>
            <button
              onClick={() => {
                confirmPreview(billName, userMappings)
                setPendingBillName(null)
              }}
              disabled={hasError || !billName.trim() || !hasRequired}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all',
                hasError || !billName.trim() || !hasRequired
                  ? 'cursor-not-allowed bg-slate-700/30 text-slate-600'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
              )}
            >
              <CheckCircle className="h-4 w-4" />
              确认导入{parsedResult.validCount > 0 ? `（${parsedResult.validCount} 条）` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
