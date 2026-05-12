export default function TaskItem({ task, onToggle, viewedDate }) {
  const isCompleted = task.completedDates.includes(viewedDate);

  return (
    <div
      onClick={() => onToggle(task.id)}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "14px",
        padding: "6px 0",
        cursor: "pointer",
      }}
    >
      {/* Custom checkbox for larger tap area */}
      <div style={{
        width: "22px",
        height: "22px",
        borderRadius: "6px",
        border: isCompleted ? "2px solid #1a1a1a" : "2px solid #ddd",
        background: isCompleted ? "#1a1a1a" : "transparent",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s ease",
      }}>
        {isCompleted && (
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{
        fontSize: "0.95rem",
        color: isCompleted ? "#bbb" : "#1a1a1a",
        textDecoration: isCompleted ? "line-through" : "none",
        lineHeight: 1.4,
        transition: "all 0.15s ease",
      }}>
        {task.name}
      </span>
    </div>
  );
}