# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
Mobile app for real-world use (not just portfolio) — pet care tracker + AI nutrition/care
chatbot + food allergy management + vet finder. Built by a solo dev (AI/ML engineer
background) using Claude Code.

## Tech stack (target)
- Mobile: React Native + Expo SDK 54 (TypeScript, strict mode)
- Backend: FastAPI (Python) — not yet scaffolded, see "Current state" below
- DB: PostgreSQL (via Supabase for now)
- Auth: Supabase Auth
- AI chatbot: Claude API + Chroma vector DB (RAG over canine nutrition knowledge base) — not yet built
- Maps: Google Places API — not yet built

**Expo has changed significantly across versions.** Before writing any Expo-related code
(config, APIs, routing), check the versioned docs at
https://docs.expo.dev/versions/v54.0.0/ rather than relying on training data.

## Current state (as of this writing)
Only Phase 1's auth slice exists. There is no FastAPI backend, no Postgres schema beyond
what Supabase manages, no RAG chatbot, and no vet finder — the app talks directly to
Supabase from the client. `components/DogCard.tsx` and `lib/notifications.ts` are empty
placeholder files staged for upcoming work.

The app entry point is `index.ts` → `App.tsx`, not `expo-router` file-based routing —
`expo-router` is a dependency but unused; the `app/` directory is empty. `App.tsx` owns
top-level auth state (via `supabase.auth.getSession()` / `onAuthStateChange`) and
switches between `LoginScreen`, `RegisterScreen`, and `HomeScreen` based on session
presence, with local state (not a router) toggling login vs. register.

Note: `types/index.ts` and the per-hook types in `lib/hooks/*.ts` (e.g. `Dog` in
`useDogs.ts` vs. `types/index.ts`) currently define overlapping but slightly different
shapes (optional/nullable fields differ). Reconcile these into one source of truth
rather than adding a third variant when touching this code.

## V1 scope — build in this order
1. Auth + pet profile + care tracker (meals, walks, vet visits, meds) + reminders
2. Allergy/sensitivity profile + ingredient conflict flagging
3. AI chatbot (RAG, grounded in pet's own profile + nutrition corpus)
4. Vet finder map (Google Places)

Do not start Phase N+1 work until Phase N has a working, testable slice.

## Conventions
- TypeScript strict mode on the RN side; type hints on all FastAPI endpoints (once it exists)
- Feature-based folder structure, not type-based (e.g. `/features/tracker`, not `/screens` +
  `/components` split arbitrarily) — the current `screens/` + `components/` + `lib/` split
  predates this convention; migrate incrementally rather than leaving new code inconsistent
- All API routes documented with FastAPI's automatic OpenAPI — no separate API docs to maintain
- Commit small, working increments; don't let Claude Code make sweeping multi-feature changes
  in one pass

## Commands
- `npm run start` — start Expo dev server (Metro bundler, QR code for device/simulator)
- `npm run android` — start dev server and open on Android
- `npm run ios` — start dev server and open on iOS
- `npm run web` — start dev server and open in browser

No lint, typecheck, or test scripts are configured yet. Use `npx tsc --noEmit` for an
ad hoc type check against `tsconfig.json` (extends `expo/tsconfig.base`, strict mode on).

### Environment
Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `.env`,
gitignored) — read in `lib/supabase.ts`. Any new client-exposed env var must be prefixed
`EXPO_PUBLIC_` to be inlined by Expo; anything without that prefix is server-only and
won't be available in the RN bundle.

## Things to remember
- Sensitivity/allergy logic is the core differentiator — treat it as first-class, not a side feature
- Chatbot answers should use the pet's stored profile as context, not just generic Q&A
