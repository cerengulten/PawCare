# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
Mobile app for real-world use (not just portfolio) — pet care tracker + AI nutrition/care
chatbot + food allergy management + vet finder. Built by a solo dev (AI/ML engineer
background) using Claude Code.

## Tech stack (target)
- Mobile: React Native + Expo SDK 54 (TypeScript, strict mode)
- Backend: FastAPI (Python) — not yet scaffolded
- DB: PostgreSQL (via Supabase for now)
- Auth: Supabase Auth
- AI chatbot: Claude API + Chroma vector DB (RAG over canine nutrition corpus) — not yet built
- Maps: Google Places API — not yet built

**Expo changes fast across versions.** Check versioned docs at
https://docs.expo.dev/versions/v54.0.0/ before writing Expo-related code — don't rely on training data.

## Current state

**Done:**
- Auth (sign up/sign in), Google sign-in (web-redirect flow), Apple sign-in (native, built but disabled)
- Post-signup onboarding (`OnboardingScreen.tsx`): collects display name, unique username, and >=1 pet before `HomeScreen`
- Pet CRUD from `HomeScreen`: create/edit dog (name, breed, DOB, weight, local photo), list view
- Password strength policy, client-side (`lib/passwordPolicy.ts`)
- Bottom tab navigator (`screens/AppTabs.tsx`): **Pets** / **Habits** / **More** tabs via
  `@react-navigation/native` + `@react-navigation/bottom-tabs`, replacing the old
  "post-auth always renders `HomeScreen`" behavior. Chosen over expo-router's file-based
  routing specifically to avoid restructuring the working auth-gating entry point in
  `App.tsx` — expo-router stays installed but unused (`app/` dir still dead scaffolding).
  No native-stack was introduced: the **Pets** tab reuses `HomeScreen`'s own existing
  internal `mode: 'list' | 'form' | 'detail'` state machine unmodified, so the tab bar
  just stays visible around it. **Habits** is a new top-level screen
  (`screens/HabitsScreen.tsx`) built by reusing `useHabits`/`HabitCard`/`HabitFormScreen`
  the same way `DogDetailScreen` already does; it adds a chip-style dog picker when the
  user has 2+ dogs (no picker shown for 0 or 1 dog). **More** is a static
  `screens/ComingSoonScreen.tsx` stub for Chat/Vet Finder. Tab bar icons are plain emoji
  via `<Text>`, not `@expo/vector-icons` (see Dependencies).

**Not built yet:** meals/walks/vet-visits/meds tracking, reminders, FastAPI backend, RAG chatbot, vet finder. `lib/notifications.ts` is an empty placeholder. Phase 1 is *not* complete.

**Known issues:**
- Google sign-in: has a sign-in problem, not yet diagnosed — revisit before shipping.
- `useHabits.ts`: local `Habit` type diverges from `types/index.ts` (missing `is_active`); queries scope by `dog_id` only, no owner check. Fix when building care tracker — verify against live Supabase schema first, don't infer from code (see `useDogs` bug below).

**Architecture:**
- Entry: `index.ts` -> `App.tsx`. `expo-router` is installed but unused (`app/` dir empty) — navigation is `@react-navigation` (bottom tabs), not file-based routing.
- `App.tsx`: owns auth state (`getSession()`/`onAuthStateChange`), local-state switches Login/Register/`AuthedApp`. Post-auth (and post-onboarding), `AuthedApp` renders `screens/AppTabs.tsx` (the bottom tab navigator) instead of `HomeScreen` directly.
- `HomeScreen.tsx`: unchanged, now embedded as the **Pets** tab's content — same internal local-state pattern (list vs `screens/PetFormScreen.tsx` vs `screens/DogDetailScreen.tsx`).
- Auth gating checks `profile.full_name` being unset (not row existence) — see `useProfile.ts` / `AuthedApp` in `App.tsx`. A `profiles` row exists almost immediately after signup regardless (DB trigger, see below).

**Supabase schema gotchas** (always verify live schema before coding against a table — inferring from code has caused bugs twice):
- `dogs` table: `owner_id` (not `user_id`). No `avatar_emoji`/`is_neutered` cols; has `notes`/`updated_at`. `useDogs.ts` previously queried a nonexistent `user_id` col — errors were swallowed, so the dog list just looked empty. Fixed.
- `profiles` table (pre-existing, undocumented until discovered): `id uuid PK -> auth.users(id)`, `full_name text` (nullable, not `name`), `avatar_url text`, `push_token text`, `created_at` (no `updated_at`). RLS: `auth.uid() = id` on select/insert/update. Trigger `on_auth_user_created` -> `handle_new_user()` auto-inserts a bare row on every signup (`full_name` from `raw_user_meta_data`, null until `OnboardingScreen` sets it). **Always `.upsert()`, never `.insert()`** — row usually already exists. Verify `avatar_url`/`push_token` against live schema before building avatar/notifications features.
- Email confirmation + leaked-password protection: Supabase dashboard toggles, not yet enabled.

**Auth implementation details:**
- `lib/supabase.ts` doesn't set `flowType` -> defaults to `'implicit'`, not `'pkce'` (confirmed from `@supabase/auth-js` source). OAuth redirect returns tokens in the URL **fragment**, not `?code=` — `useGoogleSignIn.ts` uses `setSession()`, not `exchangeCodeForSession()`. Don't switch to PKCE without changing both together.
- Google: web-redirect flow (`expo-web-browser` + `expo-auth-session`) — works in Expo Go.
- Apple: native `expo-apple-authentication` (exception — Expo docs confirm it works in Expo Go on iOS, unlike most native modules). **Disabled** via `APPLE_SIGN_IN_ENABLED` flag in `SocialSignInButtons.tsx` pending Apple Developer Program decision + Supabase provider config.
- Don't move Google to a native SDK without first confirming the project has moved off Expo Go (most native auth modules need a dev client).

## V1 scope — build in this order
1. Auth + pet profile + care tracker (meals, walks, vet visits, meds) + reminders
2. Allergy/sensitivity profile + ingredient conflict flagging
3. AI chatbot (RAG, grounded in pet's own profile + nutrition corpus)
4. Vet finder map (Google Places)

Don't start Phase N+1 until Phase N has a working, testable slice.

## Conventions
- TypeScript strict mode (RN); type hints on all FastAPI endpoints (once it exists)
- Feature-based folders eventually (`/features/tracker`, not type-based `/screens`+`/components`) — current split predates this; migrate incrementally, don't leave new code inconsistent
- FastAPI routes: rely on automatic OpenAPI docs, no separate API docs
- Commit small, working increments — no sweeping multi-feature diffs

## Commands
- `npm run start` / `android` / `ios` / `web` — Expo dev server
- No lint/test scripts configured. `npx tsc --noEmit` for ad hoc type check (strict mode, extends `expo/tsconfig.base`)

## Environment
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (gitignored), read in `lib/supabase.ts`
- New client-exposed env vars must be prefixed `EXPO_PUBLIC_` or they won't inline into the RN bundle

## Dependencies
- `@react-native-community/datetimepicker` — DOB picker in `PetFormScreen.tsx`. Install via `npx expo install`, not raw `npm install`.
- `expo-image-picker` — pet photo picker (local URI, no Storage upload yet)
- `expo-web-browser`, `expo-auth-session` — Google OAuth (bundled in Expo Go)
- `expo-apple-authentication` — native Apple sign-in
- `expo-crypto` — SHA-256 nonce hashing for Apple sign-in
- `@react-navigation/native`, `@react-navigation/bottom-tabs` — bottom tab navigator (`screens/AppTabs.tsx`). Were already present transitively (via `expo-router`'s own deps); `npx expo install` promoted them to direct deps pinned to SDK-54-compatible versions.
- `react-native-screens`, `react-native-safe-area-context` — required peer deps of `@react-navigation/bottom-tabs` (weren't installed at all before). Deliberately **did not** add `react-native-gesture-handler` — it's only a peer dep for stack/drawer gesture interactions, not needed since no native-stack is used.
- `@expo/vector-icons` is **not** installed/used for the tab bar — it's only resolvable nested inside `node_modules/expo/node_modules/@expo/vector-icons`, not from app source, so tab icons use plain emoji via `<Text>` instead. Install it explicitly as a follow-up if real icons are wanted later.
- All installed via `npx expo install <pkg>`, then `npm install --legacy-peer-deps` to resolve — pre-existing peer conflict between pinned `react@19.1.0` and transitive `react-dom@19.2.7` (Expo CLI/web tooling, not app code). Plain `npm install` fails on this regardless of what's being added.
- `app.json` has `"scheme": "pawcare"` for a future dev-client/standalone build — no effect on Expo Go's own redirect URI, which `makeRedirectUri()` generates automatically.

## Things to remember
- Sensitivity/allergy logic is the core differentiator — treat as first-class, not a side feature
- Chatbot answers should use the pet's stored profile as context, not just generic Q&A