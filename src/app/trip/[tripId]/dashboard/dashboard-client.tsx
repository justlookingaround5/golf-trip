'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Trip, Course, ActivityFeedItem, TripAward, ReactionEmoji } from '@/lib/types'
import PhotoUpload from '@/components/PhotoUpload'
import RsvpCard from '@/components/RsvpCard'
import ActivityReactions from '@/components/ActivityReactions'
import ActivityComments from '@/components/ActivityComments'

interface DashboardClientProps {
  trip: Trip
  courses: Course[]
  todaysRound: Course | null
  todaysGames: { id: string; buy_in: number; game_format?: { name: string; icon: string } }[]
  recentFeed: ActivityFeedItem[]
  topStandings: {
    id: string
    total_gross: number | null
    total_par: number | null
    trip_player?: { player?: { name: string } | { name: string }[] }
  }[]
  awards: TripAward[]
  tripPlayers?: { id: string; player?: { name: string } | { name: string }[] }[]
  currentTripPlayerId?: string | null
  currentUserId?: string | null
  nextRound?: Course | null
  initialReactions?: Record<string, { emoji: ReactionEmoji; count: number; user_ids: string[] }[]>
  initialCommentCounts?: Record<string, number>
}

export default function DashboardClient({
  trip,
  courses,
  todaysRound,
  todaysGames,
  recentFeed: initialFeed,
  topStandings,
  awards,
  tripPlayers = [],
  currentTripPlayerId = null,
  currentUserId = null,
  nextRound = null,
  initialReactions = {},
  initialCommentCounts = {},
}: DashboardClientProps) {
  const [feed, setFeed] = useState<ActivityFeedItem[]>(initialFeed)
  const [weather, setWeather] = useState<{
    current: { temp: number; wind_mph: number; condition: string; icon: string }
    today: { high: number; low: number; rain_pct: number }
  } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)

  function handleTouchStart(e: React.TouchEvent) {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (deltaY > 100 && window.scrollY === 0) {
      setRefreshing(true)
      window.location.reload()
    }
  }

  // Real-time feed subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`trip-${trip.id}-feed`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed', filter: `trip_id=eq.${trip.id}` },
        (payload) => {
          setFeed(prev => [payload.new as ActivityFeedItem, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [trip.id])

  // Weather fetch
  useEffect(() => {
    fetch('/api/weather?lat=33.0&lon=-117.0')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setWeather(data) })
      .catch(() => {})
  }, [])

  const today = new Date().toISOString().split('T')[0]

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div className="text-center py-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-golf-700 border-t-transparent mx-auto" />
        </div>
      )}
      {/* Header */}
      <header className="bg-golf-900 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <a
            href={`/trip/${trip.id}`}
            className="mb-1 inline-block text-sm text-golf-300 hover:text-white"
          >
            &larr; Back to {trip.name}
          </a>
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          <p className="text-golf-200 text-sm mt-1">
            {trip.location} &middot; {trip.year}
            {trip.join_code && (
              <span className="ml-3 rounded bg-golf-800 px-2 py-0.5 font-mono text-xs">
                Code: {trip.join_code}
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">

        {/* Today's Round */}
        {todaysRound && (
          <div className="rounded-xl bg-white border border-golf-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-900">
                {todaysRound.round_date === today ? "Today's Round" : 'Next Round'}
              </h2>
              <span className="text-xs bg-golf-100 text-golf-800 rounded-full px-2 py-0.5">
                R{todaysRound.round_number}
              </span>
            </div>
            <p className="text-lg font-semibold text-golf-900">{todaysRound.name}</p>
            <p className="text-sm text-gray-500">
              Par {todaysRound.par}
              {todaysRound.round_date && ` · ${new Date(todaysRound.round_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
            </p>

            {/* Weather */}
            {weather && (
              <div className="mt-3 flex items-center gap-4 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-2xl">{weather.current.icon}</span>
                <div>
                  <span className="font-bold text-gray-900">{weather.current.temp}&deg;F</span>
                  <span className="ml-2 text-gray-500">{weather.current.condition}</span>
                </div>
                <div className="ml-auto text-right text-xs text-gray-500">
                  <div>Wind: {weather.current.wind_mph} mph</div>
                  <div>Rain: {weather.today.rain_pct}%</div>
                </div>
              </div>
            )}

            {/* Active games */}
            {todaysGames.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {todaysGames.map((game) => (
                  <span
                    key={game.id}
                    className="inline-flex items-center gap-1 rounded-full bg-golf-50 border border-golf-200 px-2.5 py-1 text-xs font-medium text-golf-800"
                  >
                    {game.game_format?.icon} {game.game_format?.name}
                    {game.buy_in > 0 && ` · $${game.buy_in}`}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              {todaysRound.round_date === today && (
                <Link
                  href={`/trip/${trip.id}/live/${todaysRound.id}`}
                  className="flex-1 rounded-md bg-green-600 py-2 text-center text-sm font-bold text-white hover:bg-green-700"
                >
                  Live Scoring
                </Link>
              )}
              <Link
                href={`/trip/${trip.id}/leaderboard`}
                className="flex-1 rounded-md bg-golf-700 py-2 text-center text-sm font-medium text-white hover:bg-golf-600"
              >
                Leaderboard
              </Link>
              <Link
                href={`/trip/${trip.id}/matches`}
                className="flex-1 rounded-md border border-golf-700 py-2 text-center text-sm font-medium text-golf-700 hover:bg-golf-50"
              >
                Matches
              </Link>
            </div>
          </div>
        )}

        {/* RSVP for next round */}
        {nextRound && tripPlayers.length > 0 && (
          <RsvpCard
            tripId={trip.id}
            courseId={nextRound.id}
            courseName={nextRound.name}
            roundDate={nextRound.round_date}
            tripPlayers={tripPlayers}
            currentTripPlayerId={currentTripPlayerId}
          />
        )}

        {/* Quick Standings */}
        {topStandings.length > 0 && (
          <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-2">Standings</h2>
            <div className="space-y-1.5">
              {topStandings.map((stat, i) => {
                const tp = stat.trip_player
                const player = Array.isArray(tp?.player) ? tp?.player[0] : tp?.player
                const name = player?.name || 'Unknown'
                const diff = (stat.total_gross || 0) - (stat.total_par || 0)
                const diffStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
                return (
                  <div key={stat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 text-center font-bold ${i === 0 ? 'text-golf-700' : 'text-gray-400'}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-900">{name}</span>
                    </div>
                    <span className={`font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                      {diffStr}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Awards */}
        {awards.length > 0 && (
          <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-2">Awards</h2>
            <div className="grid grid-cols-2 gap-2">
              {awards.map(award => (
                <div key={award.id} className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl">{award.award_icon}</div>
                  <div className="text-xs font-semibold text-gray-900 mt-1">{award.award_name}</div>
                  <div className="text-xs text-gray-500">{award.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-2">Schedule</h2>
          <div className="space-y-2">
            {courses.map(course => {
              const isPast = course.round_date ? course.round_date < today : false
              const isToday = course.round_date === today
              return (
                <div
                  key={course.id}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                    isToday ? 'bg-golf-50 border border-golf-200' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <span className={`font-medium ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>
                      R{course.round_number}: {course.name}
                    </span>
                    {course.round_date && (
                      <span className="ml-2 text-xs text-gray-500">
                        {new Date(course.round_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {isToday && <span className="text-xs font-bold text-gold-dark">TODAY</span>}
                  {isPast && <span className="text-xs text-gray-400">&#10003;</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Live Feed */}
        <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Live Feed</h2>
            <PhotoUpload tripId={trip.id} />
          </div>
          {feed.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No activity yet. Scores and events will appear here in real time.
            </p>
          ) : (
            <div className="space-y-3">
              {feed.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex-shrink-0 text-lg">{item.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.detail && (
                      <p className="text-xs text-gray-500">{item.detail}</p>
                    )}
                    {item.photo_url && (
                      <div className="mt-2 relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" style={{ maxHeight: '12rem' }}>
                        <Image
                          src={item.photo_url}
                          alt={item.title}
                          width={400}
                          height={300}
                          className="w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatTimeAgo(item.created_at)}
                    </p>
                    <ActivityReactions
                      activityId={item.id}
                      currentUserId={currentUserId}
                      initialReactions={initialReactions[item.id] || []}
                    />
                    <ActivityComments
                      activityId={item.id}
                      currentUserId={currentUserId}
                      commentCount={initialCommentCounts[item.id] || 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}
