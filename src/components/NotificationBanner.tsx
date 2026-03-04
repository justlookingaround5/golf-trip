'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function NotificationBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem('push-banner-dismissed')) return
    setShow(true)
  }, [])

  const handleEnable = async () => {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setShow(false)
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ).buffer as ArrayBuffer,
      })

      const sub = subscription.toJSON()
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth_key: sub.keys?.auth,
        }),
      })
    } catch (err) {
      console.error('Push subscription failed:', err)
    }

    setShow(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('push-banner-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="bg-golf-50 border-b border-golf-200 px-4 py-3">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
        <p className="text-sm text-golf-800">
          Get notified when your buddies make birdies
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleEnable}
            className="rounded-md bg-golf-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-golf-600"
          >
            Enable
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-md border border-golf-300 px-3 py-1.5 text-xs font-medium text-golf-700 hover:bg-golf-100"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
