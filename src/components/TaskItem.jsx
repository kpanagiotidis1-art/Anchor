export default function TaskItem({ task, onToggle, viewedDate }) {
  const isCompleted = task.completedDates.includes(viewedDate);

  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: "12px",
      paddingLeft: "8px",
    }}>
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={() => onToggle(task.id)}
        style={{
          width: "16px",
          height: "16px",
          flexShrink: 0,
          cursor: "pointer",
          accentColor: "#1a1a1a",
        }}
      />
      <span style={{
        fontSize: "0.95rem",
        color: isCompleted ? "#aaa" : "#1a1a1a",
        textDecoration: isCompleted ? "line-through" : "none",
        lineHeight: 1.4,
      }}>
        {task.name}
      </span>
    </div>
  );
}