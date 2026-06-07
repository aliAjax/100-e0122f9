import { describe, it, expect } from 'vitest'
import {
  normalizeBill,
  mergeStoredBills,
  isSmallBill,
  hasLargeBills,
  createEmptyFilter,
  generateId,
} from '@/store/dashboard/persistence'
import { analyzeMergeDuplicates } from '@/utils/mergeAnalysis'
import { applyCategoryRulesWithManualPreserve } from '@/utils/categoryRuleMatcher'
import type { Bill, Transaction, CategoryRule } from '@/types'

const TEST_TRANSACTION: Transaction = {
  id: 'tx_test_1',
  date: '2024-01-15',
  category: '餐饮',
  merchant: '肯德基',
  amount: 35.5,
  type: 'expense',
}

const createTestTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  date: '2024-01-15',
  category: '其他',
  merchant: '测试商户',
  amount: 100,
  type: 'expense',
  ...overrides,
})

const createTestBill = (overrides: Partial<Bill> = {}): Bill => ({
  id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  name: '测试账单',
  transactions: [],
  filter: createEmptyFilter(),
  savedViews: [],
  createdAt: Date.now(),
  ...overrides,
})

describe('persistence - 账单规范化与迁移', () => {
  it('normalizeBill 应补全缺失的 filter 字段', () => {
    const bill = createTestBill({
      filter: undefined as unknown as Bill['filter'],
    })
    const normalized = normalizeBill(bill)
    expect(normalized.filter).toBeDefined()
    expect(normalized.filter.selectedType).toBe('expense')
  })

  it('normalizeBill 应补全缺失的 savedViews 字段', () => {
    const bill = createTestBill({
      savedViews: undefined as unknown as Bill['savedViews'],
    })
    const normalized = normalizeBill(bill)
    expect(normalized.savedViews).toEqual([])
  })

  it('normalizeBill 应将缺失 type 的交易设为 expense', () => {
    const tx = { ...TEST_TRANSACTION, type: undefined as unknown as Transaction['type'] }
    const bill = createTestBill({ transactions: [tx] })
    const normalized = normalizeBill(bill)
    expect(normalized.transactions[0].type).toBe('expense')
  })

  it('normalizeBill 应保留已有的 type 值', () => {
    const tx = { ...TEST_TRANSACTION, type: 'income' as const }
    const bill = createTestBill({ transactions: [tx] })
    const normalized = normalizeBill(bill)
    expect(normalized.transactions[0].type).toBe('income')
  })

  it('isSmallBill 应正确判断小账单（<= 1000 条）', () => {
    const smallBill = createTestBill({
      transactions: Array(999).fill(null).map(() => createTestTransaction()),
    })
    const largeBill = createTestBill({
      transactions: Array(1001).fill(null).map(() => createTestTransaction()),
    })
    expect(isSmallBill(smallBill)).toBe(true)
    expect(isSmallBill(largeBill)).toBe(false)
  })

  it('hasLargeBills 应正确检测列表中是否有大账单', () => {
    const small = createTestBill({ transactions: [createTestTransaction()] })
    const large = createTestBill({
      transactions: Array(1001).fill(null).map(() => createTestTransaction()),
    })
    expect(hasLargeBills([small])).toBe(false)
    expect(hasLargeBills([small, large])).toBe(true)
  })
})

describe('persistence - localStorage 与 IndexedDB 合并逻辑', () => {
  it('mergeStoredBills - local 为空时返回 indexed', () => {
    const indexed = [createTestBill({ id: 'bill_1', name: 'Indexed账单' })]
    const result = mergeStoredBills([], indexed)
    expect(result).toEqual(indexed)
  })

  it('mergeStoredBills - indexed 为空时返回 local', () => {
    const local = [createTestBill({ id: 'bill_1', name: 'Local账单' })]
    const result = mergeStoredBills(local, [])
    expect(result).toEqual(local)
  })

  it('mergeStoredBills - 两边都有数据时，以 local 元数据为准但取 indexed 的交易数据（当 local 交易为空时）', () => {
    const local: Bill[] = [
      createTestBill({
        id: 'bill_1',
        name: 'Local 名称',
        transactions: [],
        filter: { ...createEmptyFilter(), selectedCategory: '餐饮' },
        savedViews: [{ id: 'view_1', name: '测试视图', filter: createEmptyFilter(), createdAt: 123 }],
        createdAt: 1000,
      }),
    ]
    const indexed: Bill[] = [
      createTestBill({
        id: 'bill_1',
        name: 'Indexed 名称',
        transactions: [createTestTransaction({ id: 'tx_1' })],
        filter: createEmptyFilter(),
        savedViews: [],
        createdAt: 2000,
      }),
    ]

    const result = mergeStoredBills(local, indexed)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Local 名称')
    expect(result[0].transactions).toHaveLength(1)
    expect(result[0].filter.selectedCategory).toBe('餐饮')
    expect(result[0].savedViews).toHaveLength(1)
    expect(result[0].createdAt).toBe(1000)
  })

  it('mergeStoredBills - local 有交易数据时，以 local 为准', () => {
    const localTx = createTestTransaction({ id: 'tx_local' })
    const indexedTx = createTestTransaction({ id: 'tx_indexed' })
    const local: Bill[] = [
      createTestBill({ id: 'bill_1', transactions: [localTx] }),
    ]
    const indexed: Bill[] = [
      createTestBill({ id: 'bill_1', transactions: [indexedTx] }),
    ]

    const result = mergeStoredBills(local, indexed)
    expect(result[0].transactions).toHaveLength(1)
    expect(result[0].transactions[0].id).toBe('tx_local')
  })

  it('mergeStoredBills - 只在 indexed 中存在的账单不会被合并到结果中', () => {
    const local: Bill[] = [createTestBill({ id: 'bill_1' })]
    const indexed: Bill[] = [
      createTestBill({ id: 'bill_1' }),
      createTestBill({ id: 'bill_2' }),
    ]

    const result = mergeStoredBills(local, indexed)
    const ids = result.map((b) => b.id)
    expect(ids).not.toContain('bill_2')
  })
})

describe('persistence - ID 生成', () => {
  it('generateId 应生成唯一 ID', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }
    expect(ids.size).toBe(100)
  })

  it('generateId 应以 bill_ 开头', () => {
    expect(generateId()).toMatch(/^bill_/)
  })
})

describe('mergeAnalysis - 合并去重分析', () => {
  it('analyzeMergeDuplicates 应正确识别完全相同的交易为重复', () => {
    const tx1 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: '肯德基',
      type: 'expense',
    })
    const tx2 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: '肯德基',
      type: 'expense',
    })
    const bill1 = createTestBill({ id: 'bill_1', name: '账单1', transactions: [tx1] })
    const bill2 = createTestBill({ id: 'bill_2', name: '账单2', transactions: [tx2] })

    const result = analyzeMergeDuplicates([bill1, bill2], ['bill_1', 'bill_2'])
    expect(result.duplicateCount).toBe(1)
    expect(result.duplicateGroups).toHaveLength(1)
    expect(result.uniqueTransactions).toHaveLength(1)
  })

  it('analyzeMergeDuplicates - 金额不同不应判定为重复', () => {
    const tx1 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: '肯德基',
      type: 'expense',
    })
    const tx2 = createTestTransaction({
      date: '2024-01-15',
      amount: 36.5,
      merchant: '肯德基',
      type: 'expense',
    })
    const bill1 = createTestBill({ id: 'bill_1', name: '账单1', transactions: [tx1] })
    const bill2 = createTestBill({ id: 'bill_2', name: '账单2', transactions: [tx2] })

    const result = analyzeMergeDuplicates([bill1, bill2], ['bill_1', 'bill_2'])
    expect(result.duplicateCount).toBe(0)
    expect(result.uniqueTransactions).toHaveLength(2)
  })

  it('analyzeMergeDuplicates - 日期不同不应判定为重复', () => {
    const tx1 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: '肯德基',
      type: 'expense',
    })
    const tx2 = createTestTransaction({
      date: '2024-01-16',
      amount: 35.5,
      merchant: '肯德基',
      type: 'expense',
    })
    const bill1 = createTestBill({ id: 'bill_1', name: '账单1', transactions: [tx1] })
    const bill2 = createTestBill({ id: 'bill_2', name: '账单2', transactions: [tx2] })

    const result = analyzeMergeDuplicates([bill1, bill2], ['bill_1', 'bill_2'])
    expect(result.duplicateCount).toBe(0)
  })

  it('analyzeMergeDuplicates - 商户名称应忽略大小写和前后空格', () => {
    const tx1 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: ' 肯德基 ',
      type: 'expense',
    })
    const tx2 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: 'KFC',
      type: 'expense',
    })
    const tx3 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: '肯德基',
      type: 'expense',
    })
    const bill1 = createTestBill({ id: 'bill_1', name: '账单1', transactions: [tx1] })
    const bill2 = createTestBill({ id: 'bill_2', name: '账单2', transactions: [tx2, tx3] })

    const result = analyzeMergeDuplicates([bill1, bill2], ['bill_1', 'bill_2'])
    expect(result.duplicateGroups).toHaveLength(1)
    expect(result.duplicateCount).toBe(1)
  })

  it('analyzeMergeDuplicates - 交易类型不同不应判定为重复', () => {
    const tx1 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: '肯德基',
      type: 'expense',
    })
    const tx2 = createTestTransaction({
      date: '2024-01-15',
      amount: 35.5,
      merchant: '肯德基',
      type: 'refund',
    })
    const bill1 = createTestBill({ id: 'bill_1', name: '账单1', transactions: [tx1] })
    const bill2 = createTestBill({ id: 'bill_2', name: '账单2', transactions: [tx2] })

    const result = analyzeMergeDuplicates([bill1, bill2], ['bill_1', 'bill_2'])
    expect(result.duplicateCount).toBe(0)
  })

  it('analyzeMergeDuplicates - 应返回正确的账单信息', () => {
    const bill1 = createTestBill({
      id: 'bill_1',
      name: '一月账单',
      transactions: [createTestTransaction(), createTestTransaction()],
    })
    const bill2 = createTestBill({
      id: 'bill_2',
      name: '二月账单',
      transactions: [createTestTransaction()],
    })

    const result = analyzeMergeDuplicates([bill1, bill2], ['bill_1', 'bill_2'])
    expect(result.billInfo).toHaveLength(2)
    expect(result.billInfo.find((b) => b.billId === 'bill_1')?.transactionCount).toBe(2)
    expect(result.billInfo.find((b) => b.billId === 'bill_2')?.transactionCount).toBe(1)
  })
})

describe('categoryRuleMatcher - 手动分类保护', () => {
  const rules: CategoryRule[] = [
    { id: 'rule_1', keyword: '肯德基', category: '餐饮', enabled: true },
    { id: 'rule_2', keyword: '滴滴', category: '交通', enabled: true },
  ]

  it('applyCategoryRulesWithManualPreserve - 手动标记的交易不应被规则覆盖', () => {
    const manualTx = createTestTransaction({
      merchant: '肯德基',
      category: '交通',
      isManualCategory: true,
    })
    const autoTx = createTestTransaction({
      merchant: '肯德基',
      category: '其他',
      isManualCategory: false,
    })

    const result = applyCategoryRulesWithManualPreserve([manualTx, autoTx], rules)

    expect(result.manualSkippedCount).toBe(1)
    expect(result.transactions[0].category).toBe('交通')
    expect(result.transactions[1].category).toBe('餐饮')
  })

  it('applyCategoryRulesWithManualPreserve - 未标记 isManualCategory 的交易应应用规则', () => {
    const tx = createTestTransaction({
      merchant: '滴滴出行',
      category: '其他',
    })

    const result = applyCategoryRulesWithManualPreserve([tx], rules)

    expect(result.matchedCount).toBe(1)
    expect(result.manualSkippedCount).toBe(0)
    expect(result.transactions[0].category).toBe('交通')
  })

  it('applyCategoryRulesWithManualPreserve - 已正确分类且非手动的交易应被规则更新', () => {
    const tx = createTestTransaction({
      merchant: '肯德基',
      category: '交通',
      isManualCategory: false,
    })

    const result = applyCategoryRulesWithManualPreserve([tx], rules)

    expect(result.matchedCount).toBe(1)
    expect(result.transactions[0].category).toBe('餐饮')
  })

  it('applyCategoryRulesWithManualPreserve - 禁用的规则不应被应用', () => {
    const disabledRules: CategoryRule[] = [
      { id: 'rule_1', keyword: '肯德基', category: '餐饮', enabled: false },
    ]
    const tx = createTestTransaction({
      merchant: '肯德基',
      category: '其他',
    })

    const result = applyCategoryRulesWithManualPreserve([tx], disabledRules)

    expect(result.matchedCount).toBe(0)
    expect(result.transactions[0].category).toBe('其他')
  })

  it('applyCategoryRulesWithManualPreserve - 应正确统计各类数量', () => {
    const transactions = [
      createTestTransaction({ merchant: '肯德基', category: '其他', isManualCategory: false }),
      createTestTransaction({ merchant: '滴滴', category: '其他', isManualCategory: false }),
      createTestTransaction({ merchant: '星巴克', category: '餐饮', isManualCategory: false }),
      createTestTransaction({ merchant: '肯德基', category: '娱乐', isManualCategory: true }),
      createTestTransaction({ merchant: '未知商户', category: '其他', isManualCategory: false }),
    ]

    const result = applyCategoryRulesWithManualPreserve(transactions, rules)

    expect(result.matchedCount).toBe(2)
    expect(result.manualSkippedCount).toBe(1)
    expect(result.unchangedCount).toBe(3)
  })
})

describe('persistence - 空过滤器创建', () => {
  it('createEmptyFilter 应返回具有正确默认值的过滤器', () => {
    const filter = createEmptyFilter()
    expect(filter.selectedCategory).toBeNull()
    expect(filter.selectedMonth).toBeNull()
    expect(filter.selectedDate).toBeNull()
    expect(filter.selectedMerchant).toBeNull()
    expect(filter.selectedType).toBe('expense')
    expect(filter.searchText).toBe('')
    expect(filter.amountMin).toBeNull()
    expect(filter.amountMax).toBeNull()
  })
})
