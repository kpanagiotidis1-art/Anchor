const FINANCE_KEY = "anchor-finance";

function load() {
  try {
    const raw = localStorage.getItem(FINANCE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch { return defaultState(); }
}

function defaultState() {
  return { monthlyIncome: 0, subscriptions: [], savingsGoals: [] };
}

function persist(data) {
  localStorage.setItem(FINANCE_KEY, JSON.stringify(data));
}

export function getFinanceData() { return load(); }

export function setMonthlyIncome(amount) {
  const data = load();
  data.monthlyIncome = amount;
  persist(data);
  return data;
}

export function addSubscription(sub) {
  const data = load();
  data.subscriptions = [...data.subscriptions, sub];
  persist(data);
  return data;
}

export function updateSubscription(id, updates) {
  const data = load();
  data.subscriptions = data.subscriptions.map(s => s.id === id ? { ...s, ...updates } : s);
  persist(data);
  return data;
}

export function deleteSubscription(id) {
  const data = load();
  data.subscriptions = data.subscriptions.filter(s => s.id !== id);
  persist(data);
  return data;
}

export function addSavingsGoal(goal) {
  const data = load();
  data.savingsGoals = [...data.savingsGoals, goal];
  persist(data);
  return data;
}

export function updateSavingsGoal(id, updates) {
  const data = load();
  data.savingsGoals = data.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g);
  persist(data);
  return data;
}

export function deleteSavingsGoal(id) {
  const data = load();
  data.savingsGoals = data.savingsGoals.filter(g => g.id !== id);
  persist(data);
  return data;
}

export function toMonthlyAmount(sub) {
  if (sub.frequency === "annual") return sub.amount / 12;
  if (sub.frequency === "weekly") return sub.amount * 52 / 12;
  return sub.amount;
}

export function getMonthlySubTotal(subs) {
  return subs.reduce((sum, s) => sum + toMonthlyAmount(s), 0);
}

export function getAnnualSubTotal(subs) {
  return subs.reduce((sum, s) => {
    if (s.frequency === "annual") return sum + s.amount;
    if (s.frequency === "weekly") return sum + s.amount * 52;
    return sum + s.amount * 12;
  }, 0);
}
