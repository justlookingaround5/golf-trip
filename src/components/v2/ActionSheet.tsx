'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface ActionSheetProps {
  open: boolean
  onClose: () => void
  hasActiveRound: boolean
}

export default function ActionSheet({ open, onClose, hasActiveRound }: ActionSheetProps) {
  // Close on backdrop tap or Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg">
        <div className="m-3 overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Actions */}
          <div className="divide-y divide-gray-100">
            {/* Start a Round */}
            {hasActiveRound ? (
              <button
                disabled
                className="flex w-full items-center gap-4 px-5 py-4 opacity-40 cursor-not-allowed"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl">
                  ⛳
                </span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Start a Round</p>
                  <p className="text-xs text-gray-400">Finish your active round first</p>
                </div>
              </button>
            ) : (
              <Link
                href="/quick-round"
                onClick={onClose}
                className="flex w-full items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl">
                  ⛳
                </span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Start a Round</p>
                  <p className="text-xs text-gray-500">Quick play or trip round</p>
                </div>
              </Link>
            )}

            {/* Create a Trip */}
            <Link
              href="/admin/trips/new"
              onClick={onClose}
              className="flex w-full items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
                ✈️
              </span>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Create a Trip</p>
                <p className="text-xs text-gray-500">Set up a new golf trip</p>
              </div>
            </Link>

            {/* Join a Trip */}
            <Link
              href="/join"
              onClick={onClose}
              className="flex w-full items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-xl">
                🔑
              </span>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Join a Trip</p>
                <p className="text-xs text-gray-500">Enter a trip code or link</p>
              </div>
            </Link>
          </div>

          {/* Cancel */}
          <div className="border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full py-4 text-center text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
