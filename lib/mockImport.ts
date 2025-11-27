import { createClient } from '@/lib/supabase/server';

interface MockImportResult {
  accountsCreated: number;
  transactionsCreated: number;
  accountsReused: number;
  transactionsSkipped: number;
}

interface MockAccount {
  provider_account_id: string;
  name: string;
  type: string;
  subtype: string;
  is_shared_source: boolean;
}

interface MockTransaction {
  provider_transaction_id: string;
  merchant_name: string;
  normalized_category: string;
  amount: number;
  daysAgo: number;
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    provider_account_id: 'mock-shared-card',
    name: 'Shared Credit Card',
    type: 'credit',
    subtype: 'credit card',
    is_shared_source: true,
  },
  {
    provider_account_id: 'mock-personal-card',
    name: 'Personal Checking',
    type: 'depository',
    subtype: 'checking',
    is_shared_source: false,
  },
];

// Merchant data with categories and typical amounts
const MERCHANTS = {
  RESTAURANTS: [
    { name: 'UBER EATS', minAmount: 15, maxAmount: 45 },
    { name: 'DOORDASH', minAmount: 18, maxAmount: 55 },
    { name: 'STARBUCKS', minAmount: 5, maxAmount: 15 },
    { name: 'CHIPOTLE', minAmount: 10, maxAmount: 20 },
    { name: 'OLIVE GARDEN', minAmount: 35, maxAmount: 80 },
    { name: 'PANERA BREAD', minAmount: 12, maxAmount: 25 },
  ],
  GROCERY: [
    { name: 'WHOLE FOODS', minAmount: 40, maxAmount: 150 },
    { name: "TRADER JOE'S", minAmount: 30, maxAmount: 100 },
    { name: 'COSTCO', minAmount: 80, maxAmount: 250 },
    { name: 'SAFEWAY', minAmount: 25, maxAmount: 120 },
  ],
  TRAVEL: [
    { name: 'DELTA AIRLINES', minAmount: 150, maxAmount: 450 },
    { name: 'UNITED AIRLINES', minAmount: 180, maxAmount: 500 },
    { name: 'HILTON HOTELS', minAmount: 120, maxAmount: 300 },
    { name: 'UBER', minAmount: 8, maxAmount: 35 },
  ],
  OTHER: [
    { name: 'AMAZON', minAmount: 15, maxAmount: 100 },
    { name: 'TARGET', minAmount: 20, maxAmount: 80 },
    { name: 'NETFLIX', minAmount: 15, maxAmount: 23 },
  ],
};

/**
 * Generate a deterministic random number based on a seed string.
 * This ensures the same "random" values for the same inputs.
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 1000) / 1000;
}

/**
 * Generate mock transactions with deterministic data.
 */
function generateMockTransactions(accountId: string, accountIndex: number): MockTransaction[] {
  const transactions: MockTransaction[] = [];
  const categories = Object.keys(MERCHANTS) as (keyof typeof MERCHANTS)[];

  // Generate 15-20 transactions per account
  const txCount = 15 + (accountIndex * 5);

  for (let i = 0; i < txCount; i++) {
    const seed = `${accountId}-${i}`;
    const random = seededRandom(seed);

    // Pick a category (weight towards restaurants and grocery)
    const categoryWeights = [0.4, 0.3, 0.15, 0.15]; // RESTAURANTS, GROCERY, TRAVEL, OTHER
    let categoryIndex = 0;
    let cumulative = 0;
    for (let j = 0; j < categoryWeights.length; j++) {
      cumulative += categoryWeights[j];
      if (random < cumulative) {
        categoryIndex = j;
        break;
      }
    }
    const category = categories[categoryIndex];
    const merchants = MERCHANTS[category];

    // Pick a merchant
    const merchantIndex = Math.floor(seededRandom(seed + '-merchant') * merchants.length);
    const merchant = merchants[merchantIndex];

    // Generate amount
    const amountRandom = seededRandom(seed + '-amount');
    const amount = Math.round(
      (merchant.minAmount + amountRandom * (merchant.maxAmount - merchant.minAmount)) * 100
    ) / 100;

    // Generate date (spread over current and previous month)
    // 0-30 = current month, 31-60 = previous month
    const daysAgo = Math.floor(seededRandom(seed + '-date') * 50);

    transactions.push({
      provider_transaction_id: `mock-${accountIndex}-${i}`,
      merchant_name: merchant.name,
      normalized_category: category,
      amount,
      daysAgo,
    });
  }

  return transactions;
}

/**
 * Get a date string for N days ago.
 */
function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Run the mock import for a user.
 * This is idempotent - calling it multiple times won't create duplicates.
 */
/**
 * Update all transactions from shared source accounts to have is_shared = true.
 * This ensures that transactions from shared accounts are properly marked.
 */
export async function syncSharedSourceTransactions(userId: string): Promise<number> {
  const supabase = await createClient();

  // Get all accounts that are shared sources
  const { data: sharedAccounts, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_shared_source', true);

  if (accountError || !sharedAccounts || sharedAccounts.length === 0) {
    return 0;
  }

  const sharedAccountIds = sharedAccounts.map((a) => a.id);

  // Update all transactions from these accounts to is_shared = true
  const { data, error: updateError } = await supabase
    .from('transactions')
    .update({ is_shared: true })
    .eq('user_id', userId)
    .in('account_id', sharedAccountIds)
    .eq('is_shared', false)
    .select('id');

  if (updateError) {
    throw new Error(`Failed to sync shared source transactions: ${updateError.message}`);
  }

  return data?.length ?? 0;
}

export async function runMockImport(userId: string): Promise<MockImportResult> {
  const supabase = await createClient();

  const result: MockImportResult = {
    accountsCreated: 0,
    transactionsCreated: 0,
    accountsReused: 0,
    transactionsSkipped: 0,
  };

  // Step 1: Ensure accounts exist
  const accountIds: Map<string, string> = new Map();

  for (const mockAccount of MOCK_ACCOUNTS) {
    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('provider_account_id', mockAccount.provider_account_id)
      .single();

    if (existingAccount) {
      accountIds.set(mockAccount.provider_account_id, existingAccount.id);
      result.accountsReused++;
    } else {
      // Create the account
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          provider_account_id: mockAccount.provider_account_id,
          name: mockAccount.name,
          type: mockAccount.type,
          subtype: mockAccount.subtype,
          is_shared_source: mockAccount.is_shared_source,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create account: ${error.message}`);
      }

      accountIds.set(mockAccount.provider_account_id, newAccount.id);
      result.accountsCreated++;
    }
  }

  // Step 2: Create transactions for each account
  let accountIndex = 0;
  for (const [providerAccountId, accountId] of accountIds) {
    const mockTransactions = generateMockTransactions(providerAccountId, accountIndex);

    for (const tx of mockTransactions) {
      // Check if transaction already exists
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('provider_transaction_id', tx.provider_transaction_id)
        .single();

      if (existingTx) {
        result.transactionsSkipped++;
        continue;
      }

      // Determine if this transaction should be marked as shared
      // Transactions from a shared source account default to shared
      // For personal accounts, randomly mark some as shared (30%)
      const mockAccount = MOCK_ACCOUNTS.find(a => a.provider_account_id === providerAccountId);
      const isFromSharedAccount = mockAccount?.is_shared_source ?? false;
      const isShared = isFromSharedAccount || seededRandom(tx.provider_transaction_id + '-shared') < 0.3;

      // Create the transaction
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        account_id: accountId,
        provider_transaction_id: tx.provider_transaction_id,
        date: getDateDaysAgo(tx.daysAgo),
        amount: tx.amount,
        currency: 'USD',
        merchant_name: tx.merchant_name,
        raw_description: `${tx.merchant_name} - Mock Transaction`,
        normalized_category: tx.normalized_category,
        is_shared: isShared,
      });

      if (error) {
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      result.transactionsCreated++;
    }

    accountIndex++;
  }

  return result;
}
