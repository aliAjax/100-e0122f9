import { create } from 'zustand'
import type { Transaction, FilterState } from '@/types'
import type { CSVPreviewResult } from '@/utils/csvParser'

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
  previewResult: CSVPreviewResult | null
  setTransactions: (transactions: Transaction[]) => void
  setFilter: (filter: Partial<FilterState>) => void
  clearFilter: () => void
  clearData: () => void
  setPreviewResult: (result: CSVPreviewResult | null) => void
  confirmPreview: () => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  transactions: loadTransactions(),
  filter: {
    selectedCategory: null,
    selectedMonth: null,
    selectedDate: null,
  },
  dataLoaded: loadTransactions().length > 0,
  previewResult: null,

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
    set({ transactions: [], dataLoaded: false, filter: { selectedCategory: null, selectedMonth: null, selectedDate: null }, previewResult: null })
  },

  setPreviewResult: (result) => set({ previewResult: result }),

  confirmPreview: () =>
    set((state) => {
      if (!state.previewResult || state.previewResult.allTransactions.length === 0) {
        return { previewResult: null }
      }
      const txs = state.previewResult.allTransactions
      saveTransactions(txs)
      return {
        transactions: txs,
        dataLoaded: true,
        filter: { selectedCategory: null, selectedMonth: null, selectedDate: null },
        previewResult: null,
      }
    }),
}))
