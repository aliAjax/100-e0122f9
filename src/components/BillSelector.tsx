import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Edit2, Trash2, FileText, Check, X } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'

export default function BillSelector() {
  const bills = useDashboardStore((s) => s.bills)
  const currentBillId = useDashboardStore((s) => s.currentBillId)
  const currentBill = useDashboardStore((s) => s.currentBill)
  const switchBill = useDashboardStore((s) => s.switchBill)
  const renameBill = useDashboardStore((s) => s.renameBill)
  const deleteBill = useDashboardStore((s) => s.deleteBill)
  const setPendingBillName = useDashboardStore((s) => s.setPendingBillName)
  const setPreviewResult = useDashboardStore((s) => s.setPreviewResult)

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setEditingId(null)
        setShowDeleteConfirm(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleNewBill = () => {
    setOpen(false)
    setPendingBillName(`账单 ${bills.length + 1}`)
    setPreviewResult(null)
    document.getElementById('bill-file-input')?.click()
  }

  const handleSwitch = (billId: string) => {
    if (billId !== currentBillId) {
      switchBill(billId)
    }
    setOpen(false)
  }

  const handleStartRename = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const bill = bills.find((b) => b.id === billId)
    if (bill) {
      setEditingId(billId)
      setEditName(bill.name)
    }
  }

  const handleConfirmRename = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (editName.trim()) {
      renameBill(billId, editName.trim())
    }
    setEditingId(null)
  }

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const handleDelete = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(billId)
  }

  const handleConfirmDelete = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteBill(billId)
    setShowDeleteConfirm(null)
    setOpen(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(null)
  }

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  if (bills.length === 0) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors',
          'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60',
        )}
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="max-w-[140px] truncate">{currentBill?.name || '未选择'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-700/50 bg-[#0d1420] shadow-2xl">
          <div className="max-h-[320px] overflow-y-auto">
            {bills.map((bill) => (
              <div
                key={bill.id}
                onClick={() => handleSwitch(bill.id)}
                className={cn(
                  'group cursor-pointer border-b border-slate-700/30 px-4 py-3 transition-colors last:border-0',
                  bill.id === currentBillId ? 'bg-emerald-500/10' : 'hover:bg-slate-700/30',
                )}
              >
                {editingId === bill.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmRename(bill.id, e as unknown as React.MouseEvent)
                        if (e.key === 'Escape') handleCancelRename(e as unknown as React.MouseEvent)
                      }}
                      maxLength={50}
                      className="flex-1 rounded-md border border-slate-600/50 bg-slate-800/50 px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                    />
                    <button
                      onClick={(e) => handleConfirmRename(bill.id, e)}
                      className="rounded-md p-1 text-emerald-400 hover:bg-emerald-500/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-700/50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : showDeleteConfirm === bill.id ? (
                  <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs text-slate-400">确定要删除「{bill.name}」吗？</p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleConfirmDelete(bill.id, e)}
                        className="flex-1 rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30"
                      >
                        删除
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="flex-1 rounded-md bg-slate-700/40 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700/60"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'truncate text-sm font-medium',
                          bill.id === currentBillId ? 'text-emerald-400' : 'text-slate-200',
                        )}>
                          {bill.name}
                        </p>
                        {bill.id === currentBillId && (
                          <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {bill.transactions.length} 条 · 创建于 {formatDate(bill.createdAt)}
                      </p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => handleStartRename(bill.id, e)}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
                        title="重命名"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(bill.id, e)}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-700/30 p-2">
            <button
              onClick={handleNewBill}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              导入新账单
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
