'use client'

import Link from 'next/link'
import Image from 'next/image'

function ForeLiveLogo() {
  return (
    <svg
      width="24"
      height="24"
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

export default function Navbar({
  profile,
  activeRound,
}: {
  profile: { display_name: string | null; avatar_url: string | null }
  activeRound?: { tripId: string; courseId: string; courseName: string } | null
}) {
  return (
    <nav className="bg-golf-800 text-white">
      <div className="flex items-center justify-between px-4 py-1.5">
        <Link href="/" className="flex items-center gap-1.5 hover:opacity-90">
          <ForeLiveLogo />
          <span className="text-base font-bold tracking-tight text-gold">
            ForeLive
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {activeRound && (
            <Link
              href={`/trip/${activeRound.tripId}/live/${activeRound.courseId}`}
              className="rounded-md bg-green-600 px-2 py-1 text-xs font-bold text-white hover:bg-green-700"
            >
              Live
            </Link>
          )}
          <Link
            href="/admin/profile"
            className="flex items-center rounded-full hover:opacity-80"
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
          </Link>
        </div>
      </div>
    </nav>
  )
}
