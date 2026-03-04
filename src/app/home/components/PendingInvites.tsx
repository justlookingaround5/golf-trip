import Link from 'next/link'

type Invite = {
  id: string
  token: string
  trip_name: string
}

export default function PendingInvites({ invites }: { invites: Invite[] }) {
  if (invites.length === 0) return null

  return (
    <div className="rounded-lg border border-gold bg-gold-light/30 p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-golf-800">
        You have {invites.length} pending invite{invites.length > 1 ? 's' : ''}
      </h3>
      <div className="space-y-2">
        {invites.map(invite => (
          <div key={invite.id} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{invite.trip_name}</span>
            <Link
              href={`/join/${invite.token}`}
              className="rounded-md bg-golf-700 px-3 py-1 text-xs font-medium text-white hover:bg-golf-800"
            >
              View Invite
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
