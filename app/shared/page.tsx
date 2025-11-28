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
    <div className="min-h-screen bg-cream-50 p-8 dark:bg-warm-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-warm-800 dark:text-warm-50">
              Shared Transactions
            </h1>
            <p className="mt-1 text-sm text-warm-500 dark:text-warm-400">
              {currentMonth}
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm font-medium text-sage-600 transition-colors hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300"
          >
            Back to Dashboard
          </a>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-coral-100 bg-coral-50 p-4 text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-500">
            {error}
          </div>
        )}

        {transactions && transactions.length > 0 ? (
          <SharedTransactionsTable transactions={transactions} />
        ) : (
          <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center shadow-sm dark:border-warm-700 dark:bg-warm-800">
            <p className="text-warm-600 dark:text-warm-400">
              No shared transactions found for this month.
            </p>
            <p className="mt-2 text-sm text-warm-500 dark:text-warm-500">
              Mark accounts as &quot;Shared Source&quot; or individual transactions as
              &quot;Shared&quot; to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
