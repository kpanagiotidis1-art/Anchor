import { useState } from "react";

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

function SetRow({ setNumber, set, sessionActive, onDelete }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "32px 1fr 1fr 36px",
      gap: "8px",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: "1px solid #f5f5f5",
    }}>
      <span style={{ fontSize: "0.78rem", color: "#bbb", textAlign: "center" }}>
        {setNumber}
      </span>
      <span style={{ fontSize: "0.9rem", color: "#333" }}>
        {set.reps} reps
      </span>
      <span style={{ fontSize: "0.9rem", color: "#555" }}>
        {set.weight !== "" && set.weight != null ? `${set.weight} kg` : "Bodyweight"}
      </span>
      {sessionActive ? (
        <button
          onClick={onDelete}
          style={{
            background: "none",
            border: "none",
            color: "#ccc",
            fontSize: "1.2rem",
            cursor: "pointer",
            padding: "4px",
            lineHeight: 1,
            minWidth: "36px",
            minHeight: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      ) : <span />}
    </div>
  );
}

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
    setReps("");
    setWeight("");
    setError("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleAdd();
  }

  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    fontSize: "1rem",
    background: "#fafafa",
    color: "#1a1a1a",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  };

  return (
    <div style={{
      background: "#f0f0f0",
      borderRadius: "8px",
      padding: "12px",
      marginTop: "10px",
    }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.75rem", color: "#aaa", marginBottom: "4px" }}>Reps *</p>
          <input
            type="number"
            min="1"
            placeholder="e.g. 10"
            value={reps}
            onChange={e => { setReps(e.target.value); setError(""); }}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.75rem", color: "#aaa", marginBottom: "4px" }}>Weight kg (optional)</p>
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 20"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
        </div>
      </div>
      {error && (
        <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "8px" }}>{error}</p>
      )}
      <button
        onClick={handleAdd}
        style={{
          width: "100%",
          padding: "10px",
          background: "#1a1a1a",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "0.95rem",
          cursor: "pointer",
        }}
      >
        + Add Set
      </button>
    </div>
  );
}

function ExerciseCard({ exercise, sessionActive, onAddSet, onDeleteSet, onDeleteExercise }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const sets = exercise.sets || [];

  return (
    <div style={{
      background: "#f9f9f9",
      borderRadius: "10px",
      padding: "14px",
      marginBottom: "10px",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
      }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a" }}>
          {exercise.name}
        </span>
        {sessionActive && (
          <button
            onClick={() => onDeleteExercise(exercise.id)}
            style={{
              background: "none",
              border: "none",
              color: "#bbb",
              fontSize: "0.82rem",
              cursor: "pointer",
              padding: "4px 8px",
              minHeight: "36px",
            }}
          >
            Remove
          </button>
        )}
      </div>

      {sets.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 1fr 36px",
          gap: "8px",
          padding: "2px 0 4px",
        }}>
          {["Set", "Reps", "Weight", ""].map((h, i) => (
            <span key={i} style={{
              fontSize: "0.7rem",
              color: "#bbb",
              fontWeight: 600,
              textTransform: "uppercase",
            }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {sets.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#ccc", marginBottom: "8px" }}>No sets yet.</p>
      ) : (
        sets.map((set, idx) => (
          <SetRow
            key={set.id}
            setNumber={idx + 1}
            set={set}
            sessionActive={sessionActive}
            onDelete={() => onDeleteSet(exercise.id, set.id)}
          />
        ))
      )}

      {sessionActive && (
        showSetForm ? (
          <AddSetForm onAdd={set => {
            onAddSet(exercise.id, set);
            setShowSetForm(false);
          }} />
        ) : (
          <button
            onClick={() => setShowSetForm(true)}
            style={{
              marginTop: "10px",
              background: "none",
              border: "1px dashed #ddd",
              borderRadius: "8px",
              width: "100%",
              padding: "10px",
              color: "#bbb",
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            + Add set
          </button>
        )
      )}
    </div>
  );
}

function AddExerciseForm({ onAdd }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    if (!name.trim()) { setError("Exercise name is required."); return; }
    onAdd({
      id: `exercise-${Date.now()}`,
      name: name.trim(),
      sets: [],
    });
    setName("");
    setError("");
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <input
        placeholder="Exercise name e.g. Bench Press"
        value={name}
        onChange={e => { setName(e.target.value); setError(""); }}
        onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
        style={{
          width: "100%",
          padding: "12px 14px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          fontSize: "1rem",
          background: "#fff",
          color: "#1a1a1a",
          outline: "none",
          boxSizing: "border-box",
          marginBottom: "8px",
        }}
        autoFocus
      />
      {error && (
        <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "8px" }}>{error}</p>
      )}
      <button
        onClick={handleAdd}
        style={{
          width: "100%",
          padding: "12px",
          background: "#1a1a1a",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "0.95rem",
          cursor: "pointer",
        }}
      >
        Add Exercise
      </button>
    </div>
  );
}

function SessionCard({ session, onEnd, onAddExercise, onAddSet, onDeleteSet, onDeleteExercise, onDeleteWorkout }) {
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const sessionActive = session.status === "active";
  const isEditable = sessionActive || isEditing;
  const exercises = session.exercises || [];

  return (
    <div style={{
      background: "#fff",
      borderRadius: "12px",
      padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      width: "100%",
      boxSizing: "border-box",
      outline: isEditing ? "2px solid #d0e8ff" : "none",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "14px",
      }}>
        <div>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1a1a" }}>
            Workout
          </span>
          <span style={{ fontSize: "0.78rem", color: "#aaa", marginLeft: "8px" }}>
            {session.startTime}
          </span>
          {sessionActive && (
            <span style={{ fontSize: "0.72rem", color: "#f0a500", marginLeft: "8px", fontWeight: 600 }}>
              Active
            </span>
          )}
          {!sessionActive && !isEditing && (
            <span style={{ fontSize: "0.72rem", color: "#4caf50", marginLeft: "8px", fontWeight: 600 }}>
              Completed
            </span>
          )}
          {isEditing && (
            <span style={{ fontSize: "0.72rem", color: "#1a8cff", marginLeft: "8px", fontWeight: 600 }}>
              Editing
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {sessionActive && (
            <button
              onClick={() => onEnd(session.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid #e05252",
                background: "none",
                color: "#e05252",
                fontSize: "0.85rem",
                cursor: "pointer",
                minHeight: "36px",
              }}
            >
              End
            </button>
          )}
          {!sessionActive && (
            <button
              onClick={() => {
                setIsEditing(prev => !prev);
                setShowExerciseForm(false);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: isEditing ? "1px solid #1a8cff" : "1px solid #ccc",
                background: isEditing ? "#1a8cff" : "none",
                color: isEditing ? "#fff" : "#555",
                fontSize: "0.85rem",
                cursor: "pointer",
                minHeight: "36px",
              }}
            >
              {isEditing ? "Done" : "Edit"}
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <button
          onClick={() => onDeleteWorkout(session.id)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "14px",
            borderRadius: "8px",
            border: "1px solid #e05252",
            background: "none",
            color: "#e05252",
            fontSize: "0.88rem",
            cursor: "pointer",
          }}
        >
          Remove workout
        </button>
      )}

      {exercises.length === 0 ? (
        <p style={{ fontSize: "0.88rem", color: "#ccc", marginBottom: "10px" }}>
          No exercises yet.
        </p>
      ) : (
        exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sessionActive={isEditable}
            onAddSet={(exerciseId, set) => onAddSet(session.id, exerciseId, set)}
            onDeleteSet={(exerciseId, setId) => onDeleteSet(session.id, exerciseId, setId)}
            onDeleteExercise={exerciseId => onDeleteExercise(session.id, exerciseId)}
          />
        ))
      )}

      {isEditable && (
        showExerciseForm ? (
          <AddExerciseForm onAdd={exercise => {
            onAddExercise(session.id, exercise);
            setShowExerciseForm(false);
          }} />
        ) : (
          <button
            onClick={() => setShowExerciseForm(true)}
            style={{
              background: "none",
              border: "1px dashed #ccc",
              borderRadius: "8px",
              width: "100%",
              padding: "10px",
              color: "#aaa",
              fontSize: "0.88rem",
              cursor: "pointer",
              marginTop: "6px",
            }}
          >
            + Add exercise
          </button>
        )
      )}
    </div>
  );
}

export default function WorkoutScreen({
  viewedDate,
  onNavigateDay,
  sessions,
  onStartWorkout,
  onEndWorkout,
  onAddExercise,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  onDeleteWorkout,
}) {
  const isToday = viewedDate === todayString();
  const safeSessions = sessions || [];
  const hasActiveSession = safeSessions.some(s => s.status === "active");

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "#f5f5f3",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 0 100px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "480px",
        padding: "0 20px",
        boxSizing: "border-box",
      }}>

        <h1 style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "#1a1a1a",
          marginBottom: "8px",
          textAlign: "center",
        }}>
          Workout
        </h1>

        {/* Date navigation */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          marginBottom: "28px",
        }}>
          <button
            onClick={() => onNavigateDay(-1)}
            style={{
              background: "none",
              border: "1px solid #ccc",
              borderRadius: "6px",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              color: "#555",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              flexShrink: 0,
            }}
          >
            ‹
          </button>

          <div style={{ textAlign: "center", width: "160px" }}>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a" }}>
              {formatDate(viewedDate)}
            </p>
            <p style={{
              fontSize: "0.75rem",
              color: isToday ? "#aaa" : "transparent",
              marginTop: "2px",
            }}>
              Today
            </p>
          </div>

          <button
            onClick={() => onNavigateDay(1)}
            style={{
              background: "none",
              border: "1px solid #ccc",
              borderRadius: "6px",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              color: "#555",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              flexShrink: 0,
            }}
          >
            ›
          </button>
        </div>

        {/* Sessions + Start button — all in one column */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}>
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
            />
          ))}

          {!hasActiveSession && (
            <button
              onClick={onStartWorkout}
              style={{
                width: "100%",
                padding: "14px",
                background: "#1a1a1a",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Start Workout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}