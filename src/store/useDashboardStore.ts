import { create } from 'zustand'
import type { Transaction, FilterState, Bill, TransactionType, SavedView } from '@/types'
import type { CSVPreviewResult, MappedColumns } from '@/utils/csvParser'
import { parseRows, detectDuplicates } from '@/utils/csvParser'
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
    selectedType: 'expense',
    searchText: '',
    amountMin: null,
    amountMax: null,
  }
}

function loadBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BILLS)
    if (raw) {
      const bills = JSON.parse(raw) as Bill[]
      return bills.map((bill) => ({
        ...bill,
        filter: {
          ...createEmptyFilter(),
          ...bill.filter,
        },
        savedViews: bill.savedViews ?? [],
        transactions: bill.transactions.map((t) => ({
          ...t,
          type: ((t as { type?: string }).type || 'expense') as TransactionType,
        })),
      }))
    }
  } catch {
    // fall through
  }
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const transactions = JSON.parse(legacyRaw) as Transaction[]
      if (transactions.length > 0) {
        const migratedTransactions = transactions.map((t) => ({
          ...t,
          type: ((t as { type?: string }).type || 'expense') as TransactionType,
        }))
        const legacyBill: Bill = {
          id: generateId(),
          name: '默认账单',
          transactions: migratedTransactions,
          filter: createEmptyFilter(),
          savedViews: [],
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
  createBill: (name: string, transactions: Transaction[]) => void
  mergeToCurrentBill: (transactions: Transaction[]) => void
  switchBill: (billId: string) => void
  renameBill: (billId: string, name: string) => void
  deleteBill: (billId: string) => void
  setCurrentBillTransactions: (transactions: Transaction[]) => void
  setFilter: (filter: Partial<FilterState>) => void
  clearFilter: () => void
  clearData: () => void
  setPreviewResult: (result: CSVPreviewResult | null) => void
  setPendingBillName: (name: string | null) => void
  confirmPreview: (billName: string, customMappings?: MappedColumns) => void
  confirmPreviewMerge: (customMappings?: MappedColumns) => void
  saveView: (name: string) => void
  switchView: (viewId: string) => void
  renameView: (viewId: string, name: string) => void
  deleteView: (viewId: string) => void
}

function getCurrentBill(state: DashboardStore): Bill | undefined {
  return state.bills.find((b) => b.id === state.currentBillId)
}

function getCurrentTransactions(state: DashboardStore): Transaction[] {
  return getCurrentBill(state)?.transactions ?? []
}

function getCurrentFilter(state: DashboardStore): FilterState {
  return getCurrentBill(state)?.filter ?? createEmptyFilter()
}

function getDataLoaded(state: DashboardStore): boolean {
  return (getCurrentBill(state)?.transactions.length ?? 0) > 0
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  bills: loadBills(),
  currentBillId: loadCurrentBillId(),
  previewResult: null,
  pendingBillName: null,

  createBill: (name, transactions) => {
    const newBill: Bill = {
      id: generateId(),
      name: name.trim() || '未命名账单',
      transactions,
      filter: createEmptyFilter(),
      savedViews: [],
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

  mergeToCurrentBill: (transactions) => {
    set((state) => {
      const currentBill = getCurrentBill(state)
      if (!currentBill) return state
      const bills = state.bills.map((b) =>
        b.id === state.currentBillId
          ? { ...b, transactions: [...b.transactions, ...transactions] }
          : b,
      )
      saveBills(bills)
      return { bills, previewResult: null, pendingBillName: null }
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

  saveView: (name) => {
    set((state) => {
      const bill = getCurrentBill(state)
      if (!bill) return state
      const newView: SavedView = {
        id: generateId(),
        name: name.trim() || '未命名视图',
        filter: { ...bill.filter },
        createdAt: Date.now(),
      }
      const bills = state.bills.map((b) =>
        b.id === state.currentBillId ? { ...b, savedViews: [...b.savedViews, newView] } : b,
      )
      saveBills(bills)
      return { bills }
    })
  },

  switchView: (viewId) => {
    set((state) => {
      const bill = getCurrentBill(state)
      if (!bill) return state
      const view = bill.savedViews.find((v) => v.id === viewId)
      if (!view) return state
      const bills = state.bills.map((b) =>
        b.id === state.currentBillId ? { ...b, filter: { ...view.filter } } : b,
      )
      saveBills(bills)
      return { bills }
    })
  },

  renameView: (viewId, name) => {
    set((state) => {
      const bills = state.bills.map((b) => {
        if (b.id !== state.currentBillId) return b
        return {
          ...b,
          savedViews: b.savedViews.map((v) =>
            v.id === viewId ? { ...v, name: name.trim() || '未命名视图' } : v,
          ),
        }
      })
      saveBills(bills)
      return { bills }
    })
  },

  deleteView: (viewId) => {
    set((state) => {
      const bills = state.bills.map((b) => {
        if (b.id !== state.currentBillId) return b
        return {
          ...b,
          savedViews: b.savedViews.filter((v) => v.id !== viewId),
        }
      })
      saveBills(bills)
      return { bills }
    })
  },

  confirmPreview: (billName, customMappings) => {
    const { previewResult } = get()
    if (!previewResult) {
      set({ previewResult: null })
      return
    }

    let transactions = previewResult.allTransactions

    if (customMappings) {
      const { date, category, merchant, amount, type } = customMappings
      if (!date || !amount) {
        set({ previewResult: null })
        return
      }
      const { transactions: parsedTxs } = parseRows(
        previewResult.rawRows,
        date,
        category,
        merchant,
        amount,
        type,
      )
      transactions = parsedTxs
    }

    if (transactions.length === 0) {
      set({ previewResult: null })
      return
    }

    const rules = useCategoryRuleStore.getState().rules
    const { transactions: txs } = applyCategoryRules(transactions, rules, true)
    get().createBill(billName, txs)
  },

  confirmPreviewMerge: (customMappings) => {
    const { previewResult, bills, currentBillId } = get()
    if (!previewResult) {
      set({ previewResult: null })
      return
    }

    let transactions = previewResult.allTransactions

    if (customMappings) {
      const { date, category, merchant, amount, type } = customMappings
      if (!date || !amount) {
        set({ previewResult: null })
        return
      }
      const { transactions: parsedTxs } = parseRows(
        previewResult.rawRows,
        date,
        category,
        merchant,
        amount,
        type,
      )
      transactions = parsedTxs
    }

    if (transactions.length === 0) {
      set({ previewResult: null })
      return
    }

    const rules = useCategoryRuleStore.getState().rules
    const { transactions: txs } = applyCategoryRules(transactions, rules, true)

    const currentBill = bills.find((b) => b.id === currentBillId)
    if (currentBill) {
      const { duplicateIds } = detectDuplicates(txs, currentBill.transactions)
      const nonDuplicate = txs.filter((t) => !duplicateIds.has(t.id))
      get().mergeToCurrentBill(nonDuplicate)
    } else {
      set({ previewResult: null, pendingBillName: null })
    }
  },
}))

export function useCurrentBill(): Bill | null {
  return useDashboardStore((s) => getCurrentBill(s) ?? null)
}

export function useTransactions(): Transaction[] {
  return useDashboardStore((s) => getCurrentTransactions(s))
}

export function useFilter(): FilterState {
  return useDashboardStore((s) => getCurrentFilter(s))
}

export function useDataLoaded(): boolean {
  return useDashboardStore((s) => getDataLoaded(s))
}

export function useSavedViews(): SavedView[] {
  return useDashboardStore((s) => getCurrentBill(s)?.savedViews ?? [])
}
