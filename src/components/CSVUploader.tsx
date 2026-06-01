import { useCallback, useState } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { previewCSV } from '@/utils/csvParser'
import { useDashboardStore } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'

export default function CSVUploader() {
  const setPreviewResult = useDashboardStore((s) => s.setPreviewResult)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('请上传 CSV 格式文件')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const result = await previewCSV(file)
        setPreviewResult(result)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [setPreviewResult],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-all duration-300',
        dragging
          ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
          : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800/80',
        loading && 'pointer-events-none opacity-60',
      )}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-sm text-slate-400">正在解析...</p>
        </div>
      ) : (
        <>
          <div className={cn('rounded-2xl p-4 transition-colors', dragging ? 'bg-emerald-400/20' : 'bg-slate-700/50')}>
            <Upload className={cn('h-8 w-8', dragging ? 'text-emerald-400' : 'text-slate-400')} />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-slate-200">拖拽 CSV 文件到此处</p>
            <p className="mt-1 text-sm text-slate-500">或点击下方按钮选择文件</p>
          </div>
          <label className="cursor-pointer rounded-xl bg-emerald-500/20 px-6 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            选择文件
            <input type="file" accept=".csv" className="hidden" onChange={onFileInput} />
          </label>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span>支持列名：日期/分类/商户/金额（自动适配中英文）</span>
          </div>
        </>
      )}
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
