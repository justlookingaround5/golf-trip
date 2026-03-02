# Golf Trip App — Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working golf trip app with trip setup, course auto-fill, team/matchup configuration, live hole-by-hole scoring via magic links, real-time leaderboards, and match play calculation.

**Architecture:** Next.js App Router with Supabase backend. Server components for data fetching, client components for interactive scoring UI. Supabase handles auth (admin password + scorer magic links), real-time subscriptions, and Postgres storage. All game calculations run server-side via Next.js API routes.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Realtime), Vercel deployment.

---

### Task 1: Supabase Project Setup & Database Schema

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `supabase/migrations/001_initial_schema.sql`
- Modify: `.env.local` (create)

**Step 1: Create Supabase project**

Go to https://supabase.com/dashboard and create a new project called "golf-trip". Copy the project URL and anon key.

**Step 2: Create `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Step 3: Create Supabase client utilities**

`src/lib/supabase/client.ts` — Browser client (for client components):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`src/lib/supabase/server.ts` — Server client (for server components/route handlers):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

`src/lib/supabase/middleware.ts` — Middleware client:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  await supabase.auth.getUser()
  return supabaseResponse
}
```

`src/middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Step 4: Create the database migration**

`supabase/migrations/001_initial_schema.sql`:
```sql
-- Trips
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  location text,
  status text not null default 'setup' check (status in ('setup', 'active', 'completed')),
  match_buy_in numeric(10,2) default 100,
  skins_buy_in numeric(10,2) default 10,
  skins_mode text default 'net' check (skins_mode in ('gross', 'net', 'both')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  slope integer,
  rating numeric(4,1),
  par integer not null default 72,
  round_number integer not null,
  round_date date,
  created_at timestamptz default now()
);

-- Holes
create table holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  hole_number integer not null check (hole_number between 1 and 18),
  par integer not null check (par between 3 and 5),
  handicap_index integer not null check (handicap_index between 1 and 18),
  unique (course_id, hole_number)
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  handicap_index numeric(4,1),
  created_at timestamptz default now()
);

-- Trip-Player join (with course-specific handicap strokes)
create table trip_players (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  paid boolean default false,
  unique (trip_id, player_id)
);

-- Course-specific handicap strokes for each player
create table player_course_handicaps (
  id uuid primary key default gen_random_uuid(),
  trip_player_id uuid not null references trip_players(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  handicap_strokes integer not null default 0,
  unique (trip_player_id, course_id)
);

-- Teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null
);

-- Team-Player join
create table team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  trip_player_id uuid not null references trip_players(id) on delete cascade,
  unique (team_id, trip_player_id)
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  format text not null default '2v2_best_ball' check (format in ('1v1_stroke', '2v2_best_ball', '1v1_match', '2v2_alternate_shot')),
  point_value numeric(4,1) default 1,
  scorer_email text,
  scorer_token uuid default gen_random_uuid(),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  result text, -- e.g. "3&2", "1UP", "AS"
  winner_side text check (winner_side in ('team_a', 'team_b', 'tie')),
  created_at timestamptz default now()
);

-- Match players (which players are on which side)
create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  trip_player_id uuid not null references trip_players(id) on delete cascade,
  side text not null check (side in ('team_a', 'team_b')),
  unique (match_id, trip_player_id)
);

-- Scores (the atomic unit)
create table scores (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  trip_player_id uuid not null references trip_players(id) on delete cascade,
  hole_id uuid not null references holes(id) on delete cascade,
  gross_score integer not null check (gross_score between 1 and 20),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (match_id, trip_player_id, hole_id)
);

-- Enable realtime on scores
alter publication supabase_realtime add table scores;

-- RLS policies
alter table trips enable row level security;
alter table courses enable row level security;
alter table holes enable row level security;
alter table players enable row level security;
alter table trip_players enable row level security;
alter table player_course_handicaps enable row level security;
alter table teams enable row level security;
alter table team_players enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table scores enable row level security;

-- Public read access for all tables (viewer experience)
create policy "Public read access" on trips for select using (true);
create policy "Public read access" on courses for select using (true);
create policy "Public read access" on holes for select using (true);
create policy "Public read access" on players for select using (true);
create policy "Public read access" on trip_players for select using (true);
create policy "Public read access" on player_course_handicaps for select using (true);
create policy "Public read access" on teams for select using (true);
create policy "Public read access" on team_players for select using (true);
create policy "Public read access" on matches for select using (true);
create policy "Public read access" on match_players for select using (true);
create policy "Public read access" on scores for select using (true);

-- Admin write access (authenticated users)
create policy "Admin write" on trips for all using (auth.role() = 'authenticated');
create policy "Admin write" on courses for all using (auth.role() = 'authenticated');
create policy "Admin write" on holes for all using (auth.role() = 'authenticated');
create policy "Admin write" on players for all using (auth.role() = 'authenticated');
create policy "Admin write" on trip_players for all using (auth.role() = 'authenticated');
create policy "Admin write" on player_course_handicaps for all using (auth.role() = 'authenticated');
create policy "Admin write" on teams for all using (auth.role() = 'authenticated');
create policy "Admin write" on team_players for all using (auth.role() = 'authenticated');
create policy "Admin write" on matches for all using (auth.role() = 'authenticated');
create policy "Admin write" on match_players for all using (auth.role() = 'authenticated');

-- Scores: admin or scorer with valid token can write
create policy "Admin write scores" on scores for all using (auth.role() = 'authenticated');
create policy "Scorer write scores" on scores for insert with check (
  exists (
    select 1 from matches m
    where m.id = scores.match_id
    and m.scorer_token::text = current_setting('request.jwt.claims', true)::json->>'scorer_token'
  )
);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trips_updated_at before update on trips for each row execute function update_updated_at();
create trigger scores_updated_at before update on scores for each row execute function update_updated_at();
```

**Step 5: Run the migration**

Apply the migration via the Supabase SQL Editor in the dashboard, or via Supabase CLI.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: initial project setup with Supabase schema and client utilities"
```

---

### Task 2: TypeScript Types & Database Helpers

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/handicap.ts`

**Step 1: Define TypeScript types**

`src/lib/types.ts`:
```typescript
export interface Trip {
  id: string
  name: string
  year: number
  location: string | null
  status: 'setup' | 'active' | 'completed'
  match_buy_in: number
  skins_buy_in: number
  skins_mode: 'gross' | 'net' | 'both'
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Course {
  id: string
  trip_id: string
  name: string
  slope: number | null
  rating: number | null
  par: number
  round_number: number
  round_date: string | null
  created_at: string
  holes?: Hole[]
}

export interface Hole {
  id: string
  course_id: string
  hole_number: number
  par: number
  handicap_index: number
}

export interface Player {
  id: string
  name: string
  email: string | null
  phone: string | null
  handicap_index: number | null
  created_at: string
}

export interface TripPlayer {
  id: string
  trip_id: string
  player_id: string
  paid: boolean
  player?: Player
}

export interface PlayerCourseHandicap {
  id: string
  trip_player_id: string
  course_id: string
  handicap_strokes: number
}

export interface Team {
  id: string
  trip_id: string
  name: string
  players?: TripPlayer[]
}

export interface Match {
  id: string
  course_id: string
  format: '1v1_stroke' | '2v2_best_ball' | '1v1_match' | '2v2_alternate_shot'
  point_value: number
  scorer_email: string | null
  scorer_token: string
  status: 'pending' | 'in_progress' | 'completed'
  result: string | null
  winner_side: 'team_a' | 'team_b' | 'tie' | null
  created_at: string
  match_players?: MatchPlayer[]
}

export interface MatchPlayer {
  id: string
  match_id: string
  trip_player_id: string
  side: 'team_a' | 'team_b'
  trip_player?: TripPlayer
}

export interface Score {
  id: string
  match_id: string
  trip_player_id: string
  hole_id: string
  gross_score: number
  created_at: string
  updated_at: string
}

export type MatchFormat = Match['format']

export const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  '1v1_stroke': '1v1 Stroke Play',
  '2v2_best_ball': '2v2 Best Ball',
  '1v1_match': '1v1 Match Play',
  '2v2_alternate_shot': '2v2 Alternate Shot',
}
```

**Step 2: Create handicap calculation utility**

`src/lib/handicap.ts`:
```typescript
/**
 * Calculate course handicap from index, slope, and rating.
 * Formula: (Handicap Index × Slope / 113) + (Course Rating − Par)
 * Rounded to nearest integer.
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number
): number {
  const raw = (handicapIndex * slope / 113) + (rating - par)
  return Math.round(raw)
}

/**
 * Determine which holes a player gets strokes on.
 * Returns a map of hole_number → number of strokes on that hole.
 * Strokes are allocated based on hole handicap index (1 = hardest).
 */
export function getStrokesPerHole(
  courseHandicap: number,
  holes: { hole_number: number; handicap_index: number }[]
): Map<number, number> {
  const strokeMap = new Map<number, number>()
  const sorted = [...holes].sort((a, b) => a.handicap_index - b.handicap_index)

  let remaining = courseHandicap
  // First pass: 1 stroke per hole starting from hardest
  for (const hole of sorted) {
    if (remaining <= 0) break
    strokeMap.set(hole.hole_number, (strokeMap.get(hole.hole_number) || 0) + 1)
    remaining--
  }
  // Second pass if handicap > 18 (unlikely but handle it)
  for (const hole of sorted) {
    if (remaining <= 0) break
    strokeMap.set(hole.hole_number, (strokeMap.get(hole.hole_number) || 0) + 1)
    remaining--
  }

  return strokeMap
}

/**
 * Calculate net score for a hole given gross score and strokes received.
 */
export function netScore(grossScore: number, strokesOnHole: number): number {
  return grossScore - strokesOnHole
}
```

**Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/handicap.ts
git commit -m "feat: add TypeScript types and handicap calculation utilities"
```

---

### Task 3: Admin Auth (Login Page)

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create admin login page**

`src/app/admin/login/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Golf Trip Admin</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-2 rounded-md hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Create admin layout with auth guard**

`src/app/admin/layout.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-800 text-white px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Golf Trip Admin</h1>
        <form action="/api/auth/signout" method="post">
          <button className="text-sm hover:underline">Sign Out</button>
        </form>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
```

**Step 3: Create admin dashboard page**

`src/app/admin/page.tsx`:
```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Trip } from '@/lib/types'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .order('year', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Trips</h2>
        <Link
          href="/admin/trips/new"
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800"
        >
          New Trip
        </Link>
      </div>
      {(!trips || trips.length === 0) ? (
        <p className="text-gray-500">No trips yet. Create your first one!</p>
      ) : (
        <div className="grid gap-4">
          {(trips as Trip[]).map((trip) => (
            <Link
              key={trip.id}
              href={`/admin/trips/${trip.id}`}
              className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{trip.name}</h3>
                  <p className="text-gray-500">{trip.location} · {trip.year}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  trip.status === 'active' ? 'bg-green-100 text-green-800' :
                  trip.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {trip.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create sign-out API route**

Create `src/app/api/auth/signout/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
```

**Step 5: Commit**

```bash
git add src/app/admin/ src/app/api/auth/
git commit -m "feat: add admin auth with login page and protected layout"
```

---

### Task 4: Trip CRUD

**Files:**
- Create: `src/app/admin/trips/new/page.tsx`
- Create: `src/app/admin/trips/[tripId]/page.tsx`
- Create: `src/app/api/trips/route.ts`
- Create: `src/app/api/trips/[tripId]/route.ts`

**Step 1: Create trip form page**

`src/app/admin/trips/new/page.tsx` — Form with fields: name, year, location, match buy-in, skins buy-in, skins mode. Posts to `/api/trips` then redirects to the trip detail page.

**Step 2: Create trips API routes**

`src/app/api/trips/route.ts` — POST handler to create a trip. Returns the new trip.

`src/app/api/trips/[tripId]/route.ts` — GET, PUT, DELETE handlers for trip CRUD.

**Step 3: Create trip detail page**

`src/app/admin/trips/[tripId]/page.tsx` — Shows trip overview with tabs/sections:
- Trip info (edit name, dates, buy-ins)
- Courses (list, add, configure rounds)
- Players (add/remove from trip)
- Teams (create teams, assign players)
- Matches (configure matchups per round)
- Status controls (activate, complete)

**Step 4: Commit**

```bash
git add src/app/admin/trips/ src/app/api/trips/
git commit -m "feat: add trip CRUD with admin pages"
```

---

### Task 5: Course Setup with API Auto-Fill

**Files:**
- Create: `src/app/admin/trips/[tripId]/courses/page.tsx`
- Create: `src/app/api/courses/route.ts`
- Create: `src/app/api/courses/search/route.ts`
- Create: `src/lib/golf-course-api.ts`

**Step 1: Create golf course API integration**

`src/lib/golf-course-api.ts`:
```typescript
const API_BASE = 'https://golfcourseapi.com/api/v1'

export interface GolfCourseSearchResult {
  id: string
  name: string
  city: string
  state: string
  country: string
}

export interface GolfCourseDetail {
  id: string
  name: string
  slope: number
  rating: number
  par: number
  holes: {
    hole_number: number
    par: number
    handicap: number
    yardage: number
  }[]
}

export async function searchCourses(query: string): Promise<GolfCourseSearchResult[]> {
  const res = await fetch(`${API_BASE}/courses?search=${encodeURIComponent(query)}`, {
    headers: { 'Authorization': `Key ${process.env.GOLF_COURSE_API_KEY}` }
  })
  if (!res.ok) return []
  return res.json()
}

export async function getCourseDetail(courseId: string): Promise<GolfCourseDetail | null> {
  const res = await fetch(`${API_BASE}/courses/${courseId}`, {
    headers: { 'Authorization': `Key ${process.env.GOLF_COURSE_API_KEY}` }
  })
  if (!res.ok) return null
  return res.json()
}
```

Note: The exact API shape will need to be adjusted based on the actual golfcourseapi.com response format. We'll adapt during implementation.

**Step 2: Create search API route**

`src/app/api/courses/search/route.ts` — Proxies search to golf course API, returns results.

**Step 3: Create course management UI**

Admin page with:
- Search input for course name (debounced, shows results)
- Click result to auto-fill slope, rating, par, and 18 holes
- Manual override for all values
- Manual entry fallback if API doesn't have the course
- Assign course to a round number and date

**Step 4: Commit**

```bash
git add src/lib/golf-course-api.ts src/app/api/courses/ src/app/admin/trips/*/courses/
git commit -m "feat: add course setup with golf course API auto-fill"
```

---

### Task 6: Player & Team Management

**Files:**
- Create: `src/app/admin/trips/[tripId]/players/page.tsx`
- Create: `src/app/admin/trips/[tripId]/teams/page.tsx`
- Create: `src/app/api/players/route.ts`
- Create: `src/app/api/trips/[tripId]/players/route.ts`
- Create: `src/app/api/trips/[tripId]/teams/route.ts`

**Step 1: Player management**

- Add players to trip (name, email, handicap index)
- Auto-calculate course handicap strokes for each course using slope/rating
- Display player list with handicaps per course
- Remove players from trip

**Step 2: Team management**

- Create teams (name them)
- Drag/assign players to teams
- Show team rosters

**Step 3: Commit**

```bash
git add src/app/admin/trips/*/players/ src/app/admin/trips/*/teams/ src/app/api/players/ src/app/api/trips/
git commit -m "feat: add player and team management with handicap calculation"
```

---

### Task 7: Match Configuration

**Files:**
- Create: `src/app/admin/trips/[tripId]/matches/page.tsx`
- Create: `src/app/api/matches/route.ts`
- Create: `src/app/api/matches/[matchId]/route.ts`

**Step 1: Match setup UI**

Per round (course):
- Select format (1v1, 2v2 best ball, etc.)
- Pick players for each side (team_a vs team_b)
- Set point value
- Assign scorer email
- Generate and send magic link

**Step 2: Magic link generation**

Each match gets a unique `scorer_token`. The magic link URL is: `/score/{scorer_token}`. No Supabase Auth needed for scorer — the token in the URL is the auth.

**Step 3: Commit**

```bash
git add src/app/admin/trips/*/matches/ src/app/api/matches/
git commit -m "feat: add match configuration with scorer magic links"
```

---

### Task 8: Scorer Hole-by-Hole Entry

**Files:**
- Create: `src/app/score/[token]/page.tsx`
- Create: `src/app/api/score/[token]/route.ts`
- Create: `src/app/api/score/[token]/holes/route.ts`

**Step 1: Scorer landing page**

`src/app/score/[token]/page.tsx`:
- Look up match by scorer_token
- Show match info: players, course, format
- Display scorecard as a list of 18 holes
- Each hole shows: hole number, par, handicap
- Tap a hole to enter scores

**Step 2: Score entry UI**

Mobile-first, big buttons:
- Show hole number, par, handicap
- For each player in the match: +/- buttons to set gross score (default to par)
- Submit button saves score and advances to next hole
- Visual indicator for completed holes
- Current match status shown at top (e.g. "Team A 2UP thru 7")

**Step 3: Score API**

`src/app/api/score/[token]/holes/route.ts`:
- POST: Validate token, insert/upsert score for the hole
- Uses service role key to bypass RLS (scorer is not a Supabase user)

**Step 4: Commit**

```bash
git add src/app/score/ src/app/api/score/
git commit -m "feat: add scorer hole-by-hole entry with mobile-first UI"
```

---

### Task 9: Match Play Calculation Engine

**Files:**
- Create: `src/lib/match-play.ts`
- Create: `src/lib/match-play.test.ts`

**Step 1: Write tests for match play calculation**

Test cases:
- 1v1 match: player A wins by 3&2
- 1v1 match: goes to 18, 1UP
- 1v1 match: all square (tie)
- 2v2 best ball: correct best ball selection
- 2v2 best ball: handicap strokes applied correctly
- Partial round (only 9 holes entered): correct "thru 9" status

**Step 2: Implement match play calculator**

`src/lib/match-play.ts`:
```typescript
export interface MatchPlayResult {
  status: string // "3&2", "1UP", "AS", "2UP thru 12"
  leader: 'team_a' | 'team_b' | 'tie'
  holesPlayed: number
  holesRemaining: number
  isComplete: boolean
  teamAPoints: number
  teamBPoints: number
}

export function calculateMatchPlay(
  scores: Score[],
  matchPlayers: MatchPlayer[],
  holes: Hole[],
  handicaps: Map<string, Map<number, number>>, // trip_player_id -> hole_number -> strokes
  format: MatchFormat
): MatchPlayResult { ... }
```

**Step 3: Run tests**

```bash
npx jest src/lib/match-play.test.ts
```

**Step 4: Commit**

```bash
git add src/lib/match-play.ts src/lib/match-play.test.ts
git commit -m "feat: add match play calculation engine with tests"
```

---

### Task 10: Real-Time Leaderboard (Public Viewer)

**Files:**
- Create: `src/app/trip/[tripId]/page.tsx`
- Create: `src/app/trip/[tripId]/leaderboard/page.tsx`
- Create: `src/app/trip/[tripId]/matches/page.tsx`
- Create: `src/app/trip/[tripId]/matches/[matchId]/page.tsx`
- Create: `src/components/Leaderboard.tsx`
- Create: `src/components/MatchScorecard.tsx`
- Create: `src/components/TeamStandings.tsx`
- Create: `src/lib/leaderboard.ts`

**Step 1: Trip public landing page**

Shows:
- Trip name, location, year
- Team standings (Team Tall: 12 pts, Team Short: 8 pts)
- Links to leaderboard, match details

**Step 2: Leaderboard page**

- Gross leaderboard (all players, sorted by total gross +/-)
- Net leaderboard (sorted by total net +/-)
- Match play records (W-L-T per player)
- Updates in real time via Supabase subscription

**Step 3: Match detail page**

- Hole-by-hole scorecard for the match
- Current match status
- Real-time updates as scorer enters scores

**Step 4: Real-time subscription**

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

// Subscribe to score changes
useEffect(() => {
  const supabase = createClient()
  const channel = supabase
    .channel('scores')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'scores',
    }, () => {
      // Refetch leaderboard data
      refreshData()
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

**Step 5: Commit**

```bash
git add src/app/trip/ src/components/ src/lib/leaderboard.ts
git commit -m "feat: add real-time public leaderboard and match detail views"
```

---

### Task 11: Home Page & Navigation

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Replace default Next.js home page**

Simple landing page:
- App name/logo
- "View Trip" section with active trip links (public)
- "Admin" link (goes to /admin/login)
- Clean, golf-themed styling (green palette)

**Step 2: Update global styles**

Set up base Tailwind theme with golf-appropriate colors.

**Step 3: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat: add home page and navigation"
```

---

### Task 12: Integration Testing & Deploy

**Step 1: End-to-end smoke test**

Manually test the full flow:
1. Log in as admin
2. Create a trip
3. Add courses (test API auto-fill)
4. Add players with handicaps
5. Create teams
6. Set up matches
7. Open scorer link on phone
8. Enter scores for a few holes
9. Verify leaderboard updates in real time
10. Verify match play calculation is correct

**Step 2: Deploy to Vercel**

```bash
vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOLF_COURSE_API_KEY`

**Step 3: Final commit & tag**

```bash
git add -A
git commit -m "chore: phase 1 complete"
git tag v0.1.0
```
