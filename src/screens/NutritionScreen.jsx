import { useState } from "react";

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

// ── Macro bar ──
function MacroBar({ label, value, goal, colour }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {value}g
        </span>
      </div>
      <div style={{ height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: colour,
          borderRadius: "99px",
          transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}

// ── Add Meal Sheet ──
// prefill prop is the AI-ready hook — pass { name, calories, protein, carbs, fats }
// to pre-populate the form for AI-estimated meals in the future
function AddMealSheet({ onAdd, onClose, prefill }) {
  const [name, setName] = useState(prefill?.name || "");
  const [calories, setCalories] = useState(prefill?.calories?.toString() || "");
  const [protein, setProtein] = useState(prefill?.protein?.toString() || "");
  const [carbs, setCarbs] = useState(prefill?.carbs?.toString() || "");
  const [fats, setFats] = useState(prefill?.fats?.toString() || "");
  const [error, setError] = useState("");

  function handleAdd() {
    if (!name.trim()) { setError("Please enter a meal name."); return; }
    if (!calories || isNaN(Number(calories)) || Number(calories) < 0) {
      setError("Please enter valid calories."); return;
    }
    onAdd({
      id: `meal-${Date.now()}`,
      name: name.trim(),
      calories: Math.round(Number(calories)),
      protein: Math.round(Number(protein) || 0),
      carbs: Math.round(Number(carbs) || 0),
      fats: Math.round(Number(fats) || 0),
      createdAt: new Date().toISOString(),
      aiEstimated: prefill?.aiEstimated || false,
    });
    onClose();
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    fontSize: "0.95rem",
    outline: "none",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const fieldLabel = (label, required) => (
    <p style={{
      fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px",
    }}>
      {label}{required && <span style={{ color: "var(--text-faint)" }}> *</span>}
    </p>
  );

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.35)",
      }} />

      <div style={{
        position: "relative",
        background: "var(--bg)",
        borderRadius: "20px 20px 0 0",
        padding: "24px 20px 48px",
        zIndex: 301,
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "99px", margin: "0 auto 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Log Meal</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {prefill?.aiEstimated && (
          <div style={{
            background: "var(--bg-subtle)", borderRadius: "8px", padding: "10px 14px",
            marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ fontSize: "0.9rem" }}>✨</span>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>AI estimated — review and adjust</p>
          </div>
        )}

        {/* Meal name */}
        <div style={{ marginBottom: "14px" }}>
          {fieldLabel("Meal name", true)}
          <input
            autoFocus type="text" placeholder="e.g. Chicken salad"
            value={name} onChange={e => { setName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            style={inputStyle}
          />
        </div>

        {/* Calories */}
        <div style={{ marginBottom: "14px" }}>
          {fieldLabel("Calories (kcal)", true)}
          <input
            type="number" min="0" placeholder="450"
            value={calories} onChange={e => { setCalories(e.target.value); setError(""); }}
            style={inputStyle}
          />
        </div>

        {/* Macros — 3 columns */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {[
            { label: "Protein (g)", val: protein, set: setProtein, placeholder: "35" },
            { label: "Carbs (g)", val: carbs, set: setCarbs, placeholder: "40" },
            { label: "Fats (g)", val: fats, set: setFats, placeholder: "15" },
          ].map(f => (
            <div key={f.label} style={{ flex: 1 }}>
              {fieldLabel(f.label)}
              <input
                type="number" min="0" placeholder={f.placeholder}
                value={f.val} onChange={e => f.set(e.target.value)}
                style={{ ...inputStyle, padding: "10px 10px" }}
              />
            </div>
          ))}
        </div>

        {error && <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "12px" }}>{error}</p>}

        <button onClick={handleAdd} style={{
          width: "100%", padding: "14px",
          background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "10px",
          fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          Save Meal
        </button>
      </div>
    </div>
  );
}

// ── Water tracker ──
function WaterTracker({ glasses, goal, onAdd, onRemove }) {
  const pct = goal > 0 ? Math.min((glasses / goal) * 100, 100) : 0;
  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: "12px", padding: "16px 20px",
      boxShadow: "var(--shadow)", marginBottom: "16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>Water</p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {glasses} / {goal} glasses · {glasses * 250}ml
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={onRemove} style={{
            width: "32px", height: "32px", borderRadius: "50%",
            border: "1px solid var(--border)", background: "none",
            fontSize: "1.1rem", cursor: "pointer", color: "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>−</button>
          <button onClick={onAdd} style={{
            width: "32px", height: "32px", borderRadius: "50%",
            border: "none", background: "var(--text-primary)",
            fontSize: "1.1rem", cursor: "pointer", color: "var(--bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>+</button>
        </div>
      </div>

      {/* Water dot indicators */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {Array.from({ length: goal }).map((_, i) => (
          <div key={i} style={{
            width: "20px", height: "20px", borderRadius: "50%",
            background: i < glasses ? "#4a90d9" : "var(--border)",
            transition: "background 0.2s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Main NutritionScreen ──
export default function NutritionScreen({
  nutritionData,
  goals,
  onAddMeal,
  onDeleteMeal,
  onSetWater,
  viewedDate,
  onNavigateDay,
}) {
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const today = todayString();
  const isToday = viewedDate === today;

  const dayData = nutritionData[viewedDate] || { meals: [], water: 0 };
  const meals = dayData.meals || [];
  const water = dayData.water || 0;

  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fats: acc.fats + (meal.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const calPct = goals.calories > 0 ? Math.min((totals.calories / goals.calories) * 100, 100) : 0;
  const calRemaining = Math.max(0, goals.calories - totals.calories);

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 0 100px", boxSizing: "border-box",
    }}>
      {showAddMeal && (
        <AddMealSheet
          onAdd={meal => onAddMeal(viewedDate, meal)}
          onClose={() => setShowAddMeal(false)}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px", padding: "0 20px", boxSizing: "border-box" }}>

        {/* Title */}
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px", textAlign: "center" }}>
          Nutrition
        </h1>

        {/* Date nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "8px", marginBottom: "24px", position: "relative",
        }}>
          <button onClick={() => onNavigateDay(-1)} style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "6px",
            width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)",
            fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
          }}>‹</button>
          <div style={{ textAlign: "center", width: "150px" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
              {new Date(...viewedDate.split("-").map((n, i) => i === 1 ? n - 1 : Number(n))).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p style={{ fontSize: "0.72rem", color: isToday ? "var(--text-muted)" : "transparent", marginTop: "2px" }}>Today</p>
          </div>
          <button onClick={() => onNavigateDay(1)} style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "6px",
            width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)",
            fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
          }}>›</button>
        </div>

        {/* Calorie summary card */}
        <div style={{
          background: "var(--bg-card)", borderRadius: "16px", padding: "20px",
          boxShadow: "var(--shadow)", marginBottom: "16px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {totals.calories}
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                of {goals.calories} kcal
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {calRemaining}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>remaining</p>
            </div>
          </div>

          {/* Calorie bar */}
          <div style={{ height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", marginBottom: "20px" }}>
            <div style={{
              height: "100%", width: `${calPct}%`,
              background: calPct >= 100 ? "#e05252" : "var(--text-primary)",
              borderRadius: "99px", transition: "width 0.3s ease",
            }} />
          </div>

          {/* Macro bars */}
          <div style={{ display: "flex", gap: "16px" }}>
            <MacroBar label="Protein" value={totals.protein} goal={goals.protein} colour="#4a90d9" />
            <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} colour="#f0a500" />
            <MacroBar label="Fats" value={totals.fats} goal={goals.fats} colour="#9b59b6" />
          </div>
        </div>

        {/* Water */}
        <WaterTracker
          glasses={water}
          goal={goals.water}
          onAdd={() => onSetWater(viewedDate, water + 1)}
          onRemove={() => onSetWater(viewedDate, water - 1)}
        />

        {/* Meals list */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{
              fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>Meals</p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {meals.length} logged
            </p>
          </div>

          {meals.length === 0 ? (
            <div style={{
              background: "var(--bg-card)", borderRadius: "12px", padding: "24px",
              boxShadow: "var(--shadow)", textAlign: "center",
            }}>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>No meals logged yet.</p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginTop: "4px" }}>Tap + to add your first meal.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {meals.map(meal => (
                <div key={meal.id} style={{
                  background: "var(--bg-card)", borderRadius: "12px", padding: "14px 16px",
                  boxShadow: "var(--shadow)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {meal.name}
                      </p>
                      {meal.aiEstimated && (
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>✨ AI</span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {meal.calories} kcal
                      {meal.protein > 0 && ` · ${meal.protein}g protein`}
                      {meal.carbs > 0 && ` · ${meal.carbs}g carbs`}
                      {meal.fats > 0 && ` · ${meal.fats}g fat`}
                    </p>
                    <p style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "2px" }}>
                      {formatTime(meal.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteMeal(viewedDate, meal.id)}
                    style={{
                      background: "none", border: "none", color: "var(--text-faint)",
                      fontSize: "1.2rem", cursor: "pointer", padding: "4px 8px",
                      lineHeight: 1, flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add meal button */}
        <button
          onClick={() => setShowAddMeal(true)}
          style={{
            width: "100%", padding: "14px",
            background: "var(--text-primary)", color: "var(--bg)",
            border: "none", borderRadius: "10px",
            fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          + Log Meal
        </button>

      </div>
    </div>
  );
}
