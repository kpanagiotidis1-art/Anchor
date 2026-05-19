import { useState, useEffect, useRef } from "react";
import TaskItem from "./TaskItem";

// ─────────────────────────────────────────────────────────────────────────────
// SectionBlock
//
// Added: section-complete state
//   When all tasks in a section are done, the section header title shifts to
//   green and a quiet "Done" pill appears beside it. The card border also
//   picks up a faint green tint.
//
//   This is deliberate — sections complete independently, and each completion
//   should feel earned without waiting for the whole day to be done.
//
// Motion:
//   - Card border-color transitions over 0.4s
//   - Title color transitions over 0.4s
//   - "Done" label fades in over 0.3s after the last task completes
//   - No entrance animation for individual tasks (they're loaded from DB,
//     not created live in this component)
// ─────────────────────────────────────────────────────────────────────────────

export default function SectionBlock({ title, tasks, onToggle, onTitleTap, onEdit, viewedDate, emptyLabel }) {
  const completedCount = tasks.filter(t => t.completedDates?.includes(viewedDate)).length;
  const totalCount = tasks.length;
  const isSectionDone = totalCount > 0 && completedCount === totalCount;

  // Delay the "done" label slightly so it doesn't flash during rapid toggles
  const [showDoneLabel, setShowDoneLabel] = useState(isSectionDone);
  const doneTimer = useRef(null);
  const prevDone = useRef(isSectionDone);

  useEffect(() => {
    clearTimeout(doneTimer.current);
    if (isSectionDone && !prevDone.current) {
      // Became done — short delay, then show label
      doneTimer.current = setTimeout(() => setShowDoneLabel(true), 180);
    } else if (!isSectionDone) {
      // Un-done immediately — no delay
      setShowDoneLabel(false);
    } else {
      setShowDoneLabel(isSectionDone);
    }
    prevDone.current = isSectionDone;
    return () => clearTimeout(doneTimer.current);
  }, [isSectionDone]);

  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "12px",
      padding: "16px 20px",
      // Border tints green when section is complete — 1px, subtle
      border: isSectionDone
        ? "1px solid rgba(76, 175, 80, 0.28)"
        : "1px solid transparent",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      width: "100%",
      boxSizing: "border-box",
      transition: "border-color 0.4s ease",
    }}>
      {/* ── Section header ── */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: isSectionDone ? "#4caf50" : "var(--text-primary)",
            transition: "color 0.4s ease",
          }}>
            {title}
          </span>

          {/* Done pill — fades in when section completes */}
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: "#4caf50",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            opacity: showDoneLabel ? 1 : 0,
            transition: "opacity 0.3s ease",
            // Reserve space even when hidden so layout doesn't shift
            display: "inline-block",
            minWidth: showDoneLabel ? "auto" : "0",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}>
            Done
          </span>
        </div>

        <button
          onClick={onTitleTap}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            width: "32px",
            height: "32px",
            fontSize: "1.1rem",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 0,
          }}
        >
          +
        </button>
      </div>

      {/* ── Task list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {tasks.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-faint)" }}>
            {emptyLabel || "Tap + to add a task"}
          </p>
        ) : (
          tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
              viewedDate={viewedDate}
            />
          ))
        )}
      </div>
    </div>
  );
}
