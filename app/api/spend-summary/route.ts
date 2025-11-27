import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Period = 'current_month' | 'last_30_days';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  normalizedCategory: string | null;
  isShared: boolean;
}

interface AccountSummary {
  accountId: string;
  accountName: string;
  type: string | null;
  subtype: string | null;
  isSharedSource: boolean;
  totalAmount: number;
  transactionCount: number;
  transactions: Transaction[];
}

interface SpendSummaryResponse {
  startDate: string;
  endDate: string;
  period: Period;
  sharedOnly: boolean;
  totalAmount: number;
  accounts: AccountSummary[];
  categories: string[];
}

function getDateRange(period: Period): { startDate: Date; endDate: Date } {
  const now = new Date();

  if (period === 'last_30_days') {
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);
    return { startDate, endDate };
  }

  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { startDate, endDate };
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
  const periodParam = searchParams.get('period');
  const sharedOnlyParam = searchParams.get('sharedOnly');

  // Validate period (default to current_month)
  const validPeriods: Period[] = ['current_month', 'last_30_days'];
  const period: Period = validPeriods.includes(periodParam as Period)
    ? (periodParam as Period)
    : 'current_month';

  // Parse sharedOnly (default to false)
  const sharedOnly = sharedOnlyParam === 'true';

  // Get date range
  const { startDate, endDate } = getDateRange(period);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Query transactions with account join - include normalized_category
  const { data: transactions, error: queryError } = await supabase
    .from('transactions')
    .select(`
      id,
      date,
      merchant_name,
      amount,
      normalized_category,
      is_shared,
      account_id,
      accounts!inner (
        id,
        name,
        type,
        subtype,
        is_shared_source
      )
    `)
    .eq('user_id', user.id)
    .gte('date', startDateStr)
    .lt('date', endDateStr)
    .order('date', { ascending: false });

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period,
      sharedOnly,
      totalAmount: 0,
      accounts: [],
      categories: [],
    } satisfies SpendSummaryResponse);
  }

  // Type for the joined account data
  type AccountData = {
    id: string;
    name: string;
    type: string | null;
    subtype: string | null;
    is_shared_source: boolean;
  };

  // Type for transaction from DB
  type TransactionRow = {
    id: string;
    date: string;
    merchant_name: string;
    amount: number;
    normalized_category: string | null;
    is_shared: boolean;
    account_id: string;
    accounts: AccountData;
  };

  const typedTransactions = transactions as unknown as TransactionRow[];

  // Filter for shared transactions if sharedOnly is true
  const filteredTransactions = sharedOnly
    ? typedTransactions.filter((tx) => {
        return tx.accounts.is_shared_source === true || tx.is_shared === true;
      })
    : typedTransactions;

  // Collect unique categories for dropdown
  const categorySet = new Set<string>();
  for (const tx of filteredTransactions) {
    if (tx.normalized_category) {
      categorySet.add(tx.normalized_category);
    }
  }
  const categories = Array.from(categorySet).sort();

  // Group by account_id with transactions
  const accountMap = new Map<
    string,
    {
      accountId: string;
      accountName: string;
      type: string | null;
      subtype: string | null;
      isSharedSource: boolean;
      totalAmount: number;
      transactionCount: number;
      transactions: Transaction[];
    }
  >();

  for (const tx of filteredTransactions) {
    const account = tx.accounts;
    const txAccountId = tx.account_id;

    if (!accountMap.has(txAccountId)) {
      accountMap.set(txAccountId, {
        accountId: txAccountId,
        accountName: account.name,
        type: account.type,
        subtype: account.subtype,
        isSharedSource: account.is_shared_source,
        totalAmount: 0,
        transactionCount: 0,
        transactions: [],
      });
    }

    const summary = accountMap.get(txAccountId)!;
    summary.totalAmount += Number(tx.amount);
    summary.transactionCount += 1;
    summary.transactions.push({
      id: tx.id,
      date: tx.date,
      description: tx.merchant_name,
      amount: Math.round(Number(tx.amount) * 100) / 100,
      normalizedCategory: tx.normalized_category,
      isShared: tx.is_shared,
    });
  }

  // Convert to array and calculate total
  const accounts = Array.from(accountMap.values());
  const totalAmount = accounts.reduce((sum, acc) => sum + acc.totalAmount, 0);

  // Round amounts to 2 decimal places
  for (const acc of accounts) {
    acc.totalAmount = Math.round(acc.totalAmount * 100) / 100;
  }

  const response: SpendSummaryResponse = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    period,
    sharedOnly,
    totalAmount: Math.round(totalAmount * 100) / 100,
    accounts,
    categories,
  };

  return NextResponse.json(response);
}
