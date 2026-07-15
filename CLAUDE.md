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
Auth, the pet profile slice, and a post-signup onboarding flow are done: users can sign
up/sign in, and on first login `screens/OnboardingScreen.tsx` collects a display name, unique user name
and at least one pet (looping to add more, via "add another pet?") before ever showing
`HomeScreen`. From `HomeScreen`, users can create/edit a dog (name, breed, date of
birth, weight, local-device photo) and see all their dogs listed. Care tracker (meals,
walks, vet visits, meds) and reminders — the rest of Phase 1 — are not built yet, so
Phase 1 is not fully complete. There is no FastAPI backend, no RAG chatbot, and no vet
finder — the app talks directly to Supabase from the client. `lib/notifications.ts` is
still an empty placeholder file staged for upcoming work; `components/DogCard.tsx` is no
longer a placeholder (renders a dog in the list, local photo/emoji fallback).

Signup password strength is enforced client-side (`lib/passwordPolicy.ts`, shown as a
live checklist in `RegisterScreen.tsx`), and Google sign-in is wired end-to-end via
`components/SocialSignInButtons.tsx` on both `LoginScreen`/`RegisterScreen`. Google sign-in there is some sign-in problem but it will be looking in future Apple
sign-in is fully implemented (`lib/hooks/useAppleSignIn.ts`) but **intentionally
disabled** — see the `APPLE_SIGN_IN_ENABLED` flag in `SocialSignInButtons.tsx` — pending
a decision on the paid Apple Developer Program membership it requires. Email
confirmation and Supabase's leaked-password protection are dashboard-only toggles, not
yet turned on.

The app entry point is `index.ts` → `App.tsx`, not `expo-router` file-based routing —
`expo-router` is a dependency but unused; the `app/` directory is empty. `App.tsx` owns
top-level auth state (via `supabase.auth.getSession()` / `onAuthStateChange`) and
switches between `LoginScreen`, `RegisterScreen`, and `HomeScreen` based on session
presence, with local state (not a router) toggling login vs. register. `HomeScreen`
follows the same pattern one level down, using local state to switch between the dog
list and `screens/PetFormScreen.tsx` (create/edit) — there is still no navigation
library in this app.

`types/index.ts` is the single source of truth for the `Dog` type and is now reconciled
against the actual Supabase `dogs` table schema: the table uses `owner_id` (not
`user_id`), and has no `avatar_emoji`/`is_neutered` columns (those were removed from the
type; `notes`/`updated_at` were added to match reality). `lib/hooks/useDogs.ts` was
fixed to match — it previously filtered/inserted on a `user_id` column that doesn't
exist, which silently broke every fetch (errors are swallowed, so the dog list just
looked empty rather than erroring visibly).

A `profiles` table was discovered to already exist in the live Supabase project — not
documented anywhere in this repo — while building the onboarding flow above, the same
way the `dogs`/`owner_id` mismatch was discovered while building the pet profile slice.
It was evidently provisioned ahead of not-yet-built work (avatar upload, push
notifications): `id uuid primary key references auth.users(id)`, `full_name text`
(nullable — not `name`), `avatar_url text`, `push_token text`, `created_at timestamptz`
(no `updated_at`). RLS is enabled with `select`/`insert`/`update` policies scoped
`auth.uid() = id`. A DB trigger, `on_auth_user_created` → `handle_new_user()`, inserts a
bare `profiles` row for every new signup (`full_name` taken from
`raw_user_meta_data->>'full_name'`, currently always null since `RegisterScreen` doesn't
pass it — the name is collected one step later, in `OnboardingScreen`). This has two
consequences for `lib/hooks/useProfile.ts` and any future code touching this table:
always `.upsert()`, never `.insert()` (the row usually already exists by the time client
code runs, so a plain insert hits a primary-key conflict), and "does this user need
onboarding" must check `profile.full_name` being unset, not row existence, since a row
exists almost immediately after every signup regardless (see the gating logic in
`App.tsx`'s `AuthedApp` component). Verify assumptions about `avatar_url`/`push_token`
against the live schema the same way, rather than inferring from code, before building
the avatar or notifications features.

`lib/supabase.ts` never sets `flowType` on the Supabase client, so it defaults to
`'implicit'`, not `'pkce'` — confirmed by reading the installed `@supabase/auth-js`
source directly rather than assuming. This matters for anyone touching OAuth:
`signInWithOAuth`'s redirect URL comes back with `access_token`/`refresh_token` in the
URL **fragment**, not a `?code=` param, so `lib/hooks/useGoogleSignIn.ts` completes the
sign-in with `supabase.auth.setSession()`, not `exchangeCodeForSession()`. Don't
"correct" this to PKCE without also changing the client config and the fragment-parsing
logic together.

Google and Apple use deliberately different implementation strategies, because the
project stays on Expo Go (no custom dev client/EAS build) for now: Google uses a generic
web-redirect flow (`expo-web-browser` + `expo-auth-session`'s `makeRedirectUri()`), which
works in Expo Go. Apple uses the *native* `expo-apple-authentication` module instead of
a web redirect, because Expo's own docs confirm it (unusually) works directly in Expo Go
on iOS — this is the exception, not the rule; most third-party native modules
(e.g. `@react-native-google-signin/google-signin`, Supabase's own recommended Google
approach for RN) do **not** work in Expo Go and need a dev client, which is why Google
did *not* get the native treatment here. Don't swap Google to a native SDK without first
confirming the project has moved off Expo Go.

Installing new native-module dependencies in this repo currently requires
`npm install --legacy-peer-deps` (or the equivalent flag on whatever `expo install` ends
up shelling out to) — there's a pre-existing peer-dependency conflict between this
project's pinned `react@19.1.0` and a transitively-pulled `react-dom@19.2.7` (via Expo's
own CLI/web tooling, not app code), unrelated to whatever package is being added. Plain
`npm install` fails on this today; it's not something a given dependency addition broke.

Known remaining issue: `lib/hooks/useHabits.ts` still defines its own local `Habit` type
that diverges from `types/index.ts` (missing `is_active`), and scopes its queries by
`dog_id` only rather than an explicit owner check. This needs the same kind of
reconciliation `useDogs`/`Dog` just went through — fix it when building the care tracker
phase, and verify its assumptions against the real Supabase schema first rather than
inferring column names from the code, since that's what caused the `useDogs` bug above.

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

### Dependencies added for the pet profile feature
- `@react-native-community/datetimepicker` — date-of-birth picker in `PetFormScreen.tsx`.
  Expo SDK 54 / Expo Go compatible, no prebuild or dev-client rebuild needed. Install/update
  with `npx expo install @react-native-community/datetimepicker` (not raw `npm install`) so
  Expo pins an SDK-compatible version.
- `expo-image-picker` — was already installed but unused; now actively used in
  `PetFormScreen.tsx` to pick a local pet photo (stored as a local URI in `Dog.photo_url`,
  no Supabase Storage upload yet).

### Dependencies added for Google/Apple sign-in + password hardening
- `expo-web-browser`, `expo-auth-session` — Google's web-redirect OAuth flow
  (`lib/hooks/useGoogleSignIn.ts`). Both are bundled in Expo Go; no dev client needed.
- `expo-apple-authentication` — native Apple sign-in (`lib/hooks/useAppleSignIn.ts`).
  Works in Expo Go on iOS per Expo's docs, but currently gated off via
  `APPLE_SIGN_IN_ENABLED = false` in `components/SocialSignInButtons.tsx` pending the
  Apple Developer Program membership decision — Supabase's Apple provider isn't
  configured, so enabling the flag before that's done would ship a button that fails on
  tap.
- `expo-crypto` — SHA-256 nonce hashing required by Apple's native sign-in flow (see the
  nonce-hash/raw-nonce split in `useAppleSignIn.ts`).
- All four installed via `npx expo install <pkg>` per this project's existing
  convention, then required `npm install --legacy-peer-deps` to actually resolve — see
  the peer-dependency note above.
- `app.json` gained `"scheme": "pawcare"` for a future dev-client/standalone build. It
  has no effect on Expo Go's own redirect URI (`exp://127.0.0.1:PORT/--/...`), which
  `makeRedirectUri()` generates automatically regardless of `scheme` while running
  inside Expo Go.

## Things to remember
- Sensitivity/allergy logic is the core differentiator — treat it as first-class, not a side feature
- Chatbot answers should use the pet's stored profile as context, not just generic Q&A
