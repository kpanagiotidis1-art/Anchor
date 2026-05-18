import { useState } from "react";

const ONBOARDING_KEY = "anchor-onboarding-complete";

export function isOnboardingComplete() {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

const SLIDES = [
  {
    headline: "Build consistency.",
    body: "Small daily actions compound into the person you want to become.",
    icon: "⚓",
  },
  {
    headline: "One place for everything.",
    body: "Tasks, workouts, and nutrition — tracked together so nothing falls through the cracks.",
    icon: "◎",
  },
  {
    headline: "Stay anchored.",
    body: "Not perfect. Just consistent. That's the whole game.",
    icon: "→",
  },
];

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
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  function handleNext() {
    if (isLast) {
      markOnboardingComplete();
      onComplete();
    } else {
      setSlide(s => s + 1);
    }
  }

  function handleSkip() {
    markOnboardingComplete();
    onComplete();
  }

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 32px 60px",
      boxSizing: "border-box",
      position: "relative",
    }}>

      {/* Skip */}
      {!isLast && (
        <button
          onClick={handleSkip}
          style={{
            position: "absolute",
            top: "52px",
            right: "24px",
            background: "none",
            border: "none",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Skip
        </button>
      )}

      {/* Content */}
      <div style={{
        width: "100%",
        maxWidth: "360px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
      }}>

        {/* Icon */}
        <p style={{
          fontSize: "3.5rem",
          marginBottom: "40px",
          lineHeight: 1,
          transition: "opacity 0.3s ease",
        }}>
          {current.icon}
        </p>

        {/* Headline */}
        <h1 style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          textAlign: "center",
          lineHeight: 1.2,
          marginBottom: "16px",
          letterSpacing: "-0.02em",
        }}>
          {current.headline}
        </h1>

        {/* Body */}
        <p style={{
          fontSize: "1rem",
          color: "var(--text-muted)",
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: "280px",
        }}>
          {current.body}
        </p>
      </div>

      {/* Bottom */}
      <div style={{
        width: "100%",
        maxWidth: "360px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
      }}>

        {/* Dots */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {SLIDES.map((_, i) => <Dot key={i} active={i === slide} />)}
        </div>

        {/* CTA */}
        <button
          onClick={handleNext}
          style={{
            width: "100%",
            padding: "16px",
            background: "var(--text-primary)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.01em",
          }}
        >
          {isLast ? "Get started" : "Continue"}
        </button>
      </div>

    </div>
  );
}
