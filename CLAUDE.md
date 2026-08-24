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
    `HabitRow.tsx` during this redesign) instead of the old `HabitCard.tsx` (deleted); a
    "Food sensitivities" section (superseded by full CRUD in Phase 2 item 5, see below); and a
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
- **Phase 2 item 5 — Allergy profile per dog, full CRUD (2026-08-06):** food sensitivities
  were normalized out of the flat `dogs.allergens text[]` column into their own
  `dog_allergens` table (`id`/`dog_id`/`owner_id`/`allergen`/`created_at`, owner-scoped RLS,
  case-insensitive unique index on `(dog_id, lower(allergen))`), schema in
  `supabase/sql/2026-08-06_dog_allergens_table.sql` (includes a one-time backfill from the
  old array column). `dogs.allergens` is left in place but unused — drop it in a future
  cleanup migration once confirmed unused in prod. New `lib/hooks/useAllergens.ts`
  (`addAllergen`/`updateAllergen`/`deleteAllergen`, modeled on `useDogs.ts`) is the only
  thing that reads/writes this table. `Dog.allergens` was removed from the `Dog` type; new
  `Allergen` type added.
  - UI: add/edit/delete go through a new dedicated `screens/AllergenFormScreen.tsx` (modeled
    on `VaccineFormScreen.tsx` — `KeyboardAvoidingView`+`ScrollView`, Save/Cancel, and a
    "Delete sensitivity" link in edit mode), opened from `DogDetailScreen.tsx` via a new
    `'allergen-form'` `Mode` — tapping "＋ Add" opens it in create mode, tapping a chip opens
    it pre-filled in edit mode. The first version of this UI used an inline add row + a
    long-press `Alert.alert` edit/delete menu; both were replaced after real usage showed the
    inline row's keyboard covered the input with no way to scroll, and the native Alert
    couldn't be themed. **This is now the standard pattern for per-item CRUD in this app** —
    default to a dedicated `<Thing>FormScreen.tsx` styled like `VaccineFormScreen.tsx`, not
    inline-editable rows or Alert-based menus, for any future list-item CRUD (e.g. Phase 2
    items 9–11's poop/vomit tracker).
  - `PetFormScreen.tsx`'s separate pre-creation allergen add/remove UI (local state only,
    never persisted independently) was removed — sensitivities are now managed in exactly
    one place, `DogDetailScreen.tsx`, post pet-creation.
- **Phase 2 item 8 — Poop tracker (2026-08-07):** first health-tracking feature beyond mood,
  and the first table with a `jsonb` column. New `health_logs` table
  (`id`/`dog_id`/`owner_id`/`type`/`details`/`notes`/`logged_at`, owner-scoped RLS, `type`
  check-constrained to `'poop' | 'vomit'` so the vomit tracker — item 9, not built yet — can
  reuse this table without a schema change), schema in
  `supabase/sql/2026-08-07_health_logs.sql`. Only `'poop'` rows are written today. New
  `types/index.ts` types: `PoopConsistency`, `PoopColor`, `PoopLogDetails` (the concrete
  shape of the jsonb `details` column — typed as a real object, not `Record<string,
  unknown>`, to keep the form/card code type-checked, since jsonb is a one-off exception in
  an otherwise fully flat-typed schema), and `HealthLog`. New
  `lib/hooks/useHealthLogs.ts` (`addLog`/`updateLog`/`deleteLog`, modeled on
  `useVaccines.ts` minus its notification side effects, filtered to `.eq('type', 'poop')` so
  a future vomit hook/list doesn't leak into this one, ordered `logged_at desc`).
  - UI: `screens/PoopFormScreen.tsx` follows the standard dedicated-form CRUD pattern (see
    Phase 2 item 5 above) — consistency and color are chip-style single-select rows (visual
    language borrowed from `DogDetailScreen.tsx`'s mood-picker grid, but `flexWrap` chips
    instead of a fixed 5-across row, since these option sets don't share the mood grid's
    exact-5-icon assumption), frequency is a numeric `TextInput`. New
    `components/PoopLogCard.tsx` (modeled on `VaccineCard.tsx`'s dot+info+chip row) colors by
    consistency severity (solid=green, soft=amber, liquid/mucus=red) using only existing
    `lib/theme.ts` tokens — no new colors added. `DogDetailScreen.tsx` gained `'health-list'`
    (full reverse-chronological list, mirrors `'vaccine-list'`) and `'poop-form'` modes, plus
    a "Health logs" section on the main detail view (capped 3-entry preview + "See all" link
    once there are more, same shape as "Food sensitivities" but with an overflow link since
    entries can grow unbounded over time). This section/mode/title was later renamed to
    "Poop Tracker" (see item 9 below) to make room for a parallel vomit section.
- **Phase 2 item 9 — Vomit tracker (2026-08-10):** mirrors the poop tracker's structure
  exactly. New `VomitLogDetails` type in `types/index.ts` — `severity` chip (mild/moderate/
  severe), `possibleCause` chip grid (food/motion/ate_too_fast/hairball/foreign_object/
  unknown), numeric `frequency` — `HealthLog.details` is now a
  `PoopLogDetails | VomitLogDetails` union, discriminated by `HealthLog.type` (code reading
  `.details` fields must narrow on `type` first). New `lib/hooks/useVomitLogs.ts`
  (duplicated from `useHealthLogs.ts` rather than parameterized — matches this app's
  one-hook-per-domain convention, e.g. `useVaccines`/`useAllergens`/`useDogMood`), new
  `components/VomitLogCard.tsx` and `screens/VomitFormScreen.tsx` (both modeled on their poop
  equivalents). `DogDetailScreen.tsx` gained `'vomit-list'`/`'vomit-form'` modes and its own
  "Vomit Tracker" section, parallel to and independent from Poop Tracker's. No SQL migration
  needed — `health_logs.type` already allowed `'vomit'` (built in ahead of time, see item 8).
  Naming went through two rounds of feedback: "Log poop"/"Log vomit" button labels became
  "+ Add", section/screen titles became "Poop Tracker"/"Vomit Tracker" (replacing the
  original "Health logs" title from item 8), and form titles/delete-links/empty-states
  settled on bare-subject wording ("Add Poop"/"Edit Poop"/"Delete"/"No Poop Logged Yet.")
  after "entry" and "log" were both explicitly rejected. **This is now the established
  wording pattern for this feature — don't reintroduce "entry" or "log" into its UI copy.**
- **Phase 2 item 10 — Symptom History (2026-08-10):** new `screens/SymptomHistoryScreen.tsx`,
  reachable via a "🕒 Symptom History" link row on `DogDetailScreen.tsx`'s main view (new
  `'symptom-history'` mode) — merges `useHealthLogs`/`useVomitLogs` into one cross-symptom
  view without changing either hook or the per-type Poop/Vomit Tracker sections, which stay
  as-is for reviewing/editing one symptom type at a time. Went through two design passes: v1
  was a flat date-grouped list (Today/Yesterday/dated headers) reusing `PoopLogCard`/
  `VomitLogCard`; v2 (current, from a supplied HTML mockup) replaced that with a month
  calendar — Sunday-first grid (matching `MoodHistoryScreen.tsx`'s convention, not the
  mockup's Monday-first layout), each day cell colored amber/red/purple for poop/vomit/both
  with emoji indicators, tap-to-select shows that day's entries in a dedicated bigger-emoji
  row layout (intentionally not reusing the tracker cards — visually distinct by design),
  plus a "this week" stat strip (poop/vomit counts, most-common stool consistency). New
  `colors.symptomBothBg`/`symptomBothText` tokens added to `lib/theme.ts` for the "both
  logged" purple day state — everything else in this screen reuses existing tokens (no other
  new colors). Tapping a day's entry still opens `PoopFormScreen`/`VomitFormScreen`
  pre-filled for editing — `DogDetailScreen.tsx`'s `logSource` state (`'list' | 'history'`)
  tracks which entry point a form was opened from so Save/Cancel/Delete route back to
  Symptom History instead of the per-type list when applicable, then resets to `'list'` so
  the value can't leak into unrelated flows. The header's download/export button is a
  placeholder (`Alert.alert('Export', 'Coming soon!')`) — CSV/PDF export is items 13–16, not
  built yet.
- **Phase 2 item 11 — Mood History v2 rebuild (2026-08-10):** `screens/MoodHistoryScreen.tsx`
  already existed from Phase 1 but was still the original read-only, no-stats calendar
  pattern; rebuilt to match the `SymptomHistoryScreen.tsx` v2 pattern established by item 10 —
  tappable day cells with a `dayCellSelected` state, an out-of-month dimmed-day-number grid
  (no more blank padding cells), a today-dot, a selected-day detail panel below the calendar,
  a "this month" stat strip (days logged, most common mood, current logging streak), an
  empty-state message when a dog has zero mood logs, and the same export-icon stub
  (`Alert.alert('Export', 'Coming soon!')`) as `SymptomHistoryScreen.tsx`. No changes to
  `lib/hooks/useMoodHistory.ts` or `DogDetailScreen.tsx`'s `'mood-history'` wiring — this was
  a UI-only rebuild, same props/mode.
- **Phase 2 item 12 — Meal detail + history, "Option C" (2026-08-10):** first pass built a
  standalone Food Log feature (reusing `health_logs` with a `'food'` type, its own
  list/form/calendar-history screens) modeled on the poop/vomit pattern — this was reverted
  in favor of a lighter approach the user redirected to instead. Feeding stays a plain
  quick-tick habit like any other; what changed is that once a `habit_type: 'feeding'` habit
  is ticked done for the day, a "+ Add meal detail" text link appears under that habit's row
  (`components/MealDetailLink.tsx`), opening a compact bottom sheet
  (`components/MealDetailSheet.tsx`) to optionally record food type (wet/dry/mixed/raw,
  required) and per-type amount/brand — all optional beyond food type. Detail is purely
  additive and keyed to that day's `habit_completions` row, not a new standalone log: new
  `meal_details` table (see schema below), one row per completion via a unique index on
  `completion_id`, `lib/hooks/useMealDetails.ts` (modeled on `useAllergens.ts` — fetches all
  of a dog's `meal_details` once into local state; `addMealDetail` upserts on
  `completion_id` so reopening the sheet on an already-detailed day edits in place rather than
  erroring on the unique constraint). `useHabits.ts` gained a `completionIds: Map<habitId,
  completionId>` (added to `fetchCompletions`'s select, plus a new `fetchCompletionId` helper
  called after `toggleCompletion`/`logOccurrence`/`undoOccurrence` succeed) so the sheet has a
  live completion id to attach to immediately after a tick, without waiting for the
  `isFocused`-driven refetch — this is a read-only addition; `logOccurrence`/`undoOccurrence`
  and the `increment_habit_completion`/`decrement_habit_completion` RPCs themselves are
  unchanged. **"Option C" is this app's established pattern now for annotating an existing
  tick/completion with optional richer detail** (vs. the dedicated-FormScreen-CRUD pattern
  from items 8–9, which is for logging events that aren't already tracked elsewhere) — reuse
  it for similar future needs (e.g. medication dosage-given notes) rather than building a new
  standalone log.
  - The original single `amount_grams`/`brand` columns didn't support mixed meals (wet and
    dry portions need separate amounts/brands), so the schema was split into
    `wet_amount_grams`/`brand_wet`, `dry_amount_grams`/`brand_dry`, and
    `raw_amount_grams`/`brand_raw` (raw got its own pair rather than being folded into wet or
    dry — it's a distinct food type, not a variant of either). Migrated via
    `2026-08-12_meal_details_split_amounts.sql` (add columns + backfill: direct copy for
    single-type rows, `amount_grams / 2` even split for `mixed` rows, old single `brand`
    copied into both `brand_wet`/`brand_dry` for `mixed` as a starting guess) then
    `2026-08-13_meal_details_drop_old_amount_brand.sql` (drops the old columns, run only
    after confirming the backfill). `MealDetailSheet.tsx` shows only the relevant field(s) per
    selected food type (wet → wet fields, dry → dry fields, raw → raw fields, mixed → wet and
    dry side by side); switching food type nulls out the now-irrelevant fields on save.
  - `screens/MealHistoryScreen.tsx` (new `'meal-history'` mode) is the history view: reachable
    via a "Meal history →" link row below "Today's habits" on `DogDetailScreen.tsx`'s main
    view, shown only once the dog has any `meal_details` rows. Food-type filter pills (All/
    Wet/Dry/Mixed/Raw), a "this week" stat strip (avg daily intake in grams — summed across
    wet+dry+raw and divided by distinct days logged, most common food type, days logged out
    of 7), a Mon–Sun weekly intake bar chart (bar width relative to that week's max day,
    green if that day's total is at/above the week's average, amber if below, gray dash for
    days with nothing logged — this screen's own Monday-first week window, kept local; every
    other calendar screen in the app stays Sunday-first), and a date-grouped
    ("Today"/"Yesterday"/`Aug 9`) entry list newest-first. Each entry is its own card: emoji +
    a display-only "meal name" (Breakfast/Lunch/Dinner/Snack, derived from `logged_at`'s hour
    — not stored, `meal_details` has no name column) + type chip, colored amount pill(s) (one
    for single-type entries, wet+dry side by side for `mixed`), and a brand row shown only
    when a brand was logged. Swipe-left reveals Edit + Delete (same `Swipeable`-from-
    `react-native-gesture-handler` two-action pattern as `HabitRow.tsx`; Delete confirms via
    `Alert.alert`) and tapping an entry does the same as Edit — both reopen
    `MealDetailSheet.tsx` pre-filled, saving via the same `addMealDetail` upsert used
    everywhere else. The export button in the header is a disabled/grayed-out icon only — not
    wired up, a separate future task. Chip/dot colors were matched to a supplied mockup by
    mapping its hexes onto the closest existing `lib/theme.ts` tokens rather than adding new
    ones (wet -> `communityBlueBg`/`communityBlueText`, dry -> `pendingAmberBg`/
    `pendingAmberText`, mixed -> `symptomBothBg`/`symptomBothText`, raw -> `moodSelectedBg`/
    `primaryGreen`). `FOOD_TYPE_EMOJI` (🥩 wet / 🌾 dry / 🥣 mixed / 🥚 raw) is this feature's
    canonical emoji set, also used by `MealDetailLink.tsx`.
- **Phase 2 item 13 — Mood history PDF export (2026-08-11):** the download icon on
  `screens/MoodHistoryScreen.tsx` generates a styled PDF report (first PDF feature in the
  app), matching a supplied mockup, "Option 1: rich single sheet" — a green title bar, a
  dog-info header block (name/breed+sex/age+weight/owner/period/exported-date), a
  Date/Day/Mood/Emoji table sorted newest-first with per-row mood-colored text, and a tan
  summary footer (most common mood, days logged out of period, concerning-days count,
  generated-by line). This started as a CSV export (same data/structure) but CSV can't carry
  cell colors — Excel/Sheets/Numbers render `.csv` as plain black-on-white text regardless of
  any styling — so it was redone as a real styled document once that limitation came up. No
  Notes column — `dog_moods` has no `notes` column anywhere in the schema and mood logging
  has no notes UI, so the mockup's Notes column was dropped rather than shipped as an
  always-empty placeholder. Export covers the same 90-day window (`HISTORY_DAYS`) already
  loaded for the calendar, unchanged. Owner info comes from the existing `useProfile()` hook
  (`full_name`/`username`); age comes from `computeAge(birthDate)`, a helper extracted out of
  `DogDetailScreen.tsx` into a new shared `lib/petAge.ts` (pure function, same logic/output
  as before — `DogDetailScreen.tsx` now imports it instead of defining it locally).
  New `lib/pdfExport.ts` (`shareHtmlAsPdf(filename, html)`) builds the PDF via `expo-print`'s
  `Print.printToFileAsync({ html })`, renames the result to the desired filename using the
  same `expo-file-system` `File`/`Paths` API `lib/csvExport.ts` already uses (`expo-print`
  doesn't let you control its output filename directly), then shares it via `expo-sharing`
  — same pattern as `shareCsv`, different mime type. The HTML template reuses `lib/theme.ts`
  color tokens wherever they exact-match the mockup's hexes (title bar/info block/table
  header/summary footer all have exact-match tokens) rather than a separate print-only
  palette; the two mood-accent hexes without an exact token (`good`/`great`) fall back to the
  closest existing tokens (`primaryGreen`, `communityBlueText`) instead of adding new one-off
  colors for a single template. Filename is `<DogName>_mood_history_<MonthAbbrev><Year>.pdf`
  keyed off the **newest** logged entry's month/year (not today's date, not a date range) —
  e.g. `Deneme_mood_history_Aug2026.pdf`. The download button shows an `ActivityIndicator`
  and disables itself while the PDF is being built/shared, to prevent double-tap
  double-shares. (`lib/csvExport.ts` from the first version of this feature is unused now
  that item 14 also became PDF — left in place rather than deleted, in case a future CSV need
  comes up, but nothing currently imports it.)
- **Phase 2 item 14 — Meal + Symptom history PDF export (2026-08-11):** the download buttons
  on `screens/MealHistoryScreen.tsx` (previously a permanently-disabled `View`, not tappable)
  and `screens/SymptomHistoryScreen.tsx` (previously `Alert.alert('Export', 'Coming soon!')`)
  now generate the same style of report PDF as mood history, covering the dog's **entire**
  history for that log type (unlike mood's 90-day cap — `useMealDetails`/`useHealthLogs`/
  `useVomitLogs` have no date-window limit, so "export what the screen already has loaded"
  means the full history here). Since this made three screens building the identical
  title-bar/info-block/table/summary-footer HTML shell, that shell was extracted into a new
  `lib/pdfReport.ts` (`buildReportHtml({ title, infoRows, tableHeaders, tableRowsHtml,
  summaryRows })`) — each screen still builds its own colored `<tr>` markup (mood colors by
  mood, symptom colors by poop/vomit type) and passes it in as `tableRowsHtml`, since coloring
  logic differs per report; `MoodHistoryScreen.tsx` was refactored to call this builder too
  instead of keeping its own copy of the CSS. `lib/pdfExport.ts` (`shareHtmlAsPdf`) is
  unchanged and shared by all three. Meal History's table (Date/Time/Meal/Type/Amount/Brand)
  reuses `MealHistoryScreen.tsx`'s existing `mealNameFor`/`amountPillsFor`/`formatBrands`/
  `mostCommon`/`totalGrams` helpers verbatim rather than re-deriving any of that formatting;
  Symptom History's table (Date/Time/Type/Details/Frequency/Notes) merges `logs` (poop) +
  `vomitLogs` sorted newest-first, and adds a local `CAUSE_LABEL` map (duplicated from
  `components/VomitLogCard.tsx`, matching this app's per-screen label-map duplication
  convention). Both new exports call `useProfile()` locally for owner info, same as mood.
  Filenames follow the same `<DogName>_<subject>_<MonthAbbrev><Year>.pdf` convention:
  `meal_history` and `symptom_history`.
- **Phase 2 item 15 — Vaccine history PDF export (2026-08-24):** unlike Mood/Meal/Symptom,
  there's no dedicated `VaccineHistoryScreen.tsx` — vaccine data only lives inline in
  `screens/DogDetailScreen.tsx`'s `'vaccine-list'` mode, so rather than building a new
  screen, that mode's header was restructured from a plain title/subtitle into the same
  `header`/`headerLeft`/download-icon row layout the History screens use, and a
  `handleExportVaccines` function was added following the same `lib/pdfReport.ts` +
  `lib/pdfExport.ts` convention as items 13–14 (new `exportingVaccines` state gates the
  `ActivityIndicator`/disabled behavior, same as the other three). Table columns are
  Vaccine/Date Given/Next Due/Status/Notes — Status is colored using the same tri-state
  scheme as `components/VaccineCard.tsx`/`lib/vaccineDisplay.ts` (red `Overdue`, amber
  `Soon` within 30 days via `daysAway`, green `Scheduled`), reusing `daysAway`/`formatDate`
  from `lib/vaccineDisplay.ts` rather than re-deriving date math. Vaccines have no natural
  "period" the way backward-looking logs do (`next_due_date` skews into the future), so
  `infoRows` drops the Period row from the mood/meal/symptom template and `summaryRows`
  reports counts instead (total tracked / overdue / upcoming in next 30 days). Filename is
  keyed off **today's date**, not a "newest entry" date like the other three exports —
  `<DogName>_vaccine_history_<MonthAbbrev><Year>.pdf`. No schema or hook changes —
  `useVaccines(dog.id)`'s existing `overdue`/`upcoming` (both ordered by `next_due_date`,
  no date-window limit) already had everything needed.
- **Phase 2 item 16 — Consolidated "Download report" button (2026-08-24):** a new
  `screens/ReportPickerScreen.tsx` (`{ dog, onBack }` props) renders a 5-row list (Mood /
  Meal / Symptom / Vaccine / All Reports) so exporting no longer requires navigating into
  each history screen to find its own download icon. First built inline in
  `DogDetailScreen.tsx`, then moved to the **More** tab per user feedback — `MoreScreen.tsx`
  has no single-dog context (it aggregates across all dogs), so it gained a "Download
  report" section with one row per dog (`{dog.name}`, tapping it mode-swaps to
  `<ReportPickerScreen dog={dog} onBack={...} />` via a new `reportDog: Dog | null` state,
  same "mode swap as pseudo-screen" pattern as `showNotifPlaceholder`); the section is
  omitted entirely when `dogs.length === 0`. `DogDetailScreen.tsx` has no report UI of its
  own. `ReportPickerScreen.tsx` owns its own hook instances scoped to its `dog` prop
  (`useMoodHistory(dog.id, 90)` — same 90-day window `MoodHistoryScreen.tsx` uses —
  `useMealDetails`, `useHealthLogs`, `useVomitLogs`, `useVaccines`, `useProfile`), separate
  from any instances `DogDetailScreen.tsx` holds for the same dog (same duplicate-hook-
  instance caveat already noted under "Known issues"). New `lib/reportBuilders.ts` holds
  pure, React-free `buildMoodReport`/`buildMealReport`/`buildSymptomReport`/
  `buildVaccineReport` functions (each returns a table/summary bundle or `null` when there's
  no data) plus a shared `buildDogInfoRows(dog, profile)` for the name/breed/age·weight/owner
  rows every report needs. Mood/Meal/Symptom's builders are *new* standalone implementations
  that import their host screens' now-`export`ed formatting helpers/label maps (e.g.
  `MOOD_LABEL`, `amountPillsFor`, `CAUSE_LABEL`) rather than refactoring those three
  screens' own working `handleExport` functions — deliberately duplicating the report-shape
  logic once, matching this app's existing per-domain-duplication convention (see
  `useVomitLogs` vs `useHealthLogs`), so the three already-shipped download buttons keep
  working completely unchanged. Vaccine is the one exception: its export logic already lived
  in `DogDetailScreen.tsx`'s `handleExportVaccines`, which was refactored to call the new
  `buildVaccineReport` instead of duplicating it a second time. The "All Reports" option
  calls all four builders, drops the `null` ones, and renders them through a new
  `buildMultiSectionReportHtml` in `lib/pdfReport.ts` (same title-band/info-block shell as
  the existing single-table `buildReportHtml`, but repeats a heading+table+summary block per
  section, with a "No entries yet" placeholder for report types with zero data) — filename
  `<DogName>_full_report_<MonthAbbrev><Year>.pdf`, keyed off today's date like the vaccine
  export (a combined report has no single natural "newest entry" date). A single
  `exportingReport: ReportKey | null` state (rather than one boolean per report) both drives
  the picker row's spinner and disables the other rows during an export, since
  `expo-print`/`expo-sharing` calls shouldn't overlap.

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
- `habit_completions` table: still one row per `(habit_id, owner_id, completed_date)` — a
  `times_per_day > 1` habit does **not** get multiple rows per day. Partial daily progress
  lives in an `occurrence_count smallint` column (default `1`, `>= 0` constrained) added by
  `supabase/sql/2026-07-22_habit_completion_occurrences.sql`, mutated only through the
  `increment_habit_completion(p_habit_id, p_completed_date, p_max)` /
  `decrement_habit_completion(p_habit_id, p_completed_date)` Postgres RPCs (`SECURITY
  DEFINER`, `auth.uid()` read server-side) — never a plain client `update`, since
  supabase-js has no relative `column = column + 1` primitive and a client-computed "+1"
  write would be racy under rapid double-taps. `useHabits.ts`'s `logOccurrence`/
  `undoOccurrence` are the only callers.
- `dog_moods` table (`supabase/sql/2026-08-05_dog_moods.sql`): `id`/`dog_id`/`owner_id`/
  `mood` (check-constrained `'sleepy' | 'off' | 'good' | 'great' | 'sick'`)/`logged_date`
  (defaults `current_date`)/`created_at`. Unique on `(dog_id, owner_id, logged_date)` — one
  mood per dog per day, safe to plain-`upsert()` from the client (unlike
  `habit_completions`, this isn't a racy increment, so no RPC needed). Owner-scoped RLS.
- `dog_allergens` table (`supabase/sql/2026-08-06_dog_allergens_table.sql`, Phase 2 item 5):
  `id`/`dog_id`/`owner_id`/`allergen` text/`created_at`. Case-insensitive unique index on
  `(dog_id, lower(allergen))`. Normalized out of the older flat `dogs.allergens text[]`
  column (`supabase/sql/2026-08-05_dog_allergens.sql`, Phase 1) — that column is still
  present but unwritten since this table shipped; backfilled once, safe to drop in a future
  cleanup migration once confirmed unused in prod. Owner-scoped RLS.
- `health_logs` table (`supabase/sql/2026-08-07_health_logs.sql`, Phase 2 items 8–9):
  `id`/`dog_id`/`owner_id`/`type` (check-constrained `'poop' | 'vomit'`)/`details` jsonb
  (default `'{}'`)/`notes`/`logged_at`. One table backs both the poop tracker (item 8) and
  vomit tracker (item 9) — `type` was check-constrained to allow `'vomit'` from the start
  even though only `'poop'` rows were written until item 9 shipped, specifically so the
  vomit tracker needed zero schema change. `details`' concrete shape is discriminated by
  `type` in app code (`types/index.ts`'s `PoopLogDetails` / `VomitLogDetails` union on
  `HealthLog.details`) — poop stores `{ consistency, color, frequency }`, vomit stores
  `{ severity, possibleCause, frequency }`. `lib/hooks/useHealthLogs.ts` (poop) and
  `lib/hooks/useVomitLogs.ts` (vomit) both query this same table filtered by `type`, kept as
  two separate duplicated hooks rather than one parameterized hook — this app's established
  per-domain-duplication convention (see also the Mood/Meal/Symptom report builders under
  Phase 2 item 16). Owner-scoped RLS.
- Email confirmation + leaked-password protection: Supabase dashboard toggles, not yet enabled (Phase 2 item 2).
- `meal_details` table (Phase 2 item 12, Option C) — **confirmed final schema**: `id`/
  `completion_id` (FK -> `habit_completions(id)`, unique — one optional detail per feeding
  completion, not per individual occurrence)/`dog_id`/`owner_id`/`food_type`
  (check-constrained `'wet' | 'dry' | 'mixed' | 'raw'`)/`wet_amount_grams`/`brand_wet`/
  `dry_amount_grams`/`brand_dry`/`raw_amount_grams`/`brand_raw`/`notes`/`logged_at`. No single
  `amount_grams`/`brand` columns anymore — those existed briefly in the first version and were
  split (see "Done" above) since a single pair couldn't represent a `mixed` meal's separate
  wet/dry portions; `raw` got its own `raw_amount_grams`/`brand_raw` rather than reusing wet's
  or dry's. Owner-scoped RLS, same `auth.uid() = owner_id` pattern as every other table.
  Since `habit_completions` is one row per day regardless of `times_per_day` (see above), one
  `meal_details` row per completion — not per occurrence — is the right granularity.

**Auth implementation details:**
- `lib/supabase.ts` doesn't set `flowType` -> defaults to `'implicit'`, not `'pkce'` (confirmed from `@supabase/auth-js` source). OAuth redirect returns tokens in the URL **fragment**, not `?code=` — `useGoogleSignIn.ts` uses `setSession()`, not `exchangeCodeForSession()`. Don't switch to PKCE without changing both together.
- Google: web-redirect flow (`expo-web-browser` + `expo-auth-session`) — works in Expo Go.
- Apple: native `expo-apple-authentication` (exception — Expo docs confirm it works in Expo Go on iOS, unlike most native modules). **Disabled** via `APPLE_SIGN_IN_ENABLED` flag in `SocialSignInButtons.tsx` pending Apple Developer Program decision + Supabase provider config.
- Don't move Google to a native SDK without first confirming the project has moved off Expo Go (most native auth modules need a dev client).

## V1 scope — build in this order
1. Auth + pet profile + care tracker (meals, walks, vet visits, meds) + reminders
2. Allergy/sensitivity profile + ingredient conflict flagging
3. AI chatbot (RAG, grounded in pet's own profile + nutrition corpus)
4. Vet finder map (OpenStreetMap tiles + Foursquare Places free tier — see Phase 2 item 21)

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

**Done:**
- ~~Allergy profile per dog — full CRUD for food sensitivities~~ (2026-08-06, see "Done" above)
- ~~Vomit tracker~~ (2026-08-10, see "Done" above)
- ~~Symptom history view per dog~~ (2026-08-10, see "Done" above)
- ~~Mood history view per dog~~ (2026-08-10, see "Done" above)
- ~~Food/meal log history view — "Option C" meal detail + `MealHistoryScreen.tsx`~~ (2026-08-10, see "Done" above)

**Deferred to a future version (not v2.0):**
- Ingredient scanner (item 5) + visual conflict result screen (item 7) — attempted
  2026-08-07, reverted. Implementation (Open Food Facts search + hardcoded
  dangerous-for-dogs list + safe/warning/danger result screen) worked, but Open Food Facts'
  legacy `cgi/search.pl` endpoint returned intermittent 503s from a real device even after
  adding an identifying `User-Agent` header (their documented fix for anonymous-traffic
  throttling) — not reliable enough to ship. Revisit with either an API key / registered app,
  the newer `api/v2/search` endpoint, or a different ingredient data source before
  re-attempting. Ingredient scan history (item 6) and the conflict badge on the sensitivity
  card (item 17) depend on this and are deferred with it.

**New Phase 2 items:**
8. ~~Poop tracker — log consistency, color, frequency per dog~~ (2026-08-07, see "Done" above)
9. ~~Vomit tracker — log occurrence, description, possible cause (reuse `health_logs`)~~ (2026-08-10, see "Done" above)
10. ~~Symptom history view per dog — timeline of poop + vomit logs~~ (2026-08-10, see "Done" above)
11. ~~Mood history view per dog~~ (2026-08-10, see "Done" above)
12. ~~Food/meal log history view~~ (2026-08-10, see "Done" above — "Option C" quick-tick +
    optional per-day meal detail, plus `MealHistoryScreen.tsx`; export still pending, see
    item 14)
13. ~~Export mood history as CSV~~ (2026-08-11, see "Done" above — rich report-style CSV,
    not a bare dump)
14. ~~Export food + health log as PDF~~ (2026-08-11, see "Done" above — meal history +
    symptom history, same styled-report approach as item 13)
15. ~~Export vet/vaccine history as PDF~~ (2026-08-24, see "Done" above — download icon
    added to `DogDetailScreen.tsx`'s `'vaccine-list'` mode header, same report style as
    items 13–14)
16. ~~"Download report" button~~ (2026-08-24, see "Done" above — consolidated picker,
    reached via a per-dog row under a new "Download report" section on the More tab,
    individual + combined "All Reports" export)
17. ~~Conflict warning badge on food sensitivity card when the scanner finds a match~~ — deferred with the scanner, see "Deferred to a future version" above
18. ~~Full Phase 2 end-to-end test: add allergy → log poop/vomit → view history → export
    report~~ (2026-08-24 — manually verified on a physical iPhone via Expo Go: habits +
    meal detail, allergy CRUD, mood, poop/vomit tracker, symptom history, vaccines, meal
    history, all 5 report exports, and an empty-state second-pet pass. All working.)
19. ~~Update CLAUDE.md with Phase 2 schema decisions and new tables~~ (2026-08-24 —
    consolidated `dog_moods`/`dog_allergens`/`health_logs`/`habit_completions.occurrence_count`
    into "Supabase schema gotchas"; `meal_details` and vaccine schema details were already
    documented there from items 12/15)
20. ~~Commit and tag `v2.0`~~ (2026-08-24, commit `5bc3e28`, pushed to `origin/main` and
    tagged `v2.0`)
21. Vet finder map — use OpenStreetMap tiles + Foursquare Places free tier API for vet search
    — **next task**
    (decided over Google Places to avoid billing requirement). Research Foursquare API setup
    before building.

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
- `expo-file-system`, `expo-sharing` — export/share plumbing shared by both `lib/csvExport.ts`
  (kept for future CSV needs, e.g. item 14) and `lib/pdfExport.ts` (Phase 2 item 13's mood
  history PDF). `expo-file-system`'s SDK 54 API is the new `File`/`Paths` class-based API
  (`new File(Paths.cache, filename)`, `.create()`/`.write()`/`.move()`/`.uri`), **not** the
  legacy `FileSystem.cacheDirectory` string + `writeAsStringAsync` API from older SDKs — don't
  reach for the legacy API from training data/memory, it's a different import shape
  (`expo-file-system/legacy` if the old API is ever needed).
- `expo-print` — HTML→PDF rendering (Phase 2 item 13, `lib/pdfExport.ts`'s
  `Print.printToFileAsync({ html })`). First PDF feature in the app.
- `@expo/vector-icons` is **not** installed/used for the tab bar — it's only resolvable nested inside `node_modules/expo/node_modules/@expo/vector-icons`, not from app source, so tab icons use plain emoji via `<Text>` instead. Install it explicitly as a follow-up if real icons are wanted later.
- All installed via `npx expo install <pkg>`, then `npm install --legacy-peer-deps` to resolve — pre-existing peer conflict between pinned `react@19.1.0` and transitive `react-dom@19.2.7` (Expo CLI/web tooling, not app code). Plain `npm install` fails on this regardless of what's being added.
- `app.json` has `"scheme": "pawcare"` for a future dev-client/standalone build — no effect on Expo Go's own redirect URI, which `makeRedirectUri()` generates automatically.

## Things to remember
- Sensitivity/allergy logic is the core differentiator — treat as first-class, not a side feature
- Chatbot answers should use the pet's stored profile as context, not just generic Q&A