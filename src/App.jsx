import { useState, useEffect, useRef } from "react";
import HomeScreen from "./screens/HomeScreen";
import AddTaskScreen from "./screens/AddTaskScreen";
import WorkoutScreen from "./screens/WorkoutScreen";
import WeeklyReviewScreen from "./screens/WeeklyReviewScreen";
import AuthScreen from "./screens/AuthScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { useSettings } from "./hooks/useSettings";
import { supabase } from "./lib/supabase";
import {
  fetchTasks,
  createTask,
  updateTask as dbUpdateTask,
  archiveTask,
  markComplete,
  markIncomplete,
  fetchWeeklyReviews,
  saveWeeklyReview as dbSaveWeeklyReview,
} from "./lib/taskService";
import {
  fetchAllSessions,
  createSession,
  updateSession,
  deleteSession,
  fetchExerciseHistory,
  saveExerciseHistory,
  fetchUserTemplates,
  createUserTemplate,
  updateUserTemplate,
  deleteUserTemplate,
} from "./lib/workoutService";
import OverviewScreen from "./screens/OverviewScreen";
import NutritionScreen from "./screens/NutritionScreen";
import {
  getNutritionForDate,
  addMealToDate,
  deleteMealFromDate,
  setWaterForDate,
  getTotalsForDate,
} from "./lib/nutritionService";

const SCREENS = ["today", "overview", "nutrition", "workout"];

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
  return dates;
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

const ANCHOR_TEMPLATES = [
  { id: "anchor-push", name: "Push Day", anchor: true, exercises: ["Bench Press", "Incline DB Press", "Shoulder Press", "Lateral Raises", "Tricep Pushdown"] },
  { id: "anchor-pull", name: "Pull Day", anchor: true, exercises: ["Deadlift", "Bent Over Row", "Lat Pulldown", "Face Pulls", "Bicep Curls"] },
  { id: "anchor-legs", name: "Leg Day", anchor: true, exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raises"] },
  { id: "anchor-upper", name: "Upper Body", anchor: true, exercises: ["Bench Press", "Bent Over Row", "Shoulder Press", "Lat Pulldown", "Bicep Curls", "Tricep Pushdown"] },
  { id: "anchor-full", name: "Full Body", anchor: true, exercises: ["Squat", "Bench Press", "Deadlift", "Shoulder Press", "Bent Over Row"] },
  { id: "anchor-cardio", name: "Cardio & Core", anchor: true, exercises: ["Treadmill Run", "Plank", "Sit Ups", "Mountain Climbers", "Jump Rope"] },
];

export default function App() {
  // ── Auth ──
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Settings ──
  const { settings, updateSetting } = useSettings();

  // ── Task state (Supabase) ──
  const [tasks, setTasks] = useState({ Morning: [], Afternoon: [], Night: [] });
  const [tasksLoading, setTasksLoading] = useState(false);

  // ── Weekly reviews (Supabase) ──
  const [weeklyReviewNotes, setWeeklyReviewNotes] = useState({});

  // ── Workout state (Supabase — Phase 2) ──
  const [workouts, setWorkouts] = useState({});
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [userTemplates, setUserTemplates] = useState([]);

  // ── Nutrition state (localStorage) ──
  const [nutritionData, setNutritionData] = useState({});

  // ── UI state ──
  const [screen, setScreen] = useState("home");
  const [activeSection, setActiveSection] = useState(null);
  const [viewedDate, setViewedDate] = useState(todayString());
  const [activeScreen, setActiveScreen] = useState("overview");
  const [summarySession, setSummarySession] = useState(null);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const SWIPE_THRESHOLD = 60;
  const VERTICAL_LOCK = 10;

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) loadUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.user) loadUserData(session.user.id);
      if (event === "SIGNED_OUT") {
        setTasks({ Morning: [], Afternoon: [], Night: [] });
        setWeeklyReviewNotes({});
        setWorkouts({});
        setExerciseHistory({});
        setUserTemplates([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks({ Morning: [], Afternoon: [], Night: [] });
      setWeeklyReviewNotes({});
      setWorkouts({});
      setExerciseHistory({});
      setUserTemplates([]);
    }
  }, [user]);

  async function loadUserData(userId) {
    setTasksLoading(true);
    try {
      const [fetchedTasks, fetchedReviews, fetchedWorkouts, fetchedHistory, fetchedTemplates] = await Promise.all([
        fetchTasks(userId),
        fetchWeeklyReviews(userId),
        fetchAllSessions(userId),
        fetchExerciseHistory(userId),
        fetchUserTemplates(userId),
      ]);
      setTasks(fetchedTasks);
      setWeeklyReviewNotes(fetchedReviews);
      setWorkouts(fetchedWorkouts);
      setExerciseHistory(fetchedHistory);
      setUserTemplates(fetchedTemplates);
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setTasksLoading(false);
    }
  }

  // ── Swipe navigation ──
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

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ── Task handlers ──
  async function toggleTask(section, taskId) {
    if (!user) return;
    const task = tasks[section].find(t => t.id === taskId);
    if (!task) return;
    const already = task.completedDates.includes(viewedDate);
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          completedDates: already
            ? t.completedDates.filter(d => d !== viewedDate)
            : [...t.completedDates, viewedDate],
        };
      }),
    }));
    try {
      if (already) {
        await markIncomplete(user.id, taskId, viewedDate);
      } else {
        await markComplete(user.id, taskId, viewedDate);
      }
    } catch (err) {
      console.error("Failed to sync completion:", err);
      setTasks(prev => ({
        ...prev,
        [section]: prev[section].map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            completedDates: already
              ? [...t.completedDates, viewedDate]
              : t.completedDates.filter(d => d !== viewedDate),
          };
        }),
      }));
    }
  }

  async function addTask(section, taskName, frequency, days, date) {
    if (!user) return;
    try {
      const newTask = await createTask(user.id, { name: taskName, section, frequency, days, date });
      setTasks(prev => ({ ...prev, [section]: [...prev[section], newTask] }));
      setScreen("home");
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }

  async function deleteTask(section, taskId) {
    if (!user) return;
    setTasks(prev => ({ ...prev, [section]: prev[section].filter(t => t.id !== taskId) }));
    try {
      await archiveTask(taskId);
    } catch (err) {
      console.error("Failed to archive task:", err);
      loadUserData(user.id);
    }
  }

  async function updateTask(section, taskId, updates) {
    if (!user) return;
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
    try {
      await dbUpdateTask(taskId, updates);
    } catch (err) {
      console.error("Failed to update task:", err);
      loadUserData(user.id);
    }
  }

  async function resetDay() {
    if (!user) return;
    const completionsToRemove = Object.values(tasks).flat()
      .filter(task => task.completedDates.includes(viewedDate))
      .map(task => task.id);

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

    try {
      await Promise.all(completionsToRemove.map(id => markIncomplete(user.id, id, viewedDate)));
    } catch (err) {
      console.error("Failed to reset day:", err);
      loadUserData(user.id);
    }
  }

  // ── Weekly review ──
  async function saveWeeklyReview(weekKey, reflection, goals) {
    setWeeklyReviewNotes(prev => ({
      ...prev,
      [weekKey]: { reflection, goals, savedAt: todayString() },
    }));
    try {
      await dbSaveWeeklyReview(user.id, weekKey, reflection, goals);
    } catch (err) {
      console.error("Failed to save weekly review:", err);
    }
  }

  // ── Template handlers (Supabase) ──
  async function createTemplate(name, exercises) {
    if (!user) return;
    const newTemplate = { id: `template-${Date.now()}`, name, anchor: false, exercises };
    setUserTemplates(prev => [...prev, newTemplate]);
    try {
      await createUserTemplate(user.id, newTemplate);
    } catch (err) {
      console.error("Failed to create template:", err);
      loadUserData(user.id);
    }
  }

  async function updateTemplate(templateId, name, exercises) {
    if (!user) return;
    setUserTemplates(prev => prev.map(t => t.id === templateId ? { ...t, name, exercises } : t));
    try {
      await updateUserTemplate(templateId, name, exercises);
    } catch (err) {
      console.error("Failed to update template:", err);
      loadUserData(user.id);
    }
  }

  async function deleteTemplateHandler(templateId) {
    if (!user) return;
    setUserTemplates(prev => prev.filter(t => t.id !== templateId));
    try {
      await deleteUserTemplate(templateId);
    } catch (err) {
      console.error("Failed to delete template:", err);
      loadUserData(user.id);
    }
  }

  // ── Workout handlers (Supabase) ──

  // Helper: sync current session state to Supabase
  async function syncSession(sessionId, dateStr) {
    const sessions = workouts[dateStr] || [];
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    try {
      await updateSession(sessionId, {
        status: session.status,
        endTime: session.endTime,
        duration: session.duration,
        notes: session.notes,
        exercises: session.exercises,
      });
    } catch (err) {
      console.error("Failed to sync session:", err);
    }
  }

  async function startWorkout(templateExercises = []) {
    if (!user) return;
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
    // Optimistic
    setWorkouts(prev => ({ ...prev, [viewedDate]: [...(prev[viewedDate] || []), newSession] }));
    try {
      await createSession(user.id, viewedDate, newSession);
    } catch (err) {
      console.error("Failed to create session:", err);
      setWorkouts(prev => ({
        ...prev,
        [viewedDate]: (prev[viewedDate] || []).filter(s => s.id !== newSession.id),
      }));
    }
  }

  async function endWorkout(sessionId) {
    if (!user) return;
    const now = new Date();
    const endTimeLabel = now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });

    let completedSession = null;

    setWorkouts(prev => {
      const sessions = prev[viewedDate] || [];
      const session = sessions.find(s => s.id === sessionId);
      const startTs = session?.startTimestamp || now.getTime();
      const durationMins = Math.round((now.getTime() - startTs) / 60000);

      const updatedSessions = sessions.map(s =>
        s.id === sessionId
          ? { ...s, status: "completed", endTime: endTimeLabel, duration: durationMins }
          : s
      );
      completedSession = updatedSessions.find(s => s.id === sessionId);
      setSummarySession(completedSession);
      return { ...prev, [viewedDate]: updatedSessions };
    });

    // Save exercise history and update session in Supabase
    try {
      const sessions = workouts[viewedDate] || [];
      const session = sessions.find(s => s.id === sessionId);
      const startTs = session?.startTimestamp || now.getTime();
      const durationMins = Math.round((now.getTime() - startTs) / 60000);

      await updateSession(sessionId, {
        status: "completed",
        endTime: endTimeLabel,
        duration: durationMins,
        exercises: session?.exercises || [],
      });

      if (session?.exercises?.length > 0) {
        await saveExerciseHistory(user.id, viewedDate, session.exercises);
        // Refresh exercise history state
        const freshHistory = await fetchExerciseHistory(user.id);
        setExerciseHistory(freshHistory);
      }
    } catch (err) {
      console.error("Failed to end workout in Supabase:", err);
    }
  }

  async function updateWorkoutNotes(sessionId, notes) {
    if (!user) return;
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: prev[viewedDate].map(s => s.id === sessionId ? { ...s, notes } : s),
    }));
    try {
      await updateSession(sessionId, { notes });
    } catch (err) {
      console.error("Failed to update notes:", err);
    }
  }

  // For exercise mutations (add/delete/rename/set changes),
  // we update local state then sync the full exercises array to Supabase
  function mutateSession(sessionId, mutateFn) {
    setWorkouts(prev => {
      const sessions = prev[viewedDate] || [];
      const updated = sessions.map(s => s.id === sessionId ? mutateFn(s) : s);
      const updatedSession = updated.find(s => s.id === sessionId);
      // Sync to Supabase after state update
      if (updatedSession) {
        updateSession(sessionId, { exercises: updatedSession.exercises })
          .catch(err => console.error("Failed to sync exercises:", err));
      }
      return { ...prev, [viewedDate]: updated };
    });
  }

  function addExercise(sessionId, exercise) {
    mutateSession(sessionId, s => ({ ...s, exercises: [...(s.exercises || []), exercise] }));
  }

  function addSet(sessionId, exerciseId, set) {
    mutateSession(sessionId, s => ({
      ...s,
      exercises: (s.exercises || []).map(ex =>
        ex.id === exerciseId ? { ...ex, sets: [...(ex.sets || []), set] } : ex
      ),
    }));
  }

  function deleteSet(sessionId, exerciseId, setId) {
    mutateSession(sessionId, s => ({
      ...s,
      exercises: (s.exercises || []).map(ex =>
        ex.id === exerciseId ? { ...ex, sets: (ex.sets || []).filter(set => set.id !== setId) } : ex
      ),
    }));
  }

  function deleteExercise(sessionId, exerciseId) {
    mutateSession(sessionId, s => ({
      ...s,
      exercises: (s.exercises || []).filter(ex => ex.id !== exerciseId),
    }));
  }

  function renameExercise(sessionId, exerciseId, newName) {
    mutateSession(sessionId, s => ({
      ...s,
      exercises: (s.exercises || []).map(ex =>
        ex.id === exerciseId ? { ...ex, name: newName } : ex
      ),
    }));
  }

  async function deleteWorkout(sessionId) {
    if (!user) return;
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: (prev[viewedDate] || []).filter(s => s.id !== sessionId),
    }));
    try {
      await deleteSession(sessionId);
    } catch (err) {
      console.error("Failed to delete session:", err);
      loadUserData(user.id);
    }
  }

  // ── Nutrition handlers (localStorage) ──
  function handleAddMeal(dateStr, meal) {
    const updated = addMealToDate(dateStr, meal);
    setNutritionData(prev => ({ ...prev, [dateStr]: updated }));
  }

  function handleDeleteMeal(dateStr, mealId) {
    const updated = deleteMealFromDate(dateStr, mealId);
    setNutritionData(prev => ({ ...prev, [dateStr]: updated }));
  }

  function handleSetWater(dateStr, glasses) {
    const updated = setWaterForDate(dateStr, glasses);
    setNutritionData(prev => ({ ...prev, [dateStr]: updated }));
  }

  // Load nutrition for viewed date on mount and date change
  useEffect(() => {
    const data = getNutritionForDate(viewedDate);
    setNutritionData(prev => ({ ...prev, [viewedDate]: data }));
  }, [viewedDate]);

  function navigateDay(direction, exactDate) {
    if (exactDate !== undefined) {
      setViewedDate(exactDate);
    } else {
      setViewedDate(prev => offsetDate(prev, direction));
    }
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
  const weekStats = getWeekStats(tasks, workouts, currentWeekDates);
  const todayNutritionTotals = getTotalsForDate(today);

  // ── Loading states ──
  if (authLoading) {
    return (
      <div style={{
        width: "100%", minHeight: "100vh", background: "#f5f5f3",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <p style={{ fontSize: "0.9rem", color: "#aaa" }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (tasksLoading) {
    return (
      <div style={{
        width: "100%", minHeight: "100vh", background: "#f5f5f3",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <p style={{ fontSize: "0.9rem", color: "#aaa" }}>Loading your data…</p>
      </div>
    );
  }

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
        tasks={tasks}
        workouts={workouts}
        weeklyReviewNotes={weeklyReviewNotes}
        onSave={saveWeeklyReview}
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        settings={settings}
        onUpdateSetting={updateSetting}
        userEmail={user?.email}
        onLogout={handleLogout}
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
          onEditTask={updateTask}
          onDeleteTask={deleteTask}
        />
      )}

      {activeScreen === "overview" && (
        <OverviewScreen
          tasks={visibleTasks}
          workouts={workouts}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          weeklyDots={weeklyDots}
          weekStats={weekStats}
          viewedDate={viewedDate}
          onGoToTasks={() => setActiveScreen("today")}
          onOpenSettings={() => setScreen("settings")}
          onOpenReview={() => setScreen("review")}
          nutritionSummary={todayNutritionTotals}
          nutritionGoals={settings.nutritionGoals}
          onGoToNutrition={() => setActiveScreen("nutrition")}
        />
      )}

      {activeScreen === "nutrition" && (
        <NutritionScreen
          nutritionData={nutritionData}
          goals={settings.nutritionGoals || { calories: 2000, protein: 150, carbs: 200, fats: 65, water: 8 }}
          onAddMeal={handleAddMeal}
          onDeleteMeal={handleDeleteMeal}
          onSetWater={handleSetWater}
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
          onRenameExercise={renameExercise}
          onDeleteWorkout={deleteWorkout}
          onUpdateNotes={updateWorkoutNotes}
          exerciseHistory={exerciseHistory}
          summarySession={summarySession}
          onDismissSummary={() => setSummarySession(null)}
          anchorTemplates={ANCHOR_TEMPLATES}
          userTemplates={userTemplates}
          onCreateTemplate={createTemplate}
          onUpdateTemplate={updateTemplate}
          onDeleteTemplate={deleteTemplateHandler}
          restTimerEnabled={settings.restTimerEnabled}
          restTimerDuration={settings.restTimerDuration}
          smartSuggestionsEnabled={settings.smartSuggestionsEnabled}
        />
      )}

      {/* Tab bar — three tabs */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        background: "var(--tab-bg)",
        borderTop: "1px solid var(--tab-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {[
          { key: "today", label: "Tasks" },
          { key: "overview", label: "Overview" },
          { key: "nutrition", label: "Nutrition" },
          { key: "workout", label: "Workout" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveScreen(tab.key)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              fontSize: activeScreen === tab.key ? "0.88rem" : "0.82rem",
              fontWeight: activeScreen === tab.key ? 700 : 400,
              color: activeScreen === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
              padding: "12px 8px",
              borderBottom: activeScreen === tab.key
                ? "2px solid var(--text-primary)"
                : "2px solid transparent",
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
