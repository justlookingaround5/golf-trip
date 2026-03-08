'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SettingsClientProps {
  email: string
  displayName: string
  avatarUrl: string | null
}

export default function SettingsClient({ email, displayName, avatarUrl }: SettingsClientProps) {
  const [dark, setDark] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDark(stored === 'dark' || (!stored && prefersDark))
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-golf-900 px-4 pt-14 pb-4 text-white">
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        {/* Profile card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-golf-800 flex items-center justify-center text-xl font-bold text-white">
              {displayName[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>
          <Link
            href="/profile/me"
            className="shrink-0 rounded-full border border-golf-300 px-3 py-1 text-xs font-semibold text-golf-700 hover:bg-golf-50 transition"
          >
            View Profile
          </Link>
        </div>

        {/* Appearance */}
        <Section label="Appearance">
          <SettingRow label="Dark Mode" description="Switch between light and dark theme">
            <button
              onClick={toggleDark}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                dark ? 'bg-golf-700' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={dark}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  dark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </SettingRow>
        </Section>

        {/* Account */}
        <Section label="Account">
          <SettingRow label="Edit Profile" description="Update your name, avatar, and bio">
            <Link
              href="/profile/edit"
              className="text-xs font-semibold text-golf-700 hover:underline"
            >
              Edit →
            </Link>
          </SettingRow>
          <SettingRow label="Notifications" description="Manage push notification preferences">
            <span className="text-xs text-gray-400">Coming soon</span>
          </SettingRow>
        </Section>

        {/* Admin */}
        <Section label="Admin">
          <SettingRow label="Admin Panel" description="Manage trips, courses, and players">
            <Link
              href="/admin/trips"
              className="text-xs font-semibold text-golf-700 hover:underline"
            >
              Open →
            </Link>
          </SettingRow>
        </Section>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full rounded-xl border border-red-200 bg-white py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 shadow-sm transition active:scale-95"
        >
          Sign Out
        </button>

        <p className="text-center text-xs text-gray-400 pt-2">ForeLive · Golf trip scoring & settlements</p>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      {children}
    </div>
  )
}
