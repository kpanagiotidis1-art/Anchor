import { useState, useEffect, useRef } from "react";
import CalendarPicker from "../components/CalendarPicker";

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
function RestTimer({ onDismiss, defaultDuration = 90 }) {
  const DURATIONS = [60, 90, 120];
  const [selected, setSelected] = useState(defaultDuration);
  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [running, setRunning] = useState(true);
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
      background: "var(--bg-exercise)",
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
            stroke="var(--border)"
            strokeWidth="4"
          />
          {/* Progress */}
          <circle
            cx="34" cy="34" r={radius}
            fill="none"
            stroke={isFinished ? "#4caf50" : "var(--text-primary)"}
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
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {timeDisplay}
            </span>
          ) : (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.2 }}>
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
                  border: "1px solid var(--border)", background: "none",
                  fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer",
                }}
              >Again</button>
              <button
                onClick={onDismiss}
                style={{
                  flex: 1, padding: "7px", borderRadius: "7px",
                  border: "none", background: "var(--text-primary)",
                  fontSize: "0.8rem", color: "var(--bg)", cursor: "pointer",
                }}
              >Done</button>
            </div>
          </div>
        ) : isActive ? (
          <div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Resting · {selected}s
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={reset}
                style={{
                  flex: 1, padding: "7px", borderRadius: "7px",
                  border: "1px solid var(--border)", background: "none",
                  fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={onDismiss}
                style={{
                  flex: 1, padding: "7px", borderRadius: "7px",
                  border: "none", background: "var(--text-primary)",
                  fontSize: "0.8rem", color: "var(--bg)", cursor: "pointer",
                }}
              >Skip</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Start rest timer
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => start(d)}
                  style={{
                    flex: 1, padding: "7px", borderRadius: "7px",
                    border: "1px solid var(--border)", background: "none",
                    fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer",
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
            background: "none", border: "none", color: "var(--text-faint)",
            fontSize: "1.2rem", cursor: "pointer", padding: "4px",
            alignSelf: "flex-start", flexShrink: 0,
          }}
        >×</button>
      )}
    </div>
  );
}

// ── Exercise History Modal ──
function ExerciseHistoryModal({ name, history, mode, onClose }) {
  mode = mode || "reps";
  const sessions = history || [];

  // PR — only meaningful for reps mode (weight × reps score)
  let pr = null;
  if (mode === "reps") {
    sessions.forEach(session => {
      (session.sets || []).forEach(set => {
        if (!pr) { pr = set; return; }
        const setScore = (set.weight || 0) * set.reps;
        const prScore = (pr.weight || 0) * pr.reps;
        if (setScore > prScore) pr = set;
      });
    });
  } else if (mode === "time") {
    // PR = longest duration
    sessions.forEach(session => {
      (session.sets || []).forEach(set => {
        if (!pr || set.duration > pr.duration) pr = set;
      });
    });
  } else if (mode === "cardio") {
    // PR = longest duration or most distance
    sessions.forEach(session => {
      (session.sets || []).forEach(set => {
        if (!pr) { pr = set; return; }
        const score = (set.distance || 0) * 1000 + (set.duration || 0);
        const prScore = (pr.distance || 0) * 1000 + (pr.duration || 0);
        if (score > prScore) pr = set;
      });
    });
  }

  const lastSession = sessions[0];

  function prDisplay() {
    if (!pr) return null;
    if (mode === "reps") return pr.weight ? `${pr.weight}kg × ${pr.reps}` : `BW × ${pr.reps}`;
    if (mode === "time") return formatDuration(pr.duration);
    if (mode === "cardio") return formatSetDisplay(pr, "cardio");
    return null;
  }

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
        background: "var(--bg)",
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
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              fontSize: "1.4rem", color: "var(--text-muted)",
              cursor: "pointer", padding: "4px", lineHeight: 1,
            }}
          >×</button>
        </div>

        {sessions.length === 0 ? (
          <p style={{ fontSize: "0.9rem", color: "var(--text-faint)", textAlign: "center", padding: "20px 0" }}>
            No history yet. Complete a workout to see data here.
          </p>
        ) : (
          <>
            {pr && prDisplay() && (
              <div style={{
                background: "var(--text-primary)", borderRadius: "12px", padding: "16px 20px",
                marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                    Personal Record
                  </p>
                  <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--bg)" }}>
                    {prDisplay()}
                  </p>
                </div>
                <p style={{ fontSize: "1.8rem" }}>🏆</p>
              </div>
            )}

            {lastSession && (
              <div style={{
                background: "var(--bg-card)", borderRadius: "12px", padding: "16px 20px",
                marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}>
                <p style={{
                  fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px",
                }}>
                  Last Session — {formatDate(lastSession.date)}
                </p>
                {(lastSession.sets || []).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-faint)" }}>No entries logged.</p>
                ) : (
                  lastSession.sets.map((set, idx) => (
                    <div key={idx} style={{
                      display: "flex", gap: "8px", padding: "7px 0",
                      borderBottom: idx < lastSession.sets.length - 1 ? "1px solid #f5f5f5" : "none",
                      alignItems: "center",
                    }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", width: "24px", textAlign: "center" }}>{idx + 1}</span>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{formatSetDisplay(set, mode)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {sessions.length > 1 && (
              <div style={{
                background: "var(--bg-card)", borderRadius: "12px", padding: "16px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}>
                <p style={{
                  fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px",
                }}>History</p>
                {sessions.slice(1).map((session, sIdx) => (
                  <div key={sIdx} style={{ marginBottom: sIdx < sessions.length - 2 ? "16px" : 0 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                      {formatDate(session.date)}
                    </p>
                    {(session.sets || []).map((set, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "12px", padding: "4px 0" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", width: "24px", textAlign: "center" }}>{idx + 1}</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{formatSetDisplay(set, mode)}</span>
                      </div>
                    ))}
                    {sIdx < sessions.length - 2 && (
                      <div style={{ borderBottom: "1px solid var(--divider)", marginTop: "12px" }} />
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

  // Volume only counts reps exercises
  const totalVolume = exercises.reduce((acc, ex) => {
    if ((ex.tracking_mode || "reps") !== "reps") return acc;
    return acc + (ex.sets || []).reduce((s, set) =>
      s + (set.weight ? set.reps * set.weight : 0), 0
    );
  }, 0);

  // Total cardio time
  const totalCardioSecs = exercises.reduce((acc, ex) => {
    if ((ex.tracking_mode || "reps") !== "cardio") return acc;
    return acc + (ex.sets || []).reduce((s, set) => s + (set.duration || 0), 0);
  }, 0);

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "60px 20px 100px", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ fontSize: "2rem", marginBottom: "8px" }}>💪</p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
            Workout Complete
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
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
            totalCardioSecs > 0
              ? { label: "Cardio", value: formatDuration(totalCardioSecs) }
              : { label: "Volume", value: totalVolume > 0 ? `${totalVolume}kg` : "—" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "var(--bg-card)", borderRadius: "12px", padding: "16px 12px",
              textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div style={{
          background: "var(--bg-card)", borderRadius: "12px", padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "20px",
        }}>
          <p style={{
            fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px",
          }}>Exercises</p>
          {exercises.length === 0 ? (
            <p style={{ fontSize: "0.88rem", color: "var(--text-faint)" }}>No exercises logged.</p>
          ) : (
            exercises.map(ex => {
              const mode = ex.tracking_mode || "reps";
              const setCount = (ex.sets || []).length;
              const label = mode === "cardio"
                ? `${setCount} session${setCount !== 1 ? "s" : ""}`
                : `${setCount} set${setCount !== 1 ? "s" : ""}`;
              return (
                <div key={ex.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid var(--divider)",
                }}>
                  <span style={{ fontSize: "0.92rem", color: "var(--text-primary)", fontWeight: 500 }}>{ex.name}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{label}</span>
                </div>
              );
            })
          )}
        </div>

        {session.notes ? (
          <div style={{
            background: "var(--bg-card)", borderRadius: "12px", padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "20px",
          }}>
            <p style={{
              fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px",
            }}>Notes</p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{session.notes}</p>
          </div>
        ) : null}

        <button
          onClick={onDismiss}
          style={{
            width: "100%", padding: "14px", background: "var(--text-primary)",
            color: "var(--bg)", border: "none", borderRadius: "10px",
            fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
          }}
        >Done</button>
      </div>
    </div>
  );
}

// ── Template Picker ──
function TemplatePicker({ anchorTemplates, userTemplates, onSelect, onSkip }) {
  // Normalise exercise display — handle both string and object formats
  function exerciseLabel(ex) {
    return typeof ex === "string" ? ex : ex.name;
  }

  function renderTemplate(template) {
    return (
      <button
        key={template.id}
        onClick={() => onSelect(template.exercises)}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px",
          padding: "14px 18px", textAlign: "left", cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          {template.name}
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          {template.exercises.map(exerciseLabel).join("  ·  ")}
        </p>
      </button>
    );
  }

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px 100px", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", textAlign: "center" }}>Start Workout</h1>
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", textAlign: "center", marginBottom: "32px" }}>
          Choose a template or start empty
        </p>

        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Anchor Workouts</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
          {anchorTemplates.map(renderTemplate)}
        </div>

        {userTemplates.length > 0 && (
          <>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>My Templates</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
              {userTemplates.map(renderTemplate)}
            </div>
          </>
        )}

        <button onClick={onSkip} style={{
          width: "100%", padding: "14px", background: "var(--text-primary)",
          color: "var(--bg)", border: "none", borderRadius: "10px",
          fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
        }}>Start Empty</button>
      </div>
    </div>
  );
}

// ── Template Manager ──
function TemplateManager({ userTemplates, onCreateTemplate, onUpdateTemplate, onDeleteTemplate, onBack }) {
  const [view, setView] = useState("list");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [name, setName] = useState("");
  // exercises are now objects: { name, tracking_mode }
  const [exercises, setExercises] = useState([]);
  const [newExercise, setNewExercise] = useState("");
  const [newMode, setNewMode] = useState("reps");
  const [error, setError] = useState("");
  const [editingExIdx, setEditingExIdx] = useState(null);
  const [editingExName, setEditingExName] = useState("");

  function normaliseExercises(exList) {
    // Handle old string arrays and new object arrays
    return exList.map(ex =>
      typeof ex === "string"
        ? { name: ex, tracking_mode: "reps" }
        : { name: ex.name, tracking_mode: ex.tracking_mode || "reps" }
    );
  }

  function openCreate() {
    setName(""); setExercises([]); setNewExercise(""); setNewMode("reps"); setError(""); setView("create");
  }

  function openEdit(template) {
    setEditingTemplate(template);
    setName(template.name);
    setExercises(normaliseExercises(template.exercises));
    setNewExercise(""); setNewMode("reps"); setError(""); setView("edit");
  }

  function addExerciseToList() {
    if (!newExercise.trim()) return;
    setExercises(prev => [...prev, { name: newExercise.trim(), tracking_mode: newMode }]);
    setNewExercise("");
    setNewMode("reps");
  }

  function removeExerciseFromList(idx) {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }

  function startEditExercise(idx) {
    setEditingExIdx(idx);
    setEditingExName(exercises[idx].name);
  }

  function saveEditExercise(idx) {
    if (editingExName.trim()) {
      setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, name: editingExName.trim() } : ex));
    }
    setEditingExIdx(null);
    setEditingExName("");
  }

  function setExerciseMode(idx, mode) {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, tracking_mode: mode } : ex));
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
    width: "100%", padding: "12px 14px", border: "1px solid var(--border)",
    borderRadius: "8px", fontSize: "0.95rem", outline: "none",
    background: "var(--bg-card)", color: "var(--text-primary)", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const MODE_LABELS = { reps: "Reps", time: "Time", cardio: "Cardio" };
  const MODE_KEYS = ["reps", "time", "cardio"];

  function ModeToggle({ value, onChange, small }) {
    return (
      <div style={{ display: "flex", background: "var(--bg-subtle)", borderRadius: "6px", padding: "2px", gap: "2px" }}>
        {MODE_KEYS.map(m => (
          <button key={m} onClick={() => onChange(m)} style={{
            padding: small ? "3px 7px" : "4px 10px",
            borderRadius: "4px",
            border: "none",
            background: value === m ? "var(--bg-card)" : "none",
            color: value === m ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: small ? "0.68rem" : "0.75rem",
            fontWeight: value === m ? 600 : 400,
            cursor: "pointer",
            boxShadow: value === m ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}>{MODE_LABELS[m]}</button>
        ))}
      </div>
    );
  }

  if (view === "create" || view === "edit") {
    return (
      <div style={{
        width: "100%", minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "40px 20px 100px", boxSizing: "border-box",
      }}>
        <div style={{ width: "100%", maxWidth: "480px" }}>
          <button onClick={() => setView("list")} style={{
            background: "none", border: "none", fontSize: "0.9rem",
            color: "var(--text-secondary)", cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "24px", fontFamily: "inherit",
          }}>← Back</button>

          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "24px" }}>
            {view === "create" ? "New Template" : "Edit Template"}
          </h2>

          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Template Name</p>
          <input type="text" placeholder="e.g. Push Day" value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            style={{ ...inputStyle, marginBottom: "20px" }} autoFocus />

          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Exercises</p>

          {exercises.length > 0 && (
            <div style={{ background: "var(--bg-card)", borderRadius: "10px", padding: "4px 0", marginBottom: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {exercises.map((ex, idx) => (
                <div key={idx} style={{
                  padding: "10px 16px",
                  borderBottom: idx < exercises.length - 1 ? "1px solid var(--border-light)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    {editingExIdx === idx ? (
                      <input
                        autoFocus value={editingExName}
                        onChange={e => setEditingExName(e.target.value)}
                        onBlur={() => saveEditExercise(idx)}
                        onKeyDown={e => { if (e.key === "Enter") saveEditExercise(idx); if (e.key === "Escape") setEditingExIdx(null); }}
                        style={{ flex: 1, padding: "4px 8px", border: "1px solid var(--text-primary)", borderRadius: "6px", fontSize: "0.92rem", outline: "none", background: "var(--bg-exercise)", color: "var(--text-primary)", boxSizing: "border-box", fontFamily: "inherit" }}
                      />
                    ) : (
                      <button onClick={() => startEditExercise(idx)} style={{ flex: 1, background: "none", border: "none", padding: "2px 0", textAlign: "left", cursor: "pointer", fontSize: "0.92rem", color: "var(--text-primary)", fontFamily: "inherit" }}>
                        {ex.name}
                      </button>
                    )}
                    <button onClick={() => removeExerciseFromList(idx)} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: "1.1rem", cursor: "pointer", padding: "4px", flexShrink: 0 }}>×</button>
                  </div>
                  {/* Tracking mode toggle per exercise */}
                  <ModeToggle value={ex.tracking_mode || "reps"} onChange={mode => setExerciseMode(idx, mode)} small />
                </div>
              ))}
            </div>
          )}

          {/* Add exercise row */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input type="text" placeholder="Add exercise..." value={newExercise}
                onChange={e => setNewExercise(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addExerciseToList(); }}
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addExerciseToList} style={{
                padding: "12px 16px", background: "var(--bg-subtle)", border: "none",
                borderRadius: "8px", fontSize: "1.2rem", cursor: "pointer",
                color: "var(--text-secondary)", flexShrink: 0,
              }}>+</button>
            </div>
            {/* Mode for the new exercise */}
            <ModeToggle value={newMode} onChange={setNewMode} />
          </div>

          {error && <p style={{ color: "#e05252", fontSize: "0.85rem", marginBottom: "12px" }}>{error}</p>}

          <button onClick={view === "create" ? handleSaveCreate : handleSaveEdit} style={{
            width: "100%", padding: "14px", background: "var(--text-primary)",
            color: "var(--bg)", border: "none", borderRadius: "10px",
            fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", marginTop: "12px", fontFamily: "inherit",
          }}>Save Template</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px 100px", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", fontSize: "0.9rem",
          color: "var(--text-secondary)", cursor: "pointer", padding: 0, textAlign: "left", marginBottom: "24px",
        }}>← Back</button>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "28px" }}>
          My Templates
        </h2>

        {userTemplates.length === 0 ? (
          <p style={{ fontSize: "0.88rem", color: "var(--text-faint)", marginBottom: "24px" }}>
            No templates yet. Create one below.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            {userTemplates.map(template => (
              <div key={template.id} style={{
                background: "var(--bg-card)", borderRadius: "12px", padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>
                    {template.name}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {template.exercises.map(ex => typeof ex === "string" ? ex : ex.name).join("  ·  ")}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", marginLeft: "12px", flexShrink: 0 }}>
                  <button onClick={() => openEdit(template)} style={{
                    padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)",
                    background: "none", color: "var(--text-secondary)", fontSize: "0.82rem", cursor: "pointer",
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
          width: "100%", padding: "14px", background: "var(--text-primary)",
          color: "var(--bg)", border: "none", borderRadius: "10px",
          fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
        }}>+ Create Template</button>
      </div>
    </div>
  );
}

// ── Helpers ──
function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s > 0 ? s + "s" : ""}`.trim() : `${s}s`;
}

function formatSetDisplay(set, mode) {
  mode = mode || "reps";
  if (mode === "time") return formatDuration(set.duration);
  if (mode === "cardio") {
    const parts = [];
    if (set.duration) parts.push(formatDuration(set.duration));
    if (set.distance) parts.push(`${set.distance}km`);
    if (set.speed) parts.push(`${set.speed}km/h`);
    if (set.calories) parts.push(`${set.calories}cal`);
    return parts.join(" · ") || "—";
  }
  // reps
  const weight = set.weight !== "" && set.weight != null ? `${set.weight}kg` : "BW";
  return `${weight} × ${set.reps}`;
}

// ── Set Row ──
function SetRow({ setNumber, set, mode, sessionActive, onDelete }) {
  mode = mode || "reps";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: sessionActive ? "32px 1fr 36px" : "32px 1fr",
      gap: "8px", alignItems: "center", padding: "8px 0",
      borderBottom: "1px solid var(--divider)",
    }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", textAlign: "center" }}>{setNumber}</span>
      <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{formatSetDisplay(set, mode)}</span>
      {sessionActive ? (
        <button onClick={onDelete} style={{
          background: "none", border: "none", color: "var(--text-faint)", fontSize: "1.2rem",
          cursor: "pointer", padding: "4px", lineHeight: 1,
          minWidth: "36px", minHeight: "36px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      ) : null}
    </div>
  );
}

// ── Add Set Form ──
function AddSetForm({ onAdd, mode }) {
  mode = mode || "reps";

  // reps state
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  // time state
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  // cardio state
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [speed, setSpeed] = useState("");
  const [incline, setIncline] = useState("");
  const [calories, setCalories] = useState("");

  const [error, setError] = useState("");

  const inputStyle = {
    padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "8px",
    fontSize: "1rem", background: "var(--bg-card)", color: "var(--text-primary)",
    outline: "none", boxSizing: "border-box", width: "100%",
    fontFamily: "inherit",
  };

  const fieldLabel = (label) => (
    <p style={{
      fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px",
      textTransform: "uppercase", letterSpacing: "0.04em",
    }}>{label}</p>
  );

  function handleAdd() {
    if (mode === "reps") {
      if (!reps.trim() || isNaN(Number(reps)) || Number(reps) <= 0) {
        setError("Enter a valid rep count."); return;
      }
      onAdd({
        id: `set-${Date.now()}`,
        reps: Number(reps),
        weight: weight.trim() !== "" ? Number(weight) : "",
      });
      setReps(""); setWeight("");
    } else if (mode === "time") {
      const totalSecs = (Number(minutes || 0) * 60) + Number(seconds || 0);
      if (totalSecs <= 0) { setError("Enter a duration."); return; }
      onAdd({ id: `set-${Date.now()}`, duration: totalSecs });
      setMinutes(""); setSeconds("");
    } else if (mode === "cardio") {
      const totalSecs = Number(duration || 0) * 60;
      if (totalSecs <= 0) { setError("Enter a duration."); return; }
      onAdd({
        id: `set-${Date.now()}`,
        duration: totalSecs,
        ...(distance.trim() && { distance: Number(distance) }),
        ...(speed.trim() && { speed: Number(speed) }),
        ...(incline.trim() && { incline: Number(incline) }),
        ...(calories.trim() && { calories: Number(calories) }),
      });
      setDuration(""); setDistance(""); setSpeed(""); setIncline(""); setCalories("");
    }
    setError("");
  }

  return (
    <div style={{ background: "var(--bg-subtle)", borderRadius: "10px", padding: "14px", marginTop: "10px" }}>

      {mode === "reps" && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            {fieldLabel("Weight kg")}
            <input type="number" min="0" step="0.5" placeholder="—"
              value={weight} onChange={e => setWeight(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            {fieldLabel("Reps *")}
            <input type="number" min="1" placeholder="10"
              value={reps} onChange={e => { setReps(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
          </div>
        </div>
      )}

      {mode === "time" && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            {fieldLabel("Min")}
            <input type="number" min="0" placeholder="0"
              value={minutes} onChange={e => { setMinutes(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            {fieldLabel("Sec")}
            <input type="number" min="0" max="59" placeholder="30"
              value={seconds} onChange={e => { setSeconds(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
          </div>
        </div>
      )}

      {mode === "cardio" && (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              {fieldLabel("Duration (min) *")}
              <input type="number" min="0" placeholder="30"
                value={duration} onChange={e => { setDuration(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              {fieldLabel("Distance (km)")}
              <input type="number" min="0" step="0.1" placeholder="—"
                value={distance} onChange={e => setDistance(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              {fieldLabel("Speed (km/h)")}
              <input type="number" min="0" step="0.1" placeholder="—"
                value={speed} onChange={e => setSpeed(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              {fieldLabel("Incline / Res.")}
              <input type="number" min="0" step="0.5" placeholder="—"
                value={incline} onChange={e => setIncline(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              {fieldLabel("Calories")}
              <input type="number" min="0" placeholder="—"
                value={calories} onChange={e => setCalories(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()} style={inputStyle} />
            </div>
          </div>
        </>
      )}

      {error && <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "8px" }}>{error}</p>}
      <button onClick={handleAdd} style={{
        width: "100%", padding: "12px", background: "var(--text-primary)", color: "var(--bg)",
        border: "none", borderRadius: "8px", fontSize: "0.95rem",
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}>+ Log</button>
    </div>
  );
}

// ── Exercise Card ──
function ExerciseCard({ exercise, sessionActive, onAddSet, onDeleteSet, onDeleteExercise, onRenameExercise, exerciseHistory, restTimerEnabled, restTimerDuration, smartSuggestionsEnabled }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(exercise.name);

  const mode = exercise.tracking_mode || "reps";
  const sets = exercise.sets || [];
  const history = exerciseHistory?.[exercise.name] || [];
  const lastSession = history[0];

  function handleAddSet(set) {
    onAddSet(exercise.id, set);
    setShowSetForm(false);
    // Only show rest timer for reps/time, not cardio
    if (restTimerEnabled !== false && mode !== "cardio") setShowRestTimer(true);
  }

  function saveRename() {
    if (nameInput.trim() && nameInput.trim() !== exercise.name) {
      onRenameExercise(exercise.id, nameInput.trim());
    }
    setEditingName(false);
  }

  // Last session hint text
  function lastSessionHint() {
    if (!lastSession || !lastSession.sets?.length) return null;
    return lastSession.sets.map(s => formatSetDisplay(s, mode)).join("  ·  ");
  }

  return (
    <>
      {showHistory && (
        <ExerciseHistoryModal
          name={exercise.name}
          history={history}
          mode={mode}
          onClose={() => setShowHistory(false)}
        />
      )}

      <div style={{ background: "var(--bg-exercise)", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>

          {sessionActive && editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={saveRename}
              onKeyDown={e => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditingName(false); }}
              style={{
                flex: 1, padding: "4px 8px", border: "1px solid var(--text-primary)",
                borderRadius: "6px", fontSize: "0.95rem", fontWeight: 600,
                outline: "none", background: "var(--bg-card)", color: "var(--text-primary)",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          ) : (
            <button
              onClick={() => sessionActive ? setEditingName(true) : setShowHistory(true)}
              style={{
                background: "none", border: "none", padding: 0,
                cursor: "pointer", textAlign: "left", flex: 1,
              }}
            >
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {exercise.name}
              </span>
              {!sessionActive && history.length > 0 && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "6px", fontWeight: 400 }}>
                  history ›
                </span>
              )}
              {sessionActive && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", marginLeft: "6px", fontWeight: 400 }}>
                  tap to rename
                </span>
              )}
            </button>
          )}

          {sessionActive && !editingName && (
            <button onClick={() => onDeleteExercise(exercise.id)} style={{
              background: "none", border: "none", color: "var(--text-faint)",
              fontSize: "0.82rem", cursor: "pointer", padding: "4px 8px", minHeight: "36px",
            }}>Remove</button>
          )}
        </div>

        {/* Mode badge */}
        {mode !== "reps" && (
          <span style={{
            fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: "8px", display: "block",
          }}>
            {mode === "time" ? "⏱ Time" : "🏃 Cardio"}
          </span>
        )}

        {/* Last session hint */}
        {lastSession && sessionActive && lastSessionHint() && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "10px", fontStyle: "italic" }}>
            Last: {lastSessionHint()}
          </p>
        )}

        {sets.length > 0 && (
          <div style={{ paddingTop: "4px" }}>
            {sets.map((set, idx) => (
              <SetRow
                key={set.id} setNumber={idx + 1} set={set}
                mode={mode}
                sessionActive={sessionActive}
                onDelete={() => onDeleteSet(exercise.id, set.id)}
              />
            ))}
          </div>
        )}

        {sets.length === 0 && (
          <p style={{ fontSize: "0.85rem", color: "var(--text-faint)", marginBottom: "8px" }}>No entries yet.</p>
        )}

        {/* Rest timer */}
        {sessionActive && showRestTimer && (
          <RestTimer
            onDismiss={() => setShowRestTimer(false)}
            defaultDuration={restTimerDuration || 90}
          />
        )}

        {sessionActive && (
          showSetForm ? (
            <AddSetForm onAdd={handleAddSet} mode={mode} />
          ) : (
            <button onClick={() => { setShowSetForm(true); setShowRestTimer(false); }} style={{
              marginTop: "10px", background: "none", border: "1px dashed #ddd",
              borderRadius: "8px", width: "100%", padding: "10px",
              color: "var(--text-faint)", fontSize: "0.88rem", cursor: "pointer",
            }}>+ Add {mode === "cardio" ? "session" : "set"}</button>
          )
        )}
      </div>
    </>
  );
}

// ── Smart suggestion keywords ──
const TIME_KEYWORDS = ["plank", "dead hang", "deadhang", "wall sit", "wallsit", "hollow hold", "l-sit", "lsit", "handstand", "hang", "static"];
const CARDIO_KEYWORDS = ["treadmill", "bike", "bicycle", "stairmaster", "rowing", "rower", "run", "walk", "elliptical", "swim", "cycling", "cardio", "hike", "jog"];

function getSuggestion(name) {
  const lower = name.toLowerCase();
  if (CARDIO_KEYWORDS.some(k => lower.includes(k))) return "cardio";
  if (TIME_KEYWORDS.some(k => lower.includes(k))) return "time";
  return null;
}

// ── Tracking mode selector ──
function TrackingModeSelector({ mode, onChange }) {
  const modes = [
    { value: "reps", label: "Reps" },
    { value: "time", label: "Time" },
    { value: "cardio", label: "Cardio" },
  ];
  return (
    <div style={{
      display: "flex",
      background: "#e8e8e6",
      borderRadius: "8px",
      padding: "3px",
      gap: "2px",
      marginBottom: "12px",
    }}>
      {modes.map(m => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: "6px",
            border: "none",
            background: mode === m.value ? "var(--bg-card)" : "none",
            color: mode === m.value ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: "0.82rem",
            fontWeight: mode === m.value ? 600 : 400,
            cursor: "pointer",
            boxShadow: mode === m.value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s",
            fontFamily: "inherit",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ── Add Exercise Form ──
function AddExerciseForm({ onAdd, smartSuggestionsEnabled }) {
  const [name, setName] = useState("");
  const [trackingMode, setTrackingMode] = useState("reps");
  const [suggestion, setSuggestion] = useState(null); // "time" | "cardio" | null
  const [error, setError] = useState("");

  function handleNameChange(val) {
    setName(val);
    setError("");
    if (smartSuggestionsEnabled !== false && val.length > 2) {
      const s = getSuggestion(val);
      setSuggestion(s !== trackingMode ? s : null);
    } else {
      setSuggestion(null);
    }
  }

  function applySuggestion() {
    setTrackingMode(suggestion);
    setSuggestion(null);
  }

  function handleAdd() {
    if (!name.trim()) { setError("Exercise name is required."); return; }
    onAdd({
      id: `exercise-${Date.now()}`,
      name: name.trim(),
      tracking_mode: trackingMode,
      sets: [],
    });
    setName(""); setTrackingMode("reps"); setSuggestion(null); setError("");
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <input
        placeholder="Exercise name e.g. Bench Press"
        value={name}
        onChange={e => handleNameChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
        style={{
          width: "100%", padding: "12px 14px", border: "1px solid var(--border)",
          borderRadius: "8px", fontSize: "1rem", background: "var(--bg-card)",
          color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
          marginBottom: "10px", fontFamily: "inherit",
        }}
        autoFocus
      />

      {/* Smart suggestion chip */}
      {suggestion && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          marginBottom: "10px",
          padding: "8px 12px",
          background: "var(--bg-subtle)",
          borderRadius: "8px",
        }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Track as {suggestion}?
          </span>
          <button
            onClick={applySuggestion}
            style={{
              background: "var(--text-primary)", color: "var(--bg)", border: "none",
              borderRadius: "6px", padding: "3px 10px",
              fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
            }}
          >Yes</button>
          <button
            onClick={() => setSuggestion(null)}
            style={{
              background: "none", color: "var(--text-muted)", border: "none",
              fontSize: "0.78rem", cursor: "pointer", padding: "3px 4px",
              fontFamily: "inherit",
            }}
          >Dismiss</button>
        </div>
      )}

      <TrackingModeSelector mode={trackingMode} onChange={setTrackingMode} />

      {error && <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "8px" }}>{error}</p>}
      <button onClick={handleAdd} style={{
        width: "100%", padding: "12px", background: "var(--text-primary)", color: "var(--bg)",
        border: "none", borderRadius: "8px", fontSize: "0.95rem",
        cursor: "pointer", fontFamily: "inherit",
      }}>Add Exercise</button>
    </div>
  );
}

// ── Workout Notes ──
function WorkoutNotes({ sessionId, notes, onUpdateNotes }) {
  return (
    <div style={{ marginTop: "12px" }}>
      <p style={{
        fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px",
      }}>Notes</p>
      <textarea
        placeholder="How did it go? Any notes..."
        value={notes}
        onChange={e => onUpdateNotes(sessionId, e.target.value)}
        rows={3}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid var(--border)",
          borderRadius: "8px", fontSize: "0.9rem", color: "var(--text-primary)",
          background: "var(--bg-input)", outline: "none", resize: "none",
          boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5,
        }}
      />
    </div>
  );
}

// ── Session Card ──
function SessionCard({ session, onEnd, onAddExercise, onAddSet, onDeleteSet, onDeleteExercise, onRenameExercise, onDeleteWorkout, onUpdateNotes, exerciseHistory, restTimerEnabled, restTimerDuration, smartSuggestionsEnabled }) {
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const sessionActive = session.status === "active";
  const isEditable = sessionActive || isEditing;
  const exercises = session.exercises || [];

  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: "12px", padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)", width: "100%",
      boxSizing: "border-box", outline: isEditing ? "2px solid #d0e8ff" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>Workout</span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "8px" }}>
            {session.startTime}{session.endTime ? ` → ${session.endTime}` : ""}
          </span>
          {session.duration && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "6px" }}>· {session.duration} min</span>
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
              color: isEditing ? "var(--bg)" : "var(--text-secondary)",
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
        <p style={{ fontSize: "0.88rem", color: "var(--text-faint)", marginBottom: "10px" }}>No exercises yet.</p>
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
            onRenameExercise={(exerciseId, newName) => onRenameExercise(session.id, exerciseId, newName)}
            restTimerEnabled={restTimerEnabled}
            restTimerDuration={restTimerDuration}
            smartSuggestionsEnabled={smartSuggestionsEnabled}
          />
        ))
      )}

      {isEditable && (
        showExerciseForm ? (
          <AddExerciseForm
            onAdd={exercise => { onAddExercise(session.id, exercise); setShowExerciseForm(false); }}
            smartSuggestionsEnabled={smartSuggestionsEnabled}
          />
        ) : (
          <button onClick={() => setShowExerciseForm(true)} style={{
            background: "none", border: "1px dashed #ccc", borderRadius: "8px",
            width: "100%", padding: "10px", color: "var(--text-muted)",
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
          borderRadius: "8px", border: "none", background: "var(--text-primary)",
          color: "var(--bg)", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
        }}>End Workout</button>
      )}
    </div>
  );
}

// ── Main WorkoutScreen ──
export default function WorkoutScreen({
  viewedDate, onNavigateDay, sessions,
  onStartWorkout, onEndWorkout, onAddExercise, onAddSet,
  onDeleteSet, onDeleteExercise, onRenameExercise, onDeleteWorkout, onUpdateNotes,
  exerciseHistory, summarySession, onDismissSummary,
  anchorTemplates, userTemplates, onCreateTemplate, onUpdateTemplate, onDeleteTemplate,
  restTimerEnabled, restTimerDuration, smartSuggestionsEnabled,
}) {
  const [workoutView, setWorkoutView] = useState("main");
  const [showCalendar, setShowCalendar] = useState(false);
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
      width: "100%", minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 0 100px", boxSizing: "border-box",
    }}>
      {showCalendar && (
        <CalendarPicker
          viewedDate={viewedDate}
          onSelectDate={date => onNavigateDay(0, date)}
          onClose={() => setShowCalendar(false)}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px", padding: "0 20px", boxSizing: "border-box" }}>

        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px", textAlign: "center" }}>
          Workout
        </h1>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "28px", position: "relative" }}>
          <button onClick={() => onNavigateDay(-1)} style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "6px",
            width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)",
            fontSize: "1.1rem", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 0, flexShrink: 0,
          }}>‹</button>

          <div style={{ textAlign: "center", width: "150px" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{formatDate(viewedDate)}</p>
            <p style={{ fontSize: "0.72rem", color: isToday ? "var(--text-muted)" : "transparent", marginTop: "2px" }}>Today</p>
          </div>

          <button onClick={() => onNavigateDay(1)} style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "6px",
            width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)",
            fontSize: "1.1rem", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 0, flexShrink: 0,
          }}>›</button>

          {/* Calendar icon — absolute so it doesn't affect centering */}
          <button
            onClick={() => setShowCalendar(true)}
            style={{
              position: "absolute", right: 0,
              background: "none", border: "1px solid var(--border)", borderRadius: "6px",
              width: "36px", height: "36px", cursor: "pointer", color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="var(--text-muted)" strokeWidth="1.5"/>
              <path d="M1 7h14" stroke="var(--text-muted)" strokeWidth="1.5"/>
              <path d="M5 1v4M11 1v4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
          {safeSessions.length === 0 && (
            <p style={{ fontSize: "0.9rem", color: "var(--text-faint)", textAlign: "center" }}>
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
              onRenameExercise={onRenameExercise}
              onDeleteWorkout={onDeleteWorkout}
              onUpdateNotes={onUpdateNotes}
              exerciseHistory={exerciseHistory}
              restTimerEnabled={restTimerEnabled}
              restTimerDuration={restTimerDuration}
              smartSuggestionsEnabled={smartSuggestionsEnabled}
            />
          ))}

          {!hasActiveSession && (
            <button onClick={() => setWorkoutView("picker")} style={{
              width: "100%", padding: "14px", background: "var(--text-primary)",
              color: "var(--bg)", border: "none", borderRadius: "10px",
              fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
            }}>Start Workout</button>
          )}

          <button onClick={() => setWorkoutView("templates")} style={{
            width: "100%", padding: "12px", background: "none",
            color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "10px",
            fontSize: "0.88rem", cursor: "pointer",
          }}>Manage Templates</button>
        </div>
      </div>
    </div>
  );
}
