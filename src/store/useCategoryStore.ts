import { create } from 'zustand'
import { DEFAULT_COLORS } from '@/types'
import { useDashboardStore } from './useDashboardStore'
import { useBudgetStore } from './useBudgetStore'
import { useCategoryRuleStore } from './useCategoryRuleStore'

const STORAGE_KEY = 'spendlens_categories'

const DEFAULT_CATEGORIES = [
  { name: '餐饮', color: '#10B981' },
  { name: '交通', color: '#3B82F6' },
  { name: '购物', color: '#F59E0B' },
  { name: '娱乐', color: '#EC4899' },
  { name: '居住', color: '#8B5CF6' },
  { name: '医疗', color: '#EF4444' },
  { name: '教育', color: '#06B6D4' },
  { name: '通讯', color: '#F97316' },
  { name: '其他', color: '#6B7280' },
]

export interface CategoryItem {
  name: string
  color: string
}

function loadCategories(): CategoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_CATEGORIES
}

function saveCategories(categories: CategoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
}

function pickNextColor(existing: CategoryItem[]): string {
  const usedColors = new Set(existing.map((c) => c.color))
  for (const c of DEFAULT_COLORS) {
    if (!usedColors.has(c)) return c
  }
  return DEFAULT_COLORS[existing.length % DEFAULT_COLORS.length]
}

interface CategoryStore {
  categories: CategoryItem[]
  addCategory: (name: string, color?: string) => boolean
  renameCategory: (oldName: string, newName: string) => boolean
  mergeCategories: (sourceName: string, targetName: string) => void
  deleteCategory: (name: string, fallbackName: string) => void
  updateCategoryColor: (name: string, color: string) => void
  getCategoryNames: () => string[]
  getCategoryColor: (name: string, fallbackIndex?: number) => string
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: loadCategories(),

  addCategory: (name, color) => {
    const trimmed = name.trim()
    if (!trimmed) return false
    const { categories } = get()
    if (categories.some((c) => c.name === trimmed)) return false
    const newColor = color ?? pickNextColor(categories)
    const next = [...categories, { name: trimmed, color: newColor }]
    saveCategories(next)
    set({ categories: next })
    return true
  },

  renameCategory: (oldName, newName) => {
    const trimmedNew = newName.trim()
    if (!trimmedNew || trimmedNew === oldName) return false
    const { categories } = get()
    if (categories.some((c) => c.name === trimmedNew)) return false

    const next = categories.map((c) =>
      c.name === oldName ? { ...c, name: trimmedNew } : c,
    )
    saveCategories(next)
    set({ categories: next })

    useDashboardStore.setState((state) => ({
      bills: state.bills.map((bill) => ({
        ...bill,
        transactions: bill.transactions.map((t) =>
          t.category === oldName ? { ...t, category: trimmedNew } : t,
        ),
        filter: {
          ...bill.filter,
          selectedCategory:
            bill.filter.selectedCategory === oldName
              ? trimmedNew
              : bill.filter.selectedCategory,
        },
      })),
    }))

    const dashboardState = useDashboardStore.getState()
    const billsRaw = JSON.stringify(dashboardState.bills)
    localStorage.setItem('spendlens_bills', billsRaw)

    useBudgetStore.setState((state) => {
      const nextBudgets: Record<string, number> = {}
      for (const [cat, amount] of Object.entries(state.budgets)) {
        if (cat === oldName) {
          nextBudgets[trimmedNew] = amount
        } else {
          nextBudgets[cat] = amount
        }
      }
      localStorage.setItem('spendlens_budgets', JSON.stringify(nextBudgets))
      return { budgets: nextBudgets }
    })

    useCategoryRuleStore.setState((state) => {
      const next = state.rules.map((r) =>
        r.category === oldName ? { ...r, category: trimmedNew } : r,
      )
      localStorage.setItem('spendlens_category_rules', JSON.stringify(next))
      return { rules: next }
    })

    return true
  },

  mergeCategories: (sourceName, targetName) => {
    if (sourceName === targetName) return
    const { categories } = get()
    const next = categories.filter((c) => c.name !== sourceName)
    saveCategories(next)
    set({ categories: next })

    useDashboardStore.setState((state) => ({
      bills: state.bills.map((bill) => ({
        ...bill,
        transactions: bill.transactions.map((t) =>
          t.category === sourceName ? { ...t, category: targetName } : t,
        ),
        filter: {
          ...bill.filter,
          selectedCategory:
            bill.filter.selectedCategory === sourceName
              ? targetName
              : bill.filter.selectedCategory,
        },
      })),
    }))

    const dashboardState = useDashboardStore.getState()
    const billsRaw = JSON.stringify(dashboardState.bills)
    localStorage.setItem('spendlens_bills', billsRaw)

    useBudgetStore.setState((state) => {
      const nextBudgets: Record<string, number> = {}
      for (const [cat, amount] of Object.entries(state.budgets)) {
        if (cat === sourceName) {
          nextBudgets[targetName] = (nextBudgets[targetName] ?? 0) + amount
        } else if (cat === targetName) {
          nextBudgets[targetName] = (nextBudgets[targetName] ?? 0) + amount
        } else {
          nextBudgets[cat] = amount
        }
      }
      localStorage.setItem('spendlens_budgets', JSON.stringify(nextBudgets))
      return { budgets: nextBudgets }
    })

    useCategoryRuleStore.setState((state) => {
      const next = state.rules.map((r) =>
        r.category === sourceName ? { ...r, category: targetName } : r,
      )
      localStorage.setItem('spendlens_category_rules', JSON.stringify(next))
      return { rules: next }
    })
  },

  deleteCategory: (name, fallbackName) => {
    const { categories } = get()
    const next = categories.filter((c) => c.name !== name)
    saveCategories(next)
    set({ categories: next })

    useDashboardStore.setState((state) => ({
      bills: state.bills.map((bill) => ({
        ...bill,
        transactions: bill.transactions.map((t) =>
          t.category === name ? { ...t, category: fallbackName } : t,
        ),
        filter: {
          ...bill.filter,
          selectedCategory:
            bill.filter.selectedCategory === name
              ? null
              : bill.filter.selectedCategory,
        },
      })),
    }))

    const dashboardState = useDashboardStore.getState()
    const billsRaw = JSON.stringify(dashboardState.bills)
    localStorage.setItem('spendlens_bills', billsRaw)

    useBudgetStore.setState((state) => {
      const nextBudgets = { ...state.budgets }
      delete nextBudgets[name]
      localStorage.setItem('spendlens_budgets', JSON.stringify(nextBudgets))
      return { budgets: nextBudgets }
    })

    useCategoryRuleStore.setState((state) => {
      const next = state.rules.map((r) =>
        r.category === name ? { ...r, category: fallbackName } : r,
      )
      localStorage.setItem('spendlens_category_rules', JSON.stringify(next))
      return { rules: next }
    })
  },

  updateCategoryColor: (name, color) => {
    set((state) => {
      const next = state.categories.map((c) =>
        c.name === name ? { ...c, color } : c,
      )
      saveCategories(next)
      return { categories: next }
    })
  },

  getCategoryNames: () => {
    return get().categories.map((c) => c.name)
  },

  getCategoryColor: (name, fallbackIndex = 0) => {
    const cat = get().categories.find((c) => c.name === name)
    return cat?.color ?? DEFAULT_COLORS[fallbackIndex % DEFAULT_COLORS.length]
  },
}))

export function getCategoryColorFromStore(
  category: string,
  index: number,
): string {
  return useCategoryStore.getState().getCategoryColor(category, index)
}
