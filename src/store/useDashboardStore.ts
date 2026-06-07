import { create } from 'zustand'
import type { CSVPreviewResult, MappedColumns } from '@/utils/csvParser'
import type { DashboardStore } from './dashboard/types'
import { loadBills, loadCurrentBillId, createEmptyFilter } from './dashboard/persistence'
import {
  createBill,
  mergeToCurrentBill,
  switchBill,
  renameBill,
  deleteBill,
  setCurrentBillTransactions,
  applyRulesToCurrentBill,
  applyRulesToAllBills,
  updateTransactionCategory,
  setFilter,
  clearFilter,
  clearData,
} from './dashboard/billOperations'
import {
  saveView,
  switchView,
  renameView,
  deleteView,
} from './dashboard/viewOperations'
import {
  confirmPreview,
  confirmPreviewMerge,
  confirmReconciliation,
} from './dashboard/importConfirm'
import {
  toggleMergeBill,
  enterMergeMode,
  exitMergeMode,
  setMergeFilter,
  clearMergeFilter,
  setMergeDedupeEnabled,
  refreshMergeAnalysis,
} from './dashboard/mergeOperations'
import {
  EMPTY_TRANSACTIONS,
  EMPTY_FILTER,
  EMPTY_VIEWS,
  getCurrentBill,
  getCurrentTransactions,
  getCurrentFilter,
  getDataLoaded,
  getMergedTransactions,
  getMergedFilter,
  getMergeDataLoaded,
  getEffectiveTransactions,
  getEffectiveFilter,
  getEffectiveDataLoaded,
} from './dashboard/selectors'
import type { Transaction, Bill, FilterState, SavedView } from '@/types'

export { EMPTY_TRANSACTIONS }

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  bills: [],
  currentBillId: loadCurrentBillId(),
  previewResult: null,
  pendingBillName: null,
  mergeMode: false,
  selectedBillIdsForMerge: [],
  mergeFilter: createEmptyFilter(),
  mergeDedupeEnabled: true,
  mergeAnalysisResult: null,
  budgetMergeResult: null,
  isLoading: true,

  initialize: async () => {
    const bills = await loadBills()
    set({ bills, isLoading: false })
  },

  createBill: (name, transactions) => createBill(set, get, name, transactions),
  mergeToCurrentBill: (transactions) => mergeToCurrentBill(set, get, transactions),
  switchBill: (billId) => switchBill(set, get, billId),
  renameBill: (billId, name) => renameBill(set, get, billId, name),
  deleteBill: (billId) => deleteBill(set, get, billId),
  setCurrentBillTransactions: (transactions) => setCurrentBillTransactions(set, get, transactions),
  applyRulesToCurrentBill: () => applyRulesToCurrentBill(set, get),
  applyRulesToAllBills: () => applyRulesToAllBills(set, get),
  updateTransactionCategory: (transactionId, category, isManual?) =>
    updateTransactionCategory(set, get, transactionId, category, isManual),
  setFilter: (partial) => setFilter(set, get, partial),
  clearFilter: () => clearFilter(set, get),
  clearData: () => clearData(set, get),

  setPreviewResult: (result) => set({ previewResult: result }),
  setPendingBillName: (name) => set({ pendingBillName: name }),
  confirmPreview: (billName, customMappings?) => confirmPreview(set, get, billName, customMappings),
  confirmPreviewMerge: (customMappings?) => confirmPreviewMerge(set, get, customMappings),
  confirmReconciliation: (billName, transactions, mode) =>
    confirmReconciliation(set, get, billName, transactions, mode),

  saveView: (name) => saveView(set, get, name),
  switchView: (viewId) => switchView(set, get, viewId),
  renameView: (viewId, name) => renameView(set, get, viewId, name),
  deleteView: (viewId) => deleteView(set, get, viewId),

  toggleMergeBill: (billId) => toggleMergeBill(set, get, billId),
  enterMergeMode: () => enterMergeMode(set, get),
  exitMergeMode: () => exitMergeMode(set, get),
  setMergeFilter: (partial) => setMergeFilter(set, get, partial),
  clearMergeFilter: () => clearMergeFilter(set, get),
  setMergeDedupeEnabled: (enabled) => setMergeDedupeEnabled(set, get, enabled),
  refreshMergeAnalysis: () => refreshMergeAnalysis(set, get),
}))

export function useCurrentBill(): Bill | null {
  return useDashboardStore((s) => {
    const bill = getCurrentBill(s)
    return bill ?? null
  })
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
  return useDashboardStore((s) => getCurrentBill(s)?.savedViews ?? EMPTY_VIEWS)
}

export function useMergeMode(): boolean {
  return useDashboardStore((s) => s.mergeMode)
}

export function useSelectedBillIdsForMerge(): string[] {
  return useDashboardStore((s) => s.selectedBillIdsForMerge)
}

export function useMergedTransactions(): Transaction[] {
  return useDashboardStore((s) => getMergedTransactions(s))
}

export function useMergedFilter(): FilterState {
  return useDashboardStore((s) => getMergedFilter(s))
}

export function useMergeDataLoaded(): boolean {
  return useDashboardStore((s) => getMergeDataLoaded(s))
}

export function useEffectiveTransactions(): Transaction[] {
  return useDashboardStore((s) => getEffectiveTransactions(s))
}

export function useEffectiveFilter(): FilterState {
  return useDashboardStore((s) => getEffectiveFilter(s))
}

export function useEffectiveDataLoaded(): boolean {
  return useDashboardStore((s) => getEffectiveDataLoaded(s))
}

export function useMergeDedupeEnabled(): boolean {
  return useDashboardStore((s) => s.mergeDedupeEnabled)
}

export function useMergeAnalysisResult() {
  return useDashboardStore((s) => s.mergeAnalysisResult)
}

export function useBudgetMergeResult() {
  return useDashboardStore((s) => s.budgetMergeResult)
}
