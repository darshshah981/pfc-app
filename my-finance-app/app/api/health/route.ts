import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';

export async function GET() {
  let supabaseReachable = false;
  let errorDetails: string | null = null;

  try {
    const supabase = createClient();

    // Execute a trivial query to test connectivity
    // Query a non-existent table - if Supabase responds (even with an error), it's reachable
    const { error: queryError } = await supabase
      .from('_health_check_dummy')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (queryError) {
      errorDetails = `${queryError.code}: ${queryError.message}`;
    }

    // If we got any response from Supabase (even an error), it's reachable
    // Network failures would throw an exception, not return an error object
    supabaseReachable = true;
  } catch (err) {
    // If createClient throws (missing env vars) or network fails
    supabaseReachable = false;
    errorDetails = err instanceof Error ? err.message : 'Unknown error';
  }

  return NextResponse.json({
    status: 'ok',
    supabaseReachable,
    errorDetails,
  });
}
