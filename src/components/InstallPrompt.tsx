'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const wasDismissed = localStorage.getItem('install-prompt-dismissed')
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (wasDismissed || isInstalled) return

    setDismissed(false)

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
        dismiss()
      })
    }
  }

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('install-prompt-dismissed', 'true')
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-golf-900 text-white px-4 py-3 shadow-lg">
      <div className="mx-auto max-w-lg flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium">Add ForeLive to your home screen</p>
          <p className="text-xs text-golf-200">Works offline. No app store needed.</p>
        </div>
        <div className="flex gap-2 ml-3">
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-golf-900"
            >
              Install
            </button>
          )}
          <button onClick={dismiss} className="px-2 py-1.5 text-xs text-golf-200">
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
