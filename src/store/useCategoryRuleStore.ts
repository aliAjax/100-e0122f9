import { create } from 'zustand'
import type { CategoryRule } from '@/types'

const RULE_STORAGE_KEY = 'spendlens_category_rules'

function loadRules(): CategoryRule[] {
  try {
    const raw = localStorage.getItem(RULE_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    return []
  }
  return []
}

function saveRules(rules: CategoryRule[]) {
  localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(rules))
}

interface CategoryRuleStore {
  rules: CategoryRule[]
  addRule: (keyword: string, category: string) => void
  updateRule: (id: string, updates: Partial<Omit<CategoryRule, 'id'>>) => void
  removeRule: (id: string) => void
  toggleRule: (id: string) => void
  clearRules: () => void
}

function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useCategoryRuleStore = create<CategoryRuleStore>((set) => ({
  rules: loadRules(),

  addRule: (keyword, category) =>
    set((state) => {
      const newRule: CategoryRule = {
        id: generateId(),
        keyword: keyword.trim(),
        category,
        enabled: true,
      }
      const next = [...state.rules, newRule]
      saveRules(next)
      return { rules: next }
    }),

  updateRule: (id, updates) =>
    set((state) => {
      const next = state.rules.map((rule) =>
        rule.id === id ? { ...rule, ...updates } : rule,
      )
      saveRules(next)
      return { rules: next }
    }),

  removeRule: (id) =>
    set((state) => {
      const next = state.rules.filter((rule) => rule.id !== id)
      saveRules(next)
      return { rules: next }
    }),

  toggleRule: (id) =>
    set((state) => {
      const next = state.rules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
      )
      saveRules(next)
      return { rules: next }
    }),

  clearRules: () => {
    localStorage.removeItem(RULE_STORAGE_KEY)
    set({ rules: [] })
  },
}))
