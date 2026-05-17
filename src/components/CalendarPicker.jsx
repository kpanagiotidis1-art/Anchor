import { useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Build a 6-row calendar grid for the given year/month (0-indexed month)
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-first: Mon=0 … Sun=6
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full rows of 7
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateString(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarPicker({ viewedDate, onSelectDate, onClose }) {
  const today = todayString();
  const [year, month, day] = viewedDate.split("-").map(Number);

  const [displayYear, setDisplayYear] = useState(year);
  const [displayMonth, setDisplayMonth] = useState(month - 1); // 0-indexed

  const cells = buildCalendarGrid(displayYear, displayMonth);

  function prevMonth() {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(y => y - 1); }
    else setDisplayMonth(m => m - 1);
  }

  function nextMonth() {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(y => y + 1); }
    else setDisplayMonth(m => m + 1);
  }

  function handleSelect(day) {
    if (!day) return;
    onSelectDate(dateString(displayYear, displayMonth, day));
    onClose();
  }

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 300,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.35)",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "relative",
        background: "var(--bg-card)",
        borderRadius: "20px 20px 0 0",
        padding: "20px 20px 48px",
        zIndex: 301,
        maxWidth: "480px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}>
        {/* Handle */}
        <div style={{
          width: "36px", height: "4px", background: "var(--border)",
          borderRadius: "99px", margin: "0 auto 20px",
        }} />

        {/* Month navigation */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}>
          <button
            onClick={prevMonth}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "8px",
              width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)",
              fontSize: "1.1rem", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}
          >‹</button>

          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {MONTH_NAMES[displayMonth]} {displayYear}
          </p>

          <button
            onClick={nextMonth}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "8px",
              width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)",
              fontSize: "1.1rem", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}
          >›</button>
        </div>

        {/* Day headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          marginBottom: "8px",
        }}>
          {DAY_HEADERS.map((d, i) => (
            <div key={i} style={{
              textAlign: "center",
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-faint)",
              letterSpacing: "0.04em",
              paddingBottom: "6px",
            }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = dateString(displayYear, displayMonth, d);
            const isSelected = ds === viewedDate;
            const isToday = ds === today;
            const isFuture = ds > today;

            return (
              <button
                key={i}
                onClick={() => handleSelect(d)}
                style={{
                  aspectRatio: "1",
                  borderRadius: "50%",
                  border: "none",
                  background: isSelected
                    ? "var(--text-primary)"
                    : "none",
                  color: isSelected
                    ? "var(--bg)"
                    : isFuture
                    ? "var(--text-faint)"
                    : "var(--text-primary)",
                  fontSize: "0.9rem",
                  fontWeight: isSelected || isToday ? 700 : 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  padding: 0,
                  width: "100%",
                }}
              >
                {d}
                {/* Today dot */}
                {isToday && !isSelected && (
                  <span style={{
                    position: "absolute",
                    bottom: "4px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "var(--text-primary)",
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Today shortcut */}
        {viewedDate !== today && (
          <button
            onClick={() => { onSelectDate(today); onClose(); }}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "12px",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Jump to Today
          </button>
        )}
      </div>
    </div>
  );
}
