import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { importPlaidDataForUser } from '@/lib/plaidImport';

/**
 * POST /api/plaid/sync
 *
 * Syncs accounts and transactions from all linked Plaid items for the authenticated user.
 * This is a manual sync endpoint - no webhooks are used.
 *
 * Response: {
 *   accountsCreated: number,
 *   accountsUpdated: number,
 *   transactionsCreated: number,
 *   transactionsSkipped: number,
 *   errors: string[]
 * }
 */
export async function POST() {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the import
    const result = await importPlaidDataForUser(user.id);

    // Log any errors for debugging (but still return success if some data was imported)
    if (result.errors.length > 0) {
      console.error('Plaid sync errors:', result.errors);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing Plaid data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync Plaid data' },
      { status: 500 }
    );
  }
}
