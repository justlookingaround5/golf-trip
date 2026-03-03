export interface GhinLookupResult {
  handicap_index: number | null
  home_club: string | null
  player_name: string | null
}

export async function lookupGhin(
  ghinNumber: string,
  email: string,
  password: string
): Promise<GhinLookupResult | null> {
  try {
    // Authenticate with GHIN API using the user's own credentials
    const authResponse = await fetch('https://api.ghin.com/api/v1/golfer_login.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: { email_or_ghin: email, password },
      }),
    })

    if (!authResponse.ok) return null

    const authData = await authResponse.json()
    const token = authData?.golfer_user?.golfer_user_token

    if (!token) return null

    // Look up golfer by GHIN number
    const lookupResponse = await fetch(
      `https://api.ghin.com/api/v1/golfers.json?golfer_id=${encodeURIComponent(ghinNumber)}&from_golfer=true`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!lookupResponse.ok) return null

    const lookupData = await lookupResponse.json()
    const golfer = lookupData?.golfers?.[0]

    if (!golfer) return null

    return {
      handicap_index: golfer.handicap_index != null ? parseFloat(golfer.handicap_index) : null,
      home_club: golfer.club_name || null,
      player_name: [golfer.first_name, golfer.last_name].filter(Boolean).join(' ') || null,
    }
  } catch {
    return null
  }
}
