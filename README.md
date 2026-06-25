# Fitness Desk

Private personal PWA for workouts, running, body metrics, intake, and consistency.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide React
- date-fns
- vite-plugin-pwa

## App Shell

- Five main routes: Today, Plan, Workout, Body, Progress
- Bottom navigation on mobile
- Centered desktop layout with rounded cards
- GitHub Pages base path: `/fitness-desk/`

## Environment

Copy `.env.example` to `.env.local` and fill in your Supabase project values.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_WORKSPACE_ID=abdulla-fitness-desk
```

The app uses a fixed workspace id and a frontend anon key only. There is no login flow in this project.

## Seed Data

- Schema metadata patch: [supabase/migrations/003_seed_metadata_columns.sql](/Users/abdulla/Desktop/Fitness Desk/supabase/migrations/003_seed_metadata_columns.sql)
- SQL seed script: [supabase/seeds/001_initial_seed.sql](/Users/abdulla/Desktop/Fitness Desk/supabase/seeds/001_initial_seed.sql)
- In-app admin route: `/#/seed`
- `/#/seed` now shows V1 profile settings, scale settings, seed status, client-side exports, and the final QA checklist
- Body metric seed list now includes the full current scale output, including `Body Type` as a text metric

## QA Checklist

- `iPhone Safari test`: bottom navigation is reachable with one hand, cards do not clip, forms fit without horizontal scroll
- `iPhone Home Screen install test`: open the deployed site in Safari, use Share > Add to Home Screen, confirm icon/title/opening in standalone mode
- `MacBook Safari/Chrome test`: dashboard cards align cleanly, charts render, tables and forms stay readable without cramped spacing
- `GitHub Pages deployment test`: `npm run build` passes and the site loads correctly from `/fitness-desk/`
- `Supabase read/write test`: intake toggle, daily weight, weekly body check-in, workout session save, and run save all persist and reload
- `Daily workflow test`: open Today, log intake, save weight, start or review a workout, and confirm Progress reflects the latest saved data

Confirmed:

- No dark mode was added
- No login screen or auth flow was added
- PWA manifest uses GitHub Pages-friendly paths
- App icon placeholder now uses an `FD` monogram
