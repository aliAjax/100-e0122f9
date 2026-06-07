import type { SavedView } from '@/types'
import type { StoreSetter, StoreGetter } from './types'
import { generateId, saveBills } from './persistence'
import { getCurrentBill } from './selectors'

export function saveView(set: StoreSetter, _get: StoreGetter, name: string) {
  set((state) => {
    const bill = getCurrentBill(state)
    if (!bill) return state
    const newView: SavedView = {
      id: generateId(),
      name: name.trim() || '未命名视图',
      filter: { ...bill.filter },
      createdAt: Date.now(),
    }
    const bills = state.bills.map((b) =>
      b.id === state.currentBillId ? { ...b, savedViews: [...b.savedViews, newView] } : b,
    )
    void saveBills(bills)
    return { bills }
  })
}

export function switchView(set: StoreSetter, _get: StoreGetter, viewId: string) {
  set((state) => {
    const bill = getCurrentBill(state)
    if (!bill) return state
    const view = bill.savedViews.find((v) => v.id === viewId)
    if (!view) return state
    const bills = state.bills.map((b) =>
      b.id === state.currentBillId ? { ...b, filter: { ...view.filter } } : b,
    )
    void saveBills(bills)
    return { bills }
  })
}

export function renameView(set: StoreSetter, _get: StoreGetter, viewId: string, name: string) {
  set((state) => {
    const bills = state.bills.map((b) => {
      if (b.id !== state.currentBillId) return b
      return {
        ...b,
        savedViews: b.savedViews.map((v) =>
          v.id === viewId ? { ...v, name: name.trim() || '未命名视图' } : v,
        ),
      }
    })
    void saveBills(bills)
    return { bills }
  })
}

export function deleteView(set: StoreSetter, _get: StoreGetter, viewId: string) {
  set((state) => {
    const bills = state.bills.map((b) => {
      if (b.id !== state.currentBillId) return b
      return {
        ...b,
        savedViews: b.savedViews.filter((v) => v.id !== viewId),
      }
    })
    void saveBills(bills)
    return { bills }
  })
}
