export default function TaskItem({ task, onToggle, onEdit, viewedDate }) {
  const isCompleted = task.completedDates.includes(viewedDate);

  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: "14px",
      padding: "6px 0",
    }}>
      {/* Checkbox — toggles completion only */}
      <div
        onClick={e => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "6px",
          border: isCompleted ? "2px solid var(--text-primary)" : "2px solid var(--border)",
          background: isCompleted ? "var(--text-primary)" : "transparent",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
          cursor: "pointer",
        }}
      >
        {isCompleted && (
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path d="M1 4L4.5 7.5L11 1" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Task name — tapping opens edit */}
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
          color: isCompleted ? "var(--text-faint)" : "var(--text-primary)",
          textDecoration: isCompleted ? "line-through" : "none",
          lineHeight: 1.4,
          transition: "all 0.15s ease",
          fontFamily: "inherit",
        }}
      >
        {task.name}
      </button>
    </div>
  );
}
