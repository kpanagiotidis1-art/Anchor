import TaskItem from "./TaskItem";

export default function SectionBlock({ title, tasks, onToggle, onTitleTap, viewedDate }) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "14px",
      }}>
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "#333" }}>
          {title}
        </span>
        <button
          onClick={onTitleTap}
          style={{
            background: "none",
            border: "1px solid #ddd",
            borderRadius: "8px",
            width: "32px",
            height: "32px",
            fontSize: "1.1rem",
            cursor: "pointer",
            color: "#888",
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

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {tasks.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#ccc" }}>
            No tasks yet — tap + to add one.
          </p>
        ) : (
          tasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={onToggle} viewedDate={viewedDate} />
          ))
        )}
      </div>
    </div>
  );
}