import { CheckCircle, XCircle, AlertTriangle, X, FileSpreadsheet } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'

const FIELD_LABELS: Record<string, string> = {
  date: '日期',
  category: '分类',
  merchant: '商户',
  amount: '金额',
}

export default function CSVPreviewModal() {
  const previewResult = useDashboardStore((s) => s.previewResult)
  const setPreviewResult = useDashboardStore((s) => s.setPreviewResult)
  const confirmPreview = useDashboardStore((s) => s.confirmPreview)

  if (!previewResult) return null

  const hasError = previewResult.validCount === 0 && previewResult.invalidReasons.length > 0

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
            <h3 className="mb-2.5 text-sm font-medium text-slate-300">识别到的列名</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['date', 'amount', 'category', 'merchant'] as const).map((field) => {
                const colName = previewResult.mappedColumns[field]
                return (
                  <div
                    key={field}
                    className={cn(
                      'rounded-lg border px-3 py-2',
                      colName
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : field === 'date' || field === 'amount'
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-slate-700/40 bg-slate-800/30',
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{FIELD_LABELS[field]}</p>
                    <p className={cn('mt-0.5 text-sm font-medium', colName ? 'text-emerald-400' : 'text-slate-600')}>
                      {colName ?? '未识别'}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              全部列：{previewResult.headers.length > 0 ? previewResult.headers.join('、') : '（无）'}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-slate-100">{previewResult.totalRows}</p>
              <p className="mt-0.5 text-xs text-slate-500">总行数</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{previewResult.validCount}</p>
              <p className="mt-0.5 text-xs text-slate-500">有效记录</p>
            </div>
            <div className={cn(
              'rounded-xl border px-4 py-3 text-center',
              previewResult.invalidCount > 0
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-slate-700/40 bg-slate-800/30',
            )}>
              <p className={cn('text-2xl font-bold', previewResult.invalidCount > 0 ? 'text-amber-400' : 'text-slate-100')}>
                {previewResult.invalidCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">无效行</p>
            </div>
          </div>

          {previewResult.invalidReasons.length > 0 && (
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
                {previewResult.invalidReasons.map((reason, i) => (
                  <li key={i} className={cn('text-xs', hasError ? 'text-red-400/80' : 'text-amber-400/80')}>
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {previewResult.previewRows.length > 0 && (
            <div>
              <h3 className="mb-2.5 text-sm font-medium text-slate-300">
                数据预览
                <span className="ml-2 text-xs font-normal text-slate-500">
                  前 {previewResult.previewRows.length} 条
                </span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-700/40">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/40 bg-slate-800/50">
                      <th className="px-3 py-2 font-medium text-slate-400">#</th>
                      <th className="px-3 py-2 font-medium text-slate-400">日期</th>
                      <th className="px-3 py-2 font-medium text-slate-400">分类</th>
                      <th className="px-3 py-2 font-medium text-slate-400">商户</th>
                      <th className="px-3 py-2 font-medium text-slate-400">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.previewRows.map((tx, i) => (
                      <tr key={tx.id} className="border-b border-slate-700/20 last:border-0">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-300">{tx.date}</td>
                        <td className="px-3 py-2 text-slate-300">{tx.category}</td>
                        <td className="px-3 py-2 text-slate-300">{tx.merchant || '—'}</td>
                        <td className="px-3 py-2 text-emerald-400">¥{tx.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-700/40 px-6 py-4">
          <button
            onClick={() => setPreviewResult(null)}
            className="rounded-xl bg-slate-700/40 px-5 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/60"
          >
            取消
          </button>
          <button
            onClick={confirmPreview}
            disabled={hasError}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all',
              hasError
                ? 'cursor-not-allowed bg-slate-700/30 text-slate-600'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
            )}
          >
            <CheckCircle className="h-4 w-4" />
            确认导入{previewResult.validCount > 0 ? `（${previewResult.validCount} 条）` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
