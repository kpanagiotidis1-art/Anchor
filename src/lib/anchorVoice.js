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
export function getDayState({
  completedCount,
  totalCount,
  workoutDone,
  nutritionSummary,
  nutritionGoals,
  currentStreak,
}) {
  const proteinGoal = nutritionGoals?.protein ?? 150;
  const protein = nutritionSummary?.protein ?? 0;
  const calories = nutritionSummary?.calories ?? 0;
  const proteinLeft = Math.max(0, proteinGoal - protein);
  const proteinHit = protein >= proteinGoal * 0.95;
  const caloriesLogged = calories > 0;
  const allTasksDone = totalCount > 0 && completedCount >= totalCount;
  const noTasksYet = totalCount === 0;
  const partialTasks = completedCount > 0 && !allTasksDone;
  const nothing = completedCount === 0 && !workoutDone && !caloriesLogged;
  const completeDay = allTasksDone && workoutDone;
  const alignedDay = completeDay && proteinHit;

  return {
    allTasksDone, noTasksYet, partialTasks, nothing,
    workoutDone, proteinHit, proteinLeft, caloriesLogged,
    completeDay, alignedDay,
    completedCount, totalCount, currentStreak,
  };
}

// ── Aligned day state — cross-pillar classifier ───────────────────────────────
//
// The single function that determines which "aligned" tier has been reached.
// Drives visual state, accent colour, and identity copy in OverviewScreen.
//
// Tiers (highest to lowest priority):
//   "full"     — tasks + workout + protein. Everything aligned.
//   "complete" — tasks + workout. Protein not tracked.
//   "fuelled"  — workout + protein. No tasks (fitness-mode natural state).
//   "focused"  — all tasks done. Workout hasn't happened yet.
//   "active"   — workout logged. Tasks in progress.
//   null       — nothing earned. Normal/default state.
//
// Returns: { tier, line, sub, pillars, accentColor } | null
export function getAlignedDayState(dayState) {
  const {
    allTasksDone, workoutDone, proteinHit,
    completeDay, alignedDay, totalCount, noTasksYet,
  } = dayState;

  if (alignedDay) {
    return {
      tier: "full",
      line: "Everything aligned today.",
      sub: "Tasks, training, nutrition. You stayed anchored.",
      pillars: ["tasks", "workout", "nutrition"],
      accentColor: "#4caf50",
    };
  }

  if (completeDay) {
    return {
      tier: "complete",
      line: "Strong finish today.",
      sub: "Tasks done. Workout logged.",
      pillars: ["tasks", "workout"],
      accentColor: "#4caf50",
    };
  }

  // Workout + protein, no task system being used
  if (workoutDone && proteinHit && noTasksYet) {
    return {
      tier: "fuelled",
      line: "Trained and fuelled.",
      sub: "Workout logged. Protein goal hit.",
      pillars: ["workout", "nutrition"],
      accentColor: "#4caf50",
    };
  }

  // All tasks done, workout hasn't happened yet — partial, no accent
  if (allTasksDone && !workoutDone && totalCount > 0) {
    return {
      tier: "focused",
      line: "Routines done.",
      sub: null,
      pillars: ["tasks"],
      accentColor: null,
    };
  }

  // Workout logged, tasks still in progress — partial, no accent
  if (workoutDone && !allTasksDone && totalCount > 0) {
    return {
      tier: "active",
      line: "Session logged.",
      sub: null,
      pillars: ["workout"],
      accentColor: null,
    };
  }

  return null;
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
// When alignedState is "full" or "complete", this defers — the banner
// already owns that moment. Context line stays quiet.
export function getContextLine(dayState, focusMode, weekStats, alignedState) {
  const h = new Date().getHours();
  const day = new Date().getDay();
  const {
    allTasksDone, workoutDone, proteinLeft, proteinHit,
    alignedDay, currentStreak, totalCount, completedCount, nothing,
  } = dayState;

  // Streak milestones always surface
  if (currentStreak === 7)   return "Seven days straight. That's a real habit now.";
  if (currentStreak === 14)  return "Two weeks consistent. This is who you are.";
  if (currentStreak === 21)  return "Three weeks. Identity locked in.";
  if (currentStreak === 30)  return "Thirty days. You've built something real.";
  if (currentStreak === 60)  return "Sixty days. Most people never get here.";
  if (currentStreak === 100) return "One hundred days. That's exceptional.";

  // Defer when aligned banner owns the moment
  if (alignedState?.tier === "full" || alignedState?.tier === "complete") return null;

  if (h >= 21) {
    if (alignedDay) return null;
    if (allTasksDone && !workoutDone) return "Tasks done. Good day.";
    if (workoutDone && !allTasksDone) return "Workout logged. That counts.";
    if (nothing) return "Tomorrow is a clean slate.";
    const remaining = totalCount - completedCount;
    if (remaining > 0) return `${remaining} left. Wind down when you're ready.`;
    return null;
  }

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
// Suppressed when aligned banner is active — no double-speak.
export function getEndOfDaySummary(dayState, alignedState) {
  const h = new Date().getHours();
  if (h < 20) return null;
  if (alignedState?.tier === "full" || alignedState?.tier === "complete") return null;

  const { completedCount, totalCount, workoutDone, proteinHit, caloriesLogged } = dayState;
  const items = [];
  if (totalCount > 0 && completedCount === totalCount) items.push(`${completedCount} tasks done`);
  else if (completedCount > 0) items.push(`${completedCount} of ${totalCount} tasks`);
  if (workoutDone) items.push("workout logged");
  if (proteinHit && caloriesLogged) items.push("protein goal hit");
  return items.length >= 2 ? items : null;
}

// ── Momentum insight ──────────────────────────────────────────────────────────
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
export function getRecoveryCopy(daysSinceActive) {
  if (daysSinceActive <= 0) return null;
  if (daysSinceActive === 1) return "Yesterday off. Pick it back up today.";
  if (daysSinceActive === 2) return "Two days off. Momentum isn't lost.";
  if (daysSinceActive <= 5) return "It happens. One session resets everything.";
  if (daysSinceActive <= 14) return "Welcome back. Start where you are.";
  return "Pick it back up. No guilt — just consistency from here.";
}

// ── Workout summary identity lines ────────────────────────────────────────────
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
export function getNutritionStatusLine(totals, goals) {
  const protein = totals?.protein ?? 0;
  const calories = totals?.calories ?? 0;
  const goalProtein = goals?.protein ?? 150;
  const goalCal = goals?.calories ?? 2000;
  const proteinLeft = goalProtein - protein;
  const calLeft = goalCal - calories;

  if (calories === 0) return null;
  if (protein >= goalProtein && calories >= goalCal * 0.9) return "Targets hit. Nutrition on point today.";
  if (protein >= goalProtein) return "Protein goal hit.";
  if (proteinLeft > 0 && proteinLeft <= 30) return `${Math.round(proteinLeft)}g protein left. Almost there.`;
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
export function getWeekObservations(weekStats) {
  const { activeDays, totalWorkouts, taskPct, perDay } = weekStats;
  const today = new Date().toISOString().slice(0, 10);
  const observations = [];

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

  if (totalWorkouts >= 5) observations.push(`${totalWorkouts} workouts completed — strong training week`);
  else if (totalWorkouts >= 3) observations.push(`${totalWorkouts} workouts logged this week`);
  else if (totalWorkouts === 1) observations.push("1 workout logged. More is in reach.");
  else if (totalWorkouts === 0) observations.push("No workouts this week. Next week is fresh.");

  if (taskPct !== null) {
    if (taskPct >= 90) observations.push(`${taskPct}% task completion. Near-perfect week.`);
    else if (taskPct >= 70) observations.push(`${taskPct}% completion. Solid consistency.`);
    else if (taskPct >= 50) observations.push(`${taskPct}% completion. More than halfway.`);
    else if (taskPct > 0) observations.push(`${taskPct}% completion. Rough week — reset and go again.`);
  }

  if (activeDays >= 6) observations.push(`${activeDays}/7 days active. Exceptional.`);
  else if (activeDays >= 5) observations.push(`${activeDays}/7 days active.`);

  return observations.slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKOUT ENVIRONMENT VOICE
// Functions that make the workout tab feel like a training environment
// rather than a session logger.
// ─────────────────────────────────────────────────────────────────────────────

// ── Session identity — derives a human name from exercise composition ─────────
//
// Classifies sessions so they become chapters, not timestamps.
// Returns: "Push Day" | "Pull Day" | "Leg Day" | "Upper Body" | "Full Body"
//          | "Cardio" | "Core & Conditioning" | null (can't determine)
export function getSessionIdentity(exercises) {
  if (!exercises || exercises.length === 0) return null;

  const names = exercises.map(e => (e.name || "").toLowerCase());

  const PUSH_KW  = ["bench", "chest", "press", "ohp", "overhead", "tricep", "shoulder", "dip", "flye", "push"];
  const PULL_KW  = ["row", "pull", "lat", "curl", "deadlift", "chin", "back", "bicep", "face pull", "shrug", "rdl"];
  const LEG_KW   = ["squat", "leg", "lunge", "calf", "glute", "hamstring", "hip thrust", "hack", "quad", "split squat"];
  const CARDIO_KW = ["run", "bike", "treadmill", "cardio", "cycling", "elliptical", "swim", "stair", "rowing", "rower", "jog", "walk", "hike"];
  const CORE_KW  = ["plank", "ab ", "crunch", "sit-up", "situp", "core", "hollow", "l-sit", "dead bug"];

  function score(kwList) {
    return names.filter(n => kwList.some(k => n.includes(k))).length;
  }

  const push    = score(PUSH_KW);
  const pull    = score(PULL_KW);
  const legs    = score(LEG_KW);
  const cardio  = score(CARDIO_KW);
  const core    = score(CORE_KW);
  const total   = exercises.length;

  // Cardio dominant
  if (cardio / total >= 0.6) return "Cardio";
  if (cardio > 0 && push === 0 && pull === 0 && legs === 0) return "Cardio";

  // Mostly legs
  if (legs >= 2 && legs > push && legs > pull) return "Leg Day";

  // Push dominant
  if (push >= 2 && push > pull && push > legs) return "Push Day";

  // Pull dominant
  if (pull >= 2 && pull > push && pull > legs) return "Pull Day";

  // Mixed upper (push + pull)
  if (push >= 1 && pull >= 1 && legs === 0) return "Upper Body";

  // Full body (all three present)
  if (push >= 1 && pull >= 1 && legs >= 1) return "Full Body";

  // Core focused
  if (core >= 2 || (core >= 1 && total <= 3)) return "Core & Conditioning";

  return null;
}

// ── Training momentum copy — drives the workout tab header ───────────────────
//
// weekSessions:  number of completed sessions this week (0–7)
// lastSession:   the most recent completed session object, or null
// daysSinceLastSession: computed by caller
//
// Returns: { headline, sub, tone }
//   tone: "fresh" | "building" | "consistent" | "strong" | "resting"
export function getTrainingMomentumCopy(weekSessions, lastSession, daysSinceLastSession) {
  const identity = lastSession ? getSessionIdentity(lastSession.exercises || []) : null;
  const h = new Date().getHours();
  const isEvening = h >= 18;

  // Rest day / no recent activity
  if (weekSessions === 0) {
    const sub = isEvening
      ? "Still time tonight."
      : h < 12 ? "Morning sessions build the strongest habits." : "Afternoon session?";
    return { headline: "No sessions yet this week.", sub, tone: "fresh" };
  }

  if (daysSinceLastSession === 0) {
    // Already trained today
    const identityLabel = identity ? `${identity} logged.` : "Session logged.";
    return {
      headline: identityLabel,
      sub: weekSessions >= 4 ? "Strong week in progress." : "Consistent.",
      tone: "consistent",
    };
  }

  if (daysSinceLastSession === 1) {
    const sub = identity ? `Yesterday: ${identity}.` : "Yesterday's session is in.";
    if (weekSessions >= 4) {
      return { headline: `${weekSessions} sessions this week.`, sub, tone: "strong" };
    }
    return { headline: "Momentum is building.", sub, tone: "building" };
  }

  if (daysSinceLastSession >= 3) {
    const sub = identity ? `Last session: ${identity}.` : "Last session is behind you.";
    return {
      headline: weekSessions > 0 ? `${weekSessions} session${weekSessions !== 1 ? "s" : ""} this week.` : "Back to it.",
      sub,
      tone: "fresh",
    };
  }

  // 2 days since last session
  if (weekSessions >= 5) {
    return { headline: `${weekSessions} sessions this week.`, sub: "Exceptional consistency.", tone: "strong" };
  }
  if (weekSessions >= 3) {
    return { headline: `${weekSessions} sessions this week.`, sub: "Consistency is showing.", tone: "consistent" };
  }

  return {
    headline: `${weekSessions} session${weekSessions !== 1 ? "s" : ""} this week.`,
    sub: "Keep building.",
    tone: "building",
  };
}

// ── Exercise progression hint ─────────────────────────────────────────────────
//
// Compares today's logged sets to the last session's sets to show
// whether the user is matching, exceeding, or below their last effort.
// Returns a short string or null.
export function getExerciseProgressionHint(exerciseName, exerciseHistory, currentSets) {
  const history = exerciseHistory?.[exerciseName];
  if (!history || history.length === 0) return null;

  const lastSession = history[0];
  const lastSets = lastSession?.sets || [];
  if (lastSets.length === 0) return null;

  // Reps mode: find best set by weight × reps score
  const lastBest = lastSets.reduce((best, set) => {
    const score = (set.weight || 0) * (set.reps || 0);
    const bestScore = (best?.weight || 0) * (best?.reps || 0);
    return score > bestScore ? set : best;
  }, null);

  if (!lastBest) return null;

  const weight = lastBest.weight ? `${lastBest.weight}kg` : "BW";
  const setStr = `${weight} × ${lastBest.reps}`;

  // If no current sets yet, just show last
  if (!currentSets || currentSets.length === 0) {
    return `Last: ${setStr}`;
  }

  // Compare current best to last best
  const currentBest = currentSets.reduce((best, set) => {
    const score = (set.weight || 0) * (set.reps || 0);
    const bestScore = (best?.weight || 0) * (best?.reps || 0);
    return score > bestScore ? set : best;
  }, null);

  if (!currentBest) return `Last: ${setStr}`;

  const lastScore = (lastBest.weight || 0) * (lastBest.reps || 0);
  const curScore  = (currentBest.weight || 0) * (currentBest.reps || 0);

  if (curScore > lastScore) return "Weight increased";
  if (curScore === lastScore && lastScore > 0) return `Matched — ${setStr}`;
  return `Last: ${setStr}`;
}

// ── Recent sessions label ─────────────────────────────────────────────────────
// Returns a human-readable date label for a session relative to today.
export function getRelativeSessionLabel(dateStr) {
  const today = new Date();
  const date  = new Date(dateStr + "T00:00:00");
  const diffMs   = today.setHours(0,0,0,0) - date.setHours(0,0,0,0);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 6) {
    return date.toLocaleDateString("en-AU", { weekday: "short" });
  }
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// ── Longitudinal intelligence ─────────────────────────────────────────────────

export function getMultiWeekPattern(workouts) {
  if (!workouts || Object.keys(workouts).length === 0) return null;
  const today = new Date();
  const counts = [];

  for (let w = 0; w < 4; w++) {
    const ref = new Date(today);
    ref.setDate(today.getDate() - w * 7);
    const dow = ref.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(ref);
    mon.setDate(ref.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const monStr = mon.toISOString().slice(0, 10);
    const sunStr = sun.toISOString().slice(0, 10);

    let sessions = 0;
    Object.entries(workouts).forEach(([d, s]) => {
      if (d >= monStr && d <= sunStr) sessions += (s || []).length;
    });
    counts.unshift(sessions);
  }

  const [w1, w2, w3, current] = counts;
  if (w1 === 0 && w2 === 0 && w3 === 0 && current === 0) return null;

  if (current >= 3 && w3 >= 3 && w2 >= 3) return "3+ sessions per week — consistent for a month.";
  if (current > w3 && w3 > 0) return `Training up — ${current} sessions this week vs ${w3} last.`;
  if (w1 > 0 && w2 > 0 && w3 > 0 && current > 0) {
    const avg = ((w1 + w2 + w3 + current) / 4).toFixed(1);
    return `Averaging ${avg} sessions per week over 4 weeks.`;
  }
  return null;
}

export function getCrossSystemObservation({ weekStats, nutritionSummary, nutritionGoals, currentStreak, workouts }) {
  const { activeDays = 0, totalWorkouts = 0, taskPct = null } = weekStats || {};
  const protein = nutritionSummary?.protein ?? 0;
  const proteinGoal = nutritionGoals?.protein ?? 150;
  const proteinHit = protein >= proteinGoal * 0.95 && protein > 0;
  const caloriesLogged = (nutritionSummary?.calories ?? 0) > 0;

  if (totalWorkouts >= 3 && taskPct >= 80) {
    return `${totalWorkouts} workouts and ${taskPct}% of tasks done this week.`;
  }
  if (totalWorkouts >= 3 && proteinHit && caloriesLogged) {
    return `Training ${totalWorkouts}× this week and hitting nutrition today.`;
  }
  const multiWeek = getMultiWeekPattern(workouts || {});
  if (multiWeek) return multiWeek;
  if (currentStreak >= 7 && totalWorkouts >= 2) {
    return `${currentStreak}-day streak with ${totalWorkouts} workouts this week.`;
  }
  if (activeDays >= 5) return `Active ${activeDays} of 7 days this week.`;
  return null;
}

// ── Physical progress narratives ──────────────────────────────────────────────

export function getWeightTrendCopy(logs) {
  if (!logs || logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].weightKg;
  const last = sorted[sorted.length - 1].weightKg;
  const delta = last - first;
  const abs = Math.abs(delta).toFixed(1);
  if (Math.abs(delta) < 0.3) return "Holding steady overall.";
  if (delta < 0) return `Down ${abs} kg since you started.`;
  return `Up ${abs} kg since you started.`;
}

export function getRecentWeightChange(logs, days = 30) {
  if (!logs || logs.length < 2) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = [...logs]
    .filter(l => l.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (recent.length < 2) return null;
  const delta = recent[recent.length - 1].weightKg - recent[0].weightKg;
  const abs = Math.abs(delta).toFixed(1);
  if (Math.abs(delta) < 0.3) return "Stable this month.";
  if (delta < 0) return `-${abs} kg this month.`;
  return `+${abs} kg this month.`;
}

export const SECTION_EMPTY = {
  discipline: "Tap + to add a routine",
  fitness: "Tap + to add a task",
  balanced: "Tap + to add a task",
};

export const ONBOARDING_SLIDES = [
  { icon: "⚓", headline: "Build consistency.", body: "Small daily actions compound into the person you want to become." },
  { icon: "◎", headline: "Everything in one place.", body: "Tasks, workouts, nutrition — connected and aware of each other." },
  { icon: "→", headline: "Stay anchored.", body: "Not perfect. Just consistent. That's the whole game." },
];

export const AUTH_COPY = {
  login: "Welcome back.",
  signup: "Build something lasting.",
};
