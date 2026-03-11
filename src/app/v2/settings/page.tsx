'use client'

import Link from 'next/link'

const SETTINGS_ITEMS = [
  { label: 'Notification preferences', icon: '🔔', href: '#' },
  { label: 'Default round format',      icon: '🏌️', href: '#' },
  { label: 'Home course',               icon: '⛳', href: '#' },
  { label: 'Privacy',                   icon: '🔒', href: '#' },
  { label: 'Currency',                  icon: '💰', href: '#' },
  { label: 'Sign out',                  icon: '🚪', href: '/admin/login' },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <Link
            href="/v2/profile"
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Profile
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {SETTINGS_ITEMS.map(({ label, icon, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition border-b border-gray-100 last:border-b-0"
            >
              <span className="text-lg w-6 text-center shrink-0">{icon}</span>
              <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300 shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
