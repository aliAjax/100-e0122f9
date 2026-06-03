import { Wallet, TrendingUp, ArrowUpRight, CalendarDays } from 'lucide-react'
import { useTransactions, useFilter } from '@/store/useDashboardStore'
import { applyFilter, formatCurrency } from '@/utils/dataAggregation'

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm transition-all hover:border-slate-600/50 hover:bg-slate-800/80">
      <div className={`rounded-xl p-3 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
        <p className="mt-0.5 font-mono text-xl font-semibold text-slate-100">{value}</p>
      </div>
    </div>
  )
}

export default function StatsCards() {
  const transactions = useTransactions()
  const filter = useFilter()

  const filtered = applyFilter(transactions, filter)

  const totalAmount = filtered.reduce((s, t) => s + t.amount, 0)
  const months = new Set(filtered.map((t) => t.date.slice(0, 7)))
  const monthAvg = months.size > 0 ? totalAmount / months.size : 0
  const maxSingle = filtered.length > 0 ? Math.max(...filtered.map((t) => t.amount)) : 0
  const spendingDays = new Set(filtered.map((t) => t.date)).size

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard icon={Wallet} label="总支出" value={`¥${formatCurrency(totalAmount)}`} accent="bg-emerald-500/15 text-emerald-400" />
      <StatCard icon={TrendingUp} label="月均支出" value={`¥${formatCurrency(monthAvg)}`} accent="bg-blue-500/15 text-blue-400" />
      <StatCard icon={ArrowUpRight} label="最大单笔" value={`¥${formatCurrency(maxSingle)}`} accent="bg-amber-500/15 text-amber-400" />
      <StatCard icon={CalendarDays} label="消费天数" value={`${spendingDays} 天`} accent="bg-purple-500/15 text-purple-400" />
    </div>
  )
}
