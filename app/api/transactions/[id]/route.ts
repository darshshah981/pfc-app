import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates: { is_shared?: boolean; normalized_category?: string } = {};

  // Validate is_shared if provided
  if ('is_shared' in body) {
    if (typeof body.is_shared !== 'boolean') {
      return NextResponse.json(
        { error: 'is_shared must be a boolean' },
        { status: 400 }
      );
    }
    updates.is_shared = body.is_shared;
  }

  // Validate normalized_category if provided
  if ('normalized_category' in body) {
    if (typeof body.normalized_category !== 'string') {
      return NextResponse.json(
        { error: 'normalized_category must be a string' },
        { status: 400 }
      );
    }
    // Allow any category string, but validate against known categories for safety
    // TODO: Could enforce strict validation here if needed
    updates.normalized_category = body.normalized_category;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  const { data: transaction, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ transaction });
}
