import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { aggregateByMonth, applyFilter } from '@/utils/dataAggregation'
import { getCategoryColor } from '@/types'

export default function TrendChart() {
  const transactions = useDashboardStore((s) => s.transactions)
  const filter = useDashboardStore((s) => s.filter)
  const setFilter = useDashboardStore((s) => s.setFilter)

  const filtered = useMemo(() => applyFilter(transactions, filter), [transactions, filter])
  const monthlyData = useMemo(() => aggregateByMonth(filtered), [filtered])

  const allMonthly = useMemo(() => {
    if (!filter.selectedCategory) return monthlyData
    return aggregateByMonth(applyFilter(transactions, { selectedCategory: null, selectedMonth: null, selectedDate: null }))
  }, [transactions, filter.selectedCategory])

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 13 },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0]
          return p ? `<b>${p.name}</b><br/>支出：¥${p.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : ''
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
          formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)),
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
          lineStyle: { color: '#10B981', width: 2.5 },
          itemStyle: { color: '#10B981', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16,185,129,0.3)' },
                { offset: 1, color: 'rgba(16,185,129,0.02)' },
              ],
            },
          },
          emphasis: { itemStyle: { borderWidth: 3, shadowBlur: 10, shadowColor: 'rgba(16,185,129,0.4)' } },
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
    [monthlyData, allMonthly, filter.selectedCategory],
  )

  const onChartClick = (params: { name?: string }) => {
    if (params.name) {
      setFilter({ selectedMonth: params.name })
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-slate-300">月度支出趋势</h3>
      <ReactECharts option={option} style={{ height: 280 }} onEvents={{ click: onChartClick }} />
    </div>
  )
}
