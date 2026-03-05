import { tool } from 'ai'
import { z } from 'zod'
import { SupabaseClient } from '@supabase/supabase-js'
import { calculateLeaderboard, calculateTeamStandings } from './leaderboard'
import type { TripRole } from './types'

export function buildAssistantTools(tripId: string, supabase: SupabaseClient, userRole: TripRole = 'player') {
  // Helper: resolve player names to trip_player_ids
  async function resolvePlayerNames(names: string[]): Promise<{ id: string; name: string }[]> {
    const { data: tripPlayers } = await supabase
      .from('trip_players')
      .select('id, player:players(name)')
      .eq('trip_id', tripId)

    return names.map((name) => {
      const found = (tripPlayers ?? []).find(
        (tp: any) => tp.player?.name?.toLowerCase() === name.toLowerCase()
      )
      return found ? { id: found.id, name: (found as any).player?.name } : { id: '', name }
    })
  }

  const readTools = {
    get_trip_info: tool({
      description: 'Get trip details including name, year, location, status, and buy-in amounts',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: trip } = await supabase
          .from('trips')
          .select('name, year, location, status, match_buy_in, skins_buy_in, skins_mode')
          .eq('id', tripId)
          .single()
        return trip ?? { error: 'Trip not found' }
      },
    }),

    get_players: tool({
      description: 'Get all players on this trip with their display names and handicaps',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: tripPlayers } = await supabase
          .from('trip_players')
          .select('id, player:players(id, name, handicap_index, user_id)')
          .eq('trip_id', tripId)

        const userIds = (tripPlayers ?? [])
          .map((tp: any) => tp.player?.user_id)
          .filter(Boolean)

        let profiles: any[] = []
        if (userIds.length > 0) {
          const { data } = await supabase
            .from('player_profiles')
            .select('user_id, display_name')
            .in('user_id', userIds)
          profiles = data ?? []
        }

        const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.display_name]))

        return (tripPlayers ?? []).map((tp: any) => ({
          tripPlayerId: tp.id,
          name: profileMap.get(tp.player?.user_id) || tp.player?.name,
          handicap: tp.player?.handicap_index,
        }))
      },
    }),

    get_schedule: tool({
      description: 'Get the course schedule with round numbers, dates, and par',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, name, round_number, round_date, par, slope, rating')
          .eq('trip_id', tripId)
          .order('round_number')
        return courses ?? []
      },
    }),

    get_teams: tool({
      description: 'Get team names and their player rosters',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: teams } = await supabase
          .from('teams')
          .select(`
            id, name,
            team_players(
              trip_player:trip_players(
                id, player:players(name)
              )
            )
          `)
          .eq('trip_id', tripId)

        return (teams ?? []).map((t: any) => ({
          team: t.name,
          players: (t.team_players ?? [])
            .map((tp: any) => tp.trip_player?.player?.name)
            .filter(Boolean),
        }))
      },
    }),

    get_standings: tool({
      description: 'Get current leaderboard standings (gross, net, and match play)',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: tripPlayers } = await supabase
          .from('trip_players')
          .select('id, trip_id, player_id, paid, player:players(id, name, handicap_index, user_id)')
          .eq('trip_id', tripId)

        const { data: courses } = await supabase
          .from('courses')
          .select('id, trip_id, name, slope, rating, par, round_number, round_date, holes(id, course_id, hole_number, par, handicap_index)')
          .eq('trip_id', tripId)
          .order('round_number')

        const courseIds = (courses ?? []).map((c: any) => c.id)

        const { data: matches } = courseIds.length > 0
          ? await supabase
              .from('matches')
              .select('id, course_id, format, point_value, scorer_email, scorer_token, status, result, winner_side, match_players(id, match_id, trip_player_id, side)')
              .in('course_id', courseIds)
          : { data: [] }

        const matchIds = (matches ?? []).map((m: any) => m.id)

        const { data: scores } = matchIds.length > 0
          ? await supabase.from('scores').select('*').in('match_id', matchIds)
          : { data: [] }

        const { data: courseHandicaps } = courseIds.length > 0
          ? await supabase.from('player_course_handicaps').select('*').in('course_id', courseIds)
          : { data: [] }

        const { data: teams } = await supabase
          .from('teams')
          .select(`
            id, name,
            team_players(
              trip_player:trip_players(id, trip_id, player_id, paid, player:players(id, name, handicap_index, user_id))
            )
          `)
          .eq('trip_id', tripId)

        const leaderboard = calculateLeaderboard({
          tripPlayers: (tripPlayers as any) ?? [],
          courses: (courses as any) ?? [],
          scores: (scores as any) ?? [],
          courseHandicaps: (courseHandicaps as any) ?? [],
          matches: (matches as any) ?? [],
        })

        let teamStandings: any[] = []
        if ((teams ?? []).length > 0) {
          const shapedTeams = (teams ?? []).map((t: any) => ({
            id: t.id,
            name: t.name,
            players: (t.team_players ?? [])
              .map((tp: any) => tp.trip_player)
              .filter(Boolean),
          }))
          teamStandings = calculateTeamStandings({
            teams: shapedTeams,
            matches: (matches as any) ?? [],
            courses: (courses as any) ?? [],
            scores: (scores as any) ?? [],
            courseHandicaps: (courseHandicaps as any) ?? [],
          })
        }

        return {
          gross: leaderboard.grossStandings.slice(0, 10).map((p, i) => ({
            rank: i + 1,
            player: p.playerName,
            gross: p.totalGross,
            toPar: p.totalGross - p.totalPar,
            rounds: p.roundScores.length,
          })),
          net: leaderboard.netStandings.slice(0, 10).map((p, i) => ({
            rank: i + 1,
            player: p.playerName,
            net: p.totalNet,
            toPar: p.totalNet - p.totalPar,
            rounds: p.roundScores.length,
          })),
          matchPlay: leaderboard.matchPlayRecords.map((r) => ({
            player: r.playerName,
            record: `${r.wins}-${r.losses}-${r.ties}`,
            points: r.points,
          })),
          teams: teamStandings.map((t, i) => ({
            rank: i + 1,
            team: t.teamName,
            points: t.points,
            record: `${t.wins}-${t.losses}-${t.ties}`,
          })),
        }
      },
    }),

    get_matches: tool({
      description: 'Get match results with players and scores. Optionally filter by round number.',
      inputSchema: z.object({
        round_number: z.number().optional().describe('Filter to a specific round number'),
      }),
      execute: async ({ round_number }: { round_number?: number }) => {
        let courseQuery = supabase
          .from('courses')
          .select('id, name, round_number')
          .eq('trip_id', tripId)

        if (round_number !== undefined) {
          courseQuery = courseQuery.eq('round_number', round_number)
        }

        const { data: courses } = await courseQuery.order('round_number')
        const courseIds = (courses ?? []).map((c: any) => c.id)

        if (courseIds.length === 0) return []

        const { data: matches } = await supabase
          .from('matches')
          .select(`
            id, course_id, format, point_value, status, result, winner_side,
            match_players(trip_player_id, side, trip_player:trip_players(player:players(name)))
          `)
          .in('course_id', courseIds)

        const courseMap = new Map((courses ?? []).map((c: any) => [c.id, c]))

        return (matches ?? []).map((m: any) => {
          const course = courseMap.get(m.course_id)
          const teamA = (m.match_players ?? [])
            .filter((mp: any) => mp.side === 'team_a')
            .map((mp: any) => mp.trip_player?.player?.name)
            .filter(Boolean)
          const teamB = (m.match_players ?? [])
            .filter((mp: any) => mp.side === 'team_b')
            .map((mp: any) => mp.trip_player?.player?.name)
            .filter(Boolean)

          return {
            round: course?.round_number,
            course: course?.name,
            format: m.format,
            teamA,
            teamB,
            status: m.status,
            result: m.result,
            winnerSide: m.winner_side,
          }
        })
      },
    }),

    get_games: tool({
      description: 'Get round games (side games/betting games) with format details, buy-ins, and players. Optionally filter by round number.',
      inputSchema: z.object({
        round_number: z.number().optional().describe('Filter to a specific round number'),
      }),
      execute: async ({ round_number }: { round_number?: number }) => {
        let courseQuery = supabase
          .from('courses')
          .select('id, name, round_number')
          .eq('trip_id', tripId)

        if (round_number !== undefined) {
          courseQuery = courseQuery.eq('round_number', round_number)
        }

        const { data: courses } = await courseQuery.order('round_number')
        const courseIds = (courses ?? []).map((c: any) => c.id)

        if (courseIds.length === 0) return []

        const { data: roundGames } = await supabase
          .from('round_games')
          .select(`
            id, course_id, buy_in, status,
            game_format:game_formats(name, icon, description, rules_summary, scoring_type, scope, team_based),
            round_game_players(trip_player:trip_players(player:players(name)))
          `)
          .in('course_id', courseIds)
          .neq('status', 'cancelled')

        const courseMap = new Map((courses ?? []).map((c: any) => [c.id, c]))

        return (roundGames ?? []).map((g: any) => {
          const course = courseMap.get(g.course_id)
          return {
            round: course?.round_number,
            course: course?.name,
            game: g.game_format?.name,
            description: g.game_format?.description,
            buyIn: g.buy_in,
            status: g.status,
            players: (g.round_game_players ?? [])
              .map((rgp: any) => rgp.trip_player?.player?.name)
              .filter(Boolean),
          }
        })
      },
    }),

    get_game_rules: tool({
      description: 'Look up game format rules and description by name (e.g., Nassau, Wolf, Skins)',
      inputSchema: z.object({
        name: z.string().describe('Game format name to search for'),
      }),
      execute: async ({ name }: { name: string }) => {
        const { data: formats } = await supabase
          .from('game_formats')
          .select('name, description, rules_summary, scoring_type, scope, team_based, min_players, max_players')
          .ilike('name', `%${name}%`)
          .limit(3)

        if (!formats || formats.length === 0) {
          return { error: `No game format found matching "${name}"` }
        }
        return formats
      },
    }),

    get_weather: tool({
      description: 'Get current weather and 3-day forecast for the trip location',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: trip } = await supabase
          .from('trips')
          .select('location')
          .eq('id', tripId)
          .single()

        if (!trip?.location) {
          return { error: 'No trip location set' }
        }

        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trip.location)}&count=1`
        )
        const geoData = await geoRes.json()

        if (!geoData.results?.length) {
          return { error: `Could not geocode location: ${trip.location}` }
        }

        const { latitude, longitude, name: placeName } = geoData.results[0]

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=3&timezone=auto`
        )
        const weather = await weatherRes.json()

        const weatherCodes: Record<number, string> = {
          0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
          45: 'Foggy', 48: 'Depositing rime fog',
          51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
          61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
          71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
          80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
          95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
        }

        return {
          location: placeName,
          current: {
            temperature: `${weather.current?.temperature_2m}°F`,
            feelsLike: `${weather.current?.apparent_temperature}°F`,
            wind: `${weather.current?.wind_speed_10m} mph`,
            condition: weatherCodes[weather.current?.weather_code] ?? 'Unknown',
          },
          forecast: (weather.daily?.time ?? []).map((date: string, i: number) => ({
            date,
            high: `${weather.daily.temperature_2m_max[i]}°F`,
            low: `${weather.daily.temperature_2m_min[i]}°F`,
            precipChance: `${weather.daily.precipitation_probability_max[i]}%`,
            wind: `${weather.daily.wind_speed_10m_max[i]} mph`,
            condition: weatherCodes[weather.daily.weather_code[i]] ?? 'Unknown',
          })),
        }
      },
    }),
  }

  // Write tools — only available to owners and admins
  const writeTools = (userRole === 'owner' || userRole === 'admin') ? {
    create_game: tool({
      description: 'Create a side game on a round. Call with confirmed=false first to preview, then confirmed=true after user confirms.',
      inputSchema: z.object({
        course_id: z.string().describe('The course/round ID'),
        game_format_name: z.string().describe('Game format name (e.g. Skins, Nassau, Wolf)'),
        buy_in: z.number().default(0).describe('Buy-in amount in dollars'),
        player_names: z.array(z.string()).describe('Array of player names to include'),
        confirmed: z.boolean().default(false).describe('Set to false for preview, true to execute'),
      }),
      execute: async ({ course_id, game_format_name, buy_in, player_names, confirmed }) => {
        // Look up the game format
        const { data: formats } = await supabase
          .from('game_formats')
          .select('id, name, min_players, max_players')
          .ilike('name', `%${game_format_name}%`)
          .limit(1)

        if (!formats || formats.length === 0) {
          return { error: `No game format found matching "${game_format_name}"` }
        }
        const format = formats[0]

        // Resolve player names
        const resolved = await resolvePlayerNames(player_names)
        const missing = resolved.filter((r) => !r.id)
        if (missing.length > 0) {
          return { error: `Could not find players: ${missing.map((m) => m.name).join(', ')}` }
        }

        // Validate player count
        if (format.min_players && resolved.length < format.min_players) {
          return { error: `${format.name} requires at least ${format.min_players} players` }
        }
        if (format.max_players && resolved.length > format.max_players) {
          return { error: `${format.name} allows at most ${format.max_players} players` }
        }

        if (!confirmed) {
          return {
            preview: true,
            message: `Ready to create a **${format.name}** game with $${buy_in} buy-in.\nPlayers: ${resolved.map((r) => r.name).join(', ')}.\n\nSay **yes** to confirm.`,
          }
        }

        // Create the game
        const { data: roundGame, error: gameError } = await supabase
          .from('round_games')
          .insert({
            course_id,
            trip_id: tripId,
            game_format_id: format.id,
            buy_in,
            status: 'setup',
          })
          .select('id')
          .single()

        if (gameError || !roundGame) {
          return { error: `Failed to create game: ${gameError?.message}` }
        }

        // Add players
        const playerInserts = resolved.map((r) => ({
          round_game_id: roundGame.id,
          trip_player_id: r.id,
        }))

        const { error: playersError } = await supabase
          .from('round_game_players')
          .insert(playerInserts)

        if (playersError) {
          return { error: `Game created but failed to add players: ${playersError.message}` }
        }

        return { success: true, message: `${format.name} game created with ${resolved.length} players and $${buy_in} buy-in.` }
      },
    }),

    create_match: tool({
      description: 'Create a match between players/teams. Call with confirmed=false first to preview, then confirmed=true after user confirms.',
      inputSchema: z.object({
        course_id: z.string().describe('The course/round ID'),
        format: z.enum(['1v1_stroke', '2v2_best_ball', '1v1_match', '2v2_alternate_shot']).describe('Match format'),
        team_a_names: z.array(z.string()).describe('Player names for Team A'),
        team_b_names: z.array(z.string()).describe('Player names for Team B'),
        point_value: z.number().default(1).describe('Point value for the match'),
        confirmed: z.boolean().default(false).describe('Set to false for preview, true to execute'),
      }),
      execute: async ({ course_id, format, team_a_names, team_b_names, point_value, confirmed }) => {
        const resolvedA = await resolvePlayerNames(team_a_names)
        const resolvedB = await resolvePlayerNames(team_b_names)
        const missingA = resolvedA.filter((r) => !r.id)
        const missingB = resolvedB.filter((r) => !r.id)
        if (missingA.length > 0 || missingB.length > 0) {
          const allMissing = [...missingA, ...missingB]
          return { error: `Could not find players: ${allMissing.map((m) => m.name).join(', ')}` }
        }

        const formatLabel = format.replace(/_/g, ' ')

        if (!confirmed) {
          return {
            preview: true,
            message: `Ready to create a **${formatLabel}** match:\n- **Team A:** ${resolvedA.map((r) => r.name).join(', ')}\n- **Team B:** ${resolvedB.map((r) => r.name).join(', ')}\n- Point value: ${point_value}\n\nSay **yes** to confirm.`,
          }
        }

        // Create match
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            course_id,
            format,
            point_value,
          })
          .select('id')
          .single()

        if (matchError || !match) {
          return { error: `Failed to create match: ${matchError?.message}` }
        }

        // Add players
        const matchPlayers = [
          ...resolvedA.map((r) => ({ match_id: match.id, trip_player_id: r.id, side: 'team_a' as const })),
          ...resolvedB.map((r) => ({ match_id: match.id, trip_player_id: r.id, side: 'team_b' as const })),
        ]

        const { error: playersError } = await supabase
          .from('match_players')
          .insert(matchPlayers)

        if (playersError) {
          // Clean up the match if players failed
          await supabase.from('matches').delete().eq('id', match.id)
          return { error: `Failed to add players to match: ${playersError.message}` }
        }

        return { success: true, message: `${formatLabel} match created: ${resolvedA.map((r) => r.name).join(' & ')} vs ${resolvedB.map((r) => r.name).join(' & ')}` }
      },
    }),

    add_player_to_team: tool({
      description: 'Add a player to a team. Call with confirmed=false first to preview, then confirmed=true after user confirms.',
      inputSchema: z.object({
        team_name: z.string().describe('Team name to add the player to'),
        player_name: z.string().describe('Player name to add'),
        confirmed: z.boolean().default(false).describe('Set to false for preview, true to execute'),
      }),
      execute: async ({ team_name, player_name, confirmed }) => {
        // Look up the team
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name')
          .eq('trip_id', tripId)
          .ilike('name', team_name)
          .limit(1)

        if (!teams || teams.length === 0) {
          return { error: `No team found matching "${team_name}"` }
        }
        const team = teams[0]

        // Resolve player
        const resolved = await resolvePlayerNames([player_name])
        if (!resolved[0].id) {
          return { error: `Could not find player: ${player_name}` }
        }

        // Check for duplicate
        const { data: existing } = await supabase
          .from('team_players')
          .select('id')
          .eq('team_id', team.id)
          .eq('trip_player_id', resolved[0].id)
          .limit(1)

        if (existing && existing.length > 0) {
          return { error: `${resolved[0].name} is already on team ${team.name}` }
        }

        if (!confirmed) {
          return {
            preview: true,
            message: `Ready to add **${resolved[0].name}** to team **${team.name}**.\n\nSay **yes** to confirm.`,
          }
        }

        const { error: insertError } = await supabase
          .from('team_players')
          .insert({
            team_id: team.id,
            trip_player_id: resolved[0].id,
          })

        if (insertError) {
          return { error: `Failed to add player: ${insertError.message}` }
        }

        return { success: true, message: `${resolved[0].name} added to team ${team.name}.` }
      },
    }),
  } : {} as Record<string, never>

  return { ...readTools, ...writeTools }
}
