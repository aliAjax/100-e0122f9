import type { Bill, Transaction, FilterState } from '@/types'
import type { StoreSetter, StoreGetter } from './types'
import { generateId, createEmptyFilter, saveBills, saveCurrentBillId, removeBillFromStorage } from './persistence'
import { getCurrentBill } from './selectors'
import { applyCategoryRulesWithManualPreserve } from '@/utils/categoryRuleMatcher'
import { useCategoryRuleStore } from '../useCategoryRuleStore'

export function createBill(set: StoreSetter, get: StoreGetter, name: string, transactions: Transaction[]) {
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
    void saveBills(bills)
    saveCurrentBillId(newBill.id)
    return {
      bills,
      currentBillId: newBill.id,
      previewResult: null,
      pendingBillName: null,
    }
  })
}

export function mergeToCurrentBill(set: StoreSetter, get: StoreGetter, transactions: Transaction[]) {
  set((state) => {
    const currentBill = getCurrentBill(state)
    if (!currentBill) return state
    const bills = state.bills.map((b) =>
      b.id === state.currentBillId
        ? { ...b, transactions: [...b.transactions, ...transactions] }
        : b,
    )
    void saveBills(bills)
    return { bills, previewResult: null, pendingBillName: null }
  })
}

export function switchBill(set: StoreSetter, get: StoreGetter, billId: string) {
  const { bills } = get()
  const bill = bills.find((b) => b.id === billId)
  if (!bill) return
  saveCurrentBillId(billId)
  set({ currentBillId: billId })
}

export function renameBill(set: StoreSetter, get: StoreGetter, billId: string, name: string) {
  set((state) => {
    const bills = state.bills.map((b) =>
      b.id === billId ? { ...b, name: name.trim() || '未命名账单' } : b,
    )
    void saveBills(bills)
    return { bills }
  })
}

export function deleteBill(set: StoreSetter, get: StoreGetter, billId: string) {
  removeBillFromStorage(billId)
  set((state) => {
    const bills = state.bills.filter((b) => b.id !== billId)
    void saveBills(bills)
    let currentBillId = state.currentBillId
    if (state.currentBillId === billId) {
      currentBillId = bills.length > 0 ? bills[0].id : null
      saveCurrentBillId(currentBillId)
    }
    return { bills, currentBillId }
  })
}

export function setCurrentBillTransactions(set: StoreSetter, get: StoreGetter, transactions: Transaction[]) {
  set((state) => {
    const bills = state.bills.map((b) =>
      b.id === state.currentBillId ? { ...b, transactions } : b,
    )
    void saveBills(bills)
    return { bills }
  })
}

export function updateTransactionCategory(
  set: StoreSetter,
  get: StoreGetter,
  transactionId: string,
  category: string,
  isManual: boolean = true,
) {
  set((state) => {
    const bills = state.bills.map((bill) => ({
      ...bill,
      transactions: bill.transactions.map((tx) =>
        tx.id === transactionId
          ? { ...tx, category, isManualCategory: isManual }
          : tx,
      ),
    }))
    void saveBills(bills)
    return { bills }
  })
}

export function applyRulesToCurrentBill(set: StoreSetter, get: StoreGetter) {
  const rules = useCategoryRuleStore.getState().rules
  let result = { matchedCount: 0, unchangedCount: 0, manualSkippedCount: 0 }
  set((state) => {
    const currentBill = getCurrentBill(state)
    if (!currentBill) return state
    const applyResult = applyCategoryRulesWithManualPreserve(currentBill.transactions, rules)
    result = applyResult
    const bills = state.bills.map((b) =>
      b.id === state.currentBillId ? { ...b, transactions: applyResult.transactions } : b,
    )
    void saveBills(bills)
    return { bills }
  })
  return result
}

export function applyRulesToAllBills(set: StoreSetter, get: StoreGetter) {
  const rules = useCategoryRuleStore.getState().rules
  let totalMatched = 0
  let totalUnchanged = 0
  let totalManualSkipped = 0
  let billsAffected = 0
  set((state) => {
    const bills = state.bills.map((bill) => {
      const applyResult = applyCategoryRulesWithManualPreserve(bill.transactions, rules)
      if (applyResult.matchedCount > 0) {
        billsAffected++
      }
      totalMatched += applyResult.matchedCount
      totalUnchanged += applyResult.unchangedCount
      totalManualSkipped += applyResult.manualSkippedCount
      return { ...bill, transactions: applyResult.transactions }
    })
    void saveBills(bills)
    return { bills }
  })
  return { totalMatched, totalUnchanged, totalManualSkipped, billsAffected }
}

export function setFilter(set: StoreSetter, get: StoreGetter, partial: Partial<FilterState>) {
  set((state) => {
    const bills = state.bills.map((b) =>
      b.id === state.currentBillId ? { ...b, filter: { ...b.filter, ...partial } } : b,
    )
    void saveBills(bills)
    return { bills }
  })
}

export function clearFilter(set: StoreSetter, get: StoreGetter) {
  set((state) => {
    const bills = state.bills.map((b) =>
      b.id === state.currentBillId ? { ...b, filter: createEmptyFilter() } : b,
    )
    void saveBills(bills)
    return { bills }
  })
}

export function clearData(set: StoreSetter, get: StoreGetter) {
  set((state) => {
    const bills = state.bills.filter((b) => b.id !== state.currentBillId)
    void saveBills(bills)
    const currentBillId = bills.length > 0 ? bills[0].id : null
    saveCurrentBillId(currentBillId)
    return { bills, currentBillId, previewResult: null }
  })
}
