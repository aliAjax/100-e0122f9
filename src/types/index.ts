export type TransactionType = 'expense' | 'income' | 'refund'

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: '支出',
  income: '收入',
  refund: '退款',
}

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  expense: '#10B981',
  income: '#3B82F6',
  refund: '#F59E0B',
}

export interface Transaction {
  id: string
  date: string
  category: string
  merchant: string
  amount: number
  type: TransactionType
  isManualCategory?: boolean
}

export type TransactionTypeFilter = TransactionType | 'net'

export const TRANSACTION_TYPE_FILTER_LABELS: Record<TransactionTypeFilter, string> = {
  expense: '支出',
  income: '收入',
  refund: '退款',
  net: '净支出',
}

export interface FilterState {
  selectedCategory: string | null
  selectedMonth: string | null
  selectedDate: string | null
  selectedMerchant: string | null
  selectedType: TransactionTypeFilter
  searchText: string
  amountMin: number | null
  amountMax: number | null
}

export interface SavedView {
  id: string
  name: string
  filter: FilterState
  createdAt: number
}

export interface Bill {
  id: string
  name: string
  transactions: Transaction[]
  filter: FilterState
  savedViews: SavedView[]
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

export type BudgetMapV1 = Record<string, number>

export interface BudgetPeriodConfig {
  defaultMonthly?: number
  defaultYearly?: number
  monthlyOverrides?: Record<string, number>
  yearlyOverrides?: Record<string, number>
  adjustments?: Record<string, number>
}

export type BudgetMap = Record<string, BudgetPeriodConfig>

export function getEffectiveMonthlyBudget(
  config: BudgetPeriodConfig | undefined,
  month: string
): number {
  if (!config) return 0
  const base = config.monthlyOverrides?.[month] ?? config.defaultMonthly ?? 0
  const adjustment = config.adjustments?.[month] ?? 0
  return Math.max(0, base + adjustment)
}

export function getEffectiveYearlyBudget(
  config: BudgetPeriodConfig | undefined,
  year: string
): number {
  if (!config) return 0
  return config.yearlyOverrides?.[year] ?? config.defaultYearly ?? 0
}

export function getTotalMonthlyAdjustment(
  config: BudgetPeriodConfig | undefined,
  month: string
): number {
  if (!config) return 0
  return config.adjustments?.[month] ?? 0
}

export function mergeBudgetConfigs(
  target: BudgetPeriodConfig,
  source: BudgetPeriodConfig
): BudgetPeriodConfig {
  return {
    defaultMonthly: target.defaultMonthly ?? source.defaultMonthly,
    defaultYearly: target.defaultYearly ?? source.defaultYearly,
    monthlyOverrides: { ...source.monthlyOverrides, ...target.monthlyOverrides },
    yearlyOverrides: { ...source.yearlyOverrides, ...target.yearlyOverrides },
    adjustments: { ...source.adjustments, ...target.adjustments },
  }
}

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

let _colorResolver: ((category: string, index: number) => string) | null = null

export function registerCategoryColorResolver(
  resolver: (category: string, index: number) => string,
) {
  _colorResolver = resolver
}

export function getCategoryColor(category: string, index: number): string {
  if (_colorResolver) return _colorResolver(category, index)
  return CATEGORY_COLORS[category] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

export interface CategoryRule {
  id: string
  keyword: string
  category: string
  enabled: boolean
}

export const CATEGORY_LIST = ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '通讯', '其他']

export interface MultiRuleMatch {
  merchant: string
  matches: Array<{ ruleId: string; keyword: string; category: string }>
  transactionCount: number
}

export interface TransactionPreview {
  transaction: Transaction
  originalCategory: string
  newCategory: string
  matchedRuleKeyword?: string
  matchedRuleKeywords?: string[]
  isManualCategory: boolean
  categoryChanged: boolean
  hasMultipleMatches: boolean
}

export interface CategoryChangePreview {
  category: string
  originalAmount: number
  newAmount: number
  changeAmount: number
  originalCount: number
  newCount: number
}

export interface BudgetImpactPreview {
  category: string
  originalSpent: number
  newSpent: number
  budget: number
  originalRatio: number
  newRatio: number
}

export interface RulePreviewResult {
  affectedTransactions: TransactionPreview[]
  categoryChanges: CategoryChangePreview[]
  budgetImpacts: BudgetImpactPreview[]
  multiRuleMatches: MultiRuleMatch[]
  totalAffected: number
  totalUnchanged: number
  totalManualSkipped: number
  scope: 'current' | 'all'
  billCount?: number
}
