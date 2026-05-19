import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TaskItem
//
// Motion philosophy:
//   - Checkbox: fills and border transitions on 200ms — fast enough to feel
//     instant, slow enough to feel physical
//   - Checkmark SVG: path draws in via strokeDashoffset — the mark "writes"
//     itself rather than popping. 220ms, starts 40ms after fill begins
//   - Task text: color and opacity fade over 250ms, slight leftward shift on
//     completion (text retreats as it's done)
//   - Uncomplete: reverses cleanly — no asymmetric timing
//   - No scale, no bounce, no spring — calm and deliberate
// ─────────────────────────────────────────────────────────────────────────────

// Checkmark path length — precomputed for the SVG path "M1 4L4.5 7.5L11 1"
// Measured: ~14.2px. We hardcode a value slightly over to ensure full draw.
const CHECKMARK_PATH_LENGTH = 15;

export default function TaskItem({ task, onToggle, onEdit, viewedDate }) {
  const isCompleted = task.completedDates.includes(viewedDate);

  // Track previous completion state so we can animate the transition,
  // not just the static completed/incomplete state
  const [animating, setAnimating] = useState(false);
  const [drawProgress, setDrawProgress] = useState(isCompleted ? 1 : 0);
  const prevCompleted = useRef(isCompleted);
  const drawTimer = useRef(null);
  const animTimer = useRef(null);

  useEffect(() => {
    const wasCompleted = prevCompleted.current;
    prevCompleted.current = isCompleted;

    // Clear any in-flight timers
    clearTimeout(drawTimer.current);
    clearTimeout(animTimer.current);

    if (isCompleted && !wasCompleted) {
      // Completing: trigger draw animation
      setAnimating(true);
      setDrawProgress(0);
      // Slight delay so checkbox fill starts first, then checkmark draws in
      drawTimer.current = setTimeout(() => setDrawProgress(1), 40);
      animTimer.current = setTimeout(() => setAnimating(false), 400);
    } else if (!isCompleted && wasCompleted) {
      // Uncompleting: reverse — erase mark first, then unfill
      setDrawProgress(0);
      animTimer.current = setTimeout(() => setAnimating(false), 250);
    } else {
      // Initial mount — no animation, just set correct state
      setDrawProgress(isCompleted ? 1 : 0);
    }

    return () => {
      clearTimeout(drawTimer.current);
      clearTimeout(animTimer.current);
    };
  }, [isCompleted]);

  // strokeDashoffset: 0 = fully drawn, CHECKMARK_PATH_LENGTH = invisible
  const checkmarkOffset = CHECKMARK_PATH_LENGTH * (1 - drawProgress);

  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: "14px",
      padding: "6px 0",
    }}>

      {/* ── Checkbox ── */}
      <div
        onClick={e => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "6px",
          border: isCompleted
            ? "2px solid var(--text-primary)"
            : "2px solid var(--border)",
          background: isCompleted ? "var(--text-primary)" : "transparent",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          // Border and fill transition at different speeds:
          // background fills slightly faster (200ms) — the box commits first
          // border follows at 220ms so it doesn't look disconnected
          transition: "background 0.2s cubic-bezier(0.4,0,0.2,1), border-color 0.22s cubic-bezier(0.4,0,0.2,1)",
          // Subtle scale down on press — handled via CSS active state in index.css
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
        }}
      >
        {/* Checkmark — always rendered when completed or animating out */}
        {(isCompleted || animating) && (
          <svg
            width="12"
            height="9"
            viewBox="0 0 12 9"
            fill="none"
            style={{ overflow: "visible" }}
          >
            <path
              d="M1 4L4.5 7.5L11 1"
              stroke="var(--bg)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={CHECKMARK_PATH_LENGTH}
              strokeDashoffset={checkmarkOffset}
              style={{
                transition: isCompleted
                  ? "stroke-dashoffset 0.22s cubic-bezier(0.4,0,0.2,1)"
                  : "stroke-dashoffset 0.15s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </svg>
        )}
      </div>

      {/* ── Task label ── */}
      <button
        onClick={() => onEdit && onEdit(task)}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          fontSize: "0.95rem",
          lineHeight: 1.4,
          fontFamily: "inherit",
          // Color and opacity fade together — opacity creates the "retreating"
          // feel without moving the element
          color: isCompleted ? "var(--text-faint)" : "var(--text-primary)",
          opacity: isCompleted ? 0.55 : 1,
          textDecoration: isCompleted ? "line-through" : "none",
          textDecorationColor: "var(--text-faint)",
          // Slightly longer than checkbox so text fades after box commits
          transition: [
            "color 0.25s cubic-bezier(0.4,0,0.2,1)",
            "opacity 0.25s cubic-bezier(0.4,0,0.2,1)",
            "text-decoration-color 0.25s ease",
          ].join(", "),
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {task.name}
      </button>
    </div>
  );
}
