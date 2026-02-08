# Card Flip Game

React + Vite project for a 4x4 emoji memory game.

## Environment

Create a `.env.local` file (see `.env.example`). This keeps keys out of git:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Note: Vite exposes `VITE_*` variables to the client bundle, so never put service role keys here.

## Supabase

Leaderboard table: `public.leaderboard`

Columns:

- `id` (uuid, primary key)
- `player_name` (text)
- `attempts` (integer)
- `time_ms` (integer)
- `score` (integer)
- `created_at` (timestamptz)

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
