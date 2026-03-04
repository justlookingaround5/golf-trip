'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'basics' | 'invite' | 'settings'

interface GroupMember {
  user_id: string
  display_name: string | null
  avatar_url: string | null
}

interface ProfileResult {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
}

export default function NewTripPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const groupId = searchParams.get('group_id')

  const [step, setStep] = useState<Step>('basics')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Basics
  const [name, setName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [location, setLocation] = useState('')
  const [tripDate, setTripDate] = useState('')

  // Step 2: Invite
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [groupLoaded, setGroupLoaded] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([])
  const [searchingProfiles, setSearchingProfiles] = useState(false)
  const [addedProfiles, setAddedProfiles] = useState<ProfileResult[]>([])

  // Step 3: Settings
  const [matchBuyIn, setMatchBuyIn] = useState(100)
  const [skinsBuyIn, setSkinsBuyIn] = useState(10)
  const [skinsMode, setSkinsMode] = useState<'gross' | 'net' | 'both'>('net')

  async function loadGroupMembers() {
    if (!groupId || groupLoaded) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)

    if (!members) return

    const memberUserIds = members.map(m => m.user_id).filter(id => id !== user.id)
    if (memberUserIds.length === 0) {
      setGroupLoaded(true)
      return
    }

    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', memberUserIds)

    const enriched: GroupMember[] = memberUserIds.map(uid => {
      const profile = (profiles || []).find(p => p.user_id === uid)
      return {
        user_id: uid,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
      }
    })

    setGroupMembers(enriched)
    setSelectedMembers(new Set(enriched.map(m => m.user_id)))
    setGroupLoaded(true)
  }

  async function searchProfiles(query: string) {
    setSearchQuery(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearchingProfiles(true)
    try {
      const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data: ProfileResult[] = await res.json()
        const existingIds = new Set([
          ...groupMembers.map(m => m.user_id),
          ...addedProfiles.map(p => p.user_id),
        ])
        setSearchResults(data.filter(r => !existingIds.has(r.user_id)))
      }
    } catch {
      // ignore
    } finally {
      setSearchingProfiles(false)
    }
  }

  function addProfile(profile: ProfileResult) {
    setAddedProfiles(prev => [...prev, profile])
    setSearchQuery('')
    setSearchResults([])
  }

  function removeProfile(userId: string) {
    setAddedProfiles(prev => prev.filter(p => p.user_id !== userId))
  }

  function toggleMember(userId: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function goToStep(target: Step) {
    if (target === 'invite') {
      if (!name.trim()) {
        setError('Trip name is required')
        return
      }
      setError(null)
      loadGroupMembers()
    }
    setStep(target)
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Trip name is required')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          year,
          location: location || null,
          match_buy_in: matchBuyIn,
          skins_buy_in: skinsBuyIn,
          skins_mode: skinsMode,
          group_id: groupId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create trip')
      }

      const trip = await res.json()

      // Add selected group members + searched profiles as players
      const usersToAdd = [
        ...Array.from(selectedMembers),
        ...addedProfiles.map(p => p.user_id),
      ]

      for (const userId of usersToAdd) {
        await fetch(`/api/trips/${trip.id}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_user_id: userId }),
        }).catch(() => {/* best effort */})
      }

      // Send email invites
      const emails = inviteEmails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.includes('@'))

      for (const email of emails) {
        await fetch(`/api/trips/${trip.id}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: email.split('@')[0], email }),
        }).catch(() => {/* best effort */})
      }

      router.push(`/admin/trips/${trip.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'basics', label: 'Trip Details', num: 1 },
    { key: 'invite', label: 'Invite Crew', num: 2 },
    { key: 'settings', label: 'Games & Money', num: 3 },
  ]

  const currentIdx = steps.findIndex(s => s.key === step)

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    i <= currentIdx
                      ? 'bg-golf-700 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < currentIdx ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.num
                  )}
                </div>
                <span className={`hidden text-sm font-medium sm:inline ${i <= currentIdx ? 'text-golf-700' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-3 h-0.5 flex-1 ${i < currentIdx ? 'bg-golf-700' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Step 1: Basics */}
      {step === 'basics' && (
        <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900">Plan your trip</h2>
            <p className="text-sm text-gray-500">The exciting stuff first — where are you headed?</p>
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Trip Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., "2026 Scottsdale"'
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder='e.g., "Scottsdale, Arizona"'
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
          </div>

          <div>
            <label htmlFor="tripDate" className="mb-1 block text-sm font-medium text-gray-700">
              Trip Date
            </label>
            <input
              id="tripDate"
              type="date"
              value={tripDate}
              onChange={(e) => {
                setTripDate(e.target.value)
                if (e.target.value) setYear(new Date(e.target.value).getFullYear())
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
            <p className="mt-1 text-xs text-gray-400">Sets the trip year. Add individual round dates after creating.</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => goToStep('invite')}
              className="rounded-md bg-golf-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-golf-800"
            >
              Next: Invite Your Crew
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Invite */}
      {step === 'invite' && (
        <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900">Invite your crew</h2>
            <p className="text-sm text-gray-500">Add players now or later — you can always invite more from the trip page.</p>
          </div>

          {/* Group Members */}
          {groupMembers.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Group Members</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMembers(new Set(groupMembers.map(m => m.user_id)))}
                    className="text-xs font-medium text-golf-700 hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMembers(new Set())}
                    className="text-xs font-medium text-gray-500 hover:underline"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {groupMembers.map(member => (
                  <label
                    key={member.user_id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(member.user_id)}
                      onChange={() => toggleMember(member.user_id)}
                      className="h-4 w-4 rounded border-gray-300 text-golf-600 focus:ring-golf-500"
                    />
                    <div className="flex items-center gap-2">
                      {member.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={member.avatar_url} alt="" className="h-7 w-7 rounded-full" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-golf-100 text-xs font-bold text-golf-800">
                          {(member.display_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {member.display_name || 'Unknown'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Search Users</h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => searchProfiles(e.target.value)}
              placeholder="Search by name..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
            {searchingProfiles && <p className="mt-1 text-xs text-gray-400">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {searchResults.map(r => (
                  <button
                    key={r.user_id}
                    type="button"
                    onClick={() => addProfile(r)}
                    className="flex w-full items-center gap-3 rounded-md border border-gray-200 p-2 text-left hover:bg-golf-50"
                  >
                    {r.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={r.avatar_url} alt="" className="h-7 w-7 rounded-full" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-golf-100 text-xs font-bold text-golf-800">
                        {(r.display_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900">{r.display_name || r.email}</span>
                    <span className="ml-auto text-xs font-medium text-golf-700">Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Added profiles chips */}
          {addedProfiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {addedProfiles.map(p => (
                <span key={p.user_id} className="inline-flex items-center gap-1 rounded-full bg-golf-100 px-3 py-1 text-xs font-medium text-golf-800">
                  {p.display_name || p.email}
                  <button type="button" onClick={() => removeProfile(p.user_id)} className="ml-1 text-golf-600 hover:text-golf-900">&times;</button>
                </span>
              ))}
            </div>
          )}

          {/* Email invites */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Invite by Email</h3>
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="Enter email addresses, comma or newline separated"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep('basics')}
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => goToStep('settings')}
              className="rounded-md bg-golf-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-golf-800"
            >
              Next: Games & Money
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 'settings' && (
        <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900">Games & Money</h2>
            <p className="text-sm text-gray-500">Set the stakes — you can always change these later.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="matchBuyIn" className="mb-1 block text-sm font-medium text-gray-700">
                Match Buy-in ($)
              </label>
              <input
                id="matchBuyIn"
                type="number"
                value={matchBuyIn}
                onChange={(e) => setMatchBuyIn(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
            <div>
              <label htmlFor="skinsBuyIn" className="mb-1 block text-sm font-medium text-gray-700">
                Skins Buy-in ($)
              </label>
              <input
                id="skinsBuyIn"
                type="number"
                value={skinsBuyIn}
                onChange={(e) => setSkinsBuyIn(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="skinsMode" className="mb-1 block text-sm font-medium text-gray-700">
              Skins Mode
            </label>
            <select
              id="skinsMode"
              value={skinsMode}
              onChange={(e) => setSkinsMode(e.target.value as 'gross' | 'net' | 'both')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            >
              <option value="gross">Gross</option>
              <option value="net">Net</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep('invite')}
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-md bg-golf-700 px-8 py-2.5 text-sm font-bold text-white hover:bg-golf-800 disabled:opacity-50"
            >
              {submitting ? 'Creating Trip...' : 'Create Trip'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
