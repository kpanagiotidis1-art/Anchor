import { useState } from "react";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const SECTIONS = ["Morning", "Afternoon", "Night"];

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  return "Good evening.";
}

function formatDateFull(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
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
          style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.3s" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {total === 0 ? (
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", padding: "0 8px" }}>No tasks</p>
        ) : (
          <>
            <p style={{ fontSize: "1.6rem", fontWeight: 700, color: isComplete ? "#4caf50" : "var(--text-primary)", lineHeight: 1 }}>{completed}</p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>of {total}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Remaining tasks sheet ──
function RemainingTasksSheet({ tasks, onClose, onGoToTasks }) {
  // Group by section
  const grouped = {};
  SECTIONS.forEach(s => { grouped[s] = []; });
  tasks.forEach(t => {
    if (grouped[t.section]) grouped[t.section].push(t);
  });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 48px", zIndex: 301, maxHeight: "80vh", overflowY: "auto",
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
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                {section}
              </p>
              <div style={{ background: "var(--bg-card)", borderRadius: "12px", boxShadow: "var(--shadow)", overflow: "hidden" }}>
                {sectionTasks.map((task, i) => (
                  <div key={task.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 16px",
                    borderBottom: i < sectionTasks.length - 1 ? "1px solid var(--border-light)" : "none",
                  }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "5px", border: "2px solid var(--border)", flexShrink: 0 }} />
                    <p style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{task.name}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => { onClose(); onGoToTasks(); }}
          style={{
            width: "100%", padding: "13px",
            background: "var(--text-primary)", color: "var(--bg)",
            border: "none", borderRadius: "10px",
            fontSize: "0.92rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >Go to Tasks</button>
      </div>
    </div>
  );
}

export default function OverviewScreen({
  tasks,
  workouts,
  currentStreak,
  longestStreak,
  weeklyDots,
  weekStats,
  viewedDate,
  onGoToTasks,
  onOpenSettings,
  onOpenReview,
  nutritionSummary,
  nutritionGoals,
  onGoToNutrition,
}) {
  const [showRemaining, setShowRemaining] = useState(false);
  const today = todayString();

  const allTasks = Object.values(tasks).flat();
  const completedCount = allTasks.filter(t => t.completedDates.includes(today)).length;
  const remainingToday = allTasks.filter(t => !t.completedDates.includes(today));
  const totalCount = allTasks.length;

  const todaySessions = workouts[today] || [];
  const workoutDone = todaySessions.some(s => s.status === "completed");
  const workoutActive = todaySessions.some(s => s.status === "active");

  const workoutLabel = workoutActive ? "In progress" : workoutDone ? "Done ✓" : "Not yet";
  const workoutColor = workoutActive ? "#f0a500" : workoutDone ? "#4caf50" : "var(--text-faint)";

  const weeklyInsight = () => {
    if (!weekStats || weekStats.taskPct === null) return "Start completing tasks to track your week.";
    if (weekStats.taskPct >= 80) return "Strong week. Keep the momentum going.";
    if (weekStats.taskPct >= 50) return "Solid progress. Finish strong.";
    return "Every day is a fresh start.";
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0 100px", boxSizing: "border-box" }}>

      {showRemaining && (
        <RemainingTasksSheet
          tasks={remainingToday}
          onClose={() => setShowRemaining(false)}
          onGoToTasks={onGoToTasks}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px", padding: "0 20px", boxSizing: "border-box" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "28px", position: "relative" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 500 }}>{formatDateFull(today)}</p>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15 }}>{getGreeting()}</h1>
          <button onClick={onOpenSettings} style={{ position: "absolute", right: 0, top: 0, background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── PRIMARY: Hero card — progress + remaining tasks ── */}
        <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "20px", boxShadow: "var(--shadow)", marginBottom: "12px" }}>

          {/* Ring + summary */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: remainingToday.length > 0 ? "16px" : "0" }}>
            <ProgressRing completed={completedCount} total={totalCount} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                {totalCount === 0 ? "No tasks today" : completedCount === totalCount ? "All done 🎉" : `${totalCount - completedCount} left today`}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                {totalCount === 0 ? "Add tasks to get started" : `${completedCount} of ${totalCount} complete`}
              </p>
              {/* Weekly dots */}
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

          {/* Remaining tasks — inline, tappable */}
          {remainingToday.length > 0 && (
            <button
              onClick={() => setShowRemaining(true)}
              style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
                {remainingToday.slice(0, 3).map((task, i) => (
                  <div key={task.id} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "5px 0",
                  }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "4px", border: "1.5px solid var(--border)", flexShrink: 0 }} />
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.name}</p>
                  </div>
                ))}
                {remainingToday.length > 3 && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                    +{remainingToday.length - 3} more → tap to see all
                  </p>
                )}
              </div>
            </button>
          )}

          {totalCount > 0 && remainingToday.length === 0 && (
            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
              <p style={{ fontSize: "0.82rem", color: "#4caf50", fontWeight: 500 }}>All tasks complete. Stay consistent.</p>
            </div>
          )}
        </div>

        {/* ── SECONDARY: Streak + Workout — compact inline row ── */}
        <div style={{
          background: "var(--bg-card)", borderRadius: "12px", padding: "14px 20px",
          boxShadow: "var(--shadow)", marginBottom: "12px",
          display: "flex", alignItems: "center", gap: "0",
        }}>
          <button onClick={onOpenReview} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{currentStreak}</p>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Day streak</p>
          </button>

          <div style={{ width: "1px", height: "32px", background: "var(--border-light)", flexShrink: 0 }} />

          <div style={{ flex: 1, paddingLeft: "20px" }}>
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color: workoutColor, lineHeight: 1 }}>{workoutLabel}</p>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Workout</p>
          </div>
        </div>

        {/* ── TERTIARY: At a glance strip — quiet, compact ── */}
        <div style={{
          background: "var(--bg-card)", borderRadius: "12px",
          boxShadow: "var(--shadow)", overflow: "hidden", marginBottom: "0",
        }}>
          {/* Weekly progress */}
          <button onClick={onOpenReview} style={{
            width: "100%", background: "none", border: "none", padding: "14px 20px",
            cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid var(--border-light)",
          }}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>This week</p>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {weekStats?.activeDays ?? 0}/7 days · {weekStats?.taskPct != null ? `${weekStats.taskPct}%` : "—"} tasks
                </p>
              </div>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>→</span>
          </button>

          {/* Nutrition */}
          <button onClick={onGoToNutrition} style={{
            width: "100%", background: "none", border: "none", padding: "14px 20px",
            cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid var(--border-light)",
          }}>
            <div>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Nutrition</p>
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {nutritionSummary?.calories ?? 0} / {nutritionGoals?.calories ?? 2000} kcal
                {nutritionSummary?.protein > 0 && ` · ${nutritionSummary.protein}g protein`}
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>→</span>
          </button>

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
