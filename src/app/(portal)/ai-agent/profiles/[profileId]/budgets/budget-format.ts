const budgetFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

export function formatBudget(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new Error("The API returned an invalid budget amount.");
  }
  return budgetFormatter.format(value / 1000);
}

export function parseBudget(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("Enter a non-negative amount with at most two decimal places.");
  }
  const [whole, fraction = ""] = value.split(".");
  const scaled = Number(`${whole}${fraction.padEnd(3, "0")}`);
  if (!Number.isSafeInteger(scaled)) {
    throw new Error("The budget amount is too large.");
  }
  return scaled;
}

export function validateBudgets(budgets: {
  budget_daily: number;
  budget_7_days: number;
}): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];
  for (const [field, amount] of Object.entries(budgets)) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      errors.push({ field, message: "Budget must be greater than 0." });
    }
  }
  if (budgets.budget_7_days < budgets.budget_daily) {
    errors.push({
      field: "budget_7_days",
      message: "7-day budget must be equal to or greater than the daily budget.",
    });
  }
  return errors;
}
