const CACHE_NAME = 'golf-trip-v1'
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== 'offline-queue').map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch strategy:
// - API calls (score submissions): network-first, queue on failure
// - Page navigations: network-first, fall back to cache
// - Static assets: cache-first
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Score submissions — network first, queue on failure
  if (request.method === 'POST' && url.pathname.includes('/api/score/')) {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        // Queue for later sync
        const body = await request.clone().json()
        const queue = await getQueue()
        queue.push({
          url: request.url,
          body,
          timestamp: Date.now(),
        })
        await saveQueue(queue)

        // Return a synthetic success response
        return new Response(
          JSON.stringify({ queued: true, message: 'Score saved offline. Will sync when connected.' }),
          { status: 202, headers: { 'Content-Type': 'application/json' } }
        )
      })
    )
    return
  }

  // GET requests — network first, fall back to cache
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page/asset responses
          if (response.ok && (url.pathname.startsWith('/trip/') || url.pathname.startsWith('/score/'))) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    )
    return
  }
})

// Background sync — flush queued scores when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(flushQueue())
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title || 'ForeLive', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' },
      })
    )
  } catch (e) {
    // Ignore malformed push payloads
  }
})

// Notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// Also try flushing on message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FLUSH_QUEUE') {
    flushQueue().then(() => {
      if (event.source) {
        event.source.postMessage({ type: 'QUEUE_FLUSHED' })
      }
    })
  }
})

// ---------- Queue helpers (Cache API-backed) ----------

async function getQueue() {
  try {
    const cache = await caches.open('offline-queue')
    const response = await cache.match('queue')
    if (!response) return []
    return await response.json()
  } catch (e) {
    return []
  }
}

async function saveQueue(queue) {
  const cache = await caches.open('offline-queue')
  await cache.put('queue', new Response(JSON.stringify(queue)))
}

async function flushQueue() {
  const queue = await getQueue()
  if (queue.length === 0) return

  const remaining = []
  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      })
      if (!res.ok) remaining.push(item)
    } catch (e) {
      remaining.push(item)
    }
  }

  await saveQueue(remaining)

  // Notify clients about sync result
  const allClients = await self.clients.matchAll()
  for (const client of allClients) {
    client.postMessage({
      type: 'SYNC_STATUS',
      synced: queue.length - remaining.length,
      pending: remaining.length,
    })
  }
}
