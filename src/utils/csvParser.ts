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

  if (rawAmount.startsWith('+') || rawAmount.startsWith('＋')) return 'income'
  if (rawAmount.startsWith('-') || rawAmount.startsWith('－')) return 'expense'

  if (parsedAmount < 0) return 'expense'

  return 'expense'
}

export type ImportItemStatus = 'valid' | 'duplicate' | 'invalid'
export type ImportItemAction = 'keep' | 'skip'

export interface ImportReconciliationItem {
  transaction: Transaction
  status: ImportItemStatus
  action: ImportItemAction
  originalCategory: string
  matchedRuleKeyword?: string
  isNewCategory: boolean
  invalidReason?: string
  rawRow?: Record<string, string>
}

export interface CategoryImportSummary {
  category: string
  count: number
  amount: number
  isNew: boolean
}

export interface ReconciliationResult {
  items: ImportReconciliationItem[]
  categorySummaries: CategoryImportSummary[]
  newCategories: string[]
  matchedCount: number
  unmatchedCount: number
  keepCount: number
  skipCount: number
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
  rawRows: Record<string, string>[]
  invalidRows: Array<{ row: Record<string, string>; reason: string }>
}

function findColumn(headers: string[], aliases: string[]): string | null {
  const lower = headers.map((h) => h.trim().toLowerCase())
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.toLowerCase())
    if (idx !== -1) return headers[idx]
  }
  return null
}

export function parseRows(
  rows: Record<string, string>[],
  dateCol: string,
  categoryCol: string | null,
  merchantCol: string | null,
  amountCol: string,
  typeCol: string | null,
): {
  transactions: Transaction[]
  invalidCount: number
  invalidReasons: string[]
  invalidRows: Array<{ row: Record<string, string>; reason: string }>
} {
  const transactions: Transaction[] = []
  let invalidCount = 0
  const reasonMap: Record<string, number> = {}
  const invalidRows: Array<{ row: Record<string, string>; reason: string }> = []

  for (const row of rows) {
    const rawDate = (row[dateCol] ?? '').trim()
    const rawAmount = (row[amountCol] ?? '').trim()

    let invalidReason: string | null = null

    if (!rawDate && !rawAmount) {
      invalidReason = '日期和金额均为空'
    } else if (!rawDate) {
      invalidReason = '日期为空'
    } else if (!rawAmount) {
      invalidReason = '金额为空'
    }

    if (invalidReason) {
      invalidCount++
      reasonMap[invalidReason] = (reasonMap[invalidReason] ?? 0) + 1
      invalidRows.push({ row, reason: invalidReason })
      continue
    }

    const normalizedAmount = rawAmount.replace(/[，]/g, ',').replace(/[＋]/g, '+').replace(/[－]/g, '-')
    const signedAmount = parseFloat(normalizedAmount.replace(/[,]/g, ''))
    const amount = Math.abs(signedAmount)
    if (isNaN(amount)) {
      invalidReason = '金额无法解析为数字'
      invalidCount++
      reasonMap[invalidReason] = (reasonMap[invalidReason] ?? 0) + 1
      invalidRows.push({ row, reason: invalidReason })
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
      invalidReason = '日期格式无法识别（需 YYYY-MM-DD）'
      invalidCount++
      reasonMap[invalidReason] = (reasonMap[invalidReason] ?? 0) + 1
      invalidRows.push({ row, reason: invalidReason })
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

  return { transactions, invalidCount, invalidReasons, invalidRows }
}

let idCounter = 0

export function detectDuplicates(
  newTransactions: Transaction[],
  existingTransactions: Transaction[],
): { duplicateCount: number; duplicateIds: Set<string> } {
  const existingSet = new Set<string>()
  for (const t of existingTransactions) {
    existingSet.add(`${t.date}|${t.amount}|${t.merchant}|${t.type}`)
  }
  const duplicateIds = new Set<string>()
  for (const t of newTransactions) {
    if (existingSet.has(`${t.date}|${t.amount}|${t.merchant}|${t.type}`)) {
      duplicateIds.add(t.id)
    }
  }
  return { duplicateCount: duplicateIds.size, duplicateIds }
}

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

        const rawRows = results.data as Record<string, string>[]
        if (!dateCol || !amountCol) {
          const dataRows = rawRows.length
          resolve({
            headers,
            mappedColumns,
            totalRows: dataRows,
            validCount: 0,
            invalidCount: dataRows > 0 ? dataRows : 1,
            invalidReasons: ['CSV 缺少必要列：日期(date) 和 金额(amount)'],
            previewRows: [],
            allTransactions: [],
            rawRows,
            invalidRows: rawRows.map((row) => ({ row, reason: 'CSV 缺少必要列' })),
          })
          return
        }

        const { transactions, invalidCount, invalidReasons, invalidRows } = parseRows(
          rawRows,
          dateCol,
          categoryCol,
          merchantCol,
          amountCol,
          typeCol,
        )

        const finalInvalidReasons = [...invalidReasons]
        if (rawRows.length === 0) {
          finalInvalidReasons.unshift('CSV 文件没有数据行（只有表头）')
        } else if (transactions.length === 0 && invalidReasons.length === 0) {
          finalInvalidReasons.unshift('未识别到有效交易记录，请检查 CSV 格式')
        }

        resolve({
          headers,
          mappedColumns,
          totalRows: rawRows.length,
          validCount: transactions.length,
          invalidCount: rawRows.length === 0 ? 1 : invalidCount,
          invalidReasons: finalInvalidReasons,
          previewRows: transactions.slice(0, 10),
          allTransactions: transactions,
          rawRows,
          invalidRows,
        })
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}
