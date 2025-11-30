import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface CategoryBudgetData {
  category: string;
  spendMonth: number;
  spendWeek: number;
  budgetLimitMonth: number | null;
  hasBudget: boolean;
}

export interface BudgetOverviewResponse {
  categories: CategoryBudgetData[];
  currentMonthStart: string;
  currentMonthEnd: string;
  currentWeekStart: string;
  currentWeekEnd: string;
}

function getDateRanges() {
  const now = new Date();

  // Current month: first day to last day
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Current week: Monday to Sunday
  const dayOfWeek = now.getDay();
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday as start, so we need to go back (dayOfWeek - 1) days
  // But if today is Sunday (0), we need to go back 6 days to Monday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    monthStart,
    monthEnd,
    weekStart,
    weekEnd,
  };
}

function formatDateForQuery(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { monthStart, monthEnd, weekStart, weekEnd } = getDateRanges();

  // Fetch all transactions for the current month (which includes current week)
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('normalized_category, amount, date')
    .eq('user_id', user.id)
    .gte('date', formatDateForQuery(monthStart))
    .lte('date', formatDateForQuery(monthEnd));

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Fetch all budgets for the user
  const { data: budgets, error: budgetError } = await supabase
    .from('budgets')
    .select('normalized_category, amount, period_type')
    .eq('user_id', user.id);

  if (budgetError) {
    return NextResponse.json({ error: budgetError.message }, { status: 500 });
  }

  // Build a map of budgets by category
  const budgetMap = new Map<string, { amount: number; periodType: string }>();
  for (const budget of budgets || []) {
    if (budget.normalized_category) {
      budgetMap.set(budget.normalized_category, {
        amount: budget.amount,
        periodType: budget.period_type,
      });
    }
  }

  // Aggregate spending by category for month and week
  const weekStartStr = formatDateForQuery(weekStart);
  const weekEndStr = formatDateForQuery(weekEnd);

  const categorySpending = new Map<string, { month: number; week: number }>();

  for (const tx of transactions || []) {
    const category = tx.normalized_category || 'Uncategorized';
    const amount = Math.abs(Number(tx.amount)); // Use absolute value for spending

    if (!categorySpending.has(category)) {
      categorySpending.set(category, { month: 0, week: 0 });
    }

    const spending = categorySpending.get(category)!;
    spending.month += amount;

    // Check if transaction is within current week
    if (tx.date >= weekStartStr && tx.date <= weekEndStr) {
      spending.week += amount;
    }
  }

  // Also add categories from budgets that might not have transactions
  for (const [category] of budgetMap) {
    if (!categorySpending.has(category)) {
      categorySpending.set(category, { month: 0, week: 0 });
    }
  }

  // Merge data into final response format
  const categories: CategoryBudgetData[] = [];

  for (const [category, spending] of categorySpending) {
    const budget = budgetMap.get(category);

    categories.push({
      category,
      spendMonth: Math.round(spending.month * 100) / 100,
      spendWeek: Math.round(spending.week * 100) / 100,
      budgetLimitMonth: budget?.periodType === 'monthly' ? budget.amount : null,
      hasBudget: !!budget,
    });
  }

  // Sort by category name for consistent ordering
  categories.sort((a, b) => a.category.localeCompare(b.category));

  const response: BudgetOverviewResponse = {
    categories,
    currentMonthStart: monthStart.toISOString(),
    currentMonthEnd: monthEnd.toISOString(),
    currentWeekStart: weekStart.toISOString(),
    currentWeekEnd: weekEnd.toISOString(),
  };

  return NextResponse.json(response);
}
