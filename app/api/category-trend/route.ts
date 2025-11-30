import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface MonthlySpend {
  month: string; // e.g., "Nov"
  monthIndex: number; // 0-11
  year: number;
  amount: number;
  isCurrentMonth: boolean;
}

export interface CategoryTrendResponse {
  monthlySpending: MonthlySpend[];
  budgetLimit: number | null;
}

function getLastThreeMonths(): { start: Date; end: Date; months: { month: number; year: number }[] } {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const months: { month: number; year: number }[] = [];

  // Go back 2 months from current month (total 3 months including current)
  for (let i = 2; i >= 0; i--) {
    let month = currentMonth - i;
    let year = currentYear;

    if (month < 0) {
      month += 12;
      year -= 1;
    }

    months.push({ month, year });
  }

  // Start date: first day of 3 months ago
  const startDate = new Date(months[0].year, months[0].month, 1);

  // End date: last day of current month
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  return { start: startDate, end: endDate, months };
}

function formatDateForQuery(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMonthName(monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex];
}

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  if (!category) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  }

  const { start, end, months } = getLastThreeMonths();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Fetch transactions for the last 3 months
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('amount, date')
    .eq('user_id', user.id)
    .eq('normalized_category', category)
    .gte('date', formatDateForQuery(start))
    .lte('date', formatDateForQuery(end));

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Fetch budget limit for this category
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('amount, period_type')
    .eq('user_id', user.id)
    .eq('normalized_category', category)
    .single();

  if (budgetError && budgetError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    return NextResponse.json({ error: budgetError.message }, { status: 500 });
  }

  // Aggregate spending by month
  const monthlyTotals = new Map<string, number>();

  // Initialize all months with 0
  for (const { month, year } of months) {
    const key = `${year}-${month}`;
    monthlyTotals.set(key, 0);
  }

  // Sum up transactions
  for (const tx of transactions || []) {
    const txDate = new Date(tx.date + 'T00:00:00');
    const txMonth = txDate.getMonth();
    const txYear = txDate.getFullYear();
    const key = `${txYear}-${txMonth}`;

    if (monthlyTotals.has(key)) {
      const current = monthlyTotals.get(key) || 0;
      monthlyTotals.set(key, current + Math.abs(Number(tx.amount)));
    }
  }

  // Convert to response format
  const monthlySpending: MonthlySpend[] = months.map(({ month, year }) => {
    const key = `${year}-${month}`;
    return {
      month: getMonthName(month),
      monthIndex: month,
      year,
      amount: Math.round((monthlyTotals.get(key) || 0) * 100) / 100,
      isCurrentMonth: month === currentMonth && year === currentYear,
    };
  });

  const response: CategoryTrendResponse = {
    monthlySpending,
    budgetLimit: budget?.period_type === 'monthly' ? budget.amount : null,
  };

  return NextResponse.json(response);
}
