import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useDashboardStore, useTransactions, useFilter } from '@/store/useDashboardStore'
import { aggregateByMonth, applyFilter } from '@/utils/dataAggregation'
import { getCategoryColor, TRANSACTION_TYPE_FILTER_LABELS, TRANSACTION_TYPE_COLORS } from '@/types'

export default function TrendChart() {
  const transactions = useTransactions()
  const filter = useFilter()
  const setFilter = useDashboardStore((s) => s.setFilter)

  const filtered = useMemo(() => applyFilter(transactions, filter), [transactions, filter])
  const monthlyData = useMemo(() => aggregateByMonth(filtered, filter.selectedType), [filtered, filter.selectedType])

  const allMonthly = useMemo(() => {
    if (!filter.selectedCategory) return monthlyData
    return aggregateByMonth(applyFilter(transactions, { selectedCategory: null, selectedMonth: null, selectedDate: null, selectedMerchant: null, selectedType: filter.selectedType }), filter.selectedType)
  }, [transactions, filter.selectedCategory, filter.selectedType, monthlyData])

  const typeColor = TRANSACTION_TYPE_COLORS[filter.selectedType === 'net' ? 'expense' : filter.selectedType]
  const typeLabel = TRANSACTION_TYPE_FILTER_LABELS[filter.selectedType]

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 13 },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0]
          if (!p) return ''
          const val = p.value as number
          const displayVal = filter.selectedType === 'net' && val < 0 ? Math.abs(val) : val
          const suffix = filter.selectedType === 'net' && val < 0 ? ' (净收入)' : ''
          return `<b>${p.name}</b><br/>${typeLabel}：¥${displayVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}${suffix}`
        },
      },
      grid: { top: 20, right: 20, bottom: 30, left: 70 },
      xAxis: {
        type: 'category' as const,
        data: allMonthly.map((d) => d.month),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' as const } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: (v: number) => {
            const abs = Math.abs(v)
            if (abs >= 10000) return `${(v / 10000).toFixed(1)}万`
            if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`
            return String(v)
          },
        },
      },
      series: [
        {
          type: 'line' as const,
          data: allMonthly.map((d) => {
            const matched = monthlyData.find((m) => m.month === d.month)
            return matched ? matched.amount : 0
          }),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: typeColor, width: 2.5 },
          itemStyle: { color: typeColor, borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${typeColor}4d` },
                { offset: 1, color: `${typeColor}05` },
              ],
            },
          },
          emphasis: { itemStyle: { borderWidth: 3, shadowBlur: 10, shadowColor: `${typeColor}66` } },
        },
        ...(filter.selectedCategory
          ? [
              {
                type: 'line' as const,
                data: allMonthly.map((d) => {
                  const matched = monthlyData.find((m) => m.month === d.month)
                  return matched ? matched.amount : null
                }),
                smooth: true,
                symbol: 'none',
                lineStyle: { color: getCategoryColor(filter.selectedCategory, 0), width: 0 },
                areaStyle: {
                  color: {
                    type: 'linear' as const,
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                      { offset: 0, color: `${getCategoryColor(filter.selectedCategory, 0)}40` },
                      { offset: 1, color: `${getCategoryColor(filter.selectedCategory, 0)}05` },
                    ],
                  },
                },
              },
            ]
          : []),
      ],
    }),
    [monthlyData, allMonthly, filter.selectedCategory, filter.selectedType, typeColor, typeLabel],
  )

  const onChartClick = (params: { name?: string }) => {
    if (params.name) {
      setFilter({ selectedMonth: params.name })
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-slate-300">月度{typeLabel}趋势</h3>
      <ReactECharts option={option} style={{ height: 280 }} onEvents={{ click: onChartClick }} />
    </div>
  )
}
