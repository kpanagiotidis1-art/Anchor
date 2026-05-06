import { useState, useEffect, useRef } from "react";
import HomeScreen from "./screens/HomeScreen";
import AddTaskScreen from "./screens/AddTaskScreen";
import WorkoutScreen from "./screens/WorkoutScreen";

const SCREENS = ["today", "workout"];

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function offsetDate(base, days) {
  const [year, month, day] = base.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getDayOfWeek(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getVisibleTasks(tasks, dateStr) {
  const dow = getDayOfWeek(dateStr);
  const filtered = {};
  for (const section in tasks) {
    filtered[section] = tasks[section].filter(task => {
      if (task.frequency === "daily") return true;
      if (task.frequency === "weekly") return (task.days || []).includes(dow);
      if (task.frequency === "one-time") return task.date === dateStr;
      return true;
    });
  }
  return filtered;
}

const defaultTasks = {
  Morning: [
    { id: 1, name: "Make your bed", section: "Morning", frequency: "daily", completedDates: [] },
    { id: 2, name: "Drink a glass of water", section: "Morning", frequency: "daily", completedDates: [] },
  ],
  Afternoon: [
    { id: 3, name: "Go for a short walk", section: "Afternoon", frequency: "daily", completedDates: [] },
  ],
  Night: [
    { id: 4, name: "Read for 10 minutes", section: "Night", frequency: "daily", completedDates: [] },
    { id: 5, name: "Write in your journal", section: "Night", frequency: "daily", completedDates: [] },
  ],
};

function migrateTasks(tasks) {
  const migrated = {};
  for (const section in tasks) {
    migrated[section] = tasks[section].map(task => {
      const updated = { ...task };
      if (!updated.completedDates) {
        updated.completedDates = updated.completed ? [todayString()] : [];
        delete updated.completed;
      }
      if (!updated.section) updated.section = section;
      return updated;
    });
  }
  return migrated;
}

function migrateWorkouts(workouts) {
  const migrated = {};
  for (const date in workouts) {
    migrated[date] = (workouts[date] || []).map(session => ({
      ...session,
      exercises: (session.exercises || []).map(ex => ({
        ...ex,
        sets: ex.sets || [],
      })),
    }));
  }
  return migrated;
}

export default function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("anchor-tasks");
    const parsed = saved ? JSON.parse(saved) : defaultTasks;
    return migrateTasks(parsed);
  });

  const [workouts, setWorkouts] = useState(() => {
    const saved = localStorage.getItem("anchor-workouts");
    const parsed = saved ? JSON.parse(saved) : {};
    return migrateWorkouts(parsed);
  });

  const [screen, setScreen] = useState("home");
  const [activeSection, setActiveSection] = useState(null);
  const [viewedDate, setViewedDate] = useState(todayString());
  const [activeScreen, setActiveScreen] = useState("today");

  const touchStartX = useRef(null);
  const SWIPE_THRESHOLD = 50;

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    const currentIndex = SCREENS.indexOf(activeScreen);
    if (deltaX < 0) {
      const next = SCREENS[currentIndex + 1];
      if (next) setActiveScreen(next);
    } else {
      const prev = SCREENS[currentIndex - 1];
      if (prev) setActiveScreen(prev);
    }
  }

  useEffect(() => {
    localStorage.setItem("anchor-tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("anchor-workouts", JSON.stringify(workouts));
  }, [workouts]);

  // ── Workout handlers ──

  function startWorkout() {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
    const newSession = {
      id: `workout-${Date.now()}`,
      startTime: timeLabel,
      status: "active",
      exercises: [],
    };
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: [...(prev[viewedDate] || []), newSession],
    }));
  }

  function endWorkout(sessionId) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(session =>
        session.id === sessionId ? { ...session, status: "completed" } : session
      ),
    }));
  }

  function addExercise(sessionId, exercise) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(session =>
        session.id === sessionId
          ? { ...session, exercises: [...(session.exercises || []), exercise] }
          : session
      ),
    }));
  }

  function addSet(sessionId, exerciseId, set) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(session =>
        session.id === sessionId ? {
          ...session,
          exercises: (session.exercises || []).map(ex =>
            ex.id === exerciseId
              ? { ...ex, sets: [...(ex.sets || []), set] }
              : ex
          ),
        } : session
      ),
    }));
  }

  function deleteSet(sessionId, exerciseId, setId) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(session =>
        session.id === sessionId ? {
          ...session,
          exercises: (session.exercises || []).map(ex =>
            ex.id === exerciseId
              ? { ...ex, sets: (ex.sets || []).filter(s => s.id !== setId) }
              : ex
          ),
        } : session
      ),
    }));
  }

  function deleteExercise(sessionId, exerciseId) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(session =>
        session.id === sessionId
          ? { ...session, exercises: (session.exercises || []).filter(ex => ex.id !== exerciseId) }
          : session
      ),
    }));
  }

  function deleteWorkout(sessionId) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: (prev[viewedDate] || []).filter(session => session.id !== sessionId),
    }));
  }

  // ── Task handlers ──

  function toggleTask(section, taskId) {
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].map(task => {
        if (task.id !== taskId) return task;
        const already = task.completedDates.includes(viewedDate);
        return {
          ...task,
          completedDates: already
            ? task.completedDates.filter(d => d !== viewedDate)
            : [...task.completedDates, viewedDate],
        };
      }),
    }));
  }

  function addTask(section, taskName, frequency, days, date) {
    const newTask = {
      id: Date.now(),
      name: taskName,
      section,
      frequency,
      completedDates: [],
      ...(frequency === "weekly" && { days }),
      ...(frequency === "one-time" && { date }),
    };
    setTasks(prev => ({
      ...prev,
      [section]: [...prev[section], newTask],
    }));
    setScreen("home");
  }

  function deleteTask(section, taskId) {
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].filter(task => task.id !== taskId),
    }));
  }

  function updateTask(section, taskId, updates) {
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    }));
  }

  function resetDay() {
    setTasks(prev => {
      const reset = {};
      for (const section in prev) {
        reset[section] = prev[section].map(task => ({
          ...task,
          completedDates: task.completedDates.filter(d => d !== viewedDate),
        }));
      }
      return reset;
    });
  }

  function navigateDay(direction) {
    setViewedDate(prev => offsetDate(prev, direction));
  }

  function goToAddTask(section) {
    setActiveSection(section);
    setScreen("add");
  }

  const visibleTasks = getVisibleTasks(tasks, viewedDate);

  if (screen === "add") {
    return (
      <AddTaskScreen
        section={activeSection}
        tasks={tasks[activeSection]}
        visibleTasks={visibleTasks[activeSection]}
        onSave={addTask}
        onBack={() => setScreen("home")}
        onDelete={deleteTask}
        onUpdate={updateTask}
        viewedDate={viewedDate}
      />
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ width: "100%", minHeight: "100vh", background: "#f5f5f3" }}
    >
      {activeScreen === "today" && (
        <HomeScreen
          tasks={visibleTasks}
          onToggle={toggleTask}
          onSectionTap={goToAddTask}
          onResetDay={resetDay}
          viewedDate={viewedDate}
          onNavigateDay={navigateDay}
        />
      )}

      {activeScreen === "workout" && (
        <WorkoutScreen
          viewedDate={viewedDate}
          onNavigateDay={navigateDay}
          sessions={workouts[viewedDate] || []}
          onStartWorkout={startWorkout}
          onEndWorkout={endWorkout}
          onAddExercise={addExercise}
          onAddSet={addSet}
          onDeleteSet={deleteSet}
          onDeleteExercise={deleteExercise}
          onDeleteWorkout={deleteWorkout}
        />
      )}

      {/* Tab bar */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "64px",
        background: "#ffffff",
        borderTop: "1px solid #e0e0e0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "48px",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {[
          { key: "today", label: "Today" },
          { key: "workout", label: "Workout" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveScreen(tab.key)}
            style={{
              background: "none",
              border: "none",
              fontSize: "0.95rem",
              fontWeight: activeScreen === tab.key ? 700 : 400,
              color: activeScreen === tab.key ? "#1a1a1a" : "#aaa",
              cursor: "pointer",
              padding: "12px 24px",
              borderBottom: activeScreen === tab.key ? "2px solid #1a1a1a" : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}