import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}
const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

interface TripInfo {
  name: string
  year: number
  location: string | null
}

export async function sendTripInviteEmail({
  to,
  playerName,
  trip,
  token,
  invitedByName,
}: {
  to: string
  playerName: string
  trip: TripInfo
  token: string
  invitedByName?: string
}) {
  const joinUrl = `${appUrl}/join/${token}`
  const invitedBy = invitedByName ? ` by ${invitedByName}` : ''

  await getResend().emails.send({
    from: 'ForeLive <noreply@golf.dynavestcapital.com>',
    to,
    subject: `You're invited to ${trip.name}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1e4080;">You're Invited!</h2>
        <p>Hey ${playerName},</p>
        <p>You've been invited${invitedBy} to join <strong>${trip.name}</strong>${trip.location ? ` in ${trip.location}` : ''} (${trip.year}).</p>
        <p>
          <a href="${joinUrl}" style="display: inline-block; background: #1e4080; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Join This Trip
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Or copy this link: ${joinUrl}</p>
      </div>
    `,
  })
}

export async function sendTripAddedEmail({
  to,
  playerName,
  trip,
}: {
  to: string
  playerName: string
  trip: TripInfo
}) {
  const dashboardUrl = `${appUrl}/admin`

  await getResend().emails.send({
    from: 'ForeLive <noreply@golf.dynavestcapital.com>',
    to,
    subject: `You've been added to ${trip.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1e4080;">You're In!</h2>
        <p>Hey ${playerName},</p>
        <p>You've been added to <strong>${trip.name}</strong>${trip.location ? ` in ${trip.location}` : ''} (${trip.year}).</p>
        <p>
          <a href="${dashboardUrl}" style="display: inline-block; background: #1e4080; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            View Your Dashboard
          </a>
        </p>
      </div>
    `,
  })
}

// NEW: Sent when a user is added to a group
export async function sendGroupInviteEmail({
  to,
  displayName,
  groupName,
  groupId,
  invitedByName,
}: {
  to: string
  displayName: string
  groupName: string
  groupId: string
  invitedByName?: string
}) {
  const groupUrl = `${appUrl}/home`
  const invitedBy = invitedByName ? ` by ${invitedByName}` : ''

  await getResend().emails.send({
    from: 'ForeLive <noreply@golf.dynavestcapital.com>',
    to,
    subject: `You've been added to the ${groupName} group on ForeLive`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1e4080;">You've been added to a group!</h2>
        <p>Hey ${displayName},</p>
        <p>You've been added${invitedBy} to the <strong>${groupName}</strong> group on ForeLive. You'll now see shared trips and activity from this group.</p>
        <p>
          <a href="${groupUrl}" style="display: inline-block; background: #1e4080; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Go to ForeLive
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">If you weren't expecting this, you can ignore this email or contact the person who added you.</p>
      </div>
    `,
  })
}
