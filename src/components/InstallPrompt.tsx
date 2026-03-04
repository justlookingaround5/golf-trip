'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(true)

  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (isInstalled) return

    setInstalled(false)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null)
        setInstalled(true)
      })
    }
  }

  if (installed) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Install ForeLive</p>
          <p className="text-xs text-gray-500">Add to your home screen. Works offline, no app store needed.</p>
        </div>
        {deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 focus:outline-none focus:ring-2 focus:ring-golf-500 focus:ring-offset-2"
          >
            Install
          </button>
        ) : (
          <span className="text-xs text-gray-400">Not available in this browser</span>
        )}
      </div>
    </div>
  )
}
