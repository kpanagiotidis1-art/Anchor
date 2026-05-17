import { useState, useRef, useEffect } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateLabel(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ── Inline edit form for an existing task ──
function EditTaskForm({ task, onSave, onCancel, viewedDate }) {
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
    if (name.trim() === "") { setError("Task name can't be empty."); return; }
    if (frequency === "weekly" && selectedDays.length === 0) { setError("Please select at least one day."); return; }
    const updates = {
      name: name.trim(),
      frequency,
      days: frequency === "weekly" ? selectedDays : undefined,
      date: frequency === "one-time" ? (task.date || viewedDate) : undefined,
    };
    onSave(updates);
  }

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "0.9rem",
    outline: "none",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    boxSizing: "border-box",
    marginBottom: "10px",
    fontFamily: "inherit",
  };

  return (
    <div style={{ background: "var(--bg-subtle)", borderRadius: "10px", padding: "14px", marginTop: "6px" }}>
      <input
        type="text" value={name}
        onChange={e => { setName(e.target.value); setError(""); }}
        style={inputStyle} autoFocus
      />

      <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Frequency</p>
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {["daily", "weekly", "one-time"].map(option => (
          <button key={option} onClick={() => { setFrequency(option); setError(""); }} style={{
            padding: "5px 10px", borderRadius: "20px", border: "1px solid",
            borderColor: frequency === option ? "var(--text-primary)" : "var(--border)",
            background: frequency === option ? "var(--text-primary)" : "none",
            color: frequency === option ? "var(--bg)" : "var(--text-secondary)",
            fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
          }}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      {frequency === "weekly" && (
        <div style={{ marginBottom: "10px" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Repeat on</p>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {DAY_LABELS.map((label, dow) => (
              <button key={dow} onClick={() => toggleDay(dow)} style={{
                padding: "4px 8px", borderRadius: "20px", border: "1px solid",
                borderColor: selectedDays.includes(dow) ? "var(--text-primary)" : "var(--border)",
                background: selectedDays.includes(dow) ? "var(--text-primary)" : "none",
                color: selectedDays.includes(dow) ? "var(--bg)" : "var(--text-secondary)",
                fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit",
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {frequency === "one-time" && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "10px" }}>
          Appears on <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatDateLabel(task.date || viewedDate)}</span>
        </p>
      )}

      {error && <p style={{ color: "#e05252", fontSize: "0.78rem", marginBottom: "8px" }}>{error}</p>}

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleSave} style={{
          flex: 1, padding: "8px", background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
        }}>Save</button>
        <button onClick={onCancel} style={{
          flex: 1, padding: "8px", background: "none", color: "var(--text-secondary)",
          border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
      </div>
    </div>
  );
}

export default function AddTaskScreen({ section, tasks, visibleTasks, onSave, onBack, onDelete, onUpdate, viewedDate }) {
  const [taskName, setTaskName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [selectedDays, setSelectedDays] = useState([]);
  const [error, setError] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function toggleDay(dow) {
    setSelectedDays(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]);
  }

  function handleSave() {
    if (taskName.trim() === "") { setError("Task name can't be empty."); return; }
    if (frequency === "weekly" && selectedDays.length === 0) { setError("Please select at least one day."); return; }
    onSave(section, taskName.trim(), frequency, selectedDays, viewedDate);
    setTaskName(""); setFrequency("daily"); setSelectedDays([]); setError("");
  }

  function handleUpdate(taskId, updates) {
    onUpdate(section, taskId, updates);
    setEditingTaskId(null);
  }

  const displayTasks = visibleTasks ?? tasks;

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "0.95rem",
    outline: "none",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column" }}>

        <button onClick={onBack} style={{
          background: "none", border: "none", fontSize: "0.9rem",
          color: "var(--text-secondary)", cursor: "pointer", padding: 0,
          textAlign: "left", marginBottom: "24px", fontFamily: "inherit",
        }}>← Back</button>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>
          Add to {section}
        </h2>

        <input
          ref={inputRef} type="text" placeholder="Task name..."
          value={taskName}
          onChange={e => { setTaskName(e.target.value); if (error) setError(""); }}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          style={inputStyle}
        />

        {error && <p style={{ color: "#e05252", fontSize: "0.85rem", marginTop: "6px" }}>{error}</p>}

        <div style={{ marginTop: "20px", marginBottom: "8px" }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>Frequency</p>
          <div style={{ display: "flex", gap: "8px" }}>
            {["daily", "weekly", "one-time"].map(option => (
              <button key={option} onClick={() => { setFrequency(option); setError(""); }} style={{
                padding: "6px 14px", borderRadius: "20px", border: "1px solid",
                borderColor: frequency === option ? "var(--text-primary)" : "var(--border)",
                background: frequency === option ? "var(--text-primary)" : "none",
                color: frequency === option ? "var(--bg)" : "var(--text-secondary)",
                fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
              }}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {frequency === "weekly" && (
          <div style={{ marginTop: "12px", marginBottom: "8px" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>Repeat on</p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {DAY_LABELS.map((label, dow) => (
                <button key={dow} onClick={() => toggleDay(dow)} style={{
                  padding: "6px 10px", borderRadius: "20px", border: "1px solid",
                  borderColor: selectedDays.includes(dow) ? "var(--text-primary)" : "var(--border)",
                  background: selectedDays.includes(dow) ? "var(--text-primary)" : "none",
                  color: selectedDays.includes(dow) ? "var(--bg)" : "var(--text-secondary)",
                  fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {frequency === "one-time" && (
          <div style={{ marginTop: "12px", marginBottom: "8px" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              This task will only appear on{" "}
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatDateLabel(viewedDate)}</span>
            </p>
          </div>
        )}

        <button onClick={handleSave} style={{
          width: "100%", padding: "10px", background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "8px", fontSize: "0.95rem", cursor: "pointer",
          marginTop: "16px", marginBottom: "32px", fontFamily: "inherit",
        }}>Save Task</button>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
          <p style={{
            fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px",
          }}>{section} Tasks</p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginBottom: "12px" }}>
            Showing tasks visible on {formatDateLabel(viewedDate)}
          </p>

          {displayTasks.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-faint)" }}>No tasks for this day yet.</p>
          ) : (
            displayTasks.map(task => (
              <div key={task.id}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 0",
                  borderBottom: editingTaskId === task.id ? "none" : "1px solid var(--border-light)",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{task.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "8px" }}>
                      {task.frequency === "weekly"
                        ? (task.days || []).map(d => DAY_LABELS[d]).join(", ")
                        : task.frequency}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "8px" }}>
                    <button
                      onClick={() => setEditingTaskId(editingTaskId === task.id ? null : task.id)}
                      style={{
                        fontSize: "0.78rem",
                        color: editingTaskId === task.id ? "#1a8cff" : "var(--text-secondary)",
                        background: "none",
                        border: `1px solid ${editingTaskId === task.id ? "#1a8cff" : "var(--border)"}`,
                        borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {editingTaskId === task.id ? "Cancel" : "Edit"}
                    </button>
                    <button onClick={() => onDelete(section, task.id)} style={{
                      fontSize: "0.78rem", color: "#e05252", background: "none",
                      border: "1px solid #e05252", borderRadius: "4px",
                      padding: "3px 8px", cursor: "pointer", fontFamily: "inherit",
                    }}>Remove</button>
                  </div>
                </div>

                {editingTaskId === task.id && (
                  <EditTaskForm
                    task={task} viewedDate={viewedDate}
                    onSave={updates => handleUpdate(task.id, updates)}
                    onCancel={() => setEditingTaskId(null)}
                  />
                )}

                {editingTaskId === task.id && (
                  <div style={{ borderBottom: "1px solid var(--border-light)", marginBottom: "2px" }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
