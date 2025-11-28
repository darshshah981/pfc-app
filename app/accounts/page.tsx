import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AccountsTable from './accounts-table';
import PlaidActions from './plaid-actions';

export default async function AccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, type, subtype, is_shared_source, provider_account_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Check if user has any Plaid items (connected accounts)
  const { data: plaidItems } = await supabase
    .from('plaid_items')
    .select('id')
    .eq('user_id', user.id);

  const connectedCount = plaidItems?.length ?? 0;
  const isConnected = connectedCount > 0;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50 dark:bg-warm-900">
        <div className="text-coral-500">Error loading accounts: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-8 dark:bg-warm-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-warm-800 dark:text-warm-50">Accounts</h1>
          <a
            href="/dashboard"
            className="text-sm font-medium text-sage-600 transition-colors hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300"
          >
            Back to Dashboard
          </a>
        </div>

        {/* Plaid Actions */}
        <PlaidActions isConnected={isConnected} connectedCount={connectedCount} />

        {accounts && accounts.length > 0 ? (
          <AccountsTable accounts={accounts} />
        ) : (
          <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center shadow-sm dark:border-warm-700 dark:bg-warm-800">
            <p className="text-warm-500 dark:text-warm-400">
              No accounts found. Add accounts to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
