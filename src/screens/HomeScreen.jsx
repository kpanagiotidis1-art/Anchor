import SectionBlock from "../components/SectionBlock";

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function HomeScreen({ tasks, onToggle, onSectionTap, onResetDay, viewedDate, onNavigateDay }) {
  const isToday = viewedDate === todayString();
  const allTasks = Object.values(tasks).flat();
  const completedCount = allTasks.filter(t => t.completedDates.includes(viewedDate)).length;
  const totalCount = allTasks.length;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "#f5f5f3",
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

        {/* App title */}
        <h1 style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "#1a1a1a",
          marginBottom: "8px",
          textAlign: "center",
        }}>
          Anchor
        </h1>

        {/* Date navigation */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          marginBottom: "28px",
        }}>
          <button
            onClick={() => onNavigateDay(-1)}
            style={{
              background: "none",
              border: "1px solid #ccc",
              borderRadius: "6px",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              color: "#555",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              flexShrink: 0,
            }}
          >
            ‹
          </button>

          <div style={{ textAlign: "center", width: "160px" }}>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a" }}>
              {formatDate(viewedDate)}
            </p>
            <p style={{
              fontSize: "0.75rem",
              color: isToday ? "#aaa" : "transparent",
              marginTop: "2px",
            }}>
              Today
            </p>
          </div>

          <button
            onClick={() => onNavigateDay(1)}
            style={{
              background: "none",
              border: "1px solid #ccc",
              borderRadius: "6px",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              color: "#555",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              flexShrink: 0,
            }}
          >
            ›
          </button>
        </div>

        {/* Sections */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}>
          {["Morning", "Afternoon", "Night"].map(section => (
            <SectionBlock
              key={section}
              title={section}
              tasks={tasks[section]}
              onToggle={(id) => onToggle(section, id)}
              onTitleTap={() => onSectionTap(section)}
              viewedDate={viewedDate}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          width: "100%",
          marginTop: "32px",
          paddingTop: "20px",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#444" }}>
            {completedCount} / {totalCount} complete
          </p>

          {/* Progress bar */}
          <div style={{
            width: "100%",
            height: "6px",
            background: "#e0e0e0",
            borderRadius: "999px",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${percentage}%`,
              background: percentage === 100 ? "#4caf50" : "#1a1a1a",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }} />
          </div>

          <button
            onClick={onResetDay}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              background: "none",
              fontSize: "0.9rem",
              color: "#555",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            Reset Day
          </button>
        </div>
      </div>
    </div>
  );
}