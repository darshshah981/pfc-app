import { createClient } from '@/lib/supabase/server';

export interface SharedTransaction {
  id: string;
  date: string;
  amount: number;
  merchant_name: string | null;
  normalized_category: string | null;
  is_shared: boolean;
  account_name: string | null;
}

export interface BudgetStatus {
  id: string;
  name: string;
  normalized_category: string;
  period_type: string;
  amount: number;
  max_visits: number | null;
  monthToDateSpend: number;
  visitCount: number;
  remainingAmount: number;
  remainingVisits: number | null;
  projectedSpend: number;
}

/**
 * Get the start and end dates for the current calendar month.
 * Start is inclusive (first day at 00:00:00), end is exclusive (first day of next month).
 */
function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Start of current month (YYYY-MM-DD format)
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];

  // Start of next month (exclusive end)
  const endDate = new Date(year, month + 1, 1).toISOString().split('T')[0];

  return { startDate, endDate };
}

/**
 * Get the current day of month and total days in the month.
 */
function getMonthDayInfo(): { currentDay: number; totalDays: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const currentDay = now.getDate();
  const totalDays = new Date(year, month + 1, 0).getDate();

  return { currentDay, totalDays };
}

/**
 * Fetches shared transactions for the current calendar month.
 *
 * A transaction is considered "shared" if:
 * - The account it belongs to has is_shared_source = true, OR
 * - The transaction itself has is_shared = true
 *
 * @param userId - The user's ID
 * @param normalizedCategory - Optional category filter (e.g., 'RESTAURANTS')
 * @returns Array of shared transactions
 */
export async function getSharedTransactionsForCurrentMonth(
  userId: string,
  normalizedCategory?: string
): Promise<SharedTransaction[]> {
  const supabase = await createClient();
  const { startDate, endDate } = getCurrentMonthRange();

  // Build the query with a join to accounts
  // We select from transactions and join accounts to check is_shared_source
  let query = supabase
    .from('transactions')
    .select(`
      id,
      date,
      amount,
      merchant_name,
      normalized_category,
      is_shared,
      accounts!inner (
        id,
        name,
        is_shared_source
      )
    `)
    .eq('user_id', userId)
    .gte('date', startDate)
    .lt('date', endDate);

  // Add category filter if provided
  if (normalizedCategory) {
    query = query.eq('normalized_category', normalizedCategory);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch shared transactions: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Type for the joined account data
  type AccountData = { id: string; name: string; is_shared_source: boolean };

  // Filter for shared transactions:
  // Either the account is a shared source OR the transaction is marked as shared
  const sharedTransactions = data.filter((tx) => {
    const account = tx.accounts as unknown as AccountData;
    return account.is_shared_source === true || tx.is_shared === true;
  });

  // Map to the return type
  return sharedTransactions.map((tx) => {
    const account = tx.accounts as unknown as AccountData;
    return {
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      merchant_name: tx.merchant_name,
      normalized_category: tx.normalized_category,
      is_shared: tx.is_shared,
      account_name: account.name,
    };
  });
}

/**
 * Gets the status of a budget for the current month.
 *
 * Computes:
 * - monthToDateSpend: Total spent in this category this month
 * - visitCount: Number of transactions
 * - remainingAmount: Budget amount minus spent
 * - remainingVisits: If max_visits is set, remaining visits allowed
 * - projectedSpend: Linear projection of spend for the full month
 *
 * @param userId - The user's ID
 * @param budgetId - The budget's ID
 * @returns Budget status object
 */
export async function getBudgetStatus(
  userId: string,
  budgetId: string
): Promise<BudgetStatus> {
  const supabase = await createClient();

  // Load the budget
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .eq('user_id', userId)
    .single();

  if (budgetError || !budget) {
    throw new Error(`Budget not found: ${budgetError?.message || 'Not found'}`);
  }

  // Get shared transactions for this budget's category
  const transactions = await getSharedTransactionsForCurrentMonth(
    userId,
    budget.normalized_category
  );

  // Calculate metrics
  const monthToDateSpend = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const visitCount = transactions.length;
  const remainingAmount = Number(budget.amount) - monthToDateSpend;
  const remainingVisits = budget.max_visits !== null
    ? budget.max_visits - visitCount
    : null;

  // Calculate projected spend
  const { currentDay, totalDays } = getMonthDayInfo();
  let projectedSpend = 0;
  if (currentDay > 0 && monthToDateSpend > 0) {
    projectedSpend = (monthToDateSpend / currentDay) * totalDays;
  }

  return {
    id: budget.id,
    name: budget.name,
    normalized_category: budget.normalized_category,
    period_type: budget.period_type,
    amount: Number(budget.amount),
    max_visits: budget.max_visits,
    monthToDateSpend,
    visitCount,
    remainingAmount,
    remainingVisits,
    projectedSpend: Math.round(projectedSpend * 100) / 100, // Round to 2 decimal places
  };
}
