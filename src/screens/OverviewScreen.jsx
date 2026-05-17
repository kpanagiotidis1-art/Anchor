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

export default function OverviewScreen({
  tasks,
  workouts,
  currentStreak,
  longestStreak,
  weeklyDots,
  viewedDate,
  onGoToTasks,
}) {
  const today = todayString();
  const isToday = viewedDate === today;

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

  // ── Workout status display ──
  function workoutStatus() {
    if (workoutActive) return { label: "In progress", color: "#f0a500" };
    if (workoutDone) return { label: "Done", color: "#4caf50" };
    return { label: "Not yet", color: "var(--text-faint)" };
  }
  const ws = workoutStatus();

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
        <div style={{ marginBottom: "32px" }}>
          <p style={{
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            marginBottom: "4px",
            fontWeight: 500,
          }}>
            {formatDateFull(today)}
          </p>
          <h1 style={{
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.15,
          }}>
            {getGreeting()}
          </h1>
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
            <p style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "4px",
            }}>
              {totalCount === 0
                ? "No tasks today"
                : completedCount === totalCount
                ? "All done. 🎉"
                : `${totalCount - completedCount} remaining`}
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              {totalCount === 0 ? "Add tasks to get started" : `${completedCount} of ${totalCount} tasks complete`}
            </p>

            {/* Weekly dots — compact */}
            <div style={{ display: "flex", gap: "5px" }}>
              {(weeklyDots || []).map((dot, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: dot.active ? "var(--text-primary)" : "var(--border)",
                  }} />
                  <span style={{
                    fontSize: "0.55rem",
                    color: dot.active ? "var(--text-primary)" : "var(--text-faint)",
                    fontWeight: dot.active ? 600 : 400,
                  }}>
                    {DAY_LABELS[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Streak + Workout row ── */}
        <div style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
        }}>
          <StatCard
            label="Day Streak"
            value={currentStreak}
            sub={longestStreak > 0 ? `Best: ${longestStreak}` : null}
          />
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
              color: ws.color,
              lineHeight: 1,
              marginBottom: "4px",
            }}>{ws.label}</p>
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}>
              <p style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                Still to do
              </p>
              {remainingToday.length > 3 && (
                <button
                  onClick={onGoToTasks}
                  style={{
                    background: "none", border: "none",
                    fontSize: "0.78rem", color: "var(--text-muted)",
                    cursor: "pointer", padding: 0,
                  }}
                >
                  See all →
                </button>
              )}
            </div>

            {remainingToday.slice(0, 3).map((task, i) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "9px 0",
                  borderBottom: i < Math.min(remainingToday.length, 3) - 1
                    ? "1px solid var(--border-light)"
                    : "none",
                }}
              >
                {/* Empty checkbox */}
                <div style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "5px",
                  border: "2px solid var(--border)",
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "0.9rem",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {task.name}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                    {task.section}
                  </p>
                </div>
              </div>
            ))}

            {remainingToday.length > 3 && (
              <p style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                textAlign: "center",
                paddingTop: "10px",
              }}>
                +{remainingToday.length - 3} more
              </p>
            )}
          </div>
        )}

        {/* All done state */}
        {totalCount > 0 && remainingToday.length === 0 && (
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "var(--shadow)",
            textAlign: "center",
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
