'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'

export default function LiveScoringError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.capture('client_error', {
        error_message: error.message,
        error_digest: error.digest,
        page: 'live-scoring',
      })
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm rounded-xl bg-white p-8 text-center shadow-lg">
        <p className="mb-2 text-2xl font-bold text-gray-900">Scoring Error</p>
        <p className="mb-6 text-sm text-gray-500">{error.message || 'Live scoring hit an error. Your saved scores are safe.'}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-golf-700 px-6 py-3 text-sm font-semibold text-white hover:bg-golf-800"
          >
            Reload
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
