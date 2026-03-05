'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.capture('client_error', {
        error_message: error.message,
        error_digest: error.digest,
        page: window.location.pathname,
      })
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm rounded-xl bg-white p-8 text-center shadow-lg">
        <p className="mb-2 text-2xl font-bold text-gray-900">Something went wrong</p>
        <p className="mb-6 text-sm text-gray-500">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-golf-700 px-6 py-3 text-sm font-semibold text-white hover:bg-golf-800"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
