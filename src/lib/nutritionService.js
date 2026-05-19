const NUTRITION_KEY = "anchor-nutrition";

function loadAll() {
  try {
    const saved = localStorage.getItem(NUTRITION_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveAll(data) {
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(data));
}

// Get nutrition data for a specific date
export function getNutritionForDate(dateStr) {
  const all = loadAll();
  return all[dateStr] || { meals: [], water: 0 };
}

// Add a meal to a date
export function addMealToDate(dateStr, meal) {
  const all = loadAll();
  if (!all[dateStr]) all[dateStr] = { meals: [], water: 0 };
  all[dateStr].meals = [...all[dateStr].meals, meal];
  saveAll(all);
  return all[dateStr];
}

// Delete a meal from a date
export function deleteMealFromDate(dateStr, mealId) {
  const all = loadAll();
  if (!all[dateStr]) return { meals: [], water: 0 };
  all[dateStr].meals = all[dateStr].meals.filter(m => m.id !== mealId);
  saveAll(all);
  return all[dateStr];
}

// Set water intake for a date
export function setWaterForDate(dateStr, glasses) {
  const all = loadAll();
  if (!all[dateStr]) all[dateStr] = { meals: [], water: 0 };
  all[dateStr].water = Math.max(0, glasses);
  saveAll(all);
  return all[dateStr];
}

// Update a meal in a date
export function updateMealInDate(dateStr, updatedMeal) {
  const all = loadAll();
  if (!all[dateStr]) return { meals: [], water: 0 };
  all[dateStr].meals = all[dateStr].meals.map(m => m.id === updatedMeal.id ? updatedMeal : m);
  saveAll(all);
  return all[dateStr];
}
export function getTotalsForDate(dateStr) {
  const { meals } = getNutritionForDate(dateStr);
  return meals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fats: acc.fats + (meal.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

export function getRecentMeals(limit = 8) {
  const all = loadAll();
  const seen = new Set();
  const meals = [];
  const dates = Object.keys(all).sort().reverse();
  for (const date of dates) {
    const dayMeals = (all[date]?.meals || []).slice().reverse();
    for (const meal of dayMeals) {
      const key = meal.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        meals.push(meal);
        if (meals.length >= limit) return meals;
      }
    }
  }
  return meals;
}

// ── Nutrition profile / onboarding ──────────────────────────────────────────

const NUTRITION_SETUP_KEY = "anchor-nutrition-setup";

export function getNutritionProfile() {
  try {
    const saved = localStorage.getItem(NUTRITION_SETUP_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveNutritionProfile(profile) {
  localStorage.setItem(NUTRITION_SETUP_KEY, JSON.stringify(profile));
}

export function isNutritionSetupComplete() {
  return !!getNutritionProfile();
}

export function calculateNutritionTargets(profile) {
  const { sex, age, weightKg, heightCm, activityKey, intention } = profile;

  if (intention === "track") {
    return { calories: 2000, protein: 150, carbs: 220, fats: 65, waterGlasses: 8, tdee: 2000 };
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  const multiplier = activityMultipliers[activityKey] || 1.55;

  // Mifflin-St Jeor BMR
  const bmr = sex === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = Math.round(bmr * multiplier);

  const calories = intention === "build"
    ? tdee + 200
    : intention === "lean"
      ? Math.max(tdee - 300, 1200)
      : tdee;

  const proteinPerKg = intention === "build" ? 2.2 : intention === "lean" ? 2.0 : 1.8;
  const protein = Math.round(weightKg * proteinPerKg);

  const waterGlasses = Math.round((weightKg * 0.033) / 0.25); // 250ml glasses

  const proteinCal = protein * 4;
  const remaining = Math.max(calories - proteinCal, 0);
  const fats = Math.round((remaining * 0.3) / 9);
  const carbs = Math.round((remaining * 0.7) / 4);

  return { calories, protein, carbs, fats, waterGlasses, tdee };
}
