import { useState, useEffect } from "react";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function offsetDate(base, days) {
  const [year, month, day] = base.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getDayOfWeek(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getWeekDates(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(year, month - 1, day + diffToMon + i);
    const y2 = dd.getFullYear();
    const m2 = String(dd.getMonth() + 1).padStart(2, "0");
    const d2 = String(dd.getDate()).padStart(2, "0");
    dates.push(`${y2}-${m2}-${d2}`);
  }
  return dates;
}

function getWeekKey(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const y = monday.getFullYear();
  const jan4 = new Date(y, 0, 4);
  const weekNum = Math.ceil(((monday - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${y}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekStats(tasks, workouts, weekDates) {
  const today = todayString();
  const activeDays = weekDates.filter(dateStr => {
    const hasTask = Object.values(tasks).some(s => s.some(t => t.completedDates.includes(dateStr)));
    const hasWorkout = (workouts[dateStr] || []).length > 0;
    return hasTask || hasWorkout;
  }).length;
  const totalWorkouts = weekDates.reduce((acc, d) => acc + (workouts[d] || []).length, 0);
  let totalPossible = 0;
  let totalCompleted = 0;
  weekDates.forEach(dateStr => {
    if (dateStr > today) return;
    const allTasks = Object.values(tasks).flat();
    const dow = getDayOfWeek(dateStr);
    const visible = allTasks.filter(task => {
      if (task.frequency === "daily") return true;
      if (task.frequency === "weekly") return (task.days || []).includes(dow);
      if (task.frequency === "one-time") return task.date === dateStr;
      return false;
    });
    totalPossible += visible.length;
    totalCompleted += visible.filter(t => t.completedDates.includes(dateStr)).length;
  });
  const taskPct = totalPossible === 0 ? null : Math.round((totalCompleted / totalPossible) * 100);
  return { activeDays, totalWorkouts, taskPct };
}

function getWeeklyDots(tasks, workouts, weekDates) {
  return weekDates.map(dateStr => {
    const hasTask = Object.values(tasks).some(s => s.some(t => t.completedDates.includes(dateStr)));
    const hasWorkout = (workouts[dateStr] || []).length > 0;
    return { dateStr, active: hasTask || hasWorkout };
  });
}

function formatWeekRange(weekDates) {
  if (!weekDates || weekDates.length === 0) return "";
  const [y1, m1, d1] = weekDates[0].split("-").map(Number);
  const [y2, m2, d2] = weekDates[6].split("-").map(Number);
  const start = new Date(y1, m1 - 1, d1).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const end = new Date(y2, m2 - 1, d2).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return `${start} – ${end}`;
}

export default function WeeklyReviewScreen({ tasks, workouts, weeklyReviewNotes, onSave, onBack }) {
  const today = todayString();
  // anchorDate is any date within the viewed week — start at today
  const [anchorDate, setAnchorDate] = useState(today);

  const weekDates = getWeekDates(anchorDate);
  const weekKey = getWeekKey(anchorDate);
  const weekStats = getWeekStats(tasks, workouts, weekDates);
  const weeklyDots = getWeeklyDots(tasks, workouts, weekDates);
  const savedNotes = weeklyReviewNotes[weekKey] || {};
  const isCurrentWeek = weekDates[0] === getWeekDates(today)[0];

  const [reflection, setReflection] = useState(savedNotes.reflection || "");
  const [goals, setGoals] = useState(savedNotes.goals || "");
  const [saved, setSaved] = useState(false);

  // When week changes, load that week's saved notes
  useEffect(() => {
    const notes = weeklyReviewNotes[weekKey] || {};
    setReflection(notes.reflection || "");
    setGoals(notes.goals || "");
    setSaved(false);
  }, [weekKey]);

  function prevWeek() {
    setAnchorDate(prev => offsetDate(prev, -7));
  }

  function nextWeek() {
    if (!isCurrentWeek) setAnchorDate(prev => offsetDate(prev, 7));
  }

  function handleSave() {
    onSave(weekKey, reflection, goals);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const textareaStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    fontSize: "0.92rem",
    color: "var(--text-primary)",
    background: "var(--bg-card)",
    outline: "none",
    resize: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    lineHeight: 1.6,
  };

  const labelStyle = {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "8px",
    display: "block",
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 0 100px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "480px",
        padding: "0 20px",
        boxSizing: "border-box",
      }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", fontSize: "0.9rem",
            color: "var(--text-secondary)", cursor: "pointer", padding: 0,
            textAlign: "left", marginBottom: "28px",
          }}
        >← Back</button>

        {/* Title */}
        <h1 style={{
          fontSize: "1.7rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px",
        }}>
          Weekly Review
        </h1>

        {/* Week navigation */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}>
          <button
            onClick={prevWeek}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "6px",
              width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)",
              fontSize: "1.1rem", display: "flex", alignItems: "center",
              justifyContent: "center", padding: 0, flexShrink: 0,
            }}
          >‹</button>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {formatWeekRange(weekDates)}
            </p>
            <p style={{ fontSize: "0.72rem", color: isCurrentWeek ? "var(--text-muted)" : "transparent", marginTop: "2px" }}>
              This week
            </p>
          </div>

          <button
            onClick={nextWeek}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "6px",
              width: "36px", height: "36px", cursor: "pointer",
              color: isCurrentWeek ? "var(--text-faint)" : "var(--text-secondary)",
              fontSize: "1.1rem", display: "flex", alignItems: "center",
              justifyContent: "center", padding: 0, flexShrink: 0,
            }}
            disabled={isCurrentWeek}
          >›</button>
        </div>

        {/* Weekly dots */}
        <div style={{
          background: "var(--bg-card)", borderRadius: "12px", padding: "18px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "16px",
        }}>
          <span style={labelStyle}>Consistency</span>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: "4px", marginTop: "4px",
          }}>
            {weeklyDots.map((dot, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: dot.active ? "var(--text-primary)" : "var(--border)",
                }} />
                <span style={{
                  fontSize: "0.68rem",
                  color: dot.active ? "var(--text-primary)" : "var(--text-faint)",
                  fontWeight: dot.active ? 600 : 400,
                }}>{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px", marginBottom: "28px",
        }}>
          {[
            { label: "Active Days", value: `${weekStats.activeDays}/7` },
            { label: "Workouts", value: weekStats.totalWorkouts },
            { label: "Tasks Done", value: weekStats.taskPct !== null ? `${weekStats.taskPct}%` : "—" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "var(--bg-card)", borderRadius: "12px", padding: "14px 12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center",
            }}>
              <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {stat.value}
              </p>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Reflection */}
        <div style={{ marginBottom: "20px" }}>
          <span style={labelStyle}>How did this week go?</span>
          <textarea
            placeholder="Reflect on what went well, what didn't, how you felt..."
            value={reflection}
            onChange={e => { setReflection(e.target.value); setSaved(false); }}
            rows={5}
            style={textareaStyle}
          />
        </div>

        {/* Goals */}
        <div style={{ marginBottom: "28px" }}>
          <span style={labelStyle}>Intentions for next week</span>
          <textarea
            placeholder="What do you want to focus on or improve next week?"
            value={goals}
            onChange={e => { setGoals(e.target.value); setSaved(false); }}
            rows={4}
            style={textareaStyle}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          style={{
            width: "100%", padding: "14px",
            background: saved ? "#4caf50" : "var(--text-primary)",
            color: "var(--bg)", border: "none", borderRadius: "10px",
            fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
            transition: "background 0.3s ease",
          }}
        >
          {saved ? "Saved ✓" : "Save Review"}
        </button>

      </div>
    </div>
  );
}
