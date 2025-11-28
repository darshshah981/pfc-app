import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlaidClient } from '@/lib/plaidClient';

interface ExchangeRequestBody {
  public_token: string;
  institution?: {
    name?: string;
    institution_id?: string;
  };
}

/**
 * POST /api/plaid/exchange-public-token
 *
 * Exchanges a public token from Plaid Link for an access token.
 * Stores the item details in the plaid_items table.
 *
 * Request body: { public_token: string, institution?: { name?: string, institution_id?: string } }
 * Response: { success: true }
 *
 * IMPORTANT: The access_token is NEVER returned to the client.
 * It is stored server-side only in the plaid_items table.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body: ExchangeRequestBody = await request.json();
    const { public_token, institution } = body;

    if (!public_token) {
      return NextResponse.json({ error: 'public_token is required' }, { status: 400 });
    }

    // Exchange the public token for an access token
    const plaidClient = getPlaidClient();
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Upsert the Plaid item into the database
    // Using upsert in case the user re-links the same institution
    const { error: upsertError } = await supabase.from('plaid_items').upsert(
      {
        user_id: user.id,
        item_id,
        access_token,
        institution_name: institution?.name || null,
      },
      {
        onConflict: 'user_id,item_id',
      }
    );

    if (upsertError) {
      console.error('Error storing Plaid item:', upsertError);
      return NextResponse.json({ error: 'Failed to store Plaid item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error exchanging public token:', error);

    // Handle Plaid-specific errors
    if (error && typeof error === 'object' && 'response' in error) {
      const plaidError = error as { response?: { data?: { error_message?: string } } };
      const message = plaidError.response?.data?.error_message || 'Failed to exchange token';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
