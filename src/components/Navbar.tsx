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
      {/* Golf flag on pin */}
      <circle cx="14" cy="14" r="13" stroke="#c9a84c" strokeWidth="2" fill="none" />
      <line x1="10" y1="6" x2="10" y2="22" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 6 L20 10 L10 14 Z" fill="#c9a84c" />
      <circle cx="10" cy="22" r="1.5" fill="#c9a84c" />
    </svg>
  )
}

export default function Navbar({
  profile,
}: {
  profile: { display_name: string | null; avatar_url: string | null }
}) {
  return (
    <nav className="bg-golf-800 text-white shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Left: Logo + brand + nav links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/home" className="flex items-center gap-2 hover:opacity-90">
            <ForeLiveLogo />
            <span className="text-lg font-bold tracking-tight text-gold">
              ForeLive
            </span>
          </Link>
          <span className="mx-1 text-golf-500 sm:mx-2">|</span>
          <Link
            href="/home"
            className="rounded-md px-2 py-1 text-sm font-medium hover:bg-golf-700"
          >
            Home
          </Link>
          <Link
            href="/admin"
            className="rounded-md px-2 py-1 text-sm font-medium hover:bg-golf-700"
          >
            Manage Trips
          </Link>
        </div>

        {/* Right: Profile + sign out */}
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
          <SignOutButton />
        </div>
      </div>
    </nav>
  )
}
