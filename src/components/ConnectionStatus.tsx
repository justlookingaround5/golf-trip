'use client'

import { useState, useEffect } from 'react'
import { flushOfflineQueue } from '@/lib/offline'

export default function ConnectionStatus() {
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    setOnline(navigator.onLine)

    const handleOnline = () => { setOnline(true); flushOfflineQueue() }
    const handleOffline = () => setOnline(false)
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setPending(detail?.pending || 0)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('scores-synced', handleSync)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('scores-synced', handleSync)
    }
  }, [])

  // Don't show anything when online and no pending
  if (online && pending === 0) return null

  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 px-2.5 py-1 shadow-lg border border-gray-200 dark:border-gray-700">
      <span className={`h-2 w-2 rounded-full ${
        online ? (pending > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500') : 'bg-red-500'
      }`} />
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {!online
          ? 'Offline'
          : pending > 0
            ? `${pending} pending`
            : 'Synced'}
      </span>
      {online && pending > 0 && (
        <button
          onClick={flushOfflineQueue}
          className="text-xs text-green-700 dark:text-green-400 font-medium ml-1"
        >
          Sync
        </button>
      )}
    </div>
  )
}
