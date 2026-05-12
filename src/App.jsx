import { useState, useEffect, useRef } from "react";
import HomeScreen from "./screens/HomeScreen";
import AddTaskScreen from "./screens/AddTaskScreen";
import WorkoutScreen from "./screens/WorkoutScreen";
import WeeklyReviewScreen from "./screens/WeeklyReviewScreen";

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

// Returns ISO week key e.g. "2026-W19"
export function getWeekKey(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const y = monday.getFullYear();
  const jan4 = new Date(y, 0, 4);
  const weekNum = Math.ceil(((monday - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${y}-W${String(weekNum).padStart(2, "0")}`;
}

// Returns the Mon–Sun date strings for the week containing dateStr
export function getWeekDates(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(year, month - 1, day + diffToMon + i);
    const y2 = dd.getFullYear();
    const m2 = String(dd.getMonth() + 1).padStart(2, "0");
    const d2 = String(dd.getDate()).padStart(2, "0");
    dates.push(`${y2}-${m2}-${d2}`);
  }
  return dates; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
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

function getStreakData(tasks, workouts) {
  const today = todayString();

  function isActiveDay(dateStr) {
    const hasCompletedTask = Object.values(tasks).some(section =>
      section.some(task => task.completedDates.includes(dateStr))
    );
    const hasWorkout = (workouts[dateStr] || []).length > 0;
    return hasCompletedTask || hasWorkout;
  }

  let current = 0;
  let cursor = today;
  while (isActiveDay(cursor)) {
    current++;
    cursor = offsetDate(cursor, -1);
  }

  const allDates = new Set();
  Object.values(tasks).forEach(section =>
    section.forEach(task => task.completedDates.forEach(d => allDates.add(d)))
  );
  Object.keys(workouts).forEach(d => {
    if ((workouts[d] || []).length > 0) allDates.add(d);
  });

  const sorted = Array.from(allDates).sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || offsetDate(sorted[i - 1], 1) === sorted[i]) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  longest = Math.max(longest, current);

  return { current, longest };
}

function getWeeklyDots(tasks, workouts) {
  const today = todayString();
  const weekDates = getWeekDates(today);
  return weekDates.map(dateStr => {
    const hasTask = Object.values(tasks).some(section =>
      section.some(task => task.completedDates.includes(dateStr))
    );
    const hasWorkout = (workouts[dateStr] || []).length > 0;
    return { dateStr, active: hasTask || hasWorkout };
  });
}

export function getWeekStats(tasks, workouts, weekDates) {
  const today = todayString();

  const activeDays = weekDates.filter(dateStr => {
    const hasTask = Object.values(tasks).some(s => s.some(t => t.completedDates.includes(dateStr)));
    const hasWorkout = (workouts[dateStr] || []).length > 0;
    return hasTask || hasWorkout;
  }).length;

  const totalWorkouts = weekDates.reduce((acc, d) => acc + (workouts[d] || []).length, 0);

  let totalPossible = 0;
  let totalCompleted = 0;
  weekDates.forEach(dateStr => {
    if (dateStr > today) return;
    const allTasks = Object.values(tasks).flat();
    const dow = getDayOfWeek(dateStr);
    const visible = allTasks.filter(task => {
      if (task.frequency === "daily") return true;
      if (task.frequency === "weekly") return (task.days || []).includes(dow);
      if (task.frequency === "one-time") return task.date === dateStr;
      return false;
    });
    totalPossible += visible.length;
    totalCompleted += visible.filter(t => t.completedDates.includes(dateStr)).length;
  });

  const taskPct = totalPossible === 0 ? null : Math.round((totalCompleted / totalPossible) * 100);

  return { activeDays, totalWorkouts, taskPct, totalCompleted, totalPossible };
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

const ANCHOR_TEMPLATES = [
  { id: "anchor-push", name: "Push Day", anchor: true, exercises: ["Bench Press", "Incline DB Press", "Shoulder Press", "Lateral Raises", "Tricep Pushdown"] },
  { id: "anchor-pull", name: "Pull Day", anchor: true, exercises: ["Deadlift", "Bent Over Row", "Lat Pulldown", "Face Pulls", "Bicep Curls"] },
  { id: "anchor-legs", name: "Leg Day", anchor: true, exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raises"] },
  { id: "anchor-upper", name: "Upper Body", anchor: true, exercises: ["Bench Press", "Bent Over Row", "Shoulder Press", "Lat Pulldown", "Bicep Curls", "Tricep Pushdown"] },
  { id: "anchor-full", name: "Full Body", anchor: true, exercises: ["Squat", "Bench Press", "Deadlift", "Shoulder Press", "Bent Over Row"] },
  { id: "anchor-cardio", name: "Cardio & Core", anchor: true, exercises: ["Treadmill Run", "Plank", "Sit Ups", "Mountain Climbers", "Jump Rope"] },
];

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
      exercises: (session.exercises || []).map(ex => ({ ...ex, sets: ex.sets || [] })),
      notes: session.notes || "",
      endTime: session.endTime || null,
      duration: session.duration || null,
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

  const [exerciseHistory, setExerciseHistory] = useState(() => {
    const saved = localStorage.getItem("anchor-exercise-history");
    return saved ? JSON.parse(saved) : {};
  });

  const [userTemplates, setUserTemplates] = useState(() => {
    const saved = localStorage.getItem("anchor-templates");
    return saved ? JSON.parse(saved) : [];
  });

  const [weeklyReviewNotes, setWeeklyReviewNotes] = useState(() => {
    const saved = localStorage.getItem("anchor-weekly-review");
    return saved ? JSON.parse(saved) : {};
  });

  const [screen, setScreen] = useState("home"); // "home" | "add" | "review"
  const [activeSection, setActiveSection] = useState(null);
  const [viewedDate, setViewedDate] = useState(todayString());
  const [activeScreen, setActiveScreen] = useState("today");
  const [summarySession, setSummarySession] = useState(null);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const SWIPE_THRESHOLD = 60;
  const VERTICAL_LOCK = 10;

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(deltaY) > Math.abs(deltaX) - VERTICAL_LOCK) return;
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

  useEffect(() => { localStorage.setItem("anchor-tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("anchor-workouts", JSON.stringify(workouts)); }, [workouts]);
  useEffect(() => { localStorage.setItem("anchor-exercise-history", JSON.stringify(exerciseHistory)); }, [exerciseHistory]);
  useEffect(() => { localStorage.setItem("anchor-templates", JSON.stringify(userTemplates)); }, [userTemplates]);
  useEffect(() => { localStorage.setItem("anchor-weekly-review", JSON.stringify(weeklyReviewNotes)); }, [weeklyReviewNotes]);

  function saveWeeklyReview(weekKey, reflection, goals) {
    setWeeklyReviewNotes(prev => ({
      ...prev,
      [weekKey]: { reflection, goals, savedAt: todayString() },
    }));
  }

  function createTemplate(name, exercises) {
    setUserTemplates(prev => [...prev, { id: `template-${Date.now()}`, name, anchor: false, exercises }]);
  }
  function updateTemplate(templateId, name, exercises) {
    setUserTemplates(prev => prev.map(t => t.id === templateId ? { ...t, name, exercises } : t));
  }
  function deleteTemplate(templateId) {
    setUserTemplates(prev => prev.filter(t => t.id !== templateId));
  }

  function startWorkout(templateExercises = []) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
    const newSession = {
      id: `workout-${Date.now()}`,
      startTime: timeLabel,
      startTimestamp: now.getTime(),
      endTime: null, duration: null, status: "active", notes: "",
      exercises: templateExercises.map(name => ({
        id: `exercise-${Date.now()}-${Math.random()}`, name, sets: [],
      })),
    };
    setWorkouts(prev => ({ ...prev, [viewedDate]: [...(prev[viewedDate] || []), newSession] }));
  }

  function endWorkout(sessionId) {
    const now = new Date();
    const endTimeLabel = now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
    setWorkouts(prev => {
      const sessions = prev[viewedDate] || [];
      const session = sessions.find(s => s.id === sessionId);
      const startTs = session?.startTimestamp || now.getTime();
      const durationMins = Math.round((now.getTime() - startTs) / 60000);
      if (session) {
        setExerciseHistory(prevHistory => {
          const updated = { ...prevHistory };
          (session.exercises || []).forEach(ex => {
            if (!updated[ex.name]) updated[ex.name] = [];
            updated[ex.name] = [{ date: viewedDate, sets: ex.sets || [] }, ...updated[ex.name].slice(0, 19)];
          });
          return updated;
        });
      }
      const updatedSessions = sessions.map(s =>
        s.id === sessionId ? { ...s, status: "completed", endTime: endTimeLabel, duration: durationMins } : s
      );
      setSummarySession(updatedSessions.find(s => s.id === sessionId));
      return { ...prev, [viewedDate]: updatedSessions };
    });
  }

  function updateWorkoutNotes(sessionId, notes) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(s => s.id === sessionId ? { ...s, notes } : s),
    }));
  }

  function addExercise(sessionId, exercise) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(s =>
        s.id === sessionId ? { ...s, exercises: [...(s.exercises || []), exercise] } : s
      ),
    }));
  }

  function addSet(sessionId, exerciseId, set) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(s =>
        s.id === sessionId ? {
          ...s,
          exercises: (s.exercises || []).map(ex =>
            ex.id === exerciseId ? { ...ex, sets: [...(ex.sets || []), set] } : ex
          ),
        } : s
      ),
    }));
  }

  function deleteSet(sessionId, exerciseId, setId) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(s =>
        s.id === sessionId ? {
          ...s,
          exercises: (s.exercises || []).map(ex =>
            ex.id === exerciseId ? { ...ex, sets: (ex.sets || []).filter(set => set.id !== setId) } : ex
          ),
        } : s
      ),
    }));
  }

  function deleteExercise(sessionId, exerciseId) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(s =>
        s.id === sessionId ? { ...s, exercises: (s.exercises || []).filter(ex => ex.id !== exerciseId) } : s
      ),
    }));
  }

  function deleteWorkout(sessionId) {
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: (prev[viewedDate] || []).filter(s => s.id !== sessionId),
    }));
  }

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
      id: Date.now(), name: taskName, section, frequency, completedDates: [],
      ...(frequency === "weekly" && { days }),
      ...(frequency === "one-time" && { date }),
    };
    setTasks(prev => ({ ...prev, [section]: [...prev[section], newTask] }));
    setScreen("home");
  }

  function deleteTask(section, taskId) {
    setTasks(prev => ({ ...prev, [section]: prev[section].filter(t => t.id !== taskId) }));
  }

  function updateTask(section, taskId, updates) {
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].map(t => t.id === taskId ? { ...t, ...updates } : t),
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

  // ── Computed ──
  const visibleTasks = getVisibleTasks(tasks, viewedDate);
  const { current: currentStreak, longest: longestStreak } = getStreakData(tasks, workouts);
  const weeklyDots = getWeeklyDots(tasks, workouts);
  const today = todayString();
  const currentWeekDates = getWeekDates(today);
  const currentWeekKey = getWeekKey(today);
  const weekStats = getWeekStats(tasks, workouts, currentWeekDates);

  // ── Routing ──
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

  if (screen === "review") {
    return (
      <WeeklyReviewScreen
        weekKey={currentWeekKey}
        weekDates={currentWeekDates}
        weekStats={weekStats}
        weeklyDots={weeklyDots}
        savedNotes={weeklyReviewNotes[currentWeekKey] || {}}
        onSave={(reflection, goals) => saveWeeklyReview(currentWeekKey, reflection, goals)}
        onBack={() => setScreen("home")}
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
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          weeklyDots={weeklyDots}
          weekStats={weekStats}
          onOpenReview={() => setScreen("review")}
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
          onUpdateNotes={updateWorkoutNotes}
          exerciseHistory={exerciseHistory}
          summarySession={summarySession}
          onDismissSummary={() => setSummarySession(null)}
          anchorTemplates={ANCHOR_TEMPLATES}
          userTemplates={userTemplates}
          onCreateTemplate={createTemplate}
          onUpdateTemplate={updateTemplate}
          onDeleteTemplate={deleteTemplate}
        />
      )}

      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
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
