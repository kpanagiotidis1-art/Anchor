import { useState, useEffect } from "react";

const SETTINGS_KEY = "anchor-settings";
const NUTRITION_SETUP_KEY = "anchor-nutrition-setup";

const DEFAULT_NUTRITION_GOALS = { calories: 2000, protein: 150, carbs: 200, fats: 65, water: 8 };

const defaultSettings = {
  darkMode: false,
  restTimerEnabled: true,
  restTimerDuration: 90, // seconds
  smartSuggestionsEnabled: true,
  nutritionGoals: DEFAULT_NUTRITION_GOALS,
};

function repairNutritionGoals(goals) {
  // If goals match the generic defaults, check if nutrition onboarding has calculated values
  if (!goals || goals.protein === DEFAULT_NUTRITION_GOALS.protein) {
    try {
      const profile = JSON.parse(localStorage.getItem(NUTRITION_SETUP_KEY) || "null");
      if (profile?.targets) {
        return {
          calories: profile.targets.calories ?? goals?.calories ?? DEFAULT_NUTRITION_GOALS.calories,
          protein:  profile.targets.protein  ?? goals?.protein  ?? DEFAULT_NUTRITION_GOALS.protein,
          carbs:    profile.targets.carbs    ?? goals?.carbs    ?? DEFAULT_NUTRITION_GOALS.carbs,
          fats:     profile.targets.fats     ?? goals?.fats     ?? DEFAULT_NUTRITION_GOALS.fats,
          water:    profile.targets.waterGlasses ?? goals?.water ?? DEFAULT_NUTRITION_GOALS.water,
        };
      }
    } catch { /* ignore */ }
  }
  return goals || DEFAULT_NUTRITION_GOALS;
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) {
      return { ...defaultSettings, nutritionGoals: repairNutritionGoals(null) };
    }
    const parsed = JSON.parse(saved);
    return { ...defaultSettings, ...parsed, nutritionGoals: repairNutritionGoals(parsed.nutritionGoals) };
  } catch {
    return defaultSettings;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply dark mode to document root
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      settings.darkMode ? "dark" : "light"
    );
    // Also set color-scheme so browser UI (scrollbars, inputs) matches
    document.documentElement.style.colorScheme = settings.darkMode ? "dark" : "light";
  }, [settings.darkMode]);

  function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  return { settings, updateSetting };
}
