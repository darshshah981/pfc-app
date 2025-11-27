import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runMockImport, syncSharedSourceTransactions } from '@/lib/mockImport';

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runMockImport(user.id);

    // Sync existing transactions from shared source accounts
    const transactionsSynced = await syncSharedSourceTransactions(user.id);

    return NextResponse.json({
      ...result,
      transactionsSynced,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import mock data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
