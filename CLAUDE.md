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
- Post-signup onboarding (`OnboardingScreen.tsx`): collects display name, unique username, and >=1 pet before `AppTabs`
- Password strength policy, client-side (`lib/passwordPolicy.ts`)
- Bottom tab navigator (`screens/AppTabs.tsx`), **"Option B" redesign** (2026-08-06): **Home** /
  **Pets** / **More** tabs via `@react-navigation/native` + `@react-navigation/bottom-tabs`.
  No standalone Today/Habits tabs anymore — habit add/edit/delete is reached via "+" inside
  the Pets tab, per dog. Tab bar icons are plain emoji via `<Text>`, not `@expo/vector-icons`
  (see Dependencies). `initialRouteName="Home"`.
  - **Home** tab (`screens/HomeScreen.tsx`): dashboard — greeting + avatar, a horizontal-scroll
    per-dog `components/PetSummaryCard.tsx` strip (photo/emoji, name, today's completion-rate
    progress bar, mood), an account-wide streak pill (`useOverallStreak`), and static
    non-interactive placeholder sections (nearby vets, AI nutrition chat bar, community tip)
    — none of those three are wired to anything real yet. Tapping a `PetSummaryCard` calls
    `navigation.navigate('Pets', { dogId })` to jump to that dog in the Pets tab.
  - **Pets** tab (`screens/PetsScreen.tsx`, renamed from the old `HomeScreen.tsx` pet-list
    screen): owns a pet-switcher pill row (green-filled = active, white/bordered = inactive)
    plus a "＋" pill that opens `PetFormScreen` for a new pet. The selected pet persists
    across app reopen via `lib/hooks/useSelectedPet.ts` (AsyncStorage, same pattern the old
    `useTodayViewPreference.ts` used — that hook was deleted, nothing else needs it now).
    `route.params.dogId` (set by Home's tap-through) overrides the persisted selection and is
    cleared via `navigation.setParams` right after being consumed, so it doesn't re-fire on
    unrelated re-renders. Renders `screens/DogDetailScreen.tsx` for whichever dog is selected;
    with 0 dogs it shows an empty-state "add your first pet" prompt instead.
  - `DogDetailScreen.tsx` was substantially rewritten as part of this redesign: hero band
    (photo, name, breed/sex/age, per-dog streak chip from `lib/hooks/usePetStreak.ts`) that
    visually merges into a stat strip (Weight / Today X-of-Y / Habit count) below it; a mood
    card (5-option emoji picker, `useDogMood`, plus a 🕒 icon opening mood history — see
    below); a "Today's habits" list now built from `components/HabitRow.tsx` (SVG ring +
    swipe-to-reveal Edit/Delete/**History** — History is a new third swipe action added to
    `HabitRow.tsx` during this redesign) instead of the old `HabitCard.tsx` (deleted); the
    existing allergen ("food sensitivities") inline-add flow, unchanged functionally; and a
    compact "Vaccines" link row that opens a `vaccine-list` mode (not straight to the add
    form — see follow-up fixes below) — the full cross-dog vaccine list still also lives on
    the More tab.
  - **Follow-up fixes** (post-redesign pass): (1) the cream/brown legacy color palette
    (`#FFF8F0`/`#5C3D22`/`#DEC9AF`/etc.) that several screens never migrated off of was
    replaced with `lib/theme.ts` tokens app-wide, including the whole auth flow
    (`App.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`, `OnboardingScreen.tsx`,
    `SocialSignInButtons.tsx`) and the habit/vaccine screens (`HabitFormScreen.tsx`,
    `HabitQuickAddScreen.tsx`, `VaccineFormScreen.tsx`, `HabitHistoryScreen.tsx`) — every
    screen in the app now shares one palette. (2) `DogDetailScreen.tsx`'s "Vaccines" link
    used to jump straight into `VaccineFormScreen` in create mode with no way to see the
    dog's own upcoming/overdue vaccines from the Pets tab; it now opens a `vaccine-list`
    mode (reusing `components/VaccineCard.tsx`) with tap-to-edit and its own "+ Add
    vaccine" button, and the form's `onDone`/`onCancel` return to that list instead of all
    the way back to `detail`. (3) Mood tracking gained a history view — `dog_moods` already
    stored one row per dog per day, but there was no way to *see* past days, only log
    today's. New `lib/hooks/useMoodHistory.ts` (modeled on `useHabitHistory.ts`) plus new
    `screens/MoodHistoryScreen.tsx` (a read-only month calendar showing the logged mood
    emoji per day, modeled on `HabitHistoryScreen.tsx`'s calendar), opened via the 🕒 icon
    next to "How is {name} today?" on `DogDetailScreen.tsx`. `DogDetailScreen`'s `Mode`
    union gained `'vaccine-list'` and `'mood-history'` for these two.
  - **More** tab (`screens/MoreScreen.tsx`, renamed from `ComingSoonScreen.tsx`): profile
    card, a new "Upcoming" section listing vaccines across *all* dogs sorted by due date (via
    `lib/hooks/useAllVaccines.ts`, dog-name-suffixed `VaccineCard` rows — a hooks-in-a-loop
    hazard was avoided by having the hook do one `vaccine_records` query + one `dogs` query
    and joining client-side, rather than calling `useVaccines(dogId)` once per dog), a
    "Coming soon" card (Vet Finder / AI Care Chat / Allergy Scanner / Community, all
    disabled), and Settings (notifications placeholder, sign out — sign-out now lives only
    here, not on the Pets tab).
  - The old `TodayScreen.tsx` (per-dog daily habit dashboard) and `components/DogTodayCard.tsx`
    were deleted; their ring-based habit rows and mood-picker UI were ported into
    `DogDetailScreen.tsx` instead of kept as a separate screen/component.
  - `lib/theme.ts` gained `colors.textDark`, `colors.streakAccent`/`streakAccentBg`, and
    `colors.communityBlueBg`/`communityBlueText` for this pass; `lib/vaccineDisplay.ts` is a
    new pure (non-React) module holding the due-date formatting helpers that used to live
    only inside `components/VaccineCard.tsx`, so `MoreScreen.tsx`'s Upcoming section can reuse
    them without duplicating date math.
- Habit tracker redesign: habits are now typed via `habit_type` (`feeding` / `water` /
  `walking` / `medication` / `vitamin` / `custom`) instead of pure free-text, added through a
  quick-add preset menu (`screens/HabitQuickAddScreen.tsx`) before `HabitFormScreen.tsx`.
  `category` is derived automatically from `habit_type`, no longer user-picked. Feeding/
  Walking/Medication/Vitamin (and Custom, opt-in via toggle chips) support a "times per day"
  count with one reminder time per occurrence (`reminder_times`/`notification_ids`, both
  arrays). Reminders now actually schedule recurring local notifications via
  `lib/notifications.ts`'s `scheduleHabitReminder`/`cancelHabitReminder` (daily, or weekly
  with a chosen weekday) — previously stored but inert. Schema in
  `supabase/sql/2026-07-21_habit_types.sql`.
- `habit_completions` gained an `occurrence_count` column (`supabase/sql/2026-07-22_habit_completion_occurrences.sql`,
  with a one-time backfill for pre-existing rows) so a habit's daily progress can be a count,
  not just presence/absence. The unique index on `(habit_id, owner_id, completed_date)` is
  unchanged — still one row per habit per day, now carrying a count. `useHabits.ts`'s
  `completedToday`/`completionRate` are unchanged in external contract (derived from the new
  `completedCounts` map via a new exported `getHabitTarget(habit)` helper), so
  `HabitsScreen`/`DogDetailScreen`/`HabitCard` needed zero code changes. New exported
  `logOccurrence`/`undoOccurrence` call atomic `increment_habit_completion`/
  `decrement_habit_completion` Postgres RPCs (not plain client upserts) — supabase-js has no
  relative `column = column + 1` update primitive, so client-computed "+1" writes would be
  racy under rapid double-taps.

**Not built yet:** vet-visits tracking, FastAPI backend, RAG chatbot, vet finder.

**Phase 1 ("Option B" redesign, 2026-08-06) is complete.** Four items carried over into
Phase 2 rather than blocking closeout — see "Phase 2 to-do list" below: Google sign-in bug
diagnosis, Supabase dashboard toggles (email confirmation + leaked-password protection),
a full manual end-to-end pass, and the `v1.0` commit/tag.

**Known issues:**
- Google sign-in: has a sign-in problem, not yet diagnosed — revisit before shipping.
- `DogDetailScreen.tsx` (Pets tab) and `components/PetSummaryCard.tsx` (one instance per dog
  on the Home tab strip) each run their own independent `useHabits`/`useDogMood` instance for
  the same dog when both tabs have been visited — mitigated with a `useIsFocused`-driven
  refetch on screen focus, not a full shared cache, so brief staleness is still possible
  (React Navigation's bottom-tabs keep visited tabs mounted). Same caveat as the pre-redesign
  version of this note, just with different screens/components involved.

**Architecture:**
- Entry: `index.ts` -> `App.tsx`. `expo-router` is installed but unused (`app/` dir empty) — navigation is `@react-navigation` (bottom tabs), not file-based routing.
- `App.tsx`: owns auth state (`getSession()`/`onAuthStateChange`), local-state switches Login/Register/`AuthedApp`. Post-auth (and post-onboarding), `AuthedApp` renders `screens/AppTabs.tsx` (the bottom tab navigator).
- `screens/HomeScreen.tsx` is the **Home** tab (dashboard) and `screens/PetsScreen.tsx` is the **Pets** tab (pet switcher + detail) — these are two separate files/purposes now; don't confuse them with each other or with the pre-redesign `HomeScreen.tsx` (which used to mean "pet list" and was renamed to `PetsScreen.tsx`).
- All screens share one palette via `lib/theme.ts`'s `colors`/`radii` exports — always import
  from there instead of hardcoding hex values, including in new auth/form screens.
- Auth gating checks `profile.full_name` being unset (not row existence) — see `useProfile.ts` / `AuthedApp` in `App.tsx`. A `profiles` row exists almost immediately after signup regardless (DB trigger, see below).

**Supabase schema gotchas** (always verify live schema before coding against a table — inferring from code has caused bugs twice):
- `dogs` table: `owner_id` (not `user_id`). No `avatar_emoji`/`is_neutered` cols; has `notes`/`updated_at`. `useDogs.ts` previously queried a nonexistent `user_id` col — errors were swallowed, so the dog list just looked empty. Fixed.
- `profiles` table (pre-existing, undocumented until discovered): `id uuid PK -> auth.users(id)`, `full_name text` (nullable, not `name`), `avatar_url text`, `push_token text`, `created_at` (no `updated_at`). RLS: `auth.uid() = id` on select/insert/update. Trigger `on_auth_user_created` -> `handle_new_user()` auto-inserts a bare row on every signup (`full_name` from `raw_user_meta_data`, null until `OnboardingScreen` sets it). **Always `.upsert()`, never `.insert()`** — row usually already exists. Verify `avatar_url`/`push_token` against live schema before building avatar/notifications features.
- `habits` table: `category` has a check constraint allowing only `feeding` / `walk` / `medication` / `grooming` / `training` / `vaccine` / `other` — **not** `health`/`exercise`, which the original `Habit` type wrongly assumed (caused a live constraint-violation error before being caught). `category` is now derived from `habit_type`, not user-chosen, so this is handled in one place (`HabitFormScreen.tsx`'s `HABIT_TYPE_CATEGORY` map).
- Email confirmation + leaked-password protection: Supabase dashboard toggles, not yet enabled (Phase 2 item 2).

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

## Phase 2 to-do list
Work through these one at a time, in plan mode. Anything touching Supabase must verify the
live schema first, per "Supabase schema gotchas" below — inferring from code has already
caused bugs twice.

**Carried over from Phase 1 (unfinished):**
1. Diagnose + fix the Google sign-in bug
2. Enable email confirmation + leaked-password protection in the Supabase dashboard (manual, not code)
3. Full Phase 1 end-to-end manual test (signup → onboarding → add pet → add habit → log completion → set mood → check More tab upcoming)
4. Commit current working tree + tag `v1.0`

**New Phase 2 items:**
5. Allergy profile per dog — full CRUD for food sensitivities (verify live schema first; give SQL if a new table is needed; `owner_id` pattern)
6. Ingredient scanner — user inputs a food/ingredient, app flags conflicts against the dog's sensitivity profile, using Open Food Facts API as the data source plus a "dangerous for dogs" filter layer on top
7. Ingredient scan history per dog, stored in Supabase
8. Visual conflict result screen — safe / warning / danger states
9. Poop tracker — log consistency, color, frequency per dog (new `health_logs` table: `dog_id`, `owner_id`, `type`, `details`, `logged_at` — verify live schema first, give SQL)
10. Vomit tracker — log occurrence, description, possible cause (reuse `health_logs`)
11. Symptom history view per dog — timeline of poop + vomit logs
12. Mood history view per dog — calendar or timeline (`MoodHistoryScreen.tsx`/`useMoodHistory.ts` already exist from Phase 1 — check before rebuilding)
13. Food/meal log history view
14. Export mood history as CSV/Excel (`expo-sharing` + CSV generation; start with CSV, upgrade to `.xlsx` only if needed)
15. Export food + health log as CSV/Excel
16. Export vet/vaccine history as PDF
17. "Download report" button — add to pet profile and/or More tab
18. Conflict warning badge on food sensitivity card when the scanner finds a match
19. Full Phase 2 end-to-end test: add allergy → scan ingredient → log poop/vomit → view history → export report
20. Update CLAUDE.md with Phase 2 schema decisions and new tables
21. Commit and tag `v2.0`

## Conventions
- TypeScript strict mode (RN); type hints on all FastAPI endpoints (once it exists)
- Feature-based folders eventually (`/features/tracker`, not type-based `/screens`+`/components`) — current split predates this; migrate incrementally, don't leave new code inconsistent
- FastAPI routes: rely on automatic OpenAPI docs, no separate API docs
- Commit small, working increments — no sweeping multi-feature diffs

## Commands
- `npm run start` / `android` / `ios` / `web` — Expo dev server
- No lint/test scripts configured. `npx tsc --noEmit` for ad hoc type check (strict mode, extends `expo/tsconfig.base`)
- **"Unable to resolve X" bundling error right after installing a new native dependency, even though the file demonstrably exists on disk and `npx expo start -c` was already tried:** the on-disk Metro cache isn't the only cache — Metro's `jest-worker` transform-worker child processes cache transformed files in their own process memory, separate from disk. If the *old* `expo start` server process (and its worker children) is still running from before the install, `-c` on a *new* invocation doesn't touch it. On Windows: `wmic process where "name='node.exe'" get ProcessId,CommandLine` to find the stale `expo start`/`jest-worker` PIDs, `taskkill //PID <pid> //T //F` each, then start fresh. Confirmed fix (2026-07-22, `react-native-svg` install) — a clean `npx expo export` in a brand-new process bundled fine while the stale dev server kept failing on the same file.

## Environment
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (gitignored), read in `lib/supabase.ts`
- New client-exposed env vars must be prefixed `EXPO_PUBLIC_` or they won't inline into the RN bundle

## Dependencies
- `@react-native-community/datetimepicker` — DOB picker in `PetFormScreen.tsx`. Install via `npx expo install`, not raw `npm install`.
- `react-native-svg` — circular progress rings on the Today tab (`components/ProgressRing.tsx`), used via the JS `Svg`/`Circle` primitives, not `.svg` file imports (no `react-native-svg-transformer`/metro changes needed). Expo-Go compatible, no dev client required.
- `expo-image-picker` — pet photo picker (local URI, no Storage upload yet)
- `expo-web-browser`, `expo-auth-session` — Google OAuth (bundled in Expo Go)
- `expo-apple-authentication` — native Apple sign-in
- `expo-crypto` — SHA-256 nonce hashing for Apple sign-in
- `@react-navigation/native`, `@react-navigation/bottom-tabs` — bottom tab navigator (`screens/AppTabs.tsx`). Were already present transitively (via `expo-router`'s own deps); `npx expo install` promoted them to direct deps pinned to SDK-54-compatible versions.
- `react-native-screens`, `react-native-safe-area-context` — required peer deps of `@react-navigation/bottom-tabs` (weren't installed at all before).
- `react-native-gesture-handler` — added during the Option B redesign for `HabitRow.tsx`'s
  `Swipeable` (swipe-to-reveal Edit/Delete/History). Not needed for navigation itself (no
  native-stack/drawer in use) — it's here purely for the swipe gesture on habit rows.
- `@expo/vector-icons` is **not** installed/used for the tab bar — it's only resolvable nested inside `node_modules/expo/node_modules/@expo/vector-icons`, not from app source, so tab icons use plain emoji via `<Text>` instead. Install it explicitly as a follow-up if real icons are wanted later.
- All installed via `npx expo install <pkg>`, then `npm install --legacy-peer-deps` to resolve — pre-existing peer conflict between pinned `react@19.1.0` and transitive `react-dom@19.2.7` (Expo CLI/web tooling, not app code). Plain `npm install` fails on this regardless of what's being added.
- `app.json` has `"scheme": "pawcare"` for a future dev-client/standalone build — no effect on Expo Go's own redirect URI, which `makeRedirectUri()` generates automatically.

## Things to remember
- Sensitivity/allergy logic is the core differentiator — treat as first-class, not a side feature
- Chatbot answers should use the pet's stored profile as context, not just generic Q&A