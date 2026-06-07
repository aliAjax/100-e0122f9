import React from 'react'
import {
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Copy,
} from 'lucide-react'
import {
  useMergeMode,
  useMergeAnalysisResult,
  useBudgetMergeResult,
  useMergeDedupeEnabled,
  useDashboardStore,
} from '@/store/useDashboardStore'

export function MergeInfoPanel() {
  const mergeMode = useMergeMode()
  const analysisResult = useMergeAnalysisResult()
  const budgetResult = useBudgetMergeResult()
  const dedupeEnabled = useMergeDedupeEnabled()
  const setMergeDedupeEnabled = useDashboardStore((s) => s.setMergeDedupeEnabled)
  const [expanded, setExpanded] = React.useState(false)

  if (!mergeMode) return null

  const uniqueCount = analysisResult?.uniqueTransactions.length ?? 0
  const duplicateCount = analysisResult?.duplicateCount ?? 0
  const totalCount = analysisResult?.totalCount ?? 0

  const hasBudgetIssues = budgetResult?.hasConflicts ?? false
  const missingBudgetCategories = budgetResult?.categoriesWithConflicts ?? []

  return (
    <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-purple-500/15 p-2">
            <Layers className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-purple-100">合并分析模式</h3>
            <p className="text-xs text-purple-300/70">
              {analysisResult?.billInfo.length ?? 0} 份账单合并 ·{' '}
              {dedupeEnabled ? `已去重 ${uniqueCount} 条` : `${totalCount} 条未去重`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-1.5 text-purple-300/70 hover:bg-purple-500/10 hover:text-purple-200"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-purple-300" />
                <span className="text-xs text-purple-200">跨账单去重</span>
              </div>
              <button
                onClick={() => setMergeDedupeEnabled(!dedupeEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  dedupeEnabled ? 'bg-purple-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    dedupeEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/5 p-2 text-center">
                <div className="text-lg font-semibold text-purple-100">
                  {totalCount}
                </div>
                <div className="text-[10px] text-purple-300/70">原始总数</div>
              </div>
              <div className="rounded-lg bg-white/5 p-2 text-center">
                <div className="text-lg font-semibold text-orange-400">
                  {duplicateCount}
                </div>
                <div className="text-[10px] text-purple-300/70">重复数量</div>
              </div>
              <div className="rounded-lg bg-white/5 p-2 text-center">
                <div className="text-lg font-semibold text-emerald-400">
                  {uniqueCount}
                </div>
                <div className="text-[10px] text-purple-300/70">去重后</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-300" />
              <span className="text-xs text-purple-200">预算口径</span>
            </div>
            {hasBudgetIssues ? (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-orange-200">
                    {missingBudgetCategories.length} 个分类未设置全局预算
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {missingBudgetCategories.slice(0, 5).map((cat) => (
                    <span
                      key={cat}
                      className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-200"
                    >
                      {cat}
                    </span>
                  ))}
                  {missingBudgetCategories.length > 5 && (
                    <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-200">
                      +{missingBudgetCategories.length - 5}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-orange-200/70">
                  当前预算为全局设置，合并分析不会判断账单级预算差异。
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs leading-relaxed text-emerald-200">
                  使用全局预算口径统计合并交易
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-300" />
              <span className="text-xs text-purple-200">包含的账单</span>
            </div>
            <div className="space-y-1">
              {analysisResult?.billInfo.map((info) => (
                <div
                  key={info.billId}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5"
                >
                  <span className="text-xs text-purple-200">{info.billName}</span>
                  <span className="text-[10px] text-purple-300/70">
                    {info.transactionCount} 条
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 text-purple-400" />
              <div className="text-[11px] text-purple-300/80 leading-relaxed">
                合并模式下禁用编辑分类、保存视图等修改操作。退出合并后所有状态自动恢复。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
