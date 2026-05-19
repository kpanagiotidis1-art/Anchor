// ─────────────────────────────────────────────────────────────────────────────
// focusConfig.js  (src/lib/focusConfig.js)
// Single source of truth for focus mode configuration.
//
// Imported by: OverviewScreen, HomeScreen, WorkoutScreen,
//              NutritionScreen, WeeklyReviewScreen, SettingsScreen, App
//
// Focus modes:
//   "discipline" — daily routines, structure, consistency, streaks
//   "fitness"    — workouts, protein, training volume
//   "balanced"   — equal weighting, no strong emphasis
//   null         — treated as "balanced" (user skipped onboarding step)
//
// Design principle:
//   Priority is expressed through visual weight and ordering, not
//   presence/absence. Nothing is hidden. The chosen pillar surfaces
//   first and at slightly larger scale. The user feels "this is shaped
//   around what I said matters" — not "I am locked into a mode."
// ─────────────────────────────────────────────────────────────────────────────

const FOCUS_KEY = "anchor-focus-mode";

// ── Persistence ───────────────────────────────────────────────────────────────

export function getFocusMode() {
  try { return localStorage.getItem(FOCUS_KEY) || null; }
  catch { return null; }
}

export function setFocusMode(mode) {
  try {
    if (mode) localStorage.setItem(FOCUS_KEY, mode);
    else localStorage.removeItem(FOCUS_KEY);
  } catch {}
}

// ── Focus option metadata — used by Settings and Onboarding ──────────────────

export const FOCUS_OPTIONS = [
  { key: "discipline", label: "Build discipline",  sub: "Daily routines, structure, and consistency" },
  { key: "fitness",    label: "Improve fitness",   sub: "Workouts, nutrition, and progress" },
  { key: "balanced",   label: "Balance everything", sub: "Tasks, fitness, and daily momentum" },
];

// ── Main config ───────────────────────────────────────────────────────────────

const FOCUS_CONFIG = {
  discipline: {
    // Shown beside the date in Overview header. null = nothing shown.
    focusLabel: "Discipline",

    // Overview hero
    heroMode: "tasks",
    emptyTaskHeadline: "Build your routine.",
    emptyTaskSub: "Structure is the foundation of everything.",
    emptyTaskCTA: "Add your first routine →",
    emptyTaskCTATarget: "tasks",
    allDoneSub: "Discipline compounds. Keep the streak going.",

    // Overview secondary row
    // primaryStatEmphasis: true → left stat 1.55rem/700, right stat 1.1rem/600
    // primaryStatEmphasis: false → both 1.3rem/700 (balanced)
    secondaryLeft: "streak",
    primaryStatEmphasis: true,

    // Overview tertiary
    tertiaryOrder: ["weekly", "nutrition"],

    // Overview workout display
    workoutEmptyLabel: "Not yet",
    workoutEmptySub: "Recovery counts too.",

    // Nutrition screen prominence
    // "normal" = standard layout; "protein" = protein stat more prominent
    nutritionEmphasis: "normal",

    // Weekly review narrative lead
    // "consistency" = active days/task streaks lead the headline
    // "training"    = workout count leads the headline
    // "balanced"    = data decides
    weeklyNarrativeLead: "consistency",

    // HomeScreen
    tasksSubtitle: "Stay on track.",
    sectionEmptyLabel: "Tap + to add a routine",
    workoutNudge: null,

    weeklyPrefix: "Consistency is everything.",
    nutritionEmptyCopy: null,
  },

  fitness: {
    focusLabel: "Fitness",

    heroMode: "fitness",
    emptyTaskHeadline: "Structure your training day.",
    emptyTaskSub: "Add tasks to build your day around your sessions.",
    emptyTaskCTA: "Start a workout →",
    emptyTaskCTATarget: "workout",
    allDoneSub: "Fuelled and focused. Nice work.",

    secondaryLeft: "workout",
    primaryStatEmphasis: true,

    tertiaryOrder: ["tasks", "weekly"],

    workoutEmptyLabel: "Ready?",
    workoutEmptySub: "Start today's session →",

    nutritionEmphasis: "protein",

    weeklyNarrativeLead: "training",

    tasksSubtitle: "Structure your day.",
    sectionEmptyLabel: "Tap + to add a task",
    workoutNudge: "Ready for today's session?",

    weeklyPrefix: null,
    nutritionEmptyCopy: "Nothing logged — tap to add your first meal",
  },

  balanced: {
    // null = no label in Overview header — intentional, balanced has no axis
    focusLabel: null,

    heroMode: "tasks",
    emptyTaskHeadline: "No tasks today",
    emptyTaskSub: "Add tasks to get started.",
    emptyTaskCTA: "Add your first task →",
    emptyTaskCTATarget: "tasks",
    allDoneSub: "Stay consistent. That's the whole game.",

    secondaryLeft: "streak",
    primaryStatEmphasis: false,   // equal visual weight

    tertiaryOrder: ["weekly", "nutrition"],

    workoutEmptyLabel: "Not yet",
    workoutEmptySub: null,

    nutritionEmphasis: "normal",

    weeklyNarrativeLead: "balanced",

    tasksSubtitle: null,
    sectionEmptyLabel: "Tap + to add a task",
    workoutNudge: null,

    weeklyPrefix: null,
    nutritionEmptyCopy: null,
  },
};

export function getConfig(focusMode) {
  return FOCUS_CONFIG[focusMode] || FOCUS_CONFIG.balanced;
}
