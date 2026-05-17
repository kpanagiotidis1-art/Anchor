import { useState, useRef } from "react";

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const CATEGORY_KEYS = ["breakfast", "lunch", "dinner", "snacks"];

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

// ── Macro bar ──
function MacroBar({ label, value, goal, colour }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{value}g</span>
      </div>
      <div style={{ height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: colour, borderRadius: "99px", transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

// ── Category picker ──
function CategoryPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
      {CATEGORIES.map((cat, i) => (
        <button
          key={cat}
          onClick={() => onChange(CATEGORY_KEYS[i])}
          style={{
            padding: "6px 14px", borderRadius: "20px", border: "1px solid",
            borderColor: value === CATEGORY_KEYS[i] ? "var(--text-primary)" : "var(--border)",
            background: value === CATEGORY_KEYS[i] ? "var(--text-primary)" : "none",
            color: value === CATEGORY_KEYS[i] ? "var(--bg)" : "var(--text-secondary)",
            fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit",
          }}
        >{cat}</button>
      ))}
    </div>
  );
}

// ── Add/Edit Meal Sheet ──
// prefill supports AI-estimated meals — same form, just pre-populated
function MealFormSheet({ onAdd, onClose, prefill }) {
  const [category, setCategory] = useState(prefill?.category || "breakfast");
  const [name, setName] = useState(prefill?.name || "");
  const [calories, setCalories] = useState(prefill?.calories?.toString() || "");
  const [protein, setProtein] = useState(prefill?.protein?.toString() || "");
  const [carbs, setCarbs] = useState(prefill?.carbs?.toString() || "");
  const [fats, setFats] = useState(prefill?.fats?.toString() || "");
  const [notes, setNotes] = useState(prefill?.notes || "");
  const [error, setError] = useState("");

  function handleSave() {
    if (!name.trim()) { setError("Please enter a meal name."); return; }
    if (!calories || isNaN(Number(calories)) || Number(calories) < 0) { setError("Please enter valid calories."); return; }
    onAdd({
      id: `meal-${Date.now()}`,
      category,
      name: name.trim(),
      calories: Math.round(Number(calories)),
      protein: Math.round(Number(protein) || 0),
      carbs: Math.round(Number(carbs) || 0),
      fats: Math.round(Number(fats) || 0),
      notes: notes.trim(),
      source: prefill?.source || "manual",
      aiConfidence: prefill?.aiConfidence || null,
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", border: "1px solid var(--border)",
    borderRadius: "10px", fontSize: "0.95rem", outline: "none",
    background: "var(--bg-input)", color: "var(--text-primary)",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  const fieldLabel = (label) => (
    <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{label}</p>
  );

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 48px", zIndex: 301, maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "99px", margin: "0 auto 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {prefill?.source === "ai" ? "Review Meal" : "Log Meal"}
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* AI estimate notice */}
        {prefill?.source === "ai" && (
          <div style={{ background: "var(--bg-subtle)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 600, marginBottom: "2px" }}>
              ✨ Estimated macros — review before saving
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Confidence: {prefill.aiConfidence || "medium"} · Adjust any values if needed
            </p>
            {prefill.aiNotes && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", fontStyle: "italic" }}>{prefill.aiNotes}</p>
            )}
          </div>
        )}

        {/* Category */}
        <div style={{ marginBottom: "4px" }}>
          {fieldLabel("Category")}
          <CategoryPicker value={category} onChange={setCategory} />
        </div>

        {/* Name */}
        <div style={{ marginBottom: "14px" }}>
          {fieldLabel("Meal name *")}
          <input autoFocus type="text" placeholder="e.g. Chicken salad"
            value={name} onChange={e => { setName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSave()} style={inputStyle} />
        </div>

        {/* Calories */}
        <div style={{ marginBottom: "14px" }}>
          {fieldLabel("Calories (kcal) *")}
          <input type="number" min="0" placeholder="450"
            value={calories} onChange={e => { setCalories(e.target.value); setError(""); }} style={inputStyle} />
        </div>

        {/* Macros */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
          {[
            { label: "Protein (g)", val: protein, set: setProtein, ph: "35" },
            { label: "Carbs (g)", val: carbs, set: setCarbs, ph: "40" },
            { label: "Fats (g)", val: fats, set: setFats, ph: "15" },
          ].map(f => (
            <div key={f.label} style={{ flex: 1 }}>
              {fieldLabel(f.label)}
              <input type="number" min="0" placeholder={f.ph}
                value={f.val} onChange={e => f.set(e.target.value)}
                style={{ ...inputStyle, padding: "10px" }} />
            </div>
          ))}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "20px" }}>
          {fieldLabel("Notes (optional)")}
          <input type="text" placeholder="Any notes..."
            value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "12px" }}>{error}</p>}

        <button onClick={handleSave} style={{
          width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "10px", fontSize: "0.95rem", fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}>Save Meal</button>
      </div>
    </div>
  );
}

// ── Add meal choice sheet ──
function AddMealChoiceSheet({ onSelectAI, onSelectManual, onClose }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 48px", zIndex: 301,
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "99px", margin: "0 auto 24px" }} />
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>Log Meal</p>

        <button onClick={onSelectAI} style={{
          width: "100%", padding: "16px 20px", background: "var(--bg-card)",
          border: "1px solid var(--border)", borderRadius: "12px",
          cursor: "pointer", textAlign: "left", marginBottom: "10px",
          boxShadow: "var(--shadow)",
        }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>✨ Scan with AI</p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Take or upload a photo — AI estimates the macros</p>
        </button>

        <button onClick={onSelectManual} style={{
          width: "100%", padding: "16px 20px", background: "var(--bg-card)",
          border: "1px solid var(--border)", borderRadius: "12px",
          cursor: "pointer", textAlign: "left",
          boxShadow: "var(--shadow)",
        }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>Add manually</p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Enter meal name and macros yourself</p>
        </button>
      </div>
    </div>
  );
}

// ── AI scan flow ──
function AIScanSheet({ onResult, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setErrorMsg("Please select a JPEG, PNG, or WebP image.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call serverless function — API key stays server-side
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "AI scan failed");
      }

      const data = await response.json();

      // Pass result back as prefill for the form
      onResult({
        name: data.meal_name,
        calories: data.estimated_calories,
        protein: data.protein_g,
        carbs: data.carbs_g,
        fats: data.fat_g,
        source: "ai",
        aiConfidence: data.confidence,
        aiNotes: data.notes,
      });

    } catch (err) {
      console.error("AI scan error:", err);
      setErrorMsg(err.message || "Something went wrong. Try again or add manually.");
      setStatus("error");
    }
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={status !== "loading" ? onClose : undefined} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 48px", zIndex: 301,
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "99px", margin: "0 auto 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Scan with AI</p>
          {status !== "loading" && (
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
          )}
        </div>

        {status === "loading" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: "2rem", marginBottom: "12px" }}>✨</p>
            <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Analysing your meal…</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>This takes a few seconds</p>
          </div>
        ) : (
          <>
            {status === "error" && (
              <div style={{ background: "var(--bg-subtle)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "0.85rem", color: "#e05252" }}>{errorMsg}</p>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef} type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0])}
            />

            {/* Camera capture */}
            <button
              onClick={() => { fileInputRef.current.setAttribute("capture", "environment"); fileInputRef.current.click(); }}
              style={{
                width: "100%", padding: "16px", background: "var(--text-primary)", color: "var(--bg)",
                border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", marginBottom: "10px",
              }}
            >
              📷 Take Photo
            </button>

            {/* Gallery upload */}
            <button
              onClick={() => { fileInputRef.current.removeAttribute("capture"); fileInputRef.current.click(); }}
              style={{
                width: "100%", padding: "16px", background: "none", color: "var(--text-primary)",
                border: "1px solid var(--border)", borderRadius: "12px", fontSize: "0.95rem",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              🖼 Choose from Library
            </button>

            <p style={{ fontSize: "0.72rem", color: "var(--text-faint)", textAlign: "center", marginTop: "14px" }}>
              AI estimates are approximate. Always review before saving.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Water tracker ──
function WaterTracker({ glasses, goal, onAdd, onRemove }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--shadow)", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>Water</p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {glasses} / {goal} glasses · {glasses * 250}ml
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={onRemove} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--border)", background: "none", fontSize: "1.1rem", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          <button onClick={onAdd} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "var(--text-primary)", fontSize: "1.1rem", cursor: "pointer", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {Array.from({ length: goal }).map((_, i) => (
          <div key={i} style={{ width: "20px", height: "20px", borderRadius: "50%", background: i < glasses ? "#4a90d9" : "var(--border)", transition: "background 0.2s" }} />
        ))}
      </div>
    </div>
  );
}

// ── Meal card ──
function MealCard({ meal, onDelete }) {
  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: "12px", padding: "12px 16px",
      boxShadow: "var(--shadow)", display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
          <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>{meal.name}</p>
          {meal.source === "ai" && <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "1px 5px", borderRadius: "4px" }}>AI</span>}
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {meal.calories} kcal
          {meal.protein > 0 && ` · ${meal.protein}g P`}
          {meal.carbs > 0 && ` · ${meal.carbs}g C`}
          {meal.fats > 0 && ` · ${meal.fats}g F`}
        </p>
        {meal.notes && <p style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "2px", fontStyle: "italic" }}>{meal.notes}</p>}
      </div>
      <button onClick={onDelete} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: "1.2rem", cursor: "pointer", padding: "4px 8px", lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ── Category section ──
function CategorySection({ title, meals, onDelete }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
        {title}
      </p>
      {meals.length === 0 ? (
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "14px 16px", boxShadow: "var(--shadow)" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>Nothing logged yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {meals.map(meal => (
            <MealCard key={meal.id} meal={meal} onDelete={() => onDelete(meal.id)} />
          ))}
        </div>
      )}
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
  // flow: null | "choice" | "ai-scan" | "manual" | "ai-review"
  const [flow, setFlow] = useState(null);
  const [aiPrefill, setAiPrefill] = useState(null);

  const today = todayString();
  const isToday = viewedDate === today;

  const dayData = nutritionData[viewedDate] || { meals: [], water: 0 };
  const meals = dayData.meals || [];
  const water = dayData.water || 0;

  // Group meals by category
  const byCategory = {};
  CATEGORY_KEYS.forEach(k => { byCategory[k] = []; });
  meals.forEach(meal => {
    const cat = meal.category || "snacks";
    if (byCategory[cat]) byCategory[cat].push(meal);
  });

  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fats: acc.fats + (meal.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const calPct = goals.calories > 0 ? Math.min((totals.calories / goals.calories) * 100, 100) : 0;

  function handleAIResult(prefill) {
    setAiPrefill(prefill);
    setFlow("ai-review");
  }

  function handleAddMeal(meal) {
    onAddMeal(viewedDate, meal);
    setFlow(null);
    setAiPrefill(null);
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0 100px", boxSizing: "border-box" }}>

      {/* Flow sheets */}
      {flow === "choice" && (
        <AddMealChoiceSheet
          onSelectAI={() => setFlow("ai-scan")}
          onSelectManual={() => setFlow("manual")}
          onClose={() => setFlow(null)}
        />
      )}
      {flow === "ai-scan" && (
        <AIScanSheet
          onResult={handleAIResult}
          onClose={() => setFlow("choice")}
        />
      )}
      {(flow === "manual" || flow === "ai-review") && (
        <MealFormSheet
          prefill={flow === "ai-review" ? aiPrefill : null}
          onAdd={handleAddMeal}
          onClose={() => { setFlow(null); setAiPrefill(null); }}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px", padding: "0 20px", boxSizing: "border-box" }}>

        {/* Title */}
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px", textAlign: "center" }}>Nutrition</h1>

        {/* Date nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "24px", position: "relative" }}>
          <button onClick={() => onNavigateDay(-1)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>‹</button>
          <div style={{ textAlign: "center", width: "150px" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{formatDateLong(viewedDate)}</p>
            <p style={{ fontSize: "0.72rem", color: isToday ? "var(--text-muted)" : "transparent", marginTop: "2px" }}>Today</p>
          </div>
          <button onClick={() => onNavigateDay(1)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", width: "36px", height: "36px", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>›</button>
        </div>

        {/* Calorie summary */}
        <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "20px", boxShadow: "var(--shadow)", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{totals.calories}</p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>of {goals.calories} kcal</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>{Math.max(0, goals.calories - totals.calories)}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>remaining</p>
            </div>
          </div>
          <div style={{ height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", marginBottom: "20px" }}>
            <div style={{ height: "100%", width: `${calPct}%`, background: calPct >= 100 ? "#e05252" : "var(--text-primary)", borderRadius: "99px", transition: "width 0.3s ease" }} />
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <MacroBar label="Protein" value={totals.protein} goal={goals.protein} colour="#4a90d9" />
            <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} colour="#f0a500" />
            <MacroBar label="Fats" value={totals.fats} goal={goals.fats} colour="#9b59b6" />
          </div>
        </div>

        {/* Water */}
        <WaterTracker
          glasses={water} goal={goals.water}
          onAdd={() => onSetWater(viewedDate, water + 1)}
          onRemove={() => onSetWater(viewedDate, water - 1)}
        />

        {/* Meals by category */}
        {CATEGORIES.map((cat, i) => (
          <CategorySection
            key={cat}
            title={cat}
            meals={byCategory[CATEGORY_KEYS[i]]}
            onDelete={mealId => onDeleteMeal(viewedDate, mealId)}
          />
        ))}

        {/* Log meal button */}
        <button
          onClick={() => setFlow("choice")}
          style={{
            width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)",
            border: "none", borderRadius: "10px", fontSize: "0.95rem", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", marginTop: "4px",
          }}
        >+ Log Meal</button>

      </div>
    </div>
  );
}
