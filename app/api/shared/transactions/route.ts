import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSharedTransactionsForCurrentMonth } from '@/lib/sharedLogic';

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const normalizedCategory = searchParams.get('normalizedCategory') || undefined;
  const period = searchParams.get('period') || 'current_month';

  // For now, only support current_month
  if (period !== 'current_month') {
    return NextResponse.json(
      { error: 'Only period=current_month is supported' },
      { status: 400 }
    );
  }

  try {
    const transactions = await getSharedTransactionsForCurrentMonth(
      user.id,
      normalizedCategory
    );
    return NextResponse.json({ transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
