import Papa from 'papaparse'
import type { Transaction } from '@/types'

const DATE_ALIASES = ['date', '日期', '交易日期', 'transaction_date', 'trans_date']
const CATEGORY_ALIASES = ['category', '分类', '消费分类', 'type', '类型', '类别']
const MERCHANT_ALIASES = ['merchant', '商户', '交易对方', 'store', '店铺', '商家', '描述', 'description']
const AMOUNT_ALIASES = ['amount', '金额', '交易金额', 'money', '支出', '花费', 'price']

function findColumn(headers: string[], aliases: string[]): string | null {
  const lower = headers.map((h) => h.trim().toLowerCase())
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.toLowerCase())
    if (idx !== -1) return headers[idx]
  }
  return null
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

        if (!dateCol || !amountCol) {
          reject(new Error('CSV 缺少必要列：日期(date) 和 金额(amount)'))
          return
        }

        const rows = results.data as Record<string, string>[]
        const transactions: Transaction[] = []

        for (const row of rows) {
          const rawDate = (row[dateCol] ?? '').trim()
          const rawAmount = (row[amountCol] ?? '').trim()
          if (!rawDate || !rawAmount) continue

          const amount = Math.abs(parseFloat(rawAmount.replace(/[,，]/g, '')))
          if (isNaN(amount)) continue

          let dateStr = rawDate
          if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(dateStr)) {
            dateStr = dateStr.replace(/\//g, '-')
          }
          const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
          if (!match) continue

          const [, y, m, d] = match
          dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`

          transactions.push({
            id: `tx_${Date.now()}_${idCounter++}`,
            date: dateStr,
            category: categoryCol ? (row[categoryCol] ?? '其他').trim() || '其他' : '其他',
            merchant: merchantCol ? (row[merchantCol] ?? '').trim() : '',
            amount,
          })
        }

        resolve(transactions)
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}
