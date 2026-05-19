import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// WeeklyReviewScreen
//
// Design principles:
//   - Identity before metrics. Lead with what the week meant, not the numbers.
//   - Surface only the most meaningful signal. A grid of three stats reads as
//     a dashboard; one well-chosen sentence reads as insight.
//   - Reflection before planning. Feel the week first, then look forward.
//   - No shame language. Off weeks are acknowledged, never judged.
//   - The save moment feels like a close, not a form submission.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_FULL   = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function offsetDate(base, days) {
  const [y, m, d] = base.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function getDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay(); // 0=Sun
}

function getWeekDates(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(y, m - 1, d + diffToMon + i);
    dates.push(`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`);
  }
  return dates;
}

function getWeekKey(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() + (dow === 0 ? -6 : 1 - dow));
  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((monday - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${monday.getFullYear()}-W${String(weekNum).padStart(2,"0")}`;
}

function formatWeekRange(weekDates) {
  if (!weekDates?.length) return "";
  const [y1, m1, d1] = weekDates[0].split("-").map(Number);
  const [y2, m2, d2] = weekDates[6].split("-").map(Number);
  const start = new Date(y1, m1-1, d1).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const end   = new Date(y2, m2-1, d2).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return `${start} – ${end}`;
}

// ── Week data computation ─────────────────────────────────────────────────────

function computeWeekData(tasks, workouts, weekDates) {
  const today = todayString();

  const activeDays = weekDates.filter(dateStr => {
    const hasTask    = Object.values(tasks).some(s => s.some(t => t.completedDates.includes(dateStr)));
    const hasWorkout = (workouts[dateStr] || []).some(s => s.status === "completed");
    return hasTask || hasWorkout;
  }).length;

  const totalWorkouts = weekDates.reduce(
    (acc, d) => acc + (workouts[d] || []).filter(s => s.status === "completed").length, 0
  );

  let totalPossible = 0, totalCompleted = 0;
  const perDay = weekDates.map(dateStr => {
    if (dateStr > today) return { dateStr, count: 0, total: 0 };
    const allTasks = Object.values(tasks).flat();
    const dow = getDayOfWeek(dateStr);
    const visible = allTasks.filter(task => {
      if (task.frequency === "daily") return true;
      if (task.frequency === "weekly") return (task.days || []).includes(dow);
      if (task.frequency === "one-time") return task.date === dateStr;
      return false;
    });
    const done = visible.filter(t => t.completedDates.includes(dateStr)).length;
    totalPossible  += visible.length;
    totalCompleted += done;
    return { dateStr, count: done, total: visible.length };
  });

  const taskPct = totalPossible === 0 ? null : Math.round((totalCompleted / totalPossible) * 100);

  const strongestDay = [...perDay]
    .filter(d => d.count > 0 && d.total > 0)
    .sort((a, b) => (b.count / b.total) - (a.count / a.total))[0] || null;

  const dots = weekDates.map(dateStr => {
    const hasTask    = Object.values(tasks).some(s => s.some(t => t.completedDates.includes(dateStr)));
    const hasWorkout = (workouts[dateStr] || []).some(s => s.status === "completed");
    return { dateStr, active: hasTask || hasWorkout };
  });

  return { activeDays, totalWorkouts, taskPct, totalCompleted, totalPossible, perDay, strongestDay, dots };
}

// ── Week narrative ────────────────────────────────────────────────────────────
// Returns { headline, observations[], tone }
// tone: "strong" | "solid" | "quiet" | "off"

function getWeekNarrative(weekData, isCurrentWeek) {
  const { activeDays, totalWorkouts, taskPct, strongestDay } = weekData;

  // Tone
  let tone = "quiet";
  if (activeDays >= 5 && (taskPct === null || taskPct >= 70)) tone = "strong";
  else if (activeDays >= 3 || (taskPct !== null && taskPct >= 50)) tone = "solid";
  else if (activeDays === 0 && !isCurrentWeek) tone = "off";

  // Headline — one complete statement, no percentages, no fragments
  let headline;
  if (isCurrentWeek && activeDays === 0) {
    headline = "The week is still open.";
  } else if (tone === "strong" && totalWorkouts >= 4) {
    headline = "Strong week. Training and consistency both showed up.";
  } else if (tone === "strong" && taskPct !== null && taskPct >= 85) {
    headline = `You showed up ${activeDays} out of 7 days.`;
  } else if (tone === "strong") {
    headline = "Solid consistency this week.";
  } else if (totalWorkouts >= 3) {
    headline = `You trained ${totalWorkouts} times this week.`;
  } else if (taskPct !== null && taskPct >= 60) {
    headline = "More than half the week complete.";
  } else if (activeDays >= 2) {
    headline = `${activeDays} active days. Momentum is there.`;
  } else if (activeDays === 1) {
    headline = "One active day. The door is still open.";
  } else if (tone === "off") {
    headline = "A quieter week. That happens.";
  } else if (isCurrentWeek) {
    headline = "The week is in motion.";
  } else {
    headline = "Every week teaches you something.";
  }

  // Observations — max 2, each adds a different angle from headline
  const obs = [];

  // Workout angle (only if headline didn't already focus on training)
  if (totalWorkouts >= 5 && !headline.includes("train") && !headline.includes("Train")) {
    obs.push(`${totalWorkouts} sessions logged. Consistent training week.`);
  } else if (totalWorkouts >= 3 && !headline.includes("train") && !headline.includes("Train")) {
    obs.push(`${totalWorkouts} workouts logged this week.`);
  } else if (totalWorkouts === 1 && activeDays > 1) {
    obs.push("One session in. Better than none.");
  }

  // Task rate angle — natural language only, no raw % in observations either
  if (taskPct !== null && !isCurrentWeek && obs.length < 2) {
    if (taskPct >= 90) {
      obs.push("Routines were almost fully complete. One of your stronger weeks.");
    } else if (taskPct >= 70) {
      obs.push("Most routines completed. Consistent effort throughout.");
    } else if (taskPct >= 50) {
      obs.push("Roughly half the routines done. Progress over perfection.");
    } else if (taskPct > 0 && tone !== "strong") {
      obs.push("Light on routines this week. Fresh start from here.");
    }
  }

  // Strongest-day callout — only when it genuinely adds something new
  if (strongestDay && obs.length < 2 && activeDays >= 3) {
    const dow = getDayOfWeek(strongestDay.dateStr);
    const dayName = DAY_FULL[dow === 0 ? 6 : dow - 1];
    obs.push(`${dayName} was your strongest day.`);
  }

  return { headline, observations: obs, tone };
}

function toneAccent(tone) {
  if (tone === "strong") return "#4caf50";
  if (tone === "solid")  return "var(--text-primary)";
  return "var(--text-muted)";
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// ── Week dots ─────────────────────────────────────────────────────────────────
function WeekDots({ dots, tone }) {
  const [revealed, setRevealed] = useState(false);
  const prevKey = useRef(null);

  // Re-trigger entrance animation when week changes
  const key = dots.map(d => d.active ? "1" : "0").join("");
  useEffect(() => {
    if (key !== prevKey.current) {
      setRevealed(false);
      prevKey.current = key;
      const t = setTimeout(() => setRevealed(true), 60);
      return () => clearTimeout(t);
    }
  }, [key]);

  const activeColor = toneAccent(tone);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
      {dots.map((dot, i) => (
        <div key={i} style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "7px",
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(5px)",
          transition: `opacity 0.32s ease ${i * 28}ms, transform 0.32s ease ${i * 28}ms`,
        }}>
          <div style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: dot.active ? activeColor : "var(--border)",
            transition: "background 0.45s ease",
          }} />
          <span style={{
            fontSize: "0.63rem",
            letterSpacing: "0.03em",
            color: dot.active ? "var(--text-secondary)" : "var(--text-faint)",
            fontWeight: dot.active ? 600 : 400,
          }}>
            {DAY_LABELS[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Narrative block ───────────────────────────────────────────────────────────
// Headline fades in first, then observation lines stagger in below
function WeekNarrativeBlock({ narrative }) {
  const { headline, observations } = narrative;
  const [phase, setPhase] = useState(0);
  const prevHeadline = useRef(null);

  useEffect(() => {
    if (headline === prevHeadline.current) return;
    prevHeadline.current = headline;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 100);
    const timers = observations.map((_, i) =>
      setTimeout(() => setPhase(2 + i), 100 + (i + 1) * 170)
    );
    return () => { clearTimeout(t1); timers.forEach(clearTimeout); };
  }, [headline, observations.length]);

  return (
    <div style={{ marginBottom: "28px" }}>
      <p style={{
        fontSize: "1.2rem",
        fontWeight: 700,
        color: "var(--text-primary)",
        lineHeight: 1.35,
        marginBottom: observations.length > 0 ? "10px" : "0",
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.38s ease, transform 0.38s ease",
      }}>
        {headline}
      </p>
      {observations.map((obs, i) => (
        <p key={i} style={{
          fontSize: "0.9rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          marginBottom: i < observations.length - 1 ? "4px" : "0",
          opacity: phase >= 2 + i ? 1 : 0,
          transform: phase >= 2 + i ? "translateY(0)" : "translateY(4px)",
          transition: "opacity 0.38s ease, transform 0.38s ease",
        }}>
          {obs}
        </p>
      ))}
    </div>
  );
}

// ── Stat pill — inline number + label, used sparingly ────────────────────────
function StatPill({ label, value, accent }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "baseline",
      gap: "5px",
      background: "var(--bg-subtle)",
      borderRadius: "8px",
      padding: "8px 14px",
    }}>
      <span style={{
        fontSize: "1.3rem",
        fontWeight: 700,
        color: accent || "var(--text-primary)",
        lineHeight: 1,
        transition: "color 0.4s ease",
      }}>
        {value}
      </span>
      <span style={{
        fontSize: "0.7rem",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontWeight: 600,
      }}>
        {label}
      </span>
    </div>
  );
}

// ── Reflection textarea ───────────────────────────────────────────────────────
function ReflectionField({ label, placeholder, value, onChange, rows }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: "20px" }}>
      <p style={{
        fontSize: "0.72rem",
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "8px",
      }}>
        {label}
      </p>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows || 4}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "14px 16px",
          border: `1px solid ${focused ? "var(--text-muted)" : "var(--border)"}`,
          borderRadius: "12px",
          fontSize: "0.92rem",
          color: "var(--text-primary)",
          background: "var(--bg-card)",
          outline: "none",
          resize: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
          lineHeight: 1.65,
          transition: "border-color 0.18s ease",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function WeeklyReviewScreen({ tasks, workouts, weeklyReviewNotes, onSave, onBack }) {
  const today = todayString();
  const [anchorDate, setAnchorDate] = useState(today);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);

  const weekDates     = getWeekDates(anchorDate);
  const weekKey       = getWeekKey(anchorDate);
  const isCurrentWeek = weekDates[0] === getWeekDates(today)[0];
  const savedNotes    = weeklyReviewNotes[weekKey] || {};

  const [reflection, setReflection] = useState(savedNotes.reflection || "");
  const [intentions,  setIntentions] = useState(savedNotes.goals || "");

  useEffect(() => {
    const notes = weeklyReviewNotes[weekKey] || {};
    setReflection(notes.reflection || "");
    setIntentions(notes.goals || "");
    setSaved(false);
  }, [weekKey]);

  const weekData  = computeWeekData(tasks, workouts, weekDates);
  const narrative = getWeekNarrative(weekData, isCurrentWeek);
  const accent    = toneAccent(narrative.tone);

  function prevWeek() { setAnchorDate(prev => offsetDate(prev, -7)); }
  function nextWeek()  { if (!isCurrentWeek) setAnchorDate(prev => offsetDate(prev, 7)); }

  function handleSave() {
    onSave(weekKey, reflection, intentions);
    setSaved(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 2200);
  }

  // Surface at most two stats, choosing the most signal-rich
  const showWorkouts = weekData.totalWorkouts >= 1;
  const showTaskPct  = weekData.taskPct !== null && weekData.taskPct > 0 && !showWorkouts;
  const showActiveDays = !showWorkouts && !showTaskPct && weekData.activeDays > 0;

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "44px 0 100px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "480px",
        padding: "0 20px",
        boxSizing: "border-box",
      }}>

        {/* ── Back ── */}
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none",
            fontSize: "0.9rem", color: "var(--text-muted)",
            cursor: "pointer", padding: 0, marginBottom: "32px",
            display: "block", fontFamily: "inherit",
          }}
        >
          ← Back
        </button>

        {/* ── Week navigation ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}>
          <button
            onClick={prevWeek}
            style={{
              background: "none", border: "1px solid var(--border)",
              borderRadius: "8px", width: "36px", height: "36px",
              cursor: "pointer", color: "var(--text-muted)",
              fontSize: "1rem", display: "flex", alignItems: "center",
              justifyContent: "center", padding: 0, flexShrink: 0,
            }}
          >‹</button>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {formatWeekRange(weekDates)}
            </p>
            <p style={{
              fontSize: "0.68rem",
              color: isCurrentWeek ? "var(--text-muted)" : "transparent",
              marginTop: "2px",
            }}>
              This week
            </p>
          </div>

          <button
            onClick={nextWeek}
            disabled={isCurrentWeek}
            style={{
              background: "none", border: "1px solid var(--border)",
              borderRadius: "8px", width: "36px", height: "36px",
              cursor: isCurrentWeek ? "default" : "pointer",
              color: isCurrentWeek ? "var(--text-faint)" : "var(--text-muted)",
              fontSize: "1rem", display: "flex", alignItems: "center",
              justifyContent: "center", padding: 0, flexShrink: 0,
            }}
          >›</button>
        </div>

        {/* ── Dots card ── */}
        <div style={{
          background: "var(--bg-card)",
          borderRadius: "14px",
          padding: "20px 20px 18px",
          boxShadow: "var(--shadow)",
          marginBottom: "28px",
          border: narrative.tone === "strong"
            ? "1px solid rgba(76,175,80,0.2)"
            : "1px solid transparent",
          transition: "border-color 0.5s ease",
        }}>
          <WeekDots dots={weekData.dots} tone={narrative.tone} />

          {/* Stat pills — max 2, chosen by priority */}
          {(showWorkouts || showTaskPct || showActiveDays) && (
            <div style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-light)",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}>
              {showWorkouts && (
                <StatPill
                  label={weekData.totalWorkouts === 1 ? "workout" : "workouts"}
                  value={weekData.totalWorkouts}
                  accent={weekData.totalWorkouts >= 4 ? "#4caf50" : null}
                />
              )}
              {showWorkouts && weekData.taskPct !== null && weekData.taskPct > 0 && (
                <StatPill
                  label="tasks done"
                  value={`${weekData.taskPct}%`}
                  accent={weekData.taskPct >= 75 ? "#4caf50" : null}
                />
              )}
              {showTaskPct && (
                <StatPill
                  label="tasks done"
                  value={`${weekData.taskPct}%`}
                  accent={weekData.taskPct >= 75 ? "#4caf50" : null}
                />
              )}
              {showActiveDays && (
                <StatPill
                  label="active days"
                  value={`${weekData.activeDays}/7`}
                  accent={null}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Narrative — identity layer ── */}
        <WeekNarrativeBlock narrative={narrative} />

        {/* ── Divider ── */}
        <div style={{ height: "1px", background: "var(--border-light)", marginBottom: "28px" }} />

        {/* ── Reflection — feel first ── */}
        <ReflectionField
          label="How did this week feel?"
          placeholder={
            isCurrentWeek
              ? "Reflect as the week unfolds..."
              : "What stood out? What felt hard? What worked?"
          }
          value={reflection}
          onChange={e => { setReflection(e.target.value); setSaved(false); }}
          rows={5}
        />

        {/* ── Intentions — then forward ── */}
        <ReflectionField
          label="One thing for next week"
          placeholder="What's the one thing you want to carry forward?"
          value={intentions}
          onChange={e => { setIntentions(e.target.value); setSaved(false); }}
          rows={3}
        />

        {/* ── Save ── */}
        <button
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "14px",
            background: saved ? "#4caf50" : "var(--text-primary)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "12px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 0.35s cubic-bezier(0.4,0,0.2,1)",
            marginBottom: "20px",
          }}
        >
          {saved ? "Saved" : isCurrentWeek ? "Save" : "Save reflection"}
        </button>

        {/* ── Quiet close line — changes with tone ── */}
        <p style={{
          textAlign: "center",
          fontSize: "0.75rem",
          color: "var(--text-faint)",
          lineHeight: 1.5,
        }}>
          {narrative.tone === "strong"
            ? "Strong weeks build strong months."
            : narrative.tone === "solid"
            ? "Consistency over time."
            : "Every week is a fresh start."}
        </p>

      </div>
    </div>
  );
}
