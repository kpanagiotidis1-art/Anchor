import { useState, useEffect, useRef } from "react";
import {
  fetchWeightLogs,
  saveWeightLog,
  deleteWeightLog,
  fetchProgressPhotos,
  uploadProgressPhoto,
  deleteProgressPhoto,
} from "../lib/progressService";
import { getWeightTrendCopy, getRecentWeightChange } from "../lib/anchorVoice";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function getPhotoFramingCopy(photos) {
  if (!photos || photos.length < 2) return null;
  const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date));
  const [ey, em, ed] = sorted[0].date.split("-").map(Number);
  const [ly, lm, ld] = sorted[sorted.length - 1].date.split("-").map(Number);
  const spanDays = Math.round((new Date(ly, lm-1, ld) - new Date(ey, em-1, ed)) / 86400000);
  if (spanDays >= 112) return "The work is becoming visible.";
  if (spanDays >= 56)  return "Consistency changed this.";
  if (spanDays >= 21)  return "Momentum started here.";
  return null;
}

function getRelativeTimeLabel(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((now.setHours(0,0,0,0) - date.setHours(0,0,0,0)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 6) return `${diffDays} days ago`;
  const weeks = Math.round(diffDays / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.round(diffDays / 30.5);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.round(diffDays / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

// ── Weight chart (hand-rolled SVG) ────────────────────────────────────────────

function WeightChart({ logs, onSelectEntry }) {
  const [containerWidth, setContainerWidth] = useState(320);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (logs.length === 0) return null;

  const CHART_H = 100;
  const PAD_X = 16;
  const PAD_Y = 12;
  const innerW = containerWidth - PAD_X * 2;

  const weights = logs.map(l => l.weightKg);
  const minW = Math.min(...weights) - 1.5;
  const maxW = Math.max(...weights) + 1.5;
  const range = maxW - minW || 1;

  const toX = (i) => PAD_X + (logs.length > 1 ? (i / (logs.length - 1)) * innerW : innerW / 2);
  const toY = (w) => PAD_Y + (1 - (w - minW) / range) * (CHART_H - PAD_Y * 2);

  const points = logs.map((log, i) => ({ x: toX(i), y: toY(log.weightKg), log }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div ref={containerRef} style={{ width: "100%", marginBottom: "var(--space-4)" }}>
      <svg
        width="100%"
        height={CHART_H}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Baseline */}
        <line
          x1={PAD_X} y1={CHART_H - PAD_Y}
          x2={containerWidth - PAD_X} y2={CHART_H - PAD_Y}
          stroke="var(--border-light)" strokeWidth="1"
        />

        {/* Line */}
        {logs.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="var(--text-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y}
            r={5}
            fill="var(--bg-surface)"
            stroke="var(--text-primary)"
            strokeWidth="1.5"
            style={{ cursor: "pointer" }}
            onClick={() => onSelectEntry(p.log)}
          />
        ))}

        {/* First + last labels */}
        {logs.length >= 1 && (
          <text x={points[0].x} y={CHART_H} textAnchor="middle"
            fontSize="10" fill="var(--text-faint)" fontFamily="inherit">
            {formatDateShort(logs[0].date)}
          </text>
        )}
        {logs.length >= 2 && (
          <text x={points[points.length-1].x} y={CHART_H} textAnchor="middle"
            fontSize="10" fill="var(--text-faint)" fontFamily="inherit">
            {formatDateShort(logs[logs.length-1].date)}
          </text>
        )}
      </svg>
    </div>
  );
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
        zIndex: 301, maxHeight: "90dvh", overflowY: "auto",
      }}>
        <div style={{ width: "36px", height: "4px", background: "var(--border-light)", borderRadius: "var(--radius-pill)", margin: "0 auto var(--space-5)" }} />
        {children}
      </div>
    </div>
  );
}

// ── Log weight sheet ──────────────────────────────────────────────────────────

function LogWeightSheet({ initialDate, existingLog, onSave, onClose }) {
  const [date, setDate] = useState(existingLog?.date || initialDate || todayString());
  const [weight, setWeight] = useState(existingLog?.weightKg?.toString() || "");
  const [notes, setNotes] = useState(existingLog?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const w = parseFloat(weight);
    if (!weight || isNaN(w) || w <= 0) { setError("Enter a valid weight."); return; }
    setSaving(true);
    try {
      await onSave(date, w, notes.trim());
      onClose();
    } catch (e) {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <p style={{ fontSize: "var(--text-ui)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-5)" }}>
        {existingLog ? "Edit entry" : "Log weight"}
      </p>

      <label style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "var(--space-2)" }}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
        width: "100%", boxSizing: "border-box", padding: "var(--space-3)", border: "1px solid var(--border-light)",
        borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", background: "var(--bg-surface)",
        color: "var(--text-primary)", outline: "none", marginBottom: "var(--space-4)",
      }} />

      <label style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "var(--space-2)" }}>Weight (kg)</label>
      <input autoFocus type="number" min="20" max="400" step="0.1" placeholder="82.5" value={weight} onChange={e => { setWeight(e.target.value); setError(""); }}
        onKeyDown={e => e.key === "Enter" && handleSave()}
        style={{
          width: "100%", boxSizing: "border-box", padding: "var(--space-3)", border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", background: "var(--bg-surface)",
          color: "var(--text-primary)", outline: "none", marginBottom: "var(--space-4)",
        }} />

      <label style={{ fontSize: "var(--text-caption)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "var(--space-2)" }}>Note (optional)</label>
      <input type="text" placeholder="Morning, post-workout..." value={notes} onChange={e => setNotes(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box", padding: "var(--space-3)", border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", background: "var(--bg-surface)",
          color: "var(--text-primary)", outline: "none", marginBottom: "var(--space-5)",
        }} />

      {error && <p style={{ fontSize: "var(--text-caption)", color: "#e05252", marginBottom: "var(--space-3)" }}>{error}</p>}

      <button onClick={handleSave} disabled={saving} style={{
        width: "100%", padding: "var(--space-4)", background: "var(--text-primary)", color: "var(--bg-deep)",
        border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-ui)", fontWeight: 600,
        cursor: saving ? "not-allowed" : "pointer",
      }}>
        {saving ? "Saving…" : "Save"}
      </button>
    </Sheet>
  );
}

// ── Photo section ─────────────────────────────────────────────────────────────

function PhotoGrid({ photos, onDelete, onAdd, uploading }) {
  const fileInputRef = useRef(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const framingCopy = getPhotoFramingCopy(photos);

  return (
    <div style={{ marginTop: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: framingCopy ? "var(--space-2)" : "var(--space-3)" }}>
        <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", letterSpacing: "0.06em" }}>
          Visual record
        </p>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
          background: "none", border: "1px solid var(--border-light)", borderRadius: "var(--radius-xs)",
          padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-caption)", color: "var(--text-secondary)",
          cursor: uploading ? "not-allowed" : "pointer",
        }}>
          {uploading ? "Uploading…" : "+ Add"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { if (e.target.files?.[0]) onAdd(e.target.files[0]); e.target.value = ""; }} />
      </div>

      {framingCopy && (
        <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginBottom: "var(--space-4)", fontStyle: "italic", letterSpacing: "0.02em" }}>
          {framingCopy}
        </p>
      )}

      {photos.length === 0 ? (
        <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-md)", padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Your timeline starts here.</p>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)" }}>Consistency leaves evidence.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ position: "relative" }}>
              <img
                src={photo.url}
                alt={photo.caption || formatDateShort(photo.date)}
                onClick={() => setSelectedPhoto(photo)}
                style={{
                  width: "100%", aspectRatio: "3/4", objectFit: "cover",
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  border: "1px solid var(--border-light)",
                }}
              />
              <p style={{ fontSize: "var(--text-micro)", color: "var(--text-secondary)", marginTop: "var(--space-1)", textAlign: "center" }}>
                {getRelativeTimeLabel(photo.date)}
              </p>
              <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", textAlign: "center" }}>
                {formatDateShort(photo.date)}
              </p>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-5)" }}
          onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto.url} alt="" style={{ maxWidth: "100%", maxHeight: "80dvh", borderRadius: "var(--radius-sm)", objectFit: "contain" }} />
          <p style={{ fontSize: "var(--text-body)", color: "rgba(255,255,255,0.85)", marginTop: "var(--space-3)" }}>
            {getRelativeTimeLabel(selectedPhoto.date)}
          </p>
          <p style={{ fontSize: "var(--text-caption)", color: "rgba(255,255,255,0.45)", marginTop: "var(--space-1)" }}>
            {formatDateShort(selectedPhoto.date)}
            {selectedPhoto.caption && ` · ${selectedPhoto.caption}`}
          </p>
          <button onClick={e => { e.stopPropagation(); onDelete(selectedPhoto); setSelectedPhoto(null); }} style={{
            marginTop: "var(--space-4)", background: "none", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "var(--radius-sm)", padding: "var(--space-2) var(--space-4)",
            color: "rgba(255,255,255,0.5)", fontSize: "var(--text-caption)", cursor: "pointer",
          }}>
            Delete photo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main ProgressScreen ───────────────────────────────────────────────────────

export default function ProgressScreen({ userId, onBack }) {
  const [weightLogs, setWeightLogs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logSheet, setLogSheet] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetchWeightLogs(userId).catch(() => []),
      fetchProgressPhotos(userId).catch(() => []),
    ]).then(([logs, pics]) => {
      setWeightLogs(logs);
      setPhotos(pics);
      setLoading(false);
    });
  }, [userId]);

  async function handleSaveWeight(date, weightKg, notes) {
    await saveWeightLog(userId, date, weightKg, notes);
    const fresh = await fetchWeightLogs(userId);
    setWeightLogs(fresh);
  }

  async function handleDeleteWeight(log) {
    await deleteWeightLog(log.id);
    setWeightLogs(prev => prev.filter(l => l.id !== log.id));
  }

  async function handleAddPhoto(file) {
    setUploading(true);
    setPhotoError("");
    try {
      await uploadProgressPhoto(userId, todayString(), file);
      const fresh = await fetchProgressPhotos(userId);
      setPhotos(fresh);
    } catch (e) {
      const msg = e?.message || e?.error_description || String(e);
      setPhotoError(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePhoto(photo) {
    try {
      await deleteProgressPhoto(photo.id, photo.storagePath);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (e) {
      console.error("Failed to delete photo", e);
    }
  }

  const currentWeight = weightLogs.length > 0
    ? weightLogs[weightLogs.length - 1].weightKg
    : null;
  const trendCopy = getWeightTrendCopy(weightLogs);
  const recentCopy = getRecentWeightChange(weightLogs, 30);

  // Atmosphere: subtle warmth when there is a meaningful journey to reflect on
  const hasJourney = weightLogs.length >= 3 || photos.length >= 2;
  const atmosphereTint = hasJourney ? "rgba(76,175,80,0.014)" : "transparent";

  // Journey framing — shown at the top when data runs deep enough
  function getJourneyFramingCopy() {
    if (weightLogs.length >= 2 && photos.length >= 2) {
      return trendCopy ? "Consistency is leaving evidence." : "Your record is building.";
    }
    if (weightLogs.length >= 5) return trendCopy ? "The pattern is becoming clear." : "Your timeline is building.";
    if (weightLogs.length >= 2) return "Your record is building.";
    return null;
  }
  const journeyFraming = getJourneyFramingCopy();

  return (
    <div style={{
      width: "100%", minHeight: "100dvh",
      background: `linear-gradient(to bottom, ${atmosphereTint} 0%, transparent 200px), var(--bg-deep)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "var(--space-8) var(--space-5) calc(var(--space-8) + 64px)",
      boxSizing: "border-box", overflowY: "auto",
    }}>

      {(logSheet || editEntry) && (
        <LogWeightSheet
          initialDate={todayString()}
          existingLog={editEntry}
          onSave={handleSaveWeight}
          onClose={() => { setLogSheet(false); setEditEntry(null); }}
        />
      )}

      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Header */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-caption)", cursor: "pointer", padding: 0 }}>
              ← Back
            </button>
            <span style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Progress
            </span>
            <button onClick={() => setLogSheet(true)} style={{
              background: "var(--text-primary)", color: "var(--bg-deep)", border: "none",
              borderRadius: "var(--radius-xs)", padding: "var(--space-2) var(--space-3)",
              fontSize: "var(--text-caption)", fontWeight: 600, cursor: "pointer",
            }}>
              + Log
            </button>
          </div>
          <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", textAlign: "center", marginTop: "var(--space-2)", letterSpacing: "0.04em" }}>
            Evidence over time.
          </p>
        </div>

        {journeyFraming && !loading && (
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)", textAlign: "center", marginBottom: "var(--space-5)", letterSpacing: "0.04em", fontStyle: "italic" }}>
            {journeyFraming}
          </p>
        )}

        {loading ? (
          <p style={{ fontSize: "var(--text-body)", color: "var(--text-faint)", textAlign: "center", padding: "var(--space-8) 0" }}>Loading…</p>
        ) : (
          <>
            {/* Weight summary card */}
            {currentWeight !== null ? (
              <div style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-md)", padding: "var(--space-5)",
                marginBottom: "var(--space-4)", boxShadow: "var(--shadow-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                  <div>
                    <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", letterSpacing: "0.08em", marginBottom: "var(--space-1)" }}>
                      Latest
                    </p>
                    <p style={{ fontSize: "var(--text-display)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                      {currentWeight.toFixed(1)}
                      <span style={{ fontSize: "var(--text-body)", fontWeight: 400, color: "var(--text-faint)", marginLeft: "4px" }}>kg</span>
                    </p>
                  </div>
                  {(recentCopy || trendCopy) && (
                    <div style={{ textAlign: "right" }}>
                      {recentCopy && <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 600 }}>{recentCopy}</p>}
                      {trendCopy && <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "var(--space-1)" }}>{trendCopy}</p>}
                    </div>
                  )}
                </div>

                {weightLogs.length >= 2 && (
                  <WeightChart logs={weightLogs} onSelectEntry={log => setEditEntry(log)} />
                )}

                <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", marginTop: "var(--space-2)" }}>
                  {weightLogs.length} {weightLogs.length === 1 ? "entry" : "entries"} · Tap any point to edit
                </p>
              </div>
            ) : (
              <div style={{
                background: "var(--bg-inset)",
                borderRadius: "var(--radius-md)", padding: "var(--space-8)",
                marginBottom: "var(--space-4)", textAlign: "center",
              }}>
                <p style={{ fontSize: "var(--text-body)", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Your record starts with the first entry.</p>
                <p style={{ fontSize: "var(--text-caption)", color: "var(--text-faint)" }}>Tap + Log above to begin.</p>
              </div>
            )}

            {/* Recent entries list */}
            {weightLogs.length > 0 && (
              <div style={{ marginBottom: "var(--space-6)" }}>
                <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)", letterSpacing: "0.06em", marginBottom: "var(--space-3)" }}>
                  Log
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {[...weightLogs].reverse().slice(0, 10).map(log => (
                    <div key={log.id} style={{
                      background: "var(--bg-surface)", border: "1px solid var(--border-light)",
                      borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div>
                        <span style={{ fontSize: "var(--text-body)", color: "var(--text-primary)", fontWeight: 500 }}>
                          {log.weightKg.toFixed(1)} kg
                        </span>
                        {log.notes && (
                          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", marginTop: "2px", fontStyle: "italic" }}>
                            {log.notes}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "var(--text-micro)", color: "var(--text-secondary)" }}>{getRelativeTimeLabel(log.date)}</p>
                          <p style={{ fontSize: "var(--text-micro)", color: "var(--text-faint)" }}>{formatDateShort(log.date)}</p>
                        </div>
                        <button onClick={() => handleDeleteWeight(log)} style={{
                          background: "none", border: "none", color: "var(--text-faint)",
                          fontSize: "var(--text-caption)", cursor: "pointer", padding: 0, lineHeight: 1,
                        }}>
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {photoError && (
              <p style={{ fontSize: "var(--text-caption)", color: "#e05252", marginBottom: "var(--space-3)" }}>{photoError}</p>
            )}
            <PhotoGrid
              photos={photos}
              onAdd={handleAddPhoto}
              onDelete={handleDeletePhoto}
              uploading={uploading}
            />
          </>
        )}

      </div>
    </div>
  );
}
