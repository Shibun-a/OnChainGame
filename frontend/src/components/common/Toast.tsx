import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/utils/format'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-900/90 border-green-600 text-green-200',
  error: 'bg-red-900/90 border-red-600 text-red-200',
  warning: 'bg-yellow-900/90 border-yellow-600 text-yellow-200',
  info: 'bg-blue-900/90 border-blue-600 text-blue-200',
}

let addToastFn: ((message: string, type: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn('px-4 py-3 rounded-lg border shadow-lg text-sm', typeStyles[t.type])}
        >
          <div className="flex justify-between items-start gap-2">
            <span>{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(tt => tt.id !== t.id))}
              className="text-current opacity-60 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
