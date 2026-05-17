import TaskItem from "./TaskItem";

export default function SectionBlock({ title, tasks, onToggle, onTitleTap, onEdit, viewedDate }) {
  return (
    <div style={{
      background: "var(--bg-card)",
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
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
          {title}
        </span>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {tasks.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-faint)" }}>
            No tasks yet — tap + to add one.
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
