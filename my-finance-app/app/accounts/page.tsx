import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AccountsTable from './accounts-table';

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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-red-600">Error loading accounts: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-white">Accounts</h1>
          <a
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Dashboard
          </a>
        </div>

        {accounts && accounts.length > 0 ? (
          <AccountsTable accounts={accounts} />
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              No accounts found. Add accounts to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
