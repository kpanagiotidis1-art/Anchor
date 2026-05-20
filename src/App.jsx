import { useState, useEffect } from "react";
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
import { fetchWeightLogs } from "./lib/progressService";
import OverviewScreen from "./screens/OverviewScreen";
import ProgressScreen from "./screens/ProgressScreen";
import FinancialClarityScreen from "./screens/FinancialClarityScreen";
import NutritionScreen from "./screens/NutritionScreen";
import NutritionOnboarding from "./screens/NutritionOnboarding";
import OnboardingScreen, { isOnboardingComplete, markOnboardingComplete, getFocusMode } from "./screens/OnboardingScreen";
import { setFocusMode } from "./lib/focusConfig";
import {
  getNutritionForDate,
  addMealToDate,
  deleteMealFromDate,
  updateMealInDate,
  setWaterForDate,
  getTotalsForDate,
  isNutritionSetupComplete,
} from "./lib/nutritionService";

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

  // ── Onboarding ──
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingComplete);
  // focusMode drives focus-aware UI across all screens. Stored in localStorage,
  // mirrored in state so SettingsScreen changes re-render immediately.
  const [focusMode, setFocusModeState] = useState(getFocusMode);

  // ── Task state (Supabase) ──
  const [tasks, setTasks] = useState({ Morning: [], Afternoon: [], Night: [] });
  const [tasksLoading, setTasksLoading] = useState(false);

  // ── Weekly reviews (Supabase) ──
  const [weeklyReviewNotes, setWeeklyReviewNotes] = useState({});

  // ── Workout state (Supabase — Phase 2) ──
  const [workouts, setWorkouts] = useState({});
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [userTemplates, setUserTemplates] = useState([]);

  // ── Weight logs (Supabase) ──
  const [weightLogs, setWeightLogs] = useState([]);

  // ── Nutrition state (localStorage) ──
  const [nutritionData, setNutritionData] = useState({});
  const [nutritionSetupDone, setNutritionSetupDone] = useState(isNutritionSetupComplete);

  // ── UI state ──
  const [screen, setScreen] = useState("home");
  const [activeSection, setActiveSection] = useState(null);
  const [viewedDate, setViewedDate] = useState(todayString());
  const [activeScreen, setActiveScreen] = useState("overview");
  const [summarySession, setSummarySession] = useState(null);

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
        setWeightLogs([]);
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
      setWeightLogs([]);
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
      fetchWeightLogs(userId).then(setWeightLogs).catch(() => {});
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setTasksLoading(false);
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
      exercises: templateExercises.map(ex => {
        // Support both old string format and new object format { name, tracking_mode }
        const name = typeof ex === "string" ? ex : ex.name;
        const tracking_mode = typeof ex === "string" ? "reps" : (ex.tracking_mode || "reps");
        return {
          id: `exercise-${Date.now()}-${Math.random()}`,
          name,
          tracking_mode,
          sets: [],
        };
      }),
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

  async function updateWorkoutTitle(sessionId, title) {
    if (!user) return;
    setWorkouts(prev => ({
      ...prev,
      [viewedDate]: (prev[viewedDate] || []).map(s => s.id === sessionId ? { ...s, title: title || null } : s),
    }));
    try {
      await updateSession(sessionId, { title: title || null });
    } catch (err) {
      console.error("Failed to update workout title:", err);
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

  function handleUpdateMeal(dateStr, updatedMeal) {
    const updated = updateMealInDate(dateStr, updatedMeal);
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

  // Days since last active — for recovery copy in HomeScreen
  const daysSinceActive = (() => {
    if (currentStreak > 0) return 0;
    let cursor = offsetDate(today, -1);
    for (let i = 1; i <= 60; i++) {
      const hasTask = Object.values(tasks).some(s => s.some(t => t.completedDates.includes(cursor)));
      const hasWorkout = (workouts[cursor] || []).length > 0;
      if (hasTask || hasWorkout) return i;
      cursor = offsetDate(cursor, -1);
    }
    return 0; // no prior history found
  })();

  // ── Loading states ──
  if (authLoading) {
    return (
      <div style={{
        width: "100%", minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "8px",
      }}>
        <p style={{ fontSize: "var(--text-micro, 0.7rem)", fontWeight: 700, color: "var(--text-faint, #999)", letterSpacing: "0.22em", textTransform: "uppercase" }}>Anchor</p>
        <p style={{ fontSize: "var(--text-caption, 0.8rem)", color: "var(--text-muted, #aaa)" }}>Opening Anchor…</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // Show onboarding for new users (after auth, before main app)
  if (!onboardingDone) {
    return <OnboardingScreen onComplete={() => setOnboardingDone(true)} />;
  }

  if (tasksLoading) {
    return (
      <div style={{
        width: "100%", minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "8px",
      }}>
        <p style={{ fontSize: "var(--text-micro, 0.7rem)", fontWeight: 700, color: "var(--text-faint, #999)", letterSpacing: "0.22em", textTransform: "uppercase" }}>Anchor</p>
        <p style={{ fontSize: "var(--text-caption, 0.8rem)", color: "var(--text-muted, #aaa)" }}>Finding your rhythm…</p>
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

  if (screen === "finance") {
    return <FinancialClarityScreen onBack={() => setScreen("settings")} />;
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        settings={settings}
        onUpdateSetting={updateSetting}
        userEmail={user?.email}
        onLogout={handleLogout}
        onBack={() => setScreen("home")}
        focusMode={focusMode}
        onFocusChange={mode => {
          setFocusMode(mode);       // persist to localStorage via focusConfig
          setFocusModeState(mode);  // trigger re-render
        }}
        onGoToFinance={() => setScreen("finance")}
      />
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100svh", background: "var(--bg)" }}>
      {activeScreen === "today" && (
        <HomeScreen
          tasks={visibleTasks}
          onToggle={toggleTask}
          onAddTask={addTask}
          onResetDay={resetDay}
          viewedDate={viewedDate}
          onNavigateDay={navigateDay}
          onEditTask={updateTask}
          onDeleteTask={deleteTask}
          currentStreak={currentStreak}
          daysSinceActive={daysSinceActive}
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
          onGoToWorkout={() => setActiveScreen("workout")}
          onOpenSettings={() => setScreen("settings")}
          onOpenReview={() => setScreen("review")}
          nutritionSummary={todayNutritionTotals}
          nutritionGoals={settings.nutritionGoals}
          onGoToNutrition={() => setActiveScreen("nutrition")}
          onGoToProgress={() => setActiveScreen("progress")}
          weightLogs={weightLogs}
          daysSinceActive={daysSinceActive}
          focusMode={focusMode}
        />
      )}

      {activeScreen === "nutrition" && !nutritionSetupDone && (
        <NutritionOnboarding
          onComplete={({ targets }) => {
            updateSetting("nutritionGoals", {
              calories: targets.calories,
              protein: targets.protein,
              carbs: targets.carbs,
              fats: targets.fats,
              water: targets.waterGlasses,
            });
            setNutritionSetupDone(true);
          }}
        />
      )}

      {activeScreen === "nutrition" && nutritionSetupDone && (
        <NutritionScreen
          nutritionData={nutritionData}
          goals={settings.nutritionGoals || { calories: 2000, protein: 150, carbs: 200, fats: 65, water: 8 }}
          onAddMeal={handleAddMeal}
          onDeleteMeal={handleDeleteMeal}
          onUpdateMeal={handleUpdateMeal}
          onSetWater={handleSetWater}
          viewedDate={viewedDate}
          onNavigateDay={navigateDay}
        />
      )}

      {activeScreen === "progress" && (
        <ProgressScreen
          userId={user?.id}
          onBack={() => setActiveScreen("overview")}
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
          onUpdateTitle={updateWorkoutTitle}
          exerciseHistory={exerciseHistory}
          summarySession={summarySession}
          onDismissSummary={() => { setSummarySession(null); setActiveScreen("overview"); }}
          anchorTemplates={ANCHOR_TEMPLATES}
          userTemplates={userTemplates}
          onCreateTemplate={createTemplate}
          onUpdateTemplate={updateTemplate}
          onDeleteTemplate={deleteTemplateHandler}
          restTimerEnabled={settings.restTimerEnabled}
          restTimerDuration={settings.restTimerDuration}
          smartSuggestionsEnabled={settings.smartSuggestionsEnabled}
          allWorkouts={workouts}
        />
      )}

      {/* Tab bar */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        background: "var(--tab-bg)",
        borderTop: "1px solid var(--tab-border)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        height: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}>
        {[
          { key: "today", label: "Tasks", icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          )},
          { key: "nutrition", label: "Nutrition", icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M12 3v18"/>
              <path d="M7 3v5a5 5 0 0 0 10 0V3"/>
            </svg>
          )},
          { key: "overview", label: "Overview", icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )},
          { key: "progress", label: "Progress", icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          )},
          { key: "workout", label: "Workout", icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 5v14M18 5v14M3 9h3M18 9h3M3 15h3M18 15h3M6 9h12M6 15h12"/>
            </svg>
          )},
        ].map(tab => {
          const isActive = activeScreen === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveScreen(tab.key)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                borderTop: isActive
                  ? "2px solid var(--text-primary)"
                  : "2px solid transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                padding: "8px 4px 10px",
                transition: "color 0.2s ease, border-color 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
              }}
            >
              {tab.icon}
              <span style={{ fontSize: "0.65rem", fontWeight: isActive ? 600 : 400, letterSpacing: "0.02em" }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
