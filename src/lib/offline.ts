/**
 * Register service worker and set up sync listeners.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('SW registered:', registration.scope)

      // Listen for sync status messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_STATUS') {
          const { synced, pending } = event.data
          if (synced > 0) {
            console.log(`Synced ${synced} scores. ${pending} still pending.`)
          }
          // Dispatch custom event for UI to pick up
          window.dispatchEvent(
            new CustomEvent('scores-synced', { detail: { synced, pending } })
          )
        }
      })
    } catch (error) {
      console.error('SW registration failed:', error)
    }
  })
}

/**
 * Request background sync (for when connectivity returns).
 */
export async function requestSync() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  if ('sync' in registration) {
    await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-scores')
  }
}

/**
 * Manually trigger queue flush (for "try now" button).
 */
export function flushOfflineQueue() {
  navigator.serviceWorker?.controller?.postMessage({ type: 'FLUSH_QUEUE' })
}

/**
 * Check current online status.
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
