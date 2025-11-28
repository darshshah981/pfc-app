import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlaidClient, getPlaidProducts, getPlaidCountryCodes } from '@/lib/plaidClient';

/**
 * POST /api/plaid/create-link-token
 *
 * Creates a Plaid Link token for the authenticated user.
 * The token is used to initialize Plaid Link on the frontend.
 *
 * Response: { link_token: string }
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

    // Create the Plaid Link token
    const plaidClient = getPlaidClient();
    const products = getPlaidProducts();
    const countryCodes = getPlaidCountryCodes();

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: user.id,
      },
      client_name: 'Shared Finance',
      products,
      country_codes: countryCodes,
      language: 'en',
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);

    // Handle Plaid-specific errors
    if (error && typeof error === 'object' && 'response' in error) {
      const plaidError = error as { response?: { data?: { error_message?: string } } };
      const message = plaidError.response?.data?.error_message || 'Failed to create link token';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create link token' },
      { status: 500 }
    );
  }
}
