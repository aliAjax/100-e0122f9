import type { Transaction, MonthlyData, CategoryData, DailyData, TransactionTypeFilter } from '@/types'

function getTypeAmount(t: Transaction, typeFilter: TransactionTypeFilter): number {
  if (typeFilter === 'net') {
    if (t.type === 'income' || t.type === 'refund') return -t.amount
    return t.amount
  }
  return t.type === typeFilter ? t.amount : 0
}

export function filterByType(transactions: Transaction[], typeFilter: TransactionTypeFilter): Transaction[] {
  if (typeFilter === 'net') return transactions
  return transactions.filter((t) => t.type === typeFilter)
}

export function aggregateByMonth(transactions: Transaction[], typeFilter: TransactionTypeFilter = 'expense'): MonthlyData[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    const month = t.date.slice(0, 7)
    const amount = getTypeAmount(t, typeFilter)
    if (amount !== 0 || typeFilter === 'net') {
      map.set(month, (map.get(month) ?? 0) + amount)
    }
  }
  return Array.from(map.entries())
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export function aggregateByCategory(transactions: Transaction[], typeFilter: TransactionTypeFilter = 'expense'): CategoryData[] {
  const map = new Map<string, { amount: number; count: number }>()
  for (const t of transactions) {
    const amount = getTypeAmount(t, typeFilter)
    if (amount === 0 && typeFilter !== 'net') continue
    const existing = map.get(t.category) ?? { amount: 0, count: 0 }
    existing.amount += amount
    if (amount !== 0) existing.count += 1
    map.set(t.category, existing)
  }
  return Array.from(map.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      count,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}

export function aggregateByDay(transactions: Transaction[], typeFilter: TransactionTypeFilter = 'expense'): DailyData[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    const amount = getTypeAmount(t, typeFilter)
    if (amount !== 0 || typeFilter === 'net') {
      map.set(t.date, (map.get(t.date) ?? 0) + amount)
    }
  }
  return Array.from(map.entries())
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function applyFilter(transactions: Transaction[], filter: { selectedCategory: string | null; selectedMonth: string | null; selectedDate: string | null; selectedMerchant: string | null; selectedType: TransactionTypeFilter }): Transaction[] {
  let result = transactions
  result = filterByType(result, filter.selectedType)
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
