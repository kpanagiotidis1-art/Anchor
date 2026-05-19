import { useState } from "react";
import {
  getFinanceData, setMonthlyIncome,
  addSubscription, updateSubscription, deleteSubscription,
  addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
  getMonthlySubTotal, getAnnualSubTotal,
} from "../lib/financeService";

const SUB_CATEGORIES = ["Entertainment", "Health", "Tools", "Services", "Food", "Other"];
const FREQ_LABELS = { monthly: "mo", annual: "yr", weekly: "wk" };

function fmt(n) {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDec(n) {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Sheet ─────────────────────────────────────────────────────────────────────
function Sheet({ onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "relative", background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        padding: "var(--space-5) var(--space-5) calc(var(--space-8) + 20px)",
        zIndex: 301, maxHeight: "92dvh", overflowY: "auto",
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border-light)", borderRadius: "var(--radius-pill)", margin: "0 auto var(--space-5)" }} />
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "var(--space-2)" }}>{children}</label>;
}

function TextInput({ value, onChange, placeholder, type = "text", step }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} step={step}
      style={{
        width: "100%", boxSizing: "border-box", padding: "var(--space-3)",
        border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-body)", background: "var(--bg-surface)",
        color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
      }} />
  );
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "var(--space-4)", marginTop: "var(--space-5)",
      background: disabled ? "var(--bg-inset)" : "var(--text-primary)",
      color: disabled ? "var(--text-muted)" : "var(--bg-deep)",
      border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-ui)", fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.2s",
    }}>{children}</button>
  );
}

// ── Set income sheet ──────────────────────────────────────────────────────────
function SetIncomeSheet({ current, onSave, onClose }) {
  const [val, setVal] = useState(current > 0 ? current.toString() : "");
  return (
    <Sheet onClose={onClose}>
      <p style={{ fontSize: "var(--text-ui)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-5)" }}>Monthly income</p>
      <FieldLabel>Take-home income (after tax)</FieldLabel>
      <TextInput type="number" value={val} onChange={setVal} placeholder="5000" step="100" />
      <PrimaryBtn onClick={() => { onSave(Number(val)); onClose(); }} disabled={!val || Number(val) <= 0}>Save</PrimaryBtn>
    </Sheet>
  );
}

// ── Add / edit subscription sheet ─────────────────────────────────────────────
function SubSheet({ existing, onSave, onDelete, onClose }) {
  const [name, setName]       = useState(existing?.name || "");
  const [amount, setAmount]   = useState(existing?.amount?.toString() || "");
  const [freq, setFreq]       = useState(existing?.frequency || "monthly");
  const [cat, setCat]         = useState(existing?.category || "Entertainment");

  function handleSave() {
    if (!name.trim() || !amount || Number(amount) <= 0) return;
    onSave({
      id: existing?.id || `sub-${Date.now()}`,
      name: name.trim(),
      amount: parseFloat(amount),
      frequency: freq,
      category: cat,
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <p style={{ fontSize: "var(--text-ui)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-5)" }}>
        {existing ? "Edit subscription" : "Add subscription"}
      </p>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <FieldLabel>Name</FieldLabel>
        <TextInput value={name} onChange={setName} placeholder="Netflix" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div>
          <FieldLabel>Amount ($)</FieldLabel>
          <TextInput type="number" value={amount} onChange={setAmount} placeholder="22.99" step="0.01" />
        </div>
        <div>
          <FieldLabel>Frequency</FieldLabel>
          <select value={freq} onChange={e => setFreq(e.target.value)} style={{
            width: "100%", padding: "var(--space-3)", border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", background: "var(--bg-surface)",
            color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
          }}>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-2)" }}>
        <FieldLabel>Category</FieldLabel>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {SUB_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-pill)",
              border: `1px solid ${cat === c ? "var(--text-primary)" : "var(--border-light)"}`,
              background: cat === c ? "var(--text-primary)" : "none",
              color: cat === c ? "var(--bg-deep)" : "var(--text-secondary)",
              fontSize: "var(--text-caption)", cursor: "pointer", fontFamily: "inherit",
            }}>{c}</button>
          ))}
        </div>
      </div>

      <PrimaryBtn onClick={handleSave} disabled={!name.trim() || !amount || Number(amount) <= 0}>Save</PrimaryBtn>

      {existing && (
        <button onClick={() => { onDelete(existing.id); onClose(); }} style={{
          width: "100%", padding: "var(--space-3)", marginTop: "var(--space-3)",
          background: "none", color: "#e05252", border: "1px solid #e05252",
          borderRadius: "var(--radius-md)", fontSize: "var(--text-body)", cursor: "pointer", fontFamily: "inherit",
        }}>
          Remove subscription
        </button>
      )}
    </Sheet>
  );
}

// ── Add / edit savings goal sheet ─────────────────────────────────────────────
function GoalSheet({ existing, onSave, onDelete, onClose }) {
  const [name, setName]       = useState(existing?.name || "");
  const [target, setTarget]   = useState(existing?.target?.toString() || "");
  const [current, setCurrent] = useState(existing?.current?.toString() || "0");

  function handleSave() {
    if (!name.trim() || !target || Number(target) <= 0) return;
    onSave({
      id: existing?.id || `goal-${Date.now()}`,
      name: name.trim(),
      target: parseFloat(target),
      current: parseFloat(current) || 0,
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <p style={{ fontSize: "var(--text-ui)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-5)" }}>
        {existing ? "Edit goal" : "New savings goal"}
      </p>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <FieldLabel>Goal name</FieldLabel>
        <TextInput value={name} onChange={setName} placeholder="Emergency fund" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <div>
          <FieldLabel>Target ($)</FieldLabel>
          <TextInput type="number" value={target} onChange={setTarget} placeholder="10000" step="100" />
        </div>
        <div>
          <FieldLabel>Saved so far ($)</FieldLabel>
          <TextInput type="number" value={current} onChange={setCurrent} placeholder="0" step="100" />
        </div>
      </div>

      <PrimaryBtn onClick={handleSave} disabled={!name.trim() || !target || Number(target) <= 0}>Save</PrimaryBtn>

      {existing && (
        <button onClick={() => { onDelete(existing.id); onClose(); }} style={{
          width: "100%", padding: "var(--space-3)", marginTop: "var(--space-3)",
          background: "none", color: "#e05252", border: "1px solid #e05252",
          borderRadius: "var(--radius-md)", fontSize: "var(--text-body)", cursor: "pointer", fontFamily: "inherit",
        }}>
          Delete goal
        </button>
      )}
    </Sheet>
  );
}

// ── Main FinancialClarityScreen ───────────────────────────────────────────────
export default function FinancialClarityScreen() {
  const [data, setData] = useState(() => getFinanceData());

  const [incomeSheet,  setIncomeSheet]  = useState(false);
  const [subSheet,     setSubSheet]     = useState(null); // null | "new" | existing sub
  const [goalSheet,    setGoalSheet]    = useState(null); // null | "new" | existing goal

  const { monthlyIncome, subscriptions, savingsGoals } = data;
  const monthlySubTotal = getMonthlySubTotal(subscriptions);
  const annualSubTotal  = getAnnualSubTotal(subscriptions);
  const remaining       = monthlyIncome - monthlySubTotal;
  const totalSaved      = savingsGoals.reduce((s, g) => s + (g.current || 0), 0);
  const totalGoal       = savingsGoals.reduce((s, g) => s + g.target, 0);

  function refresh(updated) { setData(updated); }

  return (
    <div style={{
      width: "100%", minHeight: "100svh", background: "var(--bg-deep)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "var(--space-8) var(--space-5) var(--scroll-pb)",
      boxSizing: "border-box", overflowY: "auto",
    }}>

      {incomeSheet && (
        <SetIncomeSheet
          current={monthlyIncome}
          onSave={v => refresh(setMonthlyIncome(v))}
          onClose={() => setIncomeSheet(false)}
        />
      )}

      {subSheet && (
        <SubSheet
          existing={subSheet === "new" ? null : subSheet}
          onSave={sub => refresh(subSheet === "new" ? addSubscription(sub) : updateSubscription(sub.id, sub))}
          onDelete={id => refresh(deleteSubscription(id))}
          onClose={() => setSubSheet(null)}
        />
      )}

      {goalSheet && (
        <GoalSheet
          existing={goalSheet === "new" ? null : goalSheet}
          onSave={g => refresh(goalSheet === "new" ? addSavingsGoal(g) : updateSavingsGoal(g.id, g))}
          onDelete={id => refresh(deleteSavingsGoal(id))}
          onClose={() => setGoalSheet(null)}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
          <span style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Finances
          </span>
        </div>

        {/* ── Monthly clarity card ── */}
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-md)", padding: "var(--space-5)",
          boxShadow: "var(--shadow-sm)", marginBottom: "var(--space-5)",
        }}>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "var(--space-4)", fontWeight: 600 }}>
            Monthly picture
          </p>

          {/* Income row */}
          <button onClick={() => setIncomeSheet(true)} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
            <span style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)" }}>Income</span>
            <span style={{ fontSize: "var(--text-body)", fontWeight: 600, color: monthlyIncome > 0 ? "var(--text-primary)" : "var(--text-faint)" }}>
              {monthlyIncome > 0 ? `$${fmt(monthlyIncome)}` : "Set income →"}
            </span>
          </button>

          {/* Subscriptions row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <span style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)" }}>Subscriptions</span>
            <span style={{ fontSize: "var(--text-body)", fontWeight: 600, color: monthlySubTotal > 0 ? "var(--text-primary)" : "var(--text-faint)" }}>
              {monthlySubTotal > 0 ? `−$${fmtDec(monthlySubTotal)}/mo` : "—"}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "var(--border-light)", marginBottom: "var(--space-4)" }} />

          {/* Remaining */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "var(--text-body)", color: "var(--text-muted)", fontWeight: 600 }}>Available</span>
            <span style={{
              fontSize: "var(--text-title)", fontWeight: 700,
              color: monthlyIncome > 0 ? (remaining < 0 ? "#e05252" : "var(--text-primary)") : "var(--text-faint)",
            }}>
              {monthlyIncome > 0 ? `$${fmt(Math.max(0, remaining))}` : "—"}
            </span>
          </div>

          {annualSubTotal > 0 && (
            <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "var(--space-3)" }}>
              Annual subscription cost: ${fmt(annualSubTotal)}
            </p>
          )}
        </div>

        {/* ── Subscriptions section ── */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              Subscriptions
            </p>
            <button onClick={() => setSubSheet("new")} style={{
              background: "none", border: "1px solid var(--border-light)", borderRadius: "var(--radius-xs)",
              padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-caption)", color: "var(--text-secondary)",
              cursor: "pointer", fontFamily: "inherit",
            }}>+ Add</button>
          </div>

          {subscriptions.length === 0 ? (
            <div style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-light)", borderRadius: "var(--radius-md)", padding: "var(--space-7)", textAlign: "center" }}>
              <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", marginBottom: "var(--space-1)" }}>Track what you're paying for</p>
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)" }}>Add subscriptions to see your committed monthly spend.</p>
            </div>
          ) : (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
              {[...subscriptions]
                .sort((a, b) => b.amount - a.amount)
                .map((sub, i) => (
                  <button key={sub.id} onClick={() => setSubSheet(sub)} style={{
                    width: "100%", background: "none", border: "none",
                    borderBottom: i < subscriptions.length - 1 ? "1px solid var(--border-light)" : "none",
                    padding: "var(--space-3) var(--space-4)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    textAlign: "left", fontFamily: "inherit",
                  }}>
                    <div>
                      <span style={{ fontSize: "var(--text-body)", color: "var(--text-primary)", fontWeight: 500 }}>{sub.name}</span>
                      <span style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginLeft: "var(--space-2)" }}>{sub.category}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "var(--text-body)", color: "var(--text-primary)", fontWeight: 600 }}>
                        ${fmtDec(sub.amount)}
                      </span>
                      <span style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginLeft: "4px" }}>
                        /{FREQ_LABELS[sub.frequency] || "mo"}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* ── Savings goals section ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              Savings goals
            </p>
            <button onClick={() => setGoalSheet("new")} style={{
              background: "none", border: "1px solid var(--border-light)", borderRadius: "var(--radius-xs)",
              padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-caption)", color: "var(--text-secondary)",
              cursor: "pointer", fontFamily: "inherit",
            }}>+ Add</button>
          </div>

          {savingsGoals.length === 0 ? (
            <div style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-light)", borderRadius: "var(--radius-md)", padding: "var(--space-7)", textAlign: "center" }}>
              <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", marginBottom: "var(--space-1)" }}>Set one meaningful goal</p>
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)" }}>An emergency fund, a trip, or a milestone. One goal you're actively working toward.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {savingsGoals.map(goal => {
                const pct = goal.target > 0 ? Math.min((goal.current || 0) / goal.target * 100, 100) : 0;
                const isHit = pct >= 100;
                const remaining_goal = Math.max(0, goal.target - (goal.current || 0));
                return (
                  <button key={goal.id} onClick={() => setGoalSheet(goal)} style={{
                    background: "var(--bg-surface)", border: `1px solid ${isHit ? "var(--accent-glow)" : "var(--border-light)"}`,
                    borderRadius: "var(--radius-md)", padding: "var(--space-4) var(--space-5)",
                    cursor: "pointer", textAlign: "left", boxShadow: "var(--shadow-xs)",
                    width: "100%", fontFamily: "inherit",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-3)" }}>
                      <span style={{ fontSize: "var(--text-body)", fontWeight: 600, color: isHit ? "var(--accent-text)" : "var(--text-primary)" }}>
                        {goal.name}
                      </span>
                      <span style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", fontWeight: 600 }}>
                        {Math.round(pct)}%
                      </span>
                    </div>

                    <div style={{ height: "5px", background: "var(--bg-inset)", borderRadius: "var(--radius-pill)", overflow: "hidden", marginBottom: "var(--space-3)" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: isHit ? "var(--accent)" : "var(--text-primary)",
                        borderRadius: "var(--radius-pill)",
                        transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
                      }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)" }}>
                        ${fmt(goal.current || 0)} saved
                      </span>
                      <span style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)" }}>
                        {isHit ? "Goal reached" : `$${fmt(remaining_goal)} to go`}
                      </span>
                    </div>
                  </button>
                );
              })}

              {savingsGoals.length > 1 && (
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>Total saved</span>
                  <span style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-primary)" }}>
                    ${fmt(totalSaved)} of ${fmt(totalGoal)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
