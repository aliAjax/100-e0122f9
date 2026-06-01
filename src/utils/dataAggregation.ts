import type { Transaction, MonthlyData, CategoryData, DailyData } from '@/types'

export function aggregateByMonth(transactions: Transaction[]): MonthlyData[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    const month = t.date.slice(0, 7)
    map.set(month, (map.get(month) ?? 0) + t.amount)
  }
  return Array.from(map.entries())
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export function aggregateByCategory(transactions: Transaction[]): CategoryData[] {
  const map = new Map<string, { amount: number; count: number }>()
  for (const t of transactions) {
    const existing = map.get(t.category) ?? { amount: 0, count: 0 }
    existing.amount += t.amount
    existing.count += 1
    map.set(t.category, existing)
  }
  return Array.from(map.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      count,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function aggregateByDay(transactions: Transaction[]): DailyData[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    map.set(t.date, (map.get(t.date) ?? 0) + t.amount)
  }
  return Array.from(map.entries())
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function applyFilter(transactions: Transaction[], filter: { selectedCategory: string | null; selectedMonth: string | null; selectedDate: string | null; selectedMerchant: string | null }): Transaction[] {
  let result = transactions
  if (filter.selectedCategory) {
    result = result.filter((t) => t.category === filter.selectedCategory)
  }
  if (filter.selectedMonth) {
    result = result.filter((t) => t.date.startsWith(filter.selectedMonth!))
  }
  if (filter.selectedDate) {
    result = result.filter((t) => t.date === filter.selectedDate)
  }
  if (filter.selectedMerchant) {
    result = result.filter((t) => t.merchant === filter.selectedMerchant)
  }
  return result
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getYearRange(transactions: Transaction[]): number[] {
  const years = new Set(transactions.map((t) => parseInt(t.date.slice(0, 4), 10)))
  return Array.from(years).sort()
}
