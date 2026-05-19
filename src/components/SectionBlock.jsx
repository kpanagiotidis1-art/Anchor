import { useState, useEffect, useRef } from "react";
import TaskItem from "./TaskItem";

// ─────────────────────────────────────────────────────────────────────────────
// SectionBlock
//
// isPrimary (Morning section): slightly stronger title weight and slightly
// more presence. Afternoon/Night are supporting sections.
//
// Section-complete state: header title shifts to green, quiet "Done" pill
// appears. The card border picks up a faint green tint. Deliberate — each
// section completing independently should feel earned.
//
// Motion:
//   - Card border-color transitions over 0.4s
//   - Title color transitions over 0.4s
//   - "Done" label fades in over 0.3s after the last task completes
// ─────────────────────────────────────────────────────────────────────────────

export default function SectionBlock({ title, tasks, onToggle, onTitleTap, onEdit, viewedDate, emptyLabel, isPrimary }) {
  const completedCount = tasks.filter(t => t.completedDates?.includes(viewedDate)).length;
  const totalCount = tasks.length;
  const isSectionDone = totalCount > 0 && completedCount === totalCount;

  const [showDoneLabel, setShowDoneLabel] = useState(isSectionDone);
  const doneTimer = useRef(null);
  const prevDone = useRef(isSectionDone);

  useEffect(() => {
    clearTimeout(doneTimer.current);
    if (isSectionDone && !prevDone.current) {
      doneTimer.current = setTimeout(() => setShowDoneLabel(true), 180);
    } else if (!isSectionDone) {
      setShowDoneLabel(false);
    } else {
      setShowDoneLabel(isSectionDone);
    }
    prevDone.current = isSectionDone;
    return () => clearTimeout(doneTimer.current);
  }, [isSectionDone]);

  return (
    <div style={{
      background: "var(--bg-surface)",
      borderRadius: "var(--radius-md)",
      padding: isPrimary ? "var(--space-5) var(--space-5)" : "var(--space-4) var(--space-5)",
      border: isSectionDone
        ? "1px solid var(--accent-glow)"
        : "1px solid transparent",
      boxShadow: "var(--shadow-sm)",
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
        marginBottom: "var(--space-4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: isPrimary ? "var(--text-body)" : "var(--text-caption)",
            fontWeight: isPrimary ? 700 : 600,
            color: isSectionDone
              ? "var(--accent-text)"
              : isPrimary ? "var(--text-primary)" : "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: isPrimary ? "0.06em" : "0.08em",
            transition: "color 0.4s ease",
          }}>
            {title}
          </span>

          {/* Done pill */}
          <span style={{
            fontSize: "var(--text-micro)",
            fontWeight: 600,
            color: "var(--accent-text)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: showDoneLabel ? 1 : 0,
            transition: "opacity 0.3s ease",
            display: "inline-block",
            minWidth: showDoneLabel ? "auto" : "0",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}>
            Done
          </span>
        </div>

        {/* Progress fraction — shown when partially done */}
        {totalCount > 0 && !isSectionDone && completedCount > 0 && (
          <span style={{
            fontSize: "var(--text-micro)",
            color: "var(--text-faint)",
            marginRight: "var(--space-2)",
          }}>
            {completedCount}/{totalCount}
          </span>
        )}

        <button
          onClick={onTitleTap}
          style={{
            background: "none",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-xs)",
            width: "28px",
            height: "28px",
            fontSize: "1rem",
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
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {tasks.length === 0 ? (
          <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)" }}>
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