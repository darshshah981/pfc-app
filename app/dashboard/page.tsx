import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './logout-button';
import MockImportButton from './mock-import-button';
import SpendSummary from './spend-summary';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Spend Summary
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Hello, {user.email}
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Navigation */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <a
            href="/accounts"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
          >
            Manage Accounts
          </a>
          <a
            href="/shared"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
          >
            Shared Transactions
          </a>
          <MockImportButton />
        </div>

        {/* Spend Summary Section */}
        <SpendSummary />
      </div>
    </div>
  );
}
