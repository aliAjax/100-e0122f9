import { describe, it, expect } from 'vitest'
import {
  aggregateByMonth,
  aggregateByCategory,
  aggregateByDay,
  filterByType,
  formatCurrency,
} from '../dataAggregation'
import type { Transaction } from '@/types'

const mockTransactions: Transaction[] = [
  { id: '1', date: '2024-01-15', category: '餐饮', merchant: '肯德基', amount: 50, type: 'expense' },
  { id: '2', date: '2024-01-20', category: '交通', merchant: '滴滴', amount: 30, type: 'expense' },
  { id: '3', date: '2024-01-25', category: '餐饮', merchant: '麦当劳', amount: 40, type: 'expense' },
  { id: '4', date: '2024-02-05', category: '购物', merchant: '淘宝', amount: 200, type: 'expense' },
  { id: '5', date: '2024-02-10', category: '餐饮', merchant: '星巴克', amount: 35, type: 'expense' },
  { id: '6', date: '2024-01-10', category: '工资', merchant: '公司', amount: 10000, type: 'income' },
  { id: '7', date: '2024-02-01', category: '奖金', merchant: '公司', amount: 2000, type: 'income' },
  { id: '8', date: '2024-01-18', category: '餐饮', merchant: '肯德基', amount: 20, type: 'refund' },
  { id: '9', date: '2024-02-15', category: '购物', merchant: '京东', amount: 50, type: 'refund' },
]

describe('dataAggregation - filterByType', () => {
  it('expense筛选应只返回支出', () => {
    const result = filterByType(mockTransactions, 'expense')
    expect(result).toHaveLength(5)
    result.forEach((t) => expect(t.type).toBe('expense'))
  })

  it('income筛选应只返回收入', () => {
    const result = filterByType(mockTransactions, 'income')
    expect(result).toHaveLength(2)
    result.forEach((t) => expect(t.type).toBe('income'))
  })

  it('refund筛选应只返回退款', () => {
    const result = filterByType(mockTransactions, 'refund')
    expect(result).toHaveLength(2)
    result.forEach((t) => expect(t.type).toBe('refund'))
  })

  it('net筛选应返回所有交易', () => {
    const result = filterByType(mockTransactions, 'net')
    expect(result).toHaveLength(mockTransactions.length)
  })
})

describe('dataAggregation - aggregateByMonth', () => {
  it('expense按月聚合计应正确', () => {
    const result = aggregateByMonth(mockTransactions, 'expense')
    expect(result).toHaveLength(2)
    const jan = result.find((m) => m.month === '2024-01')
    const feb = result.find((m) => m.month === '2024-02')
    expect(jan?.amount).toBe(120)
    expect(feb?.amount).toBe(235)
  })

  it('income按月聚合计应正确', () => {
    const result = aggregateByMonth(mockTransactions, 'income')
    expect(result).toHaveLength(2)
    const jan = result.find((m) => m.month === '2024-01')
    const feb = result.find((m) => m.month === '2024-02')
    expect(jan?.amount).toBe(10000)
    expect(feb?.amount).toBe(2000)
  })

  it('refund按月聚合计应正确', () => {
    const result = aggregateByMonth(mockTransactions, 'refund')
    expect(result).toHaveLength(2)
    const jan = result.find((m) => m.month === '2024-01')
    const feb = result.find((m) => m.month === '2024-02')
    expect(jan?.amount).toBe(20)
    expect(feb?.amount).toBe(50)
  })

  it('net按月聚合应为支出减收入减退款', () => {
    const result = aggregateByMonth(mockTransactions, 'net')
    expect(result).toHaveLength(2)
    const jan = result.find((m) => m.month === '2024-01')
    const feb = result.find((m) => m.month === '2024-02')
    expect(jan?.amount).toBe(120 - 10000 - 20)
    expect(feb?.amount).toBe(235 - 2000 - 50)
  })

  it('应按月份升序排列', () => {
    const result = aggregateByMonth(mockTransactions, 'expense')
    expect(result[0].month).toBe('2024-01')
    expect(result[1].month).toBe('2024-02')
  })
})

describe('dataAggregation - aggregateByCategory', () => {
  it('expense按分类聚合计应正确', () => {
    const result = aggregateByCategory(mockTransactions, 'expense')
    const food = result.find((c) => c.category === '餐饮')
    const transport = result.find((c) => c.category === '交通')
    const shopping = result.find((c) => c.category === '购物')
    expect(food?.amount).toBe(125)
    expect(food?.count).toBe(3)
    expect(transport?.amount).toBe(30)
    expect(transport?.count).toBe(1)
    expect(shopping?.amount).toBe(200)
    expect(shopping?.count).toBe(1)
  })

  it('income按分类聚合计应正确', () => {
    const result = aggregateByCategory(mockTransactions, 'income')
    const salary = result.find((c) => c.category === '工资')
    const bonus = result.find((c) => c.category === '奖金')
    expect(salary?.amount).toBe(10000)
    expect(salary?.count).toBe(1)
    expect(bonus?.amount).toBe(2000)
    expect(bonus?.count).toBe(1)
  })

  it('refund按分类聚合计应正确', () => {
    const result = aggregateByCategory(mockTransactions, 'refund')
    const foodRefund = result.find((c) => c.category === '餐饮')
    const shoppingRefund = result.find((c) => c.category === '购物')
    expect(foodRefund?.amount).toBe(20)
    expect(foodRefund?.count).toBe(1)
    expect(shoppingRefund?.amount).toBe(50)
    expect(shoppingRefund?.count).toBe(1)
  })

  it('net按分类聚合应正确计算净额', () => {
    const result = aggregateByCategory(mockTransactions, 'net')
    const food = result.find((c) => c.category === '餐饮')
    expect(food?.amount).toBe(125 - 20)
  })

  it('应按金额绝对值降序排列', () => {
    const result = aggregateByCategory(mockTransactions, 'expense')
    const amounts = result.map((r) => Math.abs(r.amount))
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i + 1])
    }
  })
})

describe('dataAggregation - aggregateByDay', () => {
  it('expense按日聚合计应正确', () => {
    const result = aggregateByDay(mockTransactions, 'expense')
    const day1 = result.find((d) => d.date === '2024-01-15')
    const day2 = result.find((d) => d.date === '2024-02-05')
    expect(day1?.amount).toBe(50)
    expect(day2?.amount).toBe(200)
  })

  it('应按日期升序排列', () => {
    const result = aggregateByDay(mockTransactions, 'expense')
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].date.localeCompare(result[i + 1].date)).toBeLessThanOrEqual(0)
    }
  })
})

describe('dataAggregation - formatCurrency', () => {
  it('应格式化为人民币格式', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56')
    expect(formatCurrency(0)).toBe('0.00')
    expect(formatCurrency(100)).toBe('100.00')
    expect(formatCurrency(999999.99)).toBe('999,999.99')
  })
})
