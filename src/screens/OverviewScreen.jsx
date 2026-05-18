import { useState, useEffect } from "react";
import { getFocusMode } from "./OnboardingScreen";

export { getFocusMode };

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const SECTIONS = ["Morning", "Afternoon", "Night"];

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDateFull(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  if (h < 21) return "Good evening.";
  return "Wind down.";
}

// ── Contextual intelligence — observant, not overbearing ──
function getContextLine(completedCount, totalCount, workoutDone, nutritionSummary, nutritionGoals, focusMode, currentStreak, weekStats, workouts) {
  const h = new Date().getHours();
  const day = new Date().getDay(); // 0=Sun
  const proteinLeft = Math.max(0, (nutritionGoals?.protein ?? 150) - (nutritionSummary?.protein ?? 0));
  const allDone = totalCount > 0 && completedCount === totalCount;

  // ── Streak milestone moments ──
  if (currentStreak === 7) return "Seven days straight. That's a real habit.";
  if (currentStreak === 14) return "Two weeks consistent. Keep going.";
  if (currentStreak === 30) return "Thirty days. You've built something real.";

  // ── End of day (after 9pm) — calm closure ──
  if (h >= 21) {
    if (allDone && workoutDone) return "Strong finish today. Everything done.";
    if (allDone) return "Tasks done. Good day.";
    if (workoutDone && proteinLeft <= 15) return "Workout and nutrition on point. Rest up.";
    if (totalCount > 0 && completedCount === 0) return "Tomorrow is a fresh start.";
    const remaining = totalCount - completedCount;
    if (remaining > 0) return `${remaining} task${remaining > 1 ? "s" : ""} left. Wind down when you're ready.`;
    return null;
  }

  // ── Fitness mode ──
  if (focusMode === "fitness") {
    if (workoutDone && proteinLeft > 15) return `${proteinLeft}g protein left to hit your target.`;
    if (workoutDone && proteinLeft <= 15) return "Workout done. Protein nearly there. Strong day.";
    if (!workoutDone && h >= 18) return "No workout logged yet. Still time tonight.";
    if (!workoutDone && h >= 12 && day === 1) return "Mondays set the tone for the week.";
    return null;
  }

  // ── Discipline mode ──
  if (focusMode === "discipline") {
    if (allDone && currentStreak >= 3) return `${currentStreak} days in a row. Discipline compounds.`;
    if (allDone) return "Discipline compounds. Keep the streak going.";
    if (h >= 20 && totalCount > completedCount) return "Finish strong before you sleep.";
    if (day === 0 && h >= 17) return "Take a moment to review your week.";
    // Morning encouragement based on yesterday's completion
    if (h < 10 && currentStreak > 0) return `${currentStreak}-day streak. Make today count.`;
    return null;
  }

  // ── Balanced ──
  if (workoutDone && proteinLeft <= 15) return "Workout and nutrition on track. Good day.";
  if (workoutDone && proteinLeft > 20) return `${proteinLeft}g protein left to hit your target.`;
  if (day === 0 && h >= 17) return "Take a moment to review your week.";
  if (allDone) return "Everything done for today.";
  if (h >= 20 && totalCount > completedCount) return "Finish strong before you sleep.";
  if (h < 10 && currentStreak > 0) return `Day ${currentStreak} of your streak. Stay consistent.`;
  return null;
}

// ── End-of-day summary — shown after 8pm when meaningful ──
function getEndOfDaySummary(completedCount, totalCount, workoutDone, nutritionSummary, nutritionGoals, focusMode) {
  const h = new Date().getHours();
  if (h < 20) return null;

  const items = [];
  if (totalCount > 0 && completedCount === totalCount) items.push(`${completedCount} tasks done`);
  else if (completedCount > 0) items.push(`${completedCount} of ${totalCount} tasks`);
  if (workoutDone) items.push("workout logged");
  const proteinHit = nutritionSummary?.protein >= (nutritionGoals?.protein ?? 150) * 0.9;
  if (proteinHit && nutritionSummary?.protein > 0) items.push("protein goal hit");

  if (items.length < 2) return null; // only show if there's something meaningful
  return items;
}

// ── Momentum insight — replaces dead "Steps: coming soon" ──
function getMomentumInsight(currentStreak, longestStreak, weekStats, workouts, tasks) {
  // Count total workouts ever
  const totalWorkouts = Object.values(workouts).reduce((acc, sessions) => acc + sessions.filter(s => s.status === "completed").length, 0);

  // Count total completed tasks this week
  const weekTaskPct = weekStats?.taskPct;
  const weekActive = weekStats?.activeDays ?? 0;

  if (currentStreak > 0 && currentStreak === longestStreak && currentStreak > 3) {
    return { label: "Momentum", value: `${currentStreak}-day streak — your longest yet` };
  }
  if (totalWorkouts > 0 && totalWorkouts % 10 === 0) {
    return { label: "Milestone", value: `${totalWorkouts} workouts logged` };
  }
  if (weekActive >= 5) {
    return { label: "This week", value: `${weekActive} days active — strong week` };
  }
  if (weekTaskPct !== null && weekTaskPct >= 80) {
    return { label: "Consistency", value: `${weekTaskPct}% tasks done this week` };
  }
  if (currentStreak >= 3) {
    return { label: "Streak", value: `${currentStreak} days in a row` };
  }
  if (totalWorkouts >= 5) {
    return { label: "Progress", value: `${totalWorkouts} workouts logged` };
  }
  return null;
}

// ── Focus configuration — single source of truth ──
const FOCUS_CONFIG = {
  discipline: {
    heroMode: "tasks",
    emptyTaskHeadline: "Build your routine.",
    emptyTaskSub: "Structure is the foundation of everything.",
    emptyTaskCTA: "Add your first routine →",
    emptyTaskCTATarget: "tasks",
    allDoneSub: "Discipline compounds. Keep the streak going.",
    workoutEmptyLabel: "Not yet",
    workoutEmptySub: "Recovery counts too.",
    tertiaryOrder: ["weekly", "nutrition"],
    nutritionEmptyCopy: null,
    weeklyPrefix: "Consistency is everything.",
    tasksSubtitle: "Stay on track.",
    sectionEmptyLabel: "Tap + to add a routine",
    workoutNudge: null,
    secondaryLeft: "streak",
  },
  fitness: {
    heroMode: "fitness",
    emptyTaskHeadline: "Track today's training.",
    emptyTaskSub: "Add tasks to structure your day around your goals.",
    emptyTaskCTA: "Start a workout →",
    emptyTaskCTATarget: "workout",
    allDoneSub: "Fuelled and focused. Nice work.",
    workoutEmptyLabel: "Ready?",
    workoutEmptySub: "Start today's session →",
    tertiaryOrder: ["tasks", "weekly"],
    nutritionEmptyCopy: "Nothing logged — tap to add your first meal",
    weeklyPrefix: null,
    tasksSubtitle: "Structure your day.",
    sectionEmptyLabel: "Tap + to add a task",
    workoutNudge: "Ready for today's session?",
    secondaryLeft: "workout",
  },
  balanced: {
    heroMode: "tasks",
    emptyTaskHeadline: "No tasks today",
    emptyTaskSub: "Add tasks to get started.",
    emptyTaskCTA: "Add your first task →",
    emptyTaskCTATarget: "tasks",
    allDoneSub: "Stay consistent. That's the whole game.",
    workoutEmptyLabel: "Not yet",
    workoutEmptySub: null,
    tertiaryOrder: ["weekly", "nutrition"],
    nutritionEmptyCopy: null,
    weeklyPrefix: null,
    tasksSubtitle: null,
    sectionEmptyLabel: "Tap + to add a task",
    workoutNudge: null,
    secondaryLeft: "streak",
  },
};

export function getConfig(focusMode) {
  return FOCUS_CONFIG[focusMode] || FOCUS_CONFIG.balanced;
}

function getTaskCopy(completed, total, remaining, config) {
  const h = new Date().getHours();
  if (total === 0) return { headline: config.emptyTaskHeadline, sub: config.emptyTaskSub };
  if (completed === total) return { headline: "All done today.", sub: config.allDoneSub };
  if (remaining === 1) return { headline: "One task left.", sub: "Finish strong." };
  if (h >= 21) return { headline: `${remaining} left tonight.`, sub: "Wind down when ready." };
  if (h >= 20) return { headline: `${remaining} left tonight.`, sub: "Make it count." };
  if (h >= 12 && h < 17) return { headline: `${remaining} left this afternoon.`, sub: `${completed} of ${total} complete.` };
  return { headline: `${remaining} left today.`, sub: `${completed} of ${total} complete.` };
}

function getWorkoutCopy(sessions, config) {
  const done = sessions.some(s => s.status === "completed");
  const active = sessions.some(s => s.status === "active");
  const h = new Date().getHours();
  if (active) return { label: "In progress", color: "#f0a500", sub: "Keep going.", tappable: false };
  if (done) return { label: "Done ✓", color: "#4caf50", sub: "Workout logged.", tappable: false };
  const sub = config.workoutEmptySub || (h < 10 ? "Day is young." : h >= 20 ? "Still time tonight." : null);
  return { label: config.workoutEmptyLabel, color: "var(--text-faint)", sub, tappable: true };
}

function getNutritionCopy(summary, goals, config) {
  const cal = summary?.calories ?? 0;
  const protein = summary?.protein ?? 0;
  const goalCal = goals?.calories ?? 2000;
  const goalProtein = goals?.protein ?? 150;
  const proteinLeft = goalProtein - protein;
  const remaining = goalCal - cal;
  if (cal === 0) return config.nutritionEmptyCopy || `Nothing logged yet · ${goalCal} kcal goal`;
  if (remaining <= 0) return `${cal} kcal · Goal reached`;
  if (proteinLeft > 0 && proteinLeft < 50) return `${cal} kcal · ${proteinLeft}g protein left`;
  return `${cal} / ${goalCal} kcal · ${protein}g protein`;
}

function getWeeklyInsight(weekStats, config) {
  const day = new Date().getDay();
  const prefix = config.weeklyPrefix;
  if (day === 0 || day === 1) {
    return weekStats?.activeDays > 0
      ? `${weekStats.activeDays}/7 days active last week. New week, new start.`
      : "Fresh week. Make it count.";
  }
  if (!weekStats || weekStats.taskPct === null) {
    return prefix ? `${prefix} Start logging to track your week.` : "Start completing tasks to track your week.";
  }
  if (weekStats.taskPct >= 80) return `${weekStats.activeDays}/7 days · Strong week.`;
  if (weekStats.taskPct >= 50) return `${weekStats.activeDays}/7 days · Solid progress.`;
  return prefix ? `${weekStats.activeDays}/7 days · ${prefix}` : `${weekStats.activeDays}/7 days · Keep showing up.`;
}

// ── Progress ring ──
function ProgressRing({ completed, total }) {
  const size = 120;
  const sw = 9;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : Math.min(completed / total, 1);
  const isComplete = total > 0 && completed >= total;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={isComplete ? "#4caf50" : "var(--text-primary)"}
          strokeWidth={sw}
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {total === 0 ? (
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", padding: "0 8px" }}>No tasks</p>
        ) : (
          <>
            <p style={{
              fontSize: "1.6rem", fontWeight: 700, lineHeight: 1,
              color: isComplete ? "#4caf50" : "var(--text-primary)",
              transition: "color 0.4s ease",
            }}>{completed}</p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>of {total}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Protein bar ──
function ProteinBar({ current, goal }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const left = Math.max(0, goal - current);
  const isHit = current >= goal;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <p style={{ fontSize: "1.8rem", fontWeight: 700, color: isHit ? "#4caf50" : "var(--text-primary)", lineHeight: 1, transition: "color 0.4s" }}>
          {current}g
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ {goal}g protein</p>
      </div>
      <div style={{ height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", marginBottom: "6px" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: isHit ? "#4caf50" : "#4a90d9",
          borderRadius: "99px", transition: "width 0.5s cubic-bezier(0.4,0,0.2,1), background 0.4s ease",
        }} />
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
        {isHit ? "Protein goal hit. Nice work." : `${left}g left to hit your target`}
      </p>
    </div>
  );
}

// ── FITNESS HERO CARD ──
function FitnessHeroCard({ nutritionSummary, nutritionGoals, workoutCopy, weeklyDots, onOpenReview, onGoToWorkout, onGoToNutrition }) {
  const protein = nutritionSummary?.protein ?? 0;
  const goalProtein = nutritionGoals?.protein ?? 150;
  const cal = nutritionSummary?.calories ?? 0;
  const goalCal = nutritionGoals?.calories ?? 2000;

  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "20px", boxShadow: "var(--shadow)", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
        <ProteinBar current={protein} goal={goalProtein} />
      </div>

      <div style={{ display: "flex", gap: "0", borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
        <button onClick={onGoToNutrition} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{cal}</p>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            of {goalCal} kcal
          </p>
        </button>

        <div style={{ width: "1px", height: "32px", background: "var(--border-light)", flexShrink: 0, alignSelf: "center" }} />

        <button
          onClick={workoutCopy.tappable ? onGoToWorkout : undefined}
          style={{ flex: 1, paddingLeft: "16px", background: "none", border: "none", cursor: workoutCopy.tappable ? "pointer" : "default", textAlign: "left" }}
        >
          <p style={{ fontSize: "1rem", fontWeight: 700, color: workoutCopy.color, lineHeight: 1, transition: "color 0.3s" }}>{workoutCopy.label}</p>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Workout</p>
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "12px", marginTop: "12px" }}>
        <button onClick={onOpenReview} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", gap: "4px" }}>
          {(weeklyDots || []).map((dot, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: dot.active ? "var(--text-primary)" : "var(--border)", transition: "background 0.3s" }} />
              <span style={{ fontSize: "0.5rem", color: dot.active ? "var(--text-primary)" : "var(--text-faint)", fontWeight: dot.active ? 600 : 400 }}>{DAY_LABELS[i]}</span>
            </div>
          ))}
        </button>
      </div>
    </div>
  );
}

// ── TASK HERO CARD ──
function TaskHeroCard({ completedCount, totalCount, remainingToday, taskCopy, config, weeklyDots, onOpenReview, onGoToTasks, onGoToWorkout, onShowRemaining }) {
  const isComplete = totalCount > 0 && completedCount === totalCount;

  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "20px", boxShadow: "var(--shadow)", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: (remainingToday.length > 0 || totalCount > 0) ? "16px" : "0" }}>
        <ProgressRing completed={completedCount} total={totalCount} />
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: "1.05rem", fontWeight: 700, marginBottom: "4px",
            color: isComplete ? "#4caf50" : "var(--text-primary)",
            transition: "color 0.4s ease",
          }}>
            {taskCopy.headline}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>
            {taskCopy.sub}
          </p>
          <button onClick={onOpenReview} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", gap: "4px" }}>
            {(weeklyDots || []).map((dot, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: dot.active ? "var(--text-primary)" : "var(--border)", transition: "background 0.3s" }} />
                <span style={{ fontSize: "0.5rem", color: dot.active ? "var(--text-primary)" : "var(--text-faint)", fontWeight: dot.active ? 600 : 400 }}>{DAY_LABELS[i]}</span>
              </div>
            ))}
          </button>
        </div>
      </div>

      {remainingToday.length > 0 && (
        <button onClick={onShowRemaining} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
            {remainingToday.slice(0, 3).map((task) => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
                <div style={{ width: "14px", height: "14px", borderRadius: "4px", border: "1.5px solid var(--border)", flexShrink: 0 }} />
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.name}</p>
              </div>
            ))}
            {remainingToday.length > 3 && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>+{remainingToday.length - 3} more</p>
            )}
          </div>
        </button>
      )}

      {isComplete && (
        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
          <p style={{ fontSize: "0.82rem", color: "#4caf50", fontWeight: 500 }}>All tasks complete. Stay consistent.</p>
        </div>
      )}

      {totalCount === 0 && (
        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
          <button
            onClick={config.emptyTaskCTATarget === "workout" ? onGoToWorkout : onGoToTasks}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "inherit", textDecoration: "underline", textDecorationColor: "var(--border)" }}
          >
            {config.emptyTaskCTA}
          </button>
        </div>
      )}
    </div>
  );
}

// ── End-of-day summary card — shown after 8pm ──
function EndOfDayCard({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "12px",
      padding: "14px 18px",
      boxShadow: "var(--shadow)",
      marginBottom: "12px",
      borderLeft: "3px solid #4caf50",
    }}>
      <p style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
        Today
      </p>
      <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 500 }}>
        {items.join(" · ")}
      </p>
    </div>
  );
}

// ── Remaining tasks sheet ──
function RemainingTasksSheet({ tasks, onClose, onGoToTasks }) {
  const grouped = {};
  SECTIONS.forEach(s => { grouped[s] = []; });
  tasks.forEach(t => { if (grouped[t.section]) grouped[t.section].push(t); });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 48px", zIndex: 301, maxHeight: "80vh", overflowY: "auto",
        animation: "slideUp 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "99px", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Still to do</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {SECTIONS.map(section => {
          const sectionTasks = grouped[section];
          if (sectionTasks.length === 0) return null;
          return (
            <div key={section} style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{section}</p>
              <div style={{ background: "var(--bg-card)", borderRadius: "12px", boxShadow: "var(--shadow)", overflow: "hidden" }}>
                {sectionTasks.map((task, i) => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: i < sectionTasks.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "5px", border: "2px solid var(--border)", flexShrink: 0 }} />
                    <p style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{task.name}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <button onClick={() => { onClose(); onGoToTasks(); }} style={{
          width: "100%", padding: "13px", background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "10px", fontSize: "0.92rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>Go to Tasks</button>
      </div>
    </div>
  );
}

// ── Tertiary row ──
function TertiaryRow({ label, value, onClick, isLast }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", background: "none", border: "none", padding: "14px 20px",
      cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
      borderBottom: isLast ? "none" : "1px solid var(--border-light)",
    }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{label}</p>
        <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
      </div>
      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", flexShrink: 0 }}>→</span>
    </button>
  );
}

// ── Momentum insight row — replaces "Steps: coming soon" ──
function MomentumRow({ insight }) {
  if (!insight) return null;
  return (
    <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{insight.label}</p>
        <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>{insight.value}</p>
      </div>
      <span style={{ fontSize: "1rem" }}>↑</span>
    </div>
  );
}

export default function OverviewScreen({
  tasks, workouts, currentStreak, longestStreak,
  weeklyDots, weekStats, viewedDate,
  onGoToTasks, onGoToWorkout, onOpenSettings, onOpenReview,
  nutritionSummary, nutritionGoals, onGoToNutrition,
}) {
  const [showRemaining, setShowRemaining] = useState(false);
  const [mounted, setMounted] = useState(false);
  const today = todayString();

  // Entrance animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const focusMode = getFocusMode();
  const config = getConfig(focusMode);

  const allTasks = Object.values(tasks).flat();
  const completedCount = allTasks.filter(t => t.completedDates.includes(today)).length;
  const remainingToday = allTasks.filter(t => !t.completedDates.includes(today));
  const totalCount = allTasks.length;

  const todaySessions = workouts[today] || [];
  const workoutDone = todaySessions.some(s => s.status === "completed");

  const taskCopy = getTaskCopy(completedCount, totalCount, remainingToday.length, config);
  const workoutCopy = getWorkoutCopy(todaySessions, config);
  const nutritionCopy = getNutritionCopy(nutritionSummary, nutritionGoals, config);
  const weeklyInsightText = getWeeklyInsight(weekStats, config);
  const contextLine = getContextLine(completedCount, totalCount, workoutDone, nutritionSummary, nutritionGoals, focusMode, currentStreak, weekStats, workouts);
  const endOfDayItems = getEndOfDaySummary(completedCount, totalCount, workoutDone, nutritionSummary, nutritionGoals, focusMode);
  const momentumInsight = getMomentumInsight(currentStreak, longestStreak, weekStats, workouts, tasks);

  // Tertiary strip — fitness mode shows tasks + weekly; others show weekly + nutrition (no duplicates)
  const tertiaryRows = focusMode === "fitness"
    ? [
        { label: "Tasks", value: totalCount === 0 ? "None added yet" : `${completedCount} of ${totalCount} complete`, onClick: onGoToTasks },
        { label: "This week", value: weeklyInsightText, onClick: onOpenReview },
        { label: "Nutrition", value: nutritionCopy, onClick: onGoToNutrition },
      ]
    : [
        { label: "This week", value: weeklyInsightText, onClick: onOpenReview },
        { label: "Nutrition", value: nutritionCopy, onClick: onGoToNutrition },
      ];

  const streakStat = { label: "Day streak", value: currentStreak, color: "var(--text-primary)", onClick: onOpenReview };
  const workoutStat = { label: workoutCopy.sub || "Workout", value: workoutCopy.label, color: workoutCopy.color, onClick: workoutCopy.tappable ? onGoToWorkout : undefined };
  const [leftStat, rightStat] = config.secondaryLeft === "workout"
    ? [workoutStat, streakStat]
    : [streakStat, workoutStat];

  return (
    <>
      {/* Slide-up sheet animation keyframe */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width: "100%", minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "48px 0 100px", boxSizing: "border-box",
        opacity: mounted ? 1 : 0, transition: "opacity 0.2s ease",
      }}>

        {showRemaining && (
          <RemainingTasksSheet tasks={remainingToday} onClose={() => setShowRemaining(false)} onGoToTasks={onGoToTasks} />
        )}

        <div style={{ width: "100%", maxWidth: "480px", padding: "0 20px", boxSizing: "border-box" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: "28px", position: "relative" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 500 }}>{formatDateFull(today)}</p>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: contextLine ? "6px" : "0" }}>
              {getGreeting()}
            </h1>
            {contextLine && (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{contextLine}</p>
            )}
            <button onClick={onOpenSettings} style={{ position: "absolute", right: 0, top: 0, background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ── End-of-day summary (after 8pm only, when earned) ── */}
          <EndOfDayCard items={endOfDayItems} />

          {/* ── PRIMARY HERO ── */}
          {focusMode === "fitness" ? (
            <FitnessHeroCard
              nutritionSummary={nutritionSummary}
              nutritionGoals={nutritionGoals}
              workoutCopy={workoutCopy}
              weeklyDots={weeklyDots}
              onOpenReview={onOpenReview}
              onGoToWorkout={onGoToWorkout}
              onGoToNutrition={onGoToNutrition}
            />
          ) : (
            <TaskHeroCard
              completedCount={completedCount}
              totalCount={totalCount}
              remainingToday={remainingToday}
              taskCopy={taskCopy}
              config={config}
              weeklyDots={weeklyDots}
              onOpenReview={onOpenReview}
              onGoToTasks={onGoToTasks}
              onGoToWorkout={onGoToWorkout}
              onShowRemaining={() => setShowRemaining(true)}
            />
          )}

          {/* ── SECONDARY: two-stat row ── */}
          <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "14px 20px", boxShadow: "var(--shadow)", marginBottom: "12px", display: "flex", alignItems: "center" }}>
            <button
              onClick={leftStat.onClick}
              style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: leftStat.onClick ? "pointer" : "default", textAlign: "left" }}
            >
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: leftStat.color, lineHeight: 1, transition: "color 0.3s" }}>{leftStat.value}</p>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{leftStat.label}</p>
            </button>

            <div style={{ width: "1px", height: "32px", background: "var(--border-light)", flexShrink: 0 }} />

            <button
              onClick={rightStat.onClick}
              style={{ flex: 1, paddingLeft: "20px", background: "none", border: "none", cursor: rightStat.onClick ? "pointer" : "default", textAlign: "left" }}
            >
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: rightStat.color, lineHeight: 1, transition: "color 0.3s" }}>{rightStat.value}</p>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{rightStat.label}</p>
            </button>
          </div>

          {/* ── TERTIARY: at-a-glance strip ── */}
          <div style={{ background: "var(--bg-card)", borderRadius: "12px", boxShadow: "var(--shadow)", overflow: "hidden" }}>
            {tertiaryRows.map((row, i) => (
              <TertiaryRow
                key={row.label}
                label={row.label}
                value={row.value}
                onClick={row.onClick}
                isLast={i === tertiaryRows.length - 1 && !momentumInsight}
              />
            ))}
            {/* Momentum insight — replaces dead "Steps: coming soon" */}
            {momentumInsight && (
              <>
                <div style={{ height: "1px", background: "var(--border-light)" }} />
                <MomentumRow insight={momentumInsight} />
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
