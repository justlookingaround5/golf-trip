# Stats Tracking & Trip Leaderboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add persistent stats tracking toggle to live scoring, compute round/trip stats, display stats on scorecard, and build a trip leaderboard page.

**Architecture:** The DB schema already has `fairway_hit`, `gir`, `putts` columns on `round_scores`, plus `round_stats`, `trip_stats`, and `trip_awards` tables (all empty). The stats UI exists but is hidden behind a per-hole button. We'll surface a persistent toggle in the scoring header, compute stats server-side after score saves, and build a trip leaderboard page that aggregates across rounds.

**Tech Stack:** Next.js 16 App Router, Supabase (postgres), TypeScript, React

---

### Task 1: Persistent Stats Toggle in Scoring Header

**Context:** Currently `PlayerScoreInput.tsx` has a per-hole `showStats` local state toggled by a tiny "+ Stats" button. We want a single toggle in the live scoring header that persists for the entire round, stored in localStorage.

**Files:**
- Modify: `src/app/trip/[tripId]/live/[courseId]/live-scoring-client.tsx`
- Modify: `src/app/trip/[tripId]/live/[courseId]/components/PlayerScoreInput.tsx`
- Modify: `src/app/trip/[tripId]/live/[courseId]/components/HoleView.tsx`

**Step 1: Add statsEnabled state to live-scoring-client.tsx**

In `live-scoring-client.tsx`, add state near line 108 (after `holeScores` state):

```typescript
const [statsEnabled, setStatsEnabled] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`stats-enabled-${courseId}`) === 'true'
  }
  return false
})

// Persist toggle to localStorage
useEffect(() => {
  localStorage.setItem(`stats-enabled-${courseId}`, String(statsEnabled))
}, [statsEnabled, courseId])
```

**Step 2: Add toggle to the header**

In the header section (around line 653), add a toggle button between the course info and the menu button. Inside the `<div className="flex items-center gap-2">` block, add before the Trip/Home link:

```tsx
<button
  onClick={() => setStatsEnabled(!statsEnabled)}
  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
    statsEnabled
      ? 'bg-golf-500 text-white'
      : 'border border-golf-600 text-golf-300 hover:bg-golf-700'
  }`}
>
  {statsEnabled ? 'Stats ON' : 'Stats'}
</button>
```

**Step 3: Pass statsEnabled to HoleView**

In the `HoleView` component call (around line 713), add prop:

```tsx
statsEnabled={statsEnabled}
```

**Step 4: Update HoleView to accept and pass statsEnabled**

In `HoleView.tsx`, add `statsEnabled?: boolean` to `HoleViewProps` interface. Pass it to `PlayerScoreInput`:

```tsx
<PlayerScoreInput
  // ...existing props
  statsEnabled={statsEnabled}
/>
```

**Step 5: Update PlayerScoreInput to use statsEnabled instead of local toggle**

In `PlayerScoreInput.tsx`:
- Add `statsEnabled?: boolean` to the props interface
- Remove the local `showStats` state and the "+ Stats" / "Hide stats" button
- Replace `{showStats && (` with `{isOwn && statsEnabled && onStatsChange && (`
- Remove the `<button onClick={() => setShowStats(...)}>` toggle entirely

**Step 6: Run dev server and test manually**

Run: `npm run dev`
Verify: Toggle appears in header, persists across hole navigation, stats inputs show/hide correctly.

**Step 7: Commit**

```bash
git add src/app/trip/\[tripId\]/live/\[courseId\]/live-scoring-client.tsx src/app/trip/\[tripId\]/live/\[courseId\]/components/HoleView.tsx src/app/trip/\[tripId\]/live/\[courseId\]/components/PlayerScoreInput.tsx
git commit -m "feat: add persistent stats toggle to live scoring header"
```

---

### Task 2: Compute Round Stats After Score Save

**Context:** The `round_stats` table exists but is never populated. After each score save, we should recompute stats for that player on that course. This runs server-side in the score save API.

**Files:**
- Create: `src/lib/compute-round-stats.ts`
- Modify: `src/app/api/live/[courseId]/scores/route.ts`
- Create: `src/__tests__/compute-round-stats.test.ts`

**Step 1: Write the test**

Create `src/__tests__/compute-round-stats.test.ts`:

```typescript
import { computeRoundStats } from '@/lib/compute-round-stats'

const makeHole = (num: number, par: number) => ({
  id: `hole-${num}`,
  hole_number: num,
  par,
  handicap_index: num,
})

const makeScore = (holeId: string, gross: number, extras?: { fairway_hit?: boolean | null; gir?: boolean | null; putts?: number | null }) => ({
  hole_id: holeId,
  gross_score: gross,
  fairway_hit: extras?.fairway_hit ?? null,
  gir: extras?.gir ?? null,
  putts: extras?.putts ?? null,
})

describe('computeRoundStats', () => {
  const holes = [
    makeHole(1, 4), makeHole(2, 3), makeHole(3, 5), makeHole(4, 4),
    makeHole(5, 4), makeHole(6, 3), makeHole(7, 4), makeHole(8, 5),
    makeHole(9, 4),
  ]

  test('calculates gross total and holes played', () => {
    const scores = [
      makeScore('hole-1', 4), makeScore('hole-2', 3), makeScore('hole-3', 5),
    ]
    const stats = computeRoundStats(scores, holes, 0)
    expect(stats.gross_total).toBe(12)
    expect(stats.holes_played).toBe(3)
  })

  test('counts scoring distribution', () => {
    const scores = [
      makeScore('hole-1', 3), // birdie on par 4
      makeScore('hole-2', 3), // par on par 3
      makeScore('hole-3', 7), // double on par 5
      makeScore('hole-4', 5), // bogey on par 4
    ]
    const stats = computeRoundStats(scores, holes, 0)
    expect(stats.birdies).toBe(1)
    expect(stats.pars).toBe(1)
    expect(stats.bogeys).toBe(1)
    expect(stats.double_bogeys).toBe(1)
  })

  test('counts fairways hit', () => {
    const scores = [
      makeScore('hole-1', 4, { fairway_hit: true }),
      makeScore('hole-2', 3, { fairway_hit: null }), // par 3 - no fairway
      makeScore('hole-3', 5, { fairway_hit: false }),
      makeScore('hole-4', 4, { fairway_hit: true }),
    ]
    const stats = computeRoundStats(scores, holes, 0)
    expect(stats.fairways_hit).toBe(2)
    expect(stats.fairways_total).toBe(3) // excludes par 3
  })

  test('counts GIR and putts', () => {
    const scores = [
      makeScore('hole-1', 4, { gir: true, putts: 2 }),
      makeScore('hole-2', 3, { gir: false, putts: 3 }),
      makeScore('hole-3', 5, { gir: true, putts: 1 }),
    ]
    const stats = computeRoundStats(scores, holes, 0)
    expect(stats.greens_in_regulation).toBe(2)
    expect(stats.total_putts).toBe(6)
    expect(stats.putts_per_hole).toBeCloseTo(2.0)
  })

  test('calculates net total with handicap strokes', () => {
    const scores = [
      makeScore('hole-1', 5), makeScore('hole-2', 4),
    ]
    const stats = computeRoundStats(scores, holes, 10)
    // handicap 10 = 1 stroke on holes with hdcp index 1-10
    // hole 1 hdcp=1 gets a stroke, hole 2 hdcp=2 gets a stroke
    expect(stats.net_total).toBe(5 + 4 - 2) // 7
  })

  test('finds best and worst holes', () => {
    const scores = [
      makeScore('hole-1', 3), // -1 vs par
      makeScore('hole-2', 5), // +2 vs par
      makeScore('hole-3', 5), // even
    ]
    const stats = computeRoundStats(scores, holes, 0)
    expect(stats.best_hole_vs_par).toBe(-1)
    expect(stats.best_hole_number).toBe(1)
    expect(stats.worst_hole_vs_par).toBe(2)
    expect(stats.worst_hole_number).toBe(2)
  })

  test('calculates par-type breakdown', () => {
    const scores = [
      makeScore('hole-1', 5), // par 4
      makeScore('hole-2', 4), // par 3
      makeScore('hole-3', 6), // par 5
      makeScore('hole-4', 4), // par 4
    ]
    const stats = computeRoundStats(scores, holes, 0)
    expect(stats.par3_total).toBe(4)
    expect(stats.par3_count).toBe(1)
    expect(stats.par4_total).toBe(9)
    expect(stats.par4_count).toBe(2)
    expect(stats.par5_total).toBe(6)
    expect(stats.par5_count).toBe(1)
  })

  test('counts bounce backs', () => {
    const scores = [
      makeScore('hole-1', 6), // bogey+ on par 4
      makeScore('hole-2', 3), // par on par 3 = bounce back
      makeScore('hole-3', 7), // bogey+ on par 5
      makeScore('hole-4', 3), // birdie on par 4 = bounce back
      makeScore('hole-5', 4), // par on par 4, not after bogey+
    ]
    const stats = computeRoundStats(scores, holes, 0)
    expect(stats.bounce_backs).toBe(2)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/compute-round-stats.test.ts`
Expected: FAIL with "Cannot find module '@/lib/compute-round-stats'"

**Step 3: Implement computeRoundStats**

Create `src/lib/compute-round-stats.ts`:

```typescript
interface HoleInfo {
  id: string
  hole_number: number
  par: number
  handicap_index: number
}

interface ScoreInfo {
  hole_id: string
  gross_score: number
  fairway_hit?: boolean | null
  gir?: boolean | null
  putts?: number | null
}

export interface RoundStatsResult {
  gross_total: number
  net_total: number
  par_total: number
  holes_played: number
  eagles: number
  birdies: number
  pars: number
  bogeys: number
  double_bogeys: number
  others: number
  par_or_better_streak: number
  bogey_or_better_streak: number
  best_hole_score: number | null
  best_hole_number: number | null
  worst_hole_score: number | null
  worst_hole_number: number | null
  best_hole_vs_par: number | null
  worst_hole_vs_par: number | null
  par3_total: number | null
  par3_count: number
  par4_total: number | null
  par4_count: number
  par5_total: number | null
  par5_count: number
  front_nine_gross: number | null
  front_nine_net: number | null
  back_nine_gross: number | null
  back_nine_net: number | null
  greens_in_regulation: number
  bounce_backs: number
  scoring_average: number | null
  fairways_hit: number
  fairways_total: number
  total_putts: number
  putts_per_hole: number | null
}

export function computeRoundStats(
  scores: ScoreInfo[],
  holes: HoleInfo[],
  handicapStrokes: number
): RoundStatsResult {
  const holeMap = new Map(holes.map(h => [h.id, h]))

  // Build strokes-per-hole map for net calculation
  const strokesPerHole = new Map<number, number>()
  if (handicapStrokes > 0) {
    const sorted = [...holes].sort((a, b) => a.handicap_index - b.handicap_index)
    let remaining = handicapStrokes
    for (const h of sorted) {
      if (remaining <= 0) break
      strokesPerHole.set(h.hole_number, (strokesPerHole.get(h.hole_number) || 0) + 1)
      remaining--
      // If handicap > 18, loop back
      if (remaining > 0 && h === sorted[sorted.length - 1]) {
        remaining = Math.min(remaining, holes.length)
        for (const h2 of sorted) {
          if (remaining <= 0) break
          strokesPerHole.set(h2.hole_number, (strokesPerHole.get(h2.hole_number) || 0) + 1)
          remaining--
        }
      }
    }
  }

  // Sort scores by hole number
  const sortedScores = scores
    .map(s => ({ ...s, hole: holeMap.get(s.hole_id) }))
    .filter(s => s.hole)
    .sort((a, b) => a.hole!.hole_number - b.hole!.hole_number)

  let grossTotal = 0
  let netTotal = 0
  let parTotal = 0
  let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubleBogeys = 0, others = 0
  let parOrBetterStreak = 0, maxParStreak = 0
  let bogeyOrBetterStreak = 0, maxBogeyStreak = 0
  let bestVsPar: number | null = null, worstVsPar: number | null = null
  let bestHoleNum: number | null = null, worstHoleNum: number | null = null
  let bestScore: number | null = null, worstScore: number | null = null
  let par3Total = 0, par3Count = 0
  let par4Total = 0, par4Count = 0
  let par5Total = 0, par5Count = 0
  let frontGross = 0, frontNet = 0, frontCount = 0
  let backGross = 0, backNet = 0, backCount = 0
  let gir = 0
  let bounceBacks = 0
  let fairwaysHit = 0, fairwaysTotal = 0
  let totalPutts = 0, puttsHoles = 0
  let prevWasBogeyPlus = false

  for (const s of sortedScores) {
    const hole = s.hole!
    const gross = s.gross_score
    const strokes = strokesPerHole.get(hole.hole_number) || 0
    const net = gross - strokes
    const vsPar = gross - hole.par

    grossTotal += gross
    netTotal += net
    parTotal += hole.par

    // Distribution
    if (vsPar <= -2) eagles++
    else if (vsPar === -1) birdies++
    else if (vsPar === 0) pars++
    else if (vsPar === 1) bogeys++
    else if (vsPar === 2) doubleBogeys++
    else others++

    // Streaks
    if (vsPar <= 0) {
      parOrBetterStreak++
      maxParStreak = Math.max(maxParStreak, parOrBetterStreak)
    } else {
      parOrBetterStreak = 0
    }
    if (vsPar <= 1) {
      bogeyOrBetterStreak++
      maxBogeyStreak = Math.max(maxBogeyStreak, bogeyOrBetterStreak)
    } else {
      bogeyOrBetterStreak = 0
    }

    // Bounce backs
    if (prevWasBogeyPlus && vsPar <= 0) {
      bounceBacks++
    }
    prevWasBogeyPlus = vsPar >= 2

    // Best/worst
    if (bestVsPar === null || vsPar < bestVsPar) {
      bestVsPar = vsPar
      bestHoleNum = hole.hole_number
      bestScore = gross
    }
    if (worstVsPar === null || vsPar > worstVsPar) {
      worstVsPar = vsPar
      worstHoleNum = hole.hole_number
      worstScore = gross
    }

    // Par-type breakdown
    if (hole.par === 3) { par3Total += gross; par3Count++ }
    else if (hole.par === 4) { par4Total += gross; par4Count++ }
    else if (hole.par === 5) { par5Total += gross; par5Count++ }

    // Nine breakdown
    if (hole.hole_number <= 9) { frontGross += gross; frontNet += net; frontCount++ }
    else { backGross += gross; backNet += net; backCount++ }

    // GIR
    if (s.gir === true) gir++

    // Fairways (only par 4+ holes)
    if (hole.par >= 4 && s.fairway_hit !== null && s.fairway_hit !== undefined) {
      fairwaysTotal++
      if (s.fairway_hit) fairwaysHit++
    }

    // Putts
    if (s.putts !== null && s.putts !== undefined) {
      totalPutts += s.putts
      puttsHoles++
    }
  }

  const holesPlayed = sortedScores.length

  return {
    gross_total: grossTotal,
    net_total: netTotal,
    par_total: parTotal,
    holes_played: holesPlayed,
    eagles,
    birdies,
    pars,
    bogeys,
    double_bogeys: doubleBogeys,
    others,
    par_or_better_streak: maxParStreak,
    bogey_or_better_streak: maxBogeyStreak,
    best_hole_score: bestScore,
    best_hole_number: bestHoleNum,
    worst_hole_score: worstScore,
    worst_hole_number: worstHoleNum,
    best_hole_vs_par: bestVsPar,
    worst_hole_vs_par: worstVsPar,
    par3_total: par3Count > 0 ? par3Total : null,
    par3_count: par3Count,
    par4_total: par4Count > 0 ? par4Total : null,
    par4_count: par4Count,
    par5_total: par5Count > 0 ? par5Total : null,
    par5_count: par5Count,
    front_nine_gross: frontCount > 0 ? frontGross : null,
    front_nine_net: frontCount > 0 ? frontNet : null,
    back_nine_gross: backCount > 0 ? backGross : null,
    back_nine_net: backCount > 0 ? backNet : null,
    greens_in_regulation: gir,
    bounce_backs: bounceBacks,
    scoring_average: holesPlayed > 0 ? grossTotal / holesPlayed : null,
    fairways_hit: fairwaysHit,
    fairways_total: fairwaysTotal,
    total_putts: totalPutts,
    putts_per_hole: puttsHoles > 0 ? totalPutts / puttsHoles : null,
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/compute-round-stats.test.ts`
Expected: All 8 tests PASS

**Step 5: Wire computeRoundStats into the scores API**

In `src/app/api/live/[courseId]/scores/route.ts`, after the `processScoreEvents` call (around line 158), add:

```typescript
import { computeRoundStats } from '@/lib/compute-round-stats'

// Inside the POST handler, after processScoreEvents call:
// 5. Recompute round_stats for each player who just scored
recomputeRoundStats(db, courseId).catch(
  (err) => console.error('Round stats computation error:', err)
)
```

Add this helper function in the same file (or import from compute-round-stats):

```typescript
async function recomputeRoundStats(db: ReturnType<typeof getServiceClient>, courseId: string) {
  const { data: allScores } = await db
    .from('round_scores')
    .select('trip_player_id, hole_id, gross_score, fairway_hit, gir, putts')
    .eq('course_id', courseId)

  const { data: holes } = await db
    .from('holes')
    .select('id, hole_number, par, handicap_index')
    .eq('course_id', courseId)

  const { data: course } = await db
    .from('courses')
    .select('trip_id')
    .eq('id', courseId)
    .single()

  if (!allScores || !holes || !course) return

  const { data: handicaps } = await db
    .from('player_course_handicaps')
    .select('trip_player_id, handicap_strokes')
    .eq('course_id', courseId)

  const handicapMap = new Map((handicaps || []).map(h => [h.trip_player_id, h.handicap_strokes]))

  // Group scores by player
  const byPlayer = new Map<string, typeof allScores>()
  for (const s of allScores) {
    const arr = byPlayer.get(s.trip_player_id) || []
    arr.push(s)
    byPlayer.set(s.trip_player_id, arr)
  }

  // Compute and upsert for each player
  for (const [tripPlayerId, playerScores] of byPlayer) {
    const hcap = handicapMap.get(tripPlayerId) || 0
    const stats = computeRoundStats(playerScores, holes, hcap)

    await db.from('round_stats').upsert({
      course_id: courseId,
      trip_player_id: tripPlayerId,
      ...stats,
      computed_at: new Date().toISOString(),
    }, { onConflict: 'course_id,trip_player_id' })
  }
}
```

**Step 6: Commit**

```bash
git add src/lib/compute-round-stats.ts src/__tests__/compute-round-stats.test.ts src/app/api/live/\[courseId\]/scores/route.ts
git commit -m "feat: compute and store round stats after each score save"
```

---

### Task 3: Add Stats Columns to round_stats Table

**Context:** The existing `round_stats` table from migration 008 has `greens_in_regulation` but not `fairways_hit`, `fairways_total`, `total_putts`, or `putts_per_hole`. We need a migration to add these.

**Files:**
- Create: `supabase/migrations/031_stats_columns.sql`

**Step 1: Create migration**

```sql
-- Add detailed stats columns to round_stats
ALTER TABLE round_stats ADD COLUMN IF NOT EXISTS fairways_hit integer NOT NULL DEFAULT 0;
ALTER TABLE round_stats ADD COLUMN IF NOT EXISTS fairways_total integer NOT NULL DEFAULT 0;
ALTER TABLE round_stats ADD COLUMN IF NOT EXISTS total_putts integer NOT NULL DEFAULT 0;
ALTER TABLE round_stats ADD COLUMN IF NOT EXISTS putts_per_hole numeric(4,2);
```

**Step 2: Run migration in Supabase**

Run this SQL in the Supabase SQL Editor for project `nwuyibrjzoyhzaqnzodb`.

**Step 3: Commit**

```bash
git add supabase/migrations/031_stats_columns.sql
git commit -m "feat: add fairway and putt stats columns to round_stats"
```

---

### Task 4: Display Stats on Scorecard

**Context:** After a round (or during), show a stats summary below the scorecard on the live scoring page. Pull from `round_stats` for the current player.

**Files:**
- Create: `src/app/trip/[tripId]/live/[courseId]/components/StatsCard.tsx`
- Modify: `src/app/trip/[tripId]/live/[courseId]/live-scoring-client.tsx`
- Modify: `src/app/api/live/[courseId]/route.ts`

**Step 1: Create StatsCard component**

Create `src/app/trip/[tripId]/live/[courseId]/components/StatsCard.tsx`:

```tsx
'use client'

interface StatsCardProps {
  stats: {
    holes_played: number
    gross_total: number
    net_total: number
    par_total: number
    birdies: number
    pars: number
    bogeys: number
    double_bogeys: number
    others: number
    eagles: number
    greens_in_regulation: number
    fairways_hit: number
    fairways_total: number
    total_putts: number
    putts_per_hole: number | null
    bounce_backs: number
    best_hole_number: number | null
    best_hole_vs_par: number | null
    worst_hole_number: number | null
    worst_hole_vs_par: number | null
    front_nine_gross: number | null
    back_nine_gross: number | null
  } | null
  playerName: string
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

export default function StatsCard({ stats, playerName }: StatsCardProps) {
  if (!stats || stats.holes_played === 0) return null

  const vsPar = stats.gross_total - stats.par_total
  const vsParStr = vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : `${vsPar}`

  const firPct = stats.fairways_total > 0
    ? `${Math.round((stats.fairways_hit / stats.fairways_total) * 100)}%`
    : '-'
  const girPct = stats.holes_played > 0
    ? `${Math.round((stats.greens_in_regulation / stats.holes_played) * 100)}%`
    : '-'

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
        {playerName}'s Stats
      </h3>

      {/* Score summary */}
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-lg font-bold text-gray-900">{stats.gross_total}</div>
          <div className="text-xs text-gray-500">Gross</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-lg font-bold text-gray-900">{stats.net_total}</div>
          <div className="text-xs text-gray-500">Net</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className={`text-lg font-bold ${vsPar < 0 ? 'text-red-600' : vsPar > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
            {vsParStr}
          </div>
          <div className="text-xs text-gray-500">vs Par</div>
        </div>
      </div>

      {/* Scoring distribution */}
      <div className="mb-3 flex justify-center gap-3">
        {stats.eagles > 0 && (
          <div className="text-center">
            <div className="text-sm font-bold text-yellow-600">{stats.eagles}</div>
            <div className="text-[10px] text-gray-400">Eagles</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-sm font-bold text-red-600">{stats.birdies}</div>
          <div className="text-[10px] text-gray-400">Birdies</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-green-600">{stats.pars}</div>
          <div className="text-[10px] text-gray-400">Pars</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-blue-600">{stats.bogeys}</div>
          <div className="text-[10px] text-gray-400">Bogeys</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-purple-600">{stats.double_bogeys + stats.others}</div>
          <div className="text-[10px] text-gray-400">Dbl+</div>
        </div>
      </div>

      {/* Detailed stats */}
      <div className="divide-y divide-gray-100">
        <StatRow label="Fairways" value={`${stats.fairways_hit}/${stats.fairways_total} (${firPct})`} />
        <StatRow label="Greens (GIR)" value={`${stats.greens_in_regulation}/${stats.holes_played} (${girPct})`} />
        {stats.total_putts > 0 && (
          <StatRow label="Putts" value={`${stats.total_putts} (${stats.putts_per_hole?.toFixed(1) || '-'}/hole)`} />
        )}
        <StatRow label="Bounce Backs" value={stats.bounce_backs} />
        {stats.front_nine_gross && stats.back_nine_gross && (
          <StatRow label="Front / Back" value={`${stats.front_nine_gross} / ${stats.back_nine_gross}`} />
        )}
        {stats.best_hole_number && (
          <StatRow
            label="Best Hole"
            value={`#${stats.best_hole_number} (${stats.best_hole_vs_par! <= 0 ? stats.best_hole_vs_par : `+${stats.best_hole_vs_par}`})`}
          />
        )}
      </div>
    </div>
  )
}
```

**Step 2: Add round_stats to the live API response**

In `src/app/api/live/[courseId]/route.ts`, fetch `round_stats` for the current player and include in the response. Add to the query section:

```typescript
const { data: roundStats } = await supabase
  .from('round_stats')
  .select('*')
  .eq('course_id', courseId)
```

Add `roundStats` to the API response object.

**Step 3: Wire StatsCard into live-scoring-client**

In `live-scoring-client.tsx`, add `roundStats` to the `ApiResponse` interface and render `StatsCard` below the scorecard (before LiveDashboard), only when `statsEnabled` is true:

```tsx
{statsEnabled && data.roundStats && (
  <StatsCard
    stats={data.roundStats.find(s => s.trip_player_id === currentTripPlayerId) || null}
    playerName={ownPlayerName.split(' ')[0]}
  />
)}
```

**Step 4: Commit**

```bash
git add src/app/trip/\[tripId\]/live/\[courseId\]/components/StatsCard.tsx src/app/trip/\[tripId\]/live/\[courseId\]/live-scoring-client.tsx src/app/api/live/\[courseId\]/route.ts
git commit -m "feat: display round stats card on scorecard when stats enabled"
```

---

### Task 5: Trip Leaderboard Page

**Context:** Build a trip leaderboard that aggregates scores across all rounds in a trip. This is a new page at `/trip/[tripId]/leaderboard`.

**Files:**
- Create: `src/app/trip/[tripId]/leaderboard/page.tsx`
- Create: `src/app/api/trip/[tripId]/leaderboard/route.ts`

**Step 1: Create the API route**

Create `src/app/api/trip/[tripId]/leaderboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const supabase = await createClient()

  // Get trip info
  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, year, status')
    .eq('id', tripId)
    .single()

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  // Get all courses for this trip
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, par, round_number, round_date')
    .eq('trip_id', tripId)
    .order('round_number')

  // Get all trip players
  const { data: tripPlayers } = await supabase
    .from('trip_players')
    .select('id, player:players(id, name, handicap_index)')
    .eq('trip_id', tripId)

  // Get all round_scores across all courses in this trip
  const courseIds = (courses || []).map(c => c.id)
  const { data: allScores } = await supabase
    .from('round_scores')
    .select('course_id, trip_player_id, hole_id, gross_score')
    .in('course_id', courseIds)

  // Get all holes for par calculation
  const { data: allHoles } = await supabase
    .from('holes')
    .select('id, course_id, hole_number, par')
    .in('course_id', courseIds)

  // Get handicaps
  const { data: handicaps } = await supabase
    .from('player_course_handicaps')
    .select('trip_player_id, course_id, handicap_strokes')
    .in('course_id', courseIds)

  // Get round_stats if available
  const { data: roundStats } = await supabase
    .from('round_stats')
    .select('*')
    .in('course_id', courseIds)

  return NextResponse.json({
    trip,
    courses: courses || [],
    tripPlayers: tripPlayers || [],
    allScores: allScores || [],
    allHoles: allHoles || [],
    handicaps: handicaps || [],
    roundStats: roundStats || [],
  })
}
```

**Step 2: Create the leaderboard page**

Create `src/app/trip/[tripId]/leaderboard/page.tsx` — a server component that fetches the API and renders a client component. This should show:

- A cumulative leaderboard table (gross and net columns, sortable)
- Per-round score breakdown for each player
- Toggle between gross/net view
- Link back to trip page
- Highlight leader in green

The page should show each player's total across all rounds, their per-round scores, and rank them. Include a "vs par" column.

**Step 3: Add leaderboard link to trip page**

Add a link/button to the trip page (wherever the trip navigation is) pointing to `/trip/[tripId]/leaderboard`.

**Step 4: Commit**

```bash
git add src/app/trip/\[tripId\]/leaderboard/ src/app/api/trip/\[tripId\]/leaderboard/
git commit -m "feat: add trip leaderboard page with cumulative scoring"
```

---

### Task 6: Compute Trip Stats and Awards

**Context:** After round stats are computed, aggregate them into `trip_stats` and generate `trip_awards`. This can run as part of the same fire-and-forget after score saves.

**Files:**
- Create: `src/lib/compute-trip-stats.ts`
- Modify: `src/app/api/live/[courseId]/scores/route.ts`

**Step 1: Create computeTripStats function**

This aggregates all `round_stats` rows for a trip into `trip_stats`, and generates awards like:
- Low Gross (best single round gross)
- Low Net (best single round net)
- Most Birdies (across trip)
- Most Pars (across trip)
- Best Bounce Back Rate
- Most Consistent (lowest scoring_average)
- Worst Hole Award (worst single hole vs par)

**Step 2: Wire into scores API**

After `recomputeRoundStats`, call `recomputeTripStats(db, tripId)` in the fire-and-forget chain.

**Step 3: Display awards on trip leaderboard page**

Add an awards section below the leaderboard table showing auto-generated superlatives.

**Step 4: Commit**

```bash
git add src/lib/compute-trip-stats.ts src/app/api/live/\[courseId\]/scores/route.ts src/app/trip/\[tripId\]/leaderboard/
git commit -m "feat: compute trip stats and auto-generate awards"
```
