const HINTS_KEY = "anchor-hints-seen";

function getSeenHints() {
  try {
    const raw = localStorage.getItem(HINTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function markHintSeen(id) {
  const seen = getSeenHints();
  if (!seen.includes(id)) {
    localStorage.setItem(HINTS_KEY, JSON.stringify([...seen, id]));
  }
}

function isHintSeen(id) {
  return getSeenHints().includes(id);
}

// Reset all hints (for testing)
export function resetHints() {
  localStorage.removeItem(HINTS_KEY);
}

// Returns true if hint should show, and provides a dismiss function
export function useHint(id) {
  return {
    shouldShow: !isHintSeen(id),
    dismiss: () => markHintSeen(id),
  };
}

// All hint definitions — single source of truth
export const HINTS = {
  workout_templates: {
    id: "workout_templates",
    text: "Templates make repeat workouts faster.",
    sub: "Save your exercises as a template to start in one tap.",
  },
  nutrition_ai: {
    id: "nutrition_ai",
    text: "Scan meals with AI or log manually.",
    sub: "Take a photo of your food and let AI estimate the macros.",
  },
  weekly_progress: {
    id: "weekly_progress",
    text: "Your weekly progress updates automatically.",
    sub: "Check in here each week to review and reflect.",
  },
  tasks_first: {
    id: "tasks_first",
    text: "Build your daily structure here.",
    sub: "Add tasks to Morning, Afternoon, or Night — they repeat based on your schedule.",
  },
};
