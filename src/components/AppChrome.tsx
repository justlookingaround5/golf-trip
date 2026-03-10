'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HIDE_ON = ['/admin', '/auth', '/score/', '/join']

const ICON = {
  home: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
  messages: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  profile: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
}

const NAV = [
  { href: '/', label: 'Home', icon: ICON.home },
  { href: '/messages', label: 'Messages', icon: ICON.messages },
  { href: '/profile', label: 'Profile', icon: ICON.profile },
]

export default function AppChrome() {
  const pathname = usePathname()

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/80 dark:border-gray-700/50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-1 flex-col items-center justify-center py-3 transition-colors ${
                isActive(href)
                  ? 'text-golf-700 dark:text-golf-400'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {icon}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
