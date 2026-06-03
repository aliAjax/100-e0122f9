import { useState } from 'react'
import { BarChart3, Trash2, Upload, AlertCircle, Wallet, Tag } from 'lucide-react'
import { useDashboardStore, useDataLoaded, useTransactions } from '@/store/useDashboardStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryRuleStore } from '@/store/useCategoryRuleStore'
import { previewCSV } from '@/utils/csvParser'
import CSVUploader from '@/components/CSVUploader'
import CSVPreviewModal from '@/components/CSVPreviewModal'
import BudgetSettingsModal from '@/components/BudgetSettingsModal'
import CategoryRuleModal from '@/components/CategoryRuleModal'
import BillSelector from '@/components/BillSelector'
import BudgetProgress from '@/components/BudgetProgress'
import StatsCards from '@/components/StatsCards'
import TrendChart from '@/components/TrendChart'
import CategoryPie from '@/components/CategoryPie'
import HeatmapCalendar from '@/components/HeatmapCalendar'
import TransactionTable from '@/components/TransactionTable'
import MerchantRanking from '@/components/MerchantRanking'
import AnnualSummary from '@/components/AnnualSummary'
import FilterBar from '@/components/FilterBar'

export default function Home() {
  const dataLoaded = useDataLoaded()
  const transactions = useTransactions()
  const bills = useDashboardStore((s) => s.bills)
  const clearData = useDashboardStore((s) => s.clearData)
  const setPreviewResult = useDashboardStore((s) => s.setPreviewResult)
  const setPendingBillName = useDashboardStore((s) => s.setPendingBillName)
  const [reimportError, setReimportError] = useState<string | null>(null)
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [categoryRuleModalOpen, setCategoryRuleModalOpen] = useState(false)
  const hasBudgets = useBudgetStore((s) => Object.keys(s.budgets).length > 0)
  const hasCategoryRules = useCategoryRuleStore((s) => s.rules.length > 0)

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-[#0a0f1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">SpendLens</h1>
              <p className="text-[11px] text-slate-500">年度消费结构可视化</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCategoryRuleModalOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${hasCategoryRules ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25' : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'}`}
            >
              <Tag className="h-3.5 w-3.5" />
              分类规则
            </button>
            <button
              onClick={() => setBudgetModalOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${hasBudgets ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'}`}
            >
              <Wallet className="h-3.5 w-3.5" />
              预算设置
            </button>
            {bills.length > 0 && (
              <>
                <div className="h-5 w-px bg-slate-700/50" />
                <BillSelector />
                <span className="rounded-full bg-slate-700/50 px-3 py-1 text-xs text-slate-400">
                  {transactions.length} 条记录
                </span>
              </>
            )}
            {dataLoaded && (
              <>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-700/40 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700/60">
                  <Upload className="h-3.5 w-3.5" />
                  导入新账单
                  <input id="bill-file-input" type="file" accept=".csv" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setReimportError(null)
                    setPendingBillName(`账单 ${bills.length + 1}`)
                    try {
                      const result = await previewCSV(file)
                      if (result.validCount === 0) {
                        const firstReason = result.invalidReasons[0] ?? '未解析到有效交易记录'
                        setReimportError(firstReason)
                        setPendingBillName(null)
                      } else {
                        setPreviewResult(result)
                      }
                    } catch (e) {
                      setReimportError((e as Error).message)
                      setPendingBillName(null)
                    }
                  }} />
                </label>
                <button
                  onClick={clearData}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="删除当前账单"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除账单
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {reimportError && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-6 py-2">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>导入失败：{reimportError}</span>
            </div>
            <button
              onClick={() => setReimportError(null)}
              className="text-xs text-red-400/70 transition-colors hover:text-red-400"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {!dataLoaded ? (
          <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
            <div className="w-full max-w-xl">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-semibold text-slate-100">导入你的消费账单</h2>
                <p className="mt-2 text-sm text-slate-500">上传一份 CSV 文件，即可开始分析你的年度消费结构</p>
              </div>
              <CSVUploader />
              <div className="mt-6 rounded-xl border border-slate-700/30 bg-slate-800/30 px-5 py-4">
                <p className="mb-2 text-xs font-medium text-slate-400">CSV 文件格式示例：</p>
                <code className="block text-[11px] leading-relaxed text-slate-500">
                  date,category,merchant,amount<br />
                  2025-01-15,餐饮,星巴克,38.00<br />
                  2025-01-16,交通,滴滴出行,25.50<br />
                  2025-01-17,购物,京东,299.00
                </code>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <FilterBar />
            <StatsCards />
            <AnnualSummary />
            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3">
                <TrendChart />
              </div>
              <div className="col-span-2 flex flex-col gap-6">
                <CategoryPie />
                <BudgetProgress />
              </div>
            </div>
            <HeatmapCalendar />
            <MerchantRanking />
            <TransactionTable />
          </div>
        )}
      </main>

      <CSVPreviewModal />
      <BudgetSettingsModal open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} />
      <CategoryRuleModal open={categoryRuleModalOpen} onClose={() => setCategoryRuleModalOpen(false)} />
    </div>
  )
}
