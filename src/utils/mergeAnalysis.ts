import type { Transaction, Bill, BudgetMap } from '@/types'

export interface DuplicateGroup {
  key: string
  transactions: Array<{ billId: string; transaction: Transaction }>
  count: number
}

export interface MergeAnalysisResult {
  allTransactions: Array<Transaction & { billId: string; billName: string }>
  uniqueTransactions: Array<Transaction & { billId: string; billName: string }>
  duplicateGroups: DuplicateGroup[]
  duplicateCount: number
  totalCount: number
  billInfo: Array<{ billId: string; billName: string; transactionCount: number }>
}

export interface BudgetConflict {
  category: string
  billBudgets: Array<{ billId: string; billName: string; amount: number | null }>
  unifiedAmount: number | null
  conflictType: 'missing' | 'mismatch' | 'consistent'
}

export interface BudgetMergeResult {
  conflicts: BudgetConflict[]
  unifiedBudget: BudgetMap
  hasConflicts: boolean
  categoriesWithConflicts: string[]
}

function getTransactionFingerprint(t: Transaction): string {
  const normalizedMerchant = t.merchant?.trim().toLowerCase() ?? ''
  return `${t.date}|${t.amount.toFixed(2)}|${normalizedMerchant}|${t.type}`
}

export function analyzeMergeDuplicates(bills: Bill[], selectedBillIds: string[]): MergeAnalysisResult {
  const selectedBills = bills.filter((b) => selectedBillIds.includes(b.id))
  const allTransactions: Array<Transaction & { billId: string; billName: string }> = []
  const fingerprintMap = new Map<string, Array<{ billId: string; transaction: Transaction }>>()

  for (const bill of selectedBills) {
    for (const tx of bill.transactions) {
      allTransactions.push({ ...tx, billId: bill.id, billName: bill.name })
      const fp = getTransactionFingerprint(tx)
      if (!fingerprintMap.has(fp)) {
        fingerprintMap.set(fp, [])
      }
      fingerprintMap.get(fp)!.push({ billId: bill.id, transaction: tx })
    }
  }

  const duplicateGroups: DuplicateGroup[] = []
  const uniqueTransactions: Array<Transaction & { billId: string; billName: string }> = []
  const seenFingerprints = new Set<string>()

  for (const [fp, items] of fingerprintMap) {
    if (items.length > 1) {
      duplicateGroups.push({
        key: fp,
        transactions: items,
        count: items.length,
      })
    }
    if (!seenFingerprints.has(fp)) {
      seenFingerprints.add(fp)
      const firstItem = items[0]
      const bill = selectedBills.find((b) => b.id === firstItem.billId)
      uniqueTransactions.push({
        ...firstItem.transaction,
        billId: firstItem.billId,
        billName: bill?.name ?? '',
      })
    }
  }

  return {
    allTransactions,
    uniqueTransactions,
    duplicateGroups,
    duplicateCount: duplicateGroups.reduce((sum, g) => sum + (g.count - 1), 0),
    totalCount: allTransactions.length,
    billInfo: selectedBills.map((b) => ({
      billId: b.id,
      billName: b.name,
      transactionCount: b.transactions.length,
    })),
  }
}

export function analyzeBudgetConflicts(
  bills: Bill[],
  selectedBillIds: string[],
  globalBudget: BudgetMap,
): BudgetMergeResult {
  const selectedBills = bills.filter((b) => selectedBillIds.includes(b.id))
  const allCategories = new Set<string>()

  for (const bill of selectedBills) {
    for (const tx of bill.transactions) {
      allCategories.add(tx.category)
    }
  }

  const conflicts: BudgetConflict[] = []
  const unifiedBudget: BudgetMap = { ...globalBudget }
  const categoriesWithConflicts: string[] = []

  for (const category of allCategories) {
    const amount = globalBudget[category] ?? null
    if (amount === null) {
      categoriesWithConflicts.push(category)
      conflicts.push({
        category,
        billBudgets: selectedBills.map((bill) => ({
          billId: bill.id,
          billName: bill.name,
          amount: null,
        })),
        unifiedAmount: null,
        conflictType: 'missing',
      })
    }
  }

  return {
    conflicts,
    unifiedBudget,
    hasConflicts: conflicts.length > 0,
    categoriesWithConflicts,
  }
}

export function getCategoryStats(transactions: Transaction[]): Map<string, { count: number; amount: number }> {
  const stats = new Map<string, { count: number; amount: number }>()
  for (const tx of transactions) {
    const existing = stats.get(tx.category) ?? { count: 0, amount: 0 }
    stats.set(tx.category, {
      count: existing.count + 1,
      amount: existing.amount + tx.amount,
    })
  }
  return stats
}

export function validateMergeInputs(
  bills: Bill[],
  selectedBillIds: string[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const selectedBills = bills.filter((b) => selectedBillIds.includes(b.id))

  if (selectedBillIds.length < 2) {
    errors.push('请至少选择 2 份账单进行合并分析')
  }

  if (selectedBills.some((b) => b.transactions.length === 0)) {
    const emptyBills = selectedBills.filter((b) => b.transactions.length === 0).map((b) => b.name)
    errors.push(`以下账单没有交易数据：${emptyBills.join('、')}`)
  }

  const totalTransactions = selectedBills.reduce((sum, b) => sum + b.transactions.length, 0)
  if (totalTransactions === 0) {
    errors.push('选中的账单没有任何交易数据')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
