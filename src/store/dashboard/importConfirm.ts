import type { Transaction } from '@/types'
import { CATEGORY_LIST } from '@/types'
import type { MappedColumns } from '@/utils/csvParser'
import { parseRows, detectDuplicates } from '@/utils/csvParser'
import { applyCategoryRules } from '@/utils/categoryRuleMatcher'
import { useCategoryRuleStore } from '../useCategoryRuleStore'
import { useCategoryStore } from '../useCategoryStore'
import type { StoreSetter, StoreGetter, ReconciliationMode } from './types'

export function confirmPreview(
  set: StoreSetter,
  get: StoreGetter,
  billName: string,
  customMappings?: MappedColumns,
) {
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
}

export function confirmPreviewMerge(set: StoreSetter, get: StoreGetter, customMappings?: MappedColumns) {
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
}

export function confirmReconciliation(
  set: StoreSetter,
  get: StoreGetter,
  billName: string,
  transactions: Transaction[],
  mode: ReconciliationMode,
) {
  if (transactions.length === 0) {
    set({ previewResult: null, pendingBillName: null })
    return
  }

  const categoryStore = useCategoryStore.getState()
  const existingCategoryNames = new Set(categoryStore.getCategoryNames())
  const defaultCategories = new Set(CATEGORY_LIST)

  for (const tx of transactions) {
    const category = tx.category
    if (category && category !== '其他' && !existingCategoryNames.has(category) && !defaultCategories.has(category)) {
      categoryStore.addCategory(category)
      existingCategoryNames.add(category)
    }
  }

  if (mode === 'create') {
    get().createBill(billName, transactions)
  } else {
    get().mergeToCurrentBill(transactions)
  }
}
