import { describe, it, expect } from 'vitest'
import { parseRows, parseCSV, previewCSV } from '../csvParser'

function csvFile(content: string): File {
  return content as unknown as File
}

describe('csvParser - CSV入口列名自动识别', () => {
  it.each([
    ['date', 'date'],
    ['日期', '日期'],
    ['交易日期', '交易日期'],
    ['transaction_date', 'transaction_date'],
    ['trans_date', 'trans_date'],
    [' DATE ', ' DATE '],
  ])('previewCSV应使用真实日期别名识别%s', async (dateHeader, expected) => {
    const result = await previewCSV(csvFile(`${dateHeader},金额\n2024-01-15,100`))
    expect(result.mappedColumns.date).toBe(expected)
    expect(result.allTransactions[0].date).toBe('2024-01-15')
  })

  it.each([
    ['category', 'category'],
    ['分类', '分类'],
    ['消费分类', '消费分类'],
    ['类别', '类别'],
  ])('previewCSV应使用真实分类别名识别%s', async (categoryHeader, expected) => {
    const result = await previewCSV(csvFile(`日期,金额,${categoryHeader}\n2024-01-15,100,餐饮`))
    expect(result.mappedColumns.category).toBe(expected)
    expect(result.allTransactions[0].category).toBe('餐饮')
  })

  it.each([
    ['merchant', 'merchant'],
    ['商户', '商户'],
    ['交易对方', '交易对方'],
    ['store', 'store'],
    ['店铺', '店铺'],
    ['商家', '商家'],
    ['描述', '描述'],
    ['description', 'description'],
  ])('previewCSV应使用真实商户别名识别%s', async (merchantHeader, expected) => {
    const result = await previewCSV(csvFile(`日期,金额,${merchantHeader}\n2024-01-15,100,肯德基`))
    expect(result.mappedColumns.merchant).toBe(expected)
    expect(result.allTransactions[0].merchant).toBe('肯德基')
  })

  it.each([
    ['amount', 'amount'],
    ['金额', '金额'],
    ['交易金额', '交易金额'],
    ['money', 'money'],
    ['price', 'price'],
    [' AMOUNT ', ' AMOUNT '],
  ])('previewCSV应使用真实金额别名识别%s', async (amountHeader, expected) => {
    const result = await previewCSV(csvFile(`日期,${amountHeader}\n2024-01-15,100`))
    expect(result.mappedColumns.amount).toBe(expected)
    expect(result.allTransactions[0].amount).toBe(100)
  })

  it.each([
    ['type', 'type', 'income', 'income'],
    ['类型', '类型', '收入', 'income'],
    ['收支类型', '收支类型', '支出', 'expense'],
    ['交易类型', '交易类型', '退款', 'refund'],
    ['交易方向', '交易方向', '转入', 'income'],
    ['direction', 'direction', 'refund', 'refund'],
  ] as const)('previewCSV应使用真实类型别名识别%s', async (typeHeader, expected, rawType, expectedType) => {
    const result = await previewCSV(csvFile(`日期,金额,${typeHeader}\n2024-01-15,100,${rawType}`))
    expect(result.mappedColumns.type).toBe(expected)
    expect(result.allTransactions[0].type).toBe(expectedType)
  })

  it('parseCSV应通过真实英文列名入口解析交易', async () => {
    const transactions = await parseCSV(csvFile('date,amount,category,merchant,type\n2024-01-15,+100,工资,公司,income'))
    expect(transactions[0]).toMatchObject({
      date: '2024-01-15',
      amount: 100,
      category: '工资',
      merchant: '公司',
      type: 'income',
    })
  })

  it('previewCSV找不到必要列时应返回映射失败和错误统计', async () => {
    const result = await previewCSV(csvFile('时间,数值\n2024-01-15,100'))
    expect(result.mappedColumns.date).toBeNull()
    expect(result.mappedColumns.amount).toBeNull()
    expect(result.validCount).toBe(0)
    expect(result.invalidReasons).toContain('CSV 缺少必要列：日期(date) 和 金额(amount)')
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
