'use client'

import { useState } from 'react'

export default function ShareTrip({ tripId }: { tripId: string }) {
  const [copied, setCopied] = useState<string | null>(null)

  const tripUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/trip/${tripId}`
    : `/trip/${tripId}`

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for mobile
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  async function handleShare() {
    const shareText = `Check out our golf trip: ${tripUrl}`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Golf Trip', text: shareText, url: tripUrl })
        return
      } catch {
        // User cancelled or not supported, fall through to copy
      }
    }
    copyToClipboard(shareText, 'message')
  }

  return (
    <div className="rounded-lg border border-golf-200 bg-golf-50 p-6 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-gray-900">Share This Trip</h3>
      <p className="mb-4 text-sm text-gray-600">Invite friends to view or join your trip.</p>

      <div className="space-y-3">
        {/* Trip Link */}
        <div className="flex items-center gap-2 rounded-lg bg-white p-3 border border-gray-200">
          <input
            type="text"
            readOnly
            value={tripUrl}
            className="flex-1 truncate bg-transparent text-sm text-gray-700 outline-none"
          />
          <button
            type="button"
            onClick={() => copyToClipboard(tripUrl, 'link')}
            className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {copied === 'link' ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Share Button (uses native share on mobile) */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full rounded-md bg-golf-700 px-4 py-3 text-sm font-medium text-white hover:bg-golf-800"
        >
          {copied === 'message' ? 'Copied to clipboard!' : 'Share with Friends'}
        </button>
      </div>
    </div>
  )
}
