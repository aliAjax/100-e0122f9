import { useState, useMemo, useRef, useEffect } from 'react'
import {
  X,
  Plus,
  Pencil,
  Check,
  Trash2,
  Merge,
  AlertTriangle,
  Palette,
} from 'lucide-react'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useDashboardStore } from '@/store/useDashboardStore'
import { EMPTY_TRANSACTIONS } from '@/store/useDashboardStore'
import type { Transaction } from '@/types'
import { DEFAULT_COLORS } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

type OperationMode = 'none' | 'rename' | 'merge' | 'delete'

export default function CategoryManagementModal({ open, onClose }: Props) {
  const categories = useCategoryStore((s) => s.categories)
  const addCategory = useCategoryStore((s) => s.addCategory)
  const renameCategory = useCategoryStore((s) => s.renameCategory)
  const mergeCategories = useCategoryStore((s) => s.mergeCategories)
  const deleteCategory = useCategoryStore((s) => s.deleteCategory)
  const updateCategoryColor = useCategoryStore((s) => s.updateCategoryColor)

  const transactions = useDashboardStore((s) => {
    const billId = s.currentBillId
    const bill = s.bills.find((b) => b.id === billId)
    return bill?.transactions ?? (EMPTY_TRANSACTIONS as Transaction[])
  })

  const [newCatName, setNewCatName] = useState('')
  const [mode, setMode] = useState<OperationMode>('none')
  const [targetCat, setTargetCat] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [mergeSource, setMergeSource] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState<string | null>(null)
  const [deleteCat, setDeleteCat] = useState<string | null>(null)
  const [deleteFallback, setDeleteFallback] = useState<string>('')
  const [colorPickerCat, setColorPickerCat] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const newCatInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const categoryUsageCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      map.set(t.category, (map.get(t.category) ?? 0) + 1)
    }
    return map
  }, [transactions])

  useEffect(() => {
    if (open) {
      setNewCatName('')
      setMode('none')
      setTargetCat(null)
      setRenameValue('')
      setMergeSource(null)
      setMergeTarget(null)
      setDeleteCat(null)
      setDeleteFallback('')
      setColorPickerCat(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (targetCat && mode === 'rename' && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [targetCat, mode])

  if (!open) return null

  const handleAddCategory = () => {
    const trimmed = newCatName.trim()
    if (!trimmed) return
    const ok = addCategory(trimmed)
    if (!ok) {
      setError('分类名称已存在')
      return
    }
    setNewCatName('')
    setError(null)
    newCatInputRef.current?.focus()
  }

  const handleStartRename = (name: string) => {
    setMode('rename')
    setTargetCat(name)
    setRenameValue(name)
    setError(null)
    setColorPickerCat(null)
  }

  const handleConfirmRename = () => {
    if (!targetCat) return
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setError('分类名称不能为空')
      return
    }
    if (trimmed === targetCat) {
      setMode('none')
      setTargetCat(null)
      setError(null)
      return
    }
    const ok = renameCategory(targetCat, trimmed)
    if (!ok) {
      setError('分类名称已存在')
      return
    }
    setMode('none')
    setTargetCat(null)
    setError(null)
  }

  const handleStartMerge = (source: string) => {
    setMode('merge')
    setMergeSource(source)
    setMergeTarget(null)
    setError(null)
    setColorPickerCat(null)
  }

  const handleConfirmMerge = () => {
    if (!mergeSource || !mergeTarget) return
    if (mergeSource === mergeTarget) {
      setError('不能合并到自身')
      return
    }
    mergeCategories(mergeSource, mergeTarget)
    setMode('none')
    setMergeSource(null)
    setMergeTarget(null)
    setError(null)
  }

  const handleStartDelete = (name: string) => {
    const others = categories.filter((c) => c.name !== name)
    setMode('delete')
    setDeleteCat(name)
    setDeleteFallback(others.length > 0 ? others[0].name : '')
    setError(null)
    setColorPickerCat(null)
  }

  const handleConfirmDelete = () => {
    if (!deleteCat) return
    if (categories.length <= 1) {
      setError('至少需要保留一个分类')
      return
    }
    deleteCategory(deleteCat, deleteFallback || '其他')
    setMode('none')
    setDeleteCat(null)
    setDeleteFallback('')
    setError(null)
  }

  const handleCancel = () => {
    setMode('none')
    setTargetCat(null)
    setMergeSource(null)
    setMergeTarget(null)
    setDeleteCat(null)
    setError(null)
  }

  const handleColorSelect = (catName: string, color: string) => {
    updateCategoryColor(catName, color)
    setColorPickerCat(null)
  }

  const isOperating = mode !== 'none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 mx-4 w-full max-w-2xl rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/15 p-2">
              <Palette className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                分类管理
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                新增、重命名、合并或删除分类，操作会同步更新账单、预算和规则
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {mode === 'merge' && mergeSource && (
            <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <p className="mb-2 text-xs text-blue-300/90">
                将「
                <span className="font-medium text-blue-400">{mergeSource}</span>
                」合并到：
              </p>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((c) => c.name !== mergeSource)
                  .map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setMergeTarget(c.name)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                        mergeTarget === c.name
                          ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                          : 'border-slate-700/30 bg-slate-800/50 text-slate-300 hover:border-slate-600/50',
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </button>
                  ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleConfirmMerge}
                  disabled={!mergeTarget}
                  className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/25 disabled:opacity-40"
                >
                  确认合并
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-lg bg-slate-700/40 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-700/60"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {mode === 'delete' && deleteCat && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="mb-2 text-xs text-red-300/90">
                删除「
                <span className="font-medium text-red-400">{deleteCat}</span>
                」后，该分类下的交易将归入：
              </p>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((c) => c.name !== deleteCat)
                  .map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setDeleteFallback(c.name)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                        deleteFallback === c.name
                          ? 'border-red-500/50 bg-red-500/15 text-red-400'
                          : 'border-slate-700/30 bg-slate-800/50 text-slate-300 hover:border-slate-600/50',
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </button>
                  ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleConfirmDelete}
                  disabled={!deleteFallback}
                  className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-40"
                >
                  确认删除
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-lg bg-slate-700/40 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-700/60"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {categories.map((cat) => {
              const usageCount = categoryUsageCount.get(cat.name) ?? 0
              const isRenaming =
                mode === 'rename' && targetCat === cat.name

              return (
                <div
                  key={cat.name}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                    isRenaming
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-slate-700/30 bg-slate-800/30',
                  )}
                >
                  {colorPickerCat === cat.name ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {DEFAULT_COLORS.slice(0, 10).map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorSelect(cat.name, color)}
                          className={cn(
                            'h-4 w-4 rounded-full transition-transform hover:scale-125',
                            cat.color === color
                              ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-slate-900'
                              : '',
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <button
                        onClick={() => setColorPickerCat(null)}
                        className="ml-1 text-slate-500 hover:text-slate-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setColorPickerCat(
                          colorPickerCat === cat.name ? null : cat.name,
                        )
                      }
                      className="shrink-0 h-4 w-4 rounded-full transition-transform hover:scale-125"
                      style={{ backgroundColor: cat.color }}
                      title="更换颜色"
                    />
                  )}

                  {isRenaming ? (
                    <>
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename()
                          if (e.key === 'Escape') handleCancel()
                        }}
                        className="flex-1 rounded-lg border border-blue-500/40 bg-slate-900/80 px-2 py-1 text-sm text-slate-200 outline-none"
                      />
                      <button
                        onClick={handleConfirmRename}
                        className="shrink-0 rounded-md p-1 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                        title="确认"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                        title="取消"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 truncate">
                            {cat.name}
                          </span>
                          {usageCount > 0 && (
                            <span className="shrink-0 rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-500">
                              {usageCount} 笔
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleStartRename(cat.name)}
                          disabled={isOperating}
                          className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300 disabled:opacity-30"
                          title="重命名"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartMerge(cat.name)}
                          disabled={isOperating || categories.length < 2}
                          className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-30"
                          title="合并到其他分类"
                        >
                          <Merge className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartDelete(cat.name)}
                          disabled={isOperating || categories.length <= 1}
                          className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
                          title="删除分类"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              ref={newCatInputRef}
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="添加新分类..."
              className="flex-1 rounded-lg border border-slate-600/40 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-2 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/25 disabled:opacity-40 disabled:hover:bg-violet-500/15"
            >
              <Plus className="h-3.5 w-3.5" />
              添加
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-700/40 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-violet-500/15 px-4 py-2 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/25"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
