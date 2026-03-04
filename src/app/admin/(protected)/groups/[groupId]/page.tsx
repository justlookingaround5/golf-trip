'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Member = {
  id: string
  user_id: string
  role: string
  display_name: string | null
  avatar_url: string | null
}

type Group = {
  id: string
  name: string
  description: string | null
  created_by: string | null
}

type SearchResult = {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
}

type Trip = {
  id: string
  name: string
  year: number
  status: string
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: groupData } = await supabase
        .from('groups')
        .select('id, name, description, created_by')
        .eq('id', groupId)
        .single()

      if (!groupData) {
        setLoading(false)
        return
      }
      setGroup(groupData)

      // Get members with profiles
      const { data: memberData } = await supabase
        .from('group_members')
        .select('id, user_id, role')
        .eq('group_id', groupId)

      const memberUserIds = (memberData || []).map(m => m.user_id)
      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>()

      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('player_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', memberUserIds)
        for (const p of profiles || []) {
          profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url })
        }
      }

      const enrichedMembers = (memberData || []).map(m => ({
        ...m,
        display_name: profileMap.get(m.user_id)?.display_name || null,
        avatar_url: profileMap.get(m.user_id)?.avatar_url || null,
      }))
      setMembers(enrichedMembers)

      const myMembership = enrichedMembers.find(m => m.user_id === user.id)
      setIsOwner(myMembership?.role === 'owner' || myMembership?.role === 'admin')

      // Get trips linked to this group
      const { data: tripData } = await supabase
        .from('trips')
        .select('id, name, year, status')
        .eq('group_id', groupId)
        .order('year', { ascending: false })

      setTrips(tripData || [])
      setLoading(false)
    }
    load()
  }, [groupId, supabase])

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (value.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(value.trim())}`)
        if (res.ok) {
          const data: SearchResult[] = await res.json()
          // Exclude existing members
          const existingIds = new Set(members.map(m => m.user_id))
          const filtered = data.filter(r => !existingIds.has(r.user_id) && r.user_id !== currentUserId)
          setSearchResults(filtered)
          setShowResults(filtered.length > 0)
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }

  async function handleAddMember(result: SearchResult) {
    setAddingUserId(result.user_id)
    setMessage(null)

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: result.user_id, role: 'member' })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMembers([...members, {
        id: crypto.randomUUID(),
        user_id: result.user_id,
        role: 'member',
        display_name: result.display_name,
        avatar_url: result.avatar_url,
      }])
      setMessage({ type: 'success', text: `${result.display_name || 'Member'} added to group` })
      setSearchQuery('')
      setSearchResults([])
      setShowResults(false)
    }
    setAddingUserId(null)
  }

  async function handleRemoveMember(member: Member) {
    if (member.user_id === currentUserId) return
    setMessage(null)

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMembers(members.filter(m => m.user_id !== member.user_id))
      setMessage({ type: 'success', text: `${member.display_name || 'Member'} removed` })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">Loading group...</div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900">Group not found</h2>
        <Link href="/home" className="mt-4 inline-block text-sm text-golf-700 hover:underline">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/home" className="text-sm text-golf-700 hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{group.name}</h2>
          {group.description && (
            <p className="mt-1 text-sm text-gray-500">{group.description}</p>
          )}
        </div>
        <span className="rounded-full bg-golf-100 px-3 py-1 text-xs font-medium text-golf-800">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {message && (
        <div className={`mb-4 rounded-md p-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Add Members */}
      {isOwner && (
        <div ref={searchContainerRef} className="relative mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Add Members
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowResults(true) }}
            placeholder="Search by name..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
          />
          {searchLoading && (
            <div className="absolute right-3 top-8 text-xs text-gray-400">Searching...</div>
          )}

          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
              <ul className="max-h-60 overflow-auto py-1">
                {searchResults.map(result => (
                  <li key={result.user_id}>
                    <button
                      type="button"
                      disabled={addingUserId === result.user_id}
                      onClick={() => handleAddMember(result)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-golf-50 disabled:opacity-50"
                    >
                      {result.avatar_url ? (
                        <Image src={result.avatar_url} alt="" width={28} height={28} className="rounded-full" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-golf-100 text-xs font-bold text-golf-800">
                          {(result.display_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{result.display_name || 'Unknown'}</span>
                        {result.email && <span className="ml-2 text-gray-400">{result.email}</span>}
                      </div>
                      <span className="text-xs font-medium text-golf-700">
                        {addingUserId === result.user_id ? 'Adding...' : 'Add'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Members</h3>
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {members.map(member => (
            <div key={member.user_id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {member.avatar_url ? (
                  <Image src={member.avatar_url} alt="" width={32} height={32} className="rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-golf-100 text-xs font-bold text-golf-800">
                    {(member.display_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {member.display_name || 'Unknown'}
                    {member.user_id === currentUserId && (
                      <span className="ml-1 text-gray-400">(you)</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  member.role === 'owner' ? 'bg-golf-100 text-golf-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {member.role}
                </span>
                {isOwner && member.user_id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(member)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Trip for Group */}
      {isOwner && (
        <div className="mb-8 rounded-lg border border-dashed border-golf-300 bg-golf-50 p-5">
          <h3 className="mb-2 font-semibold text-gray-900">Start a New Trip</h3>
          <p className="mb-3 text-sm text-gray-600">
            Create a trip for this group — all members will be pre-selected to invite.
          </p>
          <Link
            href={`/admin/trips/new?group_id=${groupId}`}
            className="inline-block rounded-md bg-golf-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-golf-800"
          >
            Create Trip for {group.name}
          </Link>
        </div>
      )}

      {/* Linked Trips */}
      {trips.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Trips</h3>
          <div className="space-y-2">
            {trips.map(trip => (
              <Link
                key={trip.id}
                href={`/trip/${trip.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:shadow-sm"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{trip.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{trip.year}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  trip.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {trip.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
