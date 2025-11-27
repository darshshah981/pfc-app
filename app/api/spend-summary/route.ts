import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Period = 'current_month' | 'last_30_days';

interface AccountSummary {
  accountId: string;
  accountName: string;
  type: string | null;
  subtype: string | null;
  totalAmount: number;
  transactionCount: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  isShared: boolean;
}

interface SpendSummaryResponse {
  startDate: string;
  endDate: string;
  period: Period;
  sharedOnly: boolean;
  accountId: string | null;
  totalAmount: number;
  accounts: AccountSummary[];
  transactions?: Transaction[];
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
  const accountIdParam = searchParams.get('accountId');

  // Validate period
  const validPeriods: Period[] = ['current_month', 'last_30_days'];
  const period: Period = validPeriods.includes(periodParam as Period)
    ? (periodParam as Period)
    : 'current_month';

  // Parse sharedOnly (default to false)
  const sharedOnly = sharedOnlyParam === 'true';

  // Parse accountId (optional - for drilling into specific account)
  const accountId = accountIdParam || null;

  // Get date range
  const { startDate, endDate } = getDateRange(period);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Build query - include merchant_name and date for transaction details
  let query = supabase
    .from('transactions')
    .select(`
      id,
      date,
      merchant_name,
      amount,
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

  // Filter by specific account if requested
  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data: transactions, error: queryError } = await query;

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!transactions) {
    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period,
      sharedOnly,
      accountId,
      totalAmount: 0,
      accounts: [],
      transactions: [],
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

  // Group by account_id in TypeScript
  const accountMap = new Map<
    string,
    {
      accountId: string;
      accountName: string;
      type: string | null;
      subtype: string | null;
      totalAmount: number;
      transactionCount: number;
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
        totalAmount: 0,
        transactionCount: 0,
      });
    }

    const summary = accountMap.get(txAccountId)!;
    summary.totalAmount += Number(tx.amount);
    summary.transactionCount += 1;
  }

  // Convert to array and calculate total
  const accounts = Array.from(accountMap.values());
  const totalAmount = accounts.reduce((sum, acc) => sum + acc.totalAmount, 0);

  // Round amounts to 2 decimal places
  for (const acc of accounts) {
    acc.totalAmount = Math.round(acc.totalAmount * 100) / 100;
  }

  // Build transaction list if filtering by account
  const transactionList: Transaction[] | undefined = accountId
    ? filteredTransactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.merchant_name,
        amount: Math.round(Number(tx.amount) * 100) / 100,
        isShared: tx.is_shared,
      }))
    : undefined;

  const response: SpendSummaryResponse = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    period,
    sharedOnly,
    accountId,
    totalAmount: Math.round(totalAmount * 100) / 100,
    accounts,
    transactions: transactionList,
  };

  return NextResponse.json(response);
}
