import { useState, useRef, useEffect } from 'react'
import { Bookmark, Plus, Edit2, Trash2, Check, X, Info } from 'lucide-react'
import { useDashboardStore, useFilter, useSavedViews, useMergeMode, useEffectiveFilter } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'

export default function SavedViews() {
  const mergeMode = useMergeMode()
  const savedViews = useSavedViews()
  const filter = useEffectiveFilter()
  const saveView = useDashboardStore((s) => s.saveView)
  const switchView = useDashboardStore((s) => s.switchView)
  const renameView = useDashboardStore((s) => s.renameView)
  const deleteView = useDashboardStore((s) => s.deleteView)

  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const saveInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showSaveInput && saveInputRef.current) {
      saveInputRef.current.focus()
    }
  }, [showSaveInput])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const hasFilter =
    filter.selectedCategory ||
    filter.selectedMonth ||
    filter.selectedDate ||
    filter.selectedMerchant ||
    filter.selectedType !== 'expense' ||
    filter.searchText ||
    filter.amountMin !== null ||
    filter.amountMax !== null

  const handleSave = () => {
    if (!saveName.trim()) return
    saveView(saveName.trim())
    setSaveName('')
    setShowSaveInput(false)
  }

  const handleStartRename = (viewId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(viewId)
    setEditName(name)
  }

  const handleConfirmRename = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (editName.trim()) {
      renameView(viewId, editName.trim())
    }
    setEditingId(null)
  }

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const handleDelete = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(viewId)
  }

  const handleConfirmDelete = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteView(viewId)
    setDeletingId(null)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(null)
  }

  if (mergeMode) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1.5">
        <Info className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-xs text-purple-400">合并模式下，保存视图功能暂不可用</span>
      </div>
    )
  }

  if (savedViews.length === 0 && !hasFilter) return null

  return (
    <div className="flex items-center gap-2">
      <Bookmark className="h-4 w-4 shrink-0 text-slate-500" />
      <span className="shrink-0 text-xs text-slate-500">常用视图</span>

      {savedViews.map((view) => (
        <div key={view.id} className="relative">
          {editingId === view.id ? (
            <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={editInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename(view.id, e as unknown as React.MouseEvent)
                  if (e.key === 'Escape') handleCancelRename(e as unknown as React.MouseEvent)
                }}
                maxLength={30}
                className="w-28 rounded-md border border-slate-600/50 bg-slate-800/50 px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={(e) => handleConfirmRename(view.id, e)}
                className="rounded-md p-1 text-emerald-400 hover:bg-emerald-500/20"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={handleCancelRename}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-700/50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : deletingId === view.id ? (
            <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-[11px] text-red-400">删除？</span>
              <button
                onClick={(e) => handleConfirmDelete(view.id, e)}
                className="rounded-md px-1.5 py-0.5 text-[11px] text-red-400 hover:bg-red-500/20"
              >
                确定
              </button>
              <button
                onClick={handleCancelDelete}
                className="rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-700/50"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => switchView(view.id)}
              className="group inline-flex items-center gap-1.5 rounded-lg bg-slate-700/40 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700/60"
            >
              <span className="max-w-[120px] truncate">{view.name}</span>
              <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Edit2
                  className="h-3 w-3 text-slate-400 hover:text-slate-200"
                  onClick={(e) => handleStartRename(view.id, view.name, e as unknown as React.MouseEvent)}
                />
                <Trash2
                  className="h-3 w-3 text-slate-400 hover:text-red-400"
                  onClick={(e) => handleDelete(view.id, e as unknown as React.MouseEvent)}
                />
              </span>
            </button>
          )}
        </div>
      ))}

      {showSaveInput ? (
        <div className="inline-flex items-center gap-1">
          <input
            ref={saveInputRef}
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') {
                setShowSaveInput(false)
                setSaveName('')
              }
            }}
            placeholder="视图名称"
            maxLength={30}
            className="w-28 rounded-md border border-slate-600/50 bg-slate-800/50 px-2 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-500/50"
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            className={cn(
              'rounded-md p-1 transition-colors',
              saveName.trim() ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-600',
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setShowSaveInput(false)
              setSaveName('')
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-700/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setShowSaveInput(true)
            setSaveName('')
          }}
          disabled={!hasFilter}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
            hasFilter
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-slate-700/20 text-slate-600 cursor-not-allowed',
          )}
          title={hasFilter ? '保存当前筛选条件为视图' : '请先设置筛选条件'}
        >
          <Plus className="h-3 w-3" />
          保存视图
        </button>
      )}
    </div>
  )
}
