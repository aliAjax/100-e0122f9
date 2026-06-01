import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { aggregateByCategory, applyFilter, formatCurrency } from '@/utils/dataAggregation'
import { getCategoryColor } from '@/types'

export default function CategoryPie() {
  const transactions = useDashboardStore((s) => s.transactions)
  const filter = useDashboardStore((s) => s.filter)
  const setFilter = useDashboardStore((s) => s.setFilter)

  const unfiltered = useMemo(
    () => applyFilter(transactions, { selectedCategory: null, selectedMonth: filter.selectedMonth, selectedDate: filter.selectedDate }),
    [transactions, filter.selectedMonth, filter.selectedDate],
  )
  const categoryData = useMemo(() => aggregateByCategory(unfiltered), [unfiltered])
  const totalAmount = useMemo(() => categoryData.reduce((s, d) => s + d.amount, 0), [categoryData])

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 13 },
        formatter: (params: { name: string; value: number; percent: number }) =>
          `<b>${params.name}</b><br/>金额：¥${params.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}<br/>占比：${params.percent}%`,
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['50%', '80%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#0f172a', borderWidth: 2, borderRadius: 6 },
          label: {
            show: true,
            color: '#94a3b8',
            fontSize: 11,
            formatter: '{b}',
          },
          emphasis: {
            label: { show: true, fontSize: 13, fontWeight: 'bold', color: '#e2e8f0' },
            itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.4)' },
          },
          selectedMode: 'single' as const,
          selectedOffset: 8,
          data: categoryData.map((d, i) => ({
            name: d.category,
            value: d.amount,
            itemStyle: {
              color: getCategoryColor(d.category, i),
              opacity: filter.selectedCategory && filter.selectedCategory !== d.category ? 0.3 : 1,
            },
          })),
        },
      ],
      graphic: [
        {
          type: 'text' as const,
          left: 'center',
          top: '44%',
          style: {
            text: `¥${formatCurrency(totalAmount)}`,
            fill: '#e2e8f0',
            fontSize: 16,
            fontWeight: 'bold',
            fontFamily: 'Space Grotesk, monospace',
            textAlign: 'center' as const,
          },
        },
        {
          type: 'text' as const,
          left: 'center',
          top: '55%',
          style: {
            text: '总支出',
            fill: '#64748b',
            fontSize: 11,
            textAlign: 'center' as const,
          },
        },
      ],
    }),
    [categoryData, totalAmount, filter.selectedCategory],
  )

  const onChartClick = (params: { name?: string }) => {
    if (params.name) {
      const next = filter.selectedCategory === params.name ? null : params.name
      setFilter({ selectedCategory: next })
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-slate-300">分类占比</h3>
      <ReactECharts option={option} style={{ height: 280 }} onEvents={{ click: onChartClick }} />
    </div>
  )
}
