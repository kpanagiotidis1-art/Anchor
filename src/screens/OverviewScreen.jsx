import { useState, useEffect, useRef } from "react";
import { getFocusMode } from "./OnboardingScreen";
import { getConfig } from "../lib/focusConfig";
import {
  getDayState,
  getAlignedDayState,
  getContextLine,
  getTaskCopy,
  getWorkoutCopy,
  getNutritionCopy,
  getWeeklyInsight,
  getEndOfDaySummary,
  getMomentumInsight,
  getGreeting,
  getCrossSystemObservation,
} from "../lib/anchorVoice";

export { getFocusMode };
export { getConfig };

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

// ── Pillar dots ────────────────────────────────────────────────────────────────
function PillarDots({ pillars, accentColor }) {
  const ALL = [
    { key: "tasks",     label: "T" },
    { key: "workout",   label: "W" },
    { key: "nutrition", label: "N" },
  ];
  return (
    <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
      {ALL.map(p => {
        const active = pillars.includes(p.key);
        return (
          <div key={p.key} style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: active ? accentColor : "transparent",
            border: `1.5px solid ${active ? accentColor : "rgba(100,100,100,0.2)"}`,
            transition: "background 0.5s ease, border-color 0.5s ease",
          }} />
        );
      })}
    </div>
  );
}

// ── Aligned Day Banner ─────────────────────────────────────────────────────────
// Accent is always green — a single calm signal, never loud.
// Entrance: slides up and fades in when tier is first achieved.
function AlignedDayBanner({ alignedState, visible }) {
  const showTiers = ["full", "complete", "fuelled"];
  if (!alignedState || !showTiers.includes(alignedState.tier)) return null;

  const accent = alignedState.accentColor || "var(--accent)";

  return (
    <div style={{
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-4) var(--space-5)",
      marginBottom: "var(--space-3)",
      background: "var(--bg-surface)",
      border: `1px solid ${accent}`,
      boxShadow: `0 0 0 1px var(--accent-glow), 0 2px 16px var(--accent-subtle)`,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(-8px)",
      transition: "opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "var(--text-micro)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: accent,
            textTransform: "uppercase",
            marginBottom: "var(--space-2)",
            transition: "color 0.4s ease",
          }}>
            {alignedState.tier === "full"     ? "Fully aligned"   :
             alignedState.tier === "complete" ? "Day complete"     :
                                                "Trained & fuelled"}
          </p>
          <p style={{
            fontSize: "var(--text-sub)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            marginBottom: alignedState.sub ? "var(--space-2)" : "0",
          }}>
            {alignedState.line}
          </p>
          {alignedState.sub && (
            <p style={{
              fontSize: "var(--text-caption)",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}>
              {alignedState.sub}
            </p>
          )}
        </div>
        <div style={{ paddingTop: "2px", flexShrink: 0 }}>
          <PillarDots pillars={alignedState.pillars} accentColor={accent} />
        </div>
      </div>
    </div>
  );
}

// ── Progress ring ──────────────────────────────────────────────────────────────
function ProgressRing({ completed, total, accentColor }) {
  const size = 120;
  const sw = 9;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : Math.min(completed / total, 1);
  const isComplete = total > 0 && completed >= total;
  const fillColor = accentColor || (isComplete ? "var(--accent)" : "var(--text-primary)");

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={fillColor}
          strokeWidth={sw}
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {total === 0 ? (
          <p style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", textAlign: "center", padding: "0 8px" }}>No tasks</p>
        ) : (
          <>
            <p style={{
              fontSize: "var(--text-display)",
              fontWeight: 700,
              lineHeight: 1,
              color: fillColor,
              transition: "color 0.5s ease",
            }}>{completed}</p>
            <p style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "2px" }}>of {total}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Protein bar ────────────────────────────────────────────────────────────────
function ProteinBar({ current, goal, isAligned }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const left = Math.max(0, goal - current);
  const isHit = current >= goal;
  const barColor = (isHit || isAligned) ? "var(--accent)" : "#4a90d9";

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-2)" }}>
        <p style={{
          fontSize: "var(--text-hero)",
          fontWeight: 700,
          lineHeight: 1,
          color: isHit ? "var(--accent-text)" : "var(--text-primary)",
          transition: "color 0.5s ease",
        }}>
          {current}g
        </p>
        <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>/ {goal}g protein</p>
      </div>
      <div style={{ height: "5px", background: "var(--border)", borderRadius: "var(--radius-pill)", overflow: "hidden", marginBottom: "var(--space-2)" }}>
        <div className="anchor-macro-fill" style={{
          height: "100%",
          width: `${pct}%`,
          background: barColor,
          borderRadius: "var(--radius-pill)",
        }} />
      </div>
      <p style={{
        fontSize: "var(--text-caption)",
        color: isHit ? "var(--accent-text)" : "var(--text-muted)",
        transition: "color 0.4s ease",
      }}>
        {isHit ? "Protein goal hit." : `${left}g left to hit your target`}
      </p>
    </div>
  );
}

// ── Weekly dots row ────────────────────────────────────────────────────────────
function WeeklyDots({ weeklyDots, accent, onOpenReview }) {
  return (
    <button onClick={onOpenReview} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", gap: "var(--space-1)" }}>
      {(weeklyDots || []).map((dot, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
          <div style={{
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: dot.active ? (accent || "var(--text-primary)") : "var(--border)",
            transition: "background 0.4s ease",
          }} />
          <span style={{
            fontSize: "var(--text-micro)",
            color: dot.active ? "var(--text-secondary)" : "var(--text-faint)",
            fontWeight: dot.active ? 600 : 400,
          }}>{DAY_LABELS[i]}</span>
        </div>
      ))}
    </button>
  );
}

// ── Fitness hero card ──────────────────────────────────────────────────────────
function FitnessHeroCard({
  nutritionSummary, nutritionGoals, workoutCopy, weeklyDots,
  onOpenReview, onGoToWorkout, onGoToNutrition, alignedState,
}) {
  const protein = nutritionSummary?.protein ?? 0;
  const goalProtein = nutritionGoals?.protein ?? 150;
  const cal = nutritionSummary?.calories ?? 0;
  const goalCal = nutritionGoals?.calories ?? 2000;
  const isAligned = alignedState?.tier === "full" || alignedState?.tier === "fuelled";
  const accent = isAligned ? (alignedState.accentColor || "var(--accent)") : null;

  return (
    <div style={{
      background: "var(--bg-surface)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-6)",
      boxShadow: isAligned
        ? `var(--shadow), 0 0 0 1px var(--accent-glow)`
        : "var(--shadow)",
      marginBottom: "var(--space-3)",
      transition: "box-shadow 0.5s ease",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <ProteinBar current={protein} goal={goalProtein} isAligned={isAligned} />
      </div>

      <div style={{ display: "flex", borderTop: "1px solid var(--border-light)", paddingTop: "var(--space-4)" }}>
        <button onClick={onGoToNutrition} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
          <p style={{ fontSize: "var(--text-sub)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{cal}</p>
          <p style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            of {goalCal} kcal
          </p>
        </button>

        <div style={{ width: "1px", height: "32px", background: "var(--border-light)", flexShrink: 0, alignSelf: "center" }} />

        <button
          onClick={workoutCopy.tappable ? onGoToWorkout : undefined}
          style={{ flex: 1, paddingLeft: "var(--space-4)", background: "none", border: "none", cursor: workoutCopy.tappable ? "pointer" : "default", textAlign: "left" }}
        >
          <p style={{ fontSize: "var(--text-sub)", fontWeight: 700, color: workoutCopy.color, lineHeight: 1, transition: "color 0.3s" }}>{workoutCopy.label}</p>
          <p style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Workout</p>
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "var(--space-3)", marginTop: "var(--space-3)" }}>
        <WeeklyDots weeklyDots={weeklyDots} accent={accent} onOpenReview={onOpenReview} />
      </div>
    </div>
  );
}

// ── Task hero card ─────────────────────────────────────────────────────────────
function TaskHeroCard({
  completedCount, totalCount, remainingToday, taskCopy, config,
  weeklyDots, onOpenReview, onGoToTasks, onGoToWorkout, onShowRemaining,
  alignedState,
}) {
  const isComplete = totalCount > 0 && completedCount === totalCount;
  const isAligned = alignedState?.tier === "full" || alignedState?.tier === "complete";
  const accent = isAligned
    ? (alignedState.accentColor || "var(--accent)")
    : isComplete ? "var(--accent)" : null;

  return (
    <div style={{
      background: "var(--bg-surface)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-6)",
      boxShadow: isAligned
        ? `var(--shadow), 0 0 0 1px var(--accent-glow)`
        : "var(--shadow)",
      marginBottom: "var(--space-3)",
      transition: "box-shadow 0.5s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginBottom: (remainingToday.length > 0 || totalCount > 0) ? "var(--space-4)" : "0" }}>
        <ProgressRing completed={completedCount} total={totalCount} accentColor={accent} />
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: "var(--text-sub)",
            fontWeight: 700,
            marginBottom: "var(--space-1)",
            color: accent || "var(--text-primary)",
            transition: "color 0.5s ease",
          }}>
            {taskCopy.headline}
          </p>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
            {taskCopy.sub}
          </p>
          <WeeklyDots weeklyDots={weeklyDots} accent={accent} onOpenReview={onOpenReview} />
        </div>
      </div>

      {/* Remaining tasks — hidden when aligned */}
      {remainingToday.length > 0 && !isAligned && (
        <button onClick={onShowRemaining} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "var(--space-4)" }}>
            {remainingToday.slice(0, 3).map((task) => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "5px 0" }}>
                <div style={{ width: "14px", height: "14px", borderRadius: "var(--radius-xs)", border: "1.5px solid var(--border)", flexShrink: 0 }} />
                <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.name}</p>
              </div>
            ))}
            {remainingToday.length > 3 && (
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginTop: "var(--space-2)" }}>+{remainingToday.length - 3} more</p>
            )}
          </div>
        </button>
      )}

      {/* Quiet all-done line — only when complete but NOT fully aligned */}
      {isComplete && !isAligned && (
        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "var(--space-3)" }}>
          <p style={{ fontSize: "var(--text-body)", color: "var(--accent-text)", fontWeight: 500 }}>
            All tasks complete. Stay consistent.
          </p>
        </div>
      )}

      {/* Empty CTA */}
      {totalCount === 0 && (
        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "var(--space-3)" }}>
          <button
            onClick={config.emptyTaskCTATarget === "workout" ? onGoToWorkout : onGoToTasks}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "var(--text-body)", color: "var(--text-muted)", fontFamily: "inherit", textDecoration: "underline", textDecorationColor: "var(--border)" }}
          >
            {config.emptyTaskCTA}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Remaining tasks sheet ──────────────────────────────────────────────────────
function RemainingTasksSheet({ tasks, onClose, onGoToTasks }) {
  const grouped = {};
  SECTIONS.forEach(s => { grouped[s] = []; });
  tasks.forEach(t => { if (grouped[t.section]) grouped[t.section].push(t); });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{ position: "relative", background: "var(--bg)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--space-6) var(--space-5) var(--space-10)", zIndex: 301, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "var(--radius-pill)", margin: "0 auto var(--space-5)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
          <p style={{ fontSize: "var(--text-sub)", fontWeight: 700, color: "var(--text-primary)" }}>Still to do</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {SECTIONS.map(section => {
          const sectionTasks = grouped[section];
          if (sectionTasks.length === 0) return null;
          return (
            <div key={section} style={{ marginBottom: "var(--space-5)" }}>
              <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>{section}</p>
              <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
                {sectionTasks.map((task, i) => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", borderBottom: i < sectionTasks.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "5px", border: "2px solid var(--border)", flexShrink: 0 }} />
                    <p style={{ fontSize: "var(--text-body)", color: "var(--text-primary)" }}>{task.name}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <button onClick={() => { onClose(); onGoToTasks(); }} style={{ width: "100%", padding: "13px", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Go to Tasks
        </button>
      </div>
    </div>
  );
}

// ── Tertiary row ───────────────────────────────────────────────────────────────
function TertiaryRow({ label, value, onClick, isLast }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        background: "none",
        border: "none",
        padding: "var(--space-4) var(--space-5)",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: isLast ? "none" : "1px solid var(--border-light)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, paddingRight: "var(--space-3)" }}>
        <p style={{ fontSize: "var(--text-label)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{label}</p>
        <p style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
      </div>
    </button>
  );
}

// ── Momentum row ───────────────────────────────────────────────────────────────
function MomentumRow({ insight }) {
  if (!insight) return null;
  return (
    <div style={{ padding: "var(--space-4) var(--space-5)" }}>
      <p style={{ fontSize: "var(--text-label)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{insight.label}</p>
      <p style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text-primary)" }}>{insight.value}</p>
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────────
export default function OverviewScreen({
  tasks, workouts, currentStreak, longestStreak,
  weeklyDots, weekStats, viewedDate,
  onGoToTasks, onGoToWorkout, onOpenSettings, onOpenReview,
  nutritionSummary, nutritionGoals, onGoToNutrition,
  onGoToProgress,
}) {
  const [showRemaining, setShowRemaining] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [streakPulsing, setStreakPulsing] = useState(false);
  const prevTier = useRef(null);
  const prevStreak = useRef(currentStreak);
  const streakPulseTimer = useRef(null);

  const today = todayString();
  const focusMode = getFocusMode();
  const config = getConfig(focusMode);

  const allTasks = Object.values(tasks).flat();
  const completedCount = allTasks.filter(t => t.completedDates.includes(today)).length;
  const remainingToday = allTasks.filter(t => !t.completedDates.includes(today));
  const totalCount = allTasks.length;
  const todaySessions = workouts[today] || [];
  const workoutDone = todaySessions.some(s => s.status === "completed");

  // ── Voice system ──
  const dayState = getDayState({
    completedCount, totalCount, workoutDone,
    nutritionSummary, nutritionGoals, currentStreak,
  });
  const alignedState  = getAlignedDayState(dayState);
  const contextLine   = getContextLine(dayState, focusMode, weekStats, alignedState);
  const taskCopy      = getTaskCopy(dayState, config);
  const workoutCopy   = getWorkoutCopy(todaySessions, config);
  const nutritionCopy = getNutritionCopy(nutritionSummary, nutritionGoals, config);
  const weeklyText    = getWeeklyInsight(weekStats, config);
  const eodItems      = getEndOfDaySummary(dayState, alignedState);
  const momentum      = getMomentumInsight(currentStreak, longestStreak, weekStats, workouts);
  const crossSystem   = getCrossSystemObservation({ weekStats, nutritionSummary, nutritionGoals, currentStreak, workouts });

  // ── Banner entrance ──
  useEffect(() => {
    const SHOW = ["full", "complete", "fuelled"];
    const tier = alignedState?.tier ?? null;
    const nowShowing = SHOW.includes(tier);
    const wasShowing = SHOW.includes(prevTier.current);

    if (nowShowing && !wasShowing) {
      setBannerVisible(false);
      const t = setTimeout(() => setBannerVisible(true), 80);
      prevTier.current = tier;
      return () => clearTimeout(t);
    }
    if (nowShowing) setBannerVisible(true);
    else setBannerVisible(false);
    prevTier.current = tier;
  }, [alignedState?.tier]);

  // ── Streak pulse ──
  useEffect(() => {
    if (currentStreak > prevStreak.current && currentStreak > 0) {
      clearTimeout(streakPulseTimer.current);
      setStreakPulsing(true);
      streakPulseTimer.current = setTimeout(() => setStreakPulsing(false), 420);
    }
    prevStreak.current = currentStreak;
    return () => clearTimeout(streakPulseTimer.current);
  }, [currentStreak]);

  const accent = alignedState?.accentColor || null;

  // Secondary row — positional emphasis kept via flex, font size equalized
  const streakStat  = { label: "Day streak", value: currentStreak, color: accent || "var(--text-primary)", onClick: onOpenReview };
  const workoutStat = { label: workoutCopy.sub || "Workout", value: workoutCopy.label, color: workoutCopy.color, onClick: workoutCopy.tappable ? onGoToWorkout : undefined };
  const [leftStat, rightStat] = config.secondaryLeft === "workout"
    ? [workoutStat, streakStat]
    : [streakStat, workoutStat];

  // Tertiary rows
  const tertiaryRows = [
    ...(focusMode === "fitness"
      ? [{ label: "Tasks", value: totalCount === 0 ? "None added yet" : `${completedCount} of ${totalCount} complete`, onClick: onGoToTasks }]
      : []),
    { label: "This week", value: weeklyText, onClick: onOpenReview },
    { label: "Nutrition",  value: nutritionCopy, onClick: onGoToNutrition },
    ...(onGoToProgress
      ? [{ label: "Progress", value: crossSystem || "Log weight · track your body", onClick: onGoToProgress }]
      : []),
  ];

  const isAlignedEnv = !!(alignedState?.accentColor);

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "var(--space-9) 0 100px",
      boxSizing: "border-box",
      position: "relative",
    }}>

      {showRemaining && (
        <RemainingTasksSheet
          tasks={remainingToday}
          onClose={() => setShowRemaining(false)}
          onGoToTasks={onGoToTasks}
        />
      )}

      {/* ── Ambient environmental wash — aligned days only ── */}
      {isAlignedEnv && (
        <div
          className="anchor-env-in"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: "50vh",
            background: "linear-gradient(180deg, var(--ambient-aligned) 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px", padding: "0 var(--space-5)", boxSizing: "border-box", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "var(--space-7)", position: "relative" }}>
          {/* Date — ambient context, not navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", fontWeight: 500 }}>
              {formatDateFull(today)}
            </p>
            {config.focusLabel && (
              <span style={{
                fontSize: "var(--text-micro)",
                fontWeight: 600,
                color: "var(--text-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                paddingLeft: "var(--space-2)",
                borderLeft: "1px solid var(--border)",
              }}>
                {config.focusLabel}
              </span>
            )}
          </div>

          {/* Greeting — dominant hierarchy moment */}
          <h1 style={{
            fontSize: "var(--text-display)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.1,
            marginBottom: contextLine ? "var(--space-2)" : "var(--space-1)",
          }}>
            {getGreeting()}
          </h1>

          {contextLine && (
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-muted)", lineHeight: 1.45 }}>
              {contextLine}
            </p>
          )}

          {/* Settings — quiet, top right */}
          <button
            onClick={onOpenSettings}
            style={{ position: "absolute", right: 0, top: 0, background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-faint)", display: "flex", alignItems: "center" }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Aligned Day Banner ── */}
        <AlignedDayBanner alignedState={alignedState} visible={bannerVisible} />

        {/* ── End-of-day summary — suppressed when banner is active ── */}
        {eodItems && !bannerVisible && (
          <div style={{
            background: "var(--accent-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4) var(--space-5)",
            marginBottom: "var(--space-3)",
          }}>
            <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>Today</p>
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-primary)", fontWeight: 500 }}>
              {eodItems.join(" · ")}
            </p>
          </div>
        )}

        {/* ── Primary hero ── */}
        {focusMode === "fitness" ? (
          <FitnessHeroCard
            nutritionSummary={nutritionSummary}
            nutritionGoals={nutritionGoals}
            workoutCopy={workoutCopy}
            weeklyDots={weeklyDots}
            onOpenReview={onOpenReview}
            onGoToWorkout={onGoToWorkout}
            onGoToNutrition={onGoToNutrition}
            alignedState={alignedState}
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
            alignedState={alignedState}
          />
        )}

        {/* ── Secondary row — supporting context, lighter visual weight ── */}
        <div style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-5)",
          boxShadow: "var(--shadow-sm)",
          marginBottom: "var(--space-3)",
          display: "flex",
          alignItems: "center",
        }}>
          <button
            onClick={leftStat.onClick}
            style={{ flex: config.primaryStatEmphasis ? 1.4 : 1, background: "none", border: "none", padding: 0, cursor: leftStat.onClick ? "pointer" : "default", textAlign: "left" }}
          >
            <p
              className={leftStat.label === "Day streak" && streakPulsing ? "anchor-streak-pulse" : ""}
              style={{
                fontSize: "var(--text-title)",
                fontWeight: 700,
                color: leftStat.color,
                lineHeight: 1,
                transition: "color 0.5s ease",
              }}
            >
              {leftStat.value}
            </p>
            <p style={{ fontSize: "var(--text-label)", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {leftStat.label}
            </p>
          </button>

          <div style={{ width: "1px", height: "28px", background: "var(--border-light)", flexShrink: 0 }} />

          <button
            onClick={rightStat.onClick}
            style={{ flex: 1, paddingLeft: "var(--space-5)", background: "none", border: "none", cursor: rightStat.onClick ? "pointer" : "default", textAlign: "left" }}
          >
            <p
              className={rightStat.label === "Day streak" && streakPulsing ? "anchor-streak-pulse" : ""}
              style={{
                fontSize: "var(--text-title)",
                fontWeight: 600,
                color: rightStat.color,
                lineHeight: 1,
                transition: "color 0.5s ease",
              }}
            >
              {rightStat.value}
            </p>
            <p style={{ fontSize: "var(--text-label)", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {rightStat.label}
            </p>
          </button>
        </div>

        {/* ── Tertiary strip ── */}
        <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          {tertiaryRows.map((row, i) => (
            <TertiaryRow
              key={row.label}
              label={row.label}
              value={row.value}
              onClick={row.onClick}
              isLast={i === tertiaryRows.length - 1 && !momentum}
            />
          ))}
          {momentum && (
            <>
              <div style={{ height: "1px", background: "var(--border-light)" }} />
              <MomentumRow insight={momentum} />
            </>
          )}
        </div>

      </div>
    </div>
  );
}