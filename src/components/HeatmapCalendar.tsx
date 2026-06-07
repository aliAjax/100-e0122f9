import { useMemo, useState } from 'react'
import { useDashboardStore, useMergeMode, useEffectiveTransactions, useEffectiveFilter } from '@/store/useDashboardStore'
import { aggregateByDay, applyFilter, formatCurrency } from '@/utils/dataAggregation'
import { TRANSACTION_TYPE_FILTER_LABELS, TRANSACTION_TYPE_COLORS } from '@/types'

const CELL_SIZE = 14
const CELL_GAP = 3
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getDaysInYear(year: number) {
  const days: Date[] = []
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 16, g: 185, b: 129 }
}

function getHeatColor(value: number, max: number, baseColor: string): string {
  if (value === 0) return '#1e293b'
  const ratio = Math.min(Math.abs(value) / max, 1)
  const { r, g, b } = hexToRgb(baseColor)
  if (ratio < 0.25) return `rgb(${Math.floor(r * 0.3)}, ${Math.floor(g * 0.3)}, ${Math.floor(b * 0.3)})`
  if (ratio < 0.5) return `rgb(${Math.floor(r * 0.5)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.5)})`
  if (ratio < 0.75) return `rgb(${Math.floor(r * 0.75)}, ${Math.floor(g * 0.75)}, ${Math.floor(b * 0.75)})`
  return baseColor
}

export default function HeatmapCalendar() {
  const mergeMode = useMergeMode()
  const transactions = useEffectiveTransactions()
  const filter = useEffectiveFilter()
  const setFilter = useDashboardStore((s) => s.setFilter)
  const setMergeFilter = useDashboardStore((s) => s.setMergeFilter)

  const effectiveSetFilter = mergeMode ? setMergeFilter : setFilter

  const [tooltip, setTooltip] = useState<{ date: string; amount: number; x: number; y: number } | null>(null)

  const filtered = useMemo(() => applyFilter(transactions, filter), [transactions, filter])
  const dailyData = useMemo(() => aggregateByDay(filtered, filter.selectedType), [filtered, filter.selectedType])
  const dailyMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of dailyData) m.set(d.date, d.amount)
    return m
  }, [dailyData])

  const years = useMemo(() => {
    const all = new Set(transactions.map((t) => parseInt(t.date.slice(0, 4), 10)))
    return Array.from(all).sort()
  }, [transactions])

  const year = years.length > 0 ? years[years.length - 1] : new Date().getFullYear()

  const baseColor = TRANSACTION_TYPE_COLORS[filter.selectedType === 'net' ? 'expense' : filter.selectedType]
  const typeLabel = TRANSACTION_TYPE_FILTER_LABELS[filter.selectedType]

  const { cells, maxAmount, svgWidth, svgHeight, monthPositions } = useMemo(() => {
    const days = getDaysInYear(year)
    const cellsArr: { date: string; col: number; row: number; amount: number; isFiltered: boolean }[] = []

    let maxVal = 0
    for (const d of dailyData) {
      if (Math.abs(d.amount) > maxVal) maxVal = Math.abs(d.amount)
    }

    const firstMonday = getMonday(days[0])
    const weekOffset = Math.round((days[0].getTime() - firstMonday.getTime()) / (7 * 86400000))

    let maxCol = 0
    for (const day of days) {
      const dk = dateKey(day)
      const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1
      const weekNum = Math.round((day.getTime() - firstMonday.getTime()) / (7 * 86400000)) + (dayOfWeek >= 0 ? 1 : 0)
      const col = weekNum + weekOffset
      const amount = dailyMap.get(dk) ?? 0
      const isFiltered = filter.selectedDate ? dk === filter.selectedDate : true
      cellsArr.push({ date: dk, col, row: dayOfWeek, amount, isFiltered })
      if (col > maxCol) maxCol = col
    }

    const w = (maxCol + 2) * (CELL_SIZE + CELL_GAP) + 40
    const h = 7 * (CELL_SIZE + CELL_GAP) + 30

    const mPos: { label: string; x: number }[] = []
    let lastMonth = -1
    for (const day of days) {
      const m = day.getMonth()
      if (m !== lastMonth) {
        const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1
        const weekNum = Math.round((day.getTime() - firstMonday.getTime()) / (7 * 86400000)) + (dayOfWeek >= 0 ? 1 : 0)
        const col = weekNum + weekOffset
        mPos.push({ label: MONTH_LABELS[m], x: 40 + col * (CELL_SIZE + CELL_GAP) })
        lastMonth = m
      }
    }

    return { cells: cellsArr, maxAmount: maxVal, svgWidth: w, svgHeight: h, monthPositions: mPos }
  }, [year, dailyData, dailyMap, filter.selectedDate])

  const handleClick = (date: string) => {
    const next = filter.selectedDate === date ? null : date
    effectiveSetFilter({ selectedDate: next, selectedMonth: next ? next.slice(0, 7) : null })
  }

  const handleHover = (date: string, amount: number, e: React.MouseEvent) => {
    const rect = (e.currentTarget as SVGSVGElement).closest('div')!.getBoundingClientRect()
    setTooltip({ date, amount, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">每日{typeLabel}热力图</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span>少</span>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <div key={r} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: getHeatColor(r * maxAmount, maxAmount, baseColor) }} />
          ))}
          <span>多</span>
        </div>
      </div>
      <div className="relative overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} onMouseLeave={() => setTooltip(null)}>
          {monthPositions.map((m, i) => (
            <text key={i} x={m.x} y={12} fill="#64748b" fontSize={10}>
              {m.label}
            </text>
          ))}
          {WEEK_LABELS.map((label, i) => (
            <text key={label} x={0} y={30 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 + 4} fill="#475569" fontSize={9}>
              {i % 2 === 0 ? label : ''}
            </text>
          ))}
          {cells.map((c) => (
            <rect
              key={c.date}
              x={40 + c.col * (CELL_SIZE + CELL_GAP)}
              y={22 + c.row * (CELL_SIZE + CELL_GAP)}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={3}
              fill={getHeatColor(c.amount, maxAmount, baseColor)}
              opacity={c.isFiltered ? 1 : 0.3}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onClick={() => handleClick(c.date)}
              onMouseEnter={(e) => handleHover(c.date, c.amount, e as unknown as React.MouseEvent)}
            />
          ))}
        </svg>
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs shadow-xl"
            style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
          >
            <p className="text-slate-300">{tooltip.date}</p>
            <p className="font-mono" style={{ color: baseColor }}>
              ¥{formatCurrency(Math.abs(tooltip.amount))}
              {filter.selectedType === 'net' && tooltip.amount < 0 ? ' (净收入)' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
