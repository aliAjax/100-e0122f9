export interface Transaction {
  id: string
  date: string
  category: string
  merchant: string
  amount: number
}

export interface FilterState {
  selectedCategory: string | null
  selectedMonth: string | null
  selectedDate: string | null
  selectedMerchant: string | null
}

export interface Bill {
  id: string
  name: string
  transactions: Transaction[]
  filter: FilterState
  createdAt: number
}

export interface MonthlyData {
  month: string
  amount: number
}

export interface CategoryData {
  category: string
  amount: number
  count: number
}

export interface BudgetItem {
  category: string
  amount: number
}

export type BudgetMap = Record<string, number>

export interface DailyData {
  date: string
  amount: number
}

export const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#10B981',
  '交通': '#3B82F6',
  '购物': '#F59E0B',
  '娱乐': '#EC4899',
  '居住': '#8B5CF6',
  '医疗': '#EF4444',
  '教育': '#06B6D4',
  '通讯': '#F97316',
  '其他': '#6B7280',
}

export const DEFAULT_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6',
  '#EF4444', '#06B6D4', '#F97316', '#84CC16', '#6366F1',
  '#14B8A6', '#D946EF', '#0EA5E9', '#FBBF24', '#A78BFA',
]

export function getCategoryColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

export interface CategoryRule {
  id: string
  keyword: string
  category: string
  enabled: boolean
}

export const CATEGORY_LIST = ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '通讯', '其他']
