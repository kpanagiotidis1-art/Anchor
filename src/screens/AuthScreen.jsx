import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Account created — check your email to confirm, then log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Auth state change in App.jsx will handle the redirect
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    fontSize: "16px",
    outline: "none",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "380px",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Title */}
        <h1 style={{
          fontSize: "2.2rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          textAlign: "center",
          marginBottom: "8px",
        }}>
          Anchor
        </h1>
        <p style={{
          fontSize: "0.88rem",
          color: "var(--text-muted)",
          textAlign: "center",
          marginBottom: "48px",
        }}>
          {mode === "login" ? "Welcome back." : "Create your account."}
        </p>

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, marginBottom: "12px" }}
          autoComplete="email"
          autoCapitalize="none"
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(""); }}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, marginBottom: "8px" }}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        {/* Error */}
        {error && (
          <p style={{
            fontSize: "0.82rem",
            color: "#e05252",
            marginBottom: "12px",
            lineHeight: 1.4,
          }}>{error}</p>
        )}

        {/* Success message */}
        {message && (
          <p style={{
            fontSize: "0.82rem",
            color: "#4caf50",
            marginBottom: "12px",
            lineHeight: 1.4,
          }}>{message}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "var(--border)" : "var(--text-primary)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            marginBottom: "20px",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
        </button>

        {/* Toggle mode */}
        <button
          onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
          style={{
            background: "none",
            border: "none",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>

      </div>
    </div>
  );
}
