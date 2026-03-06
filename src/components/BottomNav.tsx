'use client'

type Tab = 'plan' | 'play' | 'review'

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'plan',
    label: 'Plan',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: 'play',
    label: 'Play',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    ),
  },
  {
    key: 'review',
    label: 'Review',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
              activeTab === key
                ? 'text-golf-700 dark:text-golf-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {icon}
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
