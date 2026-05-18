import { useState } from "react";
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

// ── Context line — appears beneath greeting ──
function getContextLine(completedCount, totalCount, workoutDone, nutritionSummary, nutritionGoals, focusMode) {
  const h = new Date().getHours();
  const day = new Date().getDay();
  const proteinLeft = Math.max(0, (nutritionGoals?.protein ?? 150) - (nutritionSummary?.protein ?? 0));
  const calLeft = Math.max(0, (nutritionGoals?.calories ?? 2000) - (nutritionSummary?.calories ?? 0));
  const allDone = totalCount > 0 && completedCount === totalCount;

  // Fitness mode — fitness-first context
  if (focusMode === "fitness") {
    if (workoutDone && proteinLeft > 15) return `${proteinLeft}g protein left to hit your target.`;
    if (workoutDone && proteinLeft <= 15) return "Protein goal nearly there. Strong day.";
    if (!workoutDone && h >= 18) return "No workout logged yet. Still time tonight.";
    return null;
  }

  // Discipline mode — task/streak first
  if (focusMode === "discipline") {
    if (allDone) return "Discipline compounds. Keep the streak going.";
    if (h >= 20 && totalCount > completedCount) return "Finish strong before you sleep.";
    if (day === 0 && h >= 17) return "Take a moment to review your week.";
    return null;
  }

  // Balanced
  if (workoutDone && proteinLeft > 20) return `${proteinLeft}g protein left to hit your target.`;
  if (day === 0 && h >= 17) return "Take a moment to review your week.";
  if (allDone) return "Everything done for today.";
  if (h >= 20 && totalCount > completedCount) return "Finish strong before you sleep.";
  return null;
}

// ── Focus configuration — single source of truth ──
const FOCUS_CONFIG = {
  discipline: {
    heroMode: "tasks",              // tasks | fitness
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
    // Secondary row: streak on left, workout on right
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
    tertiaryOrder: ["nutrition", "weekly"],
    nutritionEmptyCopy: "Nothing logged — tap to add your first meal",
    weeklyPrefix: null,
    tasksSubtitle: "Structure your day.",
    sectionEmptyLabel: "Tap + to add a task",
    workoutNudge: "Ready for today's session?",
    // Secondary row: workout on left, streak on right
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

// ── Task copy ──
function getTaskCopy(completed, total, remaining, config) {
  const h = new Date().getHours();
  if (total === 0) return { headline: config.emptyTaskHeadline, sub: config.emptyTaskSub };
  if (completed === total) return { headline: "All done today.", sub: config.allDoneSub };
  if (remaining === 1) return { headline: "One task left.", sub: "Finish strong." };
  if (h >= 20) return { headline: `${remaining} left tonight.`, sub: "Make it count." };
  if (h >= 12 && h < 17) return { headline: `${remaining} left this afternoon.`, sub: `${completed} of ${total} complete.` };
  return { headline: `${remaining} left today.`, sub: `${completed} of ${total} complete.` };
}

// ── Workout copy ──
function getWorkoutCopy(sessions, config) {
  const done = sessions.some(s => s.status === "completed");
  const active = sessions.some(s => s.status === "active");
  const h = new Date().getHours();
  if (active) return { label: "In progress", color: "#f0a500", sub: "Keep going.", tappable: false };
  if (done) return { label: "Done ✓", color: "#4caf50", sub: "Workout logged.", tappable: false };
  const sub = config.workoutEmptySub || (h < 10 ? "Day is young." : h >= 20 ? "Still time tonight." : null);
  return { label: config.workoutEmptyLabel, color: "var(--text-faint)", sub, tappable: true };
}

// ── Nutrition copy ──
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

// ── Weekly insight ──
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
          style={{ transition: "stroke-dasharray 0.5s ease, stroke 0.4s ease" }}
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

// ── Protein progress bar — fitness hero ──
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
          borderRadius: "99px", transition: "width 0.4s ease, background 0.4s ease",
        }} />
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
        {isHit ? "Protein goal hit. Nice work." : `${left}g left to hit your target`}
      </p>
    </div>
  );
}

// ── FITNESS HERO CARD ──
// Primary metric: protein progress
// Secondary: calories + workout status
function FitnessHeroCard({ nutritionSummary, nutritionGoals, workoutCopy, weeklyDots, onOpenReview, onGoToWorkout, onGoToNutrition }) {
  const protein = nutritionSummary?.protein ?? 0;
  const goalProtein = nutritionGoals?.protein ?? 150;
  const cal = nutritionSummary?.calories ?? 0;
  const goalCal = nutritionGoals?.calories ?? 2000;

  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "20px", boxShadow: "var(--shadow)", marginBottom: "12px" }}>
      {/* Protein — primary metric */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
        <ProteinBar current={protein} goal={goalProtein} />
      </div>

      {/* Calories + workout — secondary row */}
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
          <p style={{ fontSize: "1rem", fontWeight: 700, color: workoutCopy.color, lineHeight: 1 }}>{workoutCopy.label}</p>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Workout</p>
        </button>
      </div>

      {/* Weekly dots */}
      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "12px", marginTop: "12px" }}>
        <button onClick={onOpenReview} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", gap: "4px" }}>
          {(weeklyDots || []).map((dot, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: dot.active ? "var(--text-primary)" : "var(--border)" }} />
              <span style={{ fontSize: "0.5rem", color: dot.active ? "var(--text-primary)" : "var(--text-faint)", fontWeight: dot.active ? 600 : 400 }}>{DAY_LABELS[i]}</span>
            </div>
          ))}
        </button>
      </div>
    </div>
  );
}

// ── TASK HERO CARD (discipline + balanced) ──
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
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: dot.active ? "var(--text-primary)" : "var(--border)" }} />
                <span style={{ fontSize: "0.5rem", color: dot.active ? "var(--text-primary)" : "var(--text-faint)", fontWeight: dot.active ? 600 : 400 }}>{DAY_LABELS[i]}</span>
              </div>
            ))}
          </button>
        </div>
      </div>

      {remainingToday.length > 0 && (
        <button onClick={onShowRemaining} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
            {remainingToday.slice(0, 3).map((task, i) => (
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

// ── Remaining tasks sheet ──
function RemainingTasksSheet({ tasks, onClose, onGoToTasks }) {
  const grouped = {};
  SECTIONS.forEach(s => { grouped[s] = []; });
  tasks.forEach(t => { if (grouped[t.section]) grouped[t.section].push(t); });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{ position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0", padding: "24px 20px 48px", zIndex: 301, maxHeight: "80vh", overflowY: "auto" }}>
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
      <div>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{label}</p>
        <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>{value}</p>
      </div>
      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>→</span>
    </button>
  );
}

export default function OverviewScreen({
  tasks, workouts, currentStreak, longestStreak,
  weeklyDots, weekStats, viewedDate,
  onGoToTasks, onGoToWorkout, onOpenSettings, onOpenReview,
  nutritionSummary, nutritionGoals, onGoToNutrition,
}) {
  const [showRemaining, setShowRemaining] = useState(false);
  const today = todayString();

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
  const contextLine = getContextLine(completedCount, totalCount, workoutDone, nutritionSummary, nutritionGoals, focusMode);

  // Tertiary strip — fitness mode shows tasks here; others show weekly + nutrition
  const tertiaryRows = focusMode === "fitness"
    ? [
        { label: "Tasks", value: totalCount === 0 ? "None added yet" : `${completedCount} of ${totalCount} complete`, onClick: onGoToTasks },
        { label: "This week", value: weeklyInsightText, onClick: onOpenReview },
      ]
    : config.tertiaryOrder.map(key => ({
        weekly: { label: "This week", value: weeklyInsightText, onClick: onOpenReview },
        nutrition: { label: "Nutrition", value: nutritionCopy, onClick: onGoToNutrition },
      }[key]));

  // Secondary row left/right driven by config
  const streakStat = { label: "Day streak", value: currentStreak, color: "var(--text-primary)", onClick: onOpenReview };
  const workoutStat = { label: workoutCopy.sub || "Workout", value: workoutCopy.label, color: workoutCopy.color, onClick: workoutCopy.tappable ? onGoToWorkout : undefined };
  const [leftStat, rightStat] = config.secondaryLeft === "workout"
    ? [workoutStat, streakStat]
    : [streakStat, workoutStat];

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0 100px", boxSizing: "border-box" }}>

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

        {/* ── PRIMARY HERO — switches by focus mode ── */}
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

        {/* ── SECONDARY: two-stat row — order from config ── */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "14px 20px", boxShadow: "var(--shadow)", marginBottom: "12px", display: "flex", alignItems: "center" }}>
          <button
            onClick={leftStat.onClick}
            style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: leftStat.onClick ? "pointer" : "default", textAlign: "left" }}
          >
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color: leftStat.color, lineHeight: 1 }}>{leftStat.value}</p>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{leftStat.label}</p>
          </button>

          <div style={{ width: "1px", height: "32px", background: "var(--border-light)", flexShrink: 0 }} />

          <button
            onClick={rightStat.onClick}
            style={{ flex: 1, paddingLeft: "20px", background: "none", border: "none", cursor: rightStat.onClick ? "pointer" : "default", textAlign: "left" }}
          >
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color: rightStat.color, lineHeight: 1 }}>{rightStat.value}</p>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{rightStat.label}</p>
          </button>
        </div>

        {/* ── TERTIARY: at a glance strip ── */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", boxShadow: "var(--shadow)", overflow: "hidden" }}>
          {tertiaryRows.map((row, i) => (
            <TertiaryRow
              key={row.label}
              label={row.label}
              value={row.value}
              onClick={row.onClick}
              isLast={i === tertiaryRows.length - 1}
            />
          ))}
          {/* Nutrition row for non-fitness modes */}
          {focusMode !== "fitness" && (
            <TertiaryRow
              label="Nutrition"
              value={nutritionCopy}
              onClick={onGoToNutrition}
              isLast={false}
            />
          )}
          {/* Steps */}
          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Steps</p>
              <p style={{ fontSize: "0.88rem", color: "var(--text-faint)" }}>Coming soon</p>
            </div>
            <p style={{ fontSize: "1.1rem" }}>👟</p>
          </div>
        </div>

      </div>
    </div>
  );
}
