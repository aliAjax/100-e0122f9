import { useState } from 'react'
import { X, Check, AlertTriangle, ArrowRight, Wallet, PieChart, ListChecks, Store, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import type { RulePreviewResult, CategoryRule, MultiRuleMatch } from '@/types'
import { getCategoryColor } from '@/types'
import { formatCurrency } from '@/utils/dataAggregation'
import { cn } from '@/lib/utils'

type TabType = 'transactions' | 'categories' | 'budget' | 'multiRule'
type ApplyScope = 'current' | 'all'

interface Props {
  open: boolean
  onClose: () => void
  previewResult: RulePreviewResult | null
  rules: CategoryRule[]
  isLoading: boolean
  onApply: (scope: ApplyScope) => void
  onScopeChange?: (scope: ApplyScope) => void
}

export default function RulePreviewModal({
  open,
  onClose,
  previewResult,
  isLoading,
  onApply,
  onScopeChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('transactions')
  const [applyScope, setApplyScope] = useState<ApplyScope>('current')
  const [expandedMultiMatch, setExpandedMultiMatch] = useState<string | null>(null)

  if (!open || !previewResult) return null

  const currentPreviewScope = previewResult.scope

  const handlePreviewScopeChange = (scope: ApplyScope) => {
    onScopeChange?.(scope)
  }

  const tabs: Array<{ key: TabType; label: string; icon: React.ElementType; count?: number; badge?: string }> = [
    { key: 'transactions', label: '受影响交易', icon: ListChecks, count: previewResult.totalAffected },
    { key: 'categories', label: '分类变化', icon: PieChart, count: previewResult.categoryChanges.length },
    { key: 'budget', label: '预算影响', icon: Wallet, count: previewResult.budgetImpacts.length },
    {
      key: 'multiRule',
      label: '多规则命中',
      icon: Layers,
      count: previewResult.multiRuleMatches.length,
      badge: previewResult.multiRuleMatches.length > 0 ? '警告' : undefined,
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-4xl rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/15 p-2">
              <PieChart className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">规则回放预览</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                查看规则变更对数据的影响
                {previewResult.billCount && (
                  <span className="ml-1 text-purple-400">
                    （预览范围：{currentPreviewScope === 'all' ? `全部 ${previewResult.billCount} 个账单` : '当前账单'}）
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {previewResult && (
          <>
            <div className="px-6 pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreviewScopeChange('current')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-left transition-colors',
                    currentPreviewScope === 'current'
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-slate-700/30 bg-slate-800/30 hover:bg-slate-800/50',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium',
                    currentPreviewScope === 'current' ? 'text-purple-300' : 'text-slate-400',
                  )}>
                    👁️ 预览：当前账单
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">只预览当前账单的影响</div>
                </button>
                <button
                  onClick={() => handlePreviewScopeChange('all')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-left transition-colors',
                    currentPreviewScope === 'all'
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-slate-700/30 bg-slate-800/30 hover:bg-slate-800/50',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium',
                    currentPreviewScope === 'all' ? 'text-purple-300' : 'text-slate-400',
                  )}>
                    👁️ 预览：全部账单
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">预览所有账单的影响</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 px-6 py-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <div className="text-xs text-emerald-400/80">将更新分类</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-400">{previewResult.totalAffected}</div>
                <div className="text-[11px] text-emerald-400/60">条交易记录</div>
              </div>
              <div className="rounded-xl border border-slate-600/20 bg-slate-700/10 px-4 py-3">
                <div className="text-xs text-slate-400/80">保持不变</div>
                <div className="mt-1 text-2xl font-semibold text-slate-300">{previewResult.totalUnchanged}</div>
                <div className="text-[11px] text-slate-500">条交易记录</div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <div className="text-xs text-amber-400/80">手动分类跳过</div>
                <div className="mt-1 text-2xl font-semibold text-amber-400">{previewResult.totalManualSkipped}</div>
                <div className="text-[11px] text-amber-400/60">条记录不自动覆盖</div>
              </div>
            </div>

            {previewResult.multiRuleMatches.length > 0 && (
              <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                <div className="text-xs text-orange-300/90">
                  检测到 <span className="font-medium text-orange-400">{previewResult.multiRuleMatches.length}</span> 个商户匹配了多条规则，
                  将按规则顺序取第一条生效。建议在「多规则命中」标签页查看详情并调整规则顺序。
                </div>
              </div>
            )}

            <div className="flex gap-1 border-b border-slate-700/40 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors',
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300',
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px]',
                      activeTab === tab.key ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700/50 text-slate-400',
                      tab.badge && 'bg-orange-500/20 text-orange-400',
                    )}>
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-medium text-orange-400">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="max-h-[40vh] overflow-y-auto px-6 py-4">
              {activeTab === 'transactions' && (
                <div className="flex flex-col gap-2">
                  {previewResult.affectedTransactions.length === 0 ? (
                    <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-6 py-8 text-center">
                      <Store className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      <p className="text-sm text-slate-500">没有交易受此规则影响</p>
                    </div>
                  ) : (
                    previewResult.affectedTransactions.slice(0, 50).map((item) => (
                      <div
                        key={item.transaction.id}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border px-4 py-3',
                          item.hasMultipleMatches
                            ? 'border-orange-500/30 bg-orange-500/5'
                            : 'border-slate-700/30 bg-slate-800/30',
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200 truncate">{item.transaction.merchant}</span>
                            {item.hasMultipleMatches && (
                              <span className="shrink-0 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] text-orange-400">
                                多规则命中
                              </span>
                            )}
                            {item.matchedRuleKeyword && (
                              <span className="shrink-0 rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10px] text-purple-400">
                                匹配: {item.matchedRuleKeyword}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{item.transaction.date}</div>
                        </div>
                        <div className="shrink-0 text-right font-mono text-sm text-slate-200">
                          ¥{formatCurrency(item.transaction.amount)}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: getCategoryColor(item.originalCategory, 0) }}
                            />
                            <span className="text-xs text-slate-400">{item.originalCategory}</span>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: getCategoryColor(item.newCategory, 0) }}
                            />
                            <span className="text-xs font-medium text-slate-200">{item.newCategory}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {previewResult.affectedTransactions.length > 50 && (
                    <div className="text-center text-xs text-slate-500 py-2">
                      仅显示前 50 条，共 {previewResult.affectedTransactions.length} 条受影响交易
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="flex flex-col gap-2">
                  {previewResult.categoryChanges.length === 0 ? (
                    <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-6 py-8 text-center">
                      <PieChart className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      <p className="text-sm text-slate-500">分类统计无变化</p>
                    </div>
                  ) : (
                    previewResult.categoryChanges.map((change) => (
                      <div
                        key={change.category}
                        className="flex items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-800/30 px-4 py-3"
                      >
                        <div
                          className="h-8 w-8 shrink-0 rounded-lg"
                          style={{ backgroundColor: getCategoryColor(change.category, 0) + '30' }}
                        >
                          <div
                            className="h-full w-full flex items-center justify-center"
                          >
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: getCategoryColor(change.category, 0) }}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-200">{change.category}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {change.originalCount} 笔 → {change.newCount} 笔
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500">金额变化</div>
                          <div className={cn(
                            'text-sm font-mono font-medium',
                            change.changeAmount > 0 ? 'text-emerald-400' : change.changeAmount < 0 ? 'text-red-400' : 'text-slate-400',
                          )}>
                            {change.changeAmount > 0 ? '+' : ''}¥{formatCurrency(change.changeAmount)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-600">
                            ¥{formatCurrency(change.originalAmount)} → ¥{formatCurrency(change.newAmount)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'budget' && (
                <div className="flex flex-col gap-2">
                  {previewResult.budgetImpacts.length === 0 ? (
                    <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-6 py-8 text-center">
                      <Wallet className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      <p className="text-sm text-slate-500">暂无预算配置或无预算影响</p>
                    </div>
                  ) : (
                    previewResult.budgetImpacts.map((impact) => {
                      const originalPct = Math.min(impact.originalRatio * 100, 100)
                      const newPct = Math.min(impact.newRatio * 100, 100)
                      const getRatioColor = (ratio: number) => {
                        if (ratio >= 1) return '#EF4444'
                        if (ratio >= 0.8) return '#F59E0B'
                        return '#10B981'
                      }
                      return (
                        <div
                          key={impact.category}
                          className="rounded-xl border border-slate-700/30 bg-slate-800/30 px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: getCategoryColor(impact.category, 0) }}
                              />
                              <span className="text-sm font-medium text-slate-200">{impact.category}</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              预算: ¥{formatCurrency(impact.budget)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="mb-1 flex justify-between text-[11px]">
                                <span className="text-slate-500">原使用</span>
                                <span
                                  className="font-mono"
                                  style={{ color: getRatioColor(impact.originalRatio) }}
                                >
                                  ¥{formatCurrency(impact.originalSpent)} ({Math.round(impact.originalRatio * 100)}%)
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${originalPct}%`,
                                    backgroundColor: getRatioColor(impact.originalRatio),
                                  }}
                                />
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-600" />
                            <div className="flex-1">
                              <div className="mb-1 flex justify-between text-[11px]">
                                <span className="text-slate-500">应用后</span>
                                <span
                                  className="font-mono"
                                  style={{ color: getRatioColor(impact.newRatio) }}
                                >
                                  ¥{formatCurrency(impact.newSpent)} ({Math.round(impact.newRatio * 100)}%)
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${newPct}%`,
                                    backgroundColor: getRatioColor(impact.newRatio),
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {activeTab === 'multiRule' && (
                <div className="flex flex-col gap-2">
                  {previewResult.multiRuleMatches.length === 0 ? (
                    <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-6 py-8 text-center">
                      <Layers className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      <p className="text-sm text-slate-500">没有商户匹配多条规则</p>
                      <p className="mt-1 text-xs text-slate-600">所有商户都只匹配一条规则，配置清晰</p>
                    </div>
                  ) : (
                    previewResult.multiRuleMatches.map((item) => (
                      <MultiRuleMatchItem
                        key={item.merchant}
                        item={item}
                        expanded={expandedMultiMatch === item.merchant}
                        onToggle={() => setExpandedMultiMatch(
                          expandedMultiMatch === item.merchant ? null : item.merchant,
                        )}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-700/40 px-6 py-4">
              <div className="mb-4">
                <div className="text-xs font-medium text-slate-400 mb-2">选择应用范围</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setApplyScope('current')}
                    className={cn(
                      'flex-1 rounded-lg border px-4 py-3 text-left transition-colors',
                      applyScope === 'current'
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-slate-700/30 bg-slate-800/30 hover:bg-slate-800/50',
                    )}
                  >
                    <div className={cn(
                      'text-sm font-medium',
                      applyScope === 'current' ? 'text-purple-300' : 'text-slate-300',
                    )}>
                      仅应用到当前账单
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">只修改当前正在查看的账单数据</div>
                  </button>
                  <button
                    onClick={() => setApplyScope('all')}
                    className={cn(
                      'flex-1 rounded-lg border px-4 py-3 text-left transition-colors',
                      applyScope === 'all'
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-slate-700/30 bg-slate-800/30 hover:bg-slate-800/50',
                    )}
                  >
                    <div className={cn(
                      'text-sm font-medium',
                      applyScope === 'all' ? 'text-purple-300' : 'text-slate-300',
                    )}>
                      应用到全部账单
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">修改所有账单中匹配的交易记录</div>
                  </button>
                </div>
              </div>

              {previewResult.totalManualSkipped > 0 && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div className="text-xs text-amber-300/90">
                    有 <span className="font-medium text-amber-400">{previewResult.totalManualSkipped}</span> 条记录已手动设置分类，
                    规则回放不会覆盖这些手动分类。如需修改，请在交易表格中单独调整。
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-lg bg-slate-700/40 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/60"
                >
                  取消
                </button>
                <button
                  onClick={() => onApply(applyScope)}
                  disabled={isLoading || previewResult.totalAffected === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/15 px-4 py-2 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/25 disabled:opacity-40 disabled:hover:bg-purple-500/15"
                >
                  {isLoading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                      应用中...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      确认应用
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MultiRuleMatchItem({
  item,
  expanded,
  onToggle,
}: {
  item: MultiRuleMatch
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">{item.merchant}</span>
            <span className="shrink-0 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] text-orange-400">
              匹配 {item.matches.length} 条规则
            </span>
            <span className="shrink-0 text-[11px] text-slate-500">
              涉及 {item.transactionCount} 笔交易
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {item.matches.map((m, idx) => (
              <span key={m.ruleId} className="text-xs">
                {idx > 0 && <span className="text-slate-600 mx-1">→</span>}
                <span
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5"
                  style={{ backgroundColor: getCategoryColor(m.category, 0) + '20', color: getCategoryColor(m.category, 0) }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(m.category, 0) }} />
                  {m.category}
                </span>
                <span className="text-slate-500 text-[10px] ml-1">（关键词: {m.keyword}）</span>
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-slate-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-orange-500/10 px-4 py-3 bg-orange-500/2">
          <div className="text-xs text-orange-300/80">
            <p className="font-medium text-orange-400 mb-1">⚠️ 说明</p>
            <p>该商户匹配了多条规则，系统将按<strong>规则列表顺序</strong>取第一条生效（当前使用的是「{item.matches[0].keyword}」规则，分类为「{item.matches[0].category}」）。</p>
            <p className="mt-1">如需调整生效优先级，请在规则管理列表中调整规则顺序（目前通过删除后重新添加来调整）。</p>
          </div>
        </div>
      )}
    </div>
  )
}
