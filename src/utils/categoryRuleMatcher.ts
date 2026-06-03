import type { Transaction, CategoryRule } from '@/types'

export function matchCategoryByMerchant(
  merchant: string,
  rules: CategoryRule[],
): string | null {
  const trimmedMerchant = merchant.trim().toLowerCase()
  if (!trimmedMerchant) return null

  for (const rule of rules) {
    if (!rule.enabled) continue
    const keyword = rule.keyword.trim().toLowerCase()
    if (!keyword) continue
    if (trimmedMerchant.includes(keyword)) {
      return rule.category
    }
  }

  return null
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
    const matchedCategory = matchCategoryByMerchant(tx.merchant, rules)

    if (matchedCategory) {
      matchedCount++
      return { ...tx, category: matchedCategory }
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
    const matchedCategory = matchCategoryByMerchant(tx.merchant, rules)

    if (matchedCategory) {
      matchedCount++
      return { ...tx, category: matchedCategory }
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
