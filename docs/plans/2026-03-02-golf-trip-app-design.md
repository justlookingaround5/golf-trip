# Golf Trip Payout App — Design Document

## Overview

A full-lifecycle golf trip management app: set up trips, score live on the course, and view results/payouts. Built for a group of friends who do annual golf trips.

## Users & Auth

- **Admin** — Creates trips, manages courses/players/teams/games. Email + password via Supabase Auth.
- **Scorer** — One per match/group. Enters hole-by-hole scores during the round. Authenticated via magic link (Supabase Auth).
- **Viewer** — Any player or spectator. Public link, no auth required.

## Core Data Model

- **Trip** — name, year, location, status (setup/active/completed)
- **Course** — name, slope, rating, par. Auto-populated via free golf course API with manual override. Each course has 18 Holes (par, handicap index).
- **Player** — name, email, phone, handicap index. Linked to trips via TripPlayer (stores course-specific handicap strokes).
- **Team** — name, linked to trip. Players assigned via TeamPlayer.
- **Round** — links trip to course, round number, date.
- **Match** — belongs to round. Format (2v2 best ball, 1v1 stroke play, etc.), players/teams, point value, assigned scorer.
- **Score** — one player, one hole, one round. Stores gross. Net calculated from handicap strokes.

## Game Engine

Modular calculator system — each game type takes scores in, produces results out.

### Match Play
- 1v1 and 2v2 (best ball net)
- Hole-by-hole net comparison
- Status in standard format (e.g. "3&2", "1UP")
- Configurable point value per match
- Team points accumulate across rounds

### Skins
- Gross, net, or both (configurable)
- Sole lowest score wins the skin
- Carry-over on ties
- Configurable buy-in per trip

### Side Games (Phase 1)
- Closest to pin (winner + distance per hole)
- Long drive (winner per hole)
- Low gross / low net round prizes

### Payout Calculator
- Rolls up all game results per player
- Breakdown: match play + skins + side games
- Live running total during trip, final after completion

## Screens

### Admin
1. Create Trip — name, dates, add players with handicap indexes
2. Add Courses — search + auto-fill, assign to rounds
3. Set Up Teams — assign players to teams
4. Configure Games — toggle match play, skins, side games; set buy-ins and point values
5. Create Matchups — pair players/teams per round, assign scorer
6. Send Magic Links — to scorers
7. Dashboard — overview, live scores, edit/override scores

### Scorer (Mobile-First)
1. Open magic link
2. See match scorecard — players, holes
3. Tap hole, enter gross scores
4. Submit — everything updates in real time
5. Big-button UI for outdoor/sunlight use

### Viewer (Public Link)
1. Live Leaderboard — gross/net standings, team scoreboard
2. Match Detail — hole-by-hole, match status
3. Skins Board — winners, carry-overs, pot
4. Payouts — per-player money breakdown

## Technical Architecture

- **Frontend:** Next.js (App Router), deployed on Vercel
- **Database:** Supabase Postgres with RLS
- **Auth:** Supabase Auth (admin password, scorer magic links, public read)
- **Real-Time:** Supabase Realtime subscriptions on scores table
- **Calculations:** Server-side via Next.js API routes / Supabase Edge Functions. Triggered on score insert/update.
- **Mobile-First:** Responsive, optimized for phone scoring

## Phases

### Phase 1 — MVP
- Trip CRUD, course setup (API auto-fill), player management
- Team creation and matchup configuration
- Hole-by-hole scoring with magic links
- Real-time leaderboard (gross/net)
- Match play calculation (1v1, 2v2 best ball)
- Public viewer link

### Phase 2 — Skins & Payouts
- Gross/net skins with carry-overs
- Buy-in tracking
- Payout calculator with breakdown
- CTP, long drive side games

### Phase 3 — Polish & History
- Trip archive, past results
- Player career stats
- Enhanced mobile scoring UX
- Custom side bet framework
