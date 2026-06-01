import { create } from 'zustand'
import type { BudgetMap } from '@/types'

const BUDGET_STORAGE_KEY = 'spendlens_budgets'

function loadBudgets(): BudgetMap {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    return {}
  }
  return {}
}

function saveBudgets(budgets: BudgetMap) {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets))
}

interface BudgetStore {
  budgets: BudgetMap
  setBudget: (category: string, amount: number) => void
  removeBudget: (category: string) => void
  clearBudgets: () => void
}

export const useBudgetStore = create<BudgetStore>((set) => ({
  budgets: loadBudgets(),

  setBudget: (category, amount) =>
    set((state) => {
      const next = { ...state.budgets, [category]: amount }
      saveBudgets(next)
      return { budgets: next }
    }),

  removeBudget: (category) =>
    set((state) => {
      const next = { ...state.budgets }
      delete next[category]
      saveBudgets(next)
      return { budgets: next }
    }),

  clearBudgets: () => {
    localStorage.removeItem(BUDGET_STORAGE_KEY)
    set({ budgets: {} })
  },
}))
