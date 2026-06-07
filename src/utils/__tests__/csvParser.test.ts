import { describe, it, expect } from 'vitest'
import { parseRows, findColumn } from '../csvParser'
import type { Transaction } from '@/types'

const DATE_ALIASES = ['date', '日期', '交易日期', 'transaction_date', 'trans_date']
const CATEGORY_ALIASES = ['category', '分类', '消费分类', '类别']
const MERCHANT_ALIASES = ['merchant', '商户', '交易对方', 'store', '店铺', '商家', '描述', 'description']
const AMOUNT_ALIASES = ['amount', '金额', '交易金额', 'money', 'price']
const TYPE_ALIASES = ['type', '类型', '收支类型', '交易类型', '交易方向', 'direction']

describe('csvParser - findColumn 列名自动识别', () => {
  describe('日期列识别', () => {
    it('应识别 date', () => {
      expect(findColumn(['date', 'amount'], DATE_ALIASES)).toBe('date')
    })
    it('应识别 日期', () => {
      expect(findColumn(['日期', '金额'], DATE_ALIASES)).toBe('日期')
    })
    it('应识别 交易日期', () => {
      expect(findColumn(['交易日期', '金额'], DATE_ALIASES)).toBe('交易日期')
    })
    it('应识别 transaction_date', () => {
      expect(findColumn(['transaction_date', 'amount'], DATE_ALIASES)).toBe('transaction_date')
    })
    it('应识别 trans_date', () => {
      expect(findColumn(['trans_date', 'amount'], DATE_ALIASES)).toBe('trans_date')
    })
    it('应忽略大小写识别 DATE', () => {
      expect(findColumn(['DATE', 'AMOUNT'], DATE_ALIASES)).toBe('DATE')
    })
    it('应忽略前后空格', () => {
      expect(findColumn([' 日期 ', ' 金额 '], DATE_ALIASES)).toBe(' 日期 ')
    })
  })

  describe('分类列识别', () => {
    it('应识别 category', () => {
      expect(findColumn(['category', 'date'], CATEGORY_ALIASES)).toBe('category')
    })
    it('应识别 分类', () => {
      expect(findColumn(['分类', '日期'], CATEGORY_ALIASES)).toBe('分类')
    })
    it('应识别 消费分类', () => {
      expect(findColumn(['消费分类', '日期'], CATEGORY_ALIASES)).toBe('消费分类')
    })
    it('应识别 类别', () => {
      expect(findColumn(['类别', '日期'], CATEGORY_ALIASES)).toBe('类别')
    })
  })

  describe('商户列识别', () => {
    it('应识别 merchant', () => {
      expect(findColumn(['merchant', 'date'], MERCHANT_ALIASES)).toBe('merchant')
    })
    it('应识别 商户', () => {
      expect(findColumn(['商户', '日期'], MERCHANT_ALIASES)).toBe('商户')
    })
    it('应识别 交易对方', () => {
      expect(findColumn(['交易对方', '日期'], MERCHANT_ALIASES)).toBe('交易对方')
    })
    it('应识别 store', () => {
      expect(findColumn(['store', 'date'], MERCHANT_ALIASES)).toBe('store')
    })
    it('应识别 店铺', () => {
      expect(findColumn(['店铺', '日期'], MERCHANT_ALIASES)).toBe('店铺')
    })
    it('应识别 商家', () => {
      expect(findColumn(['商家', '日期'], MERCHANT_ALIASES)).toBe('商家')
    })
    it('应识别 描述', () => {
      expect(findColumn(['描述', '日期'], MERCHANT_ALIASES)).toBe('描述')
    })
    it('应识别 description', () => {
      expect(findColumn(['description', 'date'], MERCHANT_ALIASES)).toBe('description')
    })
  })

  describe('金额列识别', () => {
    it('应识别 amount', () => {
      expect(findColumn(['amount', 'date'], AMOUNT_ALIASES)).toBe('amount')
    })
    it('应识别 金额', () => {
      expect(findColumn(['金额', '日期'], AMOUNT_ALIASES)).toBe('金额')
    })
    it('应识别 交易金额', () => {
      expect(findColumn(['交易金额', '日期'], AMOUNT_ALIASES)).toBe('交易金额')
    })
    it('应识别 money', () => {
      expect(findColumn(['money', 'date'], AMOUNT_ALIASES)).toBe('money')
    })
    it('应识别 price', () => {
      expect(findColumn(['price', 'date'], AMOUNT_ALIASES)).toBe('price')
    })
  })

  describe('类型列识别', () => {
    it('应识别 type', () => {
      expect(findColumn(['type', 'date'], TYPE_ALIASES)).toBe('type')
    })
    it('应识别 类型', () => {
      expect(findColumn(['类型', '日期'], TYPE_ALIASES)).toBe('类型')
    })
    it('应识别 收支类型', () => {
      expect(findColumn(['收支类型', '日期'], TYPE_ALIASES)).toBe('收支类型')
    })
    it('应识别 交易类型', () => {
      expect(findColumn(['交易类型', '日期'], TYPE_ALIASES)).toBe('交易类型')
    })
    it('应识别 交易方向', () => {
      expect(findColumn(['交易方向', '日期'], TYPE_ALIASES)).toBe('交易方向')
    })
    it('应识别 direction', () => {
      expect(findColumn(['direction', 'date'], TYPE_ALIASES)).toBe('direction')
    })
  })

  describe('边界情况', () => {
    it('找不到匹配列时返回 null', () => {
      expect(findColumn(['foo', 'bar'], DATE_ALIASES)).toBeNull()
    })
    it('空 headers 数组返回 null', () => {
      expect(findColumn([], DATE_ALIASES)).toBeNull()
    })
    it('按别名数组优先级匹配，而非 headers 顺序', () => {
      expect(findColumn(['日期', 'date', '交易日期'], DATE_ALIASES)).toBe('date')
    })
    it('别名数组中优先级高的先匹配', () => {
      expect(findColumn(['交易日期', '日期', 'date'], DATE_ALIASES)).toBe('date')
    })
    it('混合大小写和空格仍能正确匹配', () => {
      expect(findColumn(['  Transaction_Date  ', 'Amount'], DATE_ALIASES)).toBe('  Transaction_Date  ')
    })
  })
})

describe('csvParser - 列名识别与金额解析', () => {
  it('应正确识别中文列名', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '100.00', '分类': '餐饮', '商户': '肯德基' },
    ]
    const result = parseRows(rows, '日期', '分类', '商户', '金额', null)
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].date).toBe('2024-01-15')
    expect(result.transactions[0].amount).toBe(100)
    expect(result.transactions[0].category).toBe('餐饮')
    expect(result.transactions[0].merchant).toBe('肯德基')
  })

  it('应正确识别英文列名', () => {
    const rows = [
      { 'date': '2024-01-15', 'amount': '200.50', 'category': '交通', 'merchant': '滴滴' },
    ]
    const result = parseRows(rows, 'date', 'category', 'merchant', 'amount', null)
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].date).toBe('2024-01-15')
    expect(result.transactions[0].amount).toBe(200.5)
    expect(result.transactions[0].category).toBe('交通')
  })

  it('应正确处理带千分号的金额', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '1,234.56' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].amount).toBe(1234.56)
  })

  it('应正确处理中文全角逗号的金额', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '1，234.56' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].amount).toBe(1234.56)
  })

  it('应正确处理中文全角加号的金额', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '＋500' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].amount).toBe(500)
    expect(result.transactions[0].type).toBe('income')
  })

  it('应正确处理中文全角减号的金额', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '－300' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].amount).toBe(300)
    expect(result.transactions[0].type).toBe('expense')
  })
})

describe('csvParser - 交易类型判断', () => {
  it('应根据类型列判断为收入', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '5000', '类型': '收入' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', '类型')
    expect(result.transactions[0].type).toBe('income')
  })

  it('应根据类型列判断为支出', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '200', '类型': '支出' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', '类型')
    expect(result.transactions[0].type).toBe('expense')
  })

  it('应根据类型列判断为退款', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '100', '类型': '退款' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', '类型')
    expect(result.transactions[0].type).toBe('refund')
  })

  it('应根据金额正号判断为收入', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '+1000' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].type).toBe('income')
  })

  it('应根据金额负号判断为支出', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '-500' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].type).toBe('expense')
  })

  it('应根据负数值判断为支出', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '-200.50' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].type).toBe('expense')
    expect(result.transactions[0].amount).toBe(200.5)
  })

  it('无符号正数默认为支出', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '99.99' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].type).toBe('expense')
  })

  it('英文类型income应识别为收入', () => {
    const rows = [
      { 'date': '2024-01-15', 'amount': '3000', 'type': 'income' },
    ]
    const result = parseRows(rows, 'date', null, null, 'amount', 'type')
    expect(result.transactions[0].type).toBe('income')
  })

  it('英文类型refund应识别为退款', () => {
    const rows = [
      { 'date': '2024-01-15', 'amount': '150', 'type': 'refund' },
    ]
    const result = parseRows(rows, 'date', null, null, 'amount', 'type')
    expect(result.transactions[0].type).toBe('refund')
  })
})

describe('csvParser - 错误处理与统计', () => {
  it('应统计日期为空的错误', () => {
    const rows = [
      { '日期': '', '金额': '100' },
      { '日期': '2024-01-15', '金额': '200' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.invalidCount).toBe(1)
    expect(result.invalidReasons).toContain('日期为空（1 行）')
    expect(result.transactions).toHaveLength(1)
  })

  it('应统计金额为空的错误', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': '' },
      { '日期': '2024-01-16', '金额': '200' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.invalidCount).toBe(1)
    expect(result.invalidReasons).toContain('金额为空（1 行）')
  })

  it('应统计日期和金额均为空的错误', () => {
    const rows = [
      { '日期': '', '金额': '' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.invalidCount).toBe(1)
    expect(result.invalidReasons).toContain('日期和金额均为空（1 行）')
  })

  it('应统计无法解析的金额错误', () => {
    const rows = [
      { '日期': '2024-01-15', '金额': 'abc' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.invalidCount).toBe(1)
    expect(result.invalidReasons).toContain('金额无法解析为数字（1 行）')
  })

  it('应统计无效日期格式错误', () => {
    const rows = [
      { '日期': '2024年1月', '金额': '100' },
      { '日期': '无效日期', '金额': '200' },
      { '日期': 'Jan 15, 2024', '金额': '300' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.invalidCount).toBe(3)
    expect(result.invalidReasons).toContain('日期格式无法识别（需 YYYY-MM-DD）（3 行）')
  })

  it('应将斜杠日期转换为横杠格式', () => {
    const rows = [
      { '日期': '2024/01/15', '金额': '100' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].date).toBe('2024-01-15')
  })

  it('应补全月份和日期的前导零', () => {
    const rows = [
      { '日期': '2024-1-5', '金额': '100' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.transactions[0].date).toBe('2024-01-05')
  })

  it('应正确统计多种错误类型', () => {
    const rows = [
      { '日期': '', '金额': '100' },
      { '日期': '2024-01-15', '金额': '' },
      { '日期': '', '金额': '' },
      { '日期': '2024-01-16', '金额': '200' },
    ]
    const result = parseRows(rows, '日期', null, null, '金额', null)
    expect(result.invalidCount).toBe(3)
    expect(result.invalidReasons).toHaveLength(3)
    expect(result.transactions).toHaveLength(1)
  })
})
