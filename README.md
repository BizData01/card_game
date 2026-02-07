# Card Flip Game

React + Vite project for a 4x4 emoji memory game.

## Environment

Create a `.env` file (see `.env.example`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

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
