'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type TripWithRole = {
  id: string
  name: string
  location: string | null
  year: number
  status: string
  role: string
  group_id: string | null
}

type GroupWithRole = {
  id: string
  name: string
  description: string | null
  role: string
}

type GroupMemberInfo = {
  user_id: string
  role: string
  display_name: string | null
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    setup: 'bg-yellow-100 text-yellow-800',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function TripCard({ trip }: { trip: TripWithRole }) {
  const isManager = trip.role === 'owner' || trip.role === 'admin'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{trip.name}</h4>
          {trip.location && <p className="text-sm text-gray-600">{trip.location}</p>}
          <p className="text-sm text-gray-400">{trip.year}</p>
        </div>
        <StatusBadge status={trip.status} />
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/trip/${trip.id}`}
          className="rounded-md bg-golf-700 px-3 py-1 text-xs font-medium text-white hover:bg-golf-800"
        >
          View Trip
        </Link>
        {isManager && (
          <Link
            href={`/admin/trips/${trip.id}`}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage
          </Link>
        )}
      </div>
    </div>
  )
}

function CreateGroupForm({ onCreated }: { onCreated: (group: GroupWithRole) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!name.trim()) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create group. Please try again.')
        return
      }

      onCreated({ ...data, role: 'owner' })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
      <h3 className="mb-3 font-semibold text-gray-900">Create a Group</h3>
      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Group name (e.g., Hill Cousins)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </div>
  )
}

export default function GroupsSection({
  groups: initialGroups,
  trips,
  groupMembersMap,
  userId,
}: {
  groups: GroupWithRole[]
  trips: TripWithRole[]
  groupMembersMap: Record<string, GroupMemberInfo[]>
  userId: string
}) {
  const router = useRouter()
  const [groups, setGroups] = useState(initialGroups)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const ungroupedTrips = trips.filter(t => !t.group_id)
  const tripsByGroup = (groupId: string) => trips.filter(t => t.group_id === groupId)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Groups</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md bg-golf-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-golf-800"
        >
          {showCreateForm ? 'Cancel' : 'New Group'}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6">
          <CreateGroupForm
            onCreated={(group) => {
              router.push(`/admin/groups/${group.id}`)
            }}
          />
        </div>
      )}

      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map(group => {
            const groupTrips = tripsByGroup(group.id)
            const members = groupMembersMap[group.id] || []

            return (
              <div key={group.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <Link href={`/admin/groups/${group.id}`} className="text-lg font-semibold text-gray-900 hover:text-golf-700">
                      {group.name}
                    </Link>
                    {group.description && (
                      <p className="text-sm text-gray-500">{group.description}</p>
                    )}
                  </div>
                  <Link
                    href={`/admin/groups/${group.id}`}
                    className="inline-block rounded-full bg-golf-100 px-2.5 py-0.5 text-xs font-medium text-golf-800 hover:bg-golf-200"
                  >
                    Manage
                  </Link>
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {members.map(member => (
                    <span
                      key={member.user_id}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        member.user_id === userId
                          ? 'bg-golf-100 font-medium text-golf-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.display_name || 'Unknown'}
                    </span>
                  ))}
                </div>

                {groupTrips.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupTrips.map(trip => (
                      <TripCard key={trip.id} trip={trip} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No trips linked to this group yet.</p>
                )}
              </div>
            )
          })}
        </div>
      ) : !showCreateForm ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-500">No groups yet. Create one to organize your golf buddies.</p>
        </div>
      ) : null}

      {/* Ungrouped trips */}
      {ungroupedTrips.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            {groups.length > 0 ? 'Other Trips' : 'Your Trips'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ungroupedTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
