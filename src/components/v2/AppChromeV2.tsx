'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import ActionSheet from './ActionSheet'

// ─── Icons ────────────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
)

const MessagesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const CoursesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
)

const ProfileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

// ─── Nav items (null = + button placeholder) ──────────────────────────────────

const HIDE_ON = ['/admin', '/auth', '/score/', '/join', '/courses/', '/messages/']

const NAV = [
  { href: '/',          label: 'Home',     Icon: HomeIcon     },
  { href: '/messages', label: 'Messages', Icon: MessagesIcon },
  null, // + button
  { href: '/courses',  label: 'Courses',  Icon: CoursesIcon  },
  { href: '/profile',  label: 'Profile',  Icon: ProfileIcon  },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppChromeV2() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [hasActiveRound, setHasActiveRound] = useState(false)

  useEffect(() => {
    fetch('/api/quick-round/active')
      .then(res => res.ok ? res.json() : { active: false })
      .then(data => setHasActiveRound(data.active))
      .catch(() => {})
  }, [pathname])

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/profile') return pathname.startsWith('/profile') || pathname.startsWith('/stats') || pathname.startsWith('/settings')
    return pathname.startsWith(href)
  }

  return (
    <>
      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        hasActiveRound={hasActiveRound}
      />

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/80 dark:border-gray-700/50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg items-end">
          {NAV.map((item, i) => {
            // + button
            if (item === null) {
              return (
                <div key="plus" className="flex flex-1 flex-col items-center justify-center py-2">
                  <button
                    onClick={() => setSheetOpen(true)}
                    aria-label="Actions"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-golf-800 text-white shadow-lg active:scale-95 transition-transform"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              )
            }

            const { href, label, Icon } = item
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`flex flex-1 flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                  active
                    ? 'text-golf-700 dark:text-golf-400'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                <Icon />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
