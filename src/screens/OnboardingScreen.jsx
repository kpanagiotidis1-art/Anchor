import { useState } from "react";

const ONBOARDING_KEY = "anchor-onboarding-complete";
const FOCUS_KEY = "anchor-focus-mode";

// ── Persistence helpers ──
export function isOnboardingComplete() {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function getFocusMode() {
  return localStorage.getItem(FOCUS_KEY) || null; // "discipline" | "fitness" | "balanced" | null
}

function saveFocusMode(mode) {
  if (mode) localStorage.setItem(FOCUS_KEY, mode);
}

// ── Intro slides — keep the emotional identity ──
const SLIDES = [
  {
    icon: "⚓",
    headline: "Anchor keeps your day in one place.",
    body: "Tasks, training, nutrition, and progress — kept together, quietly.",
  },
  {
    icon: "◎",
    headline: "Morning. Afternoon. Night.",
    body: "Your day is divided into three anchors. Not a strict schedule — just a way to give each part a shape.",
  },
  {
    icon: "→",
    headline: "Not perfect. Just present.",
    body: "Every time you return, the record grows. Consistency builds in the background.",
  },
];

const FOCUS_OPTIONS = [
  {
    key: "discipline",
    label: "Build discipline",
    sub: "Structure, routines, and daily consistency",
  },
  {
    key: "fitness",
    label: "Improve fitness",
    sub: "Training, nutrition, and physical progress",
  },
  {
    key: "balanced",
    label: "Keep life steady",
    sub: "A calm overview of everything at once",
  },
];

// Pill dot — stretches when active
function Dot({ active }) {
  return (
    <div style={{
      width: active ? "20px" : "6px",
      height: "6px",
      borderRadius: "99px",
      background: active ? "var(--text-primary)" : "var(--border)",
      transition: "width 0.3s ease, background 0.3s ease",
    }} />
  );
}

export default function OnboardingScreen({ onComplete }) {
  const TOTAL = SLIDES.length + 1; // slides + focus step
  const [step, setStep] = useState(0); // 0-2 = slides, 3 = focus
  const [selectedFocus, setSelectedFocus] = useState(null);

  const isSlide = step < SLIDES.length;
  const isFocusStep = step === SLIDES.length;
  const isLastSlide = step === SLIDES.length - 1;

  function handleNext() {
    if (isLastSlide) {
      setStep(SLIDES.length); // go to focus step
    } else if (isSlide) {
      setStep(s => s + 1);
    }
  }

  function handleComplete(focus) {
    saveFocusMode(focus || selectedFocus);
    markOnboardingComplete();
    onComplete();
  }

  function handleSkip() {
    markOnboardingComplete();
    onComplete();
  }

  const containerStyle = {
    width: "100%",
    minHeight: "100vh",
    background: "var(--bg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px 60px",
    boxSizing: "border-box",
    position: "relative",
  };

  // ── Intro slides ──
  if (isSlide) {
    const current = SLIDES[step];
    return (
      <div style={containerStyle}>
        {/* Skip — only on non-last slides */}
        {!isLastSlide && (
          <button onClick={handleSkip} style={{
            position: "absolute", top: "52px", right: "24px",
            background: "none", border: "none",
            fontSize: "0.85rem", color: "var(--text-muted)",
            cursor: "pointer", fontFamily: "inherit",
          }}>Skip</button>
        )}

        {/* Slide content */}
        <div style={{
          width: "100%", maxWidth: "360px",
          display: "flex", flexDirection: "column",
          alignItems: "center", flex: 1, justifyContent: "center",
        }}>
          <p style={{ fontSize: "3.5rem", marginBottom: "40px", lineHeight: 1 }}>
            {current.icon}
          </p>
          <h1 style={{
            fontSize: "2rem", fontWeight: 700,
            color: "var(--text-primary)", textAlign: "center",
            lineHeight: 1.2, marginBottom: "16px",
            letterSpacing: "-0.02em",
          }}>
            {current.headline}
          </h1>
          <p style={{
            fontSize: "1rem", color: "var(--text-muted)",
            textAlign: "center", lineHeight: 1.6, maxWidth: "280px",
          }}>
            {current.body}
          </p>
        </div>

        {/* Bottom */}
        <div style={{
          width: "100%", maxWidth: "360px",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: "24px",
        }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {Array.from({ length: TOTAL }).map((_, i) => <Dot key={i} active={i === step} />)}
          </div>
          <button onClick={handleNext} style={{
            width: "100%", padding: "16px",
            background: "var(--text-primary)", color: "var(--bg)",
            border: "none", borderRadius: "12px",
            fontSize: "1rem", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            letterSpacing: "0.01em",
          }}>
            {isLastSlide ? "Almost there" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  // ── Focus selection step ──
  return (
    <div style={containerStyle}>
      <div style={{
        width: "100%", maxWidth: "360px",
        display: "flex", flexDirection: "column",
        flex: 1, justifyContent: "center",
      }}>

        {/* Header */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{
            fontSize: "1.8rem", fontWeight: 700,
            color: "var(--text-primary)", lineHeight: 1.2,
            letterSpacing: "-0.02em", marginBottom: "8px",
          }}>
            What are you focusing on right now?
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Anchor will quietly surface what matters most for your focus. You can change this any time.
          </p>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
          {FOCUS_OPTIONS.map(opt => {
            const isSelected = selectedFocus === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSelectedFocus(opt.key)}
                style={{
                  width: "100%",
                  padding: "16px 18px",
                  background: isSelected ? "var(--bg-card)" : "var(--bg-card)",
                  border: isSelected
                    ? "1.5px solid var(--text-primary)"
                    : "1.5px solid var(--border)",
                  borderRadius: "14px",
                  cursor: "pointer",
                  textAlign: "left",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease",
                  fontFamily: "inherit",
                }}
              >
                <p style={{
                  fontSize: "0.95rem", fontWeight: 600,
                  color: "var(--text-primary)", marginBottom: "3px",
                }}>
                  {opt.label}
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {opt.sub}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        width: "100%", maxWidth: "360px",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: "16px",
      }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {Array.from({ length: TOTAL }).map((_, i) => <Dot key={i} active={i === step} />)}
        </div>

        <button
          onClick={() => handleComplete(selectedFocus)}
          disabled={!selectedFocus}
          style={{
            width: "100%", padding: "16px",
            background: selectedFocus ? "var(--text-primary)" : "var(--border)",
            color: selectedFocus ? "var(--bg)" : "var(--text-muted)",
            border: "none", borderRadius: "12px",
            fontSize: "1rem", fontWeight: 600,
            cursor: selectedFocus ? "pointer" : "default",
            fontFamily: "inherit",
            transition: "background 0.2s ease, color 0.2s ease",
          }}
        >
          Start
        </button>

        <button
          onClick={() => handleComplete(null)}
          style={{
            background: "none", border: "none",
            fontSize: "0.85rem", color: "var(--text-muted)",
            cursor: "pointer", fontFamily: "inherit",
            padding: "4px",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
