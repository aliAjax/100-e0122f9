import type { Transaction, CategoryRule } from '@/types'

export function matchCategoryByMerchant(
  merchant: string,
  rules: CategoryRule[],
): { category: string; keyword: string } | null {
  const trimmedMerchant = merchant.trim().toLowerCase()
  if (!trimmedMerchant) return null

  for (const rule of rules) {
    if (!rule.enabled) continue
    const keyword = rule.keyword.trim().toLowerCase()
    if (!keyword) continue
    if (trimmedMerchant.includes(keyword)) {
      return { category: rule.category, keyword: rule.keyword }
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
