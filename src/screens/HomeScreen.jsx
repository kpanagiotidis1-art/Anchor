import { useState } from "react";
import SectionBlock from "../components/SectionBlock";
import CalendarPicker from "../components/CalendarPicker";
import HintCard from "../components/HintCard";
import { getFocusMode, getConfig } from "./OverviewScreen";
import { getTasksFooterCopy, getRecoveryCopy } from "../lib/anchorVoice";

const DAY_LABELS     = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_FULL_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SECTIONS = ["Morning", "Afternoon", "Night"];

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ── Edit Task Sheet ────────────────────────────────────────────────────────────
function EditTaskSheet({ task, viewedDate, onSave, onDelete, onClose }) {
  const [name, setName] = useState(task.name);
  const [frequency, setFrequency] = useState(task.frequency);
  const [selectedDays, setSelectedDays] = useState(task.days || []);
  const [error, setError] = useState("");

  function toggleDay(dow) {
    setSelectedDays(prev =>
      prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]
    );
  }

  function handleSave() {
    if (!name.trim()) { setError("Task name can't be empty."); return; }
    if (frequency === "weekly" && selectedDays.length === 0) {
      setError("Please select at least one day.");
      return;
    }
    onSave(task.section, task.id, {
      name: name.trim(),
      frequency,
      days: frequency === "weekly" ? selectedDays : undefined,
      date: frequency === "one-time" ? (task.date || viewedDate) : undefined,
    });
    onClose();
  }

  const inputStyle = {
    width: "100%",
    padding: "var(--space-3) var(--space-4)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-ui)",
    outline: "none",
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 300,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative",
        background: "var(--bg)",
        borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        padding: "var(--space-6) var(--space-5) var(--space-10)",
        zIndex: 301,
        maxHeight: "85vh",
        overflowY: "auto",
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "var(--radius-pill)", margin: "0 auto var(--space-5)" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
          <p style={{ fontSize: "var(--text-sub)", fontWeight: 700, color: "var(--text-primary)" }}>Edit Task</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", padding: "4px", lineHeight: 1 }}>×</button>
        </div>

        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          style={{ ...inputStyle, marginBottom: "var(--space-4)" }}
        />

        <p style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Frequency</p>
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          {["daily", "weekly", "one-time"].map(opt => (
            <button
              key={opt}
              onClick={() => { setFrequency(opt); setError(""); }}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid",
                borderColor: frequency === opt ? "var(--text-primary)" : "var(--border)",
                background: frequency === opt ? "var(--text-primary)" : "none",
                color: frequency === opt ? "var(--bg)" : "var(--text-secondary)",
                fontSize: "var(--text-caption)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>

        {frequency === "weekly" && (
          <div style={{ marginBottom: "var(--space-4)" }}>
            <p style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Repeat on</p>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {DAY_FULL_LABELS.map((label, dow) => (
                <button
                  key={dow}
                  onClick={() => toggleDay(dow)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "var(--radius-pill)",
                    border: "1px solid",
                    borderColor: selectedDays.includes(dow) ? "var(--text-primary)" : "var(--border)",
                    background: selectedDays.includes(dow) ? "var(--text-primary)" : "none",
                    color: selectedDays.includes(dow) ? "var(--bg)" : "var(--text-secondary)",
                    fontSize: "var(--text-caption)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {frequency === "one-time" && (
          <p style={{ fontSize: "var(--text-body)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
            Appears on{" "}
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              {formatDate(task.date || viewedDate)}
            </span>
          </p>
        )}

        {error && <p style={{ color: "#e05252", fontSize: "var(--text-body)", marginBottom: "var(--space-3)" }}>{error}</p>}

        <button onClick={handleSave} style={{
          width: "100%", padding: "14px",
          background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "var(--radius-sm)",
          fontSize: "var(--text-ui)", fontWeight: 600,
          cursor: "pointer", marginBottom: "var(--space-3)",
          fontFamily: "inherit",
        }}>
          Save
        </button>

        <button onClick={() => { onDelete(task.section, task.id); onClose(); }} style={{
          width: "100%", padding: "12px",
          background: "none", color: "#e05252",
          border: "1px solid #e05252", borderRadius: "var(--radius-sm)",
          fontSize: "var(--text-body)", cursor: "pointer",
          fontFamily: "inherit",
        }}>
          Delete Task
        </button>
      </div>
    </div>
  );
}

// ── Stats modal ────────────────────────────────────────────────────────────────
function StatsModal({ currentStreak, longestStreak, weeklyDots, weekStats, onClose, onOpenReview }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative",
        background: "var(--bg)",
        borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        padding: "var(--space-6) var(--space-6) var(--space-10)",
        zIndex: 201,
        maxHeight: "85vh",
        overflowY: "auto",
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "var(--radius-pill)", margin: "0 auto var(--space-6)" }} />

        <p style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-5)" }}>This Week</p>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-7)", gap: "var(--space-2)" }}>
          {weeklyDots.map((dot, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: dot.active ? "var(--text-primary)" : "var(--border)" }} />
              <span style={{ fontSize: "var(--text-label)", color: dot.active ? "var(--text-primary)" : "var(--text-faint)", fontWeight: dot.active ? 600 : 400 }}>
                {DAY_LABELS[i]}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          {[
            { label: "Current Streak", value: `${currentStreak} day${currentStreak !== 1 ? "s" : ""}` },
            { label: "Best Streak",    value: `${longestStreak} day${longestStreak !== 1 ? "s" : ""}` },
            { label: "Active Days",    value: `${weekStats.activeDays} / 7` },
            { label: "Workouts",       value: weekStats.totalWorkouts },
            { label: "Task Completion", value: weekStats.taskPct !== null ? `${weekStats.taskPct}%` : "—" },
          ].map((stat, i) => (
            <div key={i} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "var(--space-4)", boxShadow: "var(--shadow-sm)" }}>
              <p style={{ fontSize: "var(--text-title)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontSize: "var(--text-label)", color: "var(--text-muted)", marginTop: "var(--space-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {weekStats.taskPct !== null && (
          <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-sm)", padding: "var(--space-4)", marginBottom: "var(--space-5)" }}>
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {weekStats.taskPct >= 80
                ? "Strong week. Consistency is showing."
                : weekStats.taskPct >= 50
                ? "Solid progress. A few more days and this becomes a strong week."
                : "Every day is a reset. Tomorrow is fresh."}
            </p>
          </div>
        )}

        <button onClick={() => { onClose(); onOpenReview(); }} style={{
          width: "100%", padding: "14px",
          background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "var(--radius-sm)",
          fontSize: "var(--text-ui)", fontWeight: 600, cursor: "pointer",
        }}>
          Weekly Review
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function HomeScreen({
  tasks, onToggle, onSectionTap, onResetDay,
  viewedDate, onNavigateDay,
  onEditTask,
  onDeleteTask,
  currentStreak,
  daysSinceActive,
}) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const isToday = viewedDate === todayString();
  const allTasks = Object.values(tasks).flat();
  const completedCount = allTasks.filter(t => t.completedDates.includes(viewedDate)).length;
  const totalCount = allTasks.length;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  const config = getConfig(getFocusMode());
  const footerCopy = isToday ? getTasksFooterCopy(completedCount, totalCount) : null;

  const SECTION_EMPTY = {
    Morning: "Start with one thing that sets the tone.",
    Afternoon: "Add something that keeps the day moving.",
    Night: "End the day with something that helps you reset.",
  };
  const recoveryCopy = isToday && currentStreak === 0 && daysSinceActive > 1
    ? getRecoveryCopy(daysSinceActive)
    : null;

  return (
    <div style={{
      width: "100%",
      minHeight: "100svh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "var(--space-9) 0 var(--scroll-pb)",
      boxSizing: "border-box",
    }}>
      {showCalendar && (
        <CalendarPicker
          viewedDate={viewedDate}
          onSelectDate={date => { onNavigateDay(0, date); }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {editingTask && (
        <EditTaskSheet
          task={editingTask}
          viewedDate={viewedDate}
          onSave={(section, taskId, updates) => {
            onEditTask(section, taskId, updates);
            setEditingTask(null);
          }}
          onDelete={(section, taskId) => {
            onDeleteTask(section, taskId);
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px", padding: "0 var(--space-5)", boxSizing: "border-box" }}>

        {/* ── Wordmark — ambient identity, not dominant title ── */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-7)" }}>
          <p style={{
            fontSize: "var(--text-micro)",
            fontWeight: 700,
            color: "var(--text-faint)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}>
            Anchor
          </p>
          <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "4px", letterSpacing: "0.04em" }}>
            Structure for the day.
          </p>
        </div>

        {/* ── Recovery message ── */}
        {recoveryCopy && (
          <div style={{
            background: "var(--bg-inset)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
          }}>
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {recoveryCopy}
            </p>
          </div>
        )}

        {/* ── Date navigation ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-6)",
          position: "relative",
        }}>
          <button onClick={() => onNavigateDay(-1)} style={{
            background: "none",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-xs)",
            width: "32px", height: "32px",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: "1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, flexShrink: 0,
          }}>‹</button>

          <div style={{ textAlign: "center", width: "160px" }}>
            <p style={{ fontSize: "var(--text-body)", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
              {formatDate(viewedDate)}
            </p>
            {isToday && (
              <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "2px" }}>Today</p>
            )}
          </div>

          <button onClick={() => onNavigateDay(1)} style={{
            background: "none",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-xs)",
            width: "32px", height: "32px",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: "1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, flexShrink: 0,
          }}>›</button>

          {/* Calendar — absolute so it doesn't break centering */}
          <button onClick={() => setShowCalendar(true)} style={{
            position: "absolute", right: 0,
            background: "none",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-xs)",
            width: "32px", height: "32px",
            cursor: "pointer",
            color: "var(--text-faint)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Task sections ── */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <HintCard
            hintId="tasks_first"
            text="Build your daily structure here."
            sub="Add tasks to Morning, Afternoon, or Night — they repeat on your schedule."
          />
          {SECTIONS.map(section => (
            <SectionBlock
              key={section}
              title={section}
              tasks={tasks[section]}
              onToggle={(id) => onToggle(section, id)}
              onTitleTap={() => onSectionTap(section)}
              onEdit={task => setEditingTask(task)}
              viewedDate={viewedDate}
              emptyLabel={SECTION_EMPTY[section] || config.sectionEmptyLabel}
              isPrimary={section === "Morning"}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          width: "100%",
          marginTop: "var(--space-7)",
          paddingTop: "var(--space-5)",
          borderTop: "1px solid var(--border-light)",
        }}>
          {/* Count + copy */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-2)" }}>
            <p style={{
              fontSize: "var(--text-caption)",
              fontWeight: 600,
              color: isAllDone ? "var(--accent-text)" : "var(--text-secondary)",
              transition: "color 0.4s ease",
            }}>
              {completedCount} / {totalCount}
            </p>
            {footerCopy && (
              <p style={{
                fontSize: "var(--text-caption)",
                color: isAllDone ? "var(--accent-text)" : "var(--text-muted)",
                fontWeight: isAllDone ? 600 : 400,
                transition: "color 0.4s ease",
              }}>
                {footerCopy}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ width: "100%", height: "5px", background: "var(--border)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <div className="anchor-progress-bar" style={{
              height: "100%",
              width: `${percentage}%`,
              background: isAllDone ? "var(--accent)" : "var(--text-primary)",
              borderRadius: "var(--radius-pill)",
            }} />
          </div>
        </div>

      </div>
    </div>
  );
}