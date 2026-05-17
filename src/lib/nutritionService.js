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
