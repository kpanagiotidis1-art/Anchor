// ─────────────────────────────────────────────────────────────────────────────
// anchorVoice.js
// Single source of truth for all copy, identity states, and contextual
// intelligence in Anchor.
//
// Voice principles:
//   - Never lectures, never guilts, never overhypes
//   - Calm, observant, composed — sounds like a trusted training partner
//   - Reinforces identity and momentum, not box-checking
//   - Recovery states are built-in — off days are handled with dignity
// ─────────────────────────────────────────────────────────────────────────────

// ── Day state classifier ──────────────────────────────────────────────────────
// Returns a structured read of how the user's day looks right now.
// Everything else in the voice system derives from this.
export function getDayState({
  completedCount,
  totalCount,
  workoutDone,
  nutritionSummary,
  nutritionGoals,
  currentStreak,
}) {
  const proteinGoal = nutritionGoals?.protein ?? 150;
  const calGoal = nutritionGoals?.calories ?? 2000;
  const protein = nutritionSummary?.protein ?? 0;
  const calories = nutritionSummary?.calories ?? 0;
  const proteinLeft = Math.max(0, proteinGoal - protein);
  const proteinHit = protein >= proteinGoal * 0.95;
  const caloriesLogged = calories > 0;
  const allTasksDone = totalCount > 0 && completedCount >= totalCount;
  const noTasksYet = totalCount === 0;
  const partialTasks = completedCount > 0 && !allTasksDone;
  const nothing = completedCount === 0 && !workoutDone && !caloriesLogged;

  // "Complete day" = tasks done + workout logged
  const completeDay = allTasksDone && workoutDone;
  // "Aligned day" = tasks + workout + protein
  const alignedDay = completeDay && proteinHit;

  return {
    allTasksDone,
    noTasksYet,
    partialTasks,
    nothing,
    workoutDone,
    proteinHit,
    proteinLeft,
    caloriesLogged,
    completeDay,
    alignedDay,
    completedCount,
    totalCount,
    currentStreak,
  };
}

// ── Greetings (time-aware) ────────────────────────────────────────────────────
export function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Still up.";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  if (h < 21) return "Good evening.";
  return "Wind down.";
}

// ── Context line under greeting ───────────────────────────────────────────────
// Observant, personal, never filler. Returns null if nothing meaningful to say.
export function getContextLine(dayState, focusMode, weekStats) {
  const h = new Date().getHours();
  const day = new Date().getDay();
  const {
    allTasksDone, workoutDone, proteinLeft, proteinHit,
    completeDay, alignedDay, currentStreak, totalCount,
    completedCount, nothing,
  } = dayState;

  // ── Milestone moments (always show when earned) ──
  if (currentStreak === 7)  return "Seven days straight. That's a real habit now.";
  if (currentStreak === 14) return "Two weeks consistent. This is who you are.";
  if (currentStreak === 21) return "Three weeks. Identity locked in.";
  if (currentStreak === 30) return "Thirty days. You've built something real.";
  if (currentStreak === 60) return "Sixty days. Most people never get here.";
  if (currentStreak === 100) return "One hundred days. That's exceptional.";

  // ── Aligned / complete day (highest priority after milestones) ──
  if (alignedDay && h >= 18) return "Tasks, workout, nutrition. Everything aligned today.";
  if (completeDay && h >= 18) return "Tasks done. Workout logged. Strong day.";

  // ── End of day states (after 9pm) ──
  if (h >= 21) {
    if (alignedDay) return "Everything aligned. Rest well.";
    if (allTasksDone && !workoutDone) return "Tasks done. Good day.";
    if (workoutDone && !allTasksDone) return "Workout logged. That counts.";
    if (nothing) return "Tomorrow is a clean slate.";
    const remaining = totalCount - completedCount;
    if (remaining > 0) return `${remaining} left. Wind down when you're ready.`;
    return null;
  }

  // ── Focus-mode specific lines ──
  if (focusMode === "fitness") {
    if (workoutDone && proteinLeft > 15) return `${proteinLeft}g protein left to hit your target.`;
    if (workoutDone && proteinHit) return "Workout done. Protein on track. Good day.";
    if (!workoutDone && h >= 18) return "No session logged yet. Still time tonight.";
    if (!workoutDone && h >= 12 && day === 1) return "Mondays set the tone.";
    return null;
  }

  if (focusMode === "discipline") {
    if (allTasksDone && currentStreak >= 3) return `${currentStreak} days in a row. Discipline compounds.`;
    if (allTasksDone) return "All done. Discipline compounds.";
    if (h >= 20 && totalCount > completedCount) return "Finish strong before you sleep.";
    if (h < 10 && currentStreak > 0) return `Day ${currentStreak}. Make today count.`;
    if (day === 0 && h >= 17) return "End of week. Worth a moment of reflection.";
    return null;
  }

  // ── Balanced ──
  if (workoutDone && proteinLeft > 20) return `${proteinLeft}g protein left to hit your target.`;
  if (allTasksDone) return "Everything done for today.";
  if (h >= 20 && totalCount > completedCount) return "Finish strong before you sleep.";
  if (h < 10 && currentStreak > 0) return `Day ${currentStreak} of your streak. Stay consistent.`;
  if (day === 0 && h >= 17) return "End of week. Worth a moment of reflection.";
  return null;
}

// ── Task copy (hero card) ─────────────────────────────────────────────────────
export function getTaskCopy(dayState, config) {
  const h = new Date().getHours();
  const { allTasksDone, noTasksYet, completedCount, totalCount } = dayState;
  const remaining = totalCount - completedCount;

  if (noTasksYet) return { headline: config.emptyTaskHeadline, sub: config.emptyTaskSub };
  if (allTasksDone) return { headline: "All done today.", sub: config.allDoneSub };
  if (remaining === 1) return { headline: "One task left.", sub: "Finish strong." };
  if (h >= 21) return { headline: `${remaining} left tonight.`, sub: "Wind down when ready." };
  if (h >= 20) return { headline: `${remaining} left tonight.`, sub: "Make it count." };
  if (h >= 12 && h < 17) return { headline: `${remaining} left this afternoon.`, sub: `${completedCount} of ${totalCount} complete.` };
  return { headline: `${remaining} left today.`, sub: `${completedCount} of ${totalCount} complete.` };
}

// ── Workout copy ──────────────────────────────────────────────────────────────
export function getWorkoutCopy(sessions, config) {
  const done = sessions.some(s => s.status === "completed");
  const active = sessions.some(s => s.status === "active");
  const h = new Date().getHours();
  if (active) return { label: "In progress", color: "#f0a500", sub: "Keep going.", tappable: false };
  if (done)   return { label: "Done ✓", color: "#4caf50", sub: "Logged.", tappable: false };
  const sub = config.workoutEmptySub || (h < 10 ? "Day is young." : h >= 20 ? "Still time." : null);
  return { label: config.workoutEmptyLabel, color: "var(--text-faint)", sub, tappable: true };
}

// ── Nutrition copy ────────────────────────────────────────────────────────────
export function getNutritionCopy(summary, goals, config) {
  const cal = summary?.calories ?? 0;
  const protein = summary?.protein ?? 0;
  const goalCal = goals?.calories ?? 2000;
  const goalProtein = goals?.protein ?? 150;
  const proteinLeft = goalProtein - protein;
  if (cal === 0) return config.nutritionEmptyCopy || `Nothing logged yet · ${goalCal} kcal goal`;
  if (cal >= goalCal) return `${cal} kcal · Goal reached`;
  if (proteinLeft > 0 && proteinLeft < 50) return `${cal} kcal · ${proteinLeft}g protein left`;
  return `${cal} / ${goalCal} kcal · ${protein}g protein`;
}

// ── Weekly insight ────────────────────────────────────────────────────────────
export function getWeeklyInsight(weekStats, config) {
  const day = new Date().getDay();
  const prefix = config.weeklyPrefix;
  if (day === 0 || day === 1) {
    return weekStats?.activeDays > 0
      ? `${weekStats.activeDays}/7 days active last week.`
      : "Fresh week. Make it count.";
  }
  if (!weekStats || weekStats.taskPct === null) {
    return prefix ? `${prefix} Start logging to track your week.` : "Start logging to track your week.";
  }
  if (weekStats.taskPct >= 80) return `${weekStats.activeDays}/7 days · Strong week.`;
  if (weekStats.taskPct >= 50) return `${weekStats.activeDays}/7 days · Solid progress.`;
  return `${weekStats.activeDays}/7 days · Keep showing up.`;
}

// ── End-of-day summary (after 8pm, when earned) ───────────────────────────────
// Returns an array of achievement strings, or null if nothing worth surfacing.
export function getEndOfDaySummary(dayState) {
  const h = new Date().getHours();
  if (h < 20) return null;
  const { completedCount, totalCount, workoutDone, proteinHit, caloriesLogged } = dayState;
  const items = [];
  if (totalCount > 0 && completedCount === totalCount) items.push(`${completedCount} tasks done`);
  else if (completedCount > 0) items.push(`${completedCount} of ${totalCount} tasks`);
  if (workoutDone) items.push("workout logged");
  if (proteinHit && caloriesLogged) items.push("protein goal hit");
  return items.length >= 2 ? items : null;
}

// ── Momentum insight ──────────────────────────────────────────────────────────
// Surfaces the single most meaningful progression signal. No filler.
export function getMomentumInsight(currentStreak, longestStreak, weekStats, workouts) {
  const totalWorkouts = Object.values(workouts).reduce(
    (acc, sessions) => acc + sessions.filter(s => s.status === "completed").length, 0
  );
  const weekActive = weekStats?.activeDays ?? 0;
  const weekTaskPct = weekStats?.taskPct;

  if (currentStreak > 0 && currentStreak === longestStreak && currentStreak > 3) {
    return { label: "Personal best", value: `${currentStreak}-day streak — your longest yet` };
  }
  if (totalWorkouts > 0 && totalWorkouts % 10 === 0) {
    return { label: "Milestone", value: `${totalWorkouts} workouts logged` };
  }
  if (weekActive >= 5) {
    return { label: "This week", value: `${weekActive} active days — strong week` };
  }
  if (weekTaskPct !== null && weekTaskPct >= 80) {
    return { label: "Consistency", value: `${weekTaskPct}% tasks complete this week` };
  }
  if (currentStreak >= 3) {
    return { label: "Streak", value: `${currentStreak} days in a row` };
  }
  if (totalWorkouts >= 5) {
    return { label: "Progress", value: `${totalWorkouts} workouts logged` };
  }
  return null;
}

// ── Recovery / return states ──────────────────────────────────────────────────
// Called when streak === 0 and the user has prior history.
// Returns copy appropriate to a gap, not shame-based.
export function getRecoveryCopy(daysSinceActive) {
  if (daysSinceActive <= 0) return null;
  if (daysSinceActive === 1) return "Yesterday off. Pick it back up today.";
  if (daysSinceActive === 2) return "Two days off. Momentum isn't lost.";
  if (daysSinceActive <= 5) return "It happens. One session resets everything.";
  if (daysSinceActive <= 14) return "Welcome back. Start where you are.";
  return "Pick it back up. No guilt — just consistency from here.";
}

// ── Workout summary identity lines ────────────────────────────────────────────
// Shown on the post-workout completion screen. Calm and earned.
export function getWorkoutIdentityLine(session) {
  const exercises = session?.exercises || [];
  const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets || []).length, 0);
  const hasCardio = exercises.some(e => e.tracking_mode === "cardio");
  const duration = session?.duration;

  if (duration >= 60) return "Long session. You earned the rest.";
  if (totalSets >= 20) return "High volume. Recovery matters now.";
  if (hasCardio && exercises.length > 3) return "Cardio and strength. Complete session.";
  if (totalSets >= 10) return "Solid work. Consistency builds results.";
  if (totalSets >= 1) return "You showed up. That's what matters.";
  return "Session logged.";
}

// ── Nutrition screen status line ──────────────────────────────────────────────
// Appears beneath the calorie number. Contextual, not clinical.
export function getNutritionStatusLine(totals, goals) {
  const protein = totals?.protein ?? 0;
  const calories = totals?.calories ?? 0;
  const goalProtein = goals?.protein ?? 150;
  const goalCal = goals?.calories ?? 2000;
  const proteinLeft = goalProtein - protein;
  const calLeft = goalCal - calories;

  if (calories === 0) return null; // nothing to say yet
  if (protein >= goalProtein && calories >= goalCal * 0.9) return "Targets hit. Nutrition on point today.";
  if (protein >= goalProtein) return "Protein goal hit.";
  if (proteinLeft > 0 && proteinLeft <= 30) return `${proteinLeft}g protein left. Almost there.`;
  if (calLeft <= 0) return "Calorie target reached.";
  if (calLeft < 300) return `${calLeft} kcal remaining. Nearly there.`;
  return null;
}

// ── Tasks screen footer copy ──────────────────────────────────────────────────
export function getTasksFooterCopy(completedCount, totalCount) {
  if (totalCount === 0) return null;
  const pct = completedCount / totalCount;
  if (pct === 1) return "Done. Discipline compounds.";
  if (pct >= 0.75) return "Almost there.";
  if (pct >= 0.5) return "Halfway through. Keep going.";
  if (completedCount === 1) return "First one down.";
  return null;
}

// ── Weekly review observations ────────────────────────────────────────────────
// Returns up to 3 insight strings from the week's data.
// Tone: reflective, observant, warm but not gushing.
export function getWeekObservations(weekStats, weekDates, tasks, workouts) {
  const { activeDays, totalWorkouts, taskPct, perDay } = weekStats;
  const today = new Date().toISOString().slice(0, 10);
  const observations = [];

  // Strongest day
  if (perDay) {
    const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const strongest = perDay
      .filter(d => d.count > 0 && d.total > 0 && d.dateStr <= today)
      .sort((a, b) => (b.count / b.total) - (a.count / a.total))[0];
    if (strongest) {
      const [y, m, d] = strongest.dateStr.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const dayName = DAY_FULL[dow === 0 ? 6 : dow - 1];
      observations.push(`Most consistent day: ${dayName}`);
    }
  }

  // Workout count
  if (totalWorkouts >= 5) observations.push(`${totalWorkouts} workouts completed — strong training week`);
  else if (totalWorkouts >= 3) observations.push(`${totalWorkouts} workouts logged this week`);
  else if (totalWorkouts === 1) observations.push("1 workout logged. More is in reach.");
  else if (totalWorkouts === 0) observations.push("No workouts this week. Next week is fresh.");

  // Task rate
  if (taskPct !== null) {
    if (taskPct >= 90) observations.push(`${taskPct}% task completion. Near-perfect week.`);
    else if (taskPct >= 70) observations.push(`${taskPct}% completion. Solid consistency.`);
    else if (taskPct >= 50) observations.push(`${taskPct}% completion. More than halfway.`);
    else if (taskPct > 0) observations.push(`${taskPct}% completion. Rough week — reset and go again.`);
  }

  // Active days
  if (activeDays >= 6) observations.push(`${activeDays}/7 days active. Exceptional.`);
  else if (activeDays >= 5) observations.push(`${activeDays}/7 days active.`);

  return observations.slice(0, 3);
}

// ── HomeScreen empty state copy ───────────────────────────────────────────────
export const SECTION_EMPTY = {
  discipline: "Tap + to add a routine",
  fitness: "Tap + to add a task",
  balanced: "Tap + to add a task",
};

// ── Onboarding slide copy ─────────────────────────────────────────────────────
export const ONBOARDING_SLIDES = [
  {
    icon: "⚓",
    headline: "Build consistency.",
    body: "Small daily actions compound into the person you want to become.",
  },
  {
    icon: "◎",
    headline: "Everything in one place.",
    body: "Tasks, workouts, nutrition — connected and aware of each other.",
  },
  {
    icon: "→",
    headline: "Stay anchored.",
    body: "Not perfect. Just consistent. That's the whole game.",
  },
];

// ── Auth screen ───────────────────────────────────────────────────────────────
export const AUTH_COPY = {
  login: "Welcome back.",
  signup: "Build something lasting.",
};
