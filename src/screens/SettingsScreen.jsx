import { FOCUS_OPTIONS, setFocusMode } from "../lib/focusConfig";

const DURATION_OPTIONS = [
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
  { label: "90s", value: 90 },
  { label: "120s", value: 120 },
];

function SettingRow({ label, subtitle, children }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 0",
      borderBottom: "1px solid var(--border-light)",
      gap: "16px",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.3 }}>
          {label}
        </p>
        {subtitle && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: "48px",
        height: "28px",
        borderRadius: "14px",
        border: "none",
        background: value ? "var(--text-primary)" : "var(--border)",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s ease",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div style={{
        position: "absolute",
        top: "3px",
        left: value ? "23px" : "3px",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "var(--bg-card)",
        transition: "left 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function SectionHeader({ label }) {
  return (
    <p style={{
      fontSize: "0.7rem",
      fontWeight: 600,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "4px",
      marginTop: "8px",
    }}>
      {label}
    </p>
  );
}

function SettingsCard({ children }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "12px",
      padding: "0 16px",
      boxShadow: "var(--shadow)",
      marginBottom: "24px",
    }}>
      {children}
    </div>
  );
}

export default function SettingsScreen({ settings, onUpdateSetting, userEmail, onLogout, onBack, focusMode, onFocusChange }) {
  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--bg)",
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

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none",
            fontSize: "0.9rem", color: "var(--text-secondary)",
            cursor: "pointer", padding: 0,
            textAlign: "left", marginBottom: "28px",
          }}
        >← Back</button>

        <h1 style={{
          fontSize: "1.7rem", fontWeight: 700,
          color: "var(--text-primary)", marginBottom: "28px",
        }}>
          Settings
        </h1>

        {/* ── Account ── */}
        <SectionHeader label="Account" />
        <SettingsCard>
          <SettingRow
            label="Signed in as"
            subtitle={userEmail}
          >
            <button
              onClick={onLogout}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </SettingRow>
        </SettingsCard>

        {/* ── Appearance ── */}
        <SectionHeader label="Appearance" />
        <SettingsCard>
          <SettingRow
            label="Dark Mode"
            subtitle="Easier on the eyes at night"
          >
            <Toggle
              value={settings.darkMode}
              onChange={val => onUpdateSetting("darkMode", val)}
            />
          </SettingRow>
        </SettingsCard>

        {/* ── Workout ── */}
        <SectionHeader label="Workout" />
        <SettingsCard>
          <SettingRow
            label="Rest Timer"
            subtitle="Auto-start after logging a set"
          >
            <Toggle
              value={settings.restTimerEnabled}
              onChange={val => onUpdateSetting("restTimerEnabled", val)}
            />
          </SettingRow>

          {/* Default duration — only shown when rest timer is enabled */}
          {settings.restTimerEnabled && (
            <SettingRow label="Default Duration">
              <div style={{ display: "flex", gap: "6px" }}>
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onUpdateSetting("restTimerDuration", opt.value)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: settings.restTimerDuration === opt.value
                        ? "var(--text-primary)"
                        : "var(--border)",
                      background: settings.restTimerDuration === opt.value
                        ? "var(--text-primary)"
                        : "none",
                      color: settings.restTimerDuration === opt.value
                        ? "var(--bg-card)"
                        : "var(--text-secondary)",
                      fontSize: "0.78rem",
                      fontWeight: settings.restTimerDuration === opt.value ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingRow>
          )}

          <SettingRow
            label="Smart Tracking Suggestions"
            subtitle="Suggest time or cardio mode based on exercise name"
          >
            <Toggle
              value={settings.smartSuggestionsEnabled}
              onChange={val => onUpdateSetting("smartSuggestionsEnabled", val)}
            />
          </SettingRow>
        </SettingsCard>

        {/* ── Nutrition ── */}
        <SectionHeader label="Nutrition Goals" />
        <SettingsCard>
          {[
            { key: "calories", label: "Daily Calories", unit: "kcal" },
            { key: "protein", label: "Protein", unit: "g" },
            { key: "carbs", label: "Carbs", unit: "g" },
            { key: "fats", label: "Fats", unit: "g" },
            { key: "water", label: "Water", unit: "glasses" },
          ].map(goal => (
            <SettingRow key={goal.key} label={goal.label} subtitle={`Daily target in ${goal.unit}`}>
              <input
                type="number"
                min="0"
                value={settings.nutritionGoals?.[goal.key] ?? ""}
                onChange={e => onUpdateSetting("nutritionGoals", {
                  ...settings.nutritionGoals,
                  [goal.key]: Number(e.target.value),
                })}
                style={{
                  width: "72px",
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  textAlign: "right",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </SettingRow>
          ))}
        </SettingsCard>

        {/* ── Your focus ── */}
        <SectionHeader label="Your Focus" />
        <div style={{
          background: "var(--bg-card)",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "var(--shadow)",
          marginBottom: "24px",
        }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.5 }}>
            This shapes what Anchor highlights first. You can change it any time.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {FOCUS_OPTIONS.map(opt => {
              const isSelected = (focusMode || "balanced") === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    setFocusMode(opt.key);
                    if (onFocusChange) onFocusChange(opt.key);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: isSelected ? "var(--bg-subtle)" : "none",
                    border: `1px solid ${isSelected ? "var(--text-primary)" : "var(--border)"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease, background 0.2s ease",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p style={{
                      fontSize: "0.88rem", fontWeight: isSelected ? 600 : 500,
                      color: "var(--text-primary)", marginBottom: "2px",
                    }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {opt.sub}
                    </p>
                  </div>
                  {/* Selection indicator */}
                  <div style={{
                    width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${isSelected ? "var(--text-primary)" : "var(--border)"}`,
                    background: isSelected ? "var(--text-primary)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}>
                    {isSelected && (
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--bg-card)" }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Version */}
        <p style={{
          textAlign: "center",
          fontSize: "0.72rem",
          color: "var(--text-faint)",
          marginTop: "8px",
        }}>
          Anchor · Built with intention
        </p>

      </div>
    </div>
  );
}
