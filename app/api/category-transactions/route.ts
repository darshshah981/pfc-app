import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface CategoryTransaction {
  id: string;
  date: string;
  merchant_name: string;
  amount: number;
  normalized_category: string;
}

export interface CategoryTransactionsResponse {
  transactions: CategoryTransaction[];
  allCategories: string[];
}

function getDateRanges() {
  const now = new Date();

  // Current month: first day to last day
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Current week: Monday to Sunday
  const dayOfWeek = now.getDay();
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
  const viewMode = searchParams.get('viewMode') || 'monthly';
  const monthParam = searchParams.get('month'); // e.g., "11" for December (0-indexed)
  const yearParam = searchParams.get('year'); // e.g., "2024"

  if (!category) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  }

  let startDate: Date;
  let endDate: Date;

  // If specific month/year provided, use that instead of current period
  if (monthParam !== null && yearParam !== null) {
    const month = parseInt(monthParam, 10);
    const year = parseInt(yearParam, 10);
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0); // Last day of month
  } else {
    const { monthStart, monthEnd, weekStart, weekEnd } = getDateRanges();
    startDate = viewMode === 'weekly' ? weekStart : monthStart;
    endDate = viewMode === 'weekly' ? weekEnd : monthEnd;
  }

  // Fetch transactions for the category within the date range
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, date, merchant_name, amount, normalized_category')
    .eq('user_id', user.id)
    .eq('normalized_category', category)
    .gte('date', formatDateForQuery(startDate))
    .lte('date', formatDateForQuery(endDate))
    .order('date', { ascending: false });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Fetch all unique categories for the dropdown
  const { data: allTx, error: catError } = await supabase
    .from('transactions')
    .select('normalized_category')
    .eq('user_id', user.id)
    .not('normalized_category', 'is', null);

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  const allCategories = [...new Set(allTx?.map((t) => t.normalized_category) || [])].sort();

  const response: CategoryTransactionsResponse = {
    transactions: (transactions || []).map((tx) => ({
      id: tx.id,
      date: tx.date,
      merchant_name: tx.merchant_name || 'Unknown',
      amount: Math.abs(Number(tx.amount)),
      normalized_category: tx.normalized_category,
    })),
    allCategories,
  };

  return NextResponse.json(response);
}
