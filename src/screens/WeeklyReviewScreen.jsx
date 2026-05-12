import { useState } from "react";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function formatWeekRange(weekDates) {
  if (!weekDates || weekDates.length === 0) return "";
  const first = weekDates[0];
  const last = weekDates[6];
  const [y1, m1, d1] = first.split("-").map(Number);
  const [y2, m2, d2] = last.split("-").map(Number);
  const start = new Date(y1, m1 - 1, d1).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const end = new Date(y2, m2 - 1, d2).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return `${start} – ${end}`;
}

export default function WeeklyReviewScreen({
  weekKey, weekDates, weekStats, weeklyDots,
  savedNotes, onSave, onBack,
}) {
  const [reflection, setReflection] = useState(savedNotes.reflection || "");
  const [goals, setGoals] = useState(savedNotes.goals || "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(reflection, goals);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const textareaStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #e0e0e0",
    borderRadius: "10px",
    fontSize: "0.92rem",
    color: "#1a1a1a",
    background: "#fff",
    outline: "none",
    resize: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    lineHeight: 1.6,
  };

  const labelStyle = {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "8px",
    display: "block",
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "#f5f5f3",
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
            background: "none",
            border: "none",
            fontSize: "0.9rem",
            color: "#555",
            cursor: "pointer",
            padding: 0,
            textAlign: "left",
            marginBottom: "28px",
          }}
        >← Back</button>

        {/* Header */}
        <h1 style={{
          fontSize: "1.7rem",
          fontWeight: 700,
          color: "#1a1a1a",
          marginBottom: "4px",
        }}>
          Weekly Review
        </h1>
        <p style={{ fontSize: "0.88rem", color: "#aaa", marginBottom: "32px" }}>
          {formatWeekRange(weekDates)}
        </p>

        {/* Weekly dots */}
        <div style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "18px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          marginBottom: "16px",
        }}>
          <span style={labelStyle}>Consistency</span>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "4px",
            marginTop: "4px",
          }}>
            {(weeklyDots || []).map((dot, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: dot.active ? "#1a1a1a" : "#e8e8e6",
                }} />
                <span style={{
                  fontSize: "0.68rem",
                  color: dot.active ? "#1a1a1a" : "#ccc",
                  fontWeight: dot.active ? 600 : 400,
                }}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px",
          marginBottom: "28px",
        }}>
          {[
            { label: "Active Days", value: `${weekStats.activeDays}/7` },
            { label: "Workouts", value: weekStats.totalWorkouts },
            { label: "Tasks Done", value: weekStats.taskPct !== null ? `${weekStats.taskPct}%` : "—" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "14px 12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>
                {stat.value}
              </p>
              <p style={{ fontSize: "0.68rem", color: "#aaa", marginTop: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
            width: "100%",
            padding: "14px",
            background: saved ? "#4caf50" : "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.3s ease",
          }}
        >
          {saved ? "Saved ✓" : "Save Review"}
        </button>

      </div>
    </div>
  );
}
