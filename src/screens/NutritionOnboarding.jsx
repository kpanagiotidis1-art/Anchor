import { useState } from "react";
import { saveNutritionProfile, calculateNutritionTargets } from "../lib/nutritionService";

const INTENTIONS = [
  { key: "build",    label: "Build",       sub: "Increase muscle, eat in a surplus" },
  { key: "lean",     label: "Lean out",    sub: "Reduce body fat, controlled deficit" },
  { key: "maintain", label: "Maintain",    sub: "Stay balanced, hold your weight" },
  { key: "track",    label: "Just track",  sub: "Log meals with no fixed goal" },
];

const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Sedentary",         sub: "Mostly sitting, little exercise" },
  { key: "light",     label: "Lightly active",    sub: "1–2 workouts per week" },
  { key: "moderate",  label: "Moderate",          sub: "3–4 workouts per week" },
  { key: "active",    label: "Very active",       sub: "5+ workouts per week" },
];

const INTENTION_COPY = {
  build:    "You're here to grow. A modest surplus with high protein to support muscle gain over time.",
  lean:     "Smart deficit, high protein. You'll preserve muscle while steadily reducing body fat.",
  maintain: "Balanced and sustainable. We'll match your energy output so you hold steady.",
  track:    "No pressure. Log what you eat and build awareness — patterns will emerge on their own.",
};

function buildProfile(intention, sex, age, weightKg, heightCm, activityKey) {
  if (intention === "track") {
    return { intention, sex: "male", age: 30, weightKg: 75, heightCm: 175, activityKey: "moderate" };
  }
  return { intention, sex, age: Number(age), weightKg: Number(weightKg), heightCm: Number(heightCm), activityKey };
}

export default function NutritionOnboarding({ onComplete }) {
  const [step, setStep]             = useState(1);
  const [intention, setIntention]   = useState(null);
  const [sex, setSex]               = useState("male");
  const [age, setAge]               = useState("");
  const [weightKg, setWeightKg]     = useState("");
  const [heightCm, setHeightCm]     = useState("");
  const [activityKey, setActivityKey] = useState("moderate");

  const profileReady = age && weightKg && heightCm;
  const targets = step === 3
    ? calculateNutritionTargets(buildProfile(intention, sex, age, weightKg, heightCm, activityKey))
    : null;

  function goNext() {
    if (step === 1) {
      if (!intention) return;
      setStep(intention === "track" ? 3 : 2);
    } else if (step === 2) {
      if (!profileReady) return;
      setStep(3);
    }
  }

  function goBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(intention === "track" ? 1 : 2);
  }

  function handleConfirm() {
    const profile = { ...buildProfile(intention, sex, age, weightKg, heightCm, activityKey), setupAt: new Date().toISOString() };
    const t = calculateNutritionTargets(profile);
    saveNutritionProfile({ ...profile, targets: t });
    onComplete({ ...profile, targets: t });
  }

  // Progress dots: 3 total, step 2 dimmed for "track"
  const dots = [1, 2, 3];

  return (
    <div style={{
      width: "100%", minHeight: "100dvh",
      background: "var(--bg-deep)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "var(--space-8) var(--space-5) calc(var(--space-8) + 64px)",
      boxSizing: "border-box", overflowY: "auto",
    }}>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-8)", alignSelf: "flex-start" }}>
        {dots.map(d => {
          const isSkipped = d === 2 && intention === "track";
          const isActive  = d === step;
          const isPast    = d < step && !(d === 2 && intention === "track");
          return (
            <div key={d} style={{
              width: isActive ? "24px" : "8px",
              height: "4px", borderRadius: "2px",
              background: isActive ? "var(--text-primary)" : isPast ? "var(--text-secondary)" : isSkipped ? "var(--border-subtle)" : "var(--border-subtle)",
              transition: "width 0.3s ease, background 0.3s ease",
            }} />
          );
        })}
      </div>

      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* ── Step 1: Intention ── */}
        {step === 1 && (
          <>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 var(--space-2)" }}>
              Nutrition
            </p>
            <h1 style={{ fontSize: "var(--text-display)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 var(--space-6)", lineHeight: 1.15 }}>
              What's your focus right now?
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
              {INTENTIONS.map(opt => (
                <button key={opt.key} onClick={() => setIntention(opt.key)} style={{
                  background: intention === opt.key ? "var(--accent-subtle)" : "var(--bg-surface)",
                  border: `1px solid ${intention === opt.key ? "var(--accent-glow)" : "var(--border-light)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-4) var(--space-5)",
                  textAlign: "left", cursor: "pointer",
                  transition: "background 0.2s, border-color 0.2s",
                  boxShadow: "var(--shadow-xs)",
                }}>
                  <div style={{ fontSize: "var(--text-ui)", fontWeight: 600, color: intention === opt.key ? "var(--accent-text)" : "var(--text-primary)", marginBottom: "var(--space-1)" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)" }}>
                    {opt.sub}
                  </div>
                </button>
              ))}
            </div>

            <PrimaryButton onClick={goNext} disabled={!intention}>
              Continue
            </PrimaryButton>
          </>
        )}

        {/* ── Step 2: Profile ── */}
        {step === 2 && (
          <>
            <BackButton onClick={goBack} />
            <h1 style={{ fontSize: "var(--text-hero)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 var(--space-2)", lineHeight: 1.2 }}>
              A bit about you
            </h1>
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", margin: "0 0 var(--space-6)", lineHeight: 1.6 }}>
              Used to calculate your daily targets. Never shared.
            </p>

            {/* Sex */}
            <FieldLabel>Sex</FieldLabel>
            <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
              {["male", "female"].map(s => (
                <button key={s} onClick={() => setSex(s)} style={{
                  flex: 1, padding: "var(--space-3)",
                  background: sex === s ? "var(--text-primary)" : "var(--bg-surface)",
                  color: sex === s ? "var(--bg-deep)" : "var(--text-secondary)",
                  border: `1px solid ${sex === s ? "var(--text-primary)" : "var(--border-light)"}`,
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  fontSize: "var(--text-body)", fontWeight: sex === s ? 600 : 400,
                  textTransform: "capitalize", transition: "all 0.2s",
                }}>
                  {s === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>

            {/* Age + Weight */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div>
                <FieldLabel>Age</FieldLabel>
                <NumberInput value={age} onChange={setAge} placeholder="28" min={10} max={100} />
              </div>
              <div>
                <FieldLabel>Weight (kg)</FieldLabel>
                <NumberInput value={weightKg} onChange={setWeightKg} placeholder="75" min={30} max={300} />
              </div>
            </div>

            {/* Height */}
            <div style={{ marginBottom: "var(--space-5)" }}>
              <FieldLabel>Height (cm)</FieldLabel>
              <NumberInput value={heightCm} onChange={setHeightCm} placeholder="175" min={100} max={250} />
            </div>

            {/* Activity */}
            <FieldLabel>Activity level</FieldLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
              {ACTIVITY_LEVELS.map(a => (
                <button key={a.key} onClick={() => setActivityKey(a.key)} style={{
                  background: activityKey === a.key ? "var(--accent-subtle)" : "var(--bg-surface)",
                  border: `1px solid ${activityKey === a.key ? "var(--accent-glow)" : "var(--border-light)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-3) var(--space-4)",
                  textAlign: "left", cursor: "pointer", transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: "var(--text-body)", fontWeight: activityKey === a.key ? 600 : 400, color: activityKey === a.key ? "var(--accent-text)" : "var(--text-primary)" }}>
                    {a.label}
                  </span>
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>
                    — {a.sub}
                  </span>
                </button>
              ))}
            </div>

            <PrimaryButton onClick={goNext} disabled={!profileReady}>
              Calculate my targets
            </PrimaryButton>
          </>
        )}

        {/* ── Step 3: Targets + Confirm ── */}
        {step === 3 && targets && (
          <>
            <BackButton onClick={goBack} />
            <h1 style={{ fontSize: "var(--text-hero)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 var(--space-2)", lineHeight: 1.2 }}>
              {intention === "track" ? "Starting point" : "Your targets"}
            </h1>
            <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", margin: "0 0 var(--space-6)", lineHeight: 1.6 }}>
              {INTENTION_COPY[intention]}
            </p>

            {/* Calorie hero card */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-6)", marginBottom: "var(--space-3)",
              textAlign: "center", boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "var(--space-2)" }}>
                Daily calories
              </div>
              <div style={{ fontSize: "var(--text-display)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {targets.calories.toLocaleString()}
              </div>
              {intention !== "track" && (
                <div style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", marginTop: "var(--space-2)" }}>
                  Maintenance: {targets.tdee.toLocaleString()} kcal
                </div>
              )}
            </div>

            {/* Macro strip */}
            <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
              {[
                { label: "Protein", value: targets.protein, unit: "g" },
                { label: "Carbs",   value: targets.carbs,   unit: "g" },
                { label: "Fats",    value: targets.fats,    unit: "g" },
                { label: "Water",   value: targets.waterGlasses, unit: "gl" },
              ].map(stat => (
                <div key={stat.label} style={{
                  flex: 1, background: "var(--bg-surface)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-3) var(--space-2)",
                  textAlign: "center", boxShadow: "var(--shadow-xs)",
                }}>
                  <div style={{ fontSize: "var(--text-sub)", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>
                    {stat.value}
                    <span style={{ fontSize: "var(--text-micro)", fontWeight: 400, color: "var(--text-faint)" }}>
                      {stat.unit}
                    </span>
                  </div>
                  <div style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "var(--space-1)" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <PrimaryButton onClick={handleConfirm}>
              Set these as my targets
            </PrimaryButton>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", textAlign: "center", margin: "var(--space-3) 0 0" }}>
              Adjust any time in Settings.
            </p>
          </>
        )}

      </div>
    </div>
  );
}

// ── Local sub-components ─────────────────────────────────────────────────────

function PrimaryButton({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "var(--space-4)",
      background: disabled ? "var(--bg-inset)" : "var(--text-primary)",
      color: disabled ? "var(--text-muted)" : "var(--bg-deep)",
      border: "none", borderRadius: "var(--radius-md)",
      fontSize: "var(--text-ui)", fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.2s, color 0.2s",
    }}>
      {children}
    </button>
  );
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none",
      color: "var(--text-muted)", fontSize: "var(--text-caption)",
      cursor: "pointer", padding: 0, marginBottom: "var(--space-4)",
      display: "block",
    }}>
      ← Back
    </button>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{
      fontSize: "var(--text-caption)", color: "var(--text-muted)",
      display: "block", marginBottom: "var(--space-2)",
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, placeholder, min, max }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min} max={max}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "var(--space-3)",
        border: "1px solid var(--border-light)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-body)",
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
        outline: "none",
      }}
    />
  );
}