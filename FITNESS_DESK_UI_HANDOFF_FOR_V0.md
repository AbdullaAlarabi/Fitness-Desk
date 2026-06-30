# Fitness Desk UI Handoff for v0

## 1. Project Overview

- **App name:** Fitness Desk
- **Tech stack:** React, TypeScript, Vite, Tailwind CSS, React Router, Supabase JS, Recharts, Lucide React, date-fns, vite-plugin-pwa
- **Purpose:** A private personal fitness tracking web app for workouts, running, body metrics, intake, and adherence. This is not a public product. It is a personal “Desk” app.
- **Target devices:** Mac desktop web browser and iPhone mobile web/PWA
- **Current design goal:** Premium personal fitness dashboard / private training cockpit / mission-control style performance app

## 2. Non-Negotiables

The redesign must preserve all of the following:

- Existing Supabase integration and environment-variable setup
- Existing database schema and table usage
- Existing workout data structure
- Existing progression logic and workout completion logic
- Existing routing and route paths
- Existing PWA behavior, boot splash, manifest, and installability
- Existing media file paths and asset filenames
- Existing approved exercise demo media mappings
- Existing user flows
- Existing tracking logic for workouts, intake, body check-ins, running, and summaries
- Existing GitHub Pages deployment approach
- Existing hash-routing behavior for deployment
- Existing fixed workspace model using `abdulla-fitness-desk`
- Existing no-login / no-auth personal-mode behavior

Do **not**:

- Change Supabase schema
- Rename routes
- Rename media assets
- Replace working state logic
- Break GitHub Pages `HashRouter` behavior
- Remove features to simplify UI work

## 3. Route Inventory

### `/`

- **Page/component:** `TodayPage`
- **File:** `src/pages/today-page.tsx`
- **Purpose:** App home / current-day mission control
- **Main sections:**
  - Mission hero (`MissionCard`)
  - Status tiles for Training / Intake / Weight
  - Next action strip
  - Today’s Workout summary
  - Next Workout summary
  - “Complete the Day” checklist
  - Quick Body Check-In
  - Today’s Intake grouped by timing
  - Smaller session/state side cards
- **User actions:**
  - Start / Continue / Review session
  - Open next workout
  - Mark intake item as Taken or Skipped
  - Toggle intake state via status icon
  - Enter weight and save daily check-in
- **Data displayed:**
  - Current session from shared state
  - Next session from shared state
  - Intake groups and handled counts
  - Daily completion score
  - Current/latest weight
  - Running snapshot helper text
- **Supabase/services involved:**
  - Shared state from `src/services/fitnessDeskState.ts`
  - Intake writes via `src/services/todayService.ts` `upsertIntakeLog`
  - Daily weight save via `saveTodayWeight`
- **Desktop layout:** Two-column command layout with mission/workout content on left and completion/body quick check-in on right
- **Mobile layout:** Vertical mission-first layout above bottom nav
- **Empty states:**
  - No intake timing groups rendered if empty
  - Weight shows `Not logged yet`
- **Loading states:** Relies mostly on shared-state fallback rather than a dedicated page skeleton
- **Error states:** Inline red error banner for intake/weight save failures

### `/plan`

- **Page/component:** `PlanPage`
- **File:** `src/pages/plan-page.tsx`
- **Purpose:** Weekly 7-day training schedule
- **Main sections:**
  - Page header card
  - Week overview strip
  - Optional “cycle shifted” notice
  - Schedule cards for 7 days
  - Shift-forward modal
  - Move-day modal
  - Mobile more-actions sheet
- **User actions:**
  - Start session
  - Open workout / preview / review depending on state
  - Mark complete
  - Skip
  - Shift forward
  - Move to another day
  - Reset day
- **Data displayed:**
  - Day number and date
  - Day title, focus, duration
  - Status badges
  - Day cover image
- **Supabase/services involved:**
  - Shared state from `fitnessDeskState`
  - Plan actions via `src/services/planService.ts`
  - `scheduled_workouts`, `workout_sessions`, `running_sessions`
- **Desktop layout:** Multi-column schedule grid with one primary action and a menu trigger per card
- **Mobile layout:** Stacked schedule cards with compact primary CTA and sheet-based menu
- **Empty states:** `StateCard` if no weekly plan data
- **Loading states:** No prominent skeleton in normal ready state
- **Error states:** Inline `StateCard` with error tone

### `/workout`

- **Page/component:** `WorkoutPage`
- **File:** `src/pages/workout-page.tsx`
- **Purpose:** Workout start screen, active workout player, run logger, rest-day action, workout completion summary
- **Main sections (conditional by state):**
  - Start screen for gym sessions
  - Start/logger screens for run sessions
  - Rest / Walking screen
  - Active workout player
  - Workout completion summary
  - Full plan sheet
  - Coach notes sheet
  - Demo modal/sheet
  - Rules sheet
- **User actions:**
  - Start session
  - Save set
  - Next set / next exercise
  - Finish workout
  - Save run
  - Mark walk complete
  - Open coach notes / demo / full plan / rules
  - Jump to exercise from full-plan sheet
- **Data displayed:**
  - Session title, status, day media
  - Exercise list or current exercise
  - Set logging fields
  - Rest timer
  - Saved sets
  - Progression recommendation after completion
  - Post-workout intake reminder
- **Supabase/services involved:**
  - `src/services/workoutSessionMode.ts`
  - Reads/writes `scheduled_workouts`, `workout_sessions`, `workout_exercise_logs`, `workout_set_logs`, `running_sessions`
- **Desktop layout:** Main player plus side status/progress content
- **Mobile layout:** Focused workout-player mode; shell header hidden while active via body class
- **Empty states:** Placeholder/fallback workout views if template data is thin
- **Loading states:** Uses `LoadingSkeleton` while snapshot loads
- **Error states:** Inline error banner

### `/body`

- **Page/component:** `BodyPage`
- **File:** `src/pages/body-page.tsx`
- **Purpose:** Daily weight check-in and weekly scale scan
- **Main sections:**
  - Page header card
  - Daily / Weekly segmented toggle
  - Daily Check-In form
  - Optional daily extras toggle
  - Weekly Scan accordion groups: Core, Composition, Metabolic, Advanced
  - Latest metric summary
  - Trends section with tabs and range filters
  - Consistency reminder
- **User actions:**
  - Switch Daily / Weekly modes
  - Save daily weight
  - Expand optional daily notes
  - Save weekly scan
  - Expand/collapse weekly metric groups
  - Show/hide charts
  - Switch chart metric
  - Switch date range
- **Data displayed:**
  - Latest weight
  - Latest weekly summary
  - Derived BMI/body-fat-mass/lean-body-mass/BMR
  - Latest metric tiles
  - Body charts
- **Supabase/services involved:**
  - `src/services/bodyDashboardService.ts`
  - Reads `body_checkins`, `body_metric_definitions`, `body_metric_values`
  - Writes daily and weekly check-ins via `saveDailyQuickCheckin` and `saveWeeklyFullCheckin`
- **Desktop layout:** Main check-in forms left, summary/trends right
- **Mobile layout:** Daily first, weekly scan grouped into accordions, charts collapsible
- **Empty states:**
  - `No weekly scan yet`
  - `No chart data`
  - Weight `Not logged yet`
- **Loading states:** `LoadingSkeleton` while snapshot loads
- **Error states:** Inline red error banner

### `/progress`

- **Page/component:** `ProgressPage`
- **File:** `src/pages/progress-page.tsx`
- **Purpose:** Summary of adherence and trends across training, intake, body, and running
- **Main sections:**
  - Page header card
  - This Week summary tiles
  - Consistency Score panel
  - “What to do next” recommendation panel
  - Data panels for Weight, Training consistency, Intake adherence, Run performance
  - “What changed” summary
  - Monthly snapshot
- **User actions:**
  - Toggle visibility of trend panels
  - Switch body trend metric tab
- **Data displayed:**
  - Weekly completion/adherence summaries
  - Consistency score breakdown
  - Body trends
  - Workout bars
  - Intake bars
  - Run trend and run target/baseline context
- **Supabase/services involved:**
  - `src/services/progressDashboardService.ts`
  - Also composes `getBodyDashboardSnapshot` and `getRunningProgressSnapshot`
- **Desktop layout:** Summary and insight-first panels, side context cards
- **Mobile layout:** Summary first, trend panels collapsed behind “View”
- **Empty states:**
  - “Log more check-ins to build this trend.”
  - “No workout trend yet.”
  - “No intake trend yet.”
  - “No run trend yet.”
- **Loading states:** `LoadingSkeleton`
- **Error states:** Inline error banner

### `/seed`

- **Page/component:** `SeedPage`
- **File:** `src/pages/seed-page.tsx`
- **Purpose:** Admin/setup route for seed data, export, and configuration visibility
- **Main sections:**
  - Profile settings
  - Scale/app settings
  - Seed status and seed trigger
  - Seed statistics
  - Seed contents explanation
  - Export actions
  - Final QA checklist
- **User actions:**
  - Reload seed status
  - Run seed once
  - Export JSON
  - Export CSV
- **Supabase/services involved:**
  - `src/services/seedInitialData.ts`
  - `src/services/exportService.ts`
- **Desktop layout:** Multi-card admin console
- **Mobile layout:** Stacked cards
- **Empty states/loading/error:** Loading and error strings inline; not a primary user-facing page

## 4. Component Inventory

### Shared UI module: `src/components/ui.tsx`

#### `PageHeader`

- **Used in:** `SeedPage`, possibly other admin/secondary pages
- **Props:** `eyebrow`, `title`, `description`, `action`, `tone`
- **Visual role:** Generic page intro block
- **Interaction:** Static container
- **Responsive:** Stacks cleanly on smaller widths

#### `SectionCard`

- **Used in:** All major pages
- **Props:** `title`, `eyebrow`, `action`, `children`, `className`
- **Visual role:** Standard light section wrapper
- **Interaction:** Optional action slot
- **Responsive:** Flexible card shell, stacks on mobile

#### `Card`

- **Used in:** All pages
- **Props:** `children`, `className`
- **Visual role:** Basic surface block

#### `MissionCard`

- **Used in:** Today hero, workout start screen
- **Props:** `eyebrow`, `title`, `subtitle`, `metadata`, `description`, `primaryAction`, `secondaryAction`, `status`, `image`, `className`
- **Visual role:** Highest-emphasis dark hero card
- **Interaction:** Primary and optional secondary CTAs
- **Responsive:** Right-side image hidden on smaller breakpoints
- **Dependencies:** Optional media object with `src`, `alt`, `objectPosition`

#### `StatusTile`

- **Used in:** Today, Body, Progress
- **Props:** `label`, `value`, `helper`, `icon`, `tone`, `accent`, `className`
- **Visual role:** Compact metric/status tile
- **Responsive:** Grid-friendly, remains readable at mobile widths

#### `ActionRow`

- **Used in:** Intake rows, Today checklist, other compact operational rows
- **Props:** `label`, `detail`, `status`, `actions`, `selected`, `disabled`, `className`
- **Visual role:** Horizontal app-like row with quick actions
- **Interaction:** Action area passed in via props
- **Responsive:** Kept compact on mobile after recent cleanup

#### `ScheduleCard`

- **Used in:** Plan day cards
- **Props:** `eyebrow`, `dayLabel`, `date`, `title`, `focus`, `duration`, `badges`, `image`, `primaryAction`, `menuAction`, `className`
- **Visual role:** Weekly schedule card
- **Interaction:** One primary action plus menu trigger

#### `DataPanel`

- **Used in:** Progress trend panels
- **Props:** `title`, `subtitle`, `actions`, `empty`, `children`, `className`
- **Visual role:** Analytics/trend container with empty-state support

#### `MetricCard`

- **Used in:** Body/summary contexts
- **Props:** `label`, `value`, `note`, `accent`

#### `StatCard`

- **Used in:** Small summary metrics
- **Props:** `label`, `value`, `hint`

#### `SectionEyebrow`

- **Used in:** Shared label/eyebrow presentation
- **Props:** `children`, `inverse`

#### `Pill`

- **Used in:** Admin/status chips
- **Props:** `children`

#### `Badge`

- **Used in:** Today, Plan, Workout status/badge contexts
- **Props:** `children`, `variant`, `tone`
- **Variants:** `default`, `completed`, `ready`, `planned`, `rest`, `structured`, `in_progress`, `skipped`

#### Buttons

- **`PrimaryButton`**
- **`SecondaryButton`**
- **`AccentButton`**
- **`IconButton`**
- **Used in:** All pages
- **Role:** Main CTA, secondary CTA, accent CTA, icon/menu button
- **Accessibility:** `IconButton` should always carry `aria-label`

#### Form controls

- **`InputField`**
- **`MetricInput`**
- **`TextAreaField`**
- **Used in:** Today, Body, Workout, admin/export screens
- **Role:** Standardized labeled inputs with helper/error support

#### Empty/loading/status

- **`EmptyState`**
- **`StateCard`**
- **`LoadingSkeleton`**
- **Used in:** Plan, Body, Progress, Seed

#### `MediaFrame`

- **Used in:** Workout previews, active workout references, plan/day covers, media thumbnails
- **Props:** `src`, `alt`, `wrapperClassName`, `imageClassName`, `imageStyle`, `loading`, `tone`
- **Behavior:**
  - Renders image when load succeeds
  - Falls back to branded placeholder frame on failure
  - Tracks failure internally with `useState`
- **Responsive:** Wrapper sizing is controlled by parent
- **Dependencies:** Media paths should already be resolved through `assetUrl` or media manifest

### Layout module: `src/components/layout.tsx`

#### `AppShell`

- **Used in:** Wraps all app routes in `src/App.tsx`
- **Role:** Global desktop shell + mobile bottom nav + header
- **Behavior:**
  - Renders header brand and route context
  - Desktop left nav hidden below `lg`
  - Mobile bottom nav shown below `lg`
  - Sets `data-app-ready="true"` on main content
- **Dependencies:** Shared state, route pathname, dashboard command summary

### Likely page-local reusable pieces

These are declared inside page files rather than exported shared components:

- `ChecklistRow` in `today-page.tsx`
- `IntakeRow` in `today-page.tsx`
- `PlanDayCard`, `PrimaryPlanAction`, `MoreActionsMenu`, `ModalShell` variants in `plan-page.tsx`
- `BottomSheet`, `MiniMeta`, `InputBlock`, `CoachRow`, `ErrorBanner`, `SuccessBanner` in `workout-page.tsx`
- `SegmentButton`, `AccordionCard`, `MetricField`, `ReadOnlyField`, `TextField`, `InputBlock` helpers in `body-page.tsx`

## 5. Modal / Drawer / Popup Inventory

### Shift Forward Modal

- **Location:** `src/pages/plan-page.tsx`
- **Trigger:** Skip action on a structured day
- **Purpose:** Confirm shift-forward behavior
- **Content:** Source day, shift-remaining toggle, use-recovery-days toggle
- **Actions:** Confirm / cancel
- **Desktop:** Centered modal
- **Mobile:** Sheet-style modal

### Move Day Modal

- **Location:** `src/pages/plan-page.tsx`
- **Trigger:** “Move to another day” from More menu
- **Purpose:** Move current plan day to another date
- **Content:** Day options / target selection
- **Actions:** Confirm / cancel

### More Actions Mobile Sheet

- **Location:** `src/pages/plan-page.tsx`
- **Trigger:** `•••` / more button on day card
- **Purpose:** Secondary plan actions without cluttering card

### Workout Full Plan Sheet

- **Location:** `src/pages/workout-page.tsx`
- **Trigger:** `Full plan`
- **Purpose:** Show exercise order, progress, and jump targets
- **Content:** Exercise rows with status and progress counts
- **Actions:** Jump to exercise, close
- **Mobile:** Bottom sheet
- **Desktop:** Modal/sheet within page

### Workout Coach Notes Sheet

- **Location:** `src/pages/workout-page.tsx`
- **Trigger:** `Coach notes`
- **Purpose:** Show setup cue, main cue, mistake, alternatives

### Workout Demo Modal / Sheet

- **Location:** `src/pages/workout-page.tsx`
- **Trigger:** `Demo` from workout start or active player
- **Purpose:** Show approved exercise poster with native app details
- **Content:** Exercise image, target muscles, sets, reps, rest, notes/cues
- **Behavior:**
  - Uses `object-fit: contain`
  - Has accessible dialog behavior
  - Returns focus to trigger on close
- **Desktop:** Centered modal
- **Mobile:** Full-screen/bottom-sheet style dialog

### Workout Rules Sheet

- **Location:** `src/pages/workout-page.tsx`
- **Trigger:** `View rules`
- **Purpose:** Show full workout rules without cluttering player

### Boot Splash Overlay

- **Location:** `src/main.tsx`
- **Purpose:** 2-second branded splash before app mount
- **Behavior:** Full-screen splash with image and loading label
- **Note:** This is an overlay experience, not route content

### Banners / Inline overlays

- **Locations:** Today, Body, Progress, Workout
- **Types:** ErrorBanner, SuccessBanner, StateCard
- **Purpose:** Inline status feedback rather than toast system

## 6. Navigation System

### Desktop navigation

- **Location:** `src/components/layout.tsx`
- **Structure:**
  - Header at top
  - Left sidebar card at `lg+`
  - Main content column to right
- **Items:**
  - Today `/`
  - Plan `/plan`
  - Workout `/workout`
  - Body `/body`
  - Progress `/progress`
- **Active state:** Dark teal background, gold accent indicator/icon

### Mobile navigation

- **Location:** `src/components/layout.tsx`
- **Structure:** Bottom navigation bar below `lg`
- **Items:** Today, Plan, Train, Body, Progress
- **Active state:** Dark teal rounded chip with gold icon and white text
- **Safe-area behavior:** Layout uses `--mobile-nav-height`, `--mobile-page-bottom`, and `--mobile-page-bottom-cta` to prevent overlap

### Header

- **Desktop/mobile shared shell header:** Compact brand row
- **Brand:** App icon plus `Fitness Desk` with route context/subtitle
- **Route context:** Derived by `getHeaderContext(pathname, state)`
- **Special workout behavior:** Header hidden on mobile while active workout mode body class is present

### Routing

- **Router:** `HashRouter`
- **Reason:** GitHub Pages compatibility

## 7. Data and State Map

### Shared app state

- **Provider:** `src/state/fitnessDeskState.tsx`
- **Service source:** `src/services/fitnessDeskState.ts`
- **Context value:** `{ state, syncing, refresh }`

### `FitnessDeskState` contains

- Current date labels and `todayIso`
- Current cycle day and session IDs/statuses
- `weeklyPlan`
- `currentSession`
- `nextSession`
- `intakeGroups`
- `intakeSummary`
- `body`
- `progress`
- `hero`
- `runningSessions`
- `source: 'local' | 'supabase'`

### Workout completion tracking

- Primary state comes from:
  - `scheduled_workouts`
  - `workout_sessions`
  - `workout_exercise_logs`
  - `workout_set_logs`
- Workout session is created/resumed through `workoutSessionMode.ts`
- Set completion is represented by saved rows in `workout_set_logs` with `completed: true`
- Plan/Today/Progress sync after saves via `emitDashboardRefresh()` and provider `refresh()`

### Body metrics tracking

- Daily and weekly check-ins are stored in:
  - `body_checkins`
  - `body_metric_values`
- Definitions come from `body_metric_definitions`
- Derived values/calculations are computed in frontend service layer:
  - BMI
  - body fat mass
  - lean body mass
  - BMR estimate

### Supplements/intake tracking

- Seeded intake schedule lives in `src/data/intakeSchedule.ts`
- Actual persisted items/logs use:
  - `intake_items`
  - `intake_logs`
- Today page treats Taken/Skipped as mutually exclusive statuses

### Sets / reps / weights / notes

- Active workout writes set data via `saveWorkoutSet`
- Saved fields: set number, reps, optional kg, rest seconds, notes, `completed`
- Current UI has **no RPE**

### Skipped / shifted days

- Controlled in `src/services/planService.ts`
- Skip writes `scheduled_workouts.status = 'skipped'`
- Shift-forward and move create/update future `scheduled_workouts`
- Reset deletes scheduled rows and related sessions/runs for that date

### LocalStorage usage

- No major app-state localStorage layer was identified in this audit
- Current state is built from Supabase or local fallback state in-memory

### Supabase reads/writes

- Shared state load: `getFitnessDeskState`
- Today writes: intake + daily weight
- Plan writes: scheduled workout statuses and movement
- Workout writes: sessions, exercise logs, set logs, run logs
- Body writes: daily/weekly check-ins and metric values
- Progress is read-only aggregation

## 8. Media and Asset Map

### Central media helper

- **File:** `src/data/mediaManifest.ts`
- **Path builder:** `src/lib/assets.ts` `assetUrl(path)`
- **Important:** Uses `import.meta.env.BASE_URL` and must keep GitHub Pages compatibility

### Brand assets

- `public/media/brand/fitness_desk_app_icon.png`
  - Used in header / app icon contexts
- `public/media/brand/fitness_desk_logo_horizontal.png`
  - Present in project
- `public/media/brand/fitness_desk_splash_screen.png`
  - Used by boot splash

### Training hero assets

- Folder: `public/media/training/heroes/`
- Used by Today hero through `getTodayHeroMedia()`
- Files:
  - `today_hero_strength.png`
  - `today_hero_run.png`
  - `today_hero_recovery.png`

### Day cover assets

- Folder: `public/media/training/day-covers/`
- Used by:
  - Today workout card
  - Plan day cards
  - Workout start card
- Files:
  - `day_01_push_cover.png` through `day_07_rest_walking_cover.png`

### Exercise demo media

- Demo posters: `public/media/training/exercises/demo/`
- Thumbnails: `public/media/training/exercises/thumbs/`
- Placeholder: `public/media/training/placeholders/exercise_demo_placeholder.svg`
- Approved manifest/reference files:
  - `public/media/training/manifests/approved_exercise_media_manifest.json`
  - `public/media/training/manifests/approved_24_contact_sheet.jpg`
  - `public/media/training/README_APPROVED_EXERCISE_MEDIA.txt`
- The contact sheet is for review only and should not be used in UI

### Exercise media mapping

- Central mapping in `src/data/mediaManifest.ts`
- Consumers:
  - `src/services/workoutSessionMode.ts`
  - Workout start preview rows use `thumbImage`
  - Active workout uses thumbnail for compact reference
  - Demo modal uses full poster

### Fallback behavior

- `MediaFrame` shows branded fallback frame if image fails
- Placeholder exercise demo image exists for unmapped or intentionally missing exercises

### Potential duplicate/unused references

- `public/media/training/_archive_unused/` exists for archived media
- Older asset references may still exist historically in data comments or archive folders
- `src/data/exerciseMedia.ts` and `src/data/dayMedia.ts` appear to exist mainly as thin convenience wrappers around `mediaManifest.ts`

## 9. Current Design System

### Colors

Defined in `src/styles.css`:

- Background / celeste: `#D2D3CE`
- Surface / ceiling white: `#E9EBE6`
- Dark teal / rich black: `#061414`
- Accent volt/pear: `#BCFF00`
- Muted label text / laurel leaf: `#96998C`

### Typography

- Font stack: `Inter, "Avenir Next", Avenir, ui-sans-serif, system-ui, sans-serif`
- Tokens/classes:
  - `.display-title`
  - `.page-title`
  - `.section-title`
  - `.card-title`
  - `.metric-value` / `.numeric-value`
  - `.eyebrow-text`
  - `.body-copy`
  - `.helper-text`

### Spacing patterns

- Consistent card padding and rounded corners
- Mobile-safe spacing via CSS variables:
  - `--mobile-nav-height`
  - `--mobile-page-bottom`
  - `--mobile-page-bottom-cta`
- `--page-max-width: 1120px`

### Card styles

- Light cards: cream/white surfaces with subtle borders and shadows
- Dark hero cards: MissionCard on dark teal/black with accent details
- Rounded corners are generally large and soft

### Buttons

- Accent/primary: volt fill
- Secondary: outlined/light surface
- Icon buttons: rounded square/circle tap targets

### Inputs

- Rounded fields
- Subtle borders
- Numeric fields used for weight/reps/body metrics

### Icons

- Lucide React icons
- Used heavily in nav, intake timing labels, workout controls, and admin screen

### Shadows / borders

- `--shadow-soft: 0 18px 40px rgba(6,20,20,0.08)`
- Soft border lines via `--border-soft`

### Background treatment

- Body uses layered gradients/radial background in `src/styles.css`

### Animations / transitions

- Boot splash timing in `src/main.tsx`
- Skeleton pulse in `LoadingSkeleton`
- Standard button and UI hover transitions via utility classes

### Responsive breakpoints

- Tailwind breakpoints are used throughout
- Major shell change occurs at `lg`
- Active workout mode has special mobile-only behavior

## 10. Current UX Problems

This section is an audit only. Do not treat it as implementation instructions.

### Visual hierarchy

- Some screens still rely on many similar light cards, so hierarchy can flatten outside the main mission surfaces.
- Status/support cards can visually compete with primary actions on desktop.

### Spacing

- Several flows still have generous vertical spacing that feels more dashboard-like than native-app tight.
- The app is cleaner than before, but some stacked sections still feel tall on phone.

### Typography

- Section label system is consistent, but some helper copy and tile copy remain visually soft compared with the strength of key actions.
- Repeated uppercase labels can occasionally feel ornamental rather than functional.

### Mobile ergonomics

- The app is much improved for mobile, but long stacked panels still exist on Today, Body, and Progress.
- Some rows/cards may still benefit from more one-line compression in future redesign work.

### Desktop layout

- Desktop shell is functional, but some pages still read as stacked card collections rather than one coherent premium cockpit.

### Cards

- Many light cards share similar border/radius treatment, reducing contrast between “summary,” “action,” and “analysis.”

### Buttons

- CTA hierarchy is good in workout mode, but some secondary pages still expose many similarly styled controls.

### Navigation

- Mobile bottom nav is strong, but it forces continuous safe-area management and should remain a high-risk area during redesign.

### Exercise media presentation

- Demo modal is structurally correct, but vertical poster handling must stay carefully managed.
- The difference between thumbnail usage and poster usage must remain clear.

### Empty states

- Empty states are cleaner than before, but some analytical panels still depend on terse text-only fallbacks.

### Perceived premium quality

- The visual language is directionally premium, but the product still occasionally feels like a high-quality dashboard rather than a top-tier mobile-first fitness app.

### Consistency between screens

- Today, Plan, Workout, Body, and Progress are aligned conceptually, but their density and card hierarchy are not yet equally mature.

## 11. Redesign Opportunities for v0

v0 should improve the UI while preserving current behavior:

- Strengthen page structure and screen-to-screen hierarchy
- Make Today feel even more like a true home command center
- Make Plan feel more like a schedule/timeline than a card wall
- Make workout start and active workout states feel even more app-native
- Tighten exercise preview and set-logging presentation
- Improve progress visualization without inventing fake analytics
- Compress supplement tracking into cleaner operational rows
- Refine run-tracking presentation within existing data model
- Improve mobile “installed app” feeling
- Improve desktop premium-dashboard composition
- Add stronger micro-interactions while preserving flow logic
- Improve responsive transitions between phone and desktop layouts

## 12. File Map for Implementation

### Pages

- `src/pages/today-page.tsx`
- `src/pages/plan-page.tsx`
- `src/pages/workout-page.tsx`
- `src/pages/body-page.tsx`
- `src/pages/progress-page.tsx`
- `src/pages/seed-page.tsx` (possibly unused for end-user redesign, but present)

### Components

- `src/components/layout.tsx`
- `src/components/ui.tsx`

### Layout / navigation

- `src/App.tsx`
- `src/main.tsx`
- `src/components/layout.tsx`

### Styles / theme

- `src/styles.css`
- `tailwind.config.js`

### Media helpers / presentation data

- `src/data/mediaManifest.ts`
- `src/data/exerciseMedia.ts`
- `src/data/dayMedia.ts`
- `src/lib/assets.ts`

### Presentation-adjacent data/config

- `src/data/workout-plan.ts`
- `src/data/intakeSchedule.ts`
- `src/data/settings.ts`
- `src/data/seed.ts`

### Utilities/services that affect presentation

- `src/state/fitnessDeskState.tsx`
- `src/services/fitnessDeskState.ts`
- `src/services/todayService.ts`
- `src/services/planService.ts`
- `src/services/workoutSessionMode.ts`
- `src/services/bodyDashboardService.ts`
- `src/services/progressDashboardService.ts`
- `src/services/runningServices.ts`
- `src/services/dashboardCommandService.ts`
- `src/services/trainingCycle.ts`
- `src/lib/appClock.ts`

## 13. Implementation Risk Notes

The next AI must **not**:

- Rewrite the app from scratch
- Alter the Supabase schema
- Change route names or route structure
- Change workout logic or set-save logic
- Change media filenames or folder structure
- Remove existing features to simplify the UI
- Replace working shared-state behavior with isolated local UI state
- Break GitHub Pages hash routing
- Break boot splash / PWA install behavior
- Change the approved exercise-media mapping
- Reintroduce RPE into the user-facing UI

High-risk areas during redesign:

- `src/pages/workout-page.tsx`
- `src/services/workoutSessionMode.ts`
- `src/state/fitnessDeskState.tsx`
- `src/services/fitnessDeskState.ts`
- `src/data/mediaManifest.ts`
- `src/components/layout.tsx`
- `src/styles.css` safe-area and mobile-nav handling

## Recommended v0 Prompt Inputs

Copy these constraints into v0 later:

- This is a UI-only redesign of an existing React + TypeScript + Vite + Tailwind + Supabase app.
- Do not change routes, Supabase logic, database schema, workout logic, media filenames, or PWA behavior.
- Preserve current pages: Today, Plan, Workout, Body, Progress, Seed.
- Preserve hash routing for GitHub Pages.
- Preserve mobile bottom nav and desktop shell behavior conceptually.
- Preserve the approved media system in `public/media/...` and path resolution through `assetUrl()` / `import.meta.env.BASE_URL`.
- Preserve shared state from `FitnessDeskStateProvider` and all save/read flows.
- Preserve no-login personal-app behavior.
- Preserve current workout flow: start session -> active player -> save sets -> finish workout.
- Preserve current intake flow and body check-in flow.
- Preserve current visual palette unless explicitly told otherwise:
  - `#D2D3CE`
  - `#E9EBE6`
  - `#061414`
  - `#BCFF00`
  - `#96998C`
