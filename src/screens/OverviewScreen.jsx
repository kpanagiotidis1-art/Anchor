const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

function formatDateFull(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ── Progress Ring ──
function ProgressRing({ completed, total }) {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total === 0 ? 0 : Math.min(completed / total, 1);
  const dash = circumference * pct;
  const isComplete = total > 0 && completed >= total;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={isComplete ? "#4caf50" : "var(--text-primary)"}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.3s" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {total === 0 ? (
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", padding: "0 16px" }}>
            No tasks
          </p>
        ) : (
          <>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
              {completed}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              of {total}
            </p>
          </>
        )}
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
}) {
  const today = todayString();

  // ── Task stats for today ──
  const allTasks = Object.values(tasks).flat();
  const completedToday = allTasks.filter(t => t.completedDates.includes(today));
  const remainingToday = allTasks.filter(t => !t.completedDates.includes(today));
  const completedCount = completedToday.length;
  const totalCount = allTasks.length;

  // ── Workout today ──
  const todaySessions = workouts[today] || [];
  const workoutDone = todaySessions.some(s => s.status === "completed");
  const workoutActive = todaySessions.some(s => s.status === "active");

  function workoutStatus() {
    if (workoutActive) return { label: "In progress", color: "#f0a500" };
    if (workoutDone) return { label: "Done", color: "#4caf50" };
    return { label: "Not yet", color: "var(--text-faint)" };
  }
  const ws = workoutStatus();

  // ── Weekly insight line ──
  function weeklyInsight() {
    if (weekStats.taskPct === null) return "Start completing tasks to track your week.";
    if (weekStats.taskPct >= 80) return "Strong week. Keep the momentum going.";
    if (weekStats.taskPct >= 50) return "Solid progress. Finish strong.";
    return "Every day is a fresh start.";
  }

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 0 100px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "480px",
        padding: "0 20px",
        boxSizing: "border-box",
      }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "32px", position: "relative" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 500 }}>
            {formatDateFull(today)}
          </p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15 }}>
            {getGreeting()}
          </h1>
          <button
            onClick={onOpenSettings}
            style={{
              position: "absolute", right: 0, top: 0,
              background: "none", border: "none", cursor: "pointer",
              padding: "4px", color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Daily Progress Ring ── */}
        <div style={{
          background: "var(--bg-card)",
          borderRadius: "16px",
          padding: "24px 20px",
          boxShadow: "var(--shadow)",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          marginBottom: "16px",
        }}>
          <ProgressRing completed={completedCount} total={totalCount} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              {totalCount === 0
                ? "No tasks today"
                : completedCount === totalCount
                ? "All done. 🎉"
                : `${totalCount - completedCount} remaining`}
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              {totalCount === 0 ? "Add tasks to get started" : `${completedCount} of ${totalCount} tasks complete`}
            </p>
            {/* Weekly dots — compact, tappable shortcut to review */}
            <button
              onClick={onOpenReview}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", gap: "5px" }}
            >
              {(weeklyDots || []).map((dot, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: dot.active ? "var(--text-primary)" : "var(--border)",
                  }} />
                  <span style={{
                    fontSize: "0.55rem",
                    color: dot.active ? "var(--text-primary)" : "var(--text-faint)",
                    fontWeight: dot.active ? 600 : 400,
                  }}>{DAY_LABELS[i]}</span>
                </div>
              ))}
            </button>
          </div>
        </div>

        {/* ── Streak + Workout row ── */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          {/* Streak — tappable shortcut to review */}
          <button
            onClick={onOpenReview}
            style={{
              background: "var(--bg-card)", borderRadius: "12px", padding: "16px",
              boxShadow: "var(--shadow)", flex: 1, border: "none", cursor: "pointer", textAlign: "left",
            }}
          >
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, marginBottom: "4px" }}>
              {currentStreak}
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Day Streak
            </p>
            {longestStreak > 0 && (
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Best: {longestStreak}
              </p>
            )}
          </button>

          <div style={{
            background: "var(--bg-card)", borderRadius: "12px", padding: "16px",
            boxShadow: "var(--shadow)", flex: 1,
          }}>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: ws.color, lineHeight: 1, marginBottom: "4px" }}>
              {ws.label}
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Workout
            </p>
            {todaySessions.length > 0 && (
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {todaySessions.length} session{todaySessions.length !== 1 ? "s" : ""} logged
              </p>
            )}
          </div>
        </div>

        {/* ── Weekly Progress card — primary entry to Weekly Review ── */}
        <button
          onClick={onOpenReview}
          style={{
            width: "100%",
            background: "var(--bg-card)",
            border: "none",
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "var(--shadow)",
            marginBottom: "16px",
            cursor: "pointer",
            textAlign: "left",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Weekly Progress
            </p>
            <span style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>→</span>
          </div>

          <div style={{ display: "flex", gap: "20px", marginBottom: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {weekStats.activeDays}/7
              </p>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Active days
              </p>
            </div>
            <div style={{ width: "1px", background: "var(--border-light)", flexShrink: 0 }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {weekStats.totalWorkouts}
              </p>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Workouts
              </p>
            </div>
            <div style={{ width: "1px", background: "var(--border-light)", flexShrink: 0 }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {weekStats.taskPct !== null ? `${weekStats.taskPct}%` : "—"}
              </p>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Tasks done
              </p>
            </div>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            {weeklyInsight()}
          </p>
        </button>

        {/* ── Steps placeholder ── */}
        <div style={{
          background: "var(--bg-card)",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "var(--shadow)",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>Daily Steps</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Apple Health integration coming soon
            </p>
          </div>
          <p style={{ fontSize: "1.4rem" }}>👟</p>
        </div>

        {/* ── Remaining tasks ── */}
        {remainingToday.length > 0 && (
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "var(--shadow)",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "12px",
            }}>
              <p style={{
                fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>Still to do</p>
              {remainingToday.length > 3 && (
                <button
                  onClick={onGoToTasks}
                  style={{
                    background: "none", border: "none",
                    fontSize: "0.78rem", color: "var(--text-muted)",
                    cursor: "pointer", padding: 0,
                  }}
                >See all →</button>
              )}
            </div>

            {remainingToday.slice(0, 3).map((task, i) => (
              <div
                key={task.id}
                style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "9px 0",
                  borderBottom: i < Math.min(remainingToday.length, 3) - 1
                    ? "1px solid var(--border-light)" : "none",
                }}
              >
                <div style={{
                  width: "18px", height: "18px", borderRadius: "5px",
                  border: "2px solid var(--border)", flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "0.9rem", color: "var(--text-primary)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{task.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                    {task.section}
                  </p>
                </div>
              </div>
            ))}

            {remainingToday.length > 3 && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", paddingTop: "10px" }}>
                +{remainingToday.length - 3} more
              </p>
            )}
          </div>
        )}

        {/* All done state */}
        {totalCount > 0 && remainingToday.length === 0 && (
          <div style={{
            background: "var(--bg-card)", borderRadius: "12px",
            padding: "20px", boxShadow: "var(--shadow)", textAlign: "center",
          }}>
            <p style={{ fontSize: "1.4rem", marginBottom: "6px" }}>✓</p>
            <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
              All tasks complete
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Stay consistent. That's the whole game.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}


function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

function formatDateFull(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ── Progress Ring ──
function ProgressRing({ completed, total }) {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total === 0 ? 0 : Math.min(completed / total, 1);
  const dash = circumference * pct;
  const isComplete = total > 0 && completed >= total;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={isComplete ? "#4caf50" : "var(--text-primary)"}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.3s" }}
        />
      </svg>
      {/* Centre text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {total === 0 ? (
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", padding: "0 16px" }}>
            No tasks
          </p>
        ) : (
          <>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
              {completed}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              of {total}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "var(--shadow)",
      flex: 1,
    }}>
      <p style={{
        fontSize: "1.5rem",
        fontWeight: 700,
        color: accent || "var(--text-primary)",
        lineHeight: 1,
        marginBottom: "4px",
      }}>{value}</p>
      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

