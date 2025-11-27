import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBudgetStatus } from '@/lib/sharedLogic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  try {
    const status = await getBudgetStatus(user.id, id);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get budget status';
    return NextResponse.json(
      { error: message },
      { status: 404 }
    );
  }
}
