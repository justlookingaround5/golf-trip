'use client'

import { useState } from 'react'
import FriendRoundCard from '@/components/v2/FriendRoundCard'
import type { FriendRoundFeedItem } from '@/lib/v2/home-data'

const PAGE_SIZE = 20

interface RecentActivityFeedProps {
  items: FriendRoundFeedItem[]
  currentUserId: string | null
}

export default function RecentActivityFeed({ items, currentUserId }: RecentActivityFeedProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visible = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length

  return (
    <div className="space-y-3">
      {visible.map(item => (
        <FriendRoundCard key={item.key} item={item} currentUserId={currentUserId} />
      ))}
      {hasMore && (
        <button
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Load more
        </button>
      )}
    </div>
  )
}
