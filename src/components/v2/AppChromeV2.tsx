'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const StatsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6"  y1="20" x2="6"  y2="14" />
  </svg>
)

const ProfileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

// ─── Nav items (null = + button placeholder) ──────────────────────────────────

const NAV = [
  { href: '/v2',          label: 'Home',     Icon: HomeIcon     },
  { href: '/v2/messages', label: 'Messages', Icon: MessagesIcon },
  null, // + button
  { href: '/v2/stats',    label: 'Stats',    Icon: StatsIcon    },
  { href: '/v2/profile',  label: 'Profile',  Icon: ProfileIcon  },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppChromeV2() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  // STUB: replace with real active-round check
  const hasActiveRound = true

  const isActive = (href: string) =>
    href === '/v2' ? pathname === '/v2' : pathname.startsWith(href)

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
