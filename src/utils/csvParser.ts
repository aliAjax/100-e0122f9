import Papa from 'papaparse'
import type { Transaction, TransactionType } from '@/types'

const DATE_ALIASES = ['date', '日期', '交易日期', 'transaction_date', 'trans_date']
const CATEGORY_ALIASES = ['category', '分类', '消费分类', '类别']
const MERCHANT_ALIASES = ['merchant', '商户', '交易对方', 'store', '店铺', '商家', '描述', 'description']
const AMOUNT_ALIASES = ['amount', '金额', '交易金额', 'money', 'price']
const TYPE_ALIASES = ['type', '类型', '收支类型', '交易类型', '交易方向', 'direction']
const INCOME_ALIASES = ['收入', 'income', 'in', '进账', '入账', '转入', '收款']
const EXPENSE_ALIASES = ['支出', 'expense', 'out', '花费', '消费', '转出', '付款']
const REFUND_ALIASES = ['退款', 'refund', '退单', '退货', '返还']

export interface MappedColumns {
  date: string | null
  category: string | null
  merchant: string | null
  amount: string | null
  type: string | null
}

function determineTransactionType(
  rawAmount: string,
  parsedAmount: number,
  rawType: string | null,
): TransactionType {
  if (rawType) {
    const lowerType = rawType.trim().toLowerCase()
    for (const alias of INCOME_ALIASES) {
      if (lowerType.includes(alias.toLowerCase())) return 'income'
    }
    for (const alias of REFUND_ALIASES) {
      if (lowerType.includes(alias.toLowerCase())) return 'refund'
    }
    for (const alias of EXPENSE_ALIASES) {
      if (lowerType.includes(alias.toLowerCase())) return 'expense'
    }
  }

  if (parsedAmount < 0) return 'income'
  if (rawAmount.startsWith('+') || rawAmount.startsWith('＋')) return 'income'
  if (rawAmount.startsWith('-') || rawAmount.startsWith('－')) return 'expense'

  return 'expense'
}

export interface CSVPreviewResult {
  headers: string[]
  mappedColumns: MappedColumns
  totalRows: number
  validCount: number
  invalidCount: number
  invalidReasons: string[]
  previewRows: Transaction[]
  allTransactions: Transaction[]
}

function findColumn(headers: string[], aliases: string[]): string | null {
  const lower = headers.map((h) => h.trim().toLowerCase())
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.toLowerCase())
    if (idx !== -1) return headers[idx]
  }
  return null
}

function parseRows(
  rows: Record<string, string>[],
  dateCol: string,
  categoryCol: string | null,
  merchantCol: string | null,
  amountCol: string,
  typeCol: string | null,
): { transactions: Transaction[]; invalidCount: number; invalidReasons: string[] } {
  const transactions: Transaction[] = []
  let invalidCount = 0
  const reasonMap: Record<string, number> = {}

  for (const row of rows) {
    const rawDate = (row[dateCol] ?? '').trim()
    const rawAmount = (row[amountCol] ?? '').trim()

    if (!rawDate && !rawAmount) {
      invalidCount++
      reasonMap['日期和金额均为空'] = (reasonMap['日期和金额均为空'] ?? 0) + 1
      continue
    }
    if (!rawDate) {
      invalidCount++
      reasonMap['日期为空'] = (reasonMap['日期为空'] ?? 0) + 1
      continue
    }
    if (!rawAmount) {
      invalidCount++
      reasonMap['金额为空'] = (reasonMap['金额为空'] ?? 0) + 1
      continue
    }

    const signedAmount = parseFloat(rawAmount.replace(/[,，]/g, ''))
    const amount = Math.abs(signedAmount)
    if (isNaN(amount)) {
      invalidCount++
      reasonMap['金额无法解析为数字'] = (reasonMap['金额无法解析为数字'] ?? 0) + 1
      continue
    }

    const rawType = typeCol ? (row[typeCol] ?? '').trim() : null
    const type = determineTransactionType(rawAmount, signedAmount, rawType)

    let dateStr = rawDate
    if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(dateStr)) {
      dateStr = dateStr.replace(/\//g, '-')
    }
    const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (!match) {
      invalidCount++
      reasonMap['日期格式无法识别（需 YYYY-MM-DD）'] = (reasonMap['日期格式无法识别（需 YYYY-MM-DD）'] ?? 0) + 1
      continue
    }

    const [, y, m, d] = match
    dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`

    transactions.push({
      id: `tx_${Date.now()}_${idCounter++}`,
      date: dateStr,
      category: categoryCol ? (row[categoryCol] ?? '其他').trim() || '其他' : '其他',
      merchant: merchantCol ? (row[merchantCol] ?? '').trim() : '',
      amount,
      type,
    })
  }

  const invalidReasons = Object.entries(reasonMap).map(
    ([reason, count]) => `${reason}（${count} 行）`,
  )

  return { transactions, invalidCount, invalidReasons }
}

let idCounter = 0

export function parseCSV(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? []
        const dateCol = findColumn(headers, DATE_ALIASES)
        const categoryCol = findColumn(headers, CATEGORY_ALIASES)
        const merchantCol = findColumn(headers, MERCHANT_ALIASES)
        const amountCol = findColumn(headers, AMOUNT_ALIASES)
        const typeCol = findColumn(headers, TYPE_ALIASES)

        if (!dateCol || !amountCol) {
          reject(new Error('CSV 缺少必要列：日期(date) 和 金额(amount)'))
          return
        }

        const rows = results.data as Record<string, string>[]
        const { transactions } = parseRows(rows, dateCol, categoryCol, merchantCol, amountCol, typeCol)
        resolve(transactions)
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}

export function previewCSV(file: File): Promise<CSVPreviewResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? []
        const dateCol = findColumn(headers, DATE_ALIASES)
        const categoryCol = findColumn(headers, CATEGORY_ALIASES)
        const merchantCol = findColumn(headers, MERCHANT_ALIASES)
        const amountCol = findColumn(headers, AMOUNT_ALIASES)
        const typeCol = findColumn(headers, TYPE_ALIASES)

        const mappedColumns: MappedColumns = {
          date: dateCol,
          category: categoryCol,
          merchant: merchantCol,
          amount: amountCol,
          type: typeCol,
        }

        if (!dateCol || !amountCol) {
          const dataRows = (results.data as Record<string, string>[]).length
          resolve({
            headers,
            mappedColumns,
            totalRows: dataRows,
            validCount: 0,
            invalidCount: dataRows > 0 ? dataRows : 1,
            invalidReasons: ['CSV 缺少必要列：日期(date) 和 金额(amount)'],
            previewRows: [],
            allTransactions: [],
          })
          return
        }

        const rows = results.data as Record<string, string>[]
        const { transactions, invalidCount, invalidReasons } = parseRows(
          rows,
          dateCol,
          categoryCol,
          merchantCol,
          amountCol,
          typeCol,
        )

        const finalInvalidReasons = [...invalidReasons]
        if (rows.length === 0) {
          finalInvalidReasons.unshift('CSV 文件没有数据行（只有表头）')
        } else if (transactions.length === 0 && invalidReasons.length === 0) {
          finalInvalidReasons.unshift('未识别到有效交易记录，请检查 CSV 格式')
        }

        resolve({
          headers,
          mappedColumns,
          totalRows: rows.length,
          validCount: transactions.length,
          invalidCount: rows.length === 0 ? 1 : invalidCount,
          invalidReasons: finalInvalidReasons,
          previewRows: transactions.slice(0, 10),
          allTransactions: transactions,
        })
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}
