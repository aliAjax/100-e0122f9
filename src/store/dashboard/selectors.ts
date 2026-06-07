import type { Bill, Transaction, FilterState, SavedView } from '@/types'
import type { DashboardStore } from './types'

export const EMPTY_TRANSACTIONS: Transaction[] = []
export const EMPTY_FILTER: FilterState = {
  selectedCategory: null,
  selectedMonth: null,
  selectedDate: null,
  selectedMerchant: null,
  selectedType: 'expense',
  searchText: '',
  amountMin: null,
  amountMax: null,
}
export const EMPTY_VIEWS: SavedView[] = []

export function getCurrentBill(state: DashboardStore): Bill | undefined {
  return state.bills.find((b) => b.id === state.currentBillId)
}

export function getCurrentTransactions(state: DashboardStore): Transaction[] {
  return getCurrentBill(state)?.transactions ?? EMPTY_TRANSACTIONS
}

export function getCurrentFilter(state: DashboardStore): FilterState {
  return getCurrentBill(state)?.filter ?? EMPTY_FILTER
}

export function getDataLoaded(state: DashboardStore): boolean {
  return (getCurrentBill(state)?.transactions.length ?? 0) > 0
}

export function getMergedTransactions(state: DashboardStore): Transaction[] {
  if (!state.mergeMode) return EMPTY_TRANSACTIONS
  const selectedBills = state.bills.filter((b) => state.selectedBillIdsForMerge.includes(b.id))
  if (state.mergeDedupeEnabled && state.mergeAnalysisResult) {
    return state.mergeAnalysisResult.uniqueTransactions as Transaction[]
  }
  return selectedBills.flatMap((b) => b.transactions)
}

export function getMergedFilter(state: DashboardStore): FilterState {
  return state.mergeFilter
}

export function getMergeDataLoaded(state: DashboardStore): boolean {
  return state.mergeMode && getMergedTransactions(state).length > 0
}

export function getEffectiveTransactions(state: DashboardStore): Transaction[] {
  if (state.mergeMode) return getMergedTransactions(state)
  return getCurrentTransactions(state)
}

export function getEffectiveFilter(state: DashboardStore): FilterState {
  if (state.mergeMode) return getMergedFilter(state)
  return getCurrentFilter(state)
}

export function getEffectiveDataLoaded(state: DashboardStore): boolean {
  if (state.mergeMode) return getMergeDataLoaded(state)
  return getDataLoaded(state)
}
