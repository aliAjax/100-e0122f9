import type { FilterState } from '@/types'
import type { StoreSetter, StoreGetter } from './types'
import { createEmptyFilter } from './persistence'
import { analyzeMergeDuplicates, analyzeBudgetConflicts, validateMergeInputs } from '@/utils/mergeAnalysis'
import { useBudgetStore } from '../useBudgetStore'

export function toggleMergeBill(set: StoreSetter, get: StoreGetter, billId: string) {
  set((state) => {
    const selected = state.selectedBillIdsForMerge.includes(billId)
      ? state.selectedBillIdsForMerge.filter((id) => id !== billId)
      : [...state.selectedBillIdsForMerge, billId]
    return { selectedBillIdsForMerge: selected }
  })
}

export function enterMergeMode(set: StoreSetter, get: StoreGetter) {
  set((state) => {
    if (state.selectedBillIdsForMerge.length < 2) return state
    const validation = validateMergeInputs(state.bills, state.selectedBillIdsForMerge)
    if (!validation.valid) return state
    const analysisResult = analyzeMergeDuplicates(state.bills, state.selectedBillIdsForMerge)
    const budget = useBudgetStore.getState().budgets
    const budgetResult = analyzeBudgetConflicts(state.bills, state.selectedBillIdsForMerge, budget)
    return {
      mergeMode: true,
      mergeAnalysisResult: analysisResult,
      budgetMergeResult: budgetResult,
    }
  })
}

export function exitMergeMode(set: StoreSetter, get: StoreGetter) {
  set({
    mergeMode: false,
    mergeAnalysisResult: null,
    budgetMergeResult: null,
  })
}

export function setMergeDedupeEnabled(set: StoreSetter, get: StoreGetter, enabled: boolean) {
  set((state) => {
    const analysisResult = state.mergeMode
      ? analyzeMergeDuplicates(state.bills, state.selectedBillIdsForMerge)
      : null
    return {
      mergeDedupeEnabled: enabled,
      mergeAnalysisResult: analysisResult,
    }
  })
}

export function refreshMergeAnalysis(set: StoreSetter, get: StoreGetter) {
  set((state) => {
    if (!state.mergeMode) return state
    const analysisResult = analyzeMergeDuplicates(state.bills, state.selectedBillIdsForMerge)
    const budget = useBudgetStore.getState().budgets
    const budgetResult = analyzeBudgetConflicts(state.bills, state.selectedBillIdsForMerge, budget)
    return {
      mergeAnalysisResult: analysisResult,
      budgetMergeResult: budgetResult,
    }
  })
}

export function setMergeFilter(set: StoreSetter, get: StoreGetter, partial: Partial<FilterState>) {
  set((state) => ({
    mergeFilter: { ...state.mergeFilter, ...partial },
  }))
}

export function clearMergeFilter(set: StoreSetter, get: StoreGetter) {
  set({ mergeFilter: createEmptyFilter() })
}
