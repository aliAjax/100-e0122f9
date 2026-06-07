import { create } from 'zustand'
import type { BudgetMap, BudgetMapV1, BudgetPeriodConfig } from '@/types'

const BUDGET_STORAGE_KEY = 'spendlens_budgets'
const BUDGET_VERSION_KEY = 'spendlens_budgets_version'

function migrateV1ToV2(v1: BudgetMapV1): BudgetMap {
  const v2: BudgetMap = {}
  for (const [category, amount] of Object.entries(v1)) {
    if (amount > 0) {
      v2[category] = {
        defaultMonthly: amount,
        monthlyOverrides: {},
        yearlyOverrides: {},
        adjustments: {},
      }
    }
  }
  return v2
}

function loadBudgets(): BudgetMap {
  try {
    const version = localStorage.getItem(BUDGET_VERSION_KEY)
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY)

    if (!raw) return {}

    if (version === 'v2') {
      return JSON.parse(raw) as BudgetMap
    }

    const v1 = JSON.parse(raw) as BudgetMapV1
    const v2 = migrateV1ToV2(v1)
    saveBudgets(v2)
    localStorage.setItem(BUDGET_VERSION_KEY, 'v2')
    return v2
  } catch {
    return {}
  }
}

function saveBudgets(budgets: BudgetMap) {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets))
  localStorage.setItem(BUDGET_VERSION_KEY, 'v2')
}

interface BudgetStore {
  budgets: BudgetMap
  setDefaultMonthlyBudget: (category: string, amount: number | undefined) => void
  setDefaultYearlyBudget: (category: string, amount: number | undefined) => void
  setMonthlyOverride: (category: string, month: string, amount: number | undefined) => void
  setYearlyOverride: (category: string, year: string, amount: number | undefined) => void
  setAdjustment: (category: string, month: string, amount: number | undefined) => void
  setCategoryBudget: (category: string, config: BudgetPeriodConfig) => void
  removeBudget: (category: string) => void
  clearBudgets: () => void
}

export const useBudgetStore = create<BudgetStore>((set) => ({
  budgets: loadBudgets(),

  setDefaultMonthlyBudget: (category, amount) =>
    set((state) => {
      const existing = state.budgets[category] ?? {
        monthlyOverrides: {},
        yearlyOverrides: {},
        adjustments: {},
      }
      const next = {
        ...state.budgets,
        [category]: { ...existing, defaultMonthly: amount },
      }
      saveBudgets(next)
      return { budgets: next }
    }),

  setDefaultYearlyBudget: (category, amount) =>
    set((state) => {
      const existing = state.budgets[category] ?? {
        monthlyOverrides: {},
        yearlyOverrides: {},
        adjustments: {},
      }
      const next = {
        ...state.budgets,
        [category]: { ...existing, defaultYearly: amount },
      }
      saveBudgets(next)
      return { budgets: next }
    }),

  setMonthlyOverride: (category, month, amount) =>
    set((state) => {
      const existing = state.budgets[category] ?? {
        monthlyOverrides: {},
        yearlyOverrides: {},
        adjustments: {},
      }
      const overrides = { ...existing.monthlyOverrides }
      if (amount === undefined || amount <= 0) {
        delete overrides[month]
      } else {
        overrides[month] = amount
      }
      const next = {
        ...state.budgets,
        [category]: { ...existing, monthlyOverrides: overrides },
      }
      saveBudgets(next)
      return { budgets: next }
    }),

  setYearlyOverride: (category, year, amount) =>
    set((state) => {
      const existing = state.budgets[category] ?? {
        monthlyOverrides: {},
        yearlyOverrides: {},
        adjustments: {},
      }
      const overrides = { ...existing.yearlyOverrides }
      if (amount === undefined || amount <= 0) {
        delete overrides[year]
      } else {
        overrides[year] = amount
      }
      const next = {
        ...state.budgets,
        [category]: { ...existing, yearlyOverrides: overrides },
      }
      saveBudgets(next)
      return { budgets: next }
    }),

  setAdjustment: (category, month, amount) =>
    set((state) => {
      const existing = state.budgets[category] ?? {
        monthlyOverrides: {},
        yearlyOverrides: {},
        adjustments: {},
      }
      const adjustments = { ...existing.adjustments }
      if (amount === undefined || amount === 0) {
        delete adjustments[month]
      } else {
        adjustments[month] = amount
      }
      const next = {
        ...state.budgets,
        [category]: { ...existing, adjustments },
      }
      saveBudgets(next)
      return { budgets: next }
    }),

  setCategoryBudget: (category, config) =>
    set((state) => {
      const next = { ...state.budgets, [category]: config }
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
    localStorage.removeItem(BUDGET_VERSION_KEY)
    set({ budgets: {} })
  },
}))
