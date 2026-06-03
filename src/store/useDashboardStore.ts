import { create } from 'zustand'
import type { Transaction, FilterState, Bill } from '@/types'
import type { CSVPreviewResult } from '@/utils/csvParser'
import { applyCategoryRules } from '@/utils/categoryRuleMatcher'
import { useCategoryRuleStore } from './useCategoryRuleStore'

const STORAGE_KEY_BILLS = 'spendlens_bills'
const STORAGE_KEY_CURRENT = 'spendlens_current_bill'
const LEGACY_STORAGE_KEY = 'spendlens_transactions'

function generateId(): string {
  return `bill_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyFilter(): FilterState {
  return {
    selectedCategory: null,
    selectedMonth: null,
    selectedDate: null,
    selectedMerchant: null,
  }
}

function loadBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BILLS)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through
  }
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const transactions = JSON.parse(legacyRaw) as Transaction[]
      if (transactions.length > 0) {
        const legacyBill: Bill = {
          id: generateId(),
          name: '默认账单',
          transactions,
          filter: createEmptyFilter(),
          createdAt: Date.now(),
        }
        const bills = [legacyBill]
        localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(bills))
        localStorage.setItem(STORAGE_KEY_CURRENT, legacyBill.id)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
        return bills
      }
    }
  } catch {
    // fall through
  }
  return []
}

function saveBills(bills: Bill[]) {
  localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(bills))
}

function loadCurrentBillId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_CURRENT)
  } catch {
    return null
  }
}

function saveCurrentBillId(id: string | null) {
  if (id) {
    localStorage.setItem(STORAGE_KEY_CURRENT, id)
  } else {
    localStorage.removeItem(STORAGE_KEY_CURRENT)
  }
}

interface DashboardStore {
  bills: Bill[]
  currentBillId: string | null
  previewResult: CSVPreviewResult | null
  pendingBillName: string | null
  get currentBill(): Bill | undefined
  get transactions(): Transaction[]
  get filter(): FilterState
  get dataLoaded(): boolean
  createBill: (name: string, transactions: Transaction[]) => void
  switchBill: (billId: string) => void
  renameBill: (billId: string, name: string) => void
  deleteBill: (billId: string) => void
  setCurrentBillTransactions: (transactions: Transaction[]) => void
  setFilter: (filter: Partial<FilterState>) => void
  clearFilter: () => void
  clearData: () => void
  setPreviewResult: (result: CSVPreviewResult | null) => void
  setPendingBillName: (name: string | null) => void
  confirmPreview: (billName: string) => void
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  bills: loadBills(),
  currentBillId: loadCurrentBillId(),
  previewResult: null,
  pendingBillName: null,

  get currentBill() {
    const { bills, currentBillId } = get()
    return bills.find((b) => b.id === currentBillId)
  },

  get transactions() {
    return get().currentBill?.transactions ?? []
  },

  get filter() {
    return get().currentBill?.filter ?? createEmptyFilter()
  },

  get dataLoaded() {
    return (get().currentBill?.transactions.length ?? 0) > 0
  },

  createBill: (name, transactions) => {
    const newBill: Bill = {
      id: generateId(),
      name: name.trim() || '未命名账单',
      transactions,
      filter: createEmptyFilter(),
      createdAt: Date.now(),
    }
    set((state) => {
      const bills = [...state.bills, newBill]
      saveBills(bills)
      saveCurrentBillId(newBill.id)
      return {
        bills,
        currentBillId: newBill.id,
        previewResult: null,
        pendingBillName: null,
      }
    })
  },

  switchBill: (billId) => {
    const { bills } = get()
    const bill = bills.find((b) => b.id === billId)
    if (!bill) return
    saveCurrentBillId(billId)
    set({ currentBillId: billId })
  },

  renameBill: (billId, name) => {
    set((state) => {
      const bills = state.bills.map((b) =>
        b.id === billId ? { ...b, name: name.trim() || '未命名账单' } : b,
      )
      saveBills(bills)
      return { bills }
    })
  },

  deleteBill: (billId) => {
    set((state) => {
      const bills = state.bills.filter((b) => b.id !== billId)
      saveBills(bills)
      let currentBillId = state.currentBillId
      if (state.currentBillId === billId) {
        currentBillId = bills.length > 0 ? bills[0].id : null
        saveCurrentBillId(currentBillId)
      }
      return { bills, currentBillId }
    })
  },

  setCurrentBillTransactions: (transactions) => {
    set((state) => {
      const bills = state.bills.map((b) =>
        b.id === state.currentBillId ? { ...b, transactions } : b,
      )
      saveBills(bills)
      return { bills }
    })
  },

  setFilter: (partial) =>
    set((state) => {
      const bills = state.bills.map((b) =>
        b.id === state.currentBillId ? { ...b, filter: { ...b.filter, ...partial } } : b,
      )
      saveBills(bills)
      return { bills }
    }),

  clearFilter: () =>
    set((state) => {
      const bills = state.bills.map((b) =>
        b.id === state.currentBillId ? { ...b, filter: createEmptyFilter() } : b,
      )
      saveBills(bills)
      return { bills }
    }),

  clearData: () => {
    set((state) => {
      const bills = state.bills.filter((b) => b.id !== state.currentBillId)
      saveBills(bills)
      const currentBillId = bills.length > 0 ? bills[0].id : null
      saveCurrentBillId(currentBillId)
      return { bills, currentBillId, previewResult: null }
    })
  },

  setPreviewResult: (result) => set({ previewResult: result }),

  setPendingBillName: (name) => set({ pendingBillName: name }),

  confirmPreview: (billName) => {
    const { previewResult } = get()
    if (!previewResult || previewResult.allTransactions.length === 0) {
      set({ previewResult: null })
      return
    }
    const rules = useCategoryRuleStore.getState().rules
    const { transactions: txs } = applyCategoryRules(previewResult.allTransactions, rules, true)
    get().createBill(billName, txs)
  },
}))

export function useCurrentBill(): Bill | null {
  return useDashboardStore((s) => {
    const bill = s.bills.find((b) => b.id === s.currentBillId)
    return bill ?? null
  })
}

export function useTransactions(): Transaction[] {
  return useDashboardStore((s) => {
    const bill = s.bills.find((b) => b.id === s.currentBillId)
    return bill?.transactions ?? []
  })
}

export function useFilter(): FilterState {
  return useDashboardStore((s) => {
    const bill = s.bills.find((b) => b.id === s.currentBillId)
    return bill?.filter ?? createEmptyFilter()
  })
}

export function useDataLoaded(): boolean {
  return useDashboardStore((s) => {
    const bill = s.bills.find((b) => b.id === s.currentBillId)
    return (bill?.transactions.length ?? 0) > 0
  })
}
