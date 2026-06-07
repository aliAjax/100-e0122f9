import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useDashboardStore, useMergeMode, useEffectiveTransactions, useEffectiveFilter } from '@/store/useDashboardStore'
import { aggregateByCategory, applyFilter, formatCurrency } from '@/utils/dataAggregation'
import { getCategoryColor, TRANSACTION_TYPE_FILTER_LABELS } from '@/types'

export default function CategoryPie() {
  const mergeMode = useMergeMode()
  const transactions = useEffectiveTransactions()
  const filter = useEffectiveFilter()
  const setFilter = useDashboardStore((s) => s.setFilter)
  const setMergeFilter = useDashboardStore((s) => s.setMergeFilter)

  const effectiveSetFilter = mergeMode ? setMergeFilter : setFilter

  const unfiltered = useMemo(
    () => applyFilter(transactions, { selectedCategory: null, selectedMonth: filter.selectedMonth, selectedDate: filter.selectedDate, selectedMerchant: null, selectedType: filter.selectedType, searchText: '', amountMin: null, amountMax: null }),
    [transactions, filter.selectedMonth, filter.selectedDate, filter.selectedType],
  )
  const categoryData = useMemo(() => aggregateByCategory(unfiltered, filter.selectedType), [unfiltered, filter.selectedType])
  const totalAmount = useMemo(() => categoryData.reduce((s, d) => s + d.amount, 0), [categoryData])
  const displayTotal = filter.selectedType === 'net' && totalAmount < 0 ? Math.abs(totalAmount) : Math.abs(totalAmount)

  const typeLabel = TRANSACTION_TYPE_FILTER_LABELS[filter.selectedType]

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 13 },
        formatter: (params: { name: string; value: number; percent: number }) => {
          const val = params.value as number
          const displayVal = filter.selectedType === 'net' && val < 0 ? Math.abs(val) : val
          const suffix = filter.selectedType === 'net' && val < 0 ? ' (净收入)' : ''
          return `<b>${params.name}</b><br/>金额：¥${displayVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}${suffix}<br/>占比：${params.percent}%`
        },
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
            value: Math.abs(d.amount),
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
            text: `¥${formatCurrency(displayTotal)}`,
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
            text: `总${typeLabel}`,
            fill: '#64748b',
            fontSize: 11,
            textAlign: 'center' as const,
          },
        },
      ],
    }),
    [categoryData, displayTotal, filter.selectedCategory, filter.selectedType, typeLabel],
  )

  const onChartClick = (params: { name?: string }) => {
    if (params.name) {
      const next = filter.selectedCategory === params.name ? null : params.name
      effectiveSetFilter({ selectedCategory: next })
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-slate-300">分类占比</h3>
      <ReactECharts option={option} style={{ height: 280 }} onEvents={{ click: onChartClick }} />
    </div>
  )
}
