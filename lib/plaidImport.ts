import { createClient } from '@/lib/supabase/server';
import { getPlaidClient } from '@/lib/plaidClient';
import type { Transaction as PlaidTransaction } from 'plaid';

// Your app's normalized category type
type NormalizedCategory =
  | 'RESTAURANTS'
  | 'GROCERY'
  | 'TRAVEL'
  | 'SHOPPING'
  | 'ENTERTAINMENT'
  | 'UTILITIES'
  | 'HEALTHCARE'
  | 'TRANSPORTATION'
  | 'OTHER';

/**
 * Maps Plaid's personal_finance_category to your normalized categories.
 * Plaid uses a hierarchical category system like "FOOD_AND_DRINK" > "RESTAURANTS".
 */
function mapPlaidCategory(plaidTransaction: PlaidTransaction): NormalizedCategory {
  // Prefer the detailed personal_finance_category if available
  const pfc = plaidTransaction.personal_finance_category;
  if (pfc) {
    const primary = pfc.primary?.toUpperCase() || '';
    const detailed = pfc.detailed?.toUpperCase() || '';

    // Food categories
    if (primary === 'FOOD_AND_DRINK') {
      if (detailed.includes('GROCERIES')) return 'GROCERY';
      return 'RESTAURANTS';
    }

    // Travel
    if (primary === 'TRAVEL') return 'TRAVEL';
    if (primary === 'TRANSPORTATION') return 'TRANSPORTATION';

    // Shopping
    if (primary === 'GENERAL_MERCHANDISE' || primary === 'GENERAL_SERVICES') return 'SHOPPING';

    // Entertainment
    if (primary === 'ENTERTAINMENT') return 'ENTERTAINMENT';
    if (primary === 'RECREATION') return 'ENTERTAINMENT';

    // Bills/Utilities
    if (primary === 'RENT_AND_UTILITIES') return 'UTILITIES';
    if (primary === 'HOME_IMPROVEMENT') return 'OTHER';

    // Healthcare
    if (primary === 'MEDICAL') return 'HEALTHCARE';
    if (primary === 'PERSONAL_CARE') return 'HEALTHCARE';

    // Income and transfers - mark as OTHER
    if (primary === 'INCOME' || primary === 'TRANSFER_IN' || primary === 'TRANSFER_OUT') {
      return 'OTHER';
    }
  }

  // Fallback: check the legacy category array
  const categories = plaidTransaction.category || [];
  const categoryStr = categories.join(' ').toLowerCase();

  if (categoryStr.includes('restaurant') || categoryStr.includes('food and drink')) {
    return 'RESTAURANTS';
  }
  if (categoryStr.includes('groceries') || categoryStr.includes('supermarket')) {
    return 'GROCERY';
  }
  if (categoryStr.includes('travel') || categoryStr.includes('airlines') || categoryStr.includes('hotel')) {
    return 'TRAVEL';
  }
  if (categoryStr.includes('shops') || categoryStr.includes('shopping')) {
    return 'SHOPPING';
  }
  if (categoryStr.includes('entertainment') || categoryStr.includes('recreation')) {
    return 'ENTERTAINMENT';
  }
  if (categoryStr.includes('utilities') || categoryStr.includes('service')) {
    return 'UTILITIES';
  }
  if (categoryStr.includes('healthcare') || categoryStr.includes('medical')) {
    return 'HEALTHCARE';
  }
  if (categoryStr.includes('taxi') || categoryStr.includes('transportation') || categoryStr.includes('uber') || categoryStr.includes('lyft')) {
    return 'TRANSPORTATION';
  }

  return 'OTHER';
}

export interface ImportResult {
  accountsCreated: number;
  accountsUpdated: number;
  transactionsCreated: number;
  transactionsSkipped: number;
  errors: string[];
}

/**
 * Imports accounts and transactions from all Plaid items for a user.
 *
 * For each linked Plaid item:
 * 1. Fetches accounts via Plaid API
 * 2. Upserts accounts into the accounts table
 * 3. Fetches transactions for the last 90 days
 * 4. Inserts new transactions (skips duplicates based on provider_transaction_id)
 */
export async function importPlaidDataForUser(userId: string): Promise<ImportResult> {
  const supabase = await createClient();
  const plaidClient = getPlaidClient();

  const result: ImportResult = {
    accountsCreated: 0,
    accountsUpdated: 0,
    transactionsCreated: 0,
    transactionsSkipped: 0,
    errors: [],
  };

  // Get all Plaid items for this user
  const { data: plaidItems, error: itemsError } = await supabase
    .from('plaid_items')
    .select('item_id, access_token, institution_name')
    .eq('user_id', userId);

  if (itemsError) {
    result.errors.push(`Failed to fetch Plaid items: ${itemsError.message}`);
    return result;
  }

  if (!plaidItems || plaidItems.length === 0) {
    result.errors.push('No Plaid items found. Please connect a bank account first.');
    return result;
  }

  // Calculate date range (last 90 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Process each Plaid item
  for (const item of plaidItems) {
    try {
      // Fetch accounts for this item
      const accountsResponse = await plaidClient.accountsGet({
        access_token: item.access_token,
      });

      const plaidAccounts = accountsResponse.data.accounts;

      // Map to store plaid account_id -> our account id
      const accountIdMap = new Map<string, string>();

      // Process each account
      for (const plaidAccount of plaidAccounts) {
        const accountData = {
          user_id: userId,
          provider: 'plaid',
          provider_account_id: plaidAccount.account_id,
          name: plaidAccount.name || plaidAccount.official_name || 'Unknown Account',
          type: plaidAccount.type || null,
          subtype: plaidAccount.subtype || null,
          is_shared_source: false,
          provider_raw: plaidAccount as unknown as Record<string, unknown>,
        };

        // Check if account already exists
        const { data: existingAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', userId)
          .eq('provider', 'plaid')
          .eq('provider_account_id', plaidAccount.account_id)
          .single();

        if (existingAccount) {
          // Update existing account
          const { error: updateError } = await supabase
            .from('accounts')
            .update({
              name: accountData.name,
              type: accountData.type,
              subtype: accountData.subtype,
              provider_raw: accountData.provider_raw,
            })
            .eq('id', existingAccount.id);

          if (updateError) {
            result.errors.push(`Failed to update account ${plaidAccount.account_id}: ${updateError.message}`);
          } else {
            result.accountsUpdated++;
            accountIdMap.set(plaidAccount.account_id, existingAccount.id);
          }
        } else {
          // Insert new account
          const { data: newAccount, error: insertError } = await supabase
            .from('accounts')
            .insert(accountData)
            .select('id')
            .single();

          if (insertError) {
            result.errors.push(`Failed to create account ${plaidAccount.account_id}: ${insertError.message}`);
          } else {
            result.accountsCreated++;
            accountIdMap.set(plaidAccount.account_id, newAccount.id);
          }
        }
      }

      // Fetch transactions for this item
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: item.access_token,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });

      let transactions = transactionsResponse.data.transactions;
      const totalTransactions = transactionsResponse.data.total_transactions;

      // Paginate to get all transactions
      while (transactions.length < totalTransactions) {
        const paginatedResponse = await plaidClient.transactionsGet({
          access_token: item.access_token,
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          options: {
            offset: transactions.length,
          },
        });
        transactions = transactions.concat(paginatedResponse.data.transactions);
      }

      // Process each transaction
      for (const plaidTx of transactions) {
        // Get our account id
        const accountId = accountIdMap.get(plaidTx.account_id);
        if (!accountId) {
          result.errors.push(`No account found for transaction ${plaidTx.transaction_id}`);
          continue;
        }

        // Check if transaction already exists
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('provider_transaction_id', plaidTx.transaction_id)
          .single();

        if (existingTx) {
          result.transactionsSkipped++;
          continue;
        }

        // Determine amount sign convention
        // Plaid: positive = debit (money going out), negative = credit (money coming in)
        // We'll store positive as charges (spending), which matches Plaid's convention
        const amount = Math.abs(plaidTx.amount);

        const transactionData = {
          user_id: userId,
          account_id: accountId,
          provider_transaction_id: plaidTx.transaction_id,
          date: plaidTx.date,
          amount,
          currency: plaidTx.iso_currency_code || plaidTx.unofficial_currency_code || 'USD',
          merchant_name: plaidTx.merchant_name || plaidTx.name || 'Unknown',
          raw_description: plaidTx.name || '',
          normalized_category: mapPlaidCategory(plaidTx),
          is_shared: false,
          provider_raw: plaidTx as unknown as Record<string, unknown>,
        };

        const { error: txError } = await supabase.from('transactions').insert(transactionData);

        if (txError) {
          result.errors.push(`Failed to create transaction ${plaidTx.transaction_id}: ${txError.message}`);
        } else {
          result.transactionsCreated++;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Error processing Plaid item ${item.item_id}: ${message}`);
    }
  }

  return result;
}
