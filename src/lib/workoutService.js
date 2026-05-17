import { supabase } from "./supabase";

// ── WORKOUT SESSIONS ──────────────────────────────────────

// Fetch all sessions for a user on a specific date
// Returns array of session objects in the shape App.jsx expects
export async function fetchSessionsForDate(userId, dateStr) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("workout_date", dateStr)
    .order("start_timestamp", { ascending: true });

  if (error) throw error;
  return (data || []).map(rowToSession);
}

// Fetch all sessions for a user across all dates
// Returns { "YYYY-MM-DD": [session, ...], ... }
export async function fetchAllSessions(userId) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false });

  if (error) throw error;

  const result = {};
  (data || []).forEach(row => {
    const dateStr = row.workout_date;
    if (!result[dateStr]) result[dateStr] = [];
    result[dateStr].push(rowToSession(row));
  });
  return result;
}

function rowToSession(row) {
  return {
    id: row.id,
    startTime: row.start_time,
    startTimestamp: row.start_timestamp,
    endTime: row.end_time,
    duration: row.duration,
    status: row.status,
    notes: row.notes,
    exercises: row.exercises || [],
  };
}

// Insert a new session
export async function createSession(userId, dateStr, session) {
  const { error } = await supabase
    .from("workout_sessions")
    .insert({
      id: session.id,
      user_id: userId,
      workout_date: dateStr,
      start_time: session.startTime,
      start_timestamp: session.startTimestamp,
      end_time: session.endTime,
      duration: session.duration,
      status: session.status,
      notes: session.notes,
      exercises: session.exercises,
    });

  if (error) throw error;
}

// Update a session (used for ending, editing exercises, notes etc)
export async function updateSession(sessionId, updates) {
  const dbUpdates = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
  if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.exercises !== undefined) dbUpdates.exercises = updates.exercises;

  const { error } = await supabase
    .from("workout_sessions")
    .update(dbUpdates)
    .eq("id", sessionId);

  if (error) throw error;
}

// Delete a session
export async function deleteSession(sessionId) {
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw error;
}


// ── EXERCISE HISTORY ──────────────────────────────────────

// Fetch all exercise history for a user
// Returns { "Exercise Name": [{ date, sets }, ...], ... }
export async function fetchExerciseHistory(userId) {
  const { data, error } = await supabase
    .from("exercise_history")
    .select("exercise_name, workout_date, sets")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false });

  if (error) throw error;

  const result = {};
  (data || []).forEach(row => {
    if (!result[row.exercise_name]) result[row.exercise_name] = [];
    result[row.exercise_name].push({
      date: row.workout_date,
      sets: row.sets || [],
    });
  });
  return result;
}

// Save exercise history entries for a completed session
// Keeps max 20 entries per exercise (handled by deleting oldest)
export async function saveExerciseHistory(userId, dateStr, exercises) {
  for (const ex of exercises) {
    if (!ex.name || !ex.sets || ex.sets.length === 0) continue;

    // Insert new entry
    const { error: insertError } = await supabase
      .from("exercise_history")
      .insert({
        user_id: userId,
        exercise_name: ex.name,
        workout_date: dateStr,
        sets: ex.sets,
      });

    if (insertError) {
      console.error("Failed to save exercise history for", ex.name, insertError);
      continue;
    }

    // Trim to max 20 entries — fetch all for this exercise, delete oldest
    const { data: allEntries } = await supabase
      .from("exercise_history")
      .select("id, workout_date")
      .eq("user_id", userId)
      .eq("exercise_name", ex.name)
      .order("workout_date", { ascending: false });

    if (allEntries && allEntries.length > 20) {
      const toDelete = allEntries.slice(20).map(e => e.id);
      await supabase
        .from("exercise_history")
        .delete()
        .in("id", toDelete);
    }
  }
}


// ── USER TEMPLATES ────────────────────────────────────────

// Fetch all user templates
export async function fetchUserTemplates(userId) {
  const { data, error } = await supabase
    .from("user_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    anchor: false,
    // Exercises may be plain strings (old format) or JSON strings
    // (when objects were stored in a text[] column). Parse safely.
    exercises: (row.exercises || []).map(ex => {
      if (typeof ex === "object" && ex !== null) return ex;
      try {
        const parsed = JSON.parse(ex);
        if (parsed && typeof parsed === "object" && parsed.name) return parsed;
      } catch {}
      // Plain string — old format
      return { name: ex, tracking_mode: "reps" };
    }),
  }));
}

// Create a new user template
export async function createUserTemplate(userId, template) {
  const { error } = await supabase
    .from("user_templates")
    .insert({
      id: template.id,
      user_id: userId,
      name: template.name,
      exercises: template.exercises,
    });

  if (error) throw error;
}

// Update a user template
export async function updateUserTemplate(templateId, name, exercises) {
  const { error } = await supabase
    .from("user_templates")
    .update({ name, exercises })
    .eq("id", templateId);

  if (error) throw error;
}

// Delete a user template
export async function deleteUserTemplate(templateId) {
  const { error } = await supabase
    .from("user_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;
}
