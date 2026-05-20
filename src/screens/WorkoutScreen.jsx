import { useState, useEffect, useRef } from "react";
import { getFocusMode, getConfig } from "../screens/OverviewScreen";
import CalendarPicker from "../components/CalendarPicker";
import {
  getSessionIdentity,
  getTrainingMomentumCopy,
  getExerciseProgressionHint,
  getRelativeSessionLabel,
  getWorkoutIdentityLine,
  getSessionProgressionObservation,
} from "../lib/anchorVoice";

// ── Date helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s > 0 ? s + "s" : ""}`.trim() : `${s}s`;
}

function getRelativeDayLabel(dateStr) {
  const today = todayString();
  if (dateStr === today) return "Today";
  const [ty, tm, td] = today.split("-").map(Number);
  const [vy, vm, vd] = dateStr.split("-").map(Number);
  const diffDays = Math.round(
    (new Date(vy, vm - 1, vd) - new Date(ty, tm - 1, td)) / 86400000
  );
  if (diffDays === -1) return "Yesterday";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  return `In ${diffDays}d`;
}

function formatSetDisplay(set, mode) {
  mode = mode || "reps";
  if (mode === "time") return formatDuration(set.duration);
  if (mode === "cardio") {
    const parts = [];
    if (set.duration) parts.push(formatDuration(set.duration));
    if (set.distance) parts.push(`${set.distance}km`);
    if (set.speed)    parts.push(`${set.speed}km/h`);
    if (set.calories) parts.push(`${set.calories}cal`);
    return parts.join(" · ") || "—";
  }
  const weight = set.weight !== "" && set.weight != null ? `${set.weight}kg` : "BW";
  return `${weight} × ${set.reps}`;
}

// ── Compute training context from full workouts object ─────────────────────────
function computeTrainingContext(allWorkouts) {
  if (!allWorkouts) return { weekSessions: 0, lastSession: null, daysSinceLastSession: null, recentDates: [] };

  const today = todayString();
  const [ty, tm, td] = today.split("-").map(Number);
  const todayMs = new Date(ty, tm - 1, td).getTime();

  // Week bounds (Mon–Sun)
  const todayDate = new Date(ty, tm - 1, td);
  const dow = todayDate.getDay();
  const mondayOffset = (dow === 0 ? -6 : 1 - dow);
  const weekStart = new Date(todayDate);
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth()+1).padStart(2,"0")}-${String(weekStart.getDate()).padStart(2,"0")}`;

  let weekSessions = 0;
  let lastSession = null;
  let lastSessionDate = null;
  const recentDates = [];

  // Sort dates descending
  const sortedDates = Object.keys(allWorkouts).sort((a, b) => b.localeCompare(a));

  for (const dateStr of sortedDates) {
    const sessions = allWorkouts[dateStr] || [];
    const completed = sessions.filter(s => s.status === "completed");
    if (completed.length === 0) continue;

    recentDates.push({ dateStr, sessions: completed });

    // Count this week's sessions
    if (dateStr >= weekStartStr && dateStr <= today) {
      weekSessions += completed.length;
    }

    // Track most recent session
    if (!lastSession) {
      lastSession = completed[completed.length - 1];
      lastSessionDate = dateStr;
    }
  }

  let daysSinceLastSession = null;
  if (lastSessionDate) {
    const [ly, lm, ld] = lastSessionDate.split("-").map(Number);
    const lastMs = new Date(ly, lm - 1, ld).getTime();
    daysSinceLastSession = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));
  }

  // Gap between the two most recent sessions (used for "first session back" copy)
  let gapBeforeLatestSession = null;
  if (recentDates.length >= 2) {
    const [a, b] = recentDates;
    const [ay, am, ad] = a.dateStr.split("-").map(Number);
    const [by, bm, bd] = b.dateStr.split("-").map(Number);
    gapBeforeLatestSession = Math.round(
      (new Date(ay, am - 1, ad) - new Date(by, bm - 1, bd)) / 86400000
    );
  }

  return {
    weekSessions,
    lastSession,
    daysSinceLastSession,
    recentDates: recentDates.slice(0, 8),
    gapBeforeLatestSession,
  };
}

// ── Training momentum header ───────────────────────────────────────────────────
// Derives entirely from the selected date. No global state.
function TrainingMomentumHeader({ viewedSessions, viewedDate }) {
  const today = todayString();
  const completed = (viewedSessions || []).filter(s => s.status === "completed");
  const active    = (viewedSessions || []).find(s => s.status === "active");

  let headline, sub;

  if (active) {
    const identity = getSessionIdentity(active.exercises || []);
    headline = active.title || identity || "In Progress";
    sub = active.startTime ? `Started ${active.startTime}` : null;
  } else if (completed.length > 0) {
    const session = completed[completed.length - 1];
    const identity = getSessionIdentity(session.exercises || []);
    headline = session.title || identity || "Session";
    const timeStr = [session.startTime, session.endTime].filter(Boolean).join(" → ");
    const durStr  = session.duration ? `${session.duration} min` : "";
    sub = [timeStr, durStr].filter(Boolean).join(" · ") || null;
  } else {
    const [ty, tm, td] = today.split("-").map(Number);
    const [vy, vm, vd] = viewedDate.split("-").map(Number);
    const diffDays = Math.round(
      (new Date(vy, vm - 1, vd) - new Date(ty, tm - 1, td)) / 86400000
    );
    if (diffDays === 0) {
      headline = "Training when you're ready.";
      sub = "No session logged today.";
    } else if (diffDays < 0) {
      headline = "Recovery day.";
      sub = "No session logged.";
    } else {
      headline = "No workout planned.";
      sub = null;
    }
  }

  return (
    <div style={{ marginBottom: "var(--space-6)" }}>
      <h1 style={{ fontSize: "var(--text-hero)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: sub ? "var(--space-1)" : "0" }}>
        {headline}
      </h1>
      {sub && (
        <p style={{ fontSize: "var(--text-body)", color: "var(--text-muted)", lineHeight: 1.4 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Recent sessions strip ──────────────────────────────────────────────────────
// Memory strip — a quiet record of recent training, not navigation.
function RecentSessionsStrip({ recentDates, onNavigateDay, viewedDate }) {
  if (!recentDates || recentDates.length === 0) return null;

  return (
    <div style={{ marginBottom: "var(--space-5)" }}>
      <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: "var(--space-1)", scrollbarWidth: "none" }}>
        {recentDates.map(({ dateStr, sessions }) => {
          const identity = getSessionIdentity(sessions[0]?.exercises || []);
          const displayName = sessions[0]?.title || identity;
          const dateLabel = getRelativeSessionLabel(dateStr);
          const duration = sessions[0]?.duration;
          const isViewed = dateStr === viewedDate;

          return (
            <button
              key={dateStr}
              onClick={() => onNavigateDay(0, dateStr)}
              style={{
                flexShrink: 0,
                background: isViewed ? "var(--bg-surface)" : "var(--bg-inset)",
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                cursor: "pointer",
                textAlign: "left",
                minWidth: "80px",
                boxShadow: isViewed ? "inset 2px 0 0 var(--accent)" : "none",
                transition: "box-shadow 0.15s ease, background 0.15s ease",
              }}
            >
              <p style={{ fontSize: "var(--text-micro)", color: isViewed ? "var(--accent-text)" : "var(--text-faint)", marginBottom: "4px", letterSpacing: "0.03em" }}>
                {dateLabel}
              </p>
              <p style={{ fontSize: "var(--text-caption)", fontWeight: isViewed ? 600 : 500, color: isViewed ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.25 }}>
                {displayName || "Session"}
              </p>
              {duration && (
                <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "3px" }}>{duration}m</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Training stats panel ───────────────────────────────────────────────────────
function TrainingStatsPanel({ allWorkouts, exerciseHistory, sessions }) {
  const [expanded, setExpanded] = useState(false);

  if (!allWorkouts) return null;

  // Compute monthly sessions
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  let monthSessions = 0;
  let totalSessions = 0;

  for (const [dateStr, daySessions] of Object.entries(allWorkouts)) {
    const completed = daySessions.filter(s => s.status === "completed");
    totalSessions += completed.length;
    if (dateStr.startsWith(monthPrefix)) {
      monthSessions += completed.length;
    }
  }

  // PRs are filtered to exercises in the viewed day's sessions (when sessions exist)
  const completedSessions = (sessions || []).filter(s => s.status === "completed");
  const sessionExerciseNames = completedSessions.length > 0
    ? new Set(completedSessions.flatMap(s => (s.exercises || []).map(e => e.name)))
    : null;

  const prs = [];
  if (exerciseHistory && sessionExerciseNames !== null) {
    for (const [name, entries] of Object.entries(exerciseHistory)) {
      if (!sessionExerciseNames.has(name)) continue;
      let best = null;
      for (const entry of (entries || [])) {
        for (const set of (entry.sets || [])) {
          if (!set.weight || !set.reps) continue;
          const score = set.weight * set.reps;
          if (!best || score > best.score) {
            best = { name, weight: set.weight, reps: set.reps, score };
          }
        }
      }
      if (best) prs.push(best);
    }
    prs.sort((a, b) => b.score - a.score);
  }

  const topPrs = prs.slice(0, 3);

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-light)",
          borderRadius: expanded ? "var(--radius-md) var(--radius-md) 0 0" : "var(--radius-md)",
          padding: "var(--space-3) var(--space-5)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "var(--text-title)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{monthSessions}</p>
            <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "2px" }}>this month</p>
          </div>
          <div style={{ width: "1px", height: "28px", background: "var(--border-light)" }} />
          <div>
            <p style={{ fontSize: "var(--text-title)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{totalSessions}</p>
            <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "2px" }}>all time</p>
          </div>
        </div>
        <span style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
          ↓
        </span>
      </button>

      {expanded && topPrs.length > 0 && (
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-light)",
          borderTop: "none",
          borderRadius: "0 0 var(--radius-md) var(--radius-md)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ padding: "var(--space-4) var(--space-5) var(--space-3)" }}>
            <p style={{ fontSize: "var(--text-label)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)" }}>
              Session bests
            </p>
            {topPrs.map((pr, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-2) 0",
                borderBottom: i < topPrs.length - 1 ? "1px solid var(--border-light)" : "none",
              }}>
                <p style={{ fontSize: "var(--text-body)", color: "var(--text-primary)", fontWeight: 500 }}>{pr.name}</p>
                <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", fontWeight: 500 }}>
                  Personal best · {pr.weight}kg × {pr.reps}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rest timer ─────────────────────────────────────────────────────────────────
function RestTimer({ onDismiss, defaultDuration = 90 }) {
  const DURATIONS = [60, 90, 120];
  const [selected, setSelected] = useState(defaultDuration);
  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(intervalRef.current); setRunning(false); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function start(duration) {
    clearInterval(intervalRef.current);
    setSelected(duration);
    setTimeLeft(duration);
    setRunning(true);
  }

  function reset() { clearInterval(intervalRef.current); setRunning(false); setTimeLeft(null); }

  const isFinished = timeLeft === 0;
  const isActive   = timeLeft !== null;
  const progress   = isActive ? timeLeft / selected : 1;
  const minutes    = isActive ? Math.floor(timeLeft / 60) : null;
  const seconds    = isActive ? timeLeft % 60 : null;
  const timeDisplay = isActive ? `${minutes}:${String(seconds).padStart(2, "0")}` : null;

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;

  return (
    <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-md)", padding: "var(--space-4)", marginTop: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
      <div style={{ position: "relative", width: "68px", height: "68px", flexShrink: 0 }}>
        <svg width="68" height="68" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="34" cy="34" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle cx="34" cy="34" r={radius} fill="none"
            stroke={isFinished ? "var(--accent)" : "var(--text-primary)"}
            strokeWidth="4"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s linear, stroke 0.3s" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isFinished ? (
            <span style={{ fontSize: "1.1rem", color: "var(--accent-text)" }}>✓</span>
          ) : isActive ? (
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>{timeDisplay}</span>
          ) : (
            <span style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.2 }}>Rest</span>
          )}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {isFinished ? (
          <div>
            <p style={{ fontSize: "var(--text-body)", fontWeight: 600, color: "var(--accent-text)", marginBottom: "var(--space-2)" }}>Rest complete.</p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button onClick={() => start(selected)} style={{ flex: 1, padding: "7px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", background: "none", fontSize: "var(--text-caption)", color: "var(--text-secondary)", cursor: "pointer" }}>Again</button>
              <button onClick={onDismiss} style={{ flex: 1, padding: "7px", borderRadius: "var(--radius-xs)", border: "none", background: "var(--text-primary)", fontSize: "var(--text-caption)", color: "var(--bg)", cursor: "pointer" }}>Done</button>
            </div>
          </div>
        ) : isActive ? (
          <div>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Resting · {selected}s</p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button onClick={reset} style={{ flex: 1, padding: "7px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", background: "none", fontSize: "var(--text-caption)", color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
              <button onClick={onDismiss} style={{ flex: 1, padding: "7px", borderRadius: "var(--radius-xs)", border: "none", background: "var(--text-primary)", fontSize: "var(--text-caption)", color: "var(--bg)", cursor: "pointer" }}>Skip</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Start rest timer</p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {DURATIONS.map(d => (
                <button key={d} onClick={() => start(d)} style={{ flex: 1, padding: "7px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", background: "none", fontSize: "var(--text-caption)", color: "var(--text-secondary)", cursor: "pointer" }}>{d}s</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isActive && (
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: "1.2rem", cursor: "pointer", padding: "4px", alignSelf: "flex-start", flexShrink: 0 }}>×</button>
      )}
    </div>
  );
}

// ── Exercise history modal ─────────────────────────────────────────────────────
function ExerciseHistoryModal({ name, history, mode, onClose }) {
  mode = mode || "reps";
  const sessions = history || [];

  let pr = null;
  if (mode === "reps") {
    sessions.forEach(session => {
      (session.sets || []).forEach(set => {
        if (!pr) { pr = set; return; }
        if ((set.weight || 0) * set.reps > (pr.weight || 0) * pr.reps) pr = set;
      });
    });
  } else if (mode === "time") {
    sessions.forEach(session => {
      (session.sets || []).forEach(set => {
        if (!pr || set.duration > pr.duration) pr = set;
      });
    });
  } else if (mode === "cardio") {
    sessions.forEach(session => {
      (session.sets || []).forEach(set => {
        if (!pr) { pr = set; return; }
        const score    = (set.distance || 0) * 1000 + (set.duration || 0);
        const prScore  = (pr.distance || 0) * 1000 + (pr.duration || 0);
        if (score > prScore) pr = set;
      });
    });
  }

  const lastSession = sessions[0];

  function prDisplay() {
    if (!pr) return null;
    if (mode === "reps")   return pr.weight ? `${pr.weight}kg × ${pr.reps}` : `BW × ${pr.reps}`;
    if (mode === "time")   return formatDuration(pr.duration);
    if (mode === "cardio") return formatSetDisplay(pr, "cardio");
    return null;
  }

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "var(--bg)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--space-6) var(--space-5) var(--space-10)", maxHeight: "82vh", overflowY: "auto", zIndex: 101 }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "var(--radius-pill)", margin: "0 auto var(--space-5)" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--text-sub)", fontWeight: 700, color: "var(--text-primary)" }}>{name}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", padding: "4px", lineHeight: 1 }}>×</button>
        </div>

        {sessions.length === 0 ? (
          <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)", textAlign: "center", padding: "var(--space-5) 0" }}>
            No history yet. Complete a session to see data here.
          </p>
        ) : (
          <>
            {pr && prDisplay() && (
              <div style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-glow)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)", marginBottom: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "var(--text-label)", color: "var(--accent-text)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-1)" }}>
                    Personal best
                  </p>
                  <p style={{ fontSize: "var(--text-title)", fontWeight: 700, color: "var(--text-primary)" }}>{prDisplay()}</p>
                </div>
              </div>
            )}

            {lastSession && (
              <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)", marginBottom: "var(--space-4)", boxShadow: "var(--shadow-sm)" }}>
                <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-3)" }}>
                  Last session — {formatDate(lastSession.date)}
                </p>
                {(lastSession.sets || []).length === 0 ? (
                  <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)" }}>No entries logged.</p>
                ) : (
                  lastSession.sets.map((set, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "var(--space-2)", padding: "6px 0", borderBottom: idx < lastSession.sets.length - 1 ? "1px solid var(--divider)" : "none", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", width: "24px", textAlign: "center" }}>{idx + 1}</span>
                      <span style={{ fontSize: "var(--text-body)", color: "var(--text-primary)" }}>{formatSetDisplay(set, mode)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {sessions.length > 1 && (
              <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)", boxShadow: "var(--shadow-sm)" }}>
                <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-3)" }}>History</p>
                {sessions.slice(1).map((session, sIdx) => (
                  <div key={sIdx} style={{ marginBottom: sIdx < sessions.length - 2 ? "var(--space-4)" : 0 }}>
                    <p style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>{formatDate(session.date)}</p>
                    {(session.sets || []).map((set, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "var(--space-3)", padding: "4px 0" }}>
                        <span style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", width: "24px", textAlign: "center" }}>{idx + 1}</span>
                        <span style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)" }}>{formatSetDisplay(set, mode)}</span>
                      </div>
                    ))}
                    {sIdx < sessions.length - 2 && <div style={{ borderBottom: "1px solid var(--divider)", marginTop: "var(--space-3)" }} />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Workout summary ────────────────────────────────────────────────────────────
// The emotional payoff screen. Identity line is dominant.
function WorkoutSummary({ session, onDismiss, allWorkouts, gapBeforeSession }) {
  const exercises = session.exercises || [];
  const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets || []).length, 0);
  const totalVolume = exercises.reduce((acc, ex) => {
    if ((ex.tracking_mode || "reps") !== "reps") return acc;
    return acc + (ex.sets || []).reduce((s, set) => s + (set.weight ? set.reps * set.weight : 0), 0);
  }, 0);
  const totalCardioSecs = exercises.reduce((acc, ex) => {
    if ((ex.tracking_mode || "reps") !== "cardio") return acc;
    return acc + (ex.sets || []).reduce((s, set) => s + (set.duration || 0), 0);
  }, 0);

  const identityLine = getWorkoutIdentityLine(session, { daysSincePrevSession: gapBeforeSession ?? 0 });
  const sessionIdentity = getSessionIdentity(exercises);
  const progressionObs = getSessionProgressionObservation(session, allWorkouts);

  const statItems = [
    { label: "Exercises", value: exercises.length },
    { label: "Sets", value: totalSets },
    totalCardioSecs > 0
      ? { label: "Cardio", value: formatDuration(totalCardioSecs) }
      : { label: "Volume", value: totalVolume > 0 ? `${totalVolume}kg` : "—" },
  ];

  return (
    <div style={{ width: "100%", minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-10) var(--space-5) var(--scroll-pb)", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Header — identity first */}
        <div style={{ marginBottom: "var(--space-7)" }}>
          {sessionIdentity && (
            <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--accent-text)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "var(--space-3)" }}>
              {sessionIdentity}
            </p>
          )}
          <h1 style={{ fontSize: "var(--text-display)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: progressionObs ? "var(--space-2)" : "var(--space-3)" }}>
            {session.title || identityLine}
          </h1>
          {progressionObs && (
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
              {progressionObs}
            </p>
          )}
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)" }}>
            {session.startTime}
            {session.endTime ? ` → ${session.endTime}` : ""}
            {session.duration ? ` · ${session.duration} min` : ""}
          </p>
        </div>

        {/* Stats strip — horizontal instead of grid */}
        <div style={{
          display: "flex",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)",
          marginBottom: "var(--space-5)",
          overflow: "hidden",
        }}>
          {statItems.map((stat, i) => (
            <div key={stat.label} style={{
              flex: 1,
              padding: "var(--space-4) var(--space-3)",
              textAlign: "center",
              borderRight: i < statItems.length - 1 ? "1px solid var(--border-light)" : "none",
            }}>
              <p style={{ fontSize: "var(--text-title)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginTop: "var(--space-1)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Exercise list */}
        <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)", boxShadow: "var(--shadow-sm)", marginBottom: "var(--space-4)" }}>
          {exercises.length === 0 ? (
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)" }}>No exercises logged.</p>
          ) : (
            exercises.map((ex, i) => {
              const mode = ex.tracking_mode || "reps";
              const setCount = (ex.sets || []).length;
              const label = mode === "cardio"
                ? `${setCount} session${setCount !== 1 ? "s" : ""}`
                : `${setCount} set${setCount !== 1 ? "s" : ""}`;
              return (
                <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", borderBottom: i < exercises.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                  <span style={{ fontSize: "var(--text-body)", color: "var(--text-primary)", fontWeight: 500 }}>{ex.name}</span>
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)" }}>{label}</span>
                </div>
              );
            })
          )}
        </div>

        {session.notes && (
          <div style={{ padding: "var(--space-4) var(--space-5)", marginBottom: "var(--space-4)", borderLeft: "2px solid var(--border-light)" }}>
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>{session.notes}</p>
          </div>
        )}

        <button onClick={onDismiss} style={{ width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer" }}>
          Back to Workout
        </button>

        <p style={{ textAlign: "center", fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "var(--space-4)" }}>
          Momentum builds quietly.
        </p>
      </div>
    </div>
  );
}

// ── Template picker ────────────────────────────────────────────────────────────
function TemplatePicker({ anchorTemplates, userTemplates, onSelect, onSkip }) {
  function exerciseLabel(ex) {
    return typeof ex === "string" ? ex : ex.name;
  }

  function renderTemplate(template) {
    return (
      <button
        key={template.id}
        onClick={() => onSelect(template.exercises)}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-4) var(--space-5)",
          textAlign: "left",
          cursor: "pointer",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <p style={{ fontSize: "var(--text-body)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-1)" }}>
          {template.name}
        </p>
        <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
          {template.exercises.map(exerciseLabel).join("  ·  ")}
        </p>
      </button>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-9) var(--space-5) var(--scroll-pb)", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ marginBottom: "var(--space-7)" }}>
          <p style={{ fontSize: "var(--text-label)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "var(--space-2)" }}>Start workout</p>
          <h1 style={{ fontSize: "var(--text-hero)", fontWeight: 700, color: "var(--text-primary)" }}>Choose a template</h1>
        </div>

        <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)" }}>Anchor workouts</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-7)" }}>
          {anchorTemplates.map(renderTemplate)}
        </div>

        {userTemplates.length > 0 && (
          <>
            <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-3)" }}>My templates</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-7)" }}>
              {userTemplates.map(renderTemplate)}
            </div>
          </>
        )}

        <button onClick={onSkip} style={{ width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer" }}>
          Start empty
        </button>
      </div>
    </div>
  );
}

// ── Template manager ───────────────────────────────────────────────────────────
function TemplateManager({ userTemplates, onCreateTemplate, onUpdateTemplate, onDeleteTemplate, onBack }) {
  const [view, setView] = useState("list");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState([]);
  const [newExercise, setNewExercise] = useState("");
  const [newMode, setNewMode] = useState("reps");
  const [error, setError] = useState("");
  const [editingExIdx, setEditingExIdx] = useState(null);
  const [editingExName, setEditingExName] = useState("");

  function normaliseExercises(exList) {
    return exList.map(ex => typeof ex === "string" ? { name: ex, tracking_mode: "reps" } : { name: ex.name, tracking_mode: ex.tracking_mode || "reps" });
  }

  function openCreate() { setName(""); setExercises([]); setNewExercise(""); setNewMode("reps"); setError(""); setView("create"); }
  function openEdit(template) { setEditingTemplate(template); setName(template.name); setExercises(normaliseExercises(template.exercises)); setNewExercise(""); setNewMode("reps"); setError(""); setView("edit"); }
  function addExerciseToList() {
    if (!newExercise.trim()) return;
    setExercises(prev => [...prev, { name: newExercise.trim(), tracking_mode: newMode }]);
    setNewExercise(""); setNewMode("reps");
  }
  function removeExerciseFromList(idx) { setExercises(prev => prev.filter((_, i) => i !== idx)); }
  function startEditExercise(idx) { setEditingExIdx(idx); setEditingExName(exercises[idx].name); }
  function saveEditExercise(idx) {
    if (editingExName.trim()) setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, name: editingExName.trim() } : ex));
    setEditingExIdx(null); setEditingExName("");
  }
  function setExerciseMode(idx, mode) { setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, tracking_mode: mode } : ex)); }
  function handleSave(isCreate) {
    if (!name.trim()) { setError("Template name is required."); return; }
    if (exercises.length === 0) { setError("Add at least one exercise."); return; }
    if (isCreate) onCreateTemplate(name.trim(), exercises);
    else onUpdateTemplate(editingTemplate.id, name.trim(), exercises);
    setView("list");
  }

  const inputStyle = { width: "100%", padding: "var(--space-3) var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", outline: "none", background: "var(--bg-surface)", color: "var(--text-primary)", boxSizing: "border-box", fontFamily: "inherit" };
  const MODE_LABELS = { reps: "Reps", time: "Time", cardio: "Cardio" };
  const MODE_KEYS   = ["reps", "time", "cardio"];

  function ModeToggle({ value, onChange, small }) {
    return (
      <div style={{ display: "flex", background: "var(--bg-inset)", borderRadius: "var(--radius-xs)", padding: "2px", gap: "2px" }}>
        {MODE_KEYS.map(m => (
          <button key={m} onClick={() => onChange(m)} style={{ padding: small ? "3px 7px" : "4px 10px", borderRadius: "4px", border: "none", background: value === m ? "var(--bg-surface)" : "none", color: value === m ? "var(--text-primary)" : "var(--text-muted)", fontSize: small ? "var(--text-micro)" : "var(--text-caption)", fontWeight: value === m ? 600 : 400, cursor: "pointer", boxShadow: value === m ? "var(--shadow-xs)" : "none", fontFamily: "inherit", whiteSpace: "nowrap" }}>{MODE_LABELS[m]}</button>
        ))}
      </div>
    );
  }

  if (view === "create" || view === "edit") {
    return (
      <div style={{ width: "100%", minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-9) var(--space-5) var(--scroll-pb)", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: "480px" }}>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", fontSize: "var(--text-body)", color: "var(--text-secondary)", cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "var(--space-6)", fontFamily: "inherit" }}>← Back</button>
          <h2 style={{ fontSize: "var(--text-hero)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-6)" }}>{view === "create" ? "New Template" : "Edit Template"}</h2>
          <p style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Template Name</p>
          <input type="text" placeholder="e.g. Push Day" value={name} onChange={e => { setName(e.target.value); setError(""); }} style={{ ...inputStyle, marginBottom: "var(--space-5)" }} autoFocus />
          <p style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Exercises</p>
          {exercises.length > 0 && (
            <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", padding: "4px 0", marginBottom: "var(--space-3)", boxShadow: "var(--shadow-xs)" }}>
              {exercises.map((ex, idx) => (
                <div key={idx} style={{ padding: "var(--space-3) var(--space-4)", borderBottom: idx < exercises.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                    {editingExIdx === idx ? (
                      <input autoFocus value={editingExName} onChange={e => setEditingExName(e.target.value)} onBlur={() => saveEditExercise(idx)} onKeyDown={e => { if (e.key === "Enter") saveEditExercise(idx); if (e.key === "Escape") setEditingExIdx(null); }} style={{ flex: 1, padding: "4px var(--space-2)", border: "1px solid var(--text-primary)", borderRadius: "var(--radius-xs)", fontSize: "var(--text-body)", outline: "none", background: "var(--bg-inset)", color: "var(--text-primary)", boxSizing: "border-box", fontFamily: "inherit" }} />
                    ) : (
                      <button onClick={() => startEditExercise(idx)} style={{ flex: 1, background: "none", border: "none", padding: "2px 0", textAlign: "left", cursor: "pointer", fontSize: "var(--text-body)", color: "var(--text-primary)", fontFamily: "inherit" }}>{ex.name}</button>
                    )}
                    <button onClick={() => removeExerciseFromList(idx)} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: "1.1rem", cursor: "pointer", padding: "4px", flexShrink: 0 }}>×</button>
                  </div>
                  <ModeToggle value={ex.tracking_mode || "reps"} onChange={mode => setExerciseMode(idx, mode)} small />
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: "var(--space-2)" }}>
            <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <input type="text" placeholder="Add exercise..." value={newExercise} onChange={e => setNewExercise(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addExerciseToList(); }} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addExerciseToList} style={{ padding: "var(--space-3) var(--space-4)", background: "var(--bg-inset)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>+</button>
            </div>
            <ModeToggle value={newMode} onChange={setNewMode} />
          </div>
          {error && <p style={{ color: "#e05252", fontSize: "var(--text-body)", marginBottom: "var(--space-3)" }}>{error}</p>}
          <button onClick={() => handleSave(view === "create")} style={{ width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer", marginTop: "var(--space-3)", fontFamily: "inherit" }}>Save Template</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-9) var(--space-5) var(--scroll-pb)", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: "var(--text-body)", color: "var(--text-secondary)", cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "var(--space-6)" }}>← Back</button>
        <h2 style={{ fontSize: "var(--text-hero)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-7)" }}>My Templates</h2>
        {userTemplates.length === 0 ? (
          <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)", marginBottom: "var(--space-6)" }}>No templates yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
            {userTemplates.map(template => (
              <div key={template.id} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)", boxShadow: "var(--shadow-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "var(--text-body)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>{template.name}</p>
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>{template.exercises.map(ex => typeof ex === "string" ? ex : ex.name).join("  ·  ")}</p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: "var(--space-3)", flexShrink: 0 }}>
                  <button onClick={() => openEdit(template)} style={{ padding: "6px 12px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", background: "none", color: "var(--text-secondary)", fontSize: "var(--text-caption)", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => onDeleteTemplate(template.id)} style={{ padding: "6px 12px", borderRadius: "var(--radius-xs)", border: "1px solid #e05252", background: "none", color: "#e05252", fontSize: "var(--text-caption)", cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={openCreate} style={{ width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer" }}>+ Create Template</button>
      </div>
    </div>
  );
}

// ── Set row ────────────────────────────────────────────────────────────────────
function SetRow({ setNumber, set, mode, sessionActive, onDelete }) {
  mode = mode || "reps";
  return (
    <div style={{ display: "grid", gridTemplateColumns: sessionActive ? "28px 1fr 32px" : "28px 1fr", gap: "var(--space-2)", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--divider)" }}>
      <span style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", textAlign: "center" }}>{setNumber}</span>
      <span style={{ fontSize: "var(--text-body)", color: "var(--text-primary)" }}>{formatSetDisplay(set, mode)}</span>
      {sessionActive ? (
        <button onClick={onDelete} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: "1.1rem", cursor: "pointer", padding: "4px", lineHeight: 1, minWidth: "32px", minHeight: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      ) : null}
    </div>
  );
}

// ── Add set form ───────────────────────────────────────────────────────────────
function AddSetForm({ onAdd, mode }) {
  mode = mode || "reps";
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [speed, setSpeed] = useState("");
  const [incline, setIncline] = useState("");
  const [calories, setCalories] = useState("");
  const [error, setError] = useState("");

  const inputStyle = { padding: "var(--space-3) var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "1rem", background: "var(--bg-surface)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", width: "100%", fontFamily: "inherit" };
  const fieldLabel = (label) => <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: "var(--space-1)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>;

  function handleAdd() {
    if (mode === "reps") {
      if (!reps.trim() || isNaN(Number(reps)) || Number(reps) <= 0) { setError("Enter a valid rep count."); return; }
      onAdd({ id: `set-${Date.now()}`, reps: Number(reps), weight: weight.trim() !== "" ? Number(weight) : "" });
      setReps(""); setWeight("");
    } else if (mode === "time") {
      const totalSecs = (Number(minutes || 0) * 60) + Number(seconds || 0);
      if (totalSecs <= 0) { setError("Enter a duration."); return; }
      onAdd({ id: `set-${Date.now()}`, duration: totalSecs });
      setMinutes(""); setSeconds("");
    } else if (mode === "cardio") {
      const totalSecs = Number(duration || 0) * 60;
      if (totalSecs <= 0) { setError("Enter a duration."); return; }
      onAdd({ id: `set-${Date.now()}`, duration: totalSecs, ...(distance.trim() && { distance: Number(distance) }), ...(speed.trim() && { speed: Number(speed) }), ...(incline.trim() && { incline: Number(incline) }), ...(calories.trim() && { calories: Number(calories) }) });
      setDuration(""); setDistance(""); setSpeed(""); setIncline(""); setCalories("");
    }
    setError("");
  }

  return (
    <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-sm)", padding: "var(--space-4)", marginTop: "var(--space-3)" }}>
      {mode === "reps" && (
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <div style={{ flex: 1 }}>{fieldLabel("Weight kg")}<input type="number" min="0" step="0.5" placeholder="—" value={weight} onChange={e => setWeight(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
          <div style={{ flex: 1 }}>{fieldLabel("Reps *")}<input type="number" min="1" placeholder="10" value={reps} onChange={e => { setReps(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
        </div>
      )}
      {mode === "time" && (
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <div style={{ flex: 1 }}>{fieldLabel("Min")}<input type="number" min="0" placeholder="0" value={minutes} onChange={e => { setMinutes(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
          <div style={{ flex: 1 }}>{fieldLabel("Sec")}<input type="number" min="0" max="59" placeholder="30" value={seconds} onChange={e => { setSeconds(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
        </div>
      )}
      {mode === "cardio" && (
        <>
          <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
            <div style={{ flex: 1 }}>{fieldLabel("Duration (min) *")}<input type="number" min="0" placeholder="30" value={duration} onChange={e => { setDuration(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
            <div style={{ flex: 1 }}>{fieldLabel("Distance (km)")}<input type="number" min="0" step="0.1" placeholder="—" value={distance} onChange={e => setDistance(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
            <div style={{ flex: 1 }}>{fieldLabel("Speed (km/h)")}<input type="number" min="0" step="0.1" placeholder="—" value={speed} onChange={e => setSpeed(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
            <div style={{ flex: 1 }}>{fieldLabel("Incline / Res.")}<input type="number" min="0" step="0.5" placeholder="—" value={incline} onChange={e => setIncline(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
          </div>
          <div style={{ marginBottom: "var(--space-3)" }}>{fieldLabel("Calories")}<input type="number" min="0" placeholder="—" value={calories} onChange={e => setCalories(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} /></div>
        </>
      )}
      {error && <p style={{ color: "#e05252", fontSize: "var(--text-body)", marginBottom: "var(--space-2)" }}>{error}</p>}
      <button onClick={handleAdd} style={{ width: "100%", padding: "12px", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Log</button>
    </div>
  );
}

// ── Exercise card ──────────────────────────────────────────────────────────────
const TIME_KEYWORDS   = ["plank", "dead hang", "deadhang", "wall sit", "wallsit", "hollow hold", "l-sit", "lsit", "handstand", "hang", "static"];
const CARDIO_KEYWORDS = ["treadmill", "bike", "bicycle", "stairmaster", "rowing", "rower", "run", "walk", "elliptical", "swim", "cycling", "cardio", "hike", "jog"];

function getSuggestion(name) {
  const lower = name.toLowerCase();
  if (CARDIO_KEYWORDS.some(k => lower.includes(k))) return "cardio";
  if (TIME_KEYWORDS.some(k => lower.includes(k))) return "time";
  return null;
}

function TrackingModeSelector({ mode, onChange }) {
  const modes = [{ value: "reps", label: "Reps" }, { value: "time", label: "Time" }, { value: "cardio", label: "Cardio" }];
  return (
    <div style={{ display: "flex", background: "var(--bg-inset)", borderRadius: "var(--radius-xs)", padding: "3px", gap: "2px", marginBottom: "var(--space-3)" }}>
      {modes.map(m => (
        <button key={m.value} onClick={() => onChange(m.value)} style={{ flex: 1, padding: "6px 0", borderRadius: "4px", border: "none", background: mode === m.value ? "var(--bg-surface)" : "none", color: mode === m.value ? "var(--text-primary)" : "var(--text-muted)", fontSize: "var(--text-caption)", fontWeight: mode === m.value ? 600 : 400, cursor: "pointer", boxShadow: mode === m.value ? "var(--shadow-xs)" : "none", transition: "all 0.15s", fontFamily: "inherit" }}>{m.label}</button>
      ))}
    </div>
  );
}

function AddExerciseForm({ onAdd, smartSuggestionsEnabled }) {
  const [name, setName] = useState("");
  const [trackingMode, setTrackingMode] = useState("reps");
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState("");

  function handleNameChange(val) {
    setName(val); setError("");
    if (smartSuggestionsEnabled !== false && val.length > 2) {
      const s = getSuggestion(val);
      setSuggestion(s !== trackingMode ? s : null);
    } else { setSuggestion(null); }
  }

  function applySuggestion() { setTrackingMode(suggestion); setSuggestion(null); }

  function handleAdd() {
    if (!name.trim()) { setError("Exercise name is required."); return; }
    onAdd({ id: `exercise-${Date.now()}`, name: name.trim(), tracking_mode: trackingMode, sets: [] });
    setName(""); setTrackingMode("reps"); setSuggestion(null); setError("");
  }

  return (
    <div style={{ marginTop: "var(--space-3)" }}>
      <input placeholder="Exercise name" value={name} onChange={e => handleNameChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); }} style={{ width: "100%", padding: "var(--space-3) var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "1rem", background: "var(--bg-surface)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", marginBottom: "var(--space-3)", fontFamily: "inherit" }} autoFocus />
      {suggestion && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)", background: "var(--bg-inset)", borderRadius: "var(--radius-sm)" }}>
          <span style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)" }}>Track as {suggestion}?</span>
          <button onClick={applySuggestion} style={{ background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-xs)", padding: "3px 10px", fontSize: "var(--text-caption)", cursor: "pointer", fontFamily: "inherit" }}>Yes</button>
          <button onClick={() => setSuggestion(null)} style={{ background: "none", color: "var(--text-muted)", border: "none", fontSize: "var(--text-caption)", cursor: "pointer", padding: "3px 4px", fontFamily: "inherit" }}>Dismiss</button>
        </div>
      )}
      <TrackingModeSelector mode={trackingMode} onChange={setTrackingMode} />
      {error && <p style={{ color: "#e05252", fontSize: "var(--text-body)", marginBottom: "var(--space-2)" }}>{error}</p>}
      <button onClick={handleAdd} style={{ width: "100%", padding: "12px", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", cursor: "pointer", fontFamily: "inherit" }}>Add Exercise</button>
    </div>
  );
}

function ExerciseCard({ exercise, sessionActive, onAddSet, onDeleteSet, onDeleteExercise, onRenameExercise, exerciseHistory, restTimerEnabled, restTimerDuration, smartSuggestionsEnabled }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(exercise.name);

  const mode    = exercise.tracking_mode || "reps";
  const sets    = exercise.sets || [];
  const history = exerciseHistory?.[exercise.name] || [];

  function handleAddSet(set) {
    onAddSet(exercise.id, set);
    setShowSetForm(false);
    if (restTimerEnabled !== false && mode !== "cardio") setShowRestTimer(true);
  }

  function saveRename() {
    if (nameInput.trim() && nameInput.trim() !== exercise.name) onRenameExercise(exercise.id, nameInput.trim());
    setEditingName(false);
  }

  // Progression hint — shows last session best set and direction
  const progressionHint = mode === "reps"
    ? getExerciseProgressionHint(exercise.name, exerciseHistory, sets)
    : null;

  return (
    <>
      {showHistory && <ExerciseHistoryModal name={exercise.name} history={history} mode={mode} onClose={() => setShowHistory(false)} />}
      <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-sm)", padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          {sessionActive && editingName ? (
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} onBlur={saveRename} onKeyDown={e => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditingName(false); }} style={{ flex: 1, padding: "4px var(--space-2)", border: "1px solid var(--text-primary)", borderRadius: "var(--radius-xs)", fontSize: "var(--text-body)", fontWeight: 600, outline: "none", background: "var(--bg-surface)", color: "var(--text-primary)", boxSizing: "border-box", fontFamily: "inherit" }} />
          ) : (
            <button onClick={() => sessionActive ? setEditingName(true) : setShowHistory(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", flex: 1 }}>
              <span style={{ fontSize: "var(--text-body)", fontWeight: 600, color: "var(--text-primary)" }}>{exercise.name}</span>
              {!sessionActive && history.length > 0 && (
                <span style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginLeft: "var(--space-2)", fontWeight: 400 }}>history ›</span>
              )}
              {sessionActive && (
                <span style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginLeft: "var(--space-2)", fontWeight: 400 }}>tap to rename</span>
              )}
            </button>
          )}
          {sessionActive && !editingName && (
            <button onClick={() => onDeleteExercise(exercise.id)} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: "var(--text-caption)", cursor: "pointer", padding: "4px var(--space-2)", minHeight: "32px" }}>Remove</button>
          )}
        </div>

        {mode !== "reps" && (
          <span style={{ fontSize: "var(--text-micro)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-2)", display: "block" }}>
            {mode === "time" ? "Time" : "Cardio"}
          </span>
        )}

        {/* Progression hint — replaces old "Last:" italic */}
        {progressionHint && sessionActive && (
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
            {progressionHint}
          </p>
        )}

        {sets.length > 0 && (
          <div style={{ paddingTop: "var(--space-1)" }}>
            {sets.map((set, idx) => (
              <SetRow key={set.id} setNumber={idx + 1} set={set} mode={mode} sessionActive={sessionActive} onDelete={() => onDeleteSet(exercise.id, set.id)} />
            ))}
          </div>
        )}

        {sets.length === 0 && (
          <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>No entries yet.</p>
        )}

        {sessionActive && showRestTimer && <RestTimer onDismiss={() => setShowRestTimer(false)} defaultDuration={restTimerDuration || 90} />}

        {sessionActive && (
          showSetForm ? (
            <AddSetForm onAdd={handleAddSet} mode={mode} />
          ) : (
            <button onClick={() => { setShowSetForm(true); setShowRestTimer(false); }} style={{ marginTop: "var(--space-3)", background: "none", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", width: "100%", padding: "10px", color: "var(--text-faint)", fontSize: "var(--text-body)", cursor: "pointer" }}>
              + Add {mode === "cardio" ? "session" : "set"}
            </button>
          )
        )}
      </div>
    </>
  );
}

// ── Session card ───────────────────────────────────────────────────────────────
function SessionCard({ session, onEnd, onAddExercise, onAddSet, onDeleteSet, onDeleteExercise, onRenameExercise, onDeleteWorkout, onUpdateNotes, onUpdateTitle, onCreateTemplate, exerciseHistory, restTimerEnabled, restTimerDuration, smartSuggestionsEnabled }) {
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);

  const sessionActive = session.status === "active";
  const isEditable    = sessionActive || isEditing;
  const exercises     = session.exercises || [];
  const identity      = getSessionIdentity(exercises);
  const displayName   = session.title || identity || "Workout";

  return (
    <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)", boxShadow: "var(--shadow-sm)", width: "100%", boxSizing: "border-box", outline: isEditing ? `2px solid var(--accent-glow)` : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <div>
          <span style={{ fontSize: "var(--text-body)", fontWeight: 700, color: "var(--text-primary)" }}>
            {displayName}
          </span>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>
            {session.startTime}{session.endTime ? ` → ${session.endTime}` : ""}
          </span>
          {session.duration && (
            <span style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>· {session.duration} min</span>
          )}
          {sessionActive && (
            <span style={{ fontSize: "var(--text-micro)", color: "#f0a500", marginLeft: "var(--space-2)", fontWeight: 600 }}>Active</span>
          )}
          {!sessionActive && !isEditing && (
            <span style={{ fontSize: "var(--text-micro)", color: "var(--accent-text)", marginLeft: "var(--space-2)", fontWeight: 600 }}>Completed</span>
          )}
        </div>
        {!sessionActive && (
          <button onClick={() => { setIsEditing(prev => !prev); setShowExerciseForm(false); }} style={{ padding: "6px 14px", borderRadius: "var(--radius-xs)", border: `1px solid ${isEditing ? "var(--accent)" : "var(--border)"}`, background: isEditing ? "var(--accent)" : "none", color: isEditing ? "var(--bg)" : "var(--text-secondary)", fontSize: "var(--text-body)", cursor: "pointer", minHeight: "34px" }}>
            {isEditing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {isEditing && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <p style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-2)" }}>Session name</p>
          <input
            type="text"
            placeholder={identity || "Workout"}
            defaultValue={session.title || ""}
            onBlur={e => onUpdateTitle && onUpdateTitle(session.id, e.target.value.trim())}
            onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
            style={{ width: "100%", padding: "var(--space-3) var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", background: "var(--bg-surface)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
      )}

      {isEditing && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          {!savingTemplate && !templateSaved && (
            <button
              onClick={() => { setTemplateName(session.title || identity || ""); setSavingTemplate(true); setTemplateSaved(false); }}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-caption)", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "inherit" }}>
              Save as template
            </button>
          )}
          {savingTemplate && (
            <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-sm)", padding: "var(--space-3)" }}>
              <p style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Template name</p>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <input
                  autoFocus
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && templateName.trim()) {
                      onCreateTemplate && onCreateTemplate(templateName.trim(), exercises.map(ex => ({ name: ex.name, tracking_mode: ex.tracking_mode || "reps" })));
                      setSavingTemplate(false); setTemplateSaved(true);
                    }
                    if (e.key === "Escape") setSavingTemplate(false);
                  }}
                  placeholder={identity || "Workout"}
                  style={{ flex: 1, padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-xs)", fontSize: "var(--text-body)", background: "var(--bg-surface)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }}
                />
                <button
                  onClick={() => {
                    if (!templateName.trim()) return;
                    onCreateTemplate && onCreateTemplate(templateName.trim(), exercises.map(ex => ({ name: ex.name, tracking_mode: ex.tracking_mode || "reps" })));
                    setSavingTemplate(false); setTemplateSaved(true);
                  }}
                  style={{ padding: "var(--space-2) var(--space-3)", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-xs)", fontSize: "var(--text-caption)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Save
                </button>
                <button
                  onClick={() => setSavingTemplate(false)}
                  style={{ padding: "var(--space-2) var(--space-3)", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-xs)", fontSize: "var(--text-caption)", cursor: "pointer", color: "var(--text-muted)", fontFamily: "inherit" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {templateSaved && (
            <p style={{ fontSize: "var(--text-caption)", color: "var(--accent-text)", padding: "var(--space-1) 0" }}>Template saved.</p>
          )}
        </div>
      )}

      {isEditing && (
        <button onClick={() => onDeleteWorkout(session.id)} style={{ width: "100%", padding: "10px", marginBottom: "var(--space-4)", borderRadius: "var(--radius-sm)", border: "1px solid #e05252", background: "none", color: "#e05252", fontSize: "var(--text-body)", cursor: "pointer" }}>
          Remove workout
        </button>
      )}

      {exercises.length === 0 ? (
        <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)", marginBottom: "var(--space-3)" }}>No exercises yet.</p>
      ) : (
        exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sessionActive={isEditable}
            exerciseHistory={exerciseHistory}
            onAddSet={(exerciseId, set) => onAddSet(session.id, exerciseId, set)}
            onDeleteSet={(exerciseId, setId) => onDeleteSet(session.id, exerciseId, setId)}
            onDeleteExercise={exerciseId => onDeleteExercise(session.id, exerciseId)}
            onRenameExercise={(exerciseId, newName) => onRenameExercise(session.id, exerciseId, newName)}
            restTimerEnabled={restTimerEnabled}
            restTimerDuration={restTimerDuration}
            smartSuggestionsEnabled={smartSuggestionsEnabled}
          />
        ))
      )}

      {isEditable && (
        showExerciseForm ? (
          <AddExerciseForm onAdd={exercise => { onAddExercise(session.id, exercise); setShowExerciseForm(false); }} smartSuggestionsEnabled={smartSuggestionsEnabled} />
        ) : (
          <button onClick={() => setShowExerciseForm(true)} style={{ background: "none", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", width: "100%", padding: "10px", color: "var(--text-muted)", fontSize: "var(--text-body)", cursor: "pointer", marginTop: "var(--space-2)" }}>+ Add exercise</button>
        )
      )}

      {sessionActive && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-2)" }}>Notes</p>
          <textarea placeholder="How did it go?" value={session.notes || ""} onChange={e => onUpdateNotes(session.id, e.target.value)} rows={3} style={{ width: "100%", padding: "var(--space-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", color: "var(--text-primary)", background: "var(--bg-input)", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }} />
        </div>
      )}
      {!sessionActive && session.notes && !isEditing && (
        <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3) var(--space-4)", background: "var(--bg-inset)", borderRadius: "var(--radius-sm)", borderLeft: "2px solid var(--border)" }}>
          <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>{session.notes}</p>
        </div>
      )}
      {!sessionActive && isEditing && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-2)" }}>Notes</p>
          <textarea placeholder="Add notes..." value={session.notes || ""} onChange={e => onUpdateNotes(session.id, e.target.value)} rows={3} style={{ width: "100%", padding: "var(--space-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", color: "var(--text-primary)", background: "var(--bg-input)", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }} />
        </div>
      )}

      {sessionActive && (
        <button onClick={() => onEnd(session.id)} style={{ width: "100%", padding: "13px", marginTop: "var(--space-4)", borderRadius: "var(--radius-sm)", border: "none", background: "var(--text-primary)", color: "var(--bg)", fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer" }}>
          End Workout
        </button>
      )}
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────────
export default function WorkoutScreen({
  viewedDate, onNavigateDay, sessions,
  onStartWorkout, onEndWorkout, onAddExercise, onAddSet,
  onDeleteSet, onDeleteExercise, onRenameExercise, onDeleteWorkout, onUpdateNotes, onUpdateTitle,
  exerciseHistory, summarySession, onDismissSummary,
  anchorTemplates, userTemplates, onCreateTemplate, onUpdateTemplate, onDeleteTemplate,
  restTimerEnabled, restTimerDuration, smartSuggestionsEnabled,
  allWorkouts,
}) {
  const [workoutView, setWorkoutView] = useState("main");
  const [showCalendar, setShowCalendar] = useState(false);

  const isToday        = viewedDate === todayString();
  const safeSessions   = sessions || [];
  const hasActiveSession = safeSessions.some(s => s.status === "active");

  // Training context from full workouts history
  const { weekSessions, lastSession, daysSinceLastSession, recentDates, gapBeforeLatestSession } =
    computeTrainingContext(allWorkouts);

  // Tone drives the ambient atmosphere of the screen
  const momentumCopy = getTrainingMomentumCopy(weekSessions, lastSession, daysSinceLastSession ?? 0);
  const TONE_WASH = {
    strong:     "rgba(76,175,80,0.025)",
    consistent: "rgba(76,175,80,0.015)",
    building:   "rgba(240,165,0,0.018)",
    resting:    "rgba(120,120,160,0.020)",
    fresh:      "transparent",
  };
  const toneWash = TONE_WASH[momentumCopy.tone] || "transparent";

  if (summarySession) {
    return (
      <WorkoutSummary
        session={summarySession}
        onDismiss={onDismissSummary}
        allWorkouts={allWorkouts}
        gapBeforeSession={gapBeforeLatestSession}
      />
    );
  }

  if (workoutView === "picker") {
    return (
      <TemplatePicker
        anchorTemplates={anchorTemplates}
        userTemplates={userTemplates}
        onSelect={exercises => { onStartWorkout(exercises); setWorkoutView("main"); }}
        onSkip={() => { onStartWorkout([]); setWorkoutView("main"); }}
      />
    );
  }

  if (workoutView === "templates") {
    return (
      <TemplateManager
        userTemplates={userTemplates}
        onCreateTemplate={onCreateTemplate}
        onUpdateTemplate={onUpdateTemplate}
        onDeleteTemplate={onDeleteTemplate}
        onBack={() => setWorkoutView("main")}
      />
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100svh", background: `linear-gradient(to bottom, ${toneWash} 0%, transparent 280px), var(--bg)`, display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-9) 0 var(--scroll-pb)", boxSizing: "border-box" }}>
      {showCalendar && (
        <CalendarPicker viewedDate={viewedDate} onSelectDate={date => onNavigateDay(0, date)} onClose={() => setShowCalendar(false)} />
      )}

      <div style={{ width: "100%", maxWidth: "480px", padding: "0 var(--space-5)", boxSizing: "border-box" }}>

        {/* ── Screen wordmark ── */}
        <p style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "var(--space-4)" }}>
          Workout
        </p>

        {/* ── Training momentum header ── */}
        <TrainingMomentumHeader
          viewedSessions={safeSessions}
          viewedDate={viewedDate}
        />

        {/* ── Training context note — memory of recent rhythm, today only, no session yet ── */}
        {isToday && safeSessions.length === 0 && !hasActiveSession && recentDates.length > 0 && (() => {
          const last = recentDates[0];
          const identity = getSessionIdentity(last.sessions[0]?.exercises || []);
          const title = last.sessions[0]?.title;
          const label = getRelativeDayLabel(last.dateStr);
          const parts = [`${title || identity || "Session"} · ${label}`];
          if (weekSessions > 0) parts.push(`${weekSessions} session${weekSessions !== 1 ? "s" : ""} this week`);
          return (
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", marginBottom: "var(--space-5)", lineHeight: 1.5 }}>
              {parts.join(" · ")}
            </p>
          );
        })()}

        {/* ── Recent sessions strip ── */}
        {!hasActiveSession && recentDates.length > 0 && (
          <RecentSessionsStrip recentDates={recentDates} onNavigateDay={onNavigateDay} viewedDate={viewedDate} />
        )}

        {/* ── Date navigation ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", marginBottom: "var(--space-6)", position: "relative" }}>
          <button onClick={() => onNavigateDay(-1)} style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: "var(--radius-xs)", width: "32px", height: "32px", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>‹</button>

          <div style={{ textAlign: "center", width: "160px" }}>
            <p style={{ fontSize: "var(--text-body)", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{formatDate(viewedDate)}</p>
            {isToday && <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "2px" }}>Today</p>}
          </div>

          <button onClick={() => onNavigateDay(1)} style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: "var(--radius-xs)", width: "32px", height: "32px", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>›</button>

          <button onClick={() => setShowCalendar(true)} style={{ position: "absolute", right: 0, background: "none", border: "1px solid var(--border-light)", borderRadius: "var(--radius-xs)", width: "32px", height: "32px", cursor: "pointer", color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Sessions for viewed date ── */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {safeSessions.length === 0 && (() => {
            const h = new Date().getHours();
            const nudge = isToday
              ? (h >= 20 ? "Rest day. Recovery is part of the process." : h >= 12 ? "Ready when you are." : "Training when you're ready.")
              : "Nothing logged on this day.";
            return <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)", textAlign: "center", lineHeight: 1.5 }}>{nudge}</p>;
          })()}

          {safeSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onEnd={onEndWorkout}
              onAddExercise={onAddExercise}
              onAddSet={onAddSet}
              onDeleteSet={onDeleteSet}
              onDeleteExercise={onDeleteExercise}
              onRenameExercise={onRenameExercise}
              onDeleteWorkout={onDeleteWorkout}
              onUpdateNotes={onUpdateNotes}
              onUpdateTitle={onUpdateTitle}
              onCreateTemplate={onCreateTemplate}
              exerciseHistory={exerciseHistory}
              restTimerEnabled={restTimerEnabled}
              restTimerDuration={restTimerDuration}
              smartSuggestionsEnabled={smartSuggestionsEnabled}
            />
          ))}

          {!hasActiveSession && (
            <button onClick={() => setWorkoutView("picker")} style={{ width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer" }}>
              Start Workout
            </button>
          )}

          {/* Training stats panel */}
          <TrainingStatsPanel allWorkouts={allWorkouts} exerciseHistory={exerciseHistory} sessions={safeSessions} />

          <button onClick={() => setWorkoutView("templates")} style={{ width: "100%", padding: "12px", background: "none", color: "var(--text-muted)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", cursor: "pointer" }}>
            Manage Templates
          </button>
        </div>

      </div>
    </div>
  );
}