import type { Bill, FilterState, Transaction, SavedView } from '@/types'
import type { CSVPreviewResult, MappedColumns } from '@/utils/csvParser'
import type { MergeAnalysisResult, BudgetMergeResult } from '@/utils/mergeAnalysis'

export type ReconciliationMode = 'create' | 'merge'

export interface DashboardStore {
  bills: Bill[]
  currentBillId: string | null
  previewResult: CSVPreviewResult | null
  pendingBillName: string | null
  mergeMode: boolean
  selectedBillIdsForMerge: string[]
  mergeFilter: FilterState
  mergeDedupeEnabled: boolean
  mergeAnalysisResult: MergeAnalysisResult | null
  budgetMergeResult: BudgetMergeResult | null
  isLoading: boolean
  initialize: () => Promise<void>
  createBill: (name: string, transactions: Transaction[]) => void
  mergeToCurrentBill: (transactions: Transaction[]) => void
  switchBill: (billId: string) => void
  renameBill: (billId: string, name: string) => void
  deleteBill: (billId: string) => void
  setCurrentBillTransactions: (transactions: Transaction[]) => void
  applyRulesToCurrentBill: () => { matchedCount: number; unchangedCount: number; manualSkippedCount: number }
  applyRulesToAllBills: () => { totalMatched: number; totalUnchanged: number; totalManualSkipped: number; billsAffected: number }
  setFilter: (filter: Partial<FilterState>) => void
  clearFilter: () => void
  clearData: () => void
  setPreviewResult: (result: CSVPreviewResult | null) => void
  setPendingBillName: (name: string | null) => void
  confirmPreview: (billName: string, customMappings?: MappedColumns) => void
  confirmPreviewMerge: (customMappings?: MappedColumns) => void
  confirmReconciliation: (billName: string, transactions: Transaction[], mode: ReconciliationMode) => void
  saveView: (name: string) => void
  switchView: (viewId: string) => void
  renameView: (viewId: string, name: string) => void
  deleteView: (viewId: string) => void
  updateTransactionCategory: (transactionId: string, category: string, isManual?: boolean) => void
  toggleMergeBill: (billId: string) => void
  enterMergeMode: () => void
  exitMergeMode: () => void
  setMergeFilter: (filter: Partial<FilterState>) => void
  clearMergeFilter: () => void
  setMergeDedupeEnabled: (enabled: boolean) => void
  refreshMergeAnalysis: () => void
}

export type StoreGetter = () => DashboardStore
export type StoreSetter = (
  partial: DashboardStore | Partial<DashboardStore> | ((state: DashboardStore) => DashboardStore | Partial<DashboardStore>),
) => void
