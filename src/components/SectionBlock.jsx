import TaskItem from "./TaskItem";

export default function SectionBlock({ title, tasks, onToggle, onTitleTap, viewedDate }) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      width: "100%",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
      }}>
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "#333" }}>
          {title}
        </span>
        <button
          onClick={onTitleTap}
          style={{
            background: "none",
            border: "1px solid #ccc",
            borderRadius: "6px",
            width: "24px",
            height: "24px",
            fontSize: "1rem",
            cursor: "pointer",
            color: "#555",
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

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            viewedDate={viewedDate}
          />
        ))}
      </div>
    </div>
  );
}