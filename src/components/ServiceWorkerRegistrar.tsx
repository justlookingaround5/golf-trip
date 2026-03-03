'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/offline'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
