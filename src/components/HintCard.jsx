import { useState } from "react";
import { useHint } from "../lib/hintService";

export default function HintCard({ hintId, text, sub }) {
  const { shouldShow, dismiss } = useHint(hintId);
  const [visible, setVisible] = useState(shouldShow);

  if (!visible) return null;

  function handleDismiss() {
    dismiss();
    setVisible(false);
  }

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "12px 14px",
      marginBottom: "16px",
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      boxShadow: "var(--shadow)",
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: sub ? "3px" : "0" }}>
          {text}
        </p>
        {sub && (
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
            {sub}
          </p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: "none", border: "none",
          color: "var(--text-faint)", fontSize: "1.1rem",
          cursor: "pointer", padding: "0 2px",
          lineHeight: 1, flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}
