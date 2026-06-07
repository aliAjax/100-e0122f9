import type { Transaction, CategoryRule, RulePreviewResult, TransactionPreview, CategoryChangePreview, BudgetImpactPreview, BudgetMap } from '@/types'
import { aggregateByCategory } from './dataAggregation'

export function matchCategoryByMerchant(
  merchant: string,
  rules: CategoryRule[],
): { category: string; keyword: string; ruleId: string } | null {
  const trimmedMerchant = merchant.trim().toLowerCase()
  if (!trimmedMerchant) return null

  for (const rule of rules) {
    if (!rule.enabled) continue
    const keyword = rule.keyword.trim().toLowerCase()
    if (!keyword) continue
    if (trimmedMerchant.includes(keyword)) {
      return { category: rule.category, keyword: rule.keyword, ruleId: rule.id }
    }
  }

  return null
}

export function matchAllRulesForMerchant(
  merchant: string,
  rules: CategoryRule[],
): Array<{ category: string; keyword: string; ruleId: string }> {
  const trimmedMerchant = merchant.trim().toLowerCase()
  if (!trimmedMerchant) return []

  const matches: Array<{ category: string; keyword: string; ruleId: string }> = []
  for (const rule of rules) {
    if (!rule.enabled) continue
    const keyword = rule.keyword.trim().toLowerCase()
    if (!keyword) continue
    if (trimmedMerchant.includes(keyword)) {
      matches.push({ category: rule.category, keyword: rule.keyword, ruleId: rule.id })
    }
  }

  return matches
}

export function applyCategoryRules(
  transactions: Transaction[],
  rules: CategoryRule[],
  fallbackToOther: boolean = true,
): {
  transactions: Transaction[]
  matchedCount: number
  unmatchedCount: number
} {
  let matchedCount = 0
  let unmatchedCount = 0

  const updatedTransactions = transactions.map((tx) => {
    const matchResult = matchCategoryByMerchant(tx.merchant, rules)

    if (matchResult) {
      matchedCount++
      return { ...tx, category: matchResult.category }
    }

    unmatchedCount++
    if (fallbackToOther && !tx.category) {
      return { ...tx, category: '其他' }
    }

    return tx
  })

  return {
    transactions: updatedTransactions,
    matchedCount,
    unmatchedCount,
  }
}

export function applyCategoryRulesWithPreserve(
  transactions: Transaction[],
  rules: CategoryRule[],
): {
  transactions: Transaction[]
  matchedCount: number
  unchangedCount: number
} {
  let matchedCount = 0
  let unchangedCount = 0

  const updatedTransactions = transactions.map((tx) => {
    const matchResult = matchCategoryByMerchant(tx.merchant, rules)

    if (matchResult) {
      matchedCount++
      return { ...tx, category: matchResult.category }
    }

    unchangedCount++
    return tx
  })

  return {
    transactions: updatedTransactions,
    matchedCount,
    unchangedCount,
  }
}

export function applyCategoryRulesWithDetails(
  transactions: Transaction[],
  rules: CategoryRule[],
  existingCategories: string[],
  fallbackToOther: boolean = true,
): {
  transactions: Array<Transaction & { matchedRuleKeyword?: string; isNewCategory: boolean }>
  matchedCount: number
  unmatchedCount: number
  newCategories: string[]
} {
  let matchedCount = 0
  let unmatchedCount = 0
  const newCategoriesSet = new Set<string>()
  const existingCategoriesSet = new Set(existingCategories)

  const updatedTransactions = transactions.map((tx) => {
    const matchResult = matchCategoryByMerchant(tx.merchant, rules)
    let category = tx.category
    let matchedRuleKeyword: string | undefined

    if (matchResult) {
      matchedCount++
      category = matchResult.category
      matchedRuleKeyword = matchResult.keyword
    } else {
      unmatchedCount++
      if (fallbackToOther && !tx.category) {
        category = '其他'
      }
    }

    const isNewCategory = category && category !== '其他' && !existingCategoriesSet.has(category)
    if (isNewCategory) {
      newCategoriesSet.add(category)
    }

    return { ...tx, category, matchedRuleKeyword, isNewCategory }
  })

  return {
    transactions: updatedTransactions,
    matchedCount,
    unmatchedCount,
    newCategories: Array.from(newCategoriesSet),
  }
}

export function previewRuleImpact(
  transactions: Transaction[],
  rules: CategoryRule[],
  budgets: BudgetMap,
): RulePreviewResult {
  const affectedTransactions: TransactionPreview[] = []
  let totalAffected = 0
  let totalUnchanged = 0
  let totalManualSkipped = 0

  const originalCategoryAgg = aggregateByCategory(transactions, 'expense')
  const originalCategoryMap = new Map(originalCategoryAgg.map((c) => [c.category, c]))

  const updatedTransactions: Transaction[] = []

  for (const tx of transactions) {
    const originalCategory = tx.category
    const isManual = tx.isManualCategory === true

    if (isManual) {
      totalManualSkipped++
      totalUnchanged++
      updatedTransactions.push(tx)
      continue
    }

    const matchResult = matchCategoryByMerchant(tx.merchant, rules)
    const newCategory = matchResult ? matchResult.category : originalCategory
    const categoryChanged = newCategory !== originalCategory

    if (categoryChanged) {
      totalAffected++
      affectedTransactions.push({
        transaction: tx,
        originalCategory,
        newCategory,
        matchedRuleKeyword: matchResult?.keyword,
        isManualCategory: isManual,
        categoryChanged: true,
      })
    } else {
      totalUnchanged++
    }

    updatedTransactions.push({ ...tx, category: newCategory })
  }

  const newCategoryAgg = aggregateByCategory(updatedTransactions, 'expense')
  const newCategoryMap = new Map(newCategoryAgg.map((c) => [c.category, c]))

  const allCategories = new Set([...originalCategoryMap.keys(), ...newCategoryMap.keys()])
  const categoryChanges: CategoryChangePreview[] = []

  for (const category of allCategories) {
    const original = originalCategoryMap.get(category)
    const newData = newCategoryMap.get(category)
    const originalAmount = original?.amount ?? 0
    const newAmount = newData?.amount ?? 0
    const originalCount = original?.count ?? 0
    const newCount = newData?.count ?? 0

    if (originalAmount !== newAmount || originalCount !== newCount) {
      categoryChanges.push({
        category,
        originalAmount,
        newAmount,
        changeAmount: newAmount - originalAmount,
        originalCount,
        newCount,
      })
    }
  }

  categoryChanges.sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount))

  const budgetImpacts: BudgetImpactPreview[] = []
  for (const [category, budget] of Object.entries(budgets)) {
    const original = originalCategoryMap.get(category)?.amount ?? 0
    const newAmount = newCategoryMap.get(category)?.amount ?? 0
    const originalRatio = budget > 0 ? original / budget : 0
    const newRatio = budget > 0 ? newAmount / budget : 0

    if (original !== newAmount) {
      budgetImpacts.push({
        category,
        originalSpent: original,
        newSpent: newAmount,
        budget,
        originalRatio,
        newRatio,
      })
    }
  }

  budgetImpacts.sort((a, b) => Math.abs(b.newRatio - b.originalRatio) - Math.abs(a.newRatio - a.originalRatio))

  return {
    affectedTransactions,
    categoryChanges,
    budgetImpacts,
    totalAffected,
    totalUnchanged,
    totalManualSkipped,
  }
}

export function applyCategoryRulesWithManualPreserve(
  transactions: Transaction[],
  rules: CategoryRule[],
): {
  transactions: Transaction[]
  matchedCount: number
  unchangedCount: number
  manualSkippedCount: number
} {
  let matchedCount = 0
  let unchangedCount = 0
  let manualSkippedCount = 0

  const updatedTransactions = transactions.map((tx) => {
    if (tx.isManualCategory) {
      manualSkippedCount++
      unchangedCount++
      return tx
    }

    const matchResult = matchCategoryByMerchant(tx.merchant, rules)

    if (matchResult && matchResult.category !== tx.category) {
      matchedCount++
      return { ...tx, category: matchResult.category }
    }

    unchangedCount++
    return tx
  })

  return {
    transactions: updatedTransactions,
    matchedCount,
    unchangedCount,
    manualSkippedCount,
  }
}
