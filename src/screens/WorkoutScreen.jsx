import { useState, useEffect, useRef } from "react";

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ── Rest Timer ──
function RestTimer({ onDismiss }) {
  const DURATIONS = [60, 90, 120];
  const [selected, setSelected] = useState(90);
  const [timeLeft, setTimeLeft] = useState(null); // null = not started
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function start(duration) {
    clearInterval(intervalRef.current);
    setSelected(duration);
    setTimeLeft(duration);
    setRunning(true);
  }

  function reset() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setTimeLeft(null);
  }

  const isFinished = timeLeft === 0;
  const isActive = timeLeft !== null;
  const progress = isActive ? timeLeft / selected : 1;

  const minutes = isActive ? Math.floor(timeLeft / 60) : null;
  const seconds = isActive ? timeLeft % 60 : null;
  const timeDisplay = isActive
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : null;

  // Circle ring math
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;

  return (
    <div style={{
      background: "#f9f9f9",
      borderRadius: "12px",
      padding: "14px 16px",
      marginTop: "10px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}>
      {/* Ring + time */}
      <div style={{ position: "relative", width: "68px", height: "68px", flexShrink: 0 }}>
        <svg width="68" height="68" style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx="34" cy="34" r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="4"
          />
          {/* Progress */}
          <circle
            cx="34" cy="34" r={radius}
            fill="none"
            stroke={isFinished ? "#4caf50" : "#1a1a1a"}
            strokeWidth="4"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s linear, stroke 0.3s" }}
          />
        </svg>
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {isFinished ? (
            <span style={{ fontSize: "1.2rem" }}>✓</span>
          ) : isActive ? (
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1a1a" }}>
              {timeDisplay}
            </span>
          ) : (
            <span style={{ fontSize: "0.72rem", color: "#aaa", textAlign: "center", lineHeight: 1.2 }}>
              Rest
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ flex: 1 }}>
        {isFinished ? (
          <div>
            <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#4caf50", marginBottom: "8px" }}>
              Rest complete!
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => start(selected)}
                style={{
                  flex: 1, padding: "7px", borderRadius: "7px",
                  border: "1px solid #ccc", background: "none",
                  fontSize: "0.8rem", color: "#555", cursor: "pointer",
                }}
              >Again</button>
              <button
                onClick={onDismiss}
                style={{
                  flex: 1, padding: "7px", borderRadius: "7px",
                  border: "none", background: "#1a1a1a",
                  fontSize: "0.8rem", color: "#fff", cursor: "pointer",
                }}
              >Done</button>
            </div>
          </div>
        ) : isActive ? (
          <div>
            <p style={{ fontSize: "0.78rem", color: "#aaa", marginBottom: "8px" }}>
              Resting · {selected}s
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={reset}
                style={{
                  flex: 1, padding: "7px", borderRadius: "7px",
                  border: "1px solid #ccc", background: "none",
                  fontSize: "0.8rem", color: "#555", cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={onDismiss}
                style={{
                  flex: 1, padding: "7px", borderRadius: "7px",
                  border: "none", background: "#1a1a1a",
                  fontSize: "0.8rem", color: "#fff", cursor: "pointer",
                }}
              >Skip</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "0.78rem", color: "#aaa", marginBottom: "8px" }}>
              Start rest timer
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => start(d)}
                  style={{
                    flex: 1, padding: "7px", borderRadius: "7px",
                    border: "1px solid #ccc", background: "none",
                    fontSize: "0.8rem", color: "#555", cursor: "pointer",
                  }}
                >{d}s</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dismiss X — only when idle */}
      {!isActive && (
        <button
          onClick={onDismiss}
          style={{
            background: "none", border: "none", color: "#ccc",
            fontSize: "1.2rem", cursor: "pointer", padding: "4px",
            alignSelf: "flex-start", flexShrink: 0,
          }}
        >×</button>
      )}
    </div>
  );
}

// ── Exercise History Modal ──
function ExerciseHistoryModal({ name, history, onClose }) {
  const sessions = history || [];

  // Calculate PR — best set by weight × reps score
  let pr = null;
  sessions.forEach(session => {
    (session.sets || []).forEach(set => {
      if (!pr) { pr = set; return; }
      const setScore = (set.weight || 0) * set.reps;
      const prScore = (pr.weight || 0) * pr.reps;
      if (setScore > prScore) pr = set;
    });
  });

  const lastSession = sessions[0];

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      />
      <div style={{
        position: "relative",
        background: "#f5f5f3",
        borderRadius: "20px 20px 0 0",
        padding: "24px 20px 48px",
        maxHeight: "82vh",
        overflowY: "auto",
        zIndex: 101,
      }}>
        <div style={{
          width: "36px", height: "4px", background: "#ddd",
          borderRadius: "99px", margin: "0 auto 20px",
        }} />
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "20px",
        }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1a1a1a" }}>
            {name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              fontSize: "1.4rem", color: "#aaa",
              cursor: "pointer", padding: "4px", lineHeight: 1,
            }}
          >×</button>
        </div>

        {sessions.length === 0 ? (
          <p style={{ fontSize: "0.9rem", color: "#bbb", textAlign: "center", padding: "20px 0" }}>
            No history yet. Complete a workout to see data here.
          </p>
        ) : (
          <>
            {pr && (
              <div style={{
                background: "#1a1a1a", borderRadius: "12px", padding: "16px 20px",
                marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <p style={{ fontSize: "0.72rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                    Personal Record
                  </p>
                  <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>
                    {pr.weight ? `${pr.weight} kg` : "Bodyweight"} × {pr.reps}
                  </p>
                </div>
                <p style={{ fontSize: "1.8rem" }}>🏆</p>
              </div>
            )}

            {lastSession && (
              <div style={{
                background: "#fff", borderRadius: "12px", padding: "16px 20px",
                marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}>
                <p style={{
                  fontSize: "0.72rem", fontWeight: 600, color: "#aaa",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px",
                }}>
                  Last Session — {formatDate(lastSession.date)}
                </p>
                {(lastSession.sets || []).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "#ccc" }}>No sets logged.</p>
                ) : (
                  <div>
                    <div style={{
                      display: "grid", gridTemplateColumns: "32px 1fr 1fr",
                      gap: "8px", padding: "2px 0 6px",
                    }}>
                      {["Set", "Weight", "Reps"].map((h, i) => (
                        <span key={i} style={{ fontSize: "0.7rem", color: "#bbb", fontWeight: 600, textTransform: "uppercase" }}>{h}</span>
                      ))}
                    </div>
                    {lastSession.sets.map((set, idx) => (
                      <div key={idx} style={{
                        display: "grid", gridTemplateColumns: "32px 1fr 1fr",
                        gap: "8px", padding: "7px 0",
                        borderBottom: idx < lastSession.sets.length - 1 ? "1px solid #f5f5f5" : "none",
                      }}>
                        <span style={{ fontSize: "0.78rem", color: "#bbb", textAlign: "center" }}>{idx + 1}</span>
                        <span style={{ fontSize: "0.9rem", color: "#555" }}>{set.weight ? `${set.weight} kg` : "BW"}</span>
                        <span style={{ fontSize: "0.9rem", color: "#333" }}>{set.reps} reps</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sessions.length > 1 && (
              <div style={{
                background: "#fff", borderRadius: "12px", padding: "16px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}>
                <p style={{
                  fontSize: "0.72rem", fontWeight: 600, color: "#aaa",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px",
                }}>History</p>
                {sessions.slice(1).map((session, sIdx) => (
                  <div key={sIdx} style={{ marginBottom: sIdx < sessions.length - 2 ? "16px" : 0 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#888", marginBottom: "6px" }}>
                      {formatDate(session.date)}
                    </p>
                    {(session.sets || []).map((set, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "12px", padding: "4px 0" }}>
                        <span style={{ fontSize: "0.78rem", color: "#bbb", width: "32px", textAlign: "center" }}>{idx + 1}</span>
                        <span style={{ fontSize: "0.85rem", color: "#555" }}>
                          {set.weight ? `${set.weight} kg` : "BW"} × {set.reps} reps
                        </span>
                      </div>
                    ))}
                    {sIdx < sessions.length - 2 && (
                      <div style={{ borderBottom: "1px solid #f5f5f5", marginTop: "12px" }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Workout Summary ──
function WorkoutSummary({ session, onDismiss }) {
  const exercises = session.exercises || [];
  const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets || []).length, 0);
  const totalVolume = exercises.reduce((acc, ex) =>
    acc + (ex.sets || []).reduce((s, set) =>
      s + (set.weight ? set.reps * set.weight : 0), 0
    ), 0
  );

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#f5f5f3",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "60px 20px 100px", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ fontSize: "2rem", marginBottom: "8px" }}>💪</p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>
            Workout Complete
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#aaa" }}>
            {session.startTime}
            {session.endTime ? ` → ${session.endTime}` : ""}
            {session.duration ? ` · ${session.duration} min` : ""}
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px", marginBottom: "28px",
        }}>
          {[
            { label: "Exercises", value: exercises.length },
            { label: "Sets", value: totalSets },
            { label: "Volume", value: totalVolume > 0 ? `${totalVolume}kg` : "—" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "#fff", borderRadius: "12px", padding: "16px 12px",
              textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1a1a1a" }}>{stat.value}</p>
              <p style={{ fontSize: "0.72rem", color: "#aaa", marginTop: "2px" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div style={{
          background: "#fff", borderRadius: "12px", padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "20px",
        }}>
          <p style={{
            fontSize: "0.75rem", fontWeight: 600, color: "#aaa",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px",
          }}>Exercises</p>
          {exercises.length === 0 ? (
            <p style={{ fontSize: "0.88rem", color: "#ccc" }}>No exercises logged.</p>
          ) : (
            exercises.map(ex => (
              <div key={ex.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid #f5f5f5",
              }}>
                <span style={{ fontSize: "0.92rem", color: "#1a1a1a", fontWeight: 500 }}>{ex.name}</span>
                <span style={{ fontSize: "0.82rem", color: "#aaa" }}>{(ex.sets || []).length} sets</span>
              </div>
            ))
          )}
        </div>

        {session.notes ? (
          <div style={{
            background: "#fff", borderRadius: "12px", padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "20px",
          }}>
            <p style={{
              fontSize: "0.75rem", fontWeight: 600, color: "#aaa",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px",
            }}>Notes</p>
            <p style={{ fontSize: "0.9rem", color: "#444", lineHeight: 1.5 }}>{session.notes}</p>
          </div>
        ) : null}

        <button
          onClick={onDismiss}
          style={{
            width: "100%", padding: "14px", background: "#1a1a1a",
            color: "#fff", border: "none", borderRadius: "10px",
            fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
          }}
        >Done</button>
      </div>
    </div>
  );
}

// ── Template Picker ──
function TemplatePicker({ anchorTemplates, userTemplates, onSelect, onSkip }) {
  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#f5f5f3",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px 100px", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <h1 style={{
          fontSize: "1.6rem", fontWeight: 700, color: "#1a1a1a",
          marginBottom: "6px", textAlign: "center",
        }}>Start Workout</h1>
        <p style={{ fontSize: "0.88rem", color: "#aaa", textAlign: "center", marginBottom: "32px" }}>
          Choose a template or start empty
        </p>

        <p style={{
          fontSize: "0.75rem", fontWeight: 600, color: "#aaa",
          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px",
        }}>Anchor Workouts</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
          {anchorTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => onSelect(template.exercises)}
              style={{
                background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px",
                padding: "14px 18px", textAlign: "left", cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
                {template.name}
              </p>
              <p style={{ fontSize: "0.78rem", color: "#aaa" }}>
                {template.exercises.join("  ·  ")}
              </p>
            </button>
          ))}
        </div>

        {userTemplates.length > 0 && (
          <>
            <p style={{
              fontSize: "0.75rem", fontWeight: 600, color: "#aaa",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px",
            }}>My Templates</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
              {userTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template.exercises)}
                  style={{
                    background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px",
                    padding: "14px 18px", textAlign: "left", cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
                    {template.name}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "#aaa" }}>
                    {template.exercises.join("  ·  ")}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onSkip}
          style={{
            width: "100%", padding: "14px", background: "#1a1a1a",
            color: "#fff", border: "none", borderRadius: "10px",
            fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
          }}
        >Start Empty</button>
      </div>
    </div>
  );
}

// ── Template Manager ──
function TemplateManager({ userTemplates, onCreateTemplate, onUpdateTemplate, onDeleteTemplate, onBack }) {
  const [view, setView] = useState("list");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState([]);
  const [newExercise, setNewExercise] = useState("");
  const [error, setError] = useState("");

  function openCreate() {
    setName(""); setExercises([]); setNewExercise(""); setError(""); setView("create");
  }

  function openEdit(template) {
    setEditingTemplate(template); setName(template.name);
    setExercises([...template.exercises]); setNewExercise(""); setError(""); setView("edit");
  }

  function addExerciseToList() {
    if (!newExercise.trim()) return;
    setExercises(prev => [...prev, newExercise.trim()]);
    setNewExercise("");
  }

  function removeExerciseFromList(idx) {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSaveCreate() {
    if (!name.trim()) { setError("Template name is required."); return; }
    if (exercises.length === 0) { setError("Add at least one exercise."); return; }
    onCreateTemplate(name.trim(), exercises);
    setView("list");
  }

  function handleSaveEdit() {
    if (!name.trim()) { setError("Template name is required."); return; }
    if (exercises.length === 0) { setError("Add at least one exercise."); return; }
    onUpdateTemplate(editingTemplate.id, name.trim(), exercises);
    setView("list");
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", border: "1px solid #ddd",
    borderRadius: "8px", fontSize: "0.95rem", outline: "none",
    background: "#fff", color: "#1a1a1a", boxSizing: "border-box",
  };

  if (view === "create" || view === "edit") {
    return (
      <div style={{
        width: "100%", minHeight: "100vh", background: "#f5f5f3",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "40px 20px 100px", boxSizing: "border-box",
      }}>
        <div style={{ width: "100%", maxWidth: "480px" }}>
          <button onClick={() => setView("list")} style={{
            background: "none", border: "none", fontSize: "0.9rem",
            color: "#555", cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "24px",
          }}>← Back</button>

          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "24px" }}>
            {view === "create" ? "New Template" : "Edit Template"}
          </h2>

          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#555", marginBottom: "6px" }}>Template Name</p>
          <input
            type="text" placeholder="e.g. Push Day" value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            style={{ ...inputStyle, marginBottom: "20px" }} autoFocus
          />

          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#555", marginBottom: "6px" }}>Exercises</p>

          {exercises.length > 0 && (
            <div style={{
              background: "#fff", borderRadius: "10px", padding: "4px 0",
              marginBottom: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              {exercises.map((ex, idx) => (
                <div key={idx} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 16px",
                  borderBottom: idx < exercises.length - 1 ? "1px solid #f5f5f5" : "none",
                }}>
                  <span style={{ fontSize: "0.92rem", color: "#1a1a1a" }}>{ex}</span>
                  <button onClick={() => removeExerciseFromList(idx)} style={{
                    background: "none", border: "none", color: "#ccc",
                    fontSize: "1.1rem", cursor: "pointer", padding: "4px",
                  }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text" placeholder="Add exercise..." value={newExercise}
              onChange={e => setNewExercise(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addExerciseToList(); }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={addExerciseToList} style={{
              padding: "12px 16px", background: "#f0f0f0", border: "none",
              borderRadius: "8px", fontSize: "1.2rem", cursor: "pointer",
              color: "#555", flexShrink: 0,
            }}>+</button>
          </div>

          {error && <p style={{ color: "#e05252", fontSize: "0.85rem", marginBottom: "12px" }}>{error}</p>}

          <button
            onClick={view === "create" ? handleSaveCreate : handleSaveEdit}
            style={{
              width: "100%", padding: "14px", background: "#1a1a1a",
              color: "#fff", border: "none", borderRadius: "10px",
              fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
            }}
          >Save Template</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#f5f5f3",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px 100px", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", fontSize: "0.9rem",
          color: "#555", cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "24px",
        }}>← Back</button>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "28px" }}>
          My Templates
        </h2>

        {userTemplates.length === 0 ? (
          <p style={{ fontSize: "0.88rem", color: "#bbb", marginBottom: "24px" }}>
            No templates yet. Create one below.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            {userTemplates.map(template => (
              <div key={template.id} style={{
                background: "#fff", borderRadius: "12px", padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a", marginBottom: "3px" }}>
                    {template.name}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "#aaa" }}>
                    {template.exercises.join("  ·  ")}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", marginLeft: "12px", flexShrink: 0 }}>
                  <button onClick={() => openEdit(template)} style={{
                    padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc",
                    background: "none", color: "#555", fontSize: "0.82rem", cursor: "pointer",
                  }}>Edit</button>
                  <button onClick={() => onDeleteTemplate(template.id)} style={{
                    padding: "6px 12px", borderRadius: "6px", border: "1px solid #e05252",
                    background: "none", color: "#e05252", fontSize: "0.82rem", cursor: "pointer",
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={openCreate} style={{
          width: "100%", padding: "14px", background: "#1a1a1a",
          color: "#fff", border: "none", borderRadius: "10px",
          fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
        }}>+ Create Template</button>
      </div>
    </div>
  );
}

// ── Set Row ──
function SetRow({ setNumber, set, sessionActive, onDelete }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "32px 1fr 1fr 36px",
      gap: "8px", alignItems: "center", padding: "8px 0",
      borderBottom: "1px solid #f5f5f5",
    }}>
      <span style={{ fontSize: "0.78rem", color: "#bbb", textAlign: "center" }}>{setNumber}</span>
      <span style={{ fontSize: "0.9rem", color: "#555" }}>
        {set.weight !== "" && set.weight != null ? `${set.weight} kg` : "BW"}
      </span>
      <span style={{ fontSize: "0.9rem", color: "#333" }}>{set.reps} reps</span>
      {sessionActive ? (
        <button onClick={onDelete} style={{
          background: "none", border: "none", color: "#ccc", fontSize: "1.2rem",
          cursor: "pointer", padding: "4px", lineHeight: 1,
          minWidth: "36px", minHeight: "36px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      ) : <span />}
    </div>
  );
}

// ── Add Set Form ──
function AddSetForm({ onAdd }) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    if (!reps.trim() || isNaN(Number(reps)) || Number(reps) <= 0) {
      setError("Enter a valid rep count.");
      return;
    }
    onAdd({
      id: `set-${Date.now()}`,
      reps: Number(reps),
      weight: weight.trim() !== "" ? Number(weight) : "",
    });
    setReps(""); setWeight(""); setError("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleAdd();
  }

  const inputStyle = {
    padding: "12px 14px", border: "1px solid #e0e0e0", borderRadius: "8px",
    fontSize: "1rem", background: "#fff", color: "#1a1a1a",
    outline: "none", boxSizing: "border-box", width: "100%",
  };

  return (
    <div style={{ background: "#f0f0f0", borderRadius: "10px", padding: "14px", marginTop: "10px" }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: "0.75rem", fontWeight: 600, color: "#888", marginBottom: "5px",
            textTransform: "uppercase", letterSpacing: "0.04em",
            height: "16px", display: "flex", alignItems: "center",
          }}>Weight kg</p>
          <input type="number" min="0" step="0.5" placeholder="20"
            value={weight} onChange={e => setWeight(e.target.value)}
            onKeyDown={handleKeyDown} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: "0.75rem", fontWeight: 600, color: "#888", marginBottom: "5px",
            textTransform: "uppercase", letterSpacing: "0.04em",
            height: "16px", display: "flex", alignItems: "center",
          }}>Reps *</p>
          <input type="number" min="1" placeholder="10"
            value={reps} onChange={e => { setReps(e.target.value); setError(""); }}
            onKeyDown={handleKeyDown} style={inputStyle} />
        </div>
      </div>
      {error && <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "8px" }}>{error}</p>}
      <button onClick={handleAdd} style={{
        width: "100%", padding: "12px", background: "#1a1a1a", color: "#fff",
        border: "none", borderRadius: "8px", fontSize: "0.95rem",
        fontWeight: 600, cursor: "pointer",
      }}>+ Add Set</button>
    </div>
  );
}

// ── Exercise Card ──
function ExerciseCard({ exercise, sessionActive, onAddSet, onDeleteSet, onDeleteExercise, exerciseHistory }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const sets = exercise.sets || [];
  const history = exerciseHistory?.[exercise.name] || [];
  const lastSession = history[0];

  function handleAddSet(set) {
    onAddSet(exercise.id, set);
    setShowSetForm(false);
    setShowRestTimer(true); // auto-show rest timer after logging a set
  }

  return (
    <>
      {showHistory && (
        <ExerciseHistoryModal
          name={exercise.name}
          history={history}
          onClose={() => setShowHistory(false)}
        />
      )}

      <div style={{ background: "#f9f9f9", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <button
            onClick={() => setShowHistory(true)}
            style={{
              background: "none", border: "none", padding: 0,
              cursor: "pointer", textAlign: "left", flex: 1,
            }}
          >
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a" }}>
              {exercise.name}
            </span>
            {history.length > 0 && (
              <span style={{ fontSize: "0.7rem", color: "#aaa", marginLeft: "6px", fontWeight: 400 }}>
                history ›
              </span>
            )}
          </button>

          {sessionActive && (
            <button onClick={() => onDeleteExercise(exercise.id)} style={{
              background: "none", border: "none", color: "#bbb",
              fontSize: "0.82rem", cursor: "pointer", padding: "4px 8px", minHeight: "36px",
            }}>Remove</button>
          )}
        </div>

        {lastSession && sessionActive && (
          <p style={{ fontSize: "0.75rem", color: "#aaa", marginBottom: "10px", fontStyle: "italic" }}>
            Last: {lastSession.sets.map(s => `${s.weight ? `${s.weight}kg` : "BW"} × ${s.reps}`).join("  ·  ")}
          </p>
        )}

        {sets.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "32px 1fr 1fr 36px",
            gap: "8px", padding: "2px 0 4px",
          }}>
            {["Set", "Weight", "Reps", ""].map((h, i) => (
              <span key={i} style={{ fontSize: "0.7rem", color: "#bbb", fontWeight: 600, textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
        )}

        {sets.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#ccc", marginBottom: "8px" }}>No sets yet.</p>
        ) : (
          sets.map((set, idx) => (
            <SetRow
              key={set.id} setNumber={idx + 1} set={set}
              sessionActive={sessionActive}
              onDelete={() => onDeleteSet(exercise.id, set.id)}
            />
          ))
        )}

        {/* Rest timer — shown after adding a set */}
        {sessionActive && showRestTimer && (
          <RestTimer onDismiss={() => setShowRestTimer(false)} />
        )}

        {sessionActive && (
          showSetForm ? (
            <AddSetForm onAdd={handleAddSet} />
          ) : (
            <button onClick={() => { setShowSetForm(true); setShowRestTimer(false); }} style={{
              marginTop: "10px", background: "none", border: "1px dashed #ddd",
              borderRadius: "8px", width: "100%", padding: "10px",
              color: "#bbb", fontSize: "0.88rem", cursor: "pointer",
            }}>+ Add set</button>
          )
        )}
      </div>
    </>
  );
}

// ── Add Exercise Form ──
function AddExerciseForm({ onAdd }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    if (!name.trim()) { setError("Exercise name is required."); return; }
    onAdd({ id: `exercise-${Date.now()}`, name: name.trim(), sets: [] });
    setName(""); setError("");
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <input
        placeholder="Exercise name e.g. Bench Press" value={name}
        onChange={e => { setName(e.target.value); setError(""); }}
        onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
        style={{
          width: "100%", padding: "12px 14px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "1rem", background: "#fff",
          color: "#1a1a1a", outline: "none", boxSizing: "border-box", marginBottom: "8px",
        }}
        autoFocus
      />
      {error && <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "8px" }}>{error}</p>}
      <button onClick={handleAdd} style={{
        width: "100%", padding: "12px", background: "#1a1a1a", color: "#fff",
        border: "none", borderRadius: "8px", fontSize: "0.95rem", cursor: "pointer",
      }}>Add Exercise</button>
    </div>
  );
}

// ── Workout Notes ──
function WorkoutNotes({ sessionId, notes, onUpdateNotes }) {
  return (
    <div style={{ marginTop: "12px" }}>
      <p style={{
        fontSize: "0.75rem", fontWeight: 600, color: "#aaa",
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px",
      }}>Notes</p>
      <textarea
        placeholder="How did it go? Any notes..."
        value={notes}
        onChange={e => onUpdateNotes(sessionId, e.target.value)}
        rows={3}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0",
          borderRadius: "8px", fontSize: "0.9rem", color: "#1a1a1a",
          background: "#fafafa", outline: "none", resize: "none",
          boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5,
        }}
      />
    </div>
  );
}

// ── Session Card ──
function SessionCard({ session, onEnd, onAddExercise, onAddSet, onDeleteSet, onDeleteExercise, onDeleteWorkout, onUpdateNotes, exerciseHistory }) {
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const sessionActive = session.status === "active";
  const isEditable = sessionActive || isEditing;
  const exercises = session.exercises || [];

  return (
    <div style={{
      background: "#fff", borderRadius: "12px", padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)", width: "100%",
      boxSizing: "border-box", outline: isEditing ? "2px solid #d0e8ff" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1a1a" }}>Workout</span>
          <span style={{ fontSize: "0.78rem", color: "#aaa", marginLeft: "8px" }}>
            {session.startTime}{session.endTime ? ` → ${session.endTime}` : ""}
          </span>
          {session.duration && (
            <span style={{ fontSize: "0.72rem", color: "#aaa", marginLeft: "6px" }}>· {session.duration} min</span>
          )}
          {sessionActive && (
            <span style={{ fontSize: "0.72rem", color: "#f0a500", marginLeft: "8px", fontWeight: 600 }}>Active</span>
          )}
          {!sessionActive && !isEditing && (
            <span style={{ fontSize: "0.72rem", color: "#4caf50", marginLeft: "8px", fontWeight: 600 }}>Completed</span>
          )}
          {isEditing && (
            <span style={{ fontSize: "0.72rem", color: "#1a8cff", marginLeft: "8px", fontWeight: 600 }}>Editing</span>
          )}
        </div>
        {!sessionActive && (
          <button
            onClick={() => { setIsEditing(prev => !prev); setShowExerciseForm(false); }}
            style={{
              padding: "6px 14px", borderRadius: "6px",
              border: isEditing ? "1px solid #1a8cff" : "1px solid #ccc",
              background: isEditing ? "#1a8cff" : "none",
              color: isEditing ? "#fff" : "#555",
              fontSize: "0.85rem", cursor: "pointer", minHeight: "36px",
            }}
          >{isEditing ? "Done" : "Edit"}</button>
        )}
      </div>

      {isEditing && (
        <button onClick={() => onDeleteWorkout(session.id)} style={{
          width: "100%", padding: "10px", marginBottom: "14px",
          borderRadius: "8px", border: "1px solid #e05252",
          background: "none", color: "#e05252", fontSize: "0.88rem", cursor: "pointer",
        }}>Remove workout</button>
      )}

      {exercises.length === 0 ? (
        <p style={{ fontSize: "0.88rem", color: "#ccc", marginBottom: "10px" }}>No exercises yet.</p>
      ) : (
        exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sessionActive={isEditable}
            exerciseHistory={exerciseHistory}
            onAddSet={(exerciseId, set) => onAddSet(session.id, exerciseId, set)}
            onDeleteSet={(exerciseId, setId) => onDeleteSet(session.id, exerciseId, setId)}
            onDeleteExercise={exerciseId => onDeleteExercise(session.id, exerciseId)}
          />
        ))
      )}

      {isEditable && (
        showExerciseForm ? (
          <AddExerciseForm onAdd={exercise => { onAddExercise(session.id, exercise); setShowExerciseForm(false); }} />
        ) : (
          <button onClick={() => setShowExerciseForm(true)} style={{
            background: "none", border: "1px dashed #ccc", borderRadius: "8px",
            width: "100%", padding: "10px", color: "#aaa",
            fontSize: "0.88rem", cursor: "pointer", marginTop: "6px",
          }}>+ Add exercise</button>
        )
      )}

      {sessionActive && (
        <WorkoutNotes sessionId={session.id} notes={session.notes || ""} onUpdateNotes={onUpdateNotes} />
      )}
      {!sessionActive && (session.notes || isEditing) && (
        <WorkoutNotes sessionId={session.id} notes={session.notes || ""} onUpdateNotes={onUpdateNotes} />
      )}

      {sessionActive && (
        <button onClick={() => onEnd(session.id)} style={{
          width: "100%", padding: "13px", marginTop: "16px",
          borderRadius: "8px", border: "none", background: "#1a1a1a",
          color: "#fff", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
        }}>End Workout</button>
      )}
    </div>
  );
}

// ── Main WorkoutScreen ──
export default function WorkoutScreen({
  viewedDate, onNavigateDay, sessions,
  onStartWorkout, onEndWorkout, onAddExercise, onAddSet,
  onDeleteSet, onDeleteExercise, onDeleteWorkout, onUpdateNotes,
  exerciseHistory, summarySession, onDismissSummary,
  anchorTemplates, userTemplates, onCreateTemplate, onUpdateTemplate, onDeleteTemplate,
}) {
  const [workoutView, setWorkoutView] = useState("main");
  const isToday = viewedDate === todayString();
  const safeSessions = sessions || [];
  const hasActiveSession = safeSessions.some(s => s.status === "active");

  if (summarySession) {
    return <WorkoutSummary session={summarySession} onDismiss={onDismissSummary} />;
  }

  if (workoutView === "picker") {
    return (
      <TemplatePicker
        anchorTemplates={anchorTemplates}
        userTemplates={userTemplates}
        onSelect={exercises => { onStartWorkout(exercises); setWorkoutView("main"); }}
        onSkip={() => { onStartWorkout([]); setWorkoutView("main"); }}
      />
    );
  }

  if (workoutView === "templates") {
    return (
      <TemplateManager
        userTemplates={userTemplates}
        onCreateTemplate={onCreateTemplate}
        onUpdateTemplate={onUpdateTemplate}
        onDeleteTemplate={onDeleteTemplate}
        onBack={() => setWorkoutView("main")}
      />
    );
  }

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#f5f5f3",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 0 100px", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "480px", padding: "0 20px", boxSizing: "border-box" }}>

        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px", textAlign: "center" }}>
          Workout
        </h1>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "28px" }}>
          <button onClick={() => onNavigateDay(-1)} style={{
            background: "none", border: "1px solid #ccc", borderRadius: "6px",
            width: "36px", height: "36px", cursor: "pointer", color: "#555",
            fontSize: "1.1rem", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 0, flexShrink: 0,
          }}>‹</button>

          <div style={{ textAlign: "center", width: "160px" }}>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a" }}>{formatDate(viewedDate)}</p>
            <p style={{ fontSize: "0.75rem", color: isToday ? "#aaa" : "transparent", marginTop: "2px" }}>Today</p>
          </div>

          <button onClick={() => onNavigateDay(1)} style={{
            background: "none", border: "1px solid #ccc", borderRadius: "6px",
            width: "36px", height: "36px", cursor: "pointer", color: "#555",
            fontSize: "1.1rem", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 0, flexShrink: 0,
          }}>›</button>
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
          {safeSessions.length === 0 && (
            <p style={{ fontSize: "0.9rem", color: "#bbb", textAlign: "center" }}>
              No workouts logged for this day.
            </p>
          )}

          {safeSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onEnd={onEndWorkout}
              onAddExercise={onAddExercise}
              onAddSet={onAddSet}
              onDeleteSet={onDeleteSet}
              onDeleteExercise={onDeleteExercise}
              onDeleteWorkout={onDeleteWorkout}
              onUpdateNotes={onUpdateNotes}
              exerciseHistory={exerciseHistory}
            />
          ))}

          {!hasActiveSession && (
            <button onClick={() => setWorkoutView("picker")} style={{
              width: "100%", padding: "14px", background: "#1a1a1a",
              color: "#fff", border: "none", borderRadius: "10px",
              fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
            }}>Start Workout</button>
          )}

          <button onClick={() => setWorkoutView("templates")} style={{
            width: "100%", padding: "12px", background: "none",
            color: "#555", border: "1px solid #ddd", borderRadius: "10px",
            fontSize: "0.88rem", cursor: "pointer",
          }}>Manage Templates</button>
        </div>
      </div>
    </div>
  );
}
