import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSharedTransactionsForCurrentMonth } from '@/lib/sharedLogic';
import SharedTransactionsTable from './shared-transactions-table';

export default async function SharedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  let transactions;
  let error: string | null = null;

  try {
    transactions = await getSharedTransactionsForCurrentMonth(user.id);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load transactions';
  }

  // Get current month name for display
  const currentMonth = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Shared Transactions
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {currentMonth}
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Dashboard
          </a>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {transactions && transactions.length > 0 ? (
          <SharedTransactionsTable transactions={transactions} />
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              No shared transactions found for this month.
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
              Mark accounts as &quot;Shared Source&quot; or individual transactions as
              &quot;Shared&quot; to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
