import Link from 'next/link'
import Image from 'next/image'
import SignOutButton from '@/app/admin/(protected)/sign-out-button'

export default function Navbar({
  profile,
}: {
  profile: { display_name: string | null; avatar_url: string | null }
}) {
  return (
    <nav className="bg-golf-800 text-white shadow-md">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/home" className="text-lg font-bold tracking-tight hover:text-gold">
          ForeLive
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/home"
            className="rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-golf-700"
          >
            Home
          </Link>
          <Link
            href="/admin"
            className="rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-golf-700"
          >
            Admin
          </Link>
          <Link
            href="/admin/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-golf-700"
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
