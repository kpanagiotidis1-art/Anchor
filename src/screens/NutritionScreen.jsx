import { useState, useRef } from "react";
import HintCard from "../components/HintCard";

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
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {CATEGORIES.map((cat, i) => (
        <button key={cat} onClick={() => onChange(CATEGORY_KEYS[i])} style={{
          padding: "7px 16px", borderRadius: "20px", border: "1px solid",
          borderColor: value === CATEGORY_KEYS[i] ? "var(--text-primary)" : "var(--border)",
          background: value === CATEGORY_KEYS[i] ? "var(--text-primary)" : "none",
          color: value === CATEGORY_KEYS[i] ? "var(--bg)" : "var(--text-secondary)",
          fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
        }}>{cat}</button>
      ))}
    </div>
  );
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

// ── Sheet wrapper ──
function Sheet({ onClose, children }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{ position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0", padding: "24px 20px 48px", zIndex: 301, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border)", borderRadius: "99px", margin: "0 auto 20px" }} />
        {children}
      </div>
    </div>
  );
}

// ── Meal form (shared by manual + AI review) ──
function MealFormSheet({ onAdd, onClose, prefill, initialCategory }) {
  const [category, setCategory] = useState(prefill?.category || initialCategory || "breakfast");
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
      aiNotes: prefill?.aiNotes || null,
      // Store original AI name separately so edits don't overwrite it
      originalAiName: prefill?.source === "ai" ? prefill?.name : null,
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {prefill?.source === "ai" ? "Review Meal" : "Log Meal"}
        </p>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {prefill?.source === "ai" && (
        <div style={{ background: "var(--bg-subtle)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 600, marginBottom: "2px" }}>✨ Estimated macros — review before saving</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Confidence: {prefill.aiConfidence || "medium"} · Adjust values if needed</p>
          {prefill.aiNotes && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", fontStyle: "italic" }}>{prefill.aiNotes}</p>}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        {fieldLabel("Category")}
        <CategoryPicker value={category} onChange={setCategory} />
      </div>

      <div style={{ marginBottom: "14px" }}>
        {fieldLabel("Meal name *")}
        <input autoFocus type="text" placeholder="e.g. Chicken salad"
          value={name} onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSave()} style={inputStyle} />
      </div>

      <div style={{ marginBottom: "14px" }}>
        {fieldLabel("Calories (kcal) *")}
        <input type="number" min="0" placeholder="450"
          value={calories} onChange={e => { setCalories(e.target.value); setError(""); }} style={inputStyle} />
      </div>

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
    </Sheet>
  );
}

// ── Category-first choice sheet ──
// Step 1: pick category. Step 2: scan or manual.
function AddMealFlow({ onAdd, onClose }) {
  const [step, setStep] = useState("category"); // category | method | ai-scan | ai-context | manual | ai-review
  const [category, setCategory] = useState("breakfast");
  const [aiPrefill, setAiPrefill] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [userContext, setUserContext] = useState("");
  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  function handleFileSelected(file) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setScanError("Please select a JPEG, PNG, or WebP image."); return; }
    // Store file and show optional context step
    setPendingFile(file);
    setUserContext("");
    setScanError("");
    setStep("ai-context");
  }

  async function handleAnalyse() {
    if (!pendingFile) return;
    setScanning(true); setScanError("");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(pendingFile);
      });
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: pendingFile.type,
          userContext: userContext.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("AI scan failed");
      const data = await response.json();
      setAiPrefill({
        name: data.meal_name, calories: data.estimated_calories,
        protein: data.protein_g, carbs: data.carbs_g, fats: data.fat_g,
        source: "ai", aiConfidence: data.confidence, aiNotes: data.notes,
        category,
      });
      setStep("ai-review");
    } catch (err) {
      setScanError(err.message || "Something went wrong. Try again or add manually.");
      setStep("ai-scan");
    } finally {
      setScanning(false);
    }
  }

  // Step: category
  if (step === "category") {
    return (
      <Sheet onClose={onClose}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Log Meal</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
          Which meal?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {CATEGORIES.map((cat, i) => (
            <button key={cat} onClick={() => { setCategory(CATEGORY_KEYS[i]); setStep("method"); }} style={{
              padding: "14px 16px", background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "12px", cursor: "pointer", textAlign: "left", boxShadow: "var(--shadow)",
              fontSize: "0.95rem", fontWeight: 500, color: "var(--text-primary)", fontFamily: "inherit",
            }}>{cat}</button>
          ))}
        </div>
      </Sheet>
    );
  }

  // Step: method
  if (step === "method") {
    const catLabel = CATEGORIES[CATEGORY_KEYS.indexOf(category)];
    return (
      <Sheet onClose={onClose}>
        <button onClick={() => setStep("category")} style={{ background: "none", border: "none", fontSize: "0.88rem", color: "var(--text-muted)", cursor: "pointer", padding: 0, marginBottom: "16px", fontFamily: "inherit" }}>← {catLabel}</button>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>How to log?</p>
        <button onClick={() => setStep("ai-scan")} style={{
          width: "100%", padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "12px", cursor: "pointer", textAlign: "left", marginBottom: "10px", boxShadow: "var(--shadow)",
        }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px", fontFamily: "inherit" }}>✨ Scan with AI</p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Photo → AI estimates macros</p>
        </button>
        <button onClick={() => setStep("manual")} style={{
          width: "100%", padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "12px", cursor: "pointer", textAlign: "left", boxShadow: "var(--shadow)",
        }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px", fontFamily: "inherit" }}>Add manually</p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Enter meal name and macros</p>
        </button>
      </Sheet>
    );
  }

  // Step: ai-scan
  if (step === "ai-scan") {
    return (
      <Sheet onClose={onClose}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFileSelected(e.target.files?.[0])} />
        <button onClick={() => setStep("method")} style={{ background: "none", border: "none", fontSize: "0.88rem", color: "var(--text-muted)", cursor: "pointer", padding: 0, marginBottom: "16px", fontFamily: "inherit" }}>← Back</button>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>Scan with AI</p>

        {scanError && <div style={{ background: "var(--bg-subtle)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}><p style={{ fontSize: "0.85rem", color: "#e05252" }}>{scanError}</p></div>}
        <button onClick={() => { fileInputRef.current.setAttribute("capture", "environment"); fileInputRef.current.click(); }} style={{
          width: "100%", padding: "15px", background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", marginBottom: "10px",
        }}>📷 Take Photo</button>
        <button onClick={() => { fileInputRef.current.removeAttribute("capture"); fileInputRef.current.click(); }} style={{
          width: "100%", padding: "15px", background: "none", color: "var(--text-primary)",
          border: "1px solid var(--border)", borderRadius: "12px", fontSize: "0.95rem",
          cursor: "pointer", fontFamily: "inherit", marginBottom: "14px",
        }}>🖼 Choose from Library</button>
        <p style={{ fontSize: "0.72rem", color: "var(--text-faint)", textAlign: "center" }}>AI estimates are approximate. Always review before saving.</p>
      </Sheet>
    );
  }

  // Step: ai-context — optional description after photo selected, before scanning
  if (step === "ai-context") {
    return (
      <Sheet onClose={!scanning ? onClose : undefined}>
        {scanning ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontSize: "2rem", marginBottom: "12px" }}>✨</p>
            <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Analysing your meal…</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>This takes a few seconds</p>
          </div>
        ) : (
          <>
            <button onClick={() => setStep("ai-scan")} style={{ background: "none", border: "none", fontSize: "0.88rem", color: "var(--text-muted)", cursor: "pointer", padding: 0, marginBottom: "16px", fontFamily: "inherit" }}>← Retake photo</button>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Photo ready</p>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>Add details to improve accuracy — or scan now.</p>

            <input
              type="text"
              placeholder='e.g. "Lamb souvlaki with chips"'
              value={userContext}
              onChange={e => setUserContext(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyse()}
              autoFocus
              style={{
                width: "100%", padding: "14px", border: "1px solid var(--border)",
                borderRadius: "10px", fontSize: "0.95rem", outline: "none",
                background: "var(--bg-input)", color: "var(--text-primary)",
                boxSizing: "border-box", fontFamily: "inherit", marginBottom: "12px",
              }}
            />
            <p style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginBottom: "20px" }}>
              Optional — describe the dish, portion, or ingredients for a better estimate.
            </p>

            <button onClick={handleAnalyse} style={{
              width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)",
              border: "none", borderRadius: "10px", fontSize: "0.95rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", marginBottom: "10px",
            }}>
              {userContext.trim() ? "Scan with details" : "Scan now"}
            </button>
          </>
        )}
      </Sheet>
    );
  }

  // Step: manual or ai-review — use MealFormSheet
  if (step === "manual" || step === "ai-review") {
    return (
      <MealFormSheet
        prefill={step === "ai-review" ? aiPrefill : null}
        initialCategory={category}
        onAdd={meal => { onAdd(meal); onClose(); }}
        onClose={onClose}
      />
    );
  }

  return null;
}

// ── Meal Details Sheet ──
function MealDetailsSheet({ meal, onClose, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(meal.name);
  const [category, setCategory] = useState(meal.category || "snacks");
  const [calories, setCalories] = useState(meal.calories?.toString() || "");
  const [protein, setProtein] = useState(meal.protein?.toString() || "");
  const [carbs, setCarbs] = useState(meal.carbs?.toString() || "");
  const [fats, setFats] = useState(meal.fats?.toString() || "");
  const [notes, setNotes] = useState(meal.notes || "");
  const [error, setError] = useState("");

  function handleSave() {
    if (!name.trim()) { setError("Please enter a meal name."); return; }
    if (!calories || isNaN(Number(calories))) { setError("Please enter valid calories."); return; }
    onUpdate({
      ...meal,                          // preserve id, source, aiConfidence, aiNotes, originalAiName, createdAt
      name: name.trim(),
      category,
      calories: Math.round(Number(calories)),
      protein: Math.round(Number(protein) || 0),
      carbs: Math.round(Number(carbs) || 0),
      fats: Math.round(Number(fats) || 0),
      notes: notes.trim(),
    });
    setEditing(false);
    onClose();
  }

  const catLabel = CATEGORIES[CATEGORY_KEYS.indexOf(meal.category)] || "Snacks";

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {editing ? "Edit Meal" : "Meal Details"}
        </p>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {!editing ? (
        <>
          {/* Details view */}
          {meal.source === "ai" && (
            <div style={{ background: "var(--bg-subtle)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                ✨ AI scan · Confidence: {meal.aiConfidence || "medium"}
              </p>
              {/* Show original AI name only if user has edited it */}
              {meal.originalAiName && meal.originalAiName !== meal.name && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
                  Originally identified as "{meal.originalAiName}"
                </p>
              )}
              {meal.aiNotes && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px", fontStyle: "italic" }}>{meal.aiNotes}</p>
              )}
            </div>
          )}

          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{meal.name}</p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "20px" }}>
            {catLabel} · {formatTime(meal.createdAt)} · {meal.source === "ai" ? "AI scan" : "Manual"}
          </p>

          {/* Macro grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
            {[
              { label: "Calories", value: `${meal.calories} kcal` },
              { label: "Protein", value: `${meal.protein}g` },
              { label: "Carbs", value: `${meal.carbs}g` },
              { label: "Fats", value: `${meal.fats}g` },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--bg-card)", borderRadius: "10px", padding: "12px 14px", boxShadow: "var(--shadow-sm)" }}>
                <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {meal.notes && (
            <div style={{ background: "var(--bg-subtle)", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Notes</p>
              <p style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{meal.notes}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setEditing(true)} style={{
              flex: 1, padding: "13px", background: "var(--text-primary)", color: "var(--bg)",
              border: "none", borderRadius: "10px", fontSize: "0.92rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>Edit</button>
            <button onClick={() => { onDelete(meal.id); onClose(); }} style={{
              flex: 1, padding: "13px", background: "none", color: "#e05252",
              border: "1px solid #e05252", borderRadius: "10px", fontSize: "0.92rem",
              cursor: "pointer", fontFamily: "inherit",
            }}>Delete</button>
          </div>
        </>
      ) : (
        <>
          {/* Edit view */}
          <div style={{ marginBottom: "16px" }}>
            {fieldLabel("Category")}
            <CategoryPicker value={category} onChange={setCategory} />
          </div>
          <div style={{ marginBottom: "14px" }}>
            {fieldLabel("Meal name *")}
            <input autoFocus type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }} style={inputStyle} />
          </div>
          <div style={{ marginBottom: "14px" }}>
            {fieldLabel("Calories (kcal) *")}
            <input type="number" min="0" value={calories} onChange={e => { setCalories(e.target.value); setError(""); }} style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            {[
              { label: "Protein (g)", val: protein, set: setProtein },
              { label: "Carbs (g)", val: carbs, set: setCarbs },
              { label: "Fats (g)", val: fats, set: setFats },
            ].map(f => (
              <div key={f.label} style={{ flex: 1 }}>
                {fieldLabel(f.label)}
                <input type="number" min="0" value={f.val} onChange={e => f.set(e.target.value)} style={{ ...inputStyle, padding: "10px" }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "20px" }}>
            {fieldLabel("Notes (optional)")}
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
          </div>
          {error && <p style={{ color: "#e05252", fontSize: "0.82rem", marginBottom: "12px" }}>{error}</p>}
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleSave} style={{
              flex: 1, padding: "13px", background: "var(--text-primary)", color: "var(--bg)",
              border: "none", borderRadius: "10px", fontSize: "0.92rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>Save</button>
            <button onClick={() => setEditing(false)} style={{
              flex: 1, padding: "13px", background: "none", color: "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: "10px", fontSize: "0.92rem",
              cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

// ── Water tracker ──
function WaterTracker({ glasses, goal, onAdd, onRemove }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--shadow)", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>Water</p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{glasses} / {goal} glasses · {glasses * 250}ml</p>
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

// ── Meal card — tappable ──
function MealCard({ meal, onTap, onDelete }) {
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%", background: "var(--bg-card)", border: "none",
        borderRadius: "12px", padding: "12px 16px", boxShadow: "var(--shadow)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", textAlign: "left", boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
          <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>{meal.name}</p>
          {meal.source === "ai" && <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "1px 5px", borderRadius: "4px" }}>AI</span>}
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {meal.calories} kcal{meal.protein > 0 ? ` · ${meal.protein}g P` : ""}
          {meal.carbs > 0 ? ` · ${meal.carbs}g C` : ""}
          {meal.fats > 0 ? ` · ${meal.fats}g F` : ""}
        </p>
      </div>
      <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginLeft: "8px", flexShrink: 0 }}>›</span>
    </button>
  );
}

// ── Category section ──
function CategorySection({ title, meals, onMealTap, onMealDelete }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{title}</p>
      {meals.length === 0 ? (
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "12px 16px", boxShadow: "var(--shadow)" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>Nothing logged</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {meals.map(meal => (
            <MealCard key={meal.id} meal={meal} onTap={() => onMealTap(meal)} onDelete={() => onMealDelete(meal.id)} />
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
  onUpdateMeal,
  onSetWater,
  viewedDate,
  onNavigateDay,
}) {
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);

  const today = todayString();
  const isToday = viewedDate === today;
  const dayData = nutritionData[viewedDate] || { meals: [], water: 0 };
  const meals = dayData.meals || [];
  const water = dayData.water || 0;

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

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0 100px", boxSizing: "border-box" }}>

      {showAddFlow && (
        <AddMealFlow
          onAdd={meal => onAddMeal(viewedDate, meal)}
          onClose={() => setShowAddFlow(false)}
        />
      )}

      {selectedMeal && (
        <MealDetailsSheet
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onDelete={mealId => { onDeleteMeal(viewedDate, mealId); setSelectedMeal(null); }}
          onUpdate={updatedMeal => { onUpdateMeal(viewedDate, updatedMeal); setSelectedMeal(null); }}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px", padding: "0 20px", boxSizing: "border-box" }}>

        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px", textAlign: "center" }}>Nutrition</h1>

        <HintCard
          hintId="nutrition_ai"
          text="Scan meals with AI or log manually."
          sub="Track meals in seconds with AI."
        />

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
              <p style={{
                fontSize: "2.4rem", fontWeight: 700,
                color: calPct >= 100 ? "#4caf50" : "var(--text-primary)",
                lineHeight: 1, transition: "color 0.4s ease",
              }}>{totals.calories}</p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>of {goals.calories} kcal</p>
            </div>
            <div style={{ textAlign: "right" }}>
              {calPct >= 100 ? (
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#4caf50", lineHeight: 1.3 }}>Goal reached</p>
              ) : (
                <>
                  <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>{Math.max(0, goals.calories - totals.calories)}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>remaining</p>
                </>
              )}
            </div>
          </div>

          {/* Status line — contextual, not clinical */}
          {(() => {
            const protein = totals.protein;
            const goalProtein = goals.protein ?? 150;
            const proteinLeft = goalProtein - protein;
            if (totals.calories === 0) return null;
            if (protein >= goalProtein && calPct >= 90) return (
              <p style={{ fontSize: "0.82rem", color: "#4caf50", fontWeight: 500, marginBottom: "14px" }}>
                Targets hit. Nutrition on point today.
              </p>
            );
            if (protein >= goalProtein) return (
              <p style={{ fontSize: "0.82rem", color: "#4caf50", fontWeight: 500, marginBottom: "14px" }}>
                Protein goal hit.
              </p>
            );
            if (proteinLeft > 0 && proteinLeft <= 30) return (
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                {Math.round(proteinLeft)}g protein left. Almost there.
              </p>
            );
            return null;
          })()}

          <div style={{ height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", marginBottom: "20px" }}>
            <div style={{
              height: "100%", width: `${calPct}%`,
              background: calPct >= 100 ? "#4caf50" : "var(--text-primary)",
              borderRadius: "99px",
              transition: "width 0.4s cubic-bezier(0.4,0,0.2,1), background 0.4s ease",
            }} />
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <MacroBar label="Protein" value={totals.protein} goal={goals.protein} colour="#4a90d9" />
            <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} colour="#f0a500" />
            <MacroBar label="Fats" value={totals.fats} goal={goals.fats} colour="#9b59b6" />
          </div>
        </div>

        {/* Water */}
        <WaterTracker glasses={water} goal={goals.water}
          onAdd={() => onSetWater(viewedDate, water + 1)}
          onRemove={() => onSetWater(viewedDate, water - 1)}
        />

        {/* Meals by category */}
        {CATEGORIES.map((cat, i) => (
          <CategorySection
            key={cat} title={cat}
            meals={byCategory[CATEGORY_KEYS[i]]}
            onMealTap={meal => setSelectedMeal(meal)}
            onMealDelete={mealId => onDeleteMeal(viewedDate, mealId)}
          />
        ))}

        <button onClick={() => setShowAddFlow(true)} style={{
          width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg)",
          border: "none", borderRadius: "10px", fontSize: "0.95rem", fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", marginTop: "4px",
        }}>+ Log Meal</button>

      </div>
    </div>
  );
}
