import { useMemo } from 'react'
import type { Transaction, FilterState, TransactionTypeFilter, MonthlyData, CategoryData, DailyData } from '@/types'

function getTypeAmount(t: Transaction, typeFilter: TransactionTypeFilter): number {
  if (typeFilter === 'net') {
    if (t.type === 'income' || t.type === 'refund') return -t.amount
    return t.amount
  }
  return t.type === typeFilter ? t.amount : 0
}

function fastFilterByType(transactions: Transaction[], typeFilter: TransactionTypeFilter): Transaction[] {
  if (typeFilter === 'net') return transactions
  const result: Transaction[] = []
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    if (t.type === typeFilter) result.push(t)
  }
  return result
}

function fastApplyFilter(transactions: Transaction[], filter: FilterState): Transaction[] {
  let result = transactions

  if (filter.selectedType !== 'net') {
    const typeFiltered: Transaction[] = []
    for (let i = 0; i < result.length; i++) {
      const t = result[i]
      if (t.type === filter.selectedType) typeFiltered.push(t)
    }
    result = typeFiltered
  }

  if (filter.selectedCategory) {
    const cat = filter.selectedCategory
    const categoryFiltered: Transaction[] = []
    for (let i = 0; i < result.length; i++) {
      const t = result[i]
      if (t.category === cat) categoryFiltered.push(t)
    }
    result = categoryFiltered
  }

  if (filter.selectedMonth) {
    const month = filter.selectedMonth
    const monthFiltered: Transaction[] = []
    for (let i = 0; i < result.length; i++) {
      const t = result[i]
      if (t.date.startsWith(month)) monthFiltered.push(t)
    }
    result = monthFiltered
  }

  if (filter.selectedDate) {
    const date = filter.selectedDate
    const dateFiltered: Transaction[] = []
    for (let i = 0; i < result.length; i++) {
      const t = result[i]
      if (t.date === date) dateFiltered.push(t)
    }
    result = dateFiltered
  }

  if (filter.selectedMerchant) {
    const merchant = filter.selectedMerchant
    const merchantFiltered: Transaction[] = []
    for (let i = 0; i < result.length; i++) {
      const t = result[i]
      if (t.merchant === merchant) merchantFiltered.push(t)
    }
    result = merchantFiltered
  }

  if (filter.searchText) {
    const keyword = filter.searchText.toLowerCase()
    const searchFiltered: Transaction[] = []
    for (let i = 0; i < result.length; i++) {
      const t = result[i]
      if (
        t.merchant.toLowerCase().includes(keyword) ||
        t.category.toLowerCase().includes(keyword) ||
        t.date.includes(keyword)
      ) {
        searchFiltered.push(t)
      }
    }
    result = searchFiltered
  }

  if (filter.amountMin !== null) {
    const min = filter.amountMin
    const minFiltered: Transaction[] = []
    for (let i = 0; i < result.length; i++) {
      const t = result[i]
      if (t.amount >= min) minFiltered.push(t)
    }
    result = minFiltered
  }

  if (filter.amountMax !== null) {
    const max = filter.amountMax
    const maxFiltered: Transaction[] = []
    for (let i = 0; i < result.length; i++) {
      const t = result[i]
      if (t.amount <= max) maxFiltered.push(t)
    }
    result = maxFiltered
  }

  return result
}

function fastAggregateByMonth(transactions: Transaction[], typeFilter: TransactionTypeFilter): MonthlyData[] {
  const map = new Map<string, number>()
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    const month = t.date.slice(0, 7)
    const amount = getTypeAmount(t, typeFilter)
    if (amount !== 0 || typeFilter === 'net') {
      map.set(month, (map.get(month) ?? 0) + amount)
    }
  }
  const result: MonthlyData[] = []
  for (const [month, amount] of map.entries()) {
    result.push({ month, amount: Math.round(amount * 100) / 100 })
  }
  result.sort((a, b) => a.month.localeCompare(b.month))
  return result
}

function fastAggregateByCategory(transactions: Transaction[], typeFilter: TransactionTypeFilter): CategoryData[] {
  const map = new Map<string, { amount: number; count: number }>()
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    const amount = getTypeAmount(t, typeFilter)
    if (amount === 0 && typeFilter !== 'net') continue
    const existing = map.get(t.category)
    if (existing) {
      existing.amount += amount
      if (amount !== 0) existing.count += 1
    } else {
      map.set(t.category, { amount, count: amount !== 0 ? 1 : 0 })
    }
  }
  const result: CategoryData[] = []
  for (const [category, { amount, count }] of map.entries()) {
    result.push({ category, amount: Math.round(amount * 100) / 100, count })
  }
  result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  return result
}

function fastAggregateByDay(transactions: Transaction[], typeFilter: TransactionTypeFilter): DailyData[] {
  const map = new Map<string, number>()
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    const amount = getTypeAmount(t, typeFilter)
    if (amount !== 0 || typeFilter === 'net') {
      map.set(t.date, (map.get(t.date) ?? 0) + amount)
    }
  }
  const result: DailyData[] = []
  for (const [date, amount] of map.entries()) {
    result.push({ date, amount: Math.round(amount * 100) / 100 })
  }
  result.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

function fastAggregateByMerchant(
  transactions: Transaction[],
  typeFilter: TransactionTypeFilter,
  limit: number = 10
): Array<{ merchant: string; amount: number; count: number; avg: number }> {
  const map = new Map<string, { amount: number; count: number }>()
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    if (!t.merchant) continue
    const amount = getTypeAmount(t, typeFilter)
    if (amount === 0 && typeFilter !== 'net') continue
    const existing = map.get(t.merchant)
    if (existing) {
      existing.amount += amount
      existing.count += 1
    } else {
      map.set(t.merchant, { amount, count: 1 })
    }
  }
  const result: Array<{ merchant: string; amount: number; count: number; avg: number }> = []
  for (const [merchant, { amount, count }] of map.entries()) {
    result.push({
      merchant,
      amount: Math.round(amount * 100) / 100,
      count,
      avg: Math.round((amount / count) * 100) / 100,
    })
  }
  result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  return result.slice(0, limit)
}

function fastSumTransactions(transactions: Transaction[], typeFilter: TransactionTypeFilter): number {
  let sum = 0
  for (let i = 0; i < transactions.length; i++) {
    sum += getTypeAmount(transactions[i], typeFilter)
  }
  return Math.round(sum * 100) / 100
}

export interface DataCacheResult {
  filtered: Transaction[]
  filteredSorted: Transaction[]
  monthlyData: MonthlyData[]
  categoryData: CategoryData[]
  dailyData: DailyData[]
  topMerchants: Array<{ merchant: string; amount: number; count: number; avg: number }>
  totalAmount: number
  transactionCount: number
  years: number[]
}

export function useDataCache(transactions: Transaction[], filter: FilterState): DataCacheResult {
  const {
    selectedCategory,
    selectedMonth,
    selectedDate,
    selectedMerchant,
    selectedType,
    searchText,
    amountMin,
    amountMax,
  } = filter

  const filtered = useMemo(() => {
    return fastApplyFilter(transactions, filter)
  }, [
    transactions,
    selectedCategory,
    selectedMonth,
    selectedDate,
    selectedMerchant,
    selectedType,
    searchText,
    amountMin,
    amountMax,
  ])

  const filteredSorted = useMemo(() => {
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date))
  }, [filtered])

  const monthlyData = useMemo(() => {
    return fastAggregateByMonth(filtered, selectedType)
  }, [filtered, selectedType])

  const categoryData = useMemo(() => {
    return fastAggregateByCategory(filtered, selectedType)
  }, [filtered, selectedType])

  const dailyData = useMemo(() => {
    return fastAggregateByDay(filtered, selectedType)
  }, [filtered, selectedType])

  const topMerchants = useMemo(() => {
    return fastAggregateByMerchant(filtered, selectedType, 10)
  }, [filtered, selectedType])

  const totalAmount = useMemo(() => {
    return fastSumTransactions(filtered, selectedType)
  }, [filtered, selectedType])

  const transactionCount = useMemo(() => filtered.length, [filtered])

  const years = useMemo(() => {
    const yearSet = new Set<number>()
    for (let i = 0; i < transactions.length; i++) {
      yearSet.add(parseInt(transactions[i].date.slice(0, 4), 10))
    }
    return Array.from(yearSet).sort()
  }, [transactions])

  return {
    filtered,
    filteredSorted,
    monthlyData,
    categoryData,
    dailyData,
    topMerchants,
    totalAmount,
    transactionCount,
    years,
  }
}

export function usePartialDataCache(
  transactions: Transaction[],
  filter: FilterState,
  options: { excludeSearch?: boolean; excludeMerchant?: boolean; excludeCategory?: boolean } = {}
): {
  filtered: Transaction[]
  monthlyData: MonthlyData[]
  categoryData: CategoryData[]
  dailyData: DailyData[]
} {
  const {
    selectedCategory,
    selectedMonth,
    selectedDate,
    selectedMerchant,
    selectedType,
    searchText,
    amountMin,
    amountMax,
  } = filter

  const partialFilter: FilterState = useMemo(() => ({
    ...filter,
    searchText: options.excludeSearch ? '' : searchText,
    selectedMerchant: options.excludeMerchant ? null : selectedMerchant,
    selectedCategory: options.excludeCategory ? null : selectedCategory,
  }), [
    filter,
    options.excludeSearch,
    options.excludeMerchant,
    options.excludeCategory,
    searchText,
    selectedMerchant,
    selectedCategory,
  ])

  const filtered = useMemo(() => {
    return fastApplyFilter(transactions, partialFilter)
  }, [
    transactions,
    selectedMonth,
    selectedDate,
    selectedType,
    amountMin,
    amountMax,
    options.excludeSearch ? '' : searchText,
    options.excludeMerchant ? null : selectedMerchant,
    options.excludeCategory ? null : selectedCategory,
  ])

  const monthlyData = useMemo(() => {
    return fastAggregateByMonth(filtered, selectedType)
  }, [filtered, selectedType])

  const categoryData = useMemo(() => {
    return fastAggregateByCategory(filtered, selectedType)
  }, [filtered, selectedType])

  const dailyData = useMemo(() => {
    return fastAggregateByDay(filtered, selectedType)
  }, [filtered, selectedType])

  return { filtered, monthlyData, categoryData, dailyData }
}

export {
  fastApplyFilter,
  fastFilterByType,
  fastAggregateByMonth,
  fastAggregateByCategory,
  fastAggregateByDay,
  fastAggregateByMerchant,
  fastSumTransactions,
  getTypeAmount,
}
