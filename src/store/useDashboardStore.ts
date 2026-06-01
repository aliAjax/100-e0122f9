import { create } from 'zustand'
import type { Transaction, FilterState } from '@/types'

const STORAGE_KEY = 'spendlens_transactions'

function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    return []
  }
  return []
}

function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
}

interface DashboardStore {
  transactions: Transaction[]
  filter: FilterState
  dataLoaded: boolean
  setTransactions: (transactions: Transaction[]) => void
  setFilter: (filter: Partial<FilterState>) => void
  clearFilter: () => void
  clearData: () => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  transactions: loadTransactions(),
  filter: {
    selectedCategory: null,
    selectedMonth: null,
    selectedDate: null,
  },
  dataLoaded: loadTransactions().length > 0,

  setTransactions: (transactions) => {
    saveTransactions(transactions)
    set({ transactions, dataLoaded: true, filter: { selectedCategory: null, selectedMonth: null, selectedDate: null } })
  },

  setFilter: (partial) =>
    set((state) => ({
      filter: { ...state.filter, ...partial },
    })),

  clearFilter: () =>
    set({ filter: { selectedCategory: null, selectedMonth: null, selectedDate: null } }),

  clearData: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ transactions: [], dataLoaded: false, filter: { selectedCategory: null, selectedMonth: null, selectedDate: null } })
  },
}))
