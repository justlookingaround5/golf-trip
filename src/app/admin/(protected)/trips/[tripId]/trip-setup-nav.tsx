'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SetupState {
  hasCourses: boolean
  hasPlayers: boolean
  hasTeams: boolean
}

export default function TripSetupNav({
  tripId,
  setupState,
}: {
  tripId: string
  setupState: SetupState
}) {
  const pathname = usePathname()
  const base = `/admin/trips/${tripId}`

  const tabs = [
    { label: 'Overview', href: base, locked: false, lockReason: '' },
    { label: 'Courses', href: `${base}/courses`, locked: false, lockReason: '' },
    {
      label: 'Players',
      href: `${base}/players`,
      locked: !setupState.hasCourses,
      lockReason: 'Add courses first',
    },
    {
      label: 'Teams',
      href: `${base}/teams`,
      locked: !setupState.hasPlayers,
      lockReason: !setupState.hasCourses ? 'Add courses first' : 'Add players first',
    },
    {
      label: 'Matches',
      href: `${base}/matches`,
      locked: !setupState.hasTeams,
      lockReason: !setupState.hasCourses
        ? 'Add courses first'
        : !setupState.hasPlayers
          ? 'Add players first'
          : 'Create teams first',
    },
  ]

  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="-mb-px flex space-x-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href

          if (tab.locked) {
            return (
              <span
                key={tab.label}
                title={tab.lockReason}
                className="flex cursor-not-allowed items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-gray-300 select-none"
              >
                {tab.label}
                <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
            )
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-golf-700 text-golf-700'
                  : 'border-transparent text-gray-500 hover:border-golf-500 hover:text-golf-700'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
