import type { Bill } from '@/types'

const DB_NAME = 'spendlens_db'
const DB_VERSION = 1
const STORE_BILLS = 'bills'
const STORE_META = 'meta'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_BILLS)) {
        db.createObjectStore(STORE_BILLS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' })
      }
    }
  })
}

export async function saveBillToIndexedDB(bill: Bill): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_BILLS, 'readwrite')
    const store = tx.objectStore(STORE_BILLS)
    store.put(bill)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch (e) {
    console.warn('Failed to save bill to IndexedDB:', e)
  }
}

export async function saveAllBillsToIndexedDB(bills: Bill[]): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_BILLS, 'readwrite')
    const store = tx.objectStore(STORE_BILLS)
    store.clear()
    for (const bill of bills) {
      store.put(bill)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch (e) {
    console.warn('Failed to save all bills to IndexedDB:', e)
  }
}

export async function loadAllBillsFromIndexedDB(): Promise<Bill[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_BILLS, 'readonly')
    const store = tx.objectStore(STORE_BILLS)
    const request = store.getAll()
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        resolve(request.result as Bill[])
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (e) {
    console.warn('Failed to load bills from IndexedDB:', e)
    return []
  }
}

export async function deleteBillFromIndexedDB(billId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_BILLS, 'readwrite')
    const store = tx.objectStore(STORE_BILLS)
    store.delete(billId)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch (e) {
    console.warn('Failed to delete bill from IndexedDB:', e)
  }
}

export async function saveMeta(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_META, 'readwrite')
    const store = tx.objectStore(STORE_META)
    store.put({ key, value })
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch (e) {
    console.warn('Failed to save meta to IndexedDB:', e)
  }
}

export async function loadMeta(key: string): Promise<unknown | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_META, 'readonly')
    const store = tx.objectStore(STORE_META)
    const request = store.get(key)
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        const result = request.result
        resolve(result ? result.value : null)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (e) {
    console.warn('Failed to load meta from IndexedDB:', e)
    return null
  }
}
