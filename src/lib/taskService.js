import { supabase } from "./supabase";

// ── Helpers ───────────────────────────────────────────────

// Convert a Supabase task row → the shape App.jsx expects
function rowToTask(row, completedDates = []) {
  return {
    id: row.id,
    name: row.name,
    section: row.section,
    frequency: row.frequency,
    completedDates,
    ...(row.frequency === "weekly" && { days: row.weekly_days || [] }),
    ...(row.frequency === "one-time" && { date: row.one_time_date }),
  };
}

// ── TASKS ─────────────────────────────────────────────────

// Fetch all active (non-archived) tasks for the logged-in user,
// along with all their completion dates.
// Returns tasks in the { Morning: [], Afternoon: [], Night: [] } shape.
export async function fetchTasks(userId) {
  // 1. Fetch task definitions
  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  if (taskError) throw taskError;
  if (!taskRows || taskRows.length === 0) {
    return { Morning: [], Afternoon: [], Night: [] };
  }

  // 2. Fetch all completions for these tasks
  const taskIds = taskRows.map(t => t.id);
  const { data: completionRows, error: completionError } = await supabase
    .from("task_completions")
    .select("task_id, completion_date")
    .eq("user_id", userId)
    .in("task_id", taskIds);

  if (completionError) throw completionError;

  // 3. Build a map: task_id → [completion_date strings]
  const completionMap = {};
  (completionRows || []).forEach(row => {
    if (!completionMap[row.task_id]) completionMap[row.task_id] = [];
    completionMap[row.task_id].push(row.completion_date);
  });

  // 4. Assemble into section shape
  const result = { Morning: [], Afternoon: [], Night: [] };
  taskRows.forEach(row => {
    const completedDates = completionMap[row.id] || [];
    result[row.section].push(rowToTask(row, completedDates));
  });

  return result;
}

// Add a new task. Returns the created task in App.jsx shape.
export async function createTask(userId, { name, section, frequency, days, date }) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      name,
      section,
      frequency,
      weekly_days: frequency === "weekly" ? (days || []) : null,
      one_time_date: frequency === "one-time" ? date : null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToTask(data, []);
}

// Update a task definition (rename, change frequency/days/date)
export async function updateTask(taskId, updates) {
  const dbUpdates = {
    name: updates.name,
    frequency: updates.frequency,
    weekly_days: updates.frequency === "weekly" ? (updates.days || []) : null,
    one_time_date: updates.frequency === "one-time" ? updates.date : null,
  };

  const { error } = await supabase
    .from("tasks")
    .update(dbUpdates)
    .eq("id", taskId);

  if (error) throw error;
}

// Soft-delete a task by archiving it
export async function archiveTask(taskId) {
  const { error } = await supabase
    .from("tasks")
    .update({ archived: true })
    .eq("id", taskId);

  if (error) throw error;
}

// ── COMPLETIONS ───────────────────────────────────────────

// Mark a task complete on a date
export async function markComplete(userId, taskId, dateStr) {
  const { error } = await supabase
    .from("task_completions")
    .upsert(
      { user_id: userId, task_id: taskId, completion_date: dateStr },
      { onConflict: "user_id,task_id,completion_date" }
    );

  if (error) throw error;
}

// Mark a task incomplete on a date (delete the completion row)
export async function markIncomplete(userId, taskId, dateStr) {
  const { error } = await supabase
    .from("task_completions")
    .delete()
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .eq("completion_date", dateStr);

  if (error) throw error;
}

// ── WEEKLY REVIEWS ────────────────────────────────────────

// Fetch all saved weekly reviews for a user
// Returns { "2026-W19": { reflection, goals, savedAt }, ... }
export async function fetchWeeklyReviews(userId) {
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("week_key, reflection, goals, saved_at")
    .eq("user_id", userId);

  if (error) throw error;

  const result = {};
  (data || []).forEach(row => {
    result[row.week_key] = {
      reflection: row.reflection,
      goals: row.goals,
      savedAt: row.saved_at,
    };
  });
  return result;
}

// Save (upsert) a weekly review
export async function saveWeeklyReview(userId, weekKey, reflection, goals) {
  const { error } = await supabase
    .from("weekly_reviews")
    .upsert(
      {
        user_id: userId,
        week_key: weekKey,
        reflection,
        goals,
        saved_at: new Date().toISOString().slice(0, 10),
      },
      { onConflict: "user_id,week_key" }
    );

  if (error) throw error;
}
