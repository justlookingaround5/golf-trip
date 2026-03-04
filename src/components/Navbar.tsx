'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SignOutButton from '@/app/admin/(protected)/sign-out-button'

function ForeLiveLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <circle cx="14" cy="14" r="13" stroke="#c9a84c" strokeWidth="2" fill="none" />
      <line x1="10" y1="6" x2="10" y2="22" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 6 L20 10 L10 14 Z" fill="#c9a84c" />
      <circle cx="10" cy="22" r="1.5" fill="#c9a84c" />
    </svg>
  )
}

const NAV_LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/admin', label: 'Manage Trips' },
]

export default function Navbar({
  profile,
}: {
  profile: { display_name: string | null; avatar_url: string | null }
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/home') return pathname === '/home'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-golf-800 text-white shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Left: Logo + brand + nav links (desktop) */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/home" className="flex items-center gap-2 hover:opacity-90">
            <ForeLiveLogo />
            <span className="text-lg font-bold tracking-tight text-gold">
              ForeLive
            </span>
          </Link>
          <span className="mx-1 hidden text-golf-500 sm:inline sm:mx-2">|</span>
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`hidden rounded-md px-2.5 py-1 text-sm font-medium sm:inline-block ${
                isActive(link.href)
                  ? 'bg-golf-700 text-gold'
                  : 'hover:bg-golf-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Profile + sign out (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/admin/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-golf-700"
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-golf-600 text-xs font-bold">
                {(profile.display_name || '?')[0].toUpperCase()}
              </div>
            )}
            <span className="hidden text-sm font-medium sm:inline">
              {profile.display_name}
            </span>
          </Link>
          <div className="hidden sm:block">
            <SignOutButton />
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1.5 hover:bg-golf-700 sm:hidden"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-golf-700 px-4 pb-3 pt-2 sm:hidden">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                isActive(link.href)
                  ? 'bg-golf-700 text-gold'
                  : 'hover:bg-golf-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-golf-700 pt-2">
            <SignOutButton />
          </div>
        </div>
      )}
    </nav>
  )
}
