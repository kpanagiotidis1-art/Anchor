import { useState, useEffect } from "react";

const SETTINGS_KEY = "anchor-settings";

const defaultSettings = {
  darkMode: false,
  restTimerEnabled: true,
  restTimerDuration: 90, // seconds
  smartSuggestionsEnabled: true,
  nutritionGoals: {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fats: 65,
    water: 8,
  },
};

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(saved) };
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
