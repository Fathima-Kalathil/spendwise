export const DEFAULT_CATEGORIES = [
  ...["Food", "Shopping", "Transport", "Rent", "Bills", "Healthcare", "Education", "Entertainment", "Travel", "Subscriptions", "Others"]
    .map((name, i) => ({ name, type: "expense" as const, color: ["#0F766E", "#2563EB", "#D97706", "#7C3AED", "#DB2777", "#DC2626", "#0891B2", "#EA580C", "#4F46E5", "#65A30D", "#6B7280"][i] })),
  ...["Salary", "Freelance", "Gifts", "Investments", "Others"]
    .map((name, i) => ({ name, type: "income" as const, color: ["#15803D", "#0D9488", "#C026D3", "#CA8A04", "#6B7280"][i] })),
];
