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
    <div className="min-h-screen bg-cream-50 p-8 dark:bg-warm-900">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-warm-800 dark:text-warm-50">
            Dashboard
          </h1>
          <LogoutButton />
        </div>

        {/* Navigation */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <a
            href="/accounts"
            className="rounded-xl border border-warm-100 bg-white px-4 py-2.5 text-sm font-medium text-warm-700 shadow-sm transition-all hover:border-sage-200 hover:bg-sage-50 hover:shadow dark:border-warm-700 dark:bg-warm-800 dark:text-warm-100 dark:hover:border-sage-700 dark:hover:bg-warm-700"
          >
            Manage Accounts
          </a>
          <MockImportButton />
        </div>

        {/* Spend Summary Section */}
        <SpendSummary />
      </div>
    </div>
  );
}
