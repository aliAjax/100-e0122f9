import type { Bill, Transaction, TransactionType, FilterState } from '@/types'
import {
  saveAllBillsToIndexedDB,
  loadAllBillsFromIndexedDB,
  deleteBillFromIndexedDB,
} from '@/utils/storage'

const STORAGE_KEY_BILLS = 'spendlens_bills'
const STORAGE_KEY_CURRENT = 'spendlens_current_bill'
const LEGACY_STORAGE_KEY = 'spendlens_transactions'
const SMALL_BILL_THRESHOLD = 1000

export function generateId(): string {
  return `bill_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyFilter(): FilterState {
  return {
    selectedCategory: null,
    selectedMonth: null,
    selectedDate: null,
    selectedMerchant: null,
    selectedType: 'expense',
    searchText: '',
    amountMin: null,
    amountMax: null,
  }
}

export function normalizeBill(bill: Bill): Bill {
  return {
    ...bill,
    filter: {
      ...createEmptyFilter(),
      ...bill.filter,
    },
    savedViews: bill.savedViews ?? [],
    transactions: bill.transactions.map((t) => ({
      ...t,
      type: ((t as { type?: string }).type || 'expense') as TransactionType,
    })),
  }
}

export function isSmallBill(bill: Bill): boolean {
  return bill.transactions.length <= SMALL_BILL_THRESHOLD
}

export function hasLargeBills(bills: Bill[]): boolean {
  return bills.some((b) => !isSmallBill(b))
}

export function mergeStoredBills(localBills: Bill[], indexedBills: Bill[]): Bill[] {
  if (localBills.length === 0) return indexedBills
  if (indexedBills.length === 0) return localBills

  const indexedById = new Map(indexedBills.map((bill) => [bill.id, bill]))
  return localBills.map((bill) => {
    const indexed = indexedById.get(bill.id)
    if (!indexed) return bill
    if (bill.transactions.length > 0) return bill
    return {
      ...indexed,
      name: bill.name,
      filter: bill.filter,
      savedViews: bill.savedViews,
      createdAt: bill.createdAt,
    }
  })
}

export async function loadBills(): Promise<Bill[]> {
  let localBills: Bill[] = []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BILLS)
    if (raw) {
      const bills = JSON.parse(raw) as Bill[]
      if (bills.length > 0) {
        localBills = bills.map(normalizeBill)
      }
    }
  } catch {
    // fall through
  }

  try {
    const idbBills = await loadAllBillsFromIndexedDB()
    if (idbBills.length > 0) {
      return mergeStoredBills(localBills, idbBills.map(normalizeBill))
    }
  } catch {
    // fall through
  }

  if (localBills.length > 0) return localBills

  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const transactions = JSON.parse(legacyRaw) as Transaction[]
      if (transactions.length > 0) {
        const migratedTransactions = transactions.map((t) => ({
          ...t,
          type: ((t as { type?: string }).type || 'expense') as TransactionType,
        }))
        const legacyBill: Bill = {
          id: generateId(),
          name: '默认账单',
          transactions: migratedTransactions,
          filter: createEmptyFilter(),
          savedViews: [],
          createdAt: Date.now(),
        }
        const bills = [legacyBill]
        void saveBills(bills)
        saveCurrentBillId(legacyBill.id)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
        return bills
      }
    }
  } catch {
    // fall through
  }
  return []
}

export async function saveBills(bills: Bill[]): Promise<void> {
  if (hasLargeBills(bills)) {
    try {
      await saveAllBillsToIndexedDB(bills)
      const metaBills = bills.map((b) => ({ ...b, transactions: [] }))
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(metaBills))
      return
    } catch (e) {
      console.warn('Failed to save bills to IndexedDB:', e)
    }
  }

  try {
    const serialized = JSON.stringify(bills)
    localStorage.setItem(STORAGE_KEY_BILLS, serialized)
  } catch (e) {
    console.warn('Failed to save bills to localStorage:', e)
    try {
      await saveAllBillsToIndexedDB(bills)
    } catch (e2) {
      console.warn('Also failed to save to IndexedDB:', e2)
    }
  }
}

export function loadCurrentBillId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_CURRENT)
  } catch {
    return null
  }
}

export function saveCurrentBillId(id: string | null) {
  if (id) {
    localStorage.setItem(STORAGE_KEY_CURRENT, id)
  } else {
    localStorage.removeItem(STORAGE_KEY_CURRENT)
  }
}

export function removeBillFromStorage(billId: string) {
  void deleteBillFromIndexedDB(billId)
}
