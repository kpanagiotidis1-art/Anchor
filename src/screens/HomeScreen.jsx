import { useState } from "react";
import SectionBlock from "../components/SectionBlock";
import CalendarPicker from "../components/CalendarPicker";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ── Stats Modal ──
function StatsModal({ currentStreak, longestStreak, weeklyDots, weekStats, onClose, onOpenReview }) {
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 200,
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
        background: "#f5f5f3",
        borderRadius: "20px 20px 0 0",
        padding: "24px 24px 48px",
        zIndex: 201,
        maxHeight: "85vh",
        overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{
          width: "36px", height: "4px", background: "#ddd",
          borderRadius: "99px", margin: "0 auto 24px",
        }} />

        {/* Title */}
        <p style={{
          fontSize: "0.72rem", fontWeight: 600, color: "#aaa",
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: "20px",
        }}>This Week</p>

        {/* Weekly dots — larger in modal */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "28px",
          gap: "6px",
        }}>
          {weeklyDots.map((dot, i) => (
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

        {/* Stats grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "20px",
        }}>
          {[
            { label: "Current Streak", value: `${currentStreak} day${currentStreak !== 1 ? "s" : ""}` },
            { label: "Best Streak", value: `${longestStreak} day${longestStreak !== 1 ? "s" : ""}` },
            { label: "Active Days", value: `${weekStats.activeDays} / 7` },
            { label: "Workouts", value: weekStats.totalWorkouts },
            {
              label: "Task Completion",
              value: weekStats.taskPct !== null ? `${weekStats.taskPct}%` : "—",
              wide: weekStats.taskPct !== null,
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>
                {stat.value}
              </p>
              <p style={{ fontSize: "0.72rem", color: "#aaa", marginTop: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Insight line */}
        {weekStats.taskPct !== null && (
          <div style={{
            background: weekStats.taskPct >= 80 ? "#f0faf0" : weekStats.taskPct >= 50 ? "#fafaf0" : "#faf5f0",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "20px",
          }}>
            <p style={{ fontSize: "0.88rem", color: "#444", lineHeight: 1.5 }}>
              {weekStats.taskPct >= 80
                ? "Strong week. You're showing up consistently — keep the momentum."
                : weekStats.taskPct >= 50
                ? "Solid effort. A few more completions and this becomes a strong week."
                : "Every day is a chance to reset. Tomorrow is fresh."}
            </p>
          </div>
        )}

        {/* Weekly review link */}
        <button
          onClick={() => { onClose(); onOpenReview(); }}
          style={{
            width: "100%",
            padding: "14px",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Weekly Review →
        </button>
      </div>
    </div>
  );
}

export default function HomeScreen({
  tasks, onToggle, onSectionTap, onResetDay,
  viewedDate, onNavigateDay,
  currentStreak, longestStreak,
  weeklyDots, weekStats,
  onOpenReview,
  onOpenSettings,
}) {
  const [showStats, setShowStats] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const isToday = viewedDate === todayString();
  const allTasks = Object.values(tasks).flat();
  const completedCount = allTasks.filter(t => t.completedDates.includes(viewedDate)).length;
  const totalCount = allTasks.length;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

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
      {showStats && (
        <StatsModal
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          weeklyDots={weeklyDots}
          weekStats={weekStats}
          onClose={() => setShowStats(false)}
          onOpenReview={onOpenReview}
        />
      )}

      {showCalendar && (
        <CalendarPicker
          viewedDate={viewedDate}
          onSelectDate={date => { onNavigateDay(0, date); }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      <div style={{
        width: "100%",
        maxWidth: "480px",
        padding: "0 20px",
        boxSizing: "border-box",
      }}>

        {/* App title + settings + logout */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            textAlign: "center",
          }}>
            Anchor
          </h1>
          {/* Settings icon — top right */}
          <button
            onClick={onOpenSettings}
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Date navigation */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "20px",
          position: "relative",
        }}>
          <button
            onClick={() => onNavigateDay(-1)}
            style={{
              background: "none", border: "1px solid #ccc", borderRadius: "6px",
              width: "36px", height: "36px", cursor: "pointer", color: "#555",
              fontSize: "1.1rem", display: "flex", alignItems: "center",
              justifyContent: "center", padding: 0, flexShrink: 0,
            }}
          >‹</button>

          <div style={{ textAlign: "center", width: "150px" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap" }}>
              {formatDate(viewedDate)}
            </p>
            <p style={{
              fontSize: "0.72rem",
              color: isToday ? "#aaa" : "transparent",
              marginTop: "2px",
            }}>Today</p>
          </div>

          <button
            onClick={() => onNavigateDay(1)}
            style={{
              background: "none", border: "1px solid #ccc", borderRadius: "6px",
              width: "36px", height: "36px", cursor: "pointer", color: "#555",
              fontSize: "1.1rem", display: "flex", alignItems: "center",
              justifyContent: "center", padding: 0, flexShrink: 0,
            }}
          >›</button>

          <button
            onClick={() => setShowCalendar(true)}
            style={{
              position: "absolute", right: 0,
              background: "none", border: "1px solid #ccc", borderRadius: "6px",
              width: "36px", height: "36px", cursor: "pointer", color: "#888",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="#888" strokeWidth="1.5"/>
              <path d="M1 7h14" stroke="#888" strokeWidth="1.5"/>
              <path d="M5 1v4M11 1v4" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Weekly Progress card */}
        <button
          onClick={() => setShowStats(true)}
          style={{
            width: "100%",
            marginBottom: "16px",
            background: "#ffffff",
            border: "none",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            cursor: "pointer",
            textAlign: "left",
            boxSizing: "border-box",
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a1a1a" }}>Weekly Progress</span>
            <span style={{ fontSize: "0.78rem", color: "#bbb" }}>→</span>
          </div>

          <div style={{ display: "flex", gap: "20px", marginBottom: "16px", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>
                {currentStreak}
              </p>
              <p style={{ fontSize: "0.68rem", color: "#aaa", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                day streak
              </p>
            </div>
            <div style={{ width: "1px", background: "#f0f0f0", flexShrink: 0 }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#bbb", lineHeight: 1 }}>
                {longestStreak}
              </p>
              <p style={{ fontSize: "0.68rem", color: "#aaa", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                best
              </p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
            {(weeklyDots || []).map((dot, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                <div style={{
                  width: "100%",
                  aspectRatio: "1",
                  maxWidth: "32px",
                  borderRadius: "50%",
                  background: dot.active ? "#1a1a1a" : "#eeeeec",
                }} />
                <span style={{
                  fontSize: "0.62rem",
                  color: dot.active ? "#1a1a1a" : "#ccc",
                  fontWeight: dot.active ? 600 : 400,
                  lineHeight: 1,
                }}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            ))}
          </div>
        </button>

        {/* Sections */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}>
          {["Morning", "Afternoon", "Night"].map(section => (
            <SectionBlock
              key={section}
              title={section}
              tasks={tasks[section]}
              onToggle={(id) => onToggle(section, id)}
              onTitleTap={() => onSectionTap(section)}
              viewedDate={viewedDate}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          width: "100%",
          marginTop: "32px",
          paddingTop: "20px",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#444" }}>
            {completedCount} / {totalCount} complete
          </p>

          <div style={{
            width: "100%",
            height: "6px",
            background: "#e0e0e0",
            borderRadius: "999px",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${percentage}%`,
              background: percentage === 100 ? "#4caf50" : "#1a1a1a",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }} />
          </div>

          <button
            onClick={onResetDay}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              background: "none",
              fontSize: "0.9rem",
              color: "#555",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            Reset Day
          </button>
        </div>
      </div>
    </div>
  );
}
