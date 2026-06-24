import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    delete timersRef.current[id]
  }, [])

  const addToast = useCallback((message, options = {}) => {
    const id = ++toastId
    const { type = 'info', duration = 4000, action } = options
    const toast = { id, message, type, action }

    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => removeToast(id), duration)
    }

    return id
  }, [removeToast])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ===== Individual Toast Item =====

const typeStyles = {
  success: {
    bg: 'bg-white dark:bg-gray-800 border-green-500',
    icon: (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-white dark:bg-gray-800 border-red-500',
    icon: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-white dark:bg-gray-800 border-amber-500',
    icon: (
      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-white dark:bg-gray-800 border-primary-500',
    icon: (
      <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
}

function ToastItem({ toast, onDismiss }) {
  const style = typeStyles[toast.type] || typeStyles.info

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg
        ${style.bg}
        animate-[slideUp_0.3s_ease-out]`}
    >
      <span className="flex-shrink-0 mt-0.5">{style.icon}</span>
      <p className="flex-1 text-sm text-gray-800 dark:text-gray-200">{toast.message}</p>
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 flex-shrink-0"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
